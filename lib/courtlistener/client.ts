// ─── CourtListener connector — free Free Law Project REST API ──────────────
// CourtListener (Free Law Project) exposes a documented REST API. We use the
// v4 search endpoint over RECAP (PACER mirror) dockets to watch for new
// bankruptcy / litigation dockets naming the tenants we track — the earliest
// public signal that a tenant is in distress, often days before it surfaces
// elsewhere.
//
//   https://www.courtlistener.com/api/rest/v4/search/?q="<name>"&type=r
//
// type=r → RECAP dockets. Results carry caseName, docketNumber, court,
// chapter (bankruptcy chapter), dateFiled, and an absolute_url back to the
// docket on CourtListener.
//
// Environment:
//   COURTLISTENER_API_TOKEN — optional. Anonymous requests are rate-limited;
//     a free token (Authorization: Token <token>) raises the ceiling. The
//     connector works without it for the small daily watchlist volume.
//
// Runtime: plain fetch, edge- or node-safe.

const SEARCH_URL = 'https://www.courtlistener.com/api/rest/v4/search/'
const SITE_BASE = 'https://www.courtlistener.com'
const FETCH_TIMEOUT_MS = 20_000

export interface CourtDocket {
  docket_id: number // PK
  case_name: string | null
  docket_number: string | null
  court: string | null
  court_id: string | null
  chapter: string | null // bankruptcy chapter ("7" / "11" / null)
  nature_of_suit: string | null
  date_filed: string | null // ISO date YYYY-MM-DD
  absolute_url: string | null // fully-qualified
  raw: Record<string, unknown>
}

interface SearchHit {
  docket_id?: number
  caseName?: string
  docketNumber?: string
  court?: string
  court_id?: string
  chapter?: string | number
  suitNature?: string
  dateFiled?: string
  docket_absolute_url?: string
}

function authHeaders(): Record<string, string> {
  const token = process.env.COURTLISTENER_API_TOKEN
  const headers: Record<string, string> = {
    'User-Agent': process.env.SEC_EDGAR_USER_AGENT || 'RePrime Group g@reprime.com',
    Accept: 'application/json',
  }
  if (token) headers.Authorization = `Token ${token}`
  return headers
}

async function timedFetch(url: string): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { headers: authHeaders(), signal: ctrl.signal, cache: 'no-store' })
  } finally {
    clearTimeout(t)
  }
}

function normalizeHit(h: SearchHit): CourtDocket | null {
  if (typeof h.docket_id !== 'number') return null
  const dateFiled = h.dateFiled ? h.dateFiled.slice(0, 10) : null
  return {
    docket_id: h.docket_id,
    case_name: h.caseName ?? null,
    docket_number: h.docketNumber ?? null,
    court: h.court ?? null,
    court_id: h.court_id ?? null,
    chapter: h.chapter != null ? String(h.chapter) : null,
    nature_of_suit: h.suitNature ?? null,
    date_filed: dateFiled,
    absolute_url: h.docket_absolute_url ? `${SITE_BASE}${h.docket_absolute_url}` : null,
    raw: {
      assignedTo: (h as Record<string, unknown>).assignedTo ?? null,
      cause: (h as Record<string, unknown>).cause ?? null,
      dateTerminated: (h as Record<string, unknown>).dateTerminated ?? null,
    },
  }
}

/**
 * Search RECAP dockets for a single query string, newest-first. `sinceDays`
 * filters client-side on dateFiled so we only diff genuinely recent dockets.
 */
export async function searchDockets(
  query: string,
  opts: { sinceDays?: number; pageSize?: number } = {},
): Promise<CourtDocket[]> {
  const sinceDays = opts.sinceDays ?? 30
  const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const params = new URLSearchParams({
    q: `"${query}"`,
    type: 'r',
    order_by: 'dateFiled desc',
  })
  const res = await timedFetch(`${SEARCH_URL}?${params.toString()}`)
  if (!res.ok) throw new Error(`courtlistener_search_failed (${query}): ${res.status}`)
  const json = (await res.json()) as { results?: SearchHit[] }

  const out: CourtDocket[] = []
  const seen = new Set<number>()
  for (const hit of json.results ?? []) {
    const docket = normalizeHit(hit)
    if (!docket || seen.has(docket.docket_id)) continue
    if (docket.date_filed && docket.date_filed < cutoff) continue
    seen.add(docket.docket_id)
    out.push(docket)
  }
  return out
}

/**
 * Search a watchlist of tenant names. Sequential with a small delay to respect
 * CourtListener's anonymous rate limit. Returns the flat docket list plus
 * per-tenant counts for cron telemetry.
 */
export async function searchTenants(
  tenants: string[],
  opts: { sinceDays?: number } = {},
): Promise<{ all: CourtDocket[]; byTenant: Record<string, number>; errors: string[] }> {
  const all: CourtDocket[] = []
  const byTenant: Record<string, number> = {}
  const errors: string[] = []
  const seen = new Set<number>()

  for (const tenant of tenants) {
    try {
      const dockets = await searchDockets(tenant, opts)
      const deduped = dockets.filter((d) => !seen.has(d.docket_id))
      deduped.forEach((d) => seen.add(d.docket_id))
      byTenant[tenant] = deduped.length
      all.push(...deduped)
      await new Promise((r) => setTimeout(r, 500))
    } catch (err) {
      errors.push(`${tenant}: ${(err as Error).message}`)
      byTenant[tenant] = 0
    }
  }

  return { all, byTenant, errors }
}
