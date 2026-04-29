import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { createServiceClient } from '@/lib/supabase/server'
import { PANEL_ACCOUNT_MAP } from '@/lib/timelines/client'
import { normalizePhone } from '@/lib/timelines/normalize-phone'
import { getMediaType, parseTimelinesTimestamp } from '@/lib/timelines/parse'
import type { Panel, TimelinesChat, TimelinesMessage } from '@/lib/timelines/types'

export const dynamic = 'force-dynamic'

type WebhookPayload = {
  message?: TimelinesMessage
  chat?: TimelinesChat
  event?: string
}

function panelFromAccountId(accountId: string | undefined | null): Panel | null {
  if (!accountId) return null
  const digits = accountId.replace(/\D/g, '')
  if (digits.endsWith('17185505500') || digits === '17185505500') return '718'
  if (digits.endsWith('13057784861') || digits === '13057784861') return '305'
  for (const [panel, phone] of Object.entries(PANEL_ACCOUNT_MAP)) {
    if (accountId === phone) return panel as Panel
  }
  return null
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export async function POST(request: Request) {
  let payload: WebhookPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const message = payload.message
  const chat = payload.chat
  if (!message || !chat) {
    return NextResponse.json({ ok: true, skipped: 'no message or chat' })
  }

  const redis = getRedis()
  if (redis && message.uid) {
    const key = `webhook:${message.uid}`
    const set = await redis.set(key, '1', { nx: true, ex: 60 * 60 * 24 })
    if (set !== 'OK') {
      return NextResponse.json({ ok: true, deduped: true })
    }
  }

  const panel = panelFromAccountId(chat.whatsapp_account_id)
  if (!panel) {
    return NextResponse.json({ ok: true, skipped: 'unknown account' })
  }

  const service = createServiceClient()
  const phone = normalizePhone(chat.phone) || chat.phone
  const lastAt = chat.last_message_timestamp
    ? parseTimelinesTimestamp(chat.last_message_timestamp).toISOString()
    : (message.timestamp ? parseTimelinesTimestamp(message.timestamp).toISOString() : null)

  const threadRow = {
    panel,
    channel_type: 'whatsapp' as const,
    phone,
    contact_name: chat.name || null,
    is_group: chat.is_group,
    jid: chat.jid || null,
    timelines_chat_id: chat.id,
    last_message_at: lastAt,
    photo_url: chat.photo,
    chat_url: chat.chat_url,
    is_allowed_to_message: chat.is_allowed_to_message,
    closed: chat.closed,
    unattended: chat.unattended,
    timelines_account_id: chat.whatsapp_account_id || null,
  }

  const { data: thread, error: upsertErr } = await service
    .from('whatsapp_threads')
    .upsert(threadRow, { onConflict: 'panel,phone,channel_type' })
    .select('id')
    .single()

  if (upsertErr || !thread) {
    return NextResponse.json(
      { error: 'thread_upsert_failed', message: upsertErr?.message },
      { status: 500 }
    )
  }

  const sentAt = message.timestamp
    ? parseTimelinesTimestamp(message.timestamp).toISOString()
    : null
  const messageRow = {
    thread_id: thread.id,
    panel,
    channel_type: 'whatsapp' as const,
    direction: message.from_me ? ('out' as const) : ('in' as const),
    body: message.text || null,
    media_url: message.attachment_url,
    media_type: getMediaType(message.attachment_filename),
    media_filename: message.attachment_filename,
    timelines_uid: message.uid,
    from_phone: message.sender_phone || null,
    from_name: message.sender_name || null,
    sent_at: sentAt,
    status: message.status || null,
    is_group_message: chat.is_group,
    raw: message.data ?? null,
  }

  const { error: msgErr } = await service
    .from('whatsapp_messages')
    .upsert(messageRow, { onConflict: 'timelines_uid' })

  if (msgErr) {
    return NextResponse.json(
      { error: 'message_upsert_failed', message: msgErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST webhooks here' })
}
