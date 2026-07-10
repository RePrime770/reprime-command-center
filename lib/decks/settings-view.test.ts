import { describe, expect, test } from 'vitest'
import {
  buildRunbookSteps,
  deriveEnvPresence,
  groupIntegrations,
  requirementLabel,
  ENV_REFERENCE_GROUPS,
  SUPABASE_DIR_PREFIX,
  type HealthIntegration,
  type SchemaRequirementReport,
} from './settings-view'

const it = (integration: string, ok: boolean, extra: Partial<HealthIntegration> = {}): HealthIntegration => ({
  ok,
  integration,
  ...extra,
})

describe('groupIntegrations', () => {
  test('buckets known integrations into their groups preserving API order', () => {
    // Arrange — deliberately interleaved, mirroring registry order fragments
    const input = [
      it('supabase', true),
      it('anthropic', true),
      it('timelines', false, { reason: 'setup_required', missingEnv: ['TIMELINES_API_KEY'] }),
      it('quo', true),
      it('openai', true),
    ]

    // Act
    const groups = groupIntegrations(input)

    // Assert — group order is Comms, Google, AI, Infra; empty Google dropped
    expect(groups.map((g) => g.id)).toEqual(['comms', 'ai', 'infra'])
    expect(groups[0].items.map((i) => i.integration)).toEqual(['timelines', 'quo'])
    expect(groups[1].items.map((i) => i.integration)).toEqual(['anthropic', 'openai'])
    expect(groups[2].items.map((i) => i.integration)).toEqual(['supabase'])
  })

  test('routes unknown integrations to a trailing Other group', () => {
    const groups = groupIntegrations([it('supabase', true), it('brand_new_adapter', true)])

    expect(groups.map((g) => g.id)).toEqual(['infra', 'other'])
    expect(groups[1].items[0].integration).toBe('brand_new_adapter')
  })

  test('returns empty array for malformed or empty payloads', () => {
    expect(groupIntegrations(null)).toEqual([])
    expect(groupIntegrations(undefined)).toEqual([])
    expect(groupIntegrations([] as HealthIntegration[])).toEqual([])
    // @ts-expect-error — defensive against a non-array payload
    expect(groupIntegrations('nope')).toEqual([])
  })
})

const req = (
  table: string,
  migrationFile: string,
  status: string,
  column?: string
): SchemaRequirementReport => ({
  kind: column ? 'column' : 'table',
  table,
  ...(column ? { column } : {}),
  status,
  migrationFile,
})

describe('buildRunbookSteps', () => {
  test('preserves pendingMigrations order and prefixes repo paths with supabase/', () => {
    // Arrange — API returns paths relative to supabase/ (verified on disk)
    const pending = [
      'migrations/2026-06-29-schema-drift-recovery.sql',
      'investor_reminders_migration.sql',
    ]

    // Act
    const steps = buildRunbookSteps([], pending)

    // Assert
    expect(steps.map((s) => s.file)).toEqual(pending)
    expect(steps.map((s) => s.repoPath)).toEqual([
      'supabase/migrations/2026-06-29-schema-drift-recovery.sql',
      'supabase/investor_reminders_migration.sql',
    ])
    expect(SUPABASE_DIR_PREFIX).toBe('supabase/')
  })

  test('attaches only still-missing requirements as unblocks for each file', () => {
    // Arrange
    const file = 'migrations/2026-06-29-schema-drift-recovery.sql'
    const requirements = [
      req('roster', file, 'migration_required'),
      req('notes', file, 'ready'), // already there — running the file does not unblock it
      req('whatsapp_threads', 'migrations/2026-06-23-whatsapp-threads-lane-override.sql', 'migration_required', 'lane_override'),
      req('tr_cache', file, 'error'), // probe error ≠ missing migration
    ]

    // Act
    const steps = buildRunbookSteps(requirements, [file])

    // Assert
    expect(steps).toHaveLength(1)
    expect(steps[0].unblocks.map((r) => r.table)).toEqual(['roster'])
  })

  test('returns empty steps when nothing is pending', () => {
    expect(buildRunbookSteps([req('roster', 'x.sql', 'ready')], [])).toEqual([])
    expect(buildRunbookSteps(null, null)).toEqual([])
  })
})

describe('requirementLabel', () => {
  test('renders table for table requirements and table.column for columns', () => {
    expect(requirementLabel(req('roster', 'x.sql', 'ready'))).toBe('roster')
    expect(requirementLabel(req('whatsapp_threads', 'x.sql', 'ready', 'lane_override'))).toBe(
      'whatsapp_threads.lane_override'
    )
  })
})

describe('deriveEnvPresence', () => {
  test('maps direct health.env booleans to present/missing', () => {
    const presence = deriveEnvPresence({
      env: { CRON_SECRET: true, INFORUPTCY_EMAIL: false },
    })

    expect(presence.CRON_SECRET).toBe('present')
    expect(presence.INFORUPTCY_EMAIL).toBe('missing')
  })

  test('an ok adapter marks its whole env set present', () => {
    const presence = deriveEnvPresence({ integrations: [it('zoom', true)] })

    expect(presence.ZOOM_ACCOUNT_ID).toBe('present')
    expect(presence.ZOOM_CLIENT_ID).toBe('present')
    expect(presence.ZOOM_CLIENT_SECRET).toBe('present')
  })

  test('a setup_required adapter marks missingEnv missing and the rest present', () => {
    const presence = deriveEnvPresence({
      integrations: [
        it('sendgrid', false, { reason: 'setup_required', missingEnv: ['SENDGRID_FROM_EMAIL'] }),
      ],
    })

    expect(presence.SENDGRID_FROM_EMAIL).toBe('missing')
    expect(presence.SENDGRID_API_KEY).toBe('present')
  })

  test('direct env flags are authoritative over adapter derivation', () => {
    const presence = deriveEnvPresence({
      env: { SENDGRID_API_KEY: false },
      integrations: [it('sendgrid', true)],
    })

    expect(presence.SENDGRID_API_KEY).toBe('missing')
    expect(presence.SENDGRID_FROM_EMAIL).toBe('present')
  })

  test('non-env failures say nothing about presence (name stays underived)', () => {
    const presence = deriveEnvPresence({
      integrations: [it('bluebubbles', false, { reason: 'unreachable', message: 'nope' })],
    })

    expect(presence.BLUEBUBBLES_SERVER_URL).toBeUndefined()
    expect(presence.BLUEBUBBLES_PASSWORD).toBeUndefined()
  })

  test('handles null/malformed payloads without throwing', () => {
    expect(deriveEnvPresence(null)).toEqual({})
    expect(deriveEnvPresence(undefined)).toEqual({})
    expect(deriveEnvPresence({ env: undefined, integrations: undefined })).toEqual({})
  })
})

describe('ENV_REFERENCE_GROUPS', () => {
  test('lists unique env NAMES only (no values, no duplicates)', () => {
    const all = ENV_REFERENCE_GROUPS.flatMap((g) => [...g.names])

    expect(all.length).toBeGreaterThan(0)
    expect(new Set(all).size).toBe(all.length)
    for (const name of all) {
      expect(name).toMatch(/^[A-Z][A-Z0-9_]+$/)
    }
  })
})
