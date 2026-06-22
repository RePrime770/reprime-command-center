'use client'

import '@/components/cockpit/cockpit.css'
import CockpitApp from '@/components/cockpit/App.jsx'
import { CockpitLiveDataProvider } from '@/components/cockpit/live/CockpitLiveData.jsx'

// The cockpit is a design mock built for a very wide (~4000px) fixed-width
// canvas with its own internal horizontal scroll. Wrap it in an
// overflow-x:auto container so the whole thing can scroll on smaller viewports
// without fighting its fixed widths. Phase 2: wraps the app in the live-data
// provider so Comms / Calendar / Brief read real API data (static mock data is
// kept only as a graceful fallback during load / on error).
export default function CockpitPage() {
  return (
    <div style={{ width: '100%', overflowX: 'auto', background: '#FAFAFA' }}>
      <CockpitLiveDataProvider>
        <CockpitApp />
      </CockpitLiveDataProvider>
    </div>
  )
}
