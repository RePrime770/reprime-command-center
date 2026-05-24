import { NextResponse, type NextRequest } from 'next/server'
import { after } from 'next/server'
import { randomUUID } from 'crypto'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { lookupByName } from '@/lib/contact-directory/client'
import { sendEmail } from '@/lib/sendgrid/client'

export const dynamic = 'force-dynamic'

type CreateBody = {
  contact_first_name?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  contact_pipedrive_id?: number | null
  proposed_slots?: Array<{ iso: string; display: string }>
  meeting_type?: 'terminal' | 'meeting' | null
  expires_in_days?: number
  // Captain 2026-05-24: opt-out for the parallel SendGrid invitation email.
  // Default = true. Set false if you only want WhatsApp (e.g. close friends
  // where an email feels too formal).
  send_email?: boolean
}

// Captain hotfix 2026-05-24: CORS allowed for cross-origin mints (Chrome
// extension running on web.whatsapp.com or any other tab needs to fetch
// this endpoint directly). Security gate is the X-Captain-Token header,
// not the origin — so `*` is acceptable here.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Captain-Token, Authorization',
  'Access-Control-Max-Age': '86400',
}

function corsJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: CORS_HEADERS,
  })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  // Captain hotfix 2026-05-20: switched from cookie-based g@reprime.com check
  // to X-Captain-Token header so the Chrome Extension can mint directly via
  // fetch() from any origin (no need to be on the dashboard tab with an
  // active Supabase session). Token lives in process.env.CAPTAIN_API_TOKEN.
  // Cookie auth still works as a fallback for the dashboard composer.
  const captainToken = request.headers.get('x-captain-token') || request.headers.get('X-Captain-Token')
  const expectedToken = process.env.CAPTAIN_API_TOKEN
  const tokenOk = captainToken && expectedToken && captainToken === expectedToken

  if (!tokenOk) {
    // Fall back to cookie auth (legacy path for the dashboard composer)
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || user.email !== 'g@reprime.com') {
      return corsJson(
        { error: 'unauthorized', message: 'Provide X-Captain-Token header or sign in as g@reprime.com' },
        { status: 401 }
      )
    }
  }

  let payload: CreateBody
  try {
    payload = (await request.json()) as CreateBody
  } catch {
    return corsJson({ error: 'invalid_json' }, { status: 400 })
  }

  const firstName = (payload.contact_first_name || '').trim() || null
  const fullName = (payload.contact_name || '').trim() || null

  if (!firstName && !fullName) {
    return corsJson(
      { error: 'name_required', message: 'contact_first_name or contact_name is required' },
      { status: 400 }
    )
  }

  const id = randomUUID()
  const expiresInDays = Math.max(1, Math.min(60, payload.expires_in_days ?? 14))
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()

  // Captain 2026-05-24: when no email is provided in the mint payload but we
  // have a name, try to auto-resolve from contact_directory (the 1500+ row
  // master from RePrime_Command_Center_Master.xlsx). If found, the recipient
  // never sees the email input on the booking page — confirmation email + ICS
  // attendee invite go to them automatically the moment they pick a slot.
  let resolvedEmail: string | null = payload.contact_email ?? null
  let emailSource: 'caller' | 'directory' | null = resolvedEmail ? 'caller' : null
  if (!resolvedEmail && (fullName || firstName)) {
    try {
      const hit = await lookupByName(fullName || firstName)
      if (hit?.primary_email) {
        resolvedEmail = hit.primary_email
        emailSource = 'directory'
      }
    } catch (err) {
      console.warn('[invitations.mint] contact-directory lookup failed', (err as Error).message)
    }
  }

  const row = {
    id,
    contact_first_name: firstName,
    contact_name: fullName,
    contact_email: resolvedEmail,
    contact_phone: payload.contact_phone ?? null,
    contact_pipedrive_id: payload.contact_pipedrive_id ?? null,
    proposed_slots: payload.proposed_slots ?? [],
    meeting_type: payload.meeting_type ?? 'terminal',
    status: 'sent' as const,
    expires_at: expiresAt,
  }

  const service = createServiceClient()
  const { error: insertErr } = await service.from('invitations').insert(row)

  if (insertErr) {
    return corsJson(
      { error: 'db_insert_failed', message: insertErr.message },
      { status: 500 }
    )
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || 'https://project-7e87w.vercel.app'
  ).replace(/\/$/, '')
  const invite_url = `${appUrl}/invite/${id}`

  // Captain hotfix 2026-05-24: pre-warm the OG image at Vercel's edge cache
  // immediately after mint, so WhatsApp's link-preview fetcher (which has
  // a tight ~2-5s timeout) gets the gold-card PNG instantly on first send
  // instead of timing out on the cold ~2-4s Satori render. Without this,
  // recipients sometimes see a small text-card preview instead of the big
  // Imperial Gold + Brand Navy card. Fire-and-forget via after() so the
  // mint response returns in <100ms.
  after(async () => {
    try {
      const ogUrl = `${appUrl}/invite/${id}/opengraph-image`
      const res = await fetch(ogUrl, { cache: 'no-store' })
      if (!res.ok) {
        console.warn('[invitations] OG pre-warm non-OK:', res.status, ogUrl)
      } else {
        // Consume the body so the edge cache fully populates
        await res.arrayBuffer()
        console.log('[invitations] OG pre-warmed:', id, 'bytes:', res.headers.get('content-length'))
      }
    } catch (err) {
      console.warn('[invitations] OG pre-warm failed:', (err as Error).message)
    }
  })

  // Captain 2026-05-24: parallel SendGrid invitation email at mint time.
  // Recipient gets WhatsApp (when Gideon sends) + email simultaneously. They
  // engage via whichever channel they prefer first. Both point at the same
  // magic link → same booking flow. Fires in background via after().
  // Skip if: send_email explicitly false, OR no email resolved, OR no slots.
  const wantEmail = payload.send_email !== false
  const recipientFirst = firstName || (fullName ? fullName.split(' ')[0] : 'there')
  const recipientFull = fullName || firstName || 'there'
  if (wantEmail && resolvedEmail && (payload.proposed_slots?.length ?? 0) > 0) {
    after(async () => {
      try {
        const slots = payload.proposed_slots ?? []
        const slotPreview = slots.slice(0, 3).map((s) => `• ${s.display}`).join('\n')
        const slotPreviewHtml = slots.slice(0, 3).map((s) =>
          `<li style="margin:6px 0;color:#FFCC33;font-family:'Playfair Display',Georgia,serif;font-size:15px;">${s.display}</li>`
        ).join('')

        const subject = `A private introduction from Gideon Gratsiani — ${recipientFirst}`

        // Plain text fallback
        const text = `${recipientFirst} —

I've built something I'd like to show you. Two years in the making — by invitation only.

Tap the link below to pick a time. One click confirms.

${invite_url}

Suggested times:
${slotPreview}

— Gideon
Gideon Gratsiani, Founder
RePrime Group`

        // HTML — Imperial Gold + Brand Navy locked design, mirrors the OG card aesthetic.
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#DDD9D2;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0E3470;border:1px solid rgba(255,204,51,0.22);">

        <!-- Header — TERMINAL -->
        <tr><td style="padding:28px 48px 24px;text-align:center;border-bottom:1px solid rgba(255,204,51,0.18);">
          <div style="font-family:Georgia,serif;font-size:30px;letter-spacing:0.30em;color:#FFCC33;font-weight:600;text-indent:0.30em;">TERMINAL</div>
          <div style="font-family:Garamond,Georgia,serif;font-style:italic;font-size:15px;color:#FFCC33;margin-top:6px;">by RePrime</div>
        </td></tr>

        <!-- Cream letter -->
        <tr><td style="padding:30px 36px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#F8F0DA 0%,#EFE2C4 100%);border:1px solid rgba(255,204,51,0.30);padding:32px 28px;">
            <tr><td style="text-align:center;font-family:Georgia,serif;color:#0E3470;">
              <p style="margin:0 0 14px;font-size:12px;font-style:italic;color:rgba(14,52,112,0.55);font-family:Arial,sans-serif;letter-spacing:0.04em;">A private introduction from Gideon Gratsiani</p>
              <h1 style="margin:0 0 12px;font-size:30px;font-style:italic;font-weight:600;color:#5A3F18;">${recipientFirst} —</h1>
              <p style="margin:14px 0;font-size:17px;line-height:1.6;font-style:italic;color:#0E3470;">I've built something I'd like to show you. Two years in the making — by invitation only.</p>
              <p style="margin:18px 0 6px;font-size:15px;line-height:1.6;font-style:italic;color:#0E3470;">Pick any time below. One click confirms.</p>
              <p style="margin:18px 0 0;font-size:18px;font-weight:600;font-style:italic;color:#5A3F18;">— Gideon</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Suggested times -->
        ${slotPreviewHtml ? `<tr><td style="padding:0 36px 18px;">
          <p style="margin:0 0 10px;text-align:center;font-size:11px;letter-spacing:0.24em;color:#FFCC33;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:600;text-indent:0.24em;">Suggested times</p>
          <ul style="list-style:none;padding:0;margin:0;text-align:center;">${slotPreviewHtml}</ul>
        </td></tr>` : ''}

        <!-- Big gold CTA -->
        <tr><td style="padding:22px 36px 30px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background:#FFCC33;border-radius:2px;">
              <a href="${invite_url}" style="display:inline-block;padding:16px 38px;color:#0E3470;text-decoration:none;font-weight:700;font-size:17px;font-family:Georgia,serif;letter-spacing:0.04em;">Open Invitation →</a>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;font-size:11px;color:rgba(255,204,51,0.55);font-family:Arial,sans-serif;letter-spacing:0.10em;">PRIVATE MEMBERSHIP · BY INVITATION ONLY</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:22px 36px;text-align:center;border-top:1px solid rgba(255,204,51,0.18);">
          <div style="font-family:Georgia,serif;font-size:16px;color:#FFCC33;font-weight:600;letter-spacing:0.10em;text-indent:0.10em;">TERMINAL</div>
          <div style="font-family:Garamond,Georgia,serif;font-style:italic;font-size:12px;color:#FFCC33;margin-top:3px;">by RePrime</div>
          <p style="margin:14px 0 0;font-size:9px;color:rgba(255,204,51,0.55);letter-spacing:0.06em;font-family:Arial,sans-serif;">This invitation was sent personally. Reply directly to Gideon.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

        await sendEmail({
          to: resolvedEmail,
          from: process.env.SENDGRID_FROM_EMAIL || 'g@reprime-terminal.com',
          replyTo: 'g@reprime.com',
          subject,
          html,
          text,
        })
        console.log('[invitations] invitation email sent:', id, 'to:', resolvedEmail)
      } catch (err) {
        console.warn('[invitations] invitation email failed:', (err as Error).message)
      }
    })
  }

  return corsJson({
    id,
    invite_url,
    expires_at: expiresAt,
    contact_email: resolvedEmail,
    email_source: emailSource,  // 'caller' | 'directory' | null
    email_dispatched: Boolean(wantEmail && resolvedEmail && (payload.proposed_slots?.length ?? 0) > 0),
  })
}
