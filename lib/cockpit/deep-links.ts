/**
 * Flight-Deck deep links — pure helpers for building and parsing /cockpit
 * URLs that open a specific comms thread or triaged email on arrival.
 *
 * Producers (deck pages, notifications, external links) build URLs with
 * cockpitThreadLink / cockpitEmailLink. The consumer is
 * components/cockpit/live/DeepLinkBridge.jsx, which parses
 * window.location.search on mount via parseCockpitParams and re-dispatches
 * the cockpit's existing window CustomEvent contracts.
 *
 * IDs are validated defensively (this is user-controllable URL input):
 * bounded length, conservative charset — no chars that could break URLs,
 * HTML attributes, or selectors downstream. Invalid ids never round-trip:
 * builders fall back to the bare '/cockpit' path, and parseCockpitParams
 * simply omits invalid params instead of throwing.
 */

export const COCKPIT_PATH = '/cockpit'
export const OPEN_THREAD_PARAM = 'openThread'
export const OPEN_EMAIL_PARAM = 'openEmail'

/** Max accepted id length — WhatsApp/Timelines thread ids and Gmail message ids are all far shorter. */
export const DEEP_LINK_ID_MAX_LENGTH = 128

// Letters/digits plus the separators real ids use: 'th-001', 'no-thread:inv_7',
// Gmail hex ids, UUIDs. Excludes anything URL- or markup-significant.
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@-]*$/

export interface CockpitDeepLinkParams {
  openThread?: string
  openEmail?: string
}

/** True when `id` is a safe, non-empty deep-link id (bounded length, conservative charset). */
export function isValidDeepLinkId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    id.length > 0 &&
    id.length <= DEEP_LINK_ID_MAX_LENGTH &&
    SAFE_ID_PATTERN.test(id)
  )
}

function buildLink(param: string, id: unknown): string {
  if (!isValidDeepLinkId(id)) return COCKPIT_PATH
  return `${COCKPIT_PATH}?${param}=${encodeURIComponent(id)}`
}

/** URL that opens /cockpit with the given comms thread expanded. */
export function cockpitThreadLink(threadId: string): string {
  return buildLink(OPEN_THREAD_PARAM, threadId)
}

/** URL that opens /cockpit with the given triaged email opened in EmailPanel. */
export function cockpitEmailLink(emailId: string): string {
  return buildLink(OPEN_EMAIL_PARAM, emailId)
}

/**
 * Parse deep-link params from a query string ('?a=b' or 'a=b') or
 * URLSearchParams. Invalid or absent params are omitted — never throws.
 */
export function parseCockpitParams(
  searchParams: string | URLSearchParams | null | undefined
): CockpitDeepLinkParams {
  let params: URLSearchParams
  if (searchParams instanceof URLSearchParams) {
    params = searchParams
  } else if (typeof searchParams === 'string') {
    params = new URLSearchParams(
      searchParams.startsWith('?') ? searchParams.slice(1) : searchParams
    )
  } else {
    return {}
  }

  const result: CockpitDeepLinkParams = {}
  const openThread = params.get(OPEN_THREAD_PARAM)
  const openEmail = params.get(OPEN_EMAIL_PARAM)
  if (isValidDeepLinkId(openThread)) result.openThread = openThread
  if (isValidDeepLinkId(openEmail)) result.openEmail = openEmail
  return result
}
