import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { getChats } from '@/lib/timelines/client'
import { normalizePhone } from '@/lib/timelines/normalize-phone'
import { parseTimelinesTimestamp } from '@/lib/timelines/parse'
import type { Panel, TimelinesChat, DashboardThread } from '@/lib/timelines/types'

export const dynamic = 'force-dynamic'

function chatToThreadRow(chat: TimelinesChat, panel: Panel) {
  const phone = normalizePhone(chat.phone) || chat.phone
  const lastAt = chat.last_message_timestamp
    ? parseTimelinesTimestamp(chat.last_message_timestamp).toISOString()
    : null
  return {
    panel,
    channel_type: 'whatsapp' as const,
    phone,
    contact_name: chat.name || null,
    is_group: false,
    jid: chat.jid || null,
    last_message_at: lastAt,
    last_message_preview: null,
    unread_count: chat.read === false ? 1 : 0,
    pipedrive_contact_id: null,
    is_investor: false,
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || user.email !== 'g@reprime.com') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const panelParam = request.nextUrl.searchParams.get('panel')
    if (panelParam !== '718' && panelParam !== '305') {
      return NextResponse.json({ error: 'invalid panel' }, { status: 400 })
    }
    const panel: Panel = panelParam

    const chats: TimelinesChat[] = await getChats(panel)

    const kept: TimelinesChat[] = []
    let discardedCount = 0
    for (const c of chats) {
      const raw = c.phone
      const isInvalidRaw = raw == null || raw === '' || raw === '+0' || raw === '0'
      const normalized = isInvalidRaw ? null : normalizePhone(raw)
      const isGroupJid =
        typeof c.whatsapp_account_id === 'string' && c.whatsapp_account_id.endsWith('@g.us')
      if (isInvalidRaw || !normalized || c.is_group === true || isGroupJid) {
        discardedCount++
        continue
      }
      kept.push(c)
    }
    console.log('[/api/whatsapp/threads] filtered', {
      panel,
      total: chats.length,
      kept: kept.length,
      discarded: discardedCount,
    })

    const service = createServiceClient()
    const rows = kept.map((c) => chatToThreadRow(c, panel))

    const sortedRows = rows.sort((a, b) => {
      const at = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const bt = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      return at - bt
    })
    const dedupedRows = Array.from(
      new Map(sortedRows.map((r) => [r.phone, r])).values()
    )

    console.log('[/api/whatsapp/threads] dedup', {
      panel,
      kept: rows.length,
      deduped: dedupedRows.length,
    })

    if (dedupedRows.length > 0) {
      const { error: upsertErr } = await service
        .from('whatsapp_threads')
        .upsert(dedupedRows, { onConflict: 'panel,phone,channel_type' })
      if (upsertErr) {
        console.error('[/api/whatsapp/threads] DB error', {
          error: upsertErr?.message,
          code: upsertErr?.code,
          details: upsertErr?.details,
          hint: upsertErr?.hint,
          panel,
        })
        return NextResponse.json(
          { error: 'db_upsert_failed', message: upsertErr.message },
          { status: 500 }
        )
      }
    }

    const { data: threads, error: selectErr } = await service
      .from('whatsapp_threads')
      .select('*')
      .eq('panel', panel)
      .eq('channel_type', 'whatsapp')
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (selectErr) {
      console.error('[/api/whatsapp/threads] DB error', {
        error: selectErr?.message,
        code: selectErr?.code,
        details: selectErr?.details,
        hint: selectErr?.hint,
        panel,
      })
      return NextResponse.json(
        { error: 'db_select_failed', message: selectErr.message },
        { status: 500 }
      )
    }

    const threadIds = (threads || []).map((t) => t.id)
    let investorIds = new Set<string>()
    if (threadIds.length > 0) {
      const { data: tagJoins } = await service
        .from('thread_tags')
        .select('thread_id, tags!inner(is_investor)')
        .in('thread_id', threadIds)
        .eq('tags.is_investor', true)
      investorIds = new Set((tagJoins || []).map((t: { thread_id: string }) => t.thread_id))
    }

    const previewByChatId = new Map<number, string>()
    for (const c of chats) {
      if (c.last_message_uid && (c as TimelinesChat & { last_message_text?: string }).last_message_text) {
        previewByChatId.set(c.id, (c as TimelinesChat & { last_message_text?: string }).last_message_text || '')
      }
    }

    const result: DashboardThread[] = (threads || []).map(
      (t: {
        id: string
        panel: Panel
        phone: string
        contact_name: string | null
        is_group: boolean
        jid: string | null
        last_message_at: string | null
        last_message_preview: string | null
        unread_count: number | null
        pipedrive_contact_id: number | null
        timelines_chat_id: number | null
      }) => ({
        id: t.id,
        panel: t.panel,
        channel_type: 'whatsapp' as const,
        phone: t.phone,
        contact_name: t.contact_name,
        is_group: t.is_group,
        jid: t.jid,
        last_message_at: t.last_message_at,
        last_message_preview: t.last_message_preview,
        unread_count: t.unread_count ?? 0,
        pipedrive_contact_id: t.pipedrive_contact_id,
        is_investor: investorIds.has(t.id),
      })
    )

    return NextResponse.json({ threads: result })
  } catch (e: any) {
    console.error('[/api/whatsapp/threads] handler error', { message: e?.message, stack: e?.stack })
    return NextResponse.json({ error: 'Failed to load threads', detail: e?.message }, { status: 502 })
  }
}
