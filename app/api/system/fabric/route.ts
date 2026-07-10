import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { safeError } from '@/lib/api/safe-error'
import { getAllStatuses } from '@/lib/adapters/registry'
import '@/lib/fabric/adapters'
import { allAdapters } from '@/lib/fabric/registry'
import { getCircuitState } from '@/lib/fabric/circuit-breaker'
import {
  buildCapabilityManifest,
  circuitKey,
  FABRIC_CAPABILITIES,
  type FabricObservabilityData,
} from '@/lib/fabric/observability'
import type { CircuitState } from '@/lib/fabric/types'
import type { RouteEnvelope } from '@/lib/domains/status'

export const dynamic = 'force-dynamic'

const ALLOWED_EMAIL = 'g@reprime.com'

/**
 * GET /api/system/fabric — capability manifest for the Integration Fabric
 * spine (roadmap ZT-2, batch ZT-2.3).
 *
 * Reports on every capability the mission cares about, not just the one
 * with a wired router today (TRANSCRIBE_AUDIO): `routed: true` means the
 * fabric registry has at least one adapter for it; everything else falls
 * back to the corresponding lib/adapters/registry.ts env-presence status
 * with circuitState: null — the truthful signal that it isn't behind the
 * router's failure-tracking yet.
 *
 * Session-gated exactly like /api/system/schema and /api/system/crons;
 * NOT in proxy.ts PUBLIC_PATHS — keep it that way.
 *
 * Always ok:true — pending/unrouted capabilities are DATA this deck
 * renders, not an envelope failure (same rationale as the schema/crons
 * routes: useDeckData must not null out data when there's genuinely
 * something to show).
 */
export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const adapters = allAdapters()

    const [adapterStatuses, circuitEntries] = await Promise.all([
      getAllStatuses(),
      Promise.all(
        adapters.map(async (adapter): Promise<readonly [string, CircuitState]> => [
          circuitKey(adapter.capability, adapter.id),
          await getCircuitState(adapter.capability, adapter.id),
        ])
      ),
    ])
    const circuitStates = new Map<string, CircuitState>(circuitEntries)

    const capabilities = buildCapabilityManifest(
      FABRIC_CAPABILITIES,
      adapters,
      adapterStatuses,
      circuitStates
    )

    const envelope: RouteEnvelope<FabricObservabilityData> = {
      ok: true,
      data: { capabilities },
    }
    return NextResponse.json(envelope)
  } catch (err) {
    return safeError('system/fabric', err, { code: 'fabric_failed' })
  }
}
