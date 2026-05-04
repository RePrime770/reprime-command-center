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

export async function getChats(panel: Panel, page = 1): Promise<TimelinesChat[]> {
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
