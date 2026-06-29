'use client'

import { useEffect, useState } from 'react'
import '@/components/cockpit/cockpit.css'
import CockpitApp from '@/components/cockpit/App.jsx'
import { CockpitLiveDataProvider } from '@/components/cockpit/live/CockpitLiveData.jsx'

// The cockpit is a design mock built for a very wide (~4000px) fixed-width
// canvas with its own internal horizontal scroll. Wrap it in an
// overflow-x:auto container so the whole thing can scroll on smaller viewports
// without fighting its fixed widths. The live-data provider feeds Comms /
// Calendar / Brief / Email / Nora's Desk real API data; empty live sources
// render an empty/quiet state — there is no mock-data fallback.
//
// MOUNT GATE (fixes React #418): the chrome renders live, time-dependent text
// at first paint (the clock, Shabbat countdown, date pills computed from
// `new Date()`), which differs between the server-rendered HTML and the client
// — a hydration text mismatch that fired #418 ~22×, making React discard the
// server HTML and re-render with a visible flash/jank that read as "not
// loading." All cockpit data is fetched client-side anyway, so there is no SSR
// value to keep: render a stable placeholder on the server + first client paint
// (so they MATCH — no mismatch), then mount the real cockpit after hydration.
export default function CockpitClient() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div style={{ width: '100%', overflowX: 'auto', background: '#FAFAFA', minHeight: '100vh' }}>
      {mounted ? (
        <CockpitLiveDataProvider>
          <CockpitApp />
        </CockpitLiveDataProvider>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: '#64748B',
            fontSize: 16,
            letterSpacing: '0.08em',
          }}
        >
          Loading cockpit…
        </div>
      )}
    </div>
  )
}
