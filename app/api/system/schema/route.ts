import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { safeError } from '@/lib/api/safe-error'
import { probeTable, probeColumn, type TableStatus } from '@/lib/supabase/table-status'
import { SCHEMA_MANIFEST, MIGRATION_RUN_ORDER } from '@/lib/domains/schema-manifest'

export const dynamic = 'force-dynamic'

const ALLOWED_EMAIL = 'g@reprime.com'

interface RequirementReport {
  kind: 'table' | 'column'
  table: string
  column?: string
  status: TableStatus
  migrationFile: string
}

/**
 * GET /api/system/schema — live database schema vs the manifest.
 *
 * Drives every SetupRequiredBanner and the Settings deck MigrationRunbook
 * (architecture §3.4): which requirements are ready, which SQL files are
 * still pending (in Gideon's run order), and whether anything probed as a
 * hard error (connectivity — distinct from "not migrated").
 *
 * Probes are module-cached 5 min, so this is cheap to poll and flips green
 * within minutes of a migration being run — zero deploys.
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
    const reports: RequirementReport[] = await Promise.all(
      SCHEMA_MANIFEST.map(async (r) => ({
        kind: r.kind,
        table: r.table,
        ...(r.column ? { column: r.column } : {}),
        status:
          r.kind === 'column' && r.column
            ? await probeColumn(r.table, r.column)
            : await probeTable(r.table),
        migrationFile: r.migrationFile,
      }))
    )

    const pendingFiles = new Set(
      reports.filter((r) => r.status === 'migration_required').map((r) => r.migrationFile)
    )
    const pendingMigrations = MIGRATION_RUN_ORDER.filter((f) => pendingFiles.has(f))
    // Any pending file outside the known run order still surfaces (manifest
    // drift shouldn't hide a missing table).
    for (const f of pendingFiles) {
      if (!pendingMigrations.includes(f)) pendingMigrations.push(f)
    }

    return NextResponse.json({
      ok: pendingMigrations.length === 0 && !reports.some((r) => r.status === 'error'),
      data: {
        requirements: reports,
        pendingMigrations,
        probeErrors: reports.filter((r) => r.status === 'error').map((r) => r.table),
      },
    })
  } catch (err) {
    return safeError('system/schema', err, { code: 'probe_failed' })
  }
}
