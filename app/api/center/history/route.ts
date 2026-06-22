import { NextResponse } from 'next/server'
import { centerAuthed } from '@/lib/center/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { getMessages } from '@/lib/timelines/client'
import { listRecent, getMessage, parseFromHeader } from '@/lib/google/gmail'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// The thread, from OUR live store. Every WhatsApp message is pushed into
// whatsapp_messages by the Timelines webhook (always current, media included),
// so we read it from there — fast, complete, no rate-limit — instead of
// polling Timelines. Falls back to a live Timelines/Gmail pull only if a
// person has nothing stored yet. Hebrew gets es/en for the secretary.
const dig = (s: string) => (s || '').replace(/\D/g, '')
const isHe = (s: string) => /[֐-׿]/.test(s || '')
const fmtDate = (ts: string | number | undefined) => { if (!ts) return ''; const d = new Date(ts); return isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(d) }

type Msg = { who: string; date: string; text: string; ts: number }

async function storeThread(phone: string): Promise<Msg[]> {
  const supabase = createServiceClient()
  const last7 = dig(phone).slice(-7)
  if (!last7) return []
  const { data: threads } = await supabase.from('whatsapp_threads').select('id, phone').ilike('phone', `%${last7}%`)
  const ids = (threads || []).map((t: { id: number }) => t.id)
  if (!ids.length) return []
  const { data: msgs } = await supabase.from('whatsapp_messages')
    .select('direction, body, media_type, sent_at').in('thread_id', ids)
    .order('sent_at', { ascending: false }).limit(60)
  const rows = (msgs || []) as Array<{ direction: string; body: string | null; media_type: string | null; sent_at: string }>
  return rows.map((m) => ({
    who: m.direction === 'out' ? 'us' : 'them',
    date: fmtDate(m.sent_at),
    text: (m.body && m.body.trim()) ? m.body.slice(0, 500) : (m.media_type ? '📎 ' + m.media_type : '📎 media'),
    ts: new Date(m.sent_at).getTime() || 0,
  }))
}

// Merge two message lists (store + live), dedupe by who+text, sort oldest→newest.
function merge(a: Msg[], b: Msg[]): Msg[] {
  const seen = new Set<string>(); const out: Msg[] = []
  for (const m of [...a, ...b]) {
    const k = m.who + '|' + m.text.replace(/\s+/g, ' ').trim().slice(0, 40)
    if (seen.has(k)) continue
    seen.add(k); out.push(m)
  }
  return out.sort((x, y) => x.ts - y.ts)
}

async function waThreadLive(phone: string): Promise<Msg[]> {
  const TL = process.env.TIMELINES_API_KEY
  if (!TL) return []
  for (const acct of ['+13057784861', '+17185505500']) {
    try {
      const r = await fetch(`https://app.timelines.ai/integrations/api/chats?phone=${encodeURIComponent(phone)}&whatsapp_account_phone=${encodeURIComponent(acct)}`, { headers: { Authorization: 'Bearer ' + TL }, cache: 'no-store' })
      if (!r.ok) continue
      const j = await r.json()
      const chats = (j.data && j.data.chats) || []
      const chat = chats.find((c: { phone?: string; is_group?: boolean }) => !c.is_group && dig(c.phone || '').endsWith(dig(phone).slice(-9))) || chats[0]
      if (!chat) continue
      const msgs = await getMessages(chat.id)
      if (!msgs.length) continue
      // Timelines returns messages NEWEST-FIRST — take the newest 60, not the oldest.
      return msgs.slice(0, 60).map((m) => { const tsv = (m as { timestamp?: string }).timestamp; return { who: m.from_me ? 'us' : 'them', date: fmtDate(tsv), text: (m.text && m.text.trim()) ? m.text.slice(0, 500) : '📎 media', ts: new Date(tsv || 0).getTime() || 0 } })
    } catch { /* next */ }
  }
  return []
}

async function emailThread(email: string): Promise<Msg[]> {
  try {
    const recent = await listRecent('me', 60)
    const out: Msg[] = []
    for (const m of recent) {
      if (out.length >= 25) break
      try {
        const msg = await getMessage(m.id)
        const from = parseFromHeader(msg.headers['from'])
        const to = (msg.headers['to'] || '').toLowerCase()
        const them = from.address === email.toLowerCase()
        const us = /reprime\.com/.test(from.address) && to.includes(email.toLowerCase())
        if (!them && !us) continue
        out.push({ who: them ? 'them' : 'us', date: fmtDate(msg.receivedAt), text: ((msg.headers['subject'] ? msg.headers['subject'] + ' — ' : '') + (msg.snippet || '')).slice(0, 400), ts: new Date(msg.receivedAt).getTime() || 0 })
      } catch { /* skip */ }
    }
    return out.reverse()
  } catch { return [] }
}

async function translateChain(chain: Msg[]) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || !chain.length) return chain.map((c) => ({ ...c, he: isHe(c.text) ? c.text : '', es: c.text, en: c.text }))
  try {
    const sys = 'Translate each WhatsApp/email line for an Israeli real-estate desk. Return STRICT JSON array (no fences), one object per input line IN ORDER, keys: es (natural Spanish), en (natural English). Keep media markers (📎 …) as-is. Faithful and short.'
    const user = chain.map((c, i) => `${i + 1}. ${c.text}`).join('\n')
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 1500, system: sys, messages: [{ role: 'user', content: user }] }) })
    const j = await r.json()
    let t = (j.content || []).map((c: { text?: string }) => c.text || '').join('')
    t = t.slice(t.indexOf('['), t.lastIndexOf(']') + 1)
    const arr = JSON.parse(t) as Array<{ es?: string; en?: string }>
    return chain.map((c, i) => ({ ...c, he: isHe(c.text) ? c.text : '', es: arr[i]?.es || c.text, en: arr[i]?.en || c.text }))
  } catch {
    return chain.map((c) => ({ ...c, he: isHe(c.text) ? c.text : '', es: c.text, en: c.text }))
  }
}

export async function GET(request: Request) {
  if (!centerAuthed(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const phone = url.searchParams.get('phone') || ''
  const email = url.searchParams.get('email') || ''

  let raw: Msg[] = []
  let source = 'none'
  if (phone) {
    // Store (current inbound) + live Timelines (carries our outgoing) → both sides.
    const [store, live] = await Promise.all([storeThread(phone), waThreadLive(phone)])
    raw = merge(store, live).slice(-40)
    if (raw.length) source = store.length && live.length ? 'store+live' : store.length ? 'store' : 'timelines'
  }
  if (!raw.length && email) { raw = await emailThread(email); if (raw.length) source = 'gmail' }
  if (!raw.length) return NextResponse.json({ found: false, chain: [], source })

  const chain = await translateChain(raw)
  // Every thread begins at the invitation — anything before it is irrelevant.
  chain.unshift({ who: 'us', date: '', text: 'Terminal invitation sent', ts: 0, he: '', es: 'Invitación Terminal enviada', en: 'Terminal invitation sent' } as unknown as typeof chain[number])
  return NextResponse.json({ found: true, source, chain })
}
