'use client'

import '@/components/cockpit/cockpit.css'
import CockpitApp from '@/components/cockpit/App.jsx'
import { CockpitLiveDataProvider } from '@/components/cockpit/live/CockpitLiveData.jsx'

// The cockpit is a design mock built for a very wide (~4000px) fixed-width
// canvas with its own internal horizontal scroll. Wrap it in an
// overflow-x:auto container so the whole thing can scroll on smaller viewports
// without fighting its fixed widths. The live-data provider feeds Comms /
// Calendar / Brief / Email / Nora's Desk real API data; empty live sources
// render an empty/quiet state — there is no mock-data fallback.
export default function CockpitClient() {
  return (
    <div style={{ width: '100%', overflowX: 'auto', background: '#FAFAFA' }}>
      <CockpitLiveDataProvider>
        <CockpitApp />
      </CockpitLiveDataProvider>
    </div>
  )
}
