import { createServiceClient } from '@/lib/supabase/server'

// Shared email→board write logic, used by BOTH the Gmail push handler and the
// (legacy) email-watch cron, so they can't drift. Records an email onto the
// matching roster contact: inbound flags "awaiting you", outbound clears it,
// both append to the contact's thread so the secretary sees the full exchange.

export type EmailRC = { source_row: number; board_stage: string | null; last_reply_at: string | null; thread_json: string | null }

// Our own sending addresses — an email FROM one of these is OUTBOUND.
export const OURS = new Set(['g@reprime.com', 'g@floridastatetrust.com', 'g@reprime-terminal.com'])

export const fmtDate = (iso: string) => { try { return new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(new Date(iso)) } catch { return '' } }

export function pushThread(tj: string | null, who: string, text: string, at: string): string {
  let arr: Array<{ who: string; date: string; text: string; via?: string }> = []
  try { arr = tj ? JSON.parse(tj) : [] } catch { arr = [] }
  arr.push({ who, date: fmtDate(at), text: text.slice(0, 400), via: 'email' })
  if (arr.length > 40) arr = arr.slice(-40)
  return JSON.stringify(arr)
}

export async function loadRosterByEmail(service: ReturnType<typeof createServiceClient>): Promise<Map<string, EmailRC>> {
  const { data } = await service.from('roster').select('source_row, email, board_stage, last_reply_at, thread_json')
  const m = new Map<string, EmailRC>()
  for (const r of (data || []) as Array<EmailRC & { email: string | null }>) {
    if (r.email) m.set(r.email.toLowerCase().trim(), r)
  }
  return m
}

// Apply one email to the board. Mutates the in-memory RC (last_reply_at + thread)
// so a batch processes newest-wins correctly. Returns true if a row was updated.
export async function applyEmailMessage(
  service: ReturnType<typeof createServiceClient>,
  byEmail: Map<string, EmailRC>,
  m: { fromAddr: string; toAddr: string; text: string; at: string },
): Promise<boolean> {
  const nowIso = new Date().toISOString()
  const fromAddr = (m.fromAddr || '').toLowerCase().trim()
  const toAddr = (m.toAddr || '').toLowerCase().trim()
  const text = (m.text || '').slice(0, 500)
  const at = m.at || nowIso

  if (OURS.has(fromAddr)) {
    const rc = byEmail.get(toAddr)
    if (rc && (!rc.last_reply_at || at > rc.last_reply_at)) {
      const tj = pushThread(rc.thread_json, 'us', text, at)
      await service.from('roster').update({ awaiting_us: false, last_from: 'us', last_reply_text: text, last_reply_at: at, thread_json: tj, updated_at: nowIso }).eq('source_row', rc.source_row)
      rc.last_reply_at = at; rc.thread_json = tj
      return true
    }
    return false
  }

  const r = byEmail.get(fromAddr)
  if (!r) return false
  if (r.last_reply_at && at <= r.last_reply_at) return false
  const tj = pushThread(r.thread_json, 'them', text, at)
  const upd: Record<string, unknown> = { awaiting_us: true, last_from: 'them', last_reply_text: text, last_reply_at: at, thread_json: tj, updated_at: nowIso }
  if (r.board_stage !== 'booked' && r.board_stage !== 'declined') upd.board_stage = 'replied'
  await service.from('roster').update(upd).eq('source_row', r.source_row)
  r.last_reply_at = at; r.thread_json = tj
  return true
}
