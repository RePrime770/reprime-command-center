// ─── /api/cron/courtlistener-poll ──────────────────────────────────────────
// Daily cron that drives lib/courtlistener/client.ts: search RECAP dockets for
// each watchlist tenant, tag the matching tenant, diff against court_dockets,
// insert deltas. docket_id is the PK so re-runs are duplicate-safe.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { searchDockets, type CourtDocket } from '@/lib/courtlistener/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

// Tenants tracked for new dockets. Free-text names, quoted at the API layer.
// Locked 2026-06-17 (mirrors the Inforuptcy / SEC watchlist).
const WATCHLIST = [
  'Family Dollar Stores',
  'Dollar Tree',
  'Planet Fitness',
  'Tractor Supply',
  'Joann',
  'Big Lots',
]

const SINCE_DAYS = 21

type TaggedDocket = CourtDocket & { matched_tenant: string }

interface PollResult {
  newCount: number
  byTenant: Record<string, number>
  errors: string[]
}

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return true
  const header = request.headers.get('authorization') || ''
  return header === `Bearer ${expected}`
}

async function collect(): Promise<{ dockets: TaggedDocket[]; byTenant: Record<string, number>; errors: string[] }> {
  const dockets: TaggedDocket[] = []
  const byTenant: Record<string, number> = {}
  const errors: string[] = []
  const seen = new Set<number>()

  for (const tenant of WATCHLIST) {
    try {
      const found = await searchDockets(tenant, { sinceDays: SINCE_DAYS })
      let added = 0
      for (const d of found) {
        if (seen.has(d.docket_id)) continue
        seen.add(d.docket_id)
        dockets.push({ ...d, matched_tenant: tenant })
        added++
      }
      byTenant[tenant] = added
      await new Promise((r) => setTimeout(r, 500))
    } catch (err) {
      errors.push(`${tenant}: ${(err as Error).message}`)
      byTenant[tenant] = 0
    }
  }
  return { dockets, byTenant, errors }
}

async function persistDeltas(
  dockets: TaggedDocket[],
): Promise<{ newCount: number; errors: string[] }> {
  if (dockets.length === 0) return { newCount: 0, errors: [] }
  const svc = createServiceClient()
  const errors: string[] = []

  const ids = dockets.map((d) => d.docket_id)
  const { data: existingRows, error: existingErr } = await svc
    .from('court_dockets')
    .select('docket_id')
    .in('docket_id', ids)
  if (existingErr) {
    errors.push(`existing_lookup_failed: ${existingErr.message}`)
    return { newCount: 0, errors }
  }
  const existing = new Set((existingRows ?? []).map((r: { docket_id: number }) => r.docket_id))
  const fresh = dockets.filter((d) => !existing.has(d.docket_id))
  if (fresh.length === 0) return { newCount: 0, errors }

  const rows = fresh.map((d) => ({
    docket_id: d.docket_id,
    case_name: d.case_name,
    docket_number: d.docket_number,
    court: d.court,
    court_id: d.court_id,
    chapter: d.chapter,
    nature_of_suit: d.nature_of_suit,
    date_filed: d.date_filed,
    absolute_url: d.absolute_url,
    matched_tenant: d.matched_tenant,
    raw: d.raw,
  }))

  const { error: insertErr } = await svc
    .from('court_dockets')
    .upsert(rows, { onConflict: 'docket_id', ignoreDuplicates: true })
  if (insertErr) {
    errors.push(`insert_failed: ${insertErr.message}`)
    return { newCount: 0, errors }
  }
  return { newCount: fresh.length, errors }
}

async function runPoll(): Promise<PollResult> {
  const result: PollResult = { newCount: 0, byTenant: {}, errors: [] }
  const collected = await collect()
  result.byTenant = collected.byTenant
  result.errors.push(...collected.errors)

  const persisted = await persistDeltas(collected.dockets)
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

export async function GET(request: Request) {
  return POST(request)
}
