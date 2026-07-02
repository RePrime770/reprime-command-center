import { probeTables, type TableStatus } from '../supabase/table-status'

/**
 * ModuleStatus — the OS-layer readiness contract
 * (docs/COMMAND_CENTER_ARCHITECTURE.md §3.4).
 *
 * Composes the two proven degradation patterns into one shape every deck and
 * new API route speaks:
 *   - AdapterStatus env-probe (lib/adapters/status.ts) → 'setup_required'
 *   - 42P01 table-probe (lib/supabase/table-status.ts) → 'migration_required'
 *
 * SetupRequiredBanner renders this directly: missing env NAMES (never
 * values) with a setup link, or the exact migration filename with a copy
 * button. When Gideon sets the env/runs the SQL, probes expire (≤5 min) and
 * the feature flips live with zero deploys.
 */
export type ModuleStatus =
  | { ok: true }
  | {
      ok: false
      reason: 'setup_required' | 'migration_required'
      missingEnv?: string[]
      missingTables?: string[]
      migrationFile?: string
    }

export const MODULE_OK: ModuleStatus = { ok: true }

/** Env-name check (presence only — never reads values into responses). */
export function missingEnvNames(names: readonly string[]): string[] {
  return names.filter((n) => {
    const v = process.env[n]
    return typeof v !== 'string' || v.length === 0
  })
}

/**
 * Compose a module's readiness from required env names + required tables.
 * Order of precedence: setup_required (env) beats migration_required —
 * an operator can't run a migration check against a DB they haven't
 * configured, so surface env first.
 */
export async function moduleStatus(opts: {
  env?: readonly string[]
  tables?: readonly string[]
  migrationFile?: string
}): Promise<ModuleStatus> {
  const missingEnv = opts.env ? missingEnvNames(opts.env) : []
  if (missingEnv.length > 0) {
    return { ok: false, reason: 'setup_required', missingEnv }
  }

  if (opts.tables && opts.tables.length > 0) {
    const probes = await probeTables(opts.tables)
    const missingTables = opts.tables.filter(
      (t) => probes[t] === 'migration_required'
    )
    if (missingTables.length > 0) {
      return {
        ok: false,
        reason: 'migration_required',
        missingTables: [...missingTables],
        migrationFile: opts.migrationFile,
      }
    }
  }

  return MODULE_OK
}

/**
 * Route envelope for all NEW APIs (architecture §3.4): every new endpoint
 * returns { ok, data?, error?, status? } so useDeckData can parse uniformly.
 */
export interface RouteEnvelope<T> {
  ok: boolean
  data?: T
  error?: string
  status?: ModuleStatus
}

export function envelopeOk<T>(data: T): RouteEnvelope<T> {
  return { ok: true, data }
}

export function envelopeStatus(status: ModuleStatus): RouteEnvelope<never> {
  return status.ok ? { ok: true } : { ok: false, status }
}

export type { TableStatus }
