import { NextResponse } from 'next/server'
import { centerAuthed } from '@/lib/center/auth'
import { getChats, getMessages } from '@/lib/timelines/client'
import { listRecent, getMessage, parseFromHeader } from '@/lib/google/gmail'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// The real thread, live. Pulls the last few WhatsApp messages (Timelines, both
// lines) — or recent email — for one person, so the queue shows the actual
// back-and-forth like the WhatsApp app, not a single line. Hebrew messages get
// es/en added so the secretary reads them. This is the "copy of WhatsApp."
const dig9 = (s: string) => (s || '').replace(/\D/g, '').slice(-9)
const isHe = (s: string) => /[֐-׿]/.test(s || '')

function fmtDate(ts: string | number | undefined): string {
  if (!ts) return ''
  const d = new Date(typeof ts === 'number' ? ts : ts)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric' }).format(d)
}

async function waThread(phone: string): Promise<Array<{ who: string; date: string; text: string }>> {
  for (const panel of ['305', '718'] as const) {
    try {
      const chats = [...(await getChats(panel, 1)), ...(await getChats(panel, 2))]
      const chat = chats.find((c) => !c.is_group && c.phone && dig9(c.phone) === dig9(phone))
      if (!chat) continue
      const msgs = await getMessages(chat.id)
      if (!msgs.length) continue
      return msgs.slice(-6).map((m) => ({ who: m.from_me ? 'us' : 'them', date: fmtDate((m as { timestamp?: string }).timestamp), text: (m.text || '[media]').slice(0, 500) }))
    } catch { /* try next line */ }
  }
  return []
}

async function emailThread(email: string): Promise<Array<{ who: string; date: string; text: string }>> {
  try {
    const recent = await listRecent('me', 60)
    const out: Array<{ who: string; date: string; text: string }> = []
    for (const m of recent) {
      if (out.length >= 6) break
      try {
        const msg = await getMessage(m.id)
        const from = parseFromHeader(msg.headers['from'])
        const to = (msg.headers['to'] || '').toLowerCase()
        const isThem = from.address === email.toLowerCase()
        const isUs = /reprime\.com/.test(from.address) && to.includes(email.toLowerCase())
        if (!isThem && !isUs) continue
        out.push({ who: isThem ? 'them' : 'us', date: fmtDate(msg.receivedAt), text: ((msg.headers['subject'] ? msg.headers['subject'] + ' — ' : '') + (msg.snippet || '')).slice(0, 400) })
      } catch { /* skip */ }
    }
    return out.reverse()
  } catch { return [] }
}

async function translateChain(chain: Array<{ who: string; date: string; text: string }>) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || !chain.length) return chain.map((c) => ({ ...c, he: isHe(c.text) ? c.text : '', es: c.text, en: c.text }))
  try {
    const sys = 'Translate each WhatsApp/email line for an Israeli real-estate desk. Return STRICT JSON array (no fences), one object per input line in order, keys: es (natural Spanish), en (natural English). Keep it faithful and short.'
    const user = chain.map((c, i) => `${i + 1}. ${c.text}`).join('\n')
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 1500, system: sys, messages: [{ role: 'user', content: user }] }),
    })
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

  let raw: Array<{ who: string; date: string; text: string }> = []
  if (phone) raw = await waThread(phone)
  if (!raw.length && email) raw = await emailThread(email)
  if (!raw.length) return NextResponse.json({ found: false, chain: [] })

  const chain = await translateChain(raw)
  return NextResponse.json({ found: true, chain })
}
