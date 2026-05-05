import { google, type gmail_v1 } from 'googleapis'

/**
 * Minimal Gmail wrapper that reuses the existing GOOGLE_REFRESH_TOKEN
 * established for Calendar (see lib/google/calendar.ts). Adding the
 * https://www.googleapis.com/auth/gmail.readonly scope to the existing
 * OAuth client is a one-time consent step Gideon performs in the Google
 * account chooser; if the API call returns 403/insufficient_scope the
 * caller surfaces "needs consent" to the UI.
 */

function getAuthClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return auth
}

function client(): gmail_v1.Gmail {
  return google.gmail({ version: 'v1', auth: getAuthClient() })
}

export type GmailListItem = {
  id: string
  threadId: string
}

/**
 * List recent message metadata for the active mailbox. days defaults to 7.
 * Returns the message + thread ids only — call getMessage for headers.
 */
export async function listRecent(
  _accountEmail: string,
  days = 7,
): Promise<GmailListItem[]> {
  const gmail = client()
  const after = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  // Skip Trash/Spam; everything else (Inbox + categories) is fair game.
  const q = `after:${after} -in:trash -in:spam`
  const out: GmailListItem[] = []
  let pageToken: string | undefined
  // Cap at 500 messages per sync to keep cron under Vercel's 60s budget.
  const MAX = 500
  for (let safety = 0; safety < 10 && out.length < MAX; safety++) {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q,
      maxResults: 100,
      pageToken,
    })
    const msgs = res.data.messages ?? []
    for (const m of msgs) {
      if (m.id && m.threadId) out.push({ id: m.id, threadId: m.threadId })
    }
    if (!res.data.nextPageToken) break
    pageToken = res.data.nextPageToken
  }
  return out.slice(0, MAX)
}

export type GmailMessage = {
  id: string
  threadId: string
  /** Lowercase header name → first value. */
  headers: Record<string, string>
  snippet: string
  /** Gmail's internalDate as ISO. */
  receivedAt: string
  /** True when Gmail labels include IMPORTANT. */
  important: boolean
  /** True when Gmail labels include UNREAD. */
  unread: boolean
  /** Best-effort detection of an attached calendar invite. */
  hasICS: boolean
}

function lowerHeaderMap(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const h of headers ?? []) {
    if (!h.name || !h.value) continue
    const k = h.name.toLowerCase()
    // First occurrence wins; matches the typical "first header" convention.
    if (!(k in out)) out[k] = h.value
  }
  return out
}

function detectICS(payload: gmail_v1.Schema$MessagePart | undefined): boolean {
  if (!payload) return false
  const mt = (payload.mimeType || '').toLowerCase()
  if (mt.startsWith('text/calendar') || mt === 'application/ics') return true
  if (payload.filename && /\.ics$/i.test(payload.filename)) return true
  for (const p of payload.parts ?? []) {
    if (detectICS(p)) return true
  }
  return false
}

/** Fetch one message's headers + flags. Uses metadata format for speed. */
export async function getMessage(messageId: string): Promise<GmailMessage> {
  const gmail = client()
  // Need full to detect ICS in parts. metadata-format omits parts.
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  })
  const data = res.data
  const headers = lowerHeaderMap(data.payload?.headers)
  const labels = data.labelIds ?? []
  const internalDateMs = data.internalDate ? Number(data.internalDate) : Date.now()
  return {
    id: data.id || messageId,
    threadId: data.threadId || messageId,
    headers,
    snippet: data.snippet || '',
    receivedAt: new Date(internalDateMs).toISOString(),
    important: labels.includes('IMPORTANT'),
    unread: labels.includes('UNREAD'),
    hasICS: detectICS(data.payload || undefined),
  }
}

/**
 * Parse a "From" header (`"Name" <addr@host>` or just `addr@host`) into
 * { name, address }. Lowercases the address.
 */
export function parseFromHeader(value: string | undefined): {
  name: string
  address: string
} {
  if (!value) return { name: '', address: '' }
  const angle = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (angle) {
    return {
      name: angle[1].trim(),
      address: angle[2].trim().toLowerCase(),
    }
  }
  return { name: '', address: value.trim().toLowerCase() }
}

/** Standard "insufficient scope" detection. */
export function isInsufficientScopeError(err: unknown): boolean {
  const e = err as { code?: number; message?: string; errors?: Array<{ reason?: string }> }
  if (!e) return false
  if (e.code === 403 || e.code === 401) {
    const msg = (e.message || '').toLowerCase()
    if (msg.includes('insufficient') || msg.includes('scope')) return true
  }
  for (const it of e.errors ?? []) {
    if ((it.reason || '').toLowerCase() === 'insufficientpermissions') return true
  }
  return false
}
