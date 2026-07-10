import { describe, expect, test } from 'vitest'
import { buildCapabilityManifest, circuitKey, FABRIC_CAPABILITIES } from './observability'
import type { AdapterStatus } from '../adapters/status'
import type { ProviderAdapter } from './types'

function fakeAdapter(overrides: Partial<ProviderAdapter>): ProviderAdapter {
  return {
    id: 'fake-adapter',
    provider: 'fake',
    capability: 'TRANSCRIBE_AUDIO',
    priority: 0,
    enabled: () => true,
    execute: async () => ({}),
    ...overrides,
  }
}

function statusOk(integration: string): AdapterStatus {
  return { ok: true, integration }
}

function statusSetupRequired(integration: string, missingEnv: string[] = ['X']): AdapterStatus {
  return { ok: false, integration, reason: 'setup_required', missingEnv }
}

describe('FABRIC_CAPABILITIES', () => {
  test('covers exactly the seven capabilities the deck reports on, in order', () => {
    expect(FABRIC_CAPABILITIES).toEqual([
      'SEND_TEXT_MESSAGE',
      'TRANSCRIBE_AUDIO',
      'SYNTHESIZE_SPEECH',
      'GENERATE_AI_RESPONSE',
      'SEND_EMAIL',
      'CREATE_CALENDAR_EVENT',
      'LOOKUP_CONTACT',
    ])
  })
})

describe('buildCapabilityManifest', () => {
  test('marks a capability with registered adapters as routed, sorted by priority', () => {
    const adapters = [
      fakeAdapter({ id: 'openai-whisper', provider: 'openai', priority: 10 }),
      fakeAdapter({ id: 'groq-whisper', provider: 'groq', priority: 0 }),
    ]
    const result = buildCapabilityManifest(['TRANSCRIBE_AUDIO'], adapters, [], new Map())

    expect(result).toEqual([
      {
        capability: 'TRANSCRIBE_AUDIO',
        routed: true,
        providers: [
          {
            providerId: 'groq-whisper',
            provider: 'groq',
            enabled: true,
            priority: 0,
            circuitState: 'CLOSED',
          },
          {
            providerId: 'openai-whisper',
            provider: 'openai',
            enabled: true,
            priority: 10,
            circuitState: 'CLOSED',
          },
        ],
      },
    ])
  })

  test('reads resolved circuit state for a routed adapter from the map', () => {
    const adapters = [fakeAdapter({ id: 'groq-whisper', provider: 'groq' })]
    const circuitStates = new Map([[circuitKey('TRANSCRIBE_AUDIO', 'groq-whisper'), 'OPEN' as const]])

    const result = buildCapabilityManifest(['TRANSCRIBE_AUDIO'], adapters, [], circuitStates)

    expect(result[0].providers[0].circuitState).toBe('OPEN')
  })

  test('an adapter whose enabled() throws degrades to disabled, not a crash', () => {
    const adapters = [
      fakeAdapter({
        id: 'flaky',
        enabled: () => {
          throw new Error('boom')
        },
      }),
    ]

    const result = buildCapabilityManifest(['TRANSCRIBE_AUDIO'], adapters, [], new Map())

    expect(result[0].providers[0]).toMatchObject({ providerId: 'flaky', enabled: false })
  })

  test('a capability with no adapters is not routed and falls back to adapter status', () => {
    const result = buildCapabilityManifest(
      ['SEND_TEXT_MESSAGE'],
      [],
      [statusOk('timelines')],
      new Map()
    )

    expect(result).toEqual([
      {
        capability: 'SEND_TEXT_MESSAGE',
        routed: false,
        providers: [
          {
            providerId: 'timelines',
            provider: 'timelines',
            enabled: true,
            priority: 0,
            circuitState: null,
          },
        ],
      },
    ])
  })

  test('an unrouted capability never fabricates a circuit state', () => {
    const result = buildCapabilityManifest(
      ['GENERATE_AI_RESPONSE'],
      [],
      [statusSetupRequired('anthropic')],
      new Map([[circuitKey('GENERATE_AI_RESPONSE', 'anthropic'), 'OPEN' as const]])
    )

    // Even though a (bogus) circuit entry exists under this key, unrouted
    // capabilities must report circuitState: null — the map is only ever
    // consulted for adapters that are actually registered.
    expect(result[0].providers[0].circuitState).toBeNull()
    expect(result[0].providers[0].enabled).toBe(false)
  })

  test('SEND_EMAIL maps to both sendgrid and google fallback integrations', () => {
    const result = buildCapabilityManifest(
      ['SEND_EMAIL'],
      [],
      [statusOk('sendgrid'), statusSetupRequired('google')],
      new Map()
    )

    expect(result[0].providers).toEqual([
      { providerId: 'sendgrid', provider: 'sendgrid', enabled: true, priority: 0, circuitState: null },
      { providerId: 'google', provider: 'google', enabled: false, priority: 0, circuitState: null },
    ])
  })

  test('a missing adapter status for a fallback integration degrades to disabled', () => {
    const result = buildCapabilityManifest(['LOOKUP_CONTACT'], [], [], new Map())

    expect(result[0].providers).toEqual([
      { providerId: 'pipedrive', provider: 'pipedrive', enabled: false, priority: 0, circuitState: null },
    ])
  })

  test('preserves capability order as given, independent of adapter/status order', () => {
    const result = buildCapabilityManifest(
      ['LOOKUP_CONTACT', 'TRANSCRIBE_AUDIO', 'SEND_TEXT_MESSAGE'],
      [fakeAdapter({ id: 'groq-whisper' })],
      [],
      new Map()
    )

    expect(result.map((r) => r.capability)).toEqual([
      'LOOKUP_CONTACT',
      'TRANSCRIBE_AUDIO',
      'SEND_TEXT_MESSAGE',
    ])
  })
})
