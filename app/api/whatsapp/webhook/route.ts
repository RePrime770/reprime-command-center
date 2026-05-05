import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { PANEL_ACCOUNT_MAP } from '@/lib/timelines/client'
import { normalizePhone } from '@/lib/timelines/normalize-phone'
import { getMediaType, parseTimelinesTimestamp } from '@/lib/timelines/parse'
import type { Panel, TimelinesChat, TimelinesMessage } from '@/lib/timelines/types'

export const dynamic = 'force-dynamic'

type WebhookAccount = {
  id?: string | number | null
  phone?: string | null
  jid?: string | null
  account_id?: string | number | null
  [k: string]: unknown
}

type WebhookPayload = {
  message?: TimelinesMessage
  chat?: TimelinesChat
  whatsapp_account?: WebhookAccount
  event?: string
  event_type?: string
}

/** Match any string containing our account digits */
function matchPanel(value: string | undefined | null): Panel | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.endsWith('17185505500') || digits === '7185505500') return '718'
  if (digits.endsWith('13057784861') || digits === '3057784861') return '305'
  return null
}

/**
 * Determine panel from all available fields.
 * Timelines.ai's current payload puts account info under a top-level
 * `whatsapp_account` object rather than `chat.whatsapp_account_id`.
 * We probe every plausible location so panel resolution is robust to
 * schema drift.
 */
