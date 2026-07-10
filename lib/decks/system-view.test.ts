import { describe, expect, test } from 'vitest'
import {
  cadenceLabel,
  cronHealth,
  cronTally,
  formatDurationMs,
  healthCheckFlags,
  integrationTally,
  relativeTimeLabel,
  schemaTally,
  OVERDUE_FLOOR_MINUTES,
  OVERDUE_MULTIPLIER,
  type CronRunView,
  type SystemHealthSnapshot,
} from './system-view'

const MS_PER_MINUTE = 60_000
const NOW = Date.parse('2026-07-10T12:00:00.000Z')

const run = (
  minutesAgo: number,
  ok = true,
  ms = 500
): { at: string; ok: boolean; ms: number } => ({
  at: new Date(NOW - minutesAgo * MS_PER_MINUTE).toISOString(),
  ok,
  ms,
})

const cron = (
  expectedEveryMinutes: number,
  lastRun: CronRunView['lastRun']
): Pick<CronRunView, 'expectedEveryMinutes' | 'lastRun'> => ({
  expectedEveryMinutes,
  lastRun,
})

describe('cronHealth', () => {
  test('returns never when no run was recorded', () => {
    expect(cronHealth(cron(1, null), NOW)).toBe('never')
  })

  test('returns error when the last run failed, regardless of age', () => {
    expect(cronHealth(cron(1, run(0, false)), NOW)).toBe('error')
    expect(cronHealth(cron(1, run(600, false)), NOW)).toBe('error')
  })

  test('returns ok for a fresh successful run', () => {
    expect(cronHealth(cron(5, run(3)), NOW)).toBe('ok')
  })

  test('minute crons use the 5-minute floor so they never flap', () => {
    // 2 * 1 min would flag at >2 min — the floor keeps 4-min-old runs green.
    expect(cronHealth(cron(1, run(4)), NOW)).toBe('ok')
    expect(cronHealth(cron(1, run(6)), NOW)).toBe('overdue')
  })

  test('slower crons go overdue past 2x their cadence', () => {
    expect(cronHealth(cron(30, run(59)), NOW)).toBe('ok')
    expect(cronHealth(cron(30, run(61)), NOW)).toBe('overdue')
    // daily: 2 * 1440 min
    expect(cronHealth(cron(1440, run(2 * 1440 - 1)), NOW)).toBe('ok')
    expect(cronHealth(cron(1440, run(2 * 1440 + 1)), NOW)).toBe('overdue')
  })

  test('an unparseable timestamp reads as never, not a fake green', () => {
    expect(cronHealth(cron(5, { at: 'not-a-date', ok: true, ms: 10 }), NOW)).toBe('never')
  })

  test('threshold constants are what the badge legend documents', () => {
    expect(OVERDUE_MULTIPLIER).toBe(2)
    expect(OVERDUE_FLOOR_MINUTES).toBe(5)
  })
})

describe('cadenceLabel', () => {
  test('maps the manifest cadences to short human labels', () => {
    expect(cadenceLabel(1)).toBe('every minute')
    expect(cadenceLabel(5)).toBe('every 5 min')
    expect(cadenceLabel(30)).toBe('every 30 min')
    expect(cadenceLabel(60)).toBe('hourly')
    expect(cadenceLabel(1440)).toBe('daily')
  })

  test('falls back sensibly for unlisted cadences', () => {
    expect(cadenceLabel(120)).toBe('every 2 hr')
    expect(cadenceLabel(45)).toBe('every 45 min')
  })
})

describe('relativeTimeLabel', () => {
  test('buckets seconds, minutes, hours and days', () => {
    expect(relativeTimeLabel(new Date(NOW - 20_000).toISOString(), NOW)).toBe('just now')
    expect(relativeTimeLabel(run(5).at, NOW)).toBe('5 min ago')
    expect(relativeTimeLabel(run(90).at, NOW)).toBe('1 hr ago')
    expect(relativeTimeLabel(run(3 * 60).at, NOW)).toBe('3 hr ago')
    expect(relativeTimeLabel(run(26 * 60).at, NOW)).toBe('1 day ago')
    expect(relativeTimeLabel(run(3 * 1440).at, NOW)).toBe('3 days ago')
  })

  test('never renders a negative age (clock skew clamps to just now)', () => {
    expect(relativeTimeLabel(new Date(NOW + 60_000).toISOString(), NOW)).toBe('just now')
  })

  test('unparseable input degrades to a stable placeholder', () => {
    expect(relativeTimeLabel('garbage', NOW)).toBe('unknown')
  })
})

describe('formatDurationMs', () => {
  test('renders ms under a second, seconds under a minute, then minutes', () => {
    expect(formatDurationMs(812)).toBe('812 ms')
    expect(formatDurationMs(1_234)).toBe('1.2 s')
    expect(formatDurationMs(59_400)).toBe('59.4 s')
    expect(formatDurationMs(120_000)).toBe('2 min')
  })

  test('degrades to a placeholder on junk', () => {
    expect(formatDurationMs(Number.NaN)).toBe('—')
    expect(formatDurationMs(-5)).toBe('—')
  })
})

describe('tallies', () => {
  test('cronTally counts only ok-health crons as ready', () => {
    const crons = [
      cron(1, run(1)), // ok
      cron(1, run(30)), // overdue
      cron(5, run(1, false)), // error
      cron(5, null), // never
    ]
    expect(cronTally(crons, NOW)).toEqual({ ready: 1, total: 4 })
  })

  test('schemaTally counts ready requirements and tolerates junk', () => {
    const reqs = [
      { status: 'ready' },
      { status: 'migration_required' },
      { status: 'error' },
      { status: 'ready' },
    ]
    expect(schemaTally(reqs)).toEqual({ ready: 2, total: 4 })
    expect(schemaTally(null)).toEqual({ ready: 0, total: 0 })
  })

  test('integrationTally counts ok booleans only', () => {
    const items = [
      { integration: 'timelines', ok: true },
      { integration: 'quo', ok: false },
      { integration: 'zoom', ok: true },
    ]
    expect(integrationTally(items)).toEqual({ ready: 2, total: 3 })
    expect(integrationTally(undefined)).toEqual({ ready: 0, total: 0 })
  })
})

describe('healthCheckFlags', () => {
  test('flattens db + env booleans into name/ok rows — names only, no values', () => {
    const health: SystemHealthSnapshot = {
      sha: 'abc1234',
      overall: 'degraded',
      db: { reachable: true, latencyMs: 42 },
      env: { CRON_SECRET: true, SENDGRID_API_KEY: false },
      integrations: [{ integration: 'timelines', ok: true }],
    }

    expect(healthCheckFlags(health)).toEqual([
      { name: 'database', ok: true },
      { name: 'CRON_SECRET', ok: true },
      { name: 'SENDGRID_API_KEY', ok: false },
    ])
  })

  test('handles a missing or partial payload without throwing', () => {
    expect(healthCheckFlags(null)).toEqual([])
    expect(healthCheckFlags({})).toEqual([])
    expect(healthCheckFlags({ env: { A: true } })).toEqual([{ name: 'A', ok: true }])
  })
})
