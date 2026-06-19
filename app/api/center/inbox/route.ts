import { NextResponse } from 'next/server'
import { centerAuthed } from '@/lib/center/auth'
import { getChats, getMessages, PANEL_ACCOUNT_MAP } from '@/lib/timelines/client'
import { listRecent, getMessage, parseFromHeader } from '@/lib/google/gmail'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// One inbox: every inbound reply — WhatsApp (both lines) + email — in a single
// feed, newest first. This is the queue: "every new message lands here."
type Item = { channel: 'whatsapp' | 'email'; who: string; handle: string; preview: string; at: string | null; link: string }

export async function GET(request: Request) {
  if (!centerAuthed(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const items: Item[] = []
  const errors: string[] = []

  // ── WhatsApp: chats awaiting our reply (they messaged last) on 305 + 718 ──
  for (const panel of ['305', '718'] as const) {
    try {
      const chats = await getChats(panel)
      const waiting = chats
        .filter((c) => !c.is_group && c.unattended)
        .sort((a, b) => (b.last_message_timestamp || '').localeCompare(a.last_message_timestamp || ''))
        .slice(0, 15)
      for (const c of waiting) {
        let preview = ''
        try {
          const msgs = await getMessages(c.id)
          const lastIn = [...msgs].reverse().find((m) => !m.from_me)
          preview = (lastIn?.text || '').slice(0, 220)
        } catch { /* rate-limited; show without preview */ }
        items.push({
          channel: 'whatsapp',
          who: c.name || c.phone || 'Unknown',
          handle: `${c.phone || ''} · ${panel}`,
          preview,
          at: c.last_message_timestamp,
          link: c.phone ? `https://wa.me/${c.phone.replace(/\D/g, '')}` : '',
        })
      }
    } catch (e) { errors.push(`wa_${panel}: ${(e as Error).message.slice(0, 80)}`) }
  }

  // ── Email: recent inbound to g@reprime.com (last 3 days), excluding our own sends ──
  try {
    const recent = await listRecent('me', 3)
    const slice = recent.slice(0, 25)
    for (const m of slice) {
      try {
        const msg = await getMessage(m.id)
        const from = parseFromHeader(msg.headers['from'])
        if (/reprime\.com$|reprime-terminal\.com$/i.test(from.address)) continue // our own / team
        items.push({
          channel: 'email',
          who: from.name || from.address,
          handle: from.address,
          preview: (msg.headers['subject'] ? msg.headers['subject'] + ' — ' : '') + (msg.snippet || '').slice(0, 200),
          at: msg.receivedAt,
          link: `https://mail.google.com/mail/u/0/#inbox/${msg.threadId}`,
        })
      } catch { /* skip one bad message */ }
    }
  } catch (e) { errors.push(`email: ${(e as Error).message.slice(0, 80)}`) }

  items.sort((a, b) => (b.at || '').localeCompare(a.at || ''))

  return NextResponse.json({ count: items.length, items, errors })
}
