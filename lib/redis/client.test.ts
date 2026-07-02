import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  ctor: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}))

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = mocks.get
    set = mocks.set
    constructor(cfg: unknown) {
      mocks.ctor(cfg)
    }
  },
}))

import { getRedis, redisGetJson, redisSetJson } from './client'

const URL_VAR = 'UPSTASH_REDIS_REST_URL'
const TOKEN_VAR = 'UPSTASH_REDIS_REST_TOKEN'

function stubEnvPresent() {
  vi.stubEnv(URL_VAR, 'https://example.upstash.io')
  vi.stubEnv(TOKEN_VAR, 'test-token')
}

function stubEnvAbsent() {
  // Empty string counts as absent (presence-only check).
  vi.stubEnv(URL_VAR, '')
  vi.stubEnv(TOKEN_VAR, '')
}

describe('getRedis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns null when UPSTASH env is absent', () => {
    stubEnvAbsent()
    expect(getRedis()).toBeNull()
    expect(mocks.ctor).not.toHaveBeenCalled()
  })

  it('returns null when only one of the two env vars is set', () => {
    vi.stubEnv(URL_VAR, 'https://example.upstash.io')
    vi.stubEnv(TOKEN_VAR, '')
    expect(getRedis()).toBeNull()
  })

  it('constructs a client from env when both vars are set', () => {
    stubEnvPresent()
    const redis = getRedis()
    expect(redis).not.toBeNull()
    expect(mocks.ctor).toHaveBeenCalledWith({
      url: 'https://example.upstash.io',
      token: 'test-token',
    })
  })
})

describe('redisGetJson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('no-ops (null) when Redis is unconfigured', async () => {
    stubEnvAbsent()
    await expect(redisGetJson('k')).resolves.toBeNull()
    expect(mocks.get).not.toHaveBeenCalled()
  })

  it('returns the stored value', async () => {
    stubEnvPresent()
    mocks.get.mockResolvedValueOnce({ a: 1 })
    await expect(redisGetJson<{ a: number }>('k')).resolves.toEqual({ a: 1 })
    expect(mocks.get).toHaveBeenCalledWith('k')
  })

  it('normalizes missing keys to null', async () => {
    stubEnvPresent()
    mocks.get.mockResolvedValueOnce(null)
    await expect(redisGetJson('missing')).resolves.toBeNull()
  })

  it('swallows read errors and returns null (never throws)', async () => {
    stubEnvPresent()
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.get.mockRejectedValueOnce(new Error('upstream boom'))
    await expect(redisGetJson('k')).resolves.toBeNull()
    expect(errSpy).toHaveBeenCalled()
  })
})

describe('redisSetJson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('no-ops (false) when Redis is unconfigured', async () => {
    stubEnvAbsent()
    await expect(redisSetJson('k', { a: 1 })).resolves.toBe(false)
    expect(mocks.set).not.toHaveBeenCalled()
  })

  it('writes with a TTL when ttlSeconds is provided', async () => {
    stubEnvPresent()
    mocks.set.mockResolvedValueOnce('OK')
    await expect(redisSetJson('k', { a: 1 }, 300)).resolves.toBe(true)
    expect(mocks.set).toHaveBeenCalledWith('k', { a: 1 }, { ex: 300 })
  })

  it('floors fractional TTLs', async () => {
    stubEnvPresent()
    mocks.set.mockResolvedValueOnce('OK')
    await redisSetJson('k', 'v', 4.9)
    expect(mocks.set).toHaveBeenCalledWith('k', 'v', { ex: 4 })
  })

  it('writes without TTL when ttlSeconds is omitted or non-positive', async () => {
    stubEnvPresent()
    mocks.set.mockResolvedValue('OK')
    await expect(redisSetJson('k', 'v')).resolves.toBe(true)
    expect(mocks.set).toHaveBeenCalledWith('k', 'v')
    await redisSetJson('k2', 'v2', 0)
    expect(mocks.set).toHaveBeenCalledWith('k2', 'v2')
  })

  it('swallows write errors and returns false (never throws)', async () => {
    stubEnvPresent()
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.set.mockRejectedValueOnce(new Error('upstream boom'))
    await expect(redisSetJson('k', 'v', 60)).resolves.toBe(false)
    expect(errSpy).toHaveBeenCalled()
  })
})
