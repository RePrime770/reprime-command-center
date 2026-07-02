import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { clearTableStatusCache } from '../supabase/table-status'

// moduleStatus probes tables through lib/supabase/table-status, which builds a
// service client from env — mock the client factory so tests stay unit-level.
const fromMock = vi.fn()
vi.mock('../supabase/server', () => ({
  createServiceClient: () => ({ from: fromMock }),
}))

import { moduleStatus, missingEnvNames, envelopeOk, envelopeStatus, MODULE_OK } from './status'

function tableAnswers(errorByTable: Record<string, { code?: string; message?: string } | null>) {
  fromMock.mockImplementation((name: string) => ({
    select: () => ({ limit: async () => ({ error: errorByTable[name] ?? null }) }),
  }))
}

describe('missingEnvNames', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('reports only the names that are unset or empty', () => {
    // Arrange
    vi.stubEnv('MS_TEST_PRESENT', 'x')
    vi.stubEnv('MS_TEST_EMPTY', '')

    // Act
    const missing = missingEnvNames(['MS_TEST_PRESENT', 'MS_TEST_EMPTY', 'MS_TEST_ABSENT'])

    // Assert
    expect(missing).toEqual(['MS_TEST_EMPTY', 'MS_TEST_ABSENT'])
  })
})

describe('moduleStatus', () => {
  beforeEach(() => {
    clearTableStatusCache()
    fromMock.mockReset()
  })
  afterEach(() => vi.unstubAllEnvs())

  it('ok when no requirements given', async () => {
    expect(await moduleStatus({})).toEqual(MODULE_OK)
  })

  it('setup_required lists missing env names and skips table probes', async () => {
    // Act
    const status = await moduleStatus({
      env: ['MS_TEST_NOPE'],
      tables: ['agent_runs'],
      migrationFile: '2026-07-XX-bos-spine.sql',
    })

    // Assert — env failure wins; no DB call made.
    expect(status).toEqual({ ok: false, reason: 'setup_required', missingEnv: ['MS_TEST_NOPE'] })
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('migration_required names the missing tables and the migration file', async () => {
    // Arrange
    tableAnswers({
      agent_runs: { code: '42P01', message: 'does not exist' },
      bucket_items: null,
    })

    // Act
    const status = await moduleStatus({
      tables: ['bucket_items', 'agent_runs'],
      migrationFile: '2026-07-XX-bos-spine.sql',
    })

    // Assert
    expect(status).toEqual({
      ok: false,
      reason: 'migration_required',
      missingTables: ['agent_runs'],
      migrationFile: '2026-07-XX-bos-spine.sql',
    })
  })

  it('ok when env present and all tables ready', async () => {
    // Arrange
    vi.stubEnv('MS_TEST_KEY', 'set')
    tableAnswers({ notes: null })

    // Act
    const status = await moduleStatus({ env: ['MS_TEST_KEY'], tables: ['notes'] })

    // Assert
    expect(status).toEqual({ ok: true })
  })
})

describe('route envelope helpers', () => {
  it('envelopeOk wraps data', () => {
    expect(envelopeOk({ n: 1 })).toEqual({ ok: true, data: { n: 1 } })
  })

  it('envelopeStatus surfaces a failing ModuleStatus', () => {
    const failing = { ok: false as const, reason: 'setup_required' as const, missingEnv: ['X'] }
    expect(envelopeStatus(failing)).toEqual({ ok: false, status: failing })
  })

  it('envelopeStatus of an ok status is a bare ok', () => {
    expect(envelopeStatus(MODULE_OK)).toEqual({ ok: true })
  })
})
