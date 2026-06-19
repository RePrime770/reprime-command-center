import { NextResponse } from 'next/server'
import { centerAuthed } from '@/lib/center/auth'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// The memory is the roster (the Investor Board sheet — every comment + reply we
// recorded). The composer reads a person's history FROM HERE (not from a live
// API scrape) so the Spanish/English context is the real back-and-forth.
const dig9 = (s: string) => (s || '').replace(/\D/g, '').slice(-9)

export async function GET(request: Request) {
  if (!centerAuthed(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const phone = url.searchParams.get('phone') || ''
  const email = (url.searchParams.get('email') || '').toLowerCase().trim()

  const supabase = createServiceClient()
  const { data } = await supabase.from('roster').select('name, company, phone, email, board_stage, latest, last_reply_text, last_from, action_log, outcome')
  const rows = (data || []) as Array<{ name: string; company: string | null; phone: string | null; email: string | null; board_stage: string; latest: string | null; last_reply_text: string | null; last_from: string | null; action_log: string | null; outcome: string | null }>

  const row = rows.find((r) => (phone && r.phone && dig9(r.phone) === dig9(phone)) || (email && r.email && r.email.toLowerCase().trim() === email))
  if (!row) return NextResponse.json({ found: false, thread: '' })

  // Build a readable thread from what we already recorded for this person.
  const parts: string[] = []
  if (row.company) parts.push(`(${row.name} — ${row.company})`)
  if (row.latest) parts.push('History / notes: ' + row.latest)
  if (row.action_log) parts.push('What we did: ' + row.action_log)
  if (row.last_reply_text) parts.push(`Last message (${row.last_from === 'us' ? 'us' : 'them'}): ` + row.last_reply_text)
  if (row.outcome) parts.push('Outcome so far: ' + row.outcome)

  return NextResponse.json({ found: true, name: row.name, stage: row.board_stage, thread: parts.join('\n') })
}
