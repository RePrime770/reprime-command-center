import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { listRecent, getMessage, parseFromHeader } from '@/lib/google/gmail'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Lean EMAIL watcher — runs every 2 min (vercel.json). Reads the most recent
// mail in g@reprime.com, matches senders to the roster, and flips the contact
// board to "awaiting you" the moment an investor replies by email. Writing the
// roster row triggers Supabase Realtime, so the board rings + surfaces it
// instantly. Decoupled from the (currently failing) Timelines getChats so the
// WhatsApp issue can't take email down. WhatsApp itself is handled in real time
// by /api/whatsapp/webhook.

export async function GET() {
  const supabase = createServiceClient()
  const nowIso = new Date().toISOString()

  const { data: roster, error } = await supabase
    .from('roster')
    .select('source_row, email, board_stage, last_reply_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byEmail = new Map<string, { source_row: number; board_stage: string | null; last_reply_at: string | null }>()
  for (const r of (roster || []) as Array<{ source_row: number; email: string | null; board_stage: string | null; last_reply_at: string | null }>) {
    if (r.email) byEmail.set(r.email.toLowerCase().trim(), r)
  }

  let matched = 0
  const errors: string[] = []
  try {
    const recent = await listRecent('me', 2) // g@reprime.com (GOOGLE_REFRESH_TOKEN), last 2 days
    for (const m of recent.slice(0, 40)) {
      try {
        const msg = await getMessage(m.id)
        const from = parseFromHeader(msg.headers['from'])
        const r = byEmail.get((from.address || '').toLowerCase().trim())
        if (!r) continue // not one of our contacts
        const receivedAt: string = msg.receivedAt || nowIso
        // Skip if we already have this (or newer) reply recorded.
        if (r.last_reply_at && receivedAt <= r.last_reply_at) continue
        const text = ((msg.headers['subject'] ? msg.headers['subject'] + ' — ' : '') + (msg.snippet || '')).slice(0, 500)
        const upd: Record<string, unknown> = {
          awaiting_us: true,
          last_from: 'them',
          last_reply_text: text,
          last_reply_at: receivedAt,
          updated_at: nowIso,
        }
        if (r.board_stage !== 'booked' && r.board_stage !== 'declined') upd.board_stage = 'replied'
        await supabase.from('roster').update(upd).eq('source_row', r.source_row)
        matched++
      } catch (e) { errors.push(`msg: ${(e as Error).message.slice(0, 60)}`) }
    }
  } catch (e) { errors.push(`list: ${(e as Error).message.slice(0, 80)}`) }

  return NextResponse.json({ ok: true, matched, errors })
}
