import { SETUP_LINKS } from '../cockpit/integration-setup-links'

/**
 * Settings deck view-model — pure derivations from the two live endpoints the
 * Settings & Integrations deck reads:
 *   - GET /api/health         (PLAIN JSON: env-name booleans + AdapterStatus[])
 *   - GET /api/system/schema  (RouteEnvelope: requirements[] + pendingMigrations[])
 *
 * Settings v1 is READ + GUIDE only (roadmap Phase 3): nothing in this module
 * ever touches an env VALUE — names and booleans exclusively (public repo,
 * architecture §3.4). Pure data + functions, unit-tested (lib/-only Vitest
 * convention).
 */

/** Shape of one entry of /api/health `integrations` (lib/adapters/status.ts). */
export interface HealthIntegration {
  ok: boolean
  integration: string
  reason?: string
  missingEnv?: string[]
  message?: string
}

/** The subset of the /api/health payload the deck consumes. */
export interface HealthSnapshot {
  env?: Record<string, boolean>
  integrations?: HealthIntegration[]
  overall?: 'ok' | 'degraded' | 'down'
}

export interface IntegrationGroup {
  id: string
  label: string
  items: HealthIntegration[]
}

/**
 * Grouping of /api/health integration keys into deck sections. Keys match the
 * `integration` strings emitted by lib/adapters/registry.ts; anything the API
 * returns that isn't listed here lands in the trailing "Other" group so new
 * adapters are never silently hidden.
 */
const INTEGRATION_GROUP_DEFS: readonly {
  id: string
  label: string
  members: readonly string[]
}[] = [
  {
    id: 'comms',
    label: 'Comms',
    members: ['timelines', 'quo', 'bluebubbles', 'zoom', 'sendgrid', 'slack', 'pagerduty'],
  },
  { id: 'google', label: 'Google', members: ['google', 'google_secondary'] },
  { id: 'ai', label: 'AI', members: ['anthropic', 'openai', 'groq', 'elevenlabs'] },
  { id: 'infra', label: 'Infra & CRM', members: ['supabase', 'upstash', 'pipedrive', 'apollo'] },
]

const OTHER_GROUP_ID = 'other'
const OTHER_GROUP_LABEL = 'Other'

/**
 * Bucket the /api/health integrations into display groups. Preserves the
 * API's order within each group; drops empty groups; unknown integrations go
 * to "Other". Defensive against a malformed payload (non-array → []).
 */
export function groupIntegrations(
  integrations: readonly HealthIntegration[] | null | undefined
): IntegrationGroup[] {
  const list = Array.isArray(integrations)
    ? integrations.filter((it) => it && typeof it.integration === 'string')
    : []

  const known = new Set(INTEGRATION_GROUP_DEFS.flatMap((g) => [...g.members]))

  const groups = INTEGRATION_GROUP_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    items: list.filter((it) => def.members.includes(it.integration)),
  }))

  const leftovers = list.filter((it) => !known.has(it.integration))
  const withOther =
    leftovers.length > 0
      ? [...groups, { id: OTHER_GROUP_ID, label: OTHER_GROUP_LABEL, items: leftovers }]
      : groups

  return withOther.filter((g) => g.items.length > 0)
}

/** Shape of one entry of /api/system/schema `requirements[]`. */
export interface SchemaRequirementReport {
  kind: 'table' | 'column'
  table: string
  column?: string
  status: string // 'ready' | 'migration_required' | 'error'
  migrationFile: string
}

export interface RunbookStep {
  /** The file exactly as the API returns it (path relative to supabase/). */
  file: string
  /** Full repo path — every manifest file lives under supabase/ on disk. */
  repoPath: string
  /** Requirements this file unblocks (still probing migration_required). */
  unblocks: SchemaRequirementReport[]
}

/**
 * Repo directory that prefixes every migrationFile the schema API returns.
 * Verified on disk: `supabase/migrations/*.sql` plus the three standalone
 * files (`supabase/investor_reminders_migration.sql`, etc.). The API already
 * includes the `migrations/` segment where it applies — never re-add it.
 */
export const SUPABASE_DIR_PREFIX = 'supabase/'

const MIGRATION_REQUIRED = 'migration_required'

/**
 * Turn the schema envelope into ordered runbook steps. `pendingMigrations`
 * arrives already in Gideon's run order — order is preserved verbatim.
 */
