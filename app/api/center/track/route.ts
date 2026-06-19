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

  type R = { source_row: number; name: string; phone: string | null; email: string | null; board_stage: string; responded: boolean; latest: string | null; outcome: string | null; raw_stage: string | null; awaiting_us: boolean | null; last_reply_text: string | null; last_from: string | null; remind_at: string | null; followup_note: string | null }
  const { data: roster, error } = await supabase.from('roster').select('*').order('source_row', { ascending: true })
  if (error) return NextResponse.json({ error: error.message, contacts: [] }, { status: 500 })

  // Real bookings from the system (phone last-9 + email) to upgrade roster stage.
  const bookedPhones = new Set<string>(); const bookedEmails = new Set<string>()
  for (let from = 0; from < 50000; from += 1000) {
    const { data } = await supabase.from('invitations').select('contact_email, contact_phone').or('status.eq.confirmed,confirmed_slot_iso.not.is.null').range(from, from + 999)
    const rows = (data || []) as Array<{ contact_email: string | null; contact_phone: string | null }>
    for (const r of rows) { if (r.contact_phone) bookedPhones.add(dig9(r.contact_phone)); if (r.contact_email) bookedEmails.add(r.contact_email.toLowerCase().trim()) }
    if (rows.length < 1000) break
  }

  const now = Date.now()
  const contacts = ((roster || []) as R[]).map((r) => {
    const isBooked = (r.phone && bookedPhones.has(dig9(r.phone))) || (r.email && bookedEmails.has((r.email || '').toLowerCase().trim()))
    const stage = isBooked ? 'booked' : r.board_stage
    const remindMs = r.remind_at ? new Date(r.remind_at).getTime() : null
    return {
      name: r.name, phone: r.phone || '', email: r.email || '', stage,
      awaitingUs: r.awaiting_us === true,
      lastReply: (r.last_reply_text || r.latest || '').slice(0, 300),
      lastFrom: r.last_from || null,
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
    contacts,
  })
}
