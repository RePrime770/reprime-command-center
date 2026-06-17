// ─── SEC EDGAR connector — free official filings API ───────────────────────
// Unlike Inforuptcy (Playwright scrape), the SEC publishes a free, documented
// JSON API. We use two endpoints:
//   1. https://www.sec.gov/files/company_tickers.json  — ticker → CIK map
//   2. https://data.sec.gov/submissions/CIK##########.json — recent filings
//
// For a distressed-asset CRE firm the signal we care about is *material events*
// on the public tenants we track: Chapter 11 / store-closure 8-Ks, annual and
// quarterly reports, and delisting/deregistration forms. We resolve each
// watchlist tenant to a CIK, pull its recent filings, keep only material forms,
// and let the cron diff against the DB.
//
// Environment:
//   SEC_EDGAR_USER_AGENT — REQUIRED by the SEC. Must be a real contact string
//     (e.g. "RePrime Group g@reprime.com"). The SEC blocks requests with no /
//     generic User-Agent. Defaults to the RePrime contact if unset.
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN — optional; caches the
//     ~13k-row ticker map for 24h so we don't refetch it every run.
//
// Runtime: works on edge or node. Plain fetch, no browser.

import { Redis } from '@upstash/redis'

const TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json'
const SUBMISSIONS_BASE = 'https://data.sec.gov/submissions'
const TICKER_CACHE_KEY = 'sec:tickers:v1'
const TICKER_CACHE_TTL_SECONDS = 24 * 60 * 60 // 24h
const FETCH_TIMEOUT_MS = 20_000

// Material forms worth surfacing. 8-K = current report (bankruptcy, closures,
// auditor changes); 10-K/10-Q = annual/quarterly; 25-NSE = delisting notice;
// 15-12B/15-12G = deregistration (company going dark). SC 13D/G = >5% stakes.
const DEFAULT_MATERIAL_FORMS = [
  '8-K', '8-K/A',
  '10-K', '10-K/A',
  '10-Q', '10-Q/A',
  '25-NSE', '25',
  '15-12B', '15-12G', '15-15D',
  'SC 13D', 'SC 13D/A', 'SC 13G', 'SC 13G/A',
] as const

export interface SecFiling {
  accession_no: string // PK (e.g. "0000768835-25-000034")
  cik: string // zero-padded 10-digit
  company: string | null
  ticker: string | null
  form: string
  filed_at: string | null // ISO date YYYY-MM-DD
  report_date: string | null // ISO date YYYY-MM-DD
  primary_doc_url: string | null
  description: string | null
  items: string | null // 8-K item codes, comma-joined
  raw: Record<string, unknown>
}

interface TickerEntry {
  cik_str: number
  ticker: string
  title: string
}

function userAgent(): string {
  return process.env.SEC_EDGAR_USER_AGENT || 'RePrime Group g@reprime.com'
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

async function timedFetch(url: string): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    // SEC mandates a descriptive User-Agent; Accept-Encoding keeps payloads small.
    return await fetch(url, {
      headers: {
        'User-Agent': userAgent(),
        'Accept-Encoding': 'gzip, deflate',
        Accept: 'application/json',
      },
      signal: ctrl.signal,
      cache: 'no-store',
    })
  } finally {
    clearTimeout(t)
  }
}

function padCik(cik: number | string): string {
  return String(cik).replace(/\D/g, '').padStart(10, '0')
}

async function loadTickerMap(): Promise<TickerEntry[]> {
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get<TickerEntry[]>(TICKER_CACHE_KEY)
      if (cached?.length) return cached
    } catch (err) {
      console.error('[sec-edgar] ticker cache read failed', err)
    }
  }

  const res = await timedFetch(TICKERS_URL)
  if (!res.ok) throw new Error(`sec_tickers_fetch_failed: ${res.status}`)
  // Shape: { "0": {cik_str, ticker, title}, "1": {...}, ... }
  const json = (await res.json()) as Record<string, TickerEntry>
  const entries = Object.values(json)

  if (redis) {
    try {
      await redis.set(TICKER_CACHE_KEY, entries, { ex: TICKER_CACHE_TTL_SECONDS })
    } catch (err) {
      console.error('[sec-edgar] ticker cache write failed', err)
    }
  }
  return entries
}

/**
 * Resolve a free-text company name OR ticker to its SEC CIK. Exact ticker
 * matches win; otherwise the first title that contains the query (case-
 * insensitive) is used. Returns null for delisted/never-registered names.
 */
