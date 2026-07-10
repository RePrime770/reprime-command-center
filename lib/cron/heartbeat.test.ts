import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  redisGetJson: vi.fn(),
  redisSetJson: vi.fn(),
}))

vi.mock('../redis/client', () => ({
  redisGetJson: mocks.redisGetJson,
  redisSetJson: mocks.redisSetJson,
}))

import { stampCronRun, readHeartbeats, type Heartbeat } from './heartbeat'

const SEVEN_DAYS_SECONDS = 7 * 24 * 3600

describe('stampCronRun', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes the heartbeat under cron:heartbeat:<name> with a 7-day TTL', async () => {
    mocks.redisSetJson.mockResolvedValueOnce(true)

    await stampCronRun('email-sync', { ok: true, ms: 1234 })

    expect(mocks.redisSetJson).toHaveBeenCalledTimes(1)
    const [key, value, ttl] = mocks.redisSetJson.mock.calls[0]
    expect(key).toBe('cron:heartbeat:email-sync')
    expect(ttl).toBe(SEVEN_DAYS_SECONDS)
    expect(value.ok).toBe(true)
    expect(value.ms).toBe(1234)
    // `at` is a valid ISO timestamp.
    expect(typeof value.at).toBe('string')
    expect(new Date(value.at).toISOString()).toBe(value.at)
    // note omitted entirely when not provided.
    expect(value).not.toHaveProperty('note')
  })

  it('includes note only when provided', async () => {
    mocks.redisSetJson.mockResolvedValueOnce(true)

    await stampCronRun('slack-digest', { ok: false, ms: 50, note: 'no_webhook' })

    const [, value] = mocks.redisSetJson.mock.calls[0]
    expect(value.note).toBe('no_webhook')
    expect(value.ok).toBe(false)
  })

  it('never rejects even when redisSetJson rejects', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.redisSetJson.mockRejectedValueOnce(new Error('upstash down'))

    await expect(
      stampCronRun('center-drain', { ok: true, ms: 10 })
    ).resolves.toBeUndefined()
    expect(errSpy).toHaveBeenCalled()
  })

  it('never throws even when redisSetJson throws synchronously', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.redisSetJson.mockImplementationOnce(() => {
      throw new Error('sync boom')
    })

    await expect(
      stampCronRun('center-drain', { ok: false, ms: 10 })
    ).resolves.toBeUndefined()
    expect(errSpy).toHaveBeenCalled()
  })

  it('no-ops silently when Redis is unconfigured (redisSetJson → false)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.redisSetJson.mockResolvedValueOnce(false)

    await expect(
      stampCronRun('fire-reminders', { ok: true, ms: 5 })
    ).resolves.toBeUndefined()
    expect(errSpy).not.toHaveBeenCalled()
  })
})

describe('readHeartbeats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads each name under its prefixed key and maps misses to null', async () => {
    const hit: Heartbeat = { at: '2026-07-02T00:00:00.000Z', ok: true, ms: 20 }
    mocks.redisGetJson.mockImplementation(async (key: string) =>
      key === 'cron:heartbeat:email-sync' ? hit : null
    )

    const result = await readHeartbeats(['email-sync', 'center-drain'])

    expect(mocks.redisGetJson).toHaveBeenCalledWith('cron:heartbeat:email-sync')
    expect(mocks.redisGetJson).toHaveBeenCalledWith('cron:heartbeat:center-drain')
    expect(result).toEqual({ 'email-sync': hit, 'center-drain': null })
  })

  it('returns an empty record for an empty name list', async () => {
    await expect(readHeartbeats([])).resolves.toEqual({})
    expect(mocks.redisGetJson).not.toHaveBeenCalled()
  })
})
