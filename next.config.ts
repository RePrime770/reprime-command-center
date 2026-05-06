import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

// Pin Turbopack's workspace root to this directory. Without this, Next 16 walks
// up to C:\reprime-command-center\ (which has its own package-lock.json) and
// emits a workspace-root inference warning + fails to resolve modules that live
// only in dashboard/node_modules (playwright-core, @sparticuz/chromium).
// `process.cwd()` is the build-time CWD, which is always the dashboard dir
// (Vercel and `npm run build` both invoke from this directory).
const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: !process.env.CI,
  widenClientFileUpload: true,
  telemetry: false,
})
