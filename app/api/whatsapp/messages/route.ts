import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { getAllChats, getMessages, sendMessage, PANEL_ACCOUNT_MAP } from '@/lib/timelines/client'
import { normalizePhone } from '@/lib/timelines/normalize-phone'
import { getMediaType, parseTimelinesTimestamp } from '@/lib/timelines/parse'
import type { DashboardMessage, Panel, TimelinesMessage } from '@/lib/timelines/types'

export const dynamic = 'force-dynamic'

function messageToRow(msg: TimelinesMessage, threadId: string, panel: Panel) {
  const sentAt = msg.timestamp
    ? parseTimelinesTimestamp(msg.timestamp).toISOString()
    : null
  const mediaType = getMediaType(msg.attachment_filename)
  return {
    thread_id: threadId,
    panel,
    channel_type: 'whatsapp' as const,
    direction: msg.from_me ? ('out' as const) : ('in' as const),
    body: msg.text || null,
    media_url: msg.attachment_url,
    media_type: mediaType,
    media_filename: msg.attachment_filename,
    timelines_uid: msg.uid,
    from_phone: msg.sender_phone || null,
    from_name: msg.sender_name || null,
    sent_at: sentAt,
    status: msg.status || null,
    is_group_message: false,
    // raw column does not exist in whatsapp_messages schema — omitted
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== 'g@reprime.com') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const threadId = request.nextUrl.searchParams.get('thread_id')
  if (!threadId) {
    return NextResponse.json({ error: 'thread_id required' }, { status: 400 })
  }

  const service = createServiceClient()
  // BUG 3/5: Do NOT select timelines_chat_id — column not in DB.
  // Use phone-based lookup to find Timelines chat ID instead.
  const { data: thread, error: threadErr } = await service
    .from('whatsapp_threads')
    .select('id, panel, phone, is_group')
    .eq('id', threadId)
    .single()

  if (threadErr || !thread) {
    return NextResponse.json({ error: 'thread not found' }, { status: 404 })
  }

  const panel: Panel = thread.panel
  const isGroup: boolean = thread.is_group
  const threadPhone: string = thread.phone

  // Find the matching Timelines chat by phone so we can fetch its messages
  let messages: TimelinesMessage[] = []
  try {
    const allChats = await getAllChats(panel)
    const matchingChat = allChats.find(
      (c) => normalizePhone(c.phone) === threadPhone || c.phone === threadPhone
    )
    if (matchingChat) {
      messages = await getMessages(matchingChat.id)
    } else {
      console.warn('[messages/GET] no matching Timelines chat for phone', { threadPhone, panel, totalChats: allChats.length })
    }
  } catch (err) {
    const msg = (err as Error).message ?? ''
    if (msg.includes('403')) {
      // Quota exhausted — serve from DB cache; don't hard-fail
      console.warn('[messages/GET] Timelines 403 quota — serving DB cache', { threadPhone, panel })
    } else {
      return NextResponse.json(
        { error: 'timelines_failed', message: msg },
        { status: 502 }
      )
    }
  }

  const rows = messages.map((m) => {
    const row = messageToRow(m, threadId, panel)
    return { ...row, is_group_message: isGroup }
  })

  if (rows.length > 0) {
    const { error: upsertErr } = await service
      .from('whatsapp_messages')
      .upsert(rows, { onConflict: 'timelines_uid' })
    if (upsertErr) {
      console.error('[messages/GET] upsert failed', { message: upsertErr.message, code: upsertErr.code })
      return NextResponse.json(
        { error: 'db_upsert_failed', message: upsertErr.message },
        { status: 500 }
      )
    }
  }

  const { data: stored, error: selectErr } = await service
    .from('whatsapp_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('sent_at', { ascending: true, nullsFirst: true })

  if (selectErr) {
    return NextResponse.json(
      { error: 'db_select_failed', message: selectErr.message },
      { status: 500 }
    )
  }

  const result: DashboardMessage[] = (stored || []).map(
    (m: DashboardMessage) => ({
      id: m.id,
      thread_id: m.thread_id,
      panel: m.panel,
      channel_type: m.channel_type,
      direction: m.direction,
      body: m.body,
      media_url: m.media_url,
      media_type: m.media_type,
      media_filename: m.media_filename,
      timelines_uid: m.timelines_uid,
      from_phone: m.from_phone,
      from_name: m.from_name,
      sent_at: m.sent_at,
      status: m.status,
      is_group_message: m.is_group_message,
    })
  )

  return NextResponse.json({ messages: result })
}

type SendBody = {
  panel?: string
  thread_id?: string
  body?: string
  attachment_url?: string
  attachment_filename?: string
  attachment_type?: string
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== 'g@reprime.com') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: SendBody
  try {
    payload = (await request.json()) as SendBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const panelParam = payload.panel
  if (panelParam !== '718' && panelParam !== '305') {
    return NextResponse.json({ error: 'invalid_panel' }, { status: 400 })
  }
  const panel: Panel = panelParam

  const threadId = payload.thread_id
  if (!threadId || typeof threadId !== 'string') {
    return NextResponse.json({ error: 'thread_id_required' }, { status: 400 })
  }

  const text = (payload.body ?? '').trim()
  const attachmentUrl = payload.attachment_url || null
  const attachmentFilename = payload.attachment_filename || null
  const attachmentType = payload.attachment_type || null

  if (!text && !attachmentUrl) {
    return NextResponse.json({ error: 'empty_message' }, { status: 400 })
  }

  const service = createServiceClient()
  // BUG 5: Do NOT select timelines_chat_id — sendMessage() needs phone, not chat ID
  const { data: thread, error: threadErr } = await service
    .from('whatsapp_threads')
    .select('id, panel, phone, is_group')
    .eq('id', threadId)
    .single()

  if (threadErr || !thread) {
    return NextResponse.json({ error: 'thread_not_found' }, { status: 404 })
  }

  if (thread.panel !== panel) {
    return NextResponse.json(
      { error: 'panel_mismatch', message: 'cross-panel send forbidden' },
      { status: 403 }
    )
  }

  const recipientPhone: string | null = thread.phone
  if (!recipientPhone) {
    return NextResponse.json({ error: 'thread_has_no_phone' }, { status: 409 })
  }

  const accountId = PANEL_ACCOUNT_MAP[panel]
  const wireText = attachmentUrl
    ? text
      ? `${text}\n${attachmentUrl}`
      : attachmentUrl
    : text

  const optimisticRow = {
    thread_id: threadId,
    panel,
    channel_type: 'whatsapp' as const,
    direction: 'out' as const,
    body: text || null,
    media_url: attachmentUrl,
    media_type: attachmentType || getMediaType(attachmentFilename),
    media_filename: attachmentFilename,
    timelines_uid: null,
    from_phone: null,
    from_name: null,
    sent_at: new Date().toISOString(),
    status: 'Pending',
    is_group_message: thread.is_group,
  }

  const { data: inserted, error: insertErr } = await service
    .from('whatsapp_messages')
    .insert(optimisticRow)
    .select('*')
    .single()

  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: 'db_insert_failed', message: insertErr?.message },
      { status: 500 }
    )
  }

  let sent: TimelinesMessage
  try {
    sent = await sendMessage({
      phone: recipientPhone,
      text: wireText,
      whatsappAccountPhone: accountId,
    })
  } catch (err) {
    const msg = (err as Error).message ?? ''
    const isQuota = msg.includes('403')
    await service
      .from('whatsapp_messages')
      .update({ status: isQuota ? 'QuotaExceeded' : 'Failed' })
      .eq('id', inserted.id)
    return NextResponse.json(
      {
        error: isQuota ? 'timelines_quota_exceeded' : 'timelines_send_failed',
        message: isQuota
          ? 'Timelines API monthly quota exceeded — resets May 1. Message saved; retry tomorrow.'
          : msg,
      },
      { status: isQuota ? 429 : 502 }
    )
  }

  const sentAtIso = sent.timestamp
    ? parseTimelinesTimestamp(sent.timestamp).toISOString()
    : optimisticRow.sent_at

  const { data: updated, error: updateErr } = await service
    .from('whatsapp_messages')
    .update({
      timelines_uid: sent.uid || null,
      status: sent.status || 'Sent',
      sent_at: sentAtIso,
    })
    .eq('id', inserted.id)
    .select('*')
    .single()

  if (updateErr) {
    return NextResponse.json(
      { error: 'db_update_failed', message: updateErr.message },
      { status: 500 }
    )
  }

  const previewBase = text || attachmentFilename || 'attachment'
  const preview = previewBase.length > 80 ? previewBase.slice(0, 79) + '…' : previewBase
  await service
    .from('whatsapp_threads')
    .update({
      last_message_at: sentAtIso,
      last_message_preview: preview,
    })
    .eq('id', threadId)

  const result: DashboardMessage = {
    id: updated.id,
    thread_id: updated.thread_id,
    panel: updated.panel,
    channel_type: updated.channel_type,
    direction: updated.direction,
    body: updated.body,
    media_url: updated.media_url,
    media_type: updated.media_type,
    media_filename: updated.media_filename,
    timelines_uid: updated.timelines_uid,
    from_phone: updated.from_phone,
    from_name: updated.from_name,
    sent_at: updated.sent_at,
    status: updated.status,
    is_group_message: updated.is_group_message,
  }

  return NextResponse.json(result)
}