export function buildRunbookSteps(
  requirements: readonly SchemaRequirementReport[] | null | undefined,
  pendingMigrations: readonly string[] | null | undefined
): RunbookStep[] {
  const reqs = Array.isArray(requirements) ? requirements : []
  const files = Array.isArray(pendingMigrations)
    ? pendingMigrations.filter((f) => typeof f === 'string' && f.length > 0)
    : []

  return files.map((file) => ({
    file,
    repoPath: `${SUPABASE_DIR_PREFIX}${file}`,
    unblocks: reqs.filter(
      (r) => r && r.migrationFile === file && r.status === MIGRATION_REQUIRED
    ),
  }))
}

/** Human label for a requirement: `table` or `table.column`. */
export function requirementLabel(r: Pick<SchemaRequirementReport, 'kind' | 'table' | 'column'>): string {
  return r.kind === 'column' && r.column ? `${r.table}.${r.column}` : r.table
}

export type EnvPresence = 'present' | 'missing' | 'unknown'

/**
 * Derive env-NAME presence from /api/health booleans ONLY — never from
 * process.env, never from values.
 *
 * Sources, in precedence order:
 *   1. health.env — direct boolean flags (authoritative, never overwritten).
 *   2. health.integrations × SETUP_LINKS env sets — an ok adapter means its
 *      env requirement is satisfied (legacy aliases count, e.g. GOOGLE_CLIENT_ID
 *      satisfying GOOGLE_OAUTH_CLIENT_ID); a setup_required adapter marks its
 *      missingEnv names missing and the rest of its set present.
 * Names not derivable from either source are simply absent from the result
 * (the UI renders them as "unknown" — honesty over fabrication).
 */
export function deriveEnvPresence(
  health: HealthSnapshot | null | undefined
): Record<string, EnvPresence> {
  const out: Record<string, EnvPresence> = {}

  const envFlags = health?.env && typeof health.env === 'object' ? health.env : {}
  for (const [name, present] of Object.entries(envFlags)) {
    if (typeof present === 'boolean') out[name] = present ? 'present' : 'missing'
  }

  const integrations = Array.isArray(health?.integrations) ? health.integrations : []
  for (const it of integrations) {
    if (!it || typeof it.integration !== 'string') continue
    const link = SETUP_LINKS[it.integration]
    if (!link || link.kind !== 'env') continue
    for (const name of link.envVars) {
      if (name in out) continue // direct health.env flags win
      if (it.ok === true) {
        out[name] = 'present'
      } else if (it.reason === 'setup_required') {
        const missing = Array.isArray(it.missingEnv) ? it.missingEnv : []
        out[name] = missing.includes(name) ? 'missing' : 'present'
      }
      // Any other failure reason says nothing about env presence → leave unset.
    }
  }

  return out
}

/**
 * Env-NAME reference groups, mirroring the .env.example section layout but
 * restricted to names whose presence is actually derivable from /api/health
 * (its `env` flags + the adapter env sets). NAMES ONLY — no values, ever.
 */
export const ENV_REFERENCE_GROUPS: readonly {
  id: string
  label: string
  names: readonly string[]
}[] = [
  {
    id: 'supabase',
    label: 'Supabase (auth + DB)',
    names: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  },
  {
    id: 'ai',
    label: 'AI providers',
    names: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY'],
  },
  {
    id: 'google',
    label: 'Google — Gmail + Calendar',
    names: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'],
  },
  {
    id: 'redis',
    label: 'Upstash Redis',
    names: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  },
  {
    id: 'comms',
    label: 'Comms — WhatsApp / SMS / iMessage',
    names: ['TIMELINES_API_KEY', 'QUO_API_KEY', 'BLUEBUBBLES_SERVER_URL', 'BLUEBUBBLES_PASSWORD'],
  },
  {
    id: 'zoom',
    label: 'Zoom',
    names: ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'],
  },
  {
    id: 'voice',
    label: 'Voice — ElevenLabs',
    names: ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID'],
  },
  {
    id: 'crm',
    label: 'CRM — Pipedrive + Apollo',
    names: ['PIPEDRIVE_API_TOKEN', 'APOLLO_API_KEY'],
  },
  {
    id: 'email',
    label: 'Transactional email — SendGrid',
    names: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
  },
  {
    id: 'ops',
    label: 'Operations / observability',
    names: ['CRON_SECRET', 'SLACK_WEBHOOK_URL', 'PAGERDUTY_ROUTING_KEY'],
  },
  {
    id: 'inforuptcy',
    label: 'Inforuptcy — bankruptcy watchlist',
    names: ['INFORUPTCY_EMAIL', 'INFORUPTCY_PASSWORD'],
  },
]
