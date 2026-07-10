import { classifyError } from './errors'
import { getCircuitState, recordFailure, recordSuccess } from './circuit-breaker'
import { adaptersFor as defaultAdaptersFor, createFabricRegistry } from './registry'
import type { CapabilityId, RoutingResult } from './types'

/**
 * routeCapability — tries providers for a capability in priority order,
 * skipping any whose circuit is OPEN, recording success/failure per attempt.
 *
 * *** SAFETY BOUNDARY — READ BEFORE WIRING A NEW ADAPTER THROUGH THIS ROUTER ***
 *
 * Failing over to the next provider on failure is SAFE ONLY for read/
 * transform capabilities (TRANSCRIBE_AUDIO, GENERATE_AI_RESPONSE,
 * SYNTHESIZE_SPEECH, LOOKUP_CONTACT, RECEIVE_TEXT_MESSAGE, RECEIVE_EMAIL,
 * CREATE_CALENDAR_EVENT, JOIN_MEETING) where a provider failing means
 * nothing external happened — retrying with the next provider is harmless.
 *
 * A SEND_* capability (SEND_TEXT_MESSAGE, SEND_EMAIL, PLACE_PHONE_CALL) must
 * NEVER blindly retry on a second provider after an AMBIGUOUS failure
 * (timeout, 5xx with no clear "not sent" signal) without first reconciling
 * delivery status — a second provider could double-send a message the first
 * provider actually delivered. That reconciliation belongs to a durable
 * outbox (a separate, not-yet-built piece of the fabric) which must sit in
 * front of this router for send capabilities. This batch does NOT build
 * that outbox — do not wire a SEND_* adapter through routeCapability without
 * that safeguard in place.
 */
export async function routeCapability<TInput, TOutput>(
  capability: CapabilityId,
  input: TInput,
  opts?: { registry?: ReturnType<typeof createFabricRegistry> }
): Promise<RoutingResult<TOutput>> {
  const adaptersFor = opts?.registry ? opts.registry.adaptersFor : defaultAdaptersFor
  const adapters = adaptersFor(capability)

  if (adapters.length === 0) {
    return {
      ok: false,
      error: 'VALIDATION',
      message: 'capability_not_configured',
      attempted: [],
    }
  }

  const attempted: string[] = []

  for (const adapter of adapters) {
    const circuitState = await getCircuitState(capability, adapter.id)
    if (circuitState === 'OPEN') {
      attempted.push(`${adapter.id}:circuit_open`)
      continue
    }

    try {
      const data = (await adapter.execute(input)) as TOutput
      await recordSuccess(capability, adapter.id)
      return { ok: true, data, providerId: adapter.id }
    } catch (err: unknown) {
      const category = classifyError(err)
      // Log the real provider error server-side — the caller only ever sees
      // the generic 'all_providers_unavailable' message, so this is the only
      // place the actual failure reason (bad key, rate limit, timeout...) is
      // recorded anywhere. Never echoed to a client (same posture as safeError).
      console.error(`[fabric/router] ${capability} via ${adapter.id} failed (${category})`, err)
      await recordFailure(capability, adapter.id, category)
      attempted.push(adapter.id)
    }
  }

  return {
    ok: false,
    error: 'PROVIDER_OUTAGE',
    message: 'all_providers_unavailable',
    attempted,
  }
}
