import { NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { getTodayEvents } from '@/lib/google/calendar'

export const dynamic = 'force-dynamic'

const ALLOWED_EMAIL = 'g@reprime.com'

interface BriefingMeeting {
  id: string
  title: string
  startTime: string
  zoomLink: string | null
}

interface BriefingThread {
  id: string
  contact_name: string | null
  phone: string | null
  panel: string | null
  channel_type: string | null
  is_investor: boolean
  unread_count: number
  last_message_at: string | null
  last_message_preview: string | null
}

interface BriefingResponse {
  date: string
  meetings: {
    count: number
    first: BriefingMeeting | null
    nextUp: BriefingMeeting | null
    items: BriefingMeeting[]
  }
  unread: {
    total: number
    by_panel: { '305': number; '718': number; investors: number }
  }
  recent_investors: BriefingThread[]
  expiring_invitations: {
    count: number
    items: Array<{
      id: string
      contact_name: string | null
      contact_email: string | null
      expires_at: string
    }>
  }
  pending_followups: BriefingThread[]
}

function findNextUpId(events: BriefingMeeting[]): string | null {
  const now = Date.now()
  let bestId: string | null = null
  let bestDelta = Infinity
  for (const ev of events) {
    const t = new Date(ev.startTime).getTime()
    if (Number.isNaN(t)) continue
    const delta = t - now
    if (delta >= -5 * 60_000 && delta < bestDelta) {
      bestDelta = delta
      bestId = ev.id
    }
  }
  return bestId
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const svc = createServiceClient()
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  })

  // 1. Today's meetings
  let meetings: BriefingMeeting[] = []
  try {
    const events = await getTodayEvents()
    meetings = events
      .map((e) => ({
        id: e.id,
        title: e.title,
        startTime: e.startTime,
        zoomLink: e.zoomLink,
      }))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  } catch (err) {
    console.error('[briefing] calendar fetch failed', err)
  }

  const nextUpId = findNextUpId(meetings)
  const nextUp = meetings.find((m) => m.id === nextUpId) ?? null

  // 2. Unread by panel
  const unreadByPanel = { '305': 0, '718': 0, investors: 0 }
  try {
    const { data: rows } = await svc
      .from('whatsapp_threads')
      .select('panel, channel_type, is_investor, unread_count')
      .gt('unread_count', 0)
      .or('is_blocked.is.null,is_blocked.eq.false')
    for (const r of (rows ?? []) as Array<{ panel?: string; is_investor?: boolean; unread_count?: number }>) {
      const n = r.unread_count ?? 0
      if (r.is_investor) unreadByPanel.investors += n
      else if (r.panel === '305') unreadByPanel['305'] += n
      else if (r.panel === '718') unreadByPanel['718'] += n
    }
  } catch (err) {
    console.error('[briefing] unread aggregate failed', err)
  }

  // 3. Recent investor activity (last 24h)
  let recentInvestors: BriefingThread[] = []
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: rows } = await svc
      .from('whatsapp_threads')
      .select('id, contact_name, phone, panel, channel_type, is_investor, unread_count, last_message_at, last_message_preview')
      .eq('is_investor', true)
      .or('is_blocked.is.null,is_blocked.eq.false')
      .gte('last_message_at', since)
      .order('last_message_at', { ascending: false })
      .limit(5)
    recentInvestors = (rows ?? []) as BriefingThread[]
  } catch (err) {
    console.error('[briefing] investor activity failed', err)
  }

  // 4. Expiring invitations (sent, expiring within 24h, not yet confirmed)
  type ExpiringRow = { id: string; contact_name: string | null; contact_email: string | null; expires_at: string }
  let expiringItems: ExpiringRow[] = []
  try {
    const horizon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { data: rows } = await svc
      .from('invitations')
      .select('id, contact_name, contact_email, expires_at')
      .eq('status', 'sent')
      .lte('expires_at', horizon)
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })
      .limit(10)
    expiringItems = (rows ?? []) as ExpiringRow[]
  } catch (err) {
    console.error('[briefing] expiring invitations failed', err)
  }

  // 5. Pending follow-ups: top unread non-investor threads
  let pendingFollowups: BriefingThread[] = []
  try {
    const { data: rows } = await svc
      .from('whatsapp_threads')
      .select('id, contact_name, phone, panel, channel_type, is_investor, unread_count, last_message_at, last_message_preview')
      .gt('unread_count', 0)
      .or('is_blocked.is.null,is_blocked.eq.false')
      .order('last_message_at', { ascending: false })
      .limit(5)
    pendingFollowups = (rows ?? []) as BriefingThread[]
  } catch (err) {
    console.error('[briefing] pending followups failed', err)
  }

  const payload: BriefingResponse = {
    date: dateStr,
    meetings: {
      count: meetings.length,
      first: meetings[0] ?? null,
      nextUp,
      items: meetings,
    },
    unread: {
      total: unreadByPanel['305'] + unreadByPanel['718'] + unreadByPanel.investors,
      by_panel: unreadByPanel,
    },
    recent_investors: recentInvestors,
    expiring_invitations: {
      count: expiringItems.length,
      items: expiringItems,
    },
    pending_followups: pendingFollowups,
  }

  return NextResponse.json(payload)
}
