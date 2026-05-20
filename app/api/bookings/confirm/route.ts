import { after } from 'next/server'
import { Redis } from '@upstash/redis'
import { createServiceClient } from '@/lib/supabase/server'
import { createMeeting } from '@/lib/zoom/client'
import { createCalendarEvent } from '@/lib/google/calendar'
import { sendEmail } from '@/lib/sendgrid/client'
import { triggerEvent } from '@/lib/pagerduty/events'
import {
  getChats,
  sendMessage,
  PANEL_ACCOUNT_MAP,
} from '@/lib/timelines/client'
import { createActivity } from '@/lib/pipedrive/client'

export const dynamic = 'force-dynamic'

const FROM_EMAIL = 'g@reprime-terminal.com'
const REPLY_TO = 'g@reprime.com'
const PD_QUEUE_KEY = 'pagerduty:queue'

function formatSlotDisplay(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const fmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  })
  return `${fmt.format(d)} Central`
}

interface Slot {
  iso: string
  display: string
}

interface InvitationRow {
  id: string
  contact_pipedrive_id: number | null
  contact_first_name: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  proposed_slots: Slot[]
  status: string
  expires_at: string | null
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

function pageHtml(opts: {
  firstName: string
  slot?: Slot
  zoomUrl?: string
  state: 'confirmed' | 'invalid' | 'used' | 'expired' | 'partial'
  message?: string
}): string {
  const { firstName, slot, zoomUrl, state, message } = opts
  const heading =
    state === 'confirmed'
      ? `Locked in, ${firstName}.`
      : state === 'partial'
        ? `${firstName} — saved with a hiccup.`
        : state === 'used'
          ? 'This invitation has already been used.'
          : state === 'expired'
            ? 'This invitation has expired.'
            : 'This invitation link is not valid.'
  const body =
    state === 'confirmed' && slot && zoomUrl
      ? `<p style="color:#FFCC33;font-size:1.05rem;line-height:1.7;margin:0 0 1.5rem;">${slot.display}.</p>
         <p style="color:#fff;font-size:1rem;line-height:1.7;margin:0 0 2rem;">Zoom + calendar invite are on their way to your inbox. See you then.</p>
         <table cellpadding="0" cellspacing="0" style="margin:0 0 2rem"><tr><td style="background:#FFCC33;border-radius:4px;">
           <a href="${zoomUrl}" style="display:inline-block;padding:0.85rem 2rem;color:#0E3470;text-decoration:none;font-weight:600;font-size:1rem;">Open Zoom</a>
         </td></tr></table>`
      : state === 'partial' && slot
        ? `<p style="color:#FFCC33;font-size:1.05rem;line-height:1.7;margin:0 0 1.5rem;">${slot.display}.</p>
           <p style="color:#fff;font-size:1rem;line-height:1.7;margin:0 0 2rem;">${message || 'I saved your slot — Gideon will follow up directly with the Zoom link.'}</p>`
        : `<p style="color:#FFCC33;font-size:1rem;line-height:1.7;margin:0 0 2rem;">${message || 'If you think this is in error, reply to the original email and I\'ll sort it out.'}</p>`

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RePrime Group · Terminal</title></head>
<body style="margin:0;padding:0;background:#0E3470;color:#fff;font-family:'Poppins',Arial,sans-serif;">
  <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;">
    <div style="max-width:560px;width:100%;">
      <header style="border-bottom:1px solid rgba(14, 52, 112, 0.70);padding-bottom:1.5rem;display:flex;align-items:center;gap:1rem;margin-bottom:3rem;">
        <span style="color:#FFCC33;letter-spacing:0.1em;font-size:0.85rem;text-transform:uppercase;">RePrime Group · Terminal Introduction</span>
      </header>
      <h1 style="color:#FFCC33;font-size:1.85rem;font-weight:600;margin:0 0 1.5rem;">${heading}</h1>
      ${body}
      <p style="margin-top:3rem;color:#8A8680;font-size:0.85rem;border-top:1px solid rgba(14, 52, 112, 0.70);padding-top:1.5rem;">
        Gideon Gratsiani · Founder, RePrime Group
      </p>
    </div>
  </main>
</body></html>`
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function icsTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

function buildIcs(opts: {
  uid: string
  startIso: string
  endIso: string
  summary: string
  description: string
  location: string
  organizerEmail: string
  organizerName: string
  attendeeEmail: string | null
  attendeeName: string | null
}): string {
  const dtstamp = icsTimestamp(new Date())
  const dtstart = icsTimestamp(new Date(opts.startIso))
  const dtend = icsTimestamp(new Date(opts.endIso))
  const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RePrime Group//Terminal//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${opts.uid}@reprime.com`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escape(opts.summary)}`,
    `DESCRIPTION:${escape(opts.description)}`,
    `LOCATION:${escape(opts.location)}`,
    `ORGANIZER;CN=${escape(opts.organizerName)}:mailto:${opts.organizerEmail}`,
  ]
  if (opts.attendeeEmail) {
    const cn = opts.attendeeName ? `;CN=${escape(opts.attendeeName)}` : ''
    lines.push(`ATTENDEE${cn};RSVP=TRUE:mailto:${opts.attendeeEmail}`)
  }
  lines.push('STATUS:CONFIRMED', 'SEQUENCE:0', 'END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

async function findChatIdForPhone(panel: '305' | '718', phone: string): Promise<number | null> {
  const target = (phone ?? '').replace(/\D/g, '')
  if (!target) return null
  for (let page = 1; page <= 5; page++) {
    const chats = await getChats(panel, page)
    if (chats.length === 0) return null
    // Some Timelines chats have null/undefined phone (groups, system entries) —
    // guard before .replace() so the iteration doesn't crash before reaching
    // the real match.
    const match = chats.find(
      (c) => !c.is_group && typeof c.phone === 'string' && c.phone.replace(/\D/g, '') === target
    )
    if (match) return match.id
  }
  return null
}

async function pageGideonCritical(summary: string, customDetails: Record<string, unknown>): Promise<void> {
  try {
    await triggerEvent({
      summary,
      source: 'bookings/confirm',
      severity: 'critical',
      component: 'bookings',
      customDetails,
    })
  } catch (err) {
    console.error('[bookings.confirm] PagerDuty failure-alert itself failed', err)
  }
}

export async function POST(request: Request) {
  let token: string | null = null
  let slotIso: string | null = null
  try {
    const form = await request.formData()
    token = (form.get('token') as string | null) ?? null
    slotIso = (form.get('slot_iso') as string | null) ?? null
  } catch {
    try {
      const body = (await request.json()) as { token?: string; slot_iso?: string }
      token = body.token ?? null
      slotIso = body.slot_iso ?? null
    } catch {
      return htmlResponse(pageHtml({ firstName: 'there', state: 'invalid', message: 'Missing token.' }), 400)
    }
  }

  if (!token || !slotIso) {
    return htmlResponse(pageHtml({ firstName: 'there', state: 'invalid', message: 'Missing token or slot.' }), 400)
  }
  if (isNaN(new Date(slotIso).getTime())) {
    return htmlResponse(pageHtml({ firstName: 'there', state: 'invalid', message: 'Invalid slot.' }), 400)
  }

  const supabase = createServiceClient()
  const { data: invitation, error: lookupError } = await supabase
    .from('invitations')
    .select(
      'id, contact_pipedrive_id, contact_first_name, contact_name, contact_email, contact_phone, proposed_slots, status, expires_at'
    )
    .eq('id', token)
    .maybeSingle()

  if (lookupError || !invitation) {
    return htmlResponse(pageHtml({ firstName: 'there', state: 'invalid' }), 404)
  }
  const inv = invitation as InvitationRow
  const firstName = inv.contact_first_name || 'there'

  if (inv.status !== 'sent') {
    return htmlResponse(pageHtml({ firstName, state: 'used' }), 410)
  }
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
    return htmlResponse(pageHtml({ firstName, state: 'expired' }), 410)
  }

  const slot: Slot = {
    iso: slotIso,
    display: formatSlotDisplay(slotIso),
  }

  const errors: Array<{ step: string; message: string }> = []
  let zoomMeetingId: string | null = null
  let zoomJoinUrl: string | null = null
  let calendarEventId: string | null = null

  // Step 1: mark invitation confirmed
  try {
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'confirmed', confirmed_slot_iso: slot.iso })
      .eq('id', token)
    if (error) throw new Error(error.message)
  } catch (err) {
    errors.push({ step: '1_status_update', message: (err as Error).message })
    await pageGideonCritical(`Bookings: failed to mark invitation confirmed for ${firstName}`, { token, slot, err: (err as Error).message })
  }

  // Step 2: create Zoom meeting
  try {
    const meeting = await createMeeting('me', {
      topic: `Terminal Introduction — ${firstName}`,
      start_time: slot.iso,
      duration: 30,
      timezone: 'America/Chicago',
    })
    zoomMeetingId = String(meeting.id)
    zoomJoinUrl = meeting.join_url
  } catch (err) {
    errors.push({ step: '2_zoom_create', message: (err as Error).message })
    await pageGideonCritical(`Bookings: Zoom meeting create failed for ${firstName}`, { token, slot, err: (err as Error).message })
  }

  // Captain hotfix 2026-05-19: if dynamic Zoom create failed, fall back to
  // STATIC_ZOOM_FALLBACK_URL (Gideon's personal scheduler/PMI link). This
  // keeps the booking flow whole — calendar invite, confirmation email,
  // WhatsApp + PagerDuty downstream all use the fallback URL, recipient
  // never sees a half-broken page.
  if (!zoomJoinUrl) {
    const staticFallback = process.env.STATIC_ZOOM_FALLBACK_URL
    if (staticFallback) {
      zoomJoinUrl = staticFallback
      zoomMeetingId = 'static'
      errors.push({ step: '2_zoom_static_fallback_used', message: 'Dynamic create failed; using STATIC_ZOOM_FALLBACK_URL' })
    }
  }

  // Captain hotfix 2026-05-20: persist Zoom URL inline (the recipient page
  // needs it on render), then push all OTHER side-effects (Calendar invite,
  // confirmation email, WhatsApp confirmation, PagerDuty schedule, Pipedrive
  // activity) to next/server `after()` so they run AFTER the 303 redirect
  // ships. Net: ~3-4s critical path → ~1-2s (Zoom create + Zoom persist).
  if (zoomMeetingId && zoomJoinUrl) {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ zoom_meeting_id: zoomMeetingId, zoom_join_url: zoomJoinUrl })
        .eq('id', token)
      if (error) throw new Error(error.message)
    } catch (err) {
      errors.push({ step: '3_persist_zoom', message: (err as Error).message })
      void pageGideonCritical(`Bookings: failed to persist Zoom IDs for ${firstName}`, { token, zoom_id: zoomMeetingId, err: (err as Error).message })
    }
  }

  // Build the background-work bundle. Runs via after() after the redirect ships.
  const backgroundTasks: Promise<void>[] = []

  // Task B — create Calendar event → then persist calendar id (Steps 4 + 5 chained)
  if (zoomJoinUrl) {
    backgroundTasks.push((async () => {
      try {
        const start = new Date(slot.iso)
        const end = new Date(start.getTime() + 30 * 60 * 1000)
        const eventId = await createCalendarEvent({
          summary: `Terminal Introduction — ${firstName}`,
          description: 'Terminal introduction call. 30 minutes.',
          startTime: slot.iso,
          endTime: end.toISOString(),
          attendees: inv.contact_email ? [inv.contact_email] : [],
          zoomLink: zoomJoinUrl,
          location: zoomJoinUrl,
        })
        calendarEventId = eventId ?? null
      } catch (err) {
        errors.push({ step: '4_calendar_create', message: (err as Error).message })
        await pageGideonCritical(`Bookings: Calendar event create failed for ${firstName}`, { token, slot, err: (err as Error).message })
        return
      }
      if (calendarEventId) {
        try {
          const { error } = await supabase
            .from('invitations')
            .update({ calendar_event_id: calendarEventId })
            .eq('id', token)
          if (error) throw new Error(error.message)
        } catch (err) {
          errors.push({ step: '5_persist_calendar', message: (err as Error).message })
          await pageGideonCritical(`Bookings: failed to persist calendar event id for ${firstName}`, { token, err: (err as Error).message })
        }
      }
    })())
  }

  // Task C — send confirmation email + ICS (Step 6) — runs in background
  if (inv.contact_email && zoomJoinUrl) {
    backgroundTasks.push((async () => {
    try {
      const start = new Date(slot.iso)
      const end = new Date(start.getTime() + 30 * 60 * 1000)
      const ics = buildIcs({
        uid: token,
        startIso: slot.iso,
        endIso: end.toISOString(),
        summary: `Terminal Introduction — ${firstName}`,
        description: `Zoom: ${zoomJoinUrl}`,
        location: zoomJoinUrl,
        organizerEmail: FROM_EMAIL,
        organizerName: 'Gideon Gratsiani',
        attendeeEmail: inv.contact_email,
        attendeeName: inv.contact_name,
      })
      const icsBase64 = Buffer.from(ics, 'utf-8').toString('base64')

      const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#FAFAF9;font-family:'Poppins',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:2rem 1rem;">
<table width="100%" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
<tr><td style="background:#0E3470;padding:1.75rem 2rem;border-bottom:3px solid #FFCC33;">
<span style="color:#FFCC33;letter-spacing:0.1em;font-size:0.8rem;text-transform:uppercase;">RePrime Group · Terminal Confirmed</span>
</td></tr>
<tr><td style="padding:2.5rem 2rem;">
<p style="color:#1F1D1A;font-size:1.05rem;margin:0 0 1.25rem;">${firstName},</p>
<p style="color:#1F1D1A;font-size:1rem;margin:0 0 1.25rem;line-height:1.7;">Locked in: <strong>${slot.display}</strong>.</p>
<p style="color:#1F1D1A;font-size:1rem;margin:0 0 1.5rem;line-height:1.7;">The calendar invite is attached. Zoom link below.</p>
<table cellpadding="0" cellspacing="0"><tr><td style="background:#FFCC33;border-radius:4px;">
<a href="${zoomJoinUrl}" style="display:inline-block;padding:0.85rem 2rem;color:#0E3470;text-decoration:none;font-weight:600;font-size:1rem;">Join Zoom</a>
</td></tr></table>
<p style="color:#8A8680;font-size:0.85rem;margin:2.5rem 0 0;padding-top:1.5rem;border-top:1px solid #E5E2DB;">
Gideon Gratsiani<br>Founder, RePrime Group
</p></td></tr></table></td></tr></table></body></html>`
      const text = `${firstName},

Locked in: ${slot.display}.
Zoom: ${zoomJoinUrl}

Calendar invite attached.

—
Gideon Gratsiani
Founder, RePrime Group`

