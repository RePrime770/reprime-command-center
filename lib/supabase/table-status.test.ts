import { describe, it, expect, beforeEach } from 'vitest'
import {
  probeTable,
  probeTables,
  probeColumn,
  clearTableStatusCache,
  TABLE_PROBE_TTL_MS,
} from './table-status'

/** Minimal mock of the Supabase query chain used by probeTable. */
function mockClient(errorByTable: Record<string, { code?: string; message?: string } | null>) {
  const calls: string[] = []
  return {
    calls,
    from(name: string) {
      calls.push(name)
      return {
        select() {
          return {
            limit: async () => ({ error: errorByTable[name] ?? null }),
          }
        },
      }
    },
  }
}

describe('probeTable', () => {
  beforeEach(() => {
    clearTableStatusCache()
  })

  it('returns ready when the select succeeds', async () => {
    // Arrange
    const client = mockClient({ bucket_items: null })

    // Act
    const status = await probeTable('bucket_items', { client: client as never })

    // Assert
    expect(status).toBe('ready')
  })

  it('returns migration_required on Postgres 42P01', async () => {
    // Arrange
    const client = mockClient({ agent_runs: { code: '42P01', message: 'relation "agent_runs" does not exist' } })

    // Act
    const status = await probeTable('agent_runs', { client: client as never })

    // Assert
    expect(status).toBe('migration_required')
  })

  it('returns migration_required on PostgREST does-not-exist message without code', async () => {
    // Arrange
    const client = mockClient({ automation_runs: { message: 'relation "public.automation_runs" does not exist' } })

    // Act
    const status = await probeTable('automation_runs', { client: client as never })

    // Assert
    expect(status).toBe('migration_required')
  })

  it('returns error for any other failure and does NOT cache it', async () => {
    // Arrange — first call fails with a connection-ish error, second succeeds.
    let call = 0
    const client = {
      from() {
        call++
        return {
          select() {
            return {
              limit: async () =>
                call === 1
                  ? { error: { message: 'connection refused' } }
                  : { error: null },
            }
          },
        }
      },
    }

    // Act
    const first = await probeTable('roster', { client: client as never })
    const second = await probeTable('roster', { client: client as never })

    // Assert — transient error is not sticky.
    expect(first).toBe('error')
    expect(second).toBe('ready')
  })

  it('caches ready results for the TTL and re-probes after expiry', async () => {
    // Arrange
    const client = mockClient({ notes: null })
    const t0 = 1_000_000

    // Act
    await probeTable('notes', { client: client as never, now: t0 })
    await probeTable('notes', { client: client as never, now: t0 + 1000 })
    const probesWhileCached = client.calls.length
    await probeTable('notes', { client: client as never, now: t0 + TABLE_PROBE_TTL_MS + 1 })

    // Assert
    expect(probesWhileCached).toBe(1)
    expect(client.calls.length).toBe(2)
  })

  it('caches migration_required so a missing table does not hammer the DB', async () => {
    // Arrange
    const client = mockClient({ agent_runs: { code: '42P01', message: 'does not exist' } })
    const t0 = 5_000_000

    // Act
    await probeTable('agent_runs', { client: client as never, now: t0 })
    await probeTable('agent_runs', { client: client as never, now: t0 + 60_000 })

    // Assert
    expect(client.calls.length).toBe(1)
  })
})

describe('probeTables', () => {
  beforeEach(() => {
    clearTableStatusCache()
  })

  it('returns a name→status map across mixed results', async () => {
    // Arrange
    const client = mockClient({
      bucket_items: null,
      agent_runs: { code: '42P01', message: 'does not exist' },
    })

    // Act
    const map = await probeTables(['bucket_items', 'agent_runs'], { client: client as never })

    // Assert
    expect(map).toEqual({ bucket_items: 'ready', agent_runs: 'migration_required' })
  })
})

describe('probeColumn', () => {
  beforeEach(() => {
    clearTableStatusCache()
  })

  it('returns migration_required on 42703 undefined column', async () => {
    // Arrange
    const client = {
      from: () => ({
        select: () => ({
          limit: async () => ({ error: { code: '42703', message: 'column "lane_override" does not exist' } }),
        }),
      }),
    }

    // Act
    const status = await probeColumn('whatsapp_threads', 'lane_override', { client: client as never })

    // Assert
    expect(status).toBe('migration_required')
  })

  it('returns ready when the column selects cleanly and caches per table.column', async () => {
    // Arrange
    let calls = 0
    const client = {
      from: () => {
        calls++
        return { select: () => ({ limit: async () => ({ error: null }) }) }
      },
    }
    const t0 = 9_000_000

    // Act
    const first = await probeColumn('whatsapp_threads', 'lane_override', { client: client as never, now: t0 })
    await probeColumn('whatsapp_threads', 'lane_override', { client: client as never, now: t0 + 1000 })

    // Assert
    expect(first).toBe('ready')
    expect(calls).toBe(1)
  })
})