function resolvePanel(
  chat: TimelinesChat,
  message: TimelinesMessage,
  account: WebhookAccount | undefined
): Panel | null {
  // 0. Top-level whatsapp_account object (current Timelines schema)
  if (account) {
    const fromAccountPhone = matchPanel(account.phone)
    if (fromAccountPhone) return fromAccountPhone
    const fromAccountJid = matchPanel(account.jid)
    if (fromAccountJid) return fromAccountJid
    const fromAccountId = matchPanel(
      typeof account.id === 'number' ? String(account.id) : (account.id as string | null | undefined)
    )
    if (fromAccountId) return fromAccountId
    const fromAccountIdAlt = matchPanel(
      typeof account.account_id === 'number' ? String(account.account_id) : (account.account_id as string | null | undefined)
    )
    if (fromAccountIdAlt) return fromAccountIdAlt
  }

  // 1. Explicit account id on chat (legacy schema)
  const fromAccountId = matchPanel(chat.whatsapp_account_id)
  if (fromAccountId) return fromAccountId

  // 2. Message phones: for outbound our number = sender; for inbound = recipient
  const ourPhone = message.from_me ? message.sender_phone : message.recipient_phone
  const fromPhone = matchPanel(ourPhone)
  if (fromPhone) return fromPhone

  // 3. Try both sender and recipient regardless of direction
  const fromSender = matchPanel(message.sender_phone)
  if (fromSender) return fromSender
  const fromRecipient = matchPanel(message.recipient_phone)
  if (fromRecipient) return fromRecipient

  // 4. Chat JID (sometimes encodes the account phone)
  const fromJid = matchPanel(chat.jid)
  if (fromJid) return fromJid

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

  // Full raw payload — needed to discover Timelines' exact nested schema.
  // Truncate to 8KB to avoid log bloat on attachment-heavy messages.
  console.log(
    '[webhook] raw',
    body.length > 8192 ? body.slice(0, 8192) + '…(truncated)' : body
  )
  console.log('[webhook] payload keys', Object.keys(payload as Record<string, unknown>))

  const message = payload.message
  const chat = payload.chat
  const account = payload.whatsapp_account

  console.log('[webhook] received', {
    event: payload.event ?? payload.event_type ?? null,
    hasMessage: !!message,
    hasChat: !!chat,
    hasAccount: !!account,
    accountKeys: account ? Object.keys(account) : null,
    messageKeys: message ? Object.keys(message as unknown as Record<string, unknown>) : null,
    chatKeys: chat ? Object.keys(chat as unknown as Record<string, unknown>) : null,
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

  const panel = resolvePanel(chat, message, account)
  console.log('[webhook] panel inference', {
    whatsapp_account_id: chat.whatsapp_account_id,
    account_phone: account?.phone ?? null,
    account_id: account?.id ?? null,
    account_jid: account?.jid ?? null,
    sender_phone: message.sender_phone,
    recipient_phone: message.recipient_phone,
    from_me: message.from_me,
    chat_jid: chat.jid,
    resolved_panel: panel,
  })
  if (!panel) {
    console.log('[webhook] skipped — could not resolve panel', {
      whatsapp_account_id: chat.whatsapp_account_id,
      sender_phone: message.sender_phone,
      recipient_phone: message.recipient_phone,
    })
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

  // Infer media_type from filename extension first, then fall back to message_type
  // (WhatsApp voice notes use message_type='ptt' and have no filename extension)
  let mediaType = getMediaType(message.attachment_filename)
  if (!mediaType && message.has_attachment) {
    const msgType = (message.message_type || '').toLowerCase()
    if (msgType === 'ptt' || msgType === 'audio' || msgType === 'voice') {
      mediaType = 'audio'
    } else if (msgType === 'image' || msgType === 'sticker') {
      mediaType = 'image'
    } else if (msgType === 'video') {
      mediaType = 'video'
    } else if (msgType === 'document' || msgType === 'file') {
      mediaType = 'document'
    } else {
      mediaType = 'document' // generic fallback
    }
  }

  // Timelines sometimes puts voice note URL in message.data rather than attachment_url
  const mediaUrl: string | null =
    message.attachment_url ||
    (message.has_attachment
      ? ((message.data?.url as string | undefined) ||
         (message.data?.audio_url as string | undefined) ||
         (message.data?.download_url as string | undefined) ||
         null)
      : null)

  console.log('[webhook] media', {
    message_type: message.message_type,
    has_attachment: message.has_attachment,
    attachment_url: message.attachment_url,
    attachment_filename: message.attachment_filename,
    resolved_media_type: mediaType,
    resolved_media_url: mediaUrl,
  })

  const messageRow = {
    thread_id: thread.id,
    panel,
    channel_type: 'whatsapp' as const,
    direction: message.from_me ? ('out' as const) : ('in' as const),
    body: message.text || null,
    media_url: mediaUrl,
    media_type: mediaType,
    media_filename: message.attachment_filename,
    timelines_uid: message.uid,
    from_phone: message.sender_phone || null,
    from_name: message.sender_name || null,
    sent_at: sentAt,
    status: message.status || null,
    is_group_message: chat.is_group,
    // raw column does not exist in whatsapp_messages schema — omitted
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

  // ── AI priority classification (inbound only, non-fatal) ─────────────────────
  // Only classify inbound text messages — skip outbound, media-only, and group msgs
  if (!message.from_me && !chat.is_group && message.text) {
    void classifyAndFlag(service, thread.id, message.text, chat.name || null).catch(
      (err) => console.error('[webhook] classify non-fatal', (err as Error).message)
    )
  }

  return NextResponse.json({ ok: true, written: true })
}

// ── Priority classifier ───────────────────────────────────────────────────────

type SupabaseService = ReturnType<typeof createServiceClient>

async function classifyAndFlag(
  service: SupabaseService,
  threadId: string,
  text: string,
  contactName: string | null
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return

  const client = new Anthropic({ apiKey })

  // Cheap classification — Haiku, single token answer
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4,
    system: `You classify inbound messages for a real estate investment firm.
Reply with only the word PRIORITY or NORMAL.
Mark PRIORITY if the message contains ANY of: investment interest, deal inquiry, money/amount, commitment language ("I want to invest", "let's move forward", "ready to"), urgency ("asap", "urgent", "need to talk today"), or a referral opportunity.
Mark NORMAL for everything else.`,
    messages: [
      {
        role: 'user',
        content: contactName
          ? `From: ${contactName}\nMessage: ${text.slice(0, 400)}`
          : `Message: ${text.slice(0, 400)}`,
      },
    ],
  })

  const answer = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map((b) => b.text.trim().toUpperCase())
    .join('')

  if (answer.startsWith('PRIORITY')) {
    // Mark the thread as priority — column must exist:
    // ALTER TABLE whatsapp_threads ADD COLUMN IF NOT EXISTS is_priority boolean DEFAULT false;
    await service
      .from('whatsapp_threads')
      .update({ is_priority: true })
      .eq('id', threadId)
    console.log('[webhook] flagged thread as priority', { threadId, contactName })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST webhooks here' })
}
