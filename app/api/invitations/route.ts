import { NextResponse, type NextRequest } from 'next/server'
import { after } from 'next/server'
import { randomUUID } from 'crypto'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { lookupByName } from '@/lib/contact-directory/client'

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

  return corsJson({
    id,
    invite_url,
    expires_at: expiresAt,
    contact_email: resolvedEmail,
    email_source: emailSource,  // 'caller' | 'directory' | null — tells Google1 whether email auto-resolved
  })
}
