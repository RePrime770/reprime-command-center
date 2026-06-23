import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { centerAuthed } from '@/lib/center/auth'

export const dynamic = 'force-dynamic'

// The follow-through board reads the ROSTER (seeded from the secretary's
// Investor Board sheet — the real list of people we've worked), and upgrades
// anyone to 'booked' if the system shows a confirmed meeting. Stages:
// replied (needs you) · sent (no reply yet) · booked · declined · unknown.
const dig9 = (s: string) => (s || '').replace(/\D/g, '').slice(-9)

export async function GET(request: Request) {
  if (!centerAuthed(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = createServiceClient()

  type R = { source_row: number; name: string; phone: string | null; email: string | null; board_stage: string; responded: boolean; latest: string | null; outcome: string | null; raw_stage: string | null; awaiting_us: boolean | null; last_reply_text: string | null; last_from: string | null; remind_at: string | null; followup_note: string | null; thread_json: string | null }
  const { data: roster, error } = await supabase.from('roster').select('*').order('source_row', { ascending: true })
  if (error) return NextResponse.json({ error: error.message, contacts: [] }, { status: 500 })

  // Engagement signals from the system, keyed by phone last-9 + email:
  //  booked  — a confirmed meeting
  //  opened  — they opened the invite link (view_count / first_opened_at)
  //  watched — they clicked the tracked video link (first_video_at)
  const bookedPhones = new Set<string>(); const bookedEmails = new Set<string>()
  const openedKeys = new Set<string>(); const watchedKeys = new Set<string>(); const messagedKeys = new Set<string>()
  // Did the booked meeting actually happen? (set by the meeting-verify cron)
  const meetingStatusByKey = new Map<string, string>()
  const keysOf = (r: { contact_email: string | null; contact_phone: string | null }) => {
    const ks: string[] = []
    if (r.contact_phone) ks.push('p:' + dig9(r.contact_phone))
    if (r.contact_email) ks.push('e:' + r.contact_email.toLowerCase().trim())
    return ks
  }
  for (let from = 0; from < 50000; from += 1000) {
    const { data } = await supabase.from('invitations').select('contact_email, contact_phone, status, confirmed_slot_iso, view_count, first_opened_at, first_video_at, meeting_status').range(from, from + 999)
    const rows = (data || []) as Array<{ contact_email: string | null; contact_phone: string | null; status: string | null; confirmed_slot_iso: string | null; view_count: number | null; first_opened_at: string | null; first_video_at: string | null; meeting_status: string | null }>
    for (const r of rows) {
      const booked = r.status === 'confirmed' || !!r.confirmed_slot_iso
      const opened = (r.view_count ?? 0) > 0 || !!r.first_opened_at
      const watched = !!r.first_video_at
      if (booked) { if (r.contact_phone) bookedPhones.add(dig9(r.contact_phone)); if (r.contact_email) bookedEmails.add(r.contact_email.toLowerCase().trim()) }
      const isQueuedOrSent = r.status === 'queued' || r.status === 'sending' || r.status === 'sent' || r.status === 'confirmed' || booked
      for (const k of keysOf(r)) { if (opened) openedKeys.add(k); if (watched) watchedKeys.add(k); if (isQueuedOrSent) messagedKeys.add(k); if (r.meeting_status) meetingStatusByKey.set(k, r.meeting_status) }
    }
    if (rows.length < 1000) break
  }

  const now = Date.now()
  const contacts = ((roster || []) as R[]).map((r) => {
    const pk = r.phone ? 'p:' + dig9(r.phone) : ''
    const ek = r.email ? 'e:' + r.email.toLowerCase().trim() : ''
    const isBooked = (r.phone && bookedPhones.has(dig9(r.phone))) || (r.email && bookedEmails.has((r.email || '').toLowerCase().trim()))
    const opened = (!!pk && openedKeys.has(pk)) || (!!ek && openedKeys.has(ek))
    const watched = (!!pk && watchedKeys.has(pk)) || (!!ek && watchedKeys.has(ek))
    const reachable = !!(r.phone || r.email)
    const messaged = (!!pk && messagedKeys.has(pk)) || (!!ek && messagedKeys.has(ek))
    const meetingStatus = (pk && meetingStatusByKey.get(pk)) || (ek && meetingStatusByKey.get(ek)) || ''
    const stage = isBooked ? 'booked' : r.board_stage
    const remindMs = r.remind_at ? new Date(r.remind_at).getTime() : null
    return {
      name: r.name, phone: r.phone || '', email: r.email || '', stage,
      opened, watched, reachable, messaged, meetingStatus,
      awaitingUs: r.awaiting_us === true,
      lastReply: (r.last_reply_text || r.latest || '').slice(0, 300),
      lastFrom: r.last_from || null,
      threadJson: r.thread_json || null,
      outcome: r.outcome || '',
      remindAt: r.remind_at || null,
      followupNote: r.followup_note || '',
      snoozed: remindMs != null && remindMs > now,   // parked until its date
      due: remindMs != null && remindMs <= now,       // reminder has come due
      row: r.source_row,
    }
  })

  const active = contacts.filter((c) => !c.snoozed && c.stage !== 'booked' && c.stage !== 'declined')
  const counts: Record<string, number> = { replied: 0, sent: 0, booked: 0, declined: 0, unknown: 0 }
  for (const c of contacts) counts[c.stage] = (counts[c.stage] || 0) + 1

  return NextResponse.json({
    counts,
    awaitingUs: contacts.filter((c) => c.awaitingUs && !c.snoozed).length,
    dueToday: contacts.filter((c) => c.due).length,
    snoozed: contacts.filter((c) => c.snoozed).length,
    needsFollowup: active.length,
    notMessaged: contacts.filter((c) => c.reachable && !c.messaged).length,
    contacts,
  })
}
