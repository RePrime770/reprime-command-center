import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { registerAdapter } from '../registry'
import type { ProviderAdapter } from '../types'

/**
 * GENERATE_AI_RESPONSE adapters (roadmap ZT-3, batch ZT-3.1).
 *
 * Anthropic (claude-haiku-4-5) is tried first, OpenAI (gpt-4o-mini) is the
 * fallback. Importing this module registers both adapters as a side effect —
 * see ./index.ts, the single import point that guarantees this happens
 * exactly once per capability set.
 */

export interface GenerateResponseInput {
  system: string
  userMessage: string
  maxTokens: number
}

export interface GenerateResponseOutput {
  text: string
}

export const anthropicHaikuAdapter: ProviderAdapter<GenerateResponseInput, GenerateResponseOutput> = {
  id: 'anthropic-haiku',
  provider: 'anthropic',
  capability: 'GENERATE_AI_RESPONSE',
  priority: 0,
  enabled: (): boolean => !!process.env.ANTHROPIC_API_KEY,
  execute: async (input: GenerateResponseInput): Promise<GenerateResponseOutput> => {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: input.maxTokens,
      system: input.system,
      messages: [{ role: 'user', content: input.userMessage }],
    })
    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()
    return { text }
  },
}

export const openaiFallbackAdapter: ProviderAdapter<GenerateResponseInput, GenerateResponseOutput> = {
  id: 'openai-gpt4o-mini',
  provider: 'openai',
  capability: 'GENERATE_AI_RESPONSE',
  priority: 10,
  enabled: (): boolean => !!process.env.OPENAI_API_KEY,
  execute: async (input: GenerateResponseInput): Promise<GenerateResponseOutput> => {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: input.maxTokens,
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.userMessage },
      ],
    })
    return { text: response.choices[0]?.message?.content?.trim() ?? '' }
  },
}

// registerAdapter's public signature takes the type-erased ProviderAdapter
// (default unknown/unknown) since the registry holds adapters for many
// capabilities with different input/output shapes; the cast here is safe
// because routeCapability re-parameterizes with <GenerateResponseInput,
// GenerateResponseOutput> at the call site (see app/api/ai/summarize).
registerAdapter(anthropicHaikuAdapter as ProviderAdapter)
registerAdapter(openaiFallbackAdapter as ProviderAdapter)
