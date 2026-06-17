// ─── /api/census/market ────────────────────────────────────────────────────
// On-demand market-demographics lookup for underwriting. Authenticated to
// Gideon (same posture as /api/briefing/today and the pipedrive routes).
// Caches each result into census_market_snapshots so repeat lookups are warm
// and the Pipeline/Inbox surfaces can read without re-hitting the Census API.
//
//   GET /api/census/market?state=12              → Florida (state-level)
//   GET /api/census/market?state=12&county=086   → Miami-Dade County
//   GET /api/census/market?state=12&county=*      → every FL county
//   optional &year=2022 &dataset=acs/acs5

import { NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { getMarketDemographics, type CensusMarket } from '@/lib/census/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALLOWED_EMAIL = 'g@reprime.com'

async function cacheSnapshots(markets: CensusMarket[]): Promise<void> {
  if (markets.length === 0) return
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
  if (error) console.error('[census] snapshot cache write failed', error.message)
}

export async function GET(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const state = url.searchParams.get('state')
  if (!state) {
    return NextResponse.json({ error: 'state (FIPS) is required' }, { status: 400 })
  }
  const county = url.searchParams.get('county') || undefined
  const yearParam = url.searchParams.get('year')
  const year = yearParam ? Number(yearParam) : undefined
  const dataset = url.searchParams.get('dataset') || undefined

  try {
    const markets = await getMarketDemographics({ state, county, year, dataset })
    await cacheSnapshots(markets)
    return NextResponse.json({ count: markets.length, markets })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
}
