import { describe, it, expect } from 'vitest'
import {
  buildDealsPayload,
  EMPTY_DEALS_PAYLOAD,
  type DealsPayload,
} from './deals-payload'
import type { PipedriveDeal, PipedriveStage } from './client'

function deal(overrides: Partial<PipedriveDeal> & { id: number }): PipedriveDeal {
  return {
    title: `Deal ${overrides.id}`,
    value: 0,
    currency: 'USD',
    status: 'open',
    stage_id: 1,
    ...overrides,
  } as PipedriveDeal
}

function stage(overrides: Partial<PipedriveStage> & { id: number }): PipedriveStage {
  return {
    name: `Stage ${overrides.id}`,
    pipeline_id: 1,
    ...overrides,
  } as PipedriveStage
}

describe('buildDealsPayload', () => {
  it('sorts deals by value descending without mutating the input', () => {
    // Arrange
    const deals = [
      deal({ id: 1, value: 100 }),
      deal({ id: 2, value: 5000 }),
      deal({ id: 3, value: 800 }),
    ]
    const inputOrder = deals.map((d) => d.id)

    // Act
    const payload = buildDealsPayload(deals, [])

    // Assert
    expect(payload.deals.map((d) => d.id)).toEqual([2, 3, 1])
    expect(deals.map((d) => d.id)).toEqual(inputOrder)
  })

  it('resolves stageName from stages and returns null for unknown stage_id', () => {
    // Arrange
    const deals = [
      deal({ id: 1, stage_id: 10 }),
      deal({ id: 2, stage_id: 99 }),
    ]
    const stages = [stage({ id: 10, name: 'Qualified' })]

    // Act
    const payload = buildDealsPayload(deals, stages)

    // Assert
    const byId = new Map(payload.deals.map((d) => [d.id, d]))
    expect(byId.get(1)?.stageName).toBe('Qualified')
    expect(byId.get(2)?.stageName).toBeNull()
  })

  it('extracts org/person names from object refs and null for numeric or missing refs', () => {
    // Arrange
    const deals = [
      deal({
        id: 1,
        org_id: { value: 7, name: 'Acme Corp' },
        person_id: { value: 3, name: 'Jane Doe' },
      }),
      deal({ id: 2, org_id: 7, person_id: null }),
      deal({ id: 3 }),
    ]

    // Act
    const payload = buildDealsPayload(deals, [])

    // Assert
    const byId = new Map(payload.deals.map((d) => [d.id, d]))
    expect(byId.get(1)?.org).toBe('Acme Corp')
    expect(byId.get(1)?.person).toBe('Jane Doe')
    expect(byId.get(2)?.org).toBeNull()
    expect(byId.get(2)?.person).toBeNull()
    expect(byId.get(3)?.org).toBeNull()
    expect(byId.get(3)?.person).toBeNull()
  })

  it('sums totals.byCurrency per currency with USD fallback', () => {
    // Arrange
    const deals = [
      deal({ id: 1, value: 100, currency: 'USD' }),
      deal({ id: 2, value: 250, currency: 'USD' }),
      deal({ id: 3, value: 40, currency: 'EUR' }),
      deal({ id: 4, value: 60, currency: '' }),
    ]

    // Act
    const payload = buildDealsPayload(deals, [])

    // Assert
    expect(payload.totals.count).toBe(4)
    expect(payload.totals.byCurrency).toEqual({ USD: 410, EUR: 40 })
  })

  it('returns an empty ok payload for empty input', () => {
    // Arrange
    const deals: PipedriveDeal[] = []
    const stages: PipedriveStage[] = []

    // Act
    const payload = buildDealsPayload(deals, stages)

    // Assert
    expect(payload.status).toBe('ok')
    expect(payload.deals).toEqual([])
    expect(payload.stages).toEqual([])
    expect(payload.totals).toEqual({ count: 0, byCurrency: {} })
    expect(typeof payload.fetchedAt).toBe('string')
  })

  it('sorts stages by order_nr and filters inactive stages', () => {
    // Arrange
    const stages = [
      stage({ id: 3, name: 'Closing', order_nr: 3 }),
      stage({ id: 1, name: 'Lead', order_nr: 1 }),
      stage({ id: 4, name: 'Retired', order_nr: 2, active_flag: false }),
      stage({ id: 2, name: 'Qualified', order_nr: 2, active_flag: true }),
    ]

    // Act
    const payload = buildDealsPayload([], stages)

    // Assert
    expect(payload.stages).toEqual([
      { id: 1, name: 'Lead', order: 1 },
      { id: 2, name: 'Qualified', order: 2 },
      { id: 3, name: 'Closing', order: 3 },
    ])
  })

  it('builds the user-facing Pipedrive deal URL for each deal', () => {
    // Arrange
    const deals = [deal({ id: 42, value: 10 })]

    // Act
    const payload = buildDealsPayload(deals, [])

    // Assert
    expect(payload.deals[0].url).toBe('https://reprimegroup.pipedrive.com/deal/42')
  })

  it('EMPTY_DEALS_PAYLOAD is a valid empty ok payload with null fetchedAt', () => {
    // Arrange / Act
    const empty: DealsPayload = EMPTY_DEALS_PAYLOAD

    // Assert
    expect(empty).toEqual({
      status: 'ok',
      deals: [],
      stages: [],
      totals: { count: 0, byCurrency: {} },
      fetchedAt: null,
    })
  })
})
