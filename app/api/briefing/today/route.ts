import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { getTodayEvents } from '@/lib/google/calendar'
import {
  listDeals,
  getStageNameMap,
  pipedriveDealUrl,
  type PipedriveDeal,
} from '@/lib/pipedrive/client'

export const dynamic = 'force-dynamic'

const ALLOWED_EMAIL = 'g@reprime.com'
const ACTIVE_DEALS_CACHE_TTL = 300 // 5 min
const ACTIVE_DEALS_CACHE_KEY = 'briefing:active-deals:v1'

interface ActiveDeal {
  id: number
  title: string
  value: number
  currency: string
  stage: string
  stage_change_time: string | null
  pipedrive_url: string
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

async function fetchActiveDeals(): Promise<ActiveDeal[]> {
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get<ActiveDeal[]>(ACTIVE_DEALS_CACHE_KEY)
      if (cached) return cached
    } catch (err) {
      console.error('[briefing] active_deals cache read failed', err)
    }
  }

  // Pipedrive returns up to ~500 deals per page; sort=stage_change_time DESC
  // surfaces freshly-moved deals first. Asking for a generous limit and then
  // slicing gives us resilience to deals missing stage_change_time.
  let raw: PipedriveDeal[] = []
  try {
    raw = await listDeals({
      status: 'open',
      limit: 50,
      sort: 'stage_change_time DESC',
    })
  } catch (err) {
    console.error('[briefing] active_deals fetch failed', err)
    return []
  }

  let stageMap = new Map<number, string>()
  try {
    stageMap = await getStageNameMap()
  } catch (err) {
    console.error('[briefing] stages fetch failed', err)
  }

  const sorted = raw
    .filter((d) => d.status === 'open')
    .sort((a, b) => {
      const at = a.stage_change_time ? new Date(a.stage_change_time).getTime() : 0
      const bt = b.stage_change_time ? new Date(b.stage_change_time).getTime() : 0
      return bt - at
    })
    .slice(0, 10)

  const items: ActiveDeal[] = sorted.map((d) => ({
    id: d.id,
    title: d.title,
    value: d.value ?? 0,
    currency: d.currency ?? 'USD',
    stage: stageMap.get(d.stage_id) ?? `Stage ${d.stage_id}`,
    stage_change_time: d.stage_change_time ?? null,
    pipedrive_url: pipedriveDealUrl(d.id),
  }))

  if (redis) {
    try {
      await redis.set(ACTIVE_DEALS_CACHE_KEY, items, { ex: ACTIVE_DEALS_CACHE_TTL })
    } catch (err) {
      console.error('[briefing] active_deals cache write failed', err)
    }
  }
  return items
}

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
  active_deals: ActiveDeal[]
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

  // 6. Active Pipedrive deals (top 10 open by stage_change_time desc, 5-min cache)
  const activeDeals = await fetchActiveDeals()

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
    active_deals: activeDeals,
  }

  return NextResponse.json(payload)
}
