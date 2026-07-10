import type { ErrorCategory } from './types'

/**
 * classifyError — normalizes an unknown thrown value into an ErrorCategory
 * the circuit-breaker and router can act on. Pure function, no network —
 * fully unit-testable with plain Error/object fixtures.
 */

interface StatusLike {
  name?: unknown
  status?: unknown
  statusCode?: unknown
  message?: unknown
  response?: { status?: unknown }
}

export function classifyError(err: unknown): ErrorCategory {
  const candidate = (err ?? {}) as StatusLike

  if (isAbortLike(candidate)) return 'NETWORK'

  const status = extractStatus(candidate)
  if (typeof status === 'number') {
    const byStatus = classifyByStatus(status)
    if (byStatus) return byStatus
  }

  const message = typeof candidate.message === 'string' ? candidate.message : ''
  const byMessage = classifyByMessage(message)
  if (byMessage) return byMessage

  return 'UNKNOWN'
}

function isAbortLike(candidate: StatusLike): boolean {
  return candidate.name === 'AbortError' || candidate.name === 'TimeoutError'
}

function extractStatus(candidate: StatusLike): number | undefined {
  const status = candidate.status ?? candidate.response?.status ?? candidate.statusCode
  return typeof status === 'number' ? status : undefined
}

function classifyByStatus(status: number): ErrorCategory | null {
  if (status === 401) return 'AUTHENTICATION'
  if (status === 403) return 'AUTHORIZATION'
  if (status === 429) return 'RATE_LIMIT'
  if (status === 402) return 'QUOTA'
  if (status >= 500 && status < 600) return 'PROVIDER_OUTAGE'
  if (status === 400 || status === 422) return 'VALIDATION'
  return null
}

function classifyByMessage(message: string): ErrorCategory | null {
  const lower = message.toLowerCase()
  if (lower.includes('rate limit')) return 'RATE_LIMIT'
  if (lower.includes('quota')) return 'QUOTA'
  if (
    lower.includes('timeout') ||
    lower.includes('network') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound')
  ) {
    return 'NETWORK'
  }
  if (
    lower.includes('unauthorized') ||
    lower.includes('invalid api key') ||
    lower.includes('invalid_api_key')
  ) {
    return 'AUTHENTICATION'
  }
  return null
}
