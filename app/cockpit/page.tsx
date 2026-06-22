'use client'

import '@/components/cockpit/cockpit.css'
import CockpitApp from '@/components/cockpit/App.jsx'

// The cockpit is a design mock built for a very wide (~4000px) fixed-width
// canvas with its own internal horizontal scroll. Wrap it in an
// overflow-x:auto container so the whole thing can scroll on smaller viewports
// without fighting its fixed widths. Phase 1: renders with static mock data.
export default function CockpitPage() {
  return (
    <div style={{ width: '100%', overflowX: 'auto', background: '#FAFAFA' }}>
      <CockpitApp />
    </div>
  )
}
