/**
 * Uniform AdapterStatus interface for integration adapters.
 *
 * Each adapter exposes a `getStatus()` function that checks whether the
 * required env vars are present, WITHOUT calling the underlying API. The
 * cockpit and /api/health poll these to render clean setup-required states
 * from a single source of truth.
 */

export type AdapterFailureReason =
  | 'setup_required'
  | 'auth_failed'
  | 'unreachable'
  | 'rate_limited'

export type AdapterStatus =
  | { ok: true; integration: string }
  | {
      ok: false
      integration: string
      reason: AdapterFailureReason
      missingEnv?: string[]
      message?: string
    }

export function ok(integration: string): AdapterStatus {
  return { ok: true, integration }
}

export function setupRequired(
  integration: string,
  missingEnv: string[]
): AdapterStatus {
  return {
    ok: false,
    integration,
    reason: 'setup_required',
    missingEnv,
    message: `Missing env: ${missingEnv.join(', ')}`,
  }
}

export function unreachable(
  integration: string,
  message: string
): AdapterStatus {
  return { ok: false, integration, reason: 'unreachable', message }
}

/**
 * Helper used by all adapter getStatus() impls — checks each env var name and
 * returns ok() if all present, setupRequired() with the missing list otherwise.
 */
export function checkEnv(
  integration: string,
  envNames: readonly string[]
): AdapterStatus {
  const missing = envNames.filter((name) => !process.env[name])
  if (missing.length === 0) return ok(integration)
  return setupRequired(integration, missing)
}

/**
 * Like checkEnv, but each "slot" is satisfied by ANY of the listed names.
 * Used by the Google adapter where modern (`GOOGLE_OAUTH_*`) and legacy
 * (`GOOGLE_*`) names both work.
 */
export function checkEnvAny(
  integration: string,
  slots: readonly { label: string; names: readonly string[] }[]
): AdapterStatus {
  const missing: string[] = []
  for (const slot of slots) {
    const satisfied = slot.names.some((n) => Boolean(process.env[n]))
    if (!satisfied) missing.push(slot.label)
  }
  if (missing.length === 0) return ok(integration)
  return setupRequired(integration, missing)
}
