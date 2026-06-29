import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Outbound SMS via the Quo/OpenPhone API (the 305 line). Inbound already arrives
// through /api/phone/quo-webhook; this is the missing send half so the cockpit
// can actually reply to an SMS thread.
//
// OpenPhone API contract (verified against openphone.com/docs):
//   POST https://api.openphone.com/v1/messages
//   Authorization: <API_KEY>   (raw key — NOT "Bearer")
//   body: { content, from (E.164 OpenPhone number), to: [E.164] }
//
// The sent message is mirrored back into our store by the existing
// message.delivered webhook, so we don't double-insert here.
//
// Behind the dashboard auth gate (proxy.ts) — the cockpit calls it with the
// session cookie. The 305 OpenPhone number is overridable via QUO_SEND_FROM.
const DEFAULT_FROM_305 = '+13057784861'

function toE164(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '')
  if (raw.trim().startsWith('+')) return `+${digits}`
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== 'g@reprime.com') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.QUO_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'QUO_API_KEY not configured' }, { status: 500 })
  }
  const from = process.env.QUO_SEND_FROM || DEFAULT_FROM_305

  let body: { to?: unknown; body?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const toRaw = typeof body.to === 'string' ? body.to : ''
  const text = typeof body.body === 'string' ? body.body.trim() : ''
  if (!toRaw || !text) {
    return NextResponse.json({ error: 'to and body required' }, { status: 400 })
  }
  const to = toE164(toRaw)

  try {
    const res = await fetch('https://api.openphone.com/v1/messages', {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, from, to: [to] }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[quo-send] OpenPhone error', res.status, detail.slice(0, 200))
      return NextResponse.json(
        { error: 'send_failed', status: res.status, detail: detail.slice(0, 300) },
        { status: 502 }
      )
    }
    const data = (await res.json().catch(() => ({}))) as { data?: { id?: string }; id?: string }
    return NextResponse.json({ ok: true, id: data?.data?.id ?? data?.id ?? null })
  } catch (e) {
    return NextResponse.json({ error: 'send_error', message: (e as Error).message }, { status: 502 })
  }
}
