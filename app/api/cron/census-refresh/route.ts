// ─── /api/cron/census-refresh ──────────────────────────────────────────────
// Weekly cron that re-snapshots the configured target markets into
// census_market_snapshots so the dashboard always has warm demographics for
// the geographies the firm is active in. Census data is annual, so weekly is
// generous — this exists to pick up new ACS vintages and seed new markets, not
// to chase daily changes. Upsert on (geo_id, dataset, year) keeps it idempotent.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getMarketDemographics, type CensusMarket, type MarketQuery } from '@/lib/census/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

// Target markets to keep warm. Seeded with Florida statewide + all FL counties
// as a starting point — Gideon/Kazi should replace with the firm's actual
// active markets (state+county FIPS). county:"*" expands to every county.
const TARGET_MARKETS: MarketQuery[] = [
  { state: '12' }, // Florida (state-level)
  { state: '12', county: '*' }, // every Florida county
]

interface RefreshResult {
  upserted: number
  byTarget: Record<string, number>
  errors: string[]
}

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return true
  const header = request.headers.get('authorization') || ''
  return header === `Bearer ${expected}`
}

function targetLabel(q: MarketQuery): string {
  return q.county ? `state:${q.state}/county:${q.county}` : `state:${q.state}`
}

async function persist(markets: CensusMarket[]): Promise<{ upserted: number; error?: string }> {
  if (markets.length === 0) return { upserted: 0 }
  const svc = createServiceClient()
  const rows = markets.map((m) => ({
    geo_id: m.geo_id,
    dataset: m.dataset,
    year: m.year,
    name: m.name,
    population: m.population,
    median_household_income: m.median_household_income,
    median_home_value: m.median_home_value,
    median_gross_rent: m.median_gross_rent,
    raw: m.raw,
    refreshed_at: new Date().toISOString(),
  }))
  const { error } = await svc
    .from('census_market_snapshots')
    .upsert(rows, { onConflict: 'geo_id,dataset,year' })
  if (error) return { upserted: 0, error: error.message }
  return { upserted: rows.length }
}

async function runRefresh(): Promise<RefreshResult> {
  const result: RefreshResult = { upserted: 0, byTarget: {}, errors: [] }
  for (const target of TARGET_MARKETS) {
    const label = targetLabel(target)
    try {
      const markets = await getMarketDemographics(target)
      const { upserted, error } = await persist(markets)
      if (error) {
        result.errors.push(`${label}: ${error}`)
        result.byTarget[label] = 0
        continue
      }
      result.upserted += upserted
      result.byTarget[label] = upserted
      await new Promise((r) => setTimeout(r, 250))
    } catch (err) {
      result.errors.push(`${label}: ${(err as Error).message}`)
      result.byTarget[label] = 0
    }
  }
  return result
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await runRefresh()
  const status = result.errors.length > 0 ? 502 : 200
  return NextResponse.json(result, { status })
}

export async function GET(request: Request) {
  return POST(request)
}
