// Pure adapter: raw Pipedrive deals + stages → the compact payload served by
// GET /api/pipedrive/deals. Lives in lib/ so it is Vitest-covered (the test
// include glob is lib/**/*.test.ts) and reusable by the Phase-4 DealsPanel:
// deals[].stageId + the ordered stages[] list are exactly what a group-by-stage
// board needs.

import { pipedriveDealUrl, type PipedriveDeal, type PipedriveStage } from './client'

export type DealSummary = {
  id: number
  title: string
  value: number
  currency: string
  stageId: number
  stageName: string | null
  org: string | null
  person: string | null
  updateTime: string | null
  url: string
}

export type DealsPayload = {
  status: 'ok' | 'setup_required'
  deals: DealSummary[]
  stages: Array<{ id: number; name: string; order: number | null }>
  totals: { count: number; byCurrency: Record<string, number> }
  fetchedAt: string | null
}

export const EMPTY_DEALS_PAYLOAD: DealsPayload = {
  status: 'ok',
  deals: [],
  stages: [],
  totals: { count: 0, byCurrency: {} },
  fetchedAt: null,
}

const DEFAULT_CURRENCY = 'USD'

/**
 * Pipedrive person_id/org_id fields come back as either a bare numeric id or
 * an expanded `{ value, name }` ref. Only the expanded form carries a name.
 */
function refName(
  ref: number | { value: number; name: string } | null | undefined
): string | null {
  return ref && typeof ref === 'object' && typeof ref.name === 'string' ? ref.name : null
}

export function buildDealsPayload(
  deals: PipedriveDeal[],
  stages: PipedriveStage[]
): DealsPayload {
  const stageNames = new Map(stages.map((s) => [s.id, s.name]))
  // Immutable sort — never mutate the caller's array.
  const sorted = [...deals].sort((a, b) => (b.value || 0) - (a.value || 0))

  const byCurrency: Record<string, number> = {}
  for (const d of sorted) {
    const cur = d.currency || DEFAULT_CURRENCY
    byCurrency[cur] = (byCurrency[cur] || 0) + (d.value || 0)
  }

  return {
    status: 'ok',
    deals: sorted.map((d) => ({
      id: d.id,
      title: d.title,
      value: d.value || 0,
      currency: d.currency || DEFAULT_CURRENCY,
      stageId: d.stage_id,
      stageName: stageNames.get(d.stage_id) ?? null,
      org: refName(d.org_id),
      person: refName(d.person_id),
      updateTime: d.update_time ?? null,
      url: pipedriveDealUrl(d.id),
    })),
    stages: [...stages]
      .filter((s) => s.active_flag !== false)
      .sort((a, b) => (a.order_nr ?? 0) - (b.order_nr ?? 0))
      .map((s) => ({ id: s.id, name: s.name, order: s.order_nr ?? null })),
    totals: { count: sorted.length, byCurrency },
    fetchedAt: new Date().toISOString(),
  }
}
