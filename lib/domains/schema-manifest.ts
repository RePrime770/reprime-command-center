/**
 * Schema manifest — every table (and one column) the app requires, mapped to
 * the SQL file that creates it. Single source of truth for:
 *   - GET /api/system/schema (live probe vs manifest)
 *   - the Settings deck MigrationRunbook (run order + copy button)
 *
 * Pure data, unit-tested. Table lists mirror
 * docs/COMMAND_CENTER_ARCHITECTURE.md §3.1–3.3; update BOTH when adding SQL.
 */
export interface SchemaRequirement {
  kind: 'table' | 'column'
  table: string
  /** For kind 'column' — probed via select(column) catching 42703. */
  column?: string
  /** Path relative to supabase/, e.g. 'migrations/2026-06-29-schema-drift-recovery.sql'. */
  migrationFile: string
}

const req = (
  kind: SchemaRequirement['kind'],
  table: string,
  migrationFile: string,
  column?: string
): SchemaRequirement => ({ kind, table, migrationFile, ...(column ? { column } : {}) })

const CORE: SchemaRequirement[] = [
  req('table', 'bucket_items', 'migrations/2026-05-05-center.sql'),
  req('table', 'reminders', 'migrations/2026-05-05-center.sql'),
  req('table', 'crew_members', 'migrations/2026-05-05-center.sql'),
  req('table', 'email_scores', 'migrations/2026-05-05-secretary.sql'),
  req('table', 'outbound_asks', 'migrations/2026-05-05-secretary.sql'),
  req('table', 'inforuptcy_filings', 'migrations/2026-05-05-inforuptcy.sql'),
  req('table', 'blocked_contacts', 'migrations/2026-05-06-whatsapp-is-blocked.sql'),
  req('table', 'nora_chat_messages', 'migrations/2026-06-22-nora-chat.sql'),
]

const DRIFT_RECOVERY_TABLES = [
  'invitations',
  'whatsapp_threads',
  'whatsapp_messages',
  'roster',
  'roster_emails',
  'tags',
  'thread_tags',
  'approvals',
  'gmail_watch_state',
  'notes',
  'tr_cache',
  'zoom_events',
  'meeting_summaries',
] as const

const RECOVERY: SchemaRequirement[] = DRIFT_RECOVERY_TABLES.map((t) =>
  req('table', t, 'migrations/2026-06-29-schema-drift-recovery.sql')
)

const PENDING_FEATURES: SchemaRequirement[] = [
  // Column-level: lane_override on whatsapp_threads (table exists; the
  // pending migration only ADDs the column, so a table probe can't see it).
  req(
    'column',
    'whatsapp_threads',
    'migrations/2026-06-23-whatsapp-threads-lane-override.sql',
    'lane_override'
  ),
  // Standalone SQL not yet folded into migrations/ (architecture §3.2 item 3).
  req('table', 'investor_reminders', 'investor_reminders_migration.sql'),
  req('table', 'contact_directory', 'overnight_migration.sql'),
  req('table', 'phone_calls', 'phone_calls_migration.sql'),
]

export const SCHEMA_MANIFEST: readonly SchemaRequirement[] = [
  ...CORE,
  ...RECOVERY,
  ...PENDING_FEATURES,
]

/**
 * Gideon's run order for anything still pending (§3.2). The runbook shows
 * these in order, filtered to files the live probe says are actually missing.
 */
export const MIGRATION_RUN_ORDER: readonly string[] = [
  'migrations/2026-06-23-whatsapp-threads-lane-override.sql',
  'migrations/2026-06-29-schema-drift-recovery.sql',
  'investor_reminders_migration.sql',
  'overnight_migration.sql',
  'phone_calls_migration.sql',
]
