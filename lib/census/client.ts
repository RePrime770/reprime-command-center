// ─── Census connector — free U.S. Census Bureau Data API ───────────────────
// The Census Bureau publishes a free Data API. As of 2026 every data request
// requires a key (key-less requests 302-redirect to a "Missing Key" page), so
// CENSUS_API_KEY is mandatory — same posture as the Inforuptcy credentials.
//
// For CRE underwriting the useful surface is the American Community Survey
// 5-year estimates (acs5): population, median household income, median home
// value, and median gross rent for a market (state / county). Census data is
// annual, so this is modeled as an on-demand lookup (/api/census/market) plus
// an optional weekly snapshot refresh — NOT a daily poll over static data.
//
// Environment:
//   CENSUS_API_KEY — REQUIRED. Free signup at
//     https://api.census.gov/data/key_signup.html
//
// Runtime: plain fetch, edge- or node-safe.

const DATA_BASE = 'https://api.census.gov/data'
const DEFAULT_DATASET = 'acs/acs5'
const DEFAULT_YEAR = 2022 // latest stable acs5 vintage as of build
const FETCH_TIMEOUT_MS = 20_000

// Core CRE-relevant ACS variables with human labels. Extend as needed.
export const CENSUS_VARIABLES = {
  population: 'B01003_001E',
  median_household_income: 'B19013_001E',
  median_home_value: 'B25077_001E',
  median_gross_rent: 'B25064_001E',
} as const

type MetricKey = keyof typeof CENSUS_VARIABLES

export interface CensusMarket {
  geo_id: string // e.g. "12" (state) or "12086" (state+county)
  name: string | null // e.g. "Miami-Dade County, Florida"
  dataset: string
  year: number
  population: number | null
  median_household_income: number | null
  median_home_value: number | null
  median_gross_rent: number | null
  raw: Record<string, string>
}

export interface MarketQuery {
  state: string // 2-digit FIPS, e.g. "12" for Florida
  county?: string // 3-digit FIPS or "*" for all counties in the state
  year?: number
  dataset?: string
}

function requireKey(): string {
  const key = process.env.CENSUS_API_KEY
  if (!key) {
    throw new Error(
      'CENSUS_API_KEY missing — every Census Data API request needs a key. ' +
        'Free signup: https://api.census.gov/data/key_signup.html',
    )
  }
  return key
}

async function timedFetch(url: string): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
      cache: 'no-store',
      redirect: 'follow',
    })
  } finally {
    clearTimeout(t)
  }
}

function toNum(v: string | undefined): number | null {
  if (v == null) return null
  const n = Number(v)
  // Census uses large negative sentinels (e.g. -666666666) for "no data".
  if (!Number.isFinite(n) || n <= -666666666) return null
  return n
}

/**
 * Fetch ACS demographics for a market. Returns one row per matched geography
 * (a single state/county, or every county in a state when county="*").
 */
export async function getMarketDemographics(q: MarketQuery): Promise<CensusMarket[]> {
  const key = requireKey()
  const year = q.year ?? DEFAULT_YEAR
  const dataset = q.dataset ?? DEFAULT_DATASET

  const metricKeys = Object.keys(CENSUS_VARIABLES) as MetricKey[]
  const getVars = ['NAME', ...metricKeys.map((k) => CENSUS_VARIABLES[k])]

  const params = new URLSearchParams()
  params.set('get', getVars.join(','))
  if (q.county) {
    params.set('for', `county:${q.county}`)
    params.set('in', `state:${q.state}`)
  } else {
    params.set('for', `state:${q.state}`)
  }
  params.set('key', key)

  const url = `${DATA_BASE}/${year}/${dataset}?${params.toString()}`
  const res = await timedFetch(url)
  if (res.url.includes('missing_key')) {
    throw new Error('census_missing_key — CENSUS_API_KEY rejected or absent')
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`census_fetch_failed: ${res.status} ${body.slice(0, 160)}`)
  }

  // Response is an array of arrays: header row, then one row per geography.
  const table = (await res.json()) as string[][]
  if (!Array.isArray(table) || table.length < 2) return []
  const header = table[0]
  const idx = (col: string) => header.indexOf(col)
  const stateIdx = idx('state')
  const countyIdx = idx('county')

  return table.slice(1).map((row) => {
    const cell = (col: string) => row[idx(col)]
    const stateFips = stateIdx >= 0 ? row[stateIdx] : q.state
    const countyFips = countyIdx >= 0 ? row[countyIdx] : undefined
    const geoId = countyFips ? `${stateFips}${countyFips}` : stateFips
    const raw: Record<string, string> = {}
    header.forEach((h, i) => (raw[h] = row[i]))
    return {
      geo_id: geoId,
      name: cell('NAME') ?? null,
      dataset,
      year,
      population: toNum(cell(CENSUS_VARIABLES.population)),
      median_household_income: toNum(cell(CENSUS_VARIABLES.median_household_income)),
      median_home_value: toNum(cell(CENSUS_VARIABLES.median_home_value)),
      median_gross_rent: toNum(cell(CENSUS_VARIABLES.median_gross_rent)),
      raw,
    }
  })
}
