import type { AdapterStatus } from '../adapters/status'
import type { CapabilityId, CircuitState, ProviderAdapter } from './types'

/**
 * Fabric observability — pure view-model for GET /api/system/fabric
 * (roadmap ZT-2, batch ZT-2.3). Same convention as lib/decks/system-view.ts:
 * data in, display facts out, zero I/O, unit-tested.
 *
 * The route (app/api/system/fabric/route.ts) does the I/O — allAdapters(),
 * getAllStatuses(), getCircuitState() per adapter — and hands the results
 * here to merge into one manifest covering every capability the mission
 * cares about, not just the one with a wired router today.
 */

/** Every capability this deck reports on, in display order. */
export const FABRIC_CAPABILITIES: readonly CapabilityId[] = [
  'SEND_TEXT_MESSAGE',
  'TRANSCRIBE_AUDIO',
  'SYNTHESIZE_SPEECH',
  'GENERATE_AI_RESPONSE',
  'SEND_EMAIL',
  'CREATE_CALENDAR_EVENT',
  'LOOKUP_CONTACT',
]

/**
 * For a capability with no adapters registered yet, the best real signal
 * available today is the env-presence check of the corresponding
 * lib/adapters/registry.ts integration(s). Some capabilities map to more
 * than one integration (e.g. SEND_EMAIL can go via SendGrid or Google).
 */
const FALLBACK_INTEGRATIONS: Partial<Record<CapabilityId, readonly string[]>> = {
  SEND_TEXT_MESSAGE: ['timelines'],
  SYNTHESIZE_SPEECH: ['elevenlabs'],
  GENERATE_AI_RESPONSE: ['anthropic'],
  SEND_EMAIL: ['sendgrid', 'google'],
  CREATE_CALENDAR_EVENT: ['google'],
  LOOKUP_CONTACT: ['pipedrive'],
}

/** One provider row under a capability in the manifest. */
export interface ProviderStatusView {
  providerId: string
  provider: string
  enabled: boolean
  priority: number
  /** null is the truthful signal for a capability not yet behind the router. */
  circuitState: CircuitState | null
}

/** One capability's row in the manifest. */
export interface CapabilityManifestEntry {
  capability: CapabilityId
  /** true only if the fabric registry has at least one adapter for this capability. */
  routed: boolean
  providers: ProviderStatusView[]
}

export interface FabricObservabilityData {
  capabilities: CapabilityManifestEntry[]
}

/** Stable Map key for a (capability, providerId) circuit-state lookup. */
export function circuitKey(capability: CapabilityId, providerId: string): string {
  return `${capability}:${providerId}`
}

/** An adapter whose enabled() throws must never take down this view. */
function safeEnabled(adapter: ProviderAdapter): boolean {
  try {
    return adapter.enabled() === true
  } catch {
    return false
  }
}

function routedProviders(
  adapters: readonly ProviderAdapter[],
  circuitStates: ReadonlyMap<string, CircuitState>
): ProviderStatusView[] {
  return [...adapters]
    .sort((a, b) => a.priority - b.priority)
    .map((adapter) => ({
      providerId: adapter.id,
      provider: adapter.provider,
      enabled: safeEnabled(adapter),
      priority: adapter.priority,
      circuitState: circuitStates.get(circuitKey(adapter.capability, adapter.id)) ?? 'CLOSED',
    }))
}

function fallbackProviders(
  capability: CapabilityId,
  adapterStatuses: readonly AdapterStatus[]
): ProviderStatusView[] {
  const integrationNames = FALLBACK_INTEGRATIONS[capability] ?? []
  return integrationNames.map((name) => {
    const status = adapterStatuses.find((s) => s.integration === name)
    return {
      providerId: name,
      provider: name,
      enabled: status?.ok === true,
      priority: 0,
      circuitState: null,
    }
  })
}

/**
 * Merge the fabric registry + env-presence adapter statuses + resolved
 * circuit states into the capability manifest the route returns.
 *
 * `circuitStates` must already be resolved (getCircuitState is async) —
 * keyed by circuitKey(capability, providerId). Missing entries for a routed
 * adapter default to 'CLOSED', matching getCircuitState's own default for
 * an absent record.
 */
export function buildCapabilityManifest(
  capabilities: readonly CapabilityId[],
  allAdapters: readonly ProviderAdapter[],
  adapterStatuses: readonly AdapterStatus[],
  circuitStates: ReadonlyMap<string, CircuitState>
): CapabilityManifestEntry[] {
  return capabilities.map((capability) => {
    const adaptersForCapability = allAdapters.filter((a) => a.capability === capability)
    if (adaptersForCapability.length > 0) {
      return {
        capability,
        routed: true,
        providers: routedProviders(adaptersForCapability, circuitStates),
      }
    }
    return {
      capability,
      routed: false,
      providers: fallbackProviders(capability, adapterStatuses),
    }
  })
}
