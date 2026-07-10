import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = new Map<string, unknown>()

vi.mock('../redis/client', () => ({
  redisGetJson: vi.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
  redisSetJson: vi.fn(async (key: string, value: unknown) => {
    store.set(key, value)
    return true
  }),
}))

import { routeCapability } from './router'
import { createFabricRegistry } from './registry'
import type { ProviderAdapter } from './types'

const CAPABILITY = 'GENERATE_AI_RESPONSE' as const

function makeAdapter(
  overrides: Partial<ProviderAdapter> & { id: string; execute: ProviderAdapter['execute'] }
): ProviderAdapter {
  return {
    provider: overrides.id,
    capability: CAPABILITY,
    priority: 0,
    enabled: () => true,
    ...overrides,
  }
}

describe('routeCapability', () => {
  beforeEach(() => {
    store.clear()
    vi.clearAllMocks()
  })

  it('calls only the primary adapter on success', async () => {
    // Arrange
    const primaryExecute = vi.fn(async () => 'primary-result')
    const fallbackExecute = vi.fn(async () => 'fallback-result')
    const registry = createFabricRegistry([
      makeAdapter({ id: 'primary', priority: 0, execute: primaryExecute }),
      makeAdapter({ id: 'fallback', priority: 1, execute: fallbackExecute }),
    ])

    // Act
    const result = await routeCapability(CAPABILITY, { q: 'hi' }, { registry })

    // Assert
    expect(result).toEqual({ ok: true, data: 'primary-result', providerId: 'primary' })
    expect(primaryExecute).toHaveBeenCalledTimes(1)
    expect(fallbackExecute).not.toHaveBeenCalled()
  })

  it('falls back to the next provider when the primary throws', async () => {
    // Arrange
    const primaryExecute = vi.fn(async () => {
      throw new Error('network timeout')
    })
    const fallbackExecute = vi.fn(async () => 'fallback-result')
    const registry = createFabricRegistry([
      makeAdapter({ id: 'primary', priority: 0, execute: primaryExecute }),
      makeAdapter({ id: 'fallback', priority: 1, execute: fallbackExecute }),
    ])

    // Act
    const result = await routeCapability(CAPABILITY, {}, { registry })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toBe('fallback-result')
      expect(result.providerId).toBe('fallback')
    }
    expect(primaryExecute).toHaveBeenCalledTimes(1)
    expect(fallbackExecute).toHaveBeenCalledTimes(1)
  })

  it('returns PROVIDER_OUTAGE with all attempted ids when every adapter throws', async () => {
    // Arrange
    const registry = createFabricRegistry([
      makeAdapter({
        id: 'a',
        priority: 0,
        execute: vi.fn(async () => {
          throw new Error('boom a')
        }),
      }),
      makeAdapter({
        id: 'b',
        priority: 1,
        execute: vi.fn(async () => {
          throw new Error('boom b')
        }),
      }),
    ])

    // Act
    const result = await routeCapability(CAPABILITY, {}, { registry })

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('PROVIDER_OUTAGE')
      expect(result.message).toBe('all_providers_unavailable')
      expect(result.attempted).toEqual(['a', 'b'])
    }
  })

  it('skips a provider whose circuit is OPEN without calling execute', async () => {
    // Arrange — pre-seed an OPEN circuit for provider "blocked".
    const key = `fabric:circuit:${CAPABILITY}:blocked`
    store.set(key, {
      state: 'OPEN',
      consecutiveFailures: 3,
      openedAt: new Date().toISOString(),
    })
    const blockedExecute = vi.fn(async () => 'should-not-run')
    const okExecute = vi.fn(async () => 'ok-result')
    const registry = createFabricRegistry([
      makeAdapter({ id: 'blocked', priority: 0, execute: blockedExecute }),
      makeAdapter({ id: 'ok', priority: 1, execute: okExecute }),
    ])

    // Act
    const result = await routeCapability(CAPABILITY, {}, { registry })

    // Assert
    expect(blockedExecute).not.toHaveBeenCalled()
    expect(okExecute).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true, data: 'ok-result', providerId: 'ok' })
  })

  it('returns VALIDATION capability_not_configured when no adapters are registered/enabled', async () => {
    // Arrange
    const registry = createFabricRegistry([])

    // Act
    const result = await routeCapability(CAPABILITY, {}, { registry })

    // Assert
    expect(result).toEqual({
      ok: false,
      error: 'VALIDATION',
      message: 'capability_not_configured',
      attempted: [],
    })
  })
})
