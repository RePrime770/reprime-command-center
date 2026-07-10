import { redisGetJson, redisSetJson } from '../redis/client'
import type { CapabilityId, CircuitState, ErrorCategory } from './types'

/**
 * Per-(capability, provider) circuit breaker, Redis-backed via
 * lib/redis/client (never hand-roll Upstash here).
 *
 * Contract: missing infra must never block routing. Every exported function
 * degrades gracefully when Redis is unconfigured or a read/write fails —
 * same posture as lib/cron/heartbeat.ts's stampCronRun. recordSuccess and
 * recordFailure never throw.
 */

export interface CircuitRecord {
  state: CircuitState
  consecutiveFailures: number
  openedAt?: string
}

const FAILURE_THRESHOLD = 3
const OPEN_COOLDOWN_MS = 60_000
const CIRCUIT_TTL_SECONDS = 24 * 3600

const TAG = 'fabric/circuit-breaker'

function circuitKey(capability: CapabilityId, providerId: string): string {
  return `fabric:circuit:${capability}:${providerId}`
}

/** Raw stored record, or null when absent/unconfigured/unreadable. Does not apply time-based HALF_OPEN computation. */
async function getRawRecord(
  capability: CapabilityId,
  providerId: string
): Promise<CircuitRecord | null> {
  return redisGetJson<CircuitRecord>(circuitKey(capability, providerId))
}

/**
 * Computed circuit state. Missing record OR Redis unconfigured → 'CLOSED'.
 * An 'OPEN' record older than OPEN_COOLDOWN_MS reads as 'HALF_OPEN' (a probe
 * is allowed through) — this is a read-time computation only; it does NOT
 * write the transition. The caller observes the probe's outcome and writes
 * via recordSuccess/recordFailure.
 */
export async function getCircuitState(
  capability: CapabilityId,
  providerId: string
): Promise<CircuitState> {
  const record = await getRawRecord(capability, providerId)
  if (!record) return 'CLOSED'
  if (record.state === 'OPEN' && isCooldownElapsed(record.openedAt)) {
    return 'HALF_OPEN'
  }
  return record.state
}

function isCooldownElapsed(openedAt?: string): boolean {
  if (!openedAt) return true
  const openedAtMs = Date.parse(openedAt)
  if (Number.isNaN(openedAtMs)) return true
  return Date.now() - openedAtMs > OPEN_COOLDOWN_MS
}

/** Record a successful call — resets the circuit to CLOSED/0. Never throws. */
export async function recordSuccess(
  capability: CapabilityId,
  providerId: string
): Promise<void> {
  try {
    const value: CircuitRecord = { state: 'CLOSED', consecutiveFailures: 0 }
    await redisSetJson(circuitKey(capability, providerId), value, CIRCUIT_TTL_SECONDS)
  } catch (err: unknown) {
    console.error(`[${TAG}] recordSuccess failed`, capability, providerId, err)
  }
}

/**
 * Record a failed call. Never throws.
 *
 * - VALIDATION never counts toward the circuit (a bad request isn't
 *   evidence the provider is unhealthy) — returns early without writing.
 * - AUTHENTICATION / AUTHORIZATION open the circuit immediately, regardless
 *   of consecutiveFailures — retrying with the same bad credential wastes
 *   latency/quota for a certain failure.
 * - Everything else increments consecutiveFailures; reaching
 *   FAILURE_THRESHOLD opens the circuit, otherwise it stays CLOSED (still
 *   allows immediate retries below threshold). A HALF_OPEN probe that fails
 *   re-opens the circuit — since consecutiveFailures was already at/above
 *   FAILURE_THRESHOLD to have opened it in the first place, incrementing
 *   again keeps it at/above threshold and it re-opens.
 */
export async function recordFailure(
  capability: CapabilityId,
  providerId: string,
  category: ErrorCategory
): Promise<void> {
  if (category === 'VALIDATION') return

  try {
    if (category === 'AUTHENTICATION' || category === 'AUTHORIZATION') {
      const current = await getRawRecord(capability, providerId)
      const value: CircuitRecord = {
        state: 'OPEN',
        consecutiveFailures: (current?.consecutiveFailures ?? 0) + 1,
        openedAt: new Date().toISOString(),
      }
      await redisSetJson(circuitKey(capability, providerId), value, CIRCUIT_TTL_SECONDS)
      return
    }

    const current = await getRawRecord(capability, providerId)
    const consecutiveFailures = (current?.consecutiveFailures ?? 0) + 1
    const value: CircuitRecord =
      consecutiveFailures >= FAILURE_THRESHOLD
        ? { state: 'OPEN', consecutiveFailures, openedAt: new Date().toISOString() }
        : { state: 'CLOSED', consecutiveFailures }
    await redisSetJson(circuitKey(capability, providerId), value, CIRCUIT_TTL_SECONDS)
  } catch (err: unknown) {
    console.error(`[${TAG}] recordFailure failed`, capability, providerId, err)
  }
}

/**
 * Reset a circuit back to CLOSED/0 (test/ops utility). Implemented as a
 * direct write of CLOSED/0 (equivalent to recordSuccess today, kept as a
 * distinct named export for call-site clarity).
 */
export async function resetCircuit(
  capability: CapabilityId,
  providerId: string
): Promise<void> {
  try {
    const value: CircuitRecord = { state: 'CLOSED', consecutiveFailures: 0 }
    await redisSetJson(circuitKey(capability, providerId), value, CIRCUIT_TTL_SECONDS)
  } catch (err: unknown) {
    console.error(`[${TAG}] resetCircuit failed`, capability, providerId, err)
  }
}
