// ─── /api/cron/sec-edgar-poll ──────────────────────────────────────────────
// Daily cron that drives lib/sec-edgar/client.ts: resolve the tenant watchlist
// to CIKs, pull recent material filings, diff against sec_filings, insert
// deltas. accession_no is the PK so re-runs are duplicate-safe.
//
// Watchlist mirrors the Inforuptcy tenant list but keyed by ticker where the
// company is (or was) SEC-registered. Delisted names that no longer resolve
// are reported in `unresolved` rather than erroring the whole run.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { searchTenantFilings, type SecFiling } from '@/lib/sec-edgar/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

// Public tenants tracked for material events. Tickers resolve via SEC's
// company_tickers.json; names work too (substring match). Locked 2026-06-17.
const WATCHLIST = [
  'DLTR', // Dollar Tree (parent of Family Dollar)
  'PLNT', // Planet Fitness
  'TSCO', // Tractor Supply
  'BIG', // Big Lots
  'JOAN', // Joann (may be delisted — reported as unresolved if so)
]

// How far back to consider a filing "recent" on each run. Generous window so a
// missed day still backfills; PK dedupe keeps it idempotent.
const SINCE_DAYS = 14

interface PollResult {
  newCount: number
  byTenant: Record<string, number>
  unresolved: string[]
  errors: string[]
}

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return true // Permissive in local dev when secret unset.
  const header = request.headers.get('authorization') || ''
  return header === `Bearer ${expected}`
}

async function persistDeltas(
  filings: SecFiling[],
): Promise<{ newCount: number; errors: string[] }> {
  if (filings.length === 0) return { newCount: 0, errors: [] }
  const svc = createServiceClient()
  const errors: string[] = []

  const accns = filings.map((f) => f.accession_no)
  const { data: existingRows, error: existingErr } = await svc
    .from('sec_filings')
    .select('accession_no')
    .in('accession_no', accns)
  if (existingErr) {
    errors.push(`existing_lookup_failed: ${existingErr.message}`)
    return { newCount: 0, errors }
  }
  const existing = new Set(
    (existingRows ?? []).map((r: { accession_no: string }) => r.accession_no),
  )
  const fresh = filings.filter((f) => !existing.has(f.accession_no))
  if (fresh.length === 0) return { newCount: 0, errors }

  const rows = fresh.map((f) => ({
    accession_no: f.accession_no,
    cik: f.cik,
    company: f.company,
    ticker: f.ticker,
    form: f.form,
    filed_at: f.filed_at,
    report_date: f.report_date,
    primary_doc_url: f.primary_doc_url,
    description: f.description,
    items: f.items,
    raw: f.raw,
  }))

  const { error: insertErr } = await svc
    .from('sec_filings')
    .upsert(rows, { onConflict: 'accession_no', ignoreDuplicates: true })
  if (insertErr) {
    errors.push(`insert_failed: ${insertErr.message}`)
    return { newCount: 0, errors }
  }
  return { newCount: fresh.length, errors }
}

async function runPoll(): Promise<PollResult> {
  const result: PollResult = { newCount: 0, byTenant: {}, unresolved: [], errors: [] }

  let scraped: Awaited<ReturnType<typeof searchTenantFilings>>
  try {
    scraped = await searchTenantFilings(WATCHLIST, { sinceDays: SINCE_DAYS })
  } catch (err) {
    result.errors.push(`fetch_failed: ${(err as Error).message}`)
    return result
  }
  result.byTenant = scraped.byTenant
  result.unresolved = scraped.unresolved
  result.errors.push(...scraped.errors)

  const persisted = await persistDeltas(scraped.all)
  result.newCount = persisted.newCount
  result.errors.push(...persisted.errors)
  return result
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await runPoll()
  const status = result.errors.length > 0 ? 502 : 200
  return NextResponse.json(result, { status })
}

// Vercel Cron uses GET by default; same Bearer guard for manual smoke-tests.
export async function GET(request: Request) {
  return POST(request)
}
