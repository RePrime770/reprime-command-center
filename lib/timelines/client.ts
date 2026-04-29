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

export async function getChats(panel: Panel, page = 1): Promise<TimelinesChat[]> {
  const accountId = PANEL_ACCOUNT_MAP[panel]
  const url = `${BASE_URL}/chats?per_page=50&page=${page}&whatsapp_account_phone=${encodeURIComponent(accountId)}`
  const res = await fetch(url, { headers: authHeaders(), cache: 'no-store' })
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
