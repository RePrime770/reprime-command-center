import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { safeError } from '@/lib/api/safe-error'
import { CRON_MANIFEST, type CronManifestEntry } from '@/lib/cron/manifest'
import { readHeartbeats, type Heartbeat } from '@/lib/cron/heartbeat'
import { moduleStatus, type RouteEnvelope } from '@/lib/domains/status'

export const dynamic = 'force-dynamic'

const ALLOWED_EMAIL = 'g@reprime.com'
// Env NAMES only (public repo — values never leave the server).
const REDIS_ENV = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] as const

interface CronRunStatus extends CronManifestEntry {
  lastRun: Heartbeat | null
}

interface CronsData {
  crons: CronRunStatus[]
  redisConfigured: boolean
}

/**
 * GET /api/system/crons — the cron manifest joined with last-run heartbeats
 * (architecture §8 Phase 3). Session-gated exactly like /api/system/schema;
 * NOT in proxy.ts PUBLIC_PATHS — keep it that way.
 *
 * Graceful degradation (§3.4): without Upstash the schedule table is still
 * real data, so we return ok:true with data (lastRun all null,
 * redisConfigured false) PLUS a setup_required ModuleStatus naming the
 * missing env vars so SetupRequiredBanner can render. Same rationale as the
 * schema route: a consumer that nulls data on ok:false would blank the deck
 * exactly when setup guidance is needed.
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
    const status = await moduleStatus({ env: REDIS_ENV })
    const redisConfigured = status.ok

    const names = CRON_MANIFEST.map((c) => c.name)
    const lastRuns: Record<string, Heartbeat | null> = redisConfigured
      ? await readHeartbeats(names)
      : Object.fromEntries(names.map((n) => [n, null]))

    const crons: CronRunStatus[] = CRON_MANIFEST.map((c) => ({
      ...c,
      lastRun: lastRuns[c.name] ?? null,
    }))

    const envelope: RouteEnvelope<CronsData> = {
      ok: true,
      data: { crons, redisConfigured },
      ...(status.ok ? {} : { status }),
    }
    return NextResponse.json(envelope)
  } catch (err) {
    return safeError('system/crons', err, { code: 'crons_failed' })
  }
}
