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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Timelines ${res.status} ${path}: ${body.slice(0, 300)}`)
  }
  return res.json() as Promise<T>
}

export async function getChats(panel: Panel): Promise<TimelinesChat[]> {
  const account = PANEL_ACCOUNT_MAP[panel]
  const params = new URLSearchParams({ whatsapp_account_phone: account })
  const data = await request<{ results?: TimelinesChat[] } | TimelinesChat[]>(
    `/chats/?${params.toString()}`
  )
  return Array.isArray(data) ? data : data.results ?? []
}

export async function getMessages(chatId: number): Promise<TimelinesMessage[]> {
  const data = await request<{ results?: TimelinesMessage[] } | TimelinesMessage[]>(
    `/messages/?chat_id=${chatId}`
  )
  return Array.isArray(data) ? data : data.results ?? []
}

export async function sendMessage(
  chatId: number,
  text: string,
  accountId: string
): Promise<TimelinesMessage> {
  return request<TimelinesMessage>('/messages/', {
    method: 'POST',
    body: JSON.stringify({
      chat_id: chatId,
      text,
      whatsapp_account_phone: accountId,
    }),
  })
}
