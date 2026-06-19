import { Redis } from '@upstash/redis'
import type { Panel, TimelinesChat, TimelinesMessage } from './types'

const BASE_URL = 'https://app.timelines.ai/integrations/api'

export const PANEL_ACCOUNT_MAP: Record<Panel, string> = {
  '718': '+17185505500',
  '305': '+13057784861',
}

function authHeaders() {
  const key = process.env.TIMELINES_API_KEY
  if (!key) throw new Error('TIMELINES_API_KEY not configured')
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

type TimelinesEnvelope<T> = {
  status: 'ok' | 'error'
  message?: string
  data?: T
}

// Per-page fetch deadline so one hung page doesn't kill the whole route.
// Timelines occasionally takes 20s+ on cold paths — bail at 7s and let the
// caller fall back to DB cache (same path as 403/429 handling).
const PER_PAGE_TIMEOUT_MS = 7000

// Redis cache TTLs for getChats. The fresh window matches the upstream
// rate-limit cooldown (~30s); the stale window is held longer so a
// 429/timeout burst can still serve last-known-good data.
const CHATS_FRESH_TTL_SECONDS = 30
const CHATS_STALE_TTL_SECONDS = 300

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    return new Redis({ url, token })
  } catch {
    return null
  }
}

function freshKey(panel: Panel, page: number) {
  return `timelines:chats:${panel}:${page}`
}
function staleKey(panel: Panel, page: number) {
  return `timelines:chats:${panel}:${page}:stale`
}

async function fetchChatsFromUpstream(panel: Panel, page: number): Promise<TimelinesChat[]> {
  const accountId = PANEL_ACCOUNT_MAP[panel]
  const url = `${BASE_URL}/chats?per_page=50&page=${page}&whatsapp_account_phone=${encodeURIComponent(accountId)}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), PER_PAGE_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(url, { headers: authHeaders(), cache: 'no-store', signal: ctrl.signal })
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new Error(`Timelines getChats timeout after ${PER_PAGE_TIMEOUT_MS}ms (page ${page})`)
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[timelines.getChats] FAILED', {
      status: res.status,
      statusText: res.statusText,
      url,
      bodyPreview: body.slice(0, 500),
    })
    throw new Error(`Timelines getChats ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as TimelinesEnvelope<{ chats?: TimelinesChat[] }>
  return json.data?.chats ?? []
}

/**
 * Fetch one page of chats with a 30s Redis cache. On a 429 / timeout the
 * stale (5-minute) cache slot is returned instead of throwing — same
 * stale-while-error contract documented in /api/whatsapp/threads, so the
 * UI keeps rendering whatever Timelines last returned successfully.
 *
 * If Upstash isn't configured the function falls back to a direct fetch.
 */
export async function getChats(panel: Panel, page = 1): Promise<TimelinesChat[]> {
  const redis = getRedis()
  if (!redis) {
    return fetchChatsFromUpstream(panel, page)
  }

  // 1. Try fresh cache first.
  try {
    const cached = await redis.get<TimelinesChat[]>(freshKey(panel, page))
    if (Array.isArray(cached)) return cached
  } catch (err) {
    console.warn('[timelines.getChats] redis read failed (fresh)', {
      panel,
      page,
      message: (err as Error).message,
    })
  }

  // 2. Cache miss — call upstream.
  try {
    const chats = await fetchChatsFromUpstream(panel, page)
    try {
      await Promise.all([
        redis.set(freshKey(panel, page), chats, { ex: CHATS_FRESH_TTL_SECONDS }),
        redis.set(staleKey(panel, page), chats, { ex: CHATS_STALE_TTL_SECONDS }),
      ])
    } catch (writeErr) {
      console.warn('[timelines.getChats] redis write failed', {
        panel,
        page,
        message: (writeErr as Error).message,
      })
    }
    return chats
  } catch (err) {
    const msg = (err as Error).message ?? ''
    const isRateLimited = msg.includes('429') || msg.includes('Requests rate is over limit') || msg.includes('timeout')
    if (!isRateLimited) throw err

    // 3. Stale-while-error: serve last-known-good if we have it.
    try {
      const stale = await redis.get<TimelinesChat[]>(staleKey(panel, page))
      if (Array.isArray(stale)) {
        console.warn('[timelines.getChats] serving stale cache after upstream error', {
          panel,
          page,
          err: msg.slice(0, 200),
          staleCount: stale.length,
        })
        return stale
      }
    } catch (staleReadErr) {
      console.warn('[timelines.getChats] redis read failed (stale)', {
        panel,
        page,
        message: (staleReadErr as Error).message,
      })
    }
    // No stale cache available — propagate so the route can fall back to DB.
    throw err
  }
}

/** Fetches ALL pages of chats (up to maxPages × 50) for a panel. */
export async function getAllChats(panel: Panel, maxPages = 6): Promise<TimelinesChat[]> {
  const all: TimelinesChat[] = []
  for (let page = 1; page <= maxPages; page++) {
    const batch = await getChats(panel, page)
    all.push(...batch)
    if (batch.length < 50) break   // last page
  }
  return all
}

export async function getMessages(chatId: number): Promise<TimelinesMessage[]> {
  const url = `${BASE_URL}/chats/${chatId}/messages`
  const res = await fetch(url, { headers: authHeaders(), cache: 'no-store' })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[timelines.getMessages] FAILED', {
      status: res.status,
      statusText: res.statusText,
      url,
      bodyPreview: body.slice(0, 500),
    })
    throw new Error(`Timelines getMessages ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as TimelinesEnvelope<{ messages?: TimelinesMessage[] }>
  return json.data?.messages ?? []
}

/**
 * Send a message into an EXISTING chat by its Timelines chat id — the only
 * path that works for group chats (the by-phone /messages endpoint returns
 * "no chats found for this group"). Used for the "Terminal invitations" group.
 */
export async function sendChatMessage(chatId: number, text: string): Promise<TimelinesMessage> {
  const url = `${BASE_URL}/chats/${chatId}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    cache: 'no-store',
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[timelines.sendChatMessage] FAILED', { status: res.status, url, bodyPreview: body.slice(0, 300) })
    throw new Error(`Timelines sendChatMessage ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as TimelinesEnvelope<TimelinesMessage>
  return (json.data ?? (json as unknown as TimelinesMessage)) as TimelinesMessage
}

export async function sendMessage(opts: {
  phone: string
  text: string
  whatsappAccountPhone: string
}): Promise<TimelinesMessage> {
  const url = `${BASE_URL}/messages`
  const requestBody = JSON.stringify({
    phone: opts.phone,
    text: opts.text,
    whatsapp_account_phone: opts.whatsappAccountPhone,
  })
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    cache: 'no-store',
    body: requestBody,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[timelines.sendMessage] FAILED', {
      status: res.status,
      statusText: res.statusText,
      url,
      requestBody,
      bodyPreview: body.slice(0, 500),
    })
    throw new Error(`Timelines sendMessage ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as TimelinesEnvelope<TimelinesMessage>
  return (json.data ?? (json as unknown as TimelinesMessage)) as TimelinesMessage
}
