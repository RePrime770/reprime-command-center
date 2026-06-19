import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { centerAuthed } from '@/lib/center/auth'

export const dynamic = 'force-dynamic'

// The follow-through board: every contact, what stage they're at, so the list
// narrows as people resolve. Stages: queued -> sent -> opened -> booked,
// plus failed / cancelled. "needs_followup" = sent or opened but not booked.
type Stage = 'queued' | 'sent' | 'opened' | 'booked' | 'failed' | 'cancelled'

function stageOf(r: { status: string; confirmed_slot_iso: string | null; view_count: number | null }): Stage {
  if (r.confirmed_slot_iso || r.status === 'confirmed') return 'booked'
  if (r.status === 'queued' || r.status === 'sending') return 'queued'
  if (r.status === 'send_failed') return 'failed'
  if (r.status === 'cancelled') return 'cancelled'
  if ((r.view_count || 0) > 0) return 'opened'
  return 'sent'
}

export async function GET(request: Request) {
  if (!centerAuthed(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = createServiceClient()

  type Row = { id: string; contact_name: string | null; contact_first_name: string | null; contact_email: string | null; contact_phone: string | null; status: string; confirmed_slot_iso: string | null; view_count: number | null; last_opened_at: string | null; created_at: string }
  const all: Row[] = []
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await supabase
      .from('invitations')
      .select('id, contact_name, contact_first_name, contact_email, contact_phone, status, confirmed_slot_iso, view_count, last_opened_at, created_at')
      .order('created_at', { ascending: false })
      .range(from, from + 999)
    if (error) return NextResponse.json({ error: error.message, contacts: [] }, { status: 500 })
    const rows = (data || []) as Row[]
    all.push(...rows)
    if (rows.length < 1000) break
  }

  const contacts = all.map((r) => ({
    name: r.contact_name || r.contact_first_name || '(no name)',
    phone: r.contact_phone || '',
    email: r.contact_email || '',
    stage: stageOf(r),
    views: r.view_count || 0,
    lastOpened: r.last_opened_at,
    sentAt: r.created_at,
    inviteUrl: `https://reprime-terminal.com/invite/${r.id}`,
  }))

  const counts: Record<Stage, number> = { queued: 0, sent: 0, opened: 0, booked: 0, failed: 0, cancelled: 0 }
  for (const c of contacts) counts[c.stage]++

  return NextResponse.json({
    counts,
    needsFollowup: contacts.filter((c) => c.stage === 'sent' || c.stage === 'opened').length,
    contacts,
  })
}
