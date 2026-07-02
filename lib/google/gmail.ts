import { google, type gmail_v1 } from 'googleapis'
import { extractPlainTextBody } from './gmail-body'

/**
 * Minimal Gmail wrapper that reuses the existing GOOGLE_REFRESH_TOKEN
 * established for Calendar (see lib/google/calendar.ts). Adding the
 * https://www.googleapis.com/auth/gmail.readonly scope to the existing
 * OAuth client is a one-time consent step Gideon performs in the Google
 * account chooser; if the API call returns 403/insufficient_scope the
 * caller surfaces "needs consent" to the UI.
 */

/**
 * Multi-account registry. Each mailbox maps to its real email and the env var
 * holding its refresh token. NEVER hardcode a token value — only the env var
 * NAME lives here.
 *
 * Verified 2026-06-24 via users.getProfile:
 *   - GOOGLE_REFRESH_TOKEN   → g@reprime.com (primary, key 'primary')
 *   - GOOGLE_REFRESH_TOKEN_2 → g@floridastatetrust.com (secondary, key 'fst'),
 *     currently UNSET in Vercel — see SECONDARY_ACCOUNT_PLACEHOLDER below.
 *
 * The 'primary' key is also reachable via the legacy alias 'fst' through
 * resolveAccount(); this keeps any caller that hard-coded the old key name
 * working until the next code sweep.
 */
export type GmailAccountKey = 'primary' | 'fst'

export type GmailAccount = {
  key: GmailAccountKey
  email: string
  refreshTokenEnvVar: string
}

/**
 * Email reported for the secondary mailbox before its token is configured.
 * The EmailPanel renders a "Setup required" tab when configuredAccounts()
 * returns only the primary; this address is the *expected* second mailbox.
 */
export const SECONDARY_ACCOUNT_PLACEHOLDER = 'g@floridastatetrust.com'

export const GMAIL_ACCOUNTS: Record<GmailAccountKey, GmailAccount> = {
  primary: {
    key: 'primary',
    email: 'g@reprime.com',
    refreshTokenEnvVar: 'GOOGLE_REFRESH_TOKEN',
  },
  fst: {
    key: 'fst',
    email: SECONDARY_ACCOUNT_PLACEHOLDER,
    refreshTokenEnvVar: 'GOOGLE_REFRESH_TOKEN_2',
  },
}

// Backward-compatible default: the original single mailbox.
const DEFAULT_ACCOUNT_KEY: GmailAccountKey = 'primary'

/** Resolve an account from a key, an email, or undefined (→ default). */
function resolveAccount(account?: GmailAccountKey | string): GmailAccount {
  if (!account) return GMAIL_ACCOUNTS[DEFAULT_ACCOUNT_KEY]
  // Legacy alias: pre-2026-06-30 callers used 'reprime' for the primary mailbox.
  if (account === 'reprime') return GMAIL_ACCOUNTS.primary
  const byKey = GMAIL_ACCOUNTS[account as GmailAccountKey]
  if (byKey) return byKey
  const lower = account.toLowerCase()
  for (const acc of Object.values(GMAIL_ACCOUNTS)) {
    if (acc.email.toLowerCase() === lower) return acc
  }
  return GMAIL_ACCOUNTS[DEFAULT_ACCOUNT_KEY]
}

/**
 * Setup status for the secondary mailbox. Used by the EmailPanel + sync route
 * to surface a "Setup required" tab when GOOGLE_REFRESH_TOKEN_2 isn't set.
 */
export type SecondaryAccountStatus =
  | { ok: true; email: string }
  | { ok: false; reason: 'setup_required'; email: string; missingEnv: string[] }

export function secondaryAccountStatus(): SecondaryAccountStatus {
  const acc = GMAIL_ACCOUNTS.fst
  const token = process.env[acc.refreshTokenEnvVar]
  if (typeof token === 'string' && token.trim().length > 0) {
    return { ok: true, email: acc.email }
  }
  return {
    ok: false,
    reason: 'setup_required',
    email: acc.email,
    missingEnv: [acc.refreshTokenEnvVar],
  }
}

/**
 * Accounts whose refresh-token env var is set and non-empty. Used by the sync
 * route to loop only over mailboxes that are actually configured. When only
 * one token is present, behavior matches the original single-account flow.
 */
export function configuredAccounts(): GmailAccount[] {
  return Object.values(GMAIL_ACCOUNTS).filter((acc) => {
    const token = process.env[acc.refreshTokenEnvVar]
    return typeof token === 'string' && token.trim().length > 0
  })
}

function getAuthClient(account?: GmailAccountKey | string) {
  const acc = resolveAccount(account)
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  )
  auth.setCredentials({ refresh_token: process.env[acc.refreshTokenEnvVar] })
  return auth
}

/** Gmail API client bound to a specific mailbox (key or email; default 'fst'). */
export function client(account?: GmailAccountKey | string): gmail_v1.Gmail {
  return google.gmail({ version: 'v1', auth: getAuthClient(account) })
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
  accountEmail?: GmailAccountKey | string,
  days = 7,
): Promise<GmailListItem[]> {
  const gmail = client(accountEmail)
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
export async function getMessage(
  messageId: string,
  accountEmail?: GmailAccountKey | string,
): Promise<GmailMessage> {
  const gmail = client(accountEmail)
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

export type GmailMessageBody = {
  id: string
  /** Decoded plain text (HTML bodies are stripped — never raw HTML). */
  text: string
  source: 'plain' | 'html' | 'none'
}

/**
 * Fetch one message's decoded plain-text body. Prefers text/plain parts;
 * falls back to text/html stripped to plain text (see lib/google/gmail-body).
 * Callers cap length with MAX_BODY_CHARS before shipping to the UI.
 */
export async function getMessageBody(
  messageId: string,
  accountEmail?: GmailAccountKey | string,
): Promise<GmailMessageBody> {
  const gmail = client(accountEmail)
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  })
  const { text, source } = extractPlainTextBody(res.data.payload || undefined)
  return { id: res.data.id || messageId, text, source }
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
