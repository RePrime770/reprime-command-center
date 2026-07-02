import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ok,
  setupRequired,
  unreachable,
  checkEnv,
  checkEnvAny,
} from './status'

describe('AdapterStatus helpers', () => {
  it('ok() returns expected shape', () => {
    const s = ok('zoom')
    expect(s).toEqual({ ok: true, integration: 'zoom' })
  })

  it('setupRequired() returns expected shape', () => {
    const s = setupRequired('zoom', ['ZOOM_CLIENT_ID'])
    expect(s.ok).toBe(false)
    if (!s.ok) {
      expect(s.integration).toBe('zoom')
      expect(s.reason).toBe('setup_required')
      expect(s.missingEnv).toEqual(['ZOOM_CLIENT_ID'])
    }
  })

  it('unreachable() returns expected shape', () => {
    const s = unreachable('zoom', 'boom')
    expect(s.ok).toBe(false)
    if (!s.ok) {
      expect(s.reason).toBe('unreachable')
      expect(s.message).toBe('boom')
    }
  })

  it('checkEnv() reports missing env names', () => {
    vi.stubEnv('FOO_KEY', '')
    vi.stubEnv('BAR_KEY', '')
    const s = checkEnv('foo', ['FOO_KEY', 'BAR_KEY'])
    expect(s.ok).toBe(false)
    if (!s.ok) {
      expect(s.missingEnv).toEqual(['FOO_KEY', 'BAR_KEY'])
    }
  })

  it('checkEnv() returns ok when env present', () => {
    vi.stubEnv('FOO_KEY', 'placeholder')
    vi.stubEnv('BAR_KEY', 'placeholder')
    const s = checkEnv('foo', ['FOO_KEY', 'BAR_KEY'])
    expect(s.ok).toBe(true)
  })

  it('checkEnvAny() accepts alternates', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'placeholder')
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_ID', '')
    const s = checkEnvAny('google', [
      { label: 'CLIENT_ID', names: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_CLIENT_ID'] },
    ])
    expect(s.ok).toBe(true)
  })
})

// ── Per-adapter getStatus() checks ──────────────────────────────────────────

const ADAPTERS: Array<{
  name: string
  importer: () => Promise<{ getStatus: () => unknown }>
  env: string[]
}> = [
  { name: 'sendgrid', importer: () => import('../sendgrid/client'), env: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'] },
  { name: 'zoom', importer: () => import('../zoom/client'), env: ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'] },
  { name: 'pipedrive', importer: () => import('../pipedrive/client'), env: ['PIPEDRIVE_API_TOKEN'] },
  { name: 'timelines', importer: () => import('../timelines/client'), env: ['TIMELINES_API_KEY'] },
  { name: 'pagerduty', importer: () => import('../pagerduty/events'), env: ['PAGERDUTY_ROUTING_KEY'] },
  { name: 'slack', importer: () => import('../slack/client'), env: ['SLACK_WEBHOOK_URL'] },
  { name: 'redis', importer: () => import('../redis/status'), env: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] },
  { name: 'anthropic', importer: () => import('../anthropic/status'), env: ['ANTHROPIC_API_KEY'] },
  { name: 'openai', importer: () => import('../openai/status'), env: ['OPENAI_API_KEY'] },
  { name: 'groq', importer: () => import('../groq/status'), env: ['GROQ_API_KEY'] },
  { name: 'quo', importer: () => import('../quo/status'), env: ['QUO_API_KEY'] },
  { name: 'elevenlabs', importer: () => import('../elevenlabs/status'), env: ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID'] },
  { name: 'apollo', importer: () => import('../apollo/status'), env: ['APOLLO_API_KEY'] },
  { name: 'bluebubbles', importer: () => import('../bluebubbles/status'), env: ['BLUEBUBBLES_SERVER_URL', 'BLUEBUBBLES_PASSWORD'] },
  { name: 'supabase', importer: () => import('../supabase/status'), env: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] },
]

describe('adapter getStatus() — happy path', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  for (const a of ADAPTERS) {
    it(`${a.name} returns ok when all env present`, async () => {
      for (const k of a.env) vi.stubEnv(k, 'placeholder')
      const mod = await a.importer()
      const s = mod.getStatus() as { ok: boolean }
      expect(s.ok).toBe(true)
    })
  }
})

describe('adapter getStatus() — missing env', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  for (const a of ADAPTERS) {
    it(`${a.name} flags setup_required when env missing`, async () => {
      for (const k of a.env) vi.stubEnv(k, '')
      const mod = await a.importer()
      const s = mod.getStatus() as {
        ok: boolean
        reason?: string
        missingEnv?: string[]
      }
      expect(s.ok).toBe(false)
      expect(s.reason).toBe('setup_required')
      expect(Array.isArray(s.missingEnv)).toBe(true)
      expect((s.missingEnv ?? []).length).toBeGreaterThan(0)
    })
  }
})

describe('google getStatus() — accepts legacy env names', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('accepts GOOGLE_CLIENT_ID/SECRET when GOOGLE_OAUTH_* absent', async () => {
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_ID', '')
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_SECRET', '')
    vi.stubEnv('GOOGLE_CLIENT_ID', 'placeholder')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'placeholder')
    vi.stubEnv('GOOGLE_REFRESH_TOKEN', 'placeholder')
    const mod = await import('../google/status')
    const s = mod.getStatus()
    expect(s.ok).toBe(true)
  })

  it('reports missing refresh token', async () => {
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_ID', 'placeholder')
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_SECRET', 'placeholder')
    vi.stubEnv('GOOGLE_REFRESH_TOKEN', '')
    const mod = await import('../google/status')
    const s = mod.getStatus()
    expect(s.ok).toBe(false)
  })
})

describe('adapter registry', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns one entry per registered adapter', async () => {
    const { REGISTERED_ADAPTERS, getAllStatuses } = await import('./registry')
    const statuses = await getAllStatuses()
    expect(statuses.length).toBe(REGISTERED_ADAPTERS.length)
    for (const s of statuses) {
      expect(typeof s.integration).toBe('string')
      expect(typeof s.ok).toBe('boolean')
    }
  })

  it('includes load-bearing supabase first', async () => {
    const { getAllStatuses } = await import('./registry')
    const statuses = await getAllStatuses()
    expect(statuses[0].integration).toBe('supabase')
  })
})
