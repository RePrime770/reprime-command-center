import { NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import type { DashboardThread, Panel } from '@/lib/timelines/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/whatsapp/investor-chat-threads
 *
 * Returns DashboardThread[] for every thread tagged is_investor=true,
 * from both the 718 and 305 panels combined.
 * Used by InvestorChatPanel as the third full WhatsApp panel.
 */
export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== 'g@reprime.com') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Step 1: Find all investor thread IDs via thread_tags join
  const { data: tagJoins, error: joinErr } = await service
    .from('thread_tags')
    .select('thread_id, tags!inner(is_investor)')
    .eq('tags.is_investor', true)

  if (joinErr) {
    return NextResponse.json({ error: 'db_join_failed', message: joinErr.message }, { status: 500 })
  }

  const investorThreadIds = Array.from(
    new Set(((tagJoins as { thread_id: string }[] | null) || []).map((r) => r.thread_id))
  )

  if (investorThreadIds.length === 0) {
    return NextResponse.json({ threads: [] as DashboardThread[] })
  }

  // Step 2: Fetch those threads
  const { data: rows, error: threadErr } = await service
    .from('whatsapp_threads')
    .select('id, panel, channel_type, phone, contact_name, is_group, jid, last_message_at, last_message_preview, unread_count, pipedrive_contact_id')
    .in('id', investorThreadIds)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (threadErr) {
    return NextResponse.json({ error: 'db_select_failed', message: threadErr.message }, { status: 500 })
  }

  const threads: DashboardThread[] = ((rows as any[]) || []).map((t) => ({
    id: t.id,
    panel: t.panel as Panel,
    channel_type: 'whatsapp' as const,
    phone: t.phone,
    contact_name: t.contact_name,
    is_group: t.is_group,
    jid: t.jid,
    last_message_at: t.last_message_at,
    last_message_preview: t.last_message_preview,
    unread_count: t.unread_count ?? 0,
    pipedrive_contact_id: t.pipedrive_contact_id,
    is_investor: true,
  }))

  return NextResponse.json({ threads })
}
