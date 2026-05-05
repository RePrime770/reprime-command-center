const BASE_URL = 'https://api.zoom.us/v2'
const OAUTH_URL = 'https://zoom.us/oauth/token'

interface CachedToken {
  token: string
  expiresAt: number
}

let cached: CachedToken | null = null

async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET

  if (!accountId || !clientId || !clientSecret) {
    throw new Error(
      'ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET must be set'
    )
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const url = `${OAUTH_URL}?grant_type=account_credentials&account_id=${encodeURIComponent(
    accountId
  )}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}` },
  })

  if (!res.ok) {
    throw new Error(`Zoom OAuth failed: ${res.status} ${await res.text()}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return data.access_token
}

export async function zoomRequest<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const accessToken = await getAccessToken()
  const res = await fetch(BASE_URL + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    throw new Error(
      `Zoom ${init.method ?? 'GET'} ${path} failed: ${res.status} ${await res.text()}`
    )
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export interface ZoomMeeting {
  id: number
  topic: string
  start_time: string
  duration: number
  timezone?: string
  join_url: string
  start_url?: string
  password?: string
}

export function createMeeting(
  userId: string,
  body: {
    topic: string
    start_time: string
    duration: number
    timezone?: string
    agenda?: string
    password?: string
  }
): Promise<ZoomMeeting> {
  return zoomRequest<ZoomMeeting>(`/users/${encodeURIComponent(userId)}/meetings`, {
    method: 'POST',
    body: JSON.stringify({ type: 2, ...body }),
  })
}

export function getMeeting(meetingId: number | string): Promise<ZoomMeeting> {
  return zoomRequest<ZoomMeeting>(`/meetings/${encodeURIComponent(String(meetingId))}`)
}

export function patchMeeting(
  meetingId: number | string,
  body: Partial<{
    topic: string
    start_time: string
    duration: number
    timezone: string
    agenda: string
  }>
): Promise<void> {
  return zoomRequest<void>(`/meetings/${encodeURIComponent(String(meetingId))}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteMeeting(meetingId: number | string): Promise<void> {
  return zoomRequest<void>(`/meetings/${encodeURIComponent(String(meetingId))}`, {
    method: 'DELETE',
  })
}
