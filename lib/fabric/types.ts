/**
 * Integration Fabric spine — shared types (roadmap ZT-2, batch ZT-2.1).
 *
 * This is the capability-routing layer ABOVE lib/adapters/* (which only
 * answers "is this provider configured"). Fabric answers "which provider
 * should handle this capability right now" — ordered by priority, skipping
 * providers whose circuit is OPEN, recording success/failure per attempt.
 *
 * lib/fabric/adapters/** (provider implementations of ProviderAdapter) is
 * owned by a later batch — this file only defines the shared contract.
 */

/**
 * Capabilities this repo has REAL providers for today, per
 * docs/registry/FEATURE_MATRIX.md. Extend this union only when a new
 * capability has an actual adapter landing alongside it.
 */
export type CapabilityId =
  | 'SEND_TEXT_MESSAGE'
  | 'RECEIVE_TEXT_MESSAGE'
  | 'SEND_EMAIL'
  | 'RECEIVE_EMAIL'
  | 'TRANSCRIBE_AUDIO'
  | 'SYNTHESIZE_SPEECH'
  | 'GENERATE_AI_RESPONSE'
  | 'CREATE_CALENDAR_EVENT'
  | 'LOOKUP_CONTACT'
  | 'PLACE_PHONE_CALL'
  | 'JOIN_MEETING'

/** Normalized failure category — drives circuit-breaker and retry behavior. */
export type ErrorCategory =
  | 'TRANSIENT'
  | 'PERMANENT'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'RATE_LIMIT'
  | 'QUOTA'
  | 'PROVIDER_OUTAGE'
  | 'NETWORK'
  | 'VALIDATION'
  | 'POLICY_BLOCK'
  | 'UNKNOWN'

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/**
 * One provider's implementation of one capability. `id` must be globally
 * unique across all registered adapters (e.g. 'groq-whisper').
 */
export interface ProviderAdapter<TInput = unknown, TOutput = unknown> {
  /** Globally unique id, e.g. 'groq-whisper'. */
  id: string
  /** Provider name, e.g. 'groq'. */
  provider: string
  capability: CapabilityId
  /** Lower priority is tried first. */
  priority: number
  /** Cheap sync check — typically wraps an existing lib/<provider>/status.ts getStatus().ok. */
  enabled: () => boolean
  execute: (input: TInput) => Promise<TOutput>
}

export interface RoutingSuccess<T> {
  ok: true
  data: T
  providerId: string
}

export interface RoutingFailure {
  ok: false
  error: ErrorCategory
  message: string
  /** Provider ids attempted (in order), including circuit-skipped ones. */
  attempted: string[]
}

export type RoutingResult<T> = RoutingSuccess<T> | RoutingFailure
