import { describe, it, expect, afterEach } from 'vitest'
import { anthropicHaikuAdapter, openaiFallbackAdapter } from './llm'

describe('llm adapters', () => {
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY
  })

  it('anthropic-haiku has the expected id/provider/capability/priority shape', () => {
    expect(anthropicHaikuAdapter.id).toBe('anthropic-haiku')
    expect(anthropicHaikuAdapter.provider).toBe('anthropic')
    expect(anthropicHaikuAdapter.capability).toBe('GENERATE_AI_RESPONSE')
    expect(anthropicHaikuAdapter.priority).toBe(0)
  })

  it('openai-gpt4o-mini has the expected id/provider/capability/priority shape', () => {
    expect(openaiFallbackAdapter.id).toBe('openai-gpt4o-mini')
    expect(openaiFallbackAdapter.provider).toBe('openai')
    expect(openaiFallbackAdapter.capability).toBe('GENERATE_AI_RESPONSE')
    expect(openaiFallbackAdapter.priority).toBe(10)
  })

  it('anthropic-haiku is enabled only when ANTHROPIC_API_KEY is set', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(anthropicHaikuAdapter.enabled()).toBe(false)

    process.env.ANTHROPIC_API_KEY = 'test-value'
    expect(anthropicHaikuAdapter.enabled()).toBe(true)
  })

  it('openai-gpt4o-mini is enabled only when OPENAI_API_KEY is set', () => {
    delete process.env.OPENAI_API_KEY
    expect(openaiFallbackAdapter.enabled()).toBe(false)

    process.env.OPENAI_API_KEY = 'test-value'
    expect(openaiFallbackAdapter.enabled()).toBe(true)
  })

  it('anthropic is prioritized before openai (lower priority value = tried first)', () => {
    expect(anthropicHaikuAdapter.priority).toBeLessThan(openaiFallbackAdapter.priority)
  })
})
