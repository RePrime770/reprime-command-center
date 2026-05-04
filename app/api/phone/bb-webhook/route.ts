import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/timelines/normalize-phone'

export const dynamic = 'force-dynamic'

// ── Auth ──────────────────────────────────────────────────────────────────────
// BlueBubbles Server can forward a custom header. We use:
//   x-bb-secret: <BLUEBUBBLES_WEBHOOK_SECRET>

function verifySecret(request: NextRequest): boolean {
  const secret = process.env.BLUEBUBBLES_WEBHOOK_SECRET
  if (!secret) return true // not configured — allow (dev mode)
  return request.headers.get('x-bb-secret') === secret
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const OUR_718 = /7185505500/

function contactAddress(handle: string, isFromMe: boolean): string {
  // If "from me", the handle IS the contact (recipient). Same if inbound.
  return handle
}

// BlueBubbles dateCreated is nanoseconds (10-digit ms in some versions,
// 18-digit ns in others). Normalize to ISO.
function parseDate(raw: number | string | null | undefined): string | null {
  if (raw == null) return null
  const n = typeof raw === 'string' ? Number(raw) : raw
  if (!Number.isFinite(n)) return null
  // BlueBubbles sends nanoseconds for dates in newer versions
  const ms = n > 9_999_999_999_999 ? Math.floor(n / 1_000_000) : n > 9_999_999_999 ? Math.floor(n / 1_000) : n
  return new Date(ms).toISOString()
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let payload: Record<string, unknown>
  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const type = payload.type as string
  const data = payload.data as Record<string, unknown> | undefined
  if (!data) return NextResponse.json({ ok: true })

  if (type !== 'new-message' && type !== 'updated-message') {
    // Only process messages for now; ignore group changes, etc.
    return NextResponse.json({ ok: true })
  }

  const handle = (data.handle as Record<string, string> | null)?.address
  const isFromMe = !!data.isFromMe
  const text = (data.text as string | null) ?? null
  const guid = data.guid as string
  const service = ((data.service as string) ?? 'iMessage').toLowerCase()
  const channelType = service === 'sms' ? 'sms' : 'imessage'
  const sentAt = parseDate(data.dateCreated as number | null)

  if (!handle) {
    console.warn('[bb-webhook] message missing handle', { guid })
    return NextResponse.json({ ok: true })
  }

  // Skip echo of our own number (the Mac's local messages to ourselves)
  if (OUR_718.test(handle.replace(/\D/g, ''))) {
    return NextResponse.json({ ok: true })
  }

  const contactPhone = normalizePhone(contactAddress(handle, isFromMe)) ?? handle
  const direction: 'in' | 'out' = isFromMe ? 'out' : 'in'

  const db = createServiceClient()

  // Upsert thread
  const threadRow = {
    panel: '718',
    channel_type: channelType,
    phone: contactPhone,
    last_message_at: sentAt,
    last_message_preview: text ? text.slice(0, 120) : null,
    unread_count: direction === 'in' ? 1 : 0,
  }
  const { data: thread, error: threadErr } = await db
    .from('whatsapp_threads')
    .upsert(threadRow, { onConflict: 'panel,phone,channel_type' })
    .select('id')
    .single()

  if (threadErr || !thread) {
    console.error('[bb-webhook] thread upsert error', threadErr?.message)
    return NextResponse.json({ ok: true })
  }

  // Upsert message — skip if updated-message and no text change
  if (type === 'updated-message') {
    return NextResponse.json({ ok: true })
  }

  const msgRow = {
    thread_id: thread.id,
    panel: '718',
    channel_type: channelType,
    direction,
    body: text,
    timelines_uid: `bb:${guid}`,
    sent_at: sentAt,
    from_phone: direction === 'in' ? contactPhone : '+17185505500',
    from_name: direction === 'in' ? null : 'Gideon',
  }
  const { error: msgErr } = await db
    .from('whatsapp_messages')
    .upsert(msgRow, { onConflict: 'timelines_uid' })
  if (msgErr) console.error('[bb-webhook] message upsert error', msgErr.message)

  console.log('[bb-webhook] new-message', { channel: channelType, direction, contact: contactPhone, text: text?.slice(0, 40) })
  return NextResponse.json({ ok: true })
}
