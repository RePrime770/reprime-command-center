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

export async function getChats(panel: Panel, page = 1): Promise<TimelinesChat[]> {
  const accountId = PANEL_ACCOUNT_MAP[panel]
  const url = `${BASE_URL}/chats/?per_page=50&page=${page}&whatsapp_account_id=${encodeURIComponent(accountId)}`
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
  const data = (await res.json()) as { results?: TimelinesChat[] } | TimelinesChat[]
  return Array.isArray(data) ? data : data.results ?? []
}

export async function getMessages(chatId: number): Promise<TimelinesMessage[]> {
  const url = `${BASE_URL}/messages/?chat_id=${chatId}`
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
  const data = (await res.json()) as { results?: TimelinesMessage[] } | TimelinesMessage[]
  return Array.isArray(data) ? data : data.results ?? []
}

export async function sendMessage(
  chatId: number,
  text: string,
  accountId: string
): Promise<TimelinesMessage> {
  const url = `${BASE_URL}/messages/`
  const requestBody = JSON.stringify({
    chat_id: chatId,
    text,
    whatsapp_account_phone: accountId,
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
  return (await res.json()) as TimelinesMessage
}