export async function resolveCik(
  query: string,
): Promise<{ cik: string; ticker: string; title: string } | null> {
  const entries = await loadTickerMap()
  const q = query.trim().toLowerCase()

  const byTicker = entries.find((e) => e.ticker.toLowerCase() === q)
  if (byTicker) {
    return { cik: padCik(byTicker.cik_str), ticker: byTicker.ticker, title: byTicker.title }
  }

  const byTitle = entries.find((e) => e.title.toLowerCase().includes(q))
  if (byTitle) {
    return { cik: padCik(byTitle.cik_str), ticker: byTitle.ticker, title: byTitle.title }
  }
  return null
}

function archiveUrl(cik: string, accessionNo: string, primaryDoc: string): string | null {
  if (!primaryDoc) return null
  const cikNoZeros = String(Number(cik)) // strip leading zeros
  const accnNoDashes = accessionNo.replace(/-/g, '')
  return `https://www.sec.gov/Archives/edgar/data/${cikNoZeros}/${accnNoDashes}/${primaryDoc}`
}

interface RecentFilings {
  accessionNumber: string[]
  filingDate: string[]
  reportDate: string[]
  form: string[]
  primaryDocument: string[]
  primaryDocDescription: string[]
  items: string[]
}

/**
 * Pull the most recent filings for a CIK and normalize the SEC's parallel-array
 * format into objects. `sinceDays` / `forms` filter down to material, recent
 * rows. The submissions endpoint returns ~1000 most-recent filings inline,
 * which is far more than a daily/weekly diff needs.
 */
export async function getRecentFilings(
  cik: string,
  opts: { company?: string; ticker?: string; forms?: readonly string[]; sinceDays?: number } = {},
): Promise<SecFiling[]> {
  const forms = new Set((opts.forms ?? DEFAULT_MATERIAL_FORMS).map((f) => f.toUpperCase()))
  const sinceDays = opts.sinceDays ?? 30
  const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const res = await timedFetch(`${SUBMISSIONS_BASE}/CIK${cik}.json`)
  if (!res.ok) throw new Error(`sec_submissions_failed (${cik}): ${res.status}`)
  const data = (await res.json()) as {
    name?: string
    tickers?: string[]
    filings?: { recent?: Partial<RecentFilings> }
  }

  const recent = data.filings?.recent
  if (!recent?.accessionNumber) return []

  const company = opts.company ?? data.name ?? null
  const ticker = opts.ticker ?? data.tickers?.[0] ?? null
  const out: SecFiling[] = []

  const n = recent.accessionNumber.length
  for (let i = 0; i < n; i++) {
    const form = (recent.form?.[i] ?? '').toUpperCase()
    if (!forms.has(form)) continue
    const filedAt = recent.filingDate?.[i] ?? null
    if (filedAt && filedAt < cutoff) continue // arrays are newest-first; could break,
    // but cheap to keep scanning and robust to ordering changes.

    const accession = recent.accessionNumber[i]
    const primaryDoc = recent.primaryDocument?.[i] ?? ''
    out.push({
      accession_no: accession,
      cik,
      company,
      ticker,
      form,
      filed_at: filedAt,
      report_date: recent.reportDate?.[i] || null,
      primary_doc_url: archiveUrl(cik, accession, primaryDoc),
      description: recent.primaryDocDescription?.[i] || null,
      items: recent.items?.[i] || null,
      raw: {
        size: (recent as Record<string, unknown[]>).size?.[i] ?? null,
        core_type: (recent as Record<string, unknown[]>).core_type?.[i] ?? null,
      },
    })
  }
  return out
}

/**
 * Resolve + pull filings for a watchlist of tenant names/tickers. Sequential
 * (the SEC fair-access guideline is <10 req/s; we stay far under). Returns the
 * flat filing list plus per-tenant counts and any unresolved names for cron
 * telemetry.
 */
export async function searchTenantFilings(
  tenants: string[],
  opts: { forms?: readonly string[]; sinceDays?: number } = {},
): Promise<{
  all: SecFiling[]
  byTenant: Record<string, number>
  unresolved: string[]
  errors: string[]
}> {
  const all: SecFiling[] = []
  const byTenant: Record<string, number> = {}
  const unresolved: string[] = []
  const errors: string[] = []

  for (const tenant of tenants) {
    try {
      const resolved = await resolveCik(tenant)
      if (!resolved) {
        unresolved.push(tenant)
        byTenant[tenant] = 0
        continue
      }
      const filings = await getRecentFilings(resolved.cik, {
        company: resolved.title,
        ticker: resolved.ticker,
        forms: opts.forms,
        sinceDays: opts.sinceDays,
      })
      byTenant[tenant] = filings.length
      all.push(...filings)
      // Be polite to the SEC between companies.
      await new Promise((r) => setTimeout(r, 250))
    } catch (err) {
      errors.push(`${tenant}: ${(err as Error).message}`)
      byTenant[tenant] = 0
    }
  }

  return { all, byTenant, unresolved, errors }
}

export { DEFAULT_MATERIAL_FORMS }
