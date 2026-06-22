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
  // @sparticuz/chromium ships its Chromium binary as Brotli-compressed files
  // in node_modules/@sparticuz/chromium/bin/*.br, loaded at runtime via fs
  // (not require()) so @vercel/nft can't statically trace them. Result: the
  // serverless function deploys without bin/ and chromium.executablePath()
  // throws "input directory /var/task/bin does not exist". Force-include the
  // bin/ directory for the only route that launches a headless browser.
  // Both @sparticuz/chromium and playwright-core are already in Next 16's
  // auto-externalized list, so no serverExternalPackages entry is needed.
  outputFileTracingIncludes: {
    '/api/cron/inforuptcy-poll': ['node_modules/@sparticuz/chromium/bin/**/*'],
  },
  // The Command Center must always show the latest deploy. Without this the
  // browser caches the /outreach HTML and serves a stale build ("nothing
  // changed") after every push. Hashed JS chunks stay immutable/cached; only
  // the entry document is forced fresh.
  async headers() {
    // Force the entry documents fresh on every visit so a reload always shows
    // the latest deploy — never a cached "old" shell. Hashed JS/CSS chunks stay
    // immutable/cached; only these HTML entry points are no-store.
    const noStore = [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }]
    return [
      { source: '/', headers: noStore },
      { source: '/cockpit', headers: noStore },
      { source: '/login', headers: noStore },
      { source: '/legacy', headers: noStore },
      { source: '/outreach', headers: noStore },
      { source: '/center.html', headers: noStore },
    ]
  },
  // /outreach serves the approved standalone Command Center (public/center.html),
  // which wires itself to /api/center/* at runtime.
  async rewrites() {
    return [{ source: '/outreach', destination: '/center.html' }]
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
