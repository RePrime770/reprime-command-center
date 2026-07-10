import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = new Map<string, unknown>()

vi.mock('../redis/client', () => ({
  redisGetJson: vi.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
  redisSetJson: vi.fn(async (key: string, value: unknown) => {
    store.set(key, value)
    return true
  }),
}))

import {
  getCircuitState,
  recordFailure,
  recordSuccess,
  resetCircuit,
} from './circuit-breaker'

const CAPABILITY = 'SEND_TEXT_MESSAGE' as const
const PROVIDER = 'test-provider'

describe('circuit-breaker', () => {
  beforeEach(() => {
    store.clear()
    vi.clearAllMocks()
  })

  it('returns CLOSED when no record exists (unconfigured or never seen)', async () => {
    // Act
    const state = await getCircuitState(CAPABILITY, PROVIDER)

    // Assert
    expect(state).toBe('CLOSED')
  })

  it('stays CLOSED after failures below the threshold', async () => {
    // Act
    await recordFailure(CAPABILITY, PROVIDER, 'NETWORK')
    await recordFailure(CAPABILITY, PROVIDER, 'NETWORK')

    // Assert
    expect(await getCircuitState(CAPABILITY, PROVIDER)).toBe('CLOSED')
  })

  it('opens after 3 consecutive non-auth failures', async () => {
    // Act
    await recordFailure(CAPABILITY, PROVIDER, 'NETWORK')
    await recordFailure(CAPABILITY, PROVIDER, 'NETWORK')
    await recordFailure(CAPABILITY, PROVIDER, 'NETWORK')

    // Assert
    expect(await getCircuitState(CAPABILITY, PROVIDER)).toBe('OPEN')
  })

  it('opens immediately on a single AUTHENTICATION failure', async () => {
    // Act
    await recordFailure(CAPABILITY, PROVIDER, 'AUTHENTICATION')

    // Assert
    expect(await getCircuitState(CAPABILITY, PROVIDER)).toBe('OPEN')
  })

  it('opens immediately on a single AUTHORIZATION failure', async () => {
    // Act
    await recordFailure(CAPABILITY, PROVIDER, 'AUTHORIZATION')

    // Assert
    expect(await getCircuitState(CAPABILITY, PROVIDER)).toBe('OPEN')
  })

  it('never counts VALIDATION failures toward the circuit', async () => {
    // Act
    await recordFailure(CAPABILITY, PROVIDER, 'VALIDATION')
    await recordFailure(CAPABILITY, PROVIDER, 'VALIDATION')
    await recordFailure(CAPABILITY, PROVIDER, 'VALIDATION')
    await recordFailure(CAPABILITY, PROVIDER, 'VALIDATION')

    // Assert — no record written at all, circuit stays CLOSED.
    expect(await getCircuitState(CAPABILITY, PROVIDER)).toBe('CLOSED')
    const key = `fabric:circuit:${CAPABILITY}:${PROVIDER}`
    expect(store.has(key)).toBe(false)
  })

  it('returns HALF_OPEN once the cooldown has elapsed on an OPEN circuit', async () => {
    // Arrange — stash an OPEN record opened well before the cooldown window.
    const key = `fabric:circuit:${CAPABILITY}:${PROVIDER}`
    const openedAt = new Date(Date.now() - 61_000).toISOString()
    store.set(key, { state: 'OPEN', consecutiveFailures: 3, openedAt })

    // Act
    const state = await getCircuitState(CAPABILITY, PROVIDER)

    // Assert
    expect(state).toBe('HALF_OPEN')
  })

  it('stays OPEN when the cooldown has not elapsed', async () => {
    // Arrange
    const key = `fabric:circuit:${CAPABILITY}:${PROVIDER}`
    const openedAt = new Date(Date.now() - 1_000).toISOString()
    store.set(key, { state: 'OPEN', consecutiveFailures: 3, openedAt })

    // Act
    const state = await getCircuitState(CAPABILITY, PROVIDER)

    // Assert
    expect(state).toBe('OPEN')
  })

  it('recordSuccess resets the circuit to CLOSED/0', async () => {
    // Arrange
    await recordFailure(CAPABILITY, PROVIDER, 'NETWORK')
    await recordFailure(CAPABILITY, PROVIDER, 'NETWORK')
    await recordFailure(CAPABILITY, PROVIDER, 'NETWORK')
    expect(await getCircuitState(CAPABILITY, PROVIDER)).toBe('OPEN')

    // Act
    await recordSuccess(CAPABILITY, PROVIDER)

    // Assert
    expect(await getCircuitState(CAPABILITY, PROVIDER)).toBe('CLOSED')
    const key = `fabric:circuit:${CAPABILITY}:${PROVIDER}`
    expect(store.get(key)).toEqual({ state: 'CLOSED', consecutiveFailures: 0 })
  })

  it('resetCircuit clears an OPEN circuit back to CLOSED/0', async () => {
    // Arrange
    await recordFailure(CAPABILITY, PROVIDER, 'AUTHENTICATION')
    expect(await getCircuitState(CAPABILITY, PROVIDER)).toBe('OPEN')

    // Act
    await resetCircuit(CAPABILITY, PROVIDER)

    // Assert
    expect(await getCircuitState(CAPABILITY, PROVIDER)).toBe('CLOSED')
  })
})
