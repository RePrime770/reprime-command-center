import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,
  profilesSampleRate: 0,

  sendDefaultPii: false,

  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications.',
    'Non-Error promise rejection captured',
  ],

  beforeSend(event, hint) {
    const err = hint?.originalException
    const message =
      err instanceof Error ? err.message : typeof err === 'string' ? err : ''

    if (message && /ResizeObserver/.test(message)) return null

    // Drop fast network blips (<500ms) — usually flaky connections, not bugs.
    const reqDuration = (event.request as { duration?: number } | undefined)
      ?.duration
    if (
      typeof reqDuration === 'number' &&
      reqDuration < 500 &&
      message &&
      /(NetworkError|Failed to fetch|Load failed)/i.test(message)
    ) {
      return null
    }

    return event
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
