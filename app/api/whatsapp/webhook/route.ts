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
  let body: string
  let payload: WebhookPayload
  try {
    body = await request.text()
    payload = JSON.parse(body)
  } catch {
    console.error('[webhook] invalid json body')
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  // BUG 3a: log raw payload keys so we can see actual shape from Timelines
  console.log('[webhook] payload keys', Object.keys(payload as Record<string, unknown>))

  const message = payload.message
  const chat = payload.chat

  console.log('[webhook] received', {
    event: payload.event,
    hasMessage: !!message,
    hasChat: !!chat,
    messageUid: message?.uid ?? null,
    chatPhone: chat?.phone ?? null,
    chatJid: chat?.jid ?? null,
    whatsappAccountId: chat?.whatsapp_account_id ?? null,
    fromMe: message?.from_me ?? null,
    chatIsGroup: chat?.is_group ?? null,
  })

  if (!message || !chat) {
    console.log('[webhook] skipped — no message or chat in payload')
    return NextResponse.json({ ok: true, skipped: 'no message or chat' })
  }

  // Check dedup BEFORE setting key — only set after successful write
  const redis = getRedis()
  const redisKey = message.uid ? `webhook:${message.uid}` : null
  if (redis && redisKey) {
    try {
      const existing = await redis.get(redisKey)
      // BUG 3b: log dedup key and whether it already exists
      console.log('[webhook] dedup key', redisKey, 'exists:', existing !== null)
      if (existing) {
        return NextResponse.json({ ok: true, deduped: true })
      }
    } catch (err) {
      console.error('[webhook] redis read failed', { uid: message.uid, error: (err as Error).message })
      // Continue without dedup rather than blocking write
    }
  }

  const panel = panelFromAccountId(chat.whatsapp_account_id)
  console.log('[webhook] panel inference', {
    whatsapp_account_id: chat.whatsapp_account_id,
    panel,
  })
  if (!panel) {
    console.log('[webhook] skipped — unknown account', { whatsapp_account_id: chat.whatsapp_account_id })
    return NextResponse.json({ ok: true, skipped: 'unknown account' })
  }

  const service = createServiceClient()
  const rawPhone = chat.phone
  const phone = normalizePhone(rawPhone) || rawPhone
  const lastAt = chat.last_message_timestamp
    ? parseTimelinesTimestamp(chat.last_message_timestamp).toISOString()
    : (message.timestamp ? parseTimelinesTimestamp(message.timestamp).toISOString() : null)

  // Only include columns confirmed to exist in the whatsapp_threads schema
  // (timelines_chat_id excluded — column not in DB; messages lookup uses phone-based search)
  const threadRow = {
    panel,
    channel_type: 'whatsapp' as const,
    phone,
    contact_name: chat.name || null,
    is_group: chat.is_group,
    jid: chat.jid || null,
    last_message_at: lastAt,
  }

  console.log('[webhook] upserting thread', { panel, phone, timelines_chat_id: chat.id, lastAt })

  const { data: thread, error: upsertErr } = await service
    .from('whatsapp_threads')
    .upsert(threadRow, { onConflict: 'panel,phone,channel_type' })
    .select('id')
    .single()

  if (upsertErr || !thread) {
    console.error('[webhook] thread upsert FAILED', {
      panel,
      phone,
      message: upsertErr?.message,
      code: upsertErr?.code,
      details: upsertErr?.details,
      hint: upsertErr?.hint,
    })
    return NextResponse.json(
      { error: 'thread_upsert_failed', message: upsertErr?.message },
      { status: 500 }
    )
  }

  console.log('[webhook] thread upsert OK', { threadId: thread.id, panel, phone })

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

  // BUG 3c: log full message row so column-name mismatches are immediately visible
  console.log('[webhook] inserting message', JSON.stringify(messageRow))
  console.log('[webhook] upserting message', {
    threadId: thread.id,
    uid: message.uid,
    direction: messageRow.direction,
    sentAt,
    bodyPreview: (message.text || '').slice(0, 40) || null,
  })

  const { error: msgErr } = await service
    .from('whatsapp_messages')
    .upsert(messageRow, { onConflict: 'timelines_uid' })

  // BUG 3d: log insert result whether success or failure
  console.log('[webhook] insert result', { data: !msgErr, error: msgErr ?? null })
  if (msgErr) {
    console.error('[webhook] message upsert FAILED', {
      uid: message.uid,
      threadId: thread.id,
      message: msgErr.message,
      code: msgErr.code,
      details: msgErr.details,
      hint: msgErr.hint,
    })
    return NextResponse.json(
      { error: 'message_upsert_failed', message: msgErr.message },
      { status: 500 }
    )
  }

  console.log('[webhook] message upsert OK', { uid: message.uid, threadId: thread.id })

  // Mark dedup key only after successful write
  if (redis && redisKey) {
    try {
      await redis.set(redisKey, '1', { ex: 60 * 60 * 24 })
    } catch (err) {
      console.error('[webhook] redis write failed (non-fatal)', { uid: message.uid, error: (err as Error).message })
    }
  }

  return NextResponse.json({ ok: true, written: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST webhooks here' })
}
