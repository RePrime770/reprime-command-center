import CockpitClient from './CockpitClient'

// The cockpit renders time-dependent content (clock/date) that differs between
// a static prerender and the client, which surfaced as React hydration error
// #418 (text content mismatch). Opt the route out of static prerendering so the
// HTML is produced per-request and matches the client.
//
// This must be a Server Component for the route-segment config below to be
// honored — a `'use client'` module's `dynamic` export is ignored by Next. The
// actual UI lives in the client component CockpitClient. Cache Components is not
// enabled in this project, so `dynamic` is honored (Next 16 "Previous Model").
// See node_modules/next/dist/docs/.../route-segment-config.
export const dynamic = 'force-dynamic'

export default function CockpitPage() {
  return <CockpitClient />
}
