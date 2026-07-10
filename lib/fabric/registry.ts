import type { CapabilityId, ProviderAdapter } from './types'

/**
 * FabricRegistry — capability -> ordered provider adapters (roadmap ZT-2,
 * batch ZT-2.1). Mirrors lib/cockpit/commands.ts's createCommandRegistry:
 * register replaces by id, Fast-Refresh safe.
 *
 * lib/fabric/adapters/** (the actual ProviderAdapter implementations) is
 * owned by a later batch — this registry only holds and orders whatever is
 * registered.
 */

export interface FabricRegistry {
  register: (adapter: ProviderAdapter) => void
  adaptersFor: (capability: CapabilityId) => ProviderAdapter[]
  allAdapters: () => ProviderAdapter[]
}

/**
 * Create an isolated registry (used by tests and any future scoped router).
 * Registration replaces by id (idempotent under Fast Refresh re-evaluation);
 * adapters themselves are never mutated.
 */
export function createFabricRegistry(seed: readonly ProviderAdapter[] = []): FabricRegistry {
  const adapters = new Map<string, ProviderAdapter>()

  const register = (adapter: ProviderAdapter): void => {
    if (!adapter || typeof adapter.id !== 'string' || adapter.id.length === 0) {
      throw new Error('adapter_id_required')
    }
    adapters.set(adapter.id, adapter)
  }

  for (const adapter of seed) register(adapter)

  const adaptersFor = (capability: CapabilityId): ProviderAdapter[] => {
    return [...adapters.values()]
      .filter((adapter) => adapter.capability === capability && isEnabled(adapter))
      .sort((a, b) => a.priority - b.priority)
  }

  const allAdapters = (): ProviderAdapter[] => [...adapters.values()]

  return { register, adaptersFor, allAdapters }
}

/** An adapter whose enabled() throws must never take down routing. */
function isEnabled(adapter: ProviderAdapter): boolean {
  try {
    return adapter.enabled() === true
  } catch {
    return false
  }
}

/** Default app-wide registry. */
const defaultRegistry = createFabricRegistry()

export const registerAdapter: FabricRegistry['register'] = defaultRegistry.register
export const adaptersFor: FabricRegistry['adaptersFor'] = defaultRegistry.adaptersFor
export const allAdapters: FabricRegistry['allAdapters'] = defaultRegistry.allAdapters
