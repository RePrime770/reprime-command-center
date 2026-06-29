import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { findPersonByEmail } from '@/lib/pipedrive/client'
import { GMAIL_ACCOUNTS, secondaryAccountStatus } from '@/lib/google/gmail'

export const dynamic = 'force-dynamic'

const ALLOWED_EMAIL = 'g@reprime.com'
const RESOLVE_CACHE_TTL = 5 * 60 // 5 minutes per dispatch
const DEFAULT_LIMIT = 20
const DEFAULT_MIN_SCORE = 5

type EmailScoreRow = {
  message_id: string
  thread_id: string | null
  from_address: string
  subject: string | null
  score: number
  reasons: ReasonsPayload | null
  scored_at: string
}

type ReasonsPayload = {
  list?: string[]
  from_name?: string | null
  snippet?: string | null
  received_at?: string | null
  account_email?: string | null
  gmail_thread_id?: string | null
  gmail_important?: boolean | null
  unread?: boolean | null
  has_ics?: boolean | null
  signals?: Record<string, unknown> | null
} | null

type ResolvedSender = {
  pipedrive_id: number | null
  pipedrive_name: string | null
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

/**
 * Normalize a stored account_email value to the REAL mailbox address.
 *
 * Legacy rows scored before the multi-account refactor (and rows from any
 * older slot-key path) may carry slot keys like 'primary' / 'fst' / 'reprime'
 * in reasons.account_email. The cockpit tab+badge UI keys off the real email
 * (e.g. 'g@reprime.com'), so resolve here once instead of letting the bad
 * value flow through and mislabel rows.
 */
function normalizeAccountEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (!v) return null
  if (v.includes('@')) return v
  if (v === 'primary' || v === 'reprime') return GMAIL_ACCOUNTS.primary.email
  if (v === 'fst') return GMAIL_ACCOUNTS.fst.email
  return null
}

async function resolveAddress(
  email: string,
  redis: Redis | null,
): Promise<ResolvedSender> {
  const lower = email.trim().toLowerCase()
  if (!lower) return { pipedrive_id: null, pipedrive_name: null }
  const cacheKey = `pipedrive:resolve:${lower}`
  if (redis) {
    try {
      const cached = await redis.get<ResolvedSender>(cacheKey)
      if (cached) return cached
    } catch {
      /* fall through */
    }
  }
  let resolved: ResolvedSender = { pipedrive_id: null, pipedrive_name: null }
  try {
    const person = await findPersonByEmail(lower)
    if (person) {
      resolved = { pipedrive_id: person.id, pipedrive_name: person.name }
    }
  } catch {
    /* keep null on lookup failure */
  }
  if (redis) {
    try {
      await redis.set(cacheKey, resolved, { ex: RESOLVE_CACHE_TTL })
    } catch {
      /* non-fatal */
    }
  }
  return resolved
}

export async function GET(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(
    Number(searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT,
    100,
  )
  const minScore = Number(searchParams.get('min_score') ?? DEFAULT_MIN_SCORE)
  // Optional account filter (mailbox email). When absent, return every mailbox
  // — each item carries its real account_email so the cockpit can tab/merge.
  // Accept either a real email ('g@reprime.com') or a slot key ('primary' /
  // 'fst') as the account filter — normalize to the real email so we match
  // against the normalized account_email stamped on each item.
  const rawAccount = (searchParams.get('account') || '').trim().toLowerCase()
  const accountFilter = normalizeAccountEmail(rawAccount) || rawAccount

  const service = createServiceClient()
  const { data: rows, error } = await service
    .from('email_scores')
    .select('message_id, thread_id, from_address, subject, score, reasons, scored_at')
    .gte('score', minScore)
    .order('score', { ascending: false })
    .order('scored_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json(
      { error: 'db_error', message: error.message },
      { status: 500 },
    )
  }

  const redis = getRedis()
  const items = await Promise.all(
    (rows ?? []).map(async (raw) => {
      const r = raw as EmailScoreRow
      const reasons = r.reasons || {}
      const fromName = reasons.from_name || ''
      const resolved = await resolveAddress(r.from_address, redis)
      const gmailThreadId = reasons.gmail_thread_id || r.thread_id || ''
      const gmailUrl = gmailThreadId
        ? `https://mail.google.com/mail/u/0/#inbox/${gmailThreadId}`
        : 'https://mail.google.com/mail/u/0/#inbox'
      return {
        message_id: r.message_id,
        thread_id: r.thread_id,
        gmail_thread_id: gmailThreadId,
        gmail_url: gmailUrl,
        // Real mailbox this message belongs to (stored at sync time). May be
        // null for legacy rows scored before multi-account; the cockpit
        // tolerates that and groups them under the default inbox.
        // Always stamp the REAL mailbox address (e.g. 'g@reprime.com'), never
        // a slot key — see normalizeAccountEmail() above.
        account_email: normalizeAccountEmail(reasons.account_email),
        from_address: r.from_address,
        from_name: fromName || resolved.pipedrive_name || '',
        pipedrive_id: resolved.pipedrive_id,
        subject: r.subject || '',
        snippet: reasons.snippet || '',
        score: r.score,
        reasons: reasons.list ?? [],
        signals: reasons.signals ?? null,
        received_at: reasons.received_at || r.scored_at,
        gmail_important: !!reasons.gmail_important,
        unread: !!reasons.unread,
        has_ics: !!reasons.has_ics,
        scored_at: r.scored_at,
      }
    }),
  )

  // Optional server-side filter to a single mailbox.
  const filtered = accountFilter
    ? items.filter((it) => (it.account_email || '').toLowerCase() === accountFilter)
    : items

  return NextResponse.json({
    account: accountFilter || 'all',
    min_score: minScore,
    count: filtered.length,
    items: filtered,
    // Lets the cockpit show a "Setup required" tab for the second mailbox
    // when GOOGLE_REFRESH_TOKEN_2 isn't set yet.
    secondary: secondaryAccountStatus(),
  })
}
