import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CRON_MANIFEST } from './manifest'

/**
 * Drift alarm: CRON_MANIFEST must stay 1:1 with the `crons` block in
 * vercel.json. Reads the real file at test time so adding/removing/retiming
 * a cron in either place fails CI until both are updated together.
 */

interface VercelCron {
  path: string
  schedule: string
}

const VERCEL_JSON_PATH = fileURLToPath(new URL('../../vercel.json', import.meta.url))

function readVercelCrons(): VercelCron[] {
  const parsed = JSON.parse(readFileSync(VERCEL_JSON_PATH, 'utf8')) as {
    crons?: VercelCron[]
  }
  return parsed.crons ?? []
}

describe('CRON_MANIFEST ↔ vercel.json drift alarm', () => {
  const vercelCrons = readVercelCrons()

  it('vercel.json has a non-empty crons block', () => {
    expect(vercelCrons.length).toBeGreaterThan(0)
  })

  it('every vercel.json cron path appears in CRON_MANIFEST', () => {
    const manifestPaths = new Set(CRON_MANIFEST.map((c) => c.path))
    for (const cron of vercelCrons) {
      expect(
        manifestPaths.has(cron.path),
        `vercel.json cron missing from CRON_MANIFEST: ${cron.path}`
      ).toBe(true)
    }
  })

  it('every CRON_MANIFEST path appears in vercel.json', () => {
    const vercelPaths = new Set(vercelCrons.map((c) => c.path))
    for (const entry of CRON_MANIFEST) {
      expect(
        vercelPaths.has(entry.path),
        `CRON_MANIFEST entry not registered in vercel.json: ${entry.path}`
      ).toBe(true)
    }
  })

  it('counts match exactly (no duplicate paths hiding a gap)', () => {
    expect(CRON_MANIFEST.length).toBe(vercelCrons.length)
    const manifestPaths = CRON_MANIFEST.map((c) => c.path)
    expect(new Set(manifestPaths).size).toBe(manifestPaths.length)
  })

  it('each manifest schedule string equals the vercel.json schedule', () => {
    const scheduleByPath = new Map(vercelCrons.map((c) => [c.path, c.schedule]))
    for (const entry of CRON_MANIFEST) {
      expect(entry.schedule, `schedule drift for ${entry.path}`).toBe(
        scheduleByPath.get(entry.path)
      )
    }
  })

  it('names are unique kebab-case slugs', () => {
    const names = CRON_MANIFEST.map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
    for (const name of names) {
      expect(name, `not a kebab slug: ${name}`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('expected cadences are positive integer minutes with descriptions', () => {
    for (const entry of CRON_MANIFEST) {
      expect(Number.isInteger(entry.expectedEveryMinutes)).toBe(true)
      expect(entry.expectedEveryMinutes).toBeGreaterThan(0)
      expect(entry.description.length).toBeGreaterThan(0)
    }
  })
})
