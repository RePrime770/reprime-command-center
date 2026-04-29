import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { getMessages } from '@/lib/timelines/client'
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
    raw: msg.data ?? null,
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
  const { data: thread, error: threadErr } = await service
    .from('whatsapp_threads')
    .select('id, panel, timelines_chat_id, is_group')
    .eq('id', threadId)
    .single()

  if (threadErr || !thread) {
    return NextResponse.json({ error: 'thread not found' }, { status: 404 })
  }

  const chatId: number | null = thread.timelines_chat_id
  if (!chatId) {
    return NextResponse.json({ error: 'thread has no timelines_chat_id' }, { status: 409 })
  }

  let messages: TimelinesMessage[] = []
  try {
    messages = await getMessages(chatId)
  } catch (err) {
    return NextResponse.json(
      { error: 'timelines_failed', message: (err as Error).message },
      { status: 502 }
    )
  }

  const isGroup: boolean = thread.is_group
  const panel: Panel = thread.panel
  const rows = messages.map((m) => {
    const row = messageToRow(m, threadId, panel)
    return { ...row, is_group_message: isGroup }
  })

  if (rows.length > 0) {
    const { error: upsertErr } = await service
      .from('whatsapp_messages')
      .upsert(rows, { onConflict: 'timelines_uid' })
    if (upsertErr) {
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