      await sendEmail({
        to: inv.contact_email!,
        from: FROM_EMAIL,
        replyTo: REPLY_TO,
        subject: `Confirmed — Terminal Introduction · ${slot.display}`,
        html,
        text,
        attachments: [
          {
            content: icsBase64,
            filename: 'terminal-introduction.ics',
            type: 'text/calendar; method=REQUEST',
            disposition: 'attachment',
          },
        ],
      })
    } catch (err) {
      errors.push({ step: '6_confirmation_email', message: (err as Error).message })
      await pageGideonCritical(`Bookings: confirmation email failed for ${firstName}`, { token, email: inv.contact_email, err: (err as Error).message })
    }
    })())
  }

  // Task D — WhatsApp confirmation (Step 7) — runs in background
  if (inv.contact_phone && zoomJoinUrl) {
    backgroundTasks.push((async () => {
      try {
        const chatId = await findChatIdForPhone('305', inv.contact_phone!)
        if (chatId) {
          const text = `${firstName} — confirmed: ${slot.display}.\n\nZoom: ${zoomJoinUrl}\n\nSee you then.\n— Gideon`
          await sendMessage({
            phone: inv.contact_phone!,
            text,
            whatsappAccountPhone: PANEL_ACCOUNT_MAP['305'],
          })
        } else {
          errors.push({ step: '7_whatsapp_confirmation', message: 'no_existing_chat' })
        }
      } catch (err) {
        errors.push({ step: '7_whatsapp_confirmation', message: (err as Error).message })
        await pageGideonCritical(`Bookings: WhatsApp confirmation failed for ${firstName}`, { token, phone: inv.contact_phone, err: (err as Error).message })
      }
    })())
  }

  // Task E — PagerDuty T-10 + T-1 schedule (Step 8) — runs in background
  backgroundTasks.push((async () => {
  try {
    const redis = getRedis()
    if (!redis) throw new Error('upstash_not_configured')
    const slotMs = new Date(slot.iso).getTime()
    const tMinus10Ms = slotMs - 10 * 60 * 1000
    const tMinus1Ms = slotMs - 1 * 60 * 1000

    const tMinus10Member = JSON.stringify({
      summary: `${firstName} Terminal in 10 min — Zoom: ${zoomJoinUrl ?? 'n/a'}`,
      severity: 'warning',
      customDetails: { contact: inv.contact_name, slot: slot.display, zoom: zoomJoinUrl, token },
      dedupKey: `terminal:${token}:t-10`,
    })
    const tMinus1Member = JSON.stringify({
      summary: `${firstName} Terminal in 1 min`,
      severity: 'critical',
      customDetails: { contact: inv.contact_name, slot: slot.display, zoom: zoomJoinUrl, token },
      dedupKey: `terminal:${token}:t-1`,
    })

    if (tMinus10Ms > Date.now()) {
      await redis.zadd(PD_QUEUE_KEY, { score: tMinus10Ms, member: tMinus10Member })
    }
    if (tMinus1Ms > Date.now()) {
      await redis.zadd(PD_QUEUE_KEY, { score: tMinus1Ms, member: tMinus1Member })
    }
  } catch (err) {
    errors.push({ step: '8_pagerduty_schedule', message: (err as Error).message })
    await pageGideonCritical(`Bookings: PagerDuty schedule failed for ${firstName}`, { token, err: (err as Error).message })
  }
  })())

  // Task F — Pipedrive activity (Step 9) — runs in background
  if (inv.contact_pipedrive_id) {
    backgroundTasks.push((async () => {
    try {
      const slotDate = new Date(slot.iso)
      const yyyy = slotDate.getFullYear()
      const mm = String(slotDate.getMonth() + 1).padStart(2, '0')
      const dd = String(slotDate.getDate()).padStart(2, '0')
      const hh = String(slotDate.getHours()).padStart(2, '0')
      const mn = String(slotDate.getMinutes()).padStart(2, '0')
      await createActivity({
        type: 'meeting',
        subject: 'Terminal Introduction',
        person_id: inv.contact_pipedrive_id!,
        due_date: `${yyyy}-${mm}-${dd}`,
        due_time: `${hh}:${mn}`,
        duration: '00:30',
        note: zoomJoinUrl
          ? `Confirmed via Terminal invitation.\nZoom: ${zoomJoinUrl}\nSlot: ${slot.display}`
          : `Confirmed via Terminal invitation.\nSlot: ${slot.display}`,
      })
    } catch (err) {
      errors.push({ step: '9_pipedrive_activity', message: (err as Error).message })
      await pageGideonCritical(`Bookings: Pipedrive activity failed for ${firstName}`, { token, err: (err as Error).message })
    }
    })())
  }

  // Push all background work to next/server after(). These run AFTER the
  // 303 redirect ships to the recipient, so the page lands in ~1-2s instead
  // of waiting for Calendar + Email + WhatsApp + PagerDuty + Pipedrive (all
  // of which can take another 1-2s combined).
  after(async () => {
    await Promise.allSettled(backgroundTasks)
    if (errors.length > 0) {
      console.error('[bookings.confirm] post-response partial failures', { token, errors })
    }
  })

  // Captain hotfix 2026-05-20: instead of returning a bespoke "Locked in"
  // HTML page (which drifted from the locked Screen 3 design), 303-redirect
  // the recipient back to /invite/{token}. The invitation row now has
  // status='confirmed' + confirmed_slot_iso + zoom_join_url (or null if Zoom
  // failed), so page.tsx renders the locked Screen 3 confirmation surface
  // — cream letter bubble, meeting details, Add Attendee, calendar buttons,
  // reschedule link — exactly per _terminal-design-reference/03_Screen3_Confirmation.html.
  // Single source of truth for the confirmation surface lives in page.tsx.
  const appUrlBase = (
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://project-7e87w.vercel.app'
  ).replace(/\/$/, '')
  return new Response(null, {
    status: 303,
    headers: { Location: `${appUrlBase}/invite/${token}` },
  })
}
