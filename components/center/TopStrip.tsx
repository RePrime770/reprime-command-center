'use client'

import ColorLegend from '@/components/help/ColorLegend'
import IdentityPickerSlot from './IdentityPickerSlot'

/**
 * TopStrip — pinned top of /center kiosk.
 *
 * Layout: [ColorLegend (flex)] [Briefing pill] [IdentityPickerSlot]
 *
 * The Briefing pill dispatches an `open-briefing` window event. The
 * existing BriefingModal (mounted elsewhere by another track or upstream)
 * listens for that event and opens itself. Decoupling here keeps the
 * shell free of business-logic imports.
 */
export default function TopStrip() {
  function openBriefing() {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event('open-briefing'))
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        height: 64,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'stretch',
        background: 'rgba(14, 52, 112, 0.96)',
        borderBottom: '1px solid rgba(255, 204, 51, 0.22)',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ColorLegend />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={openBriefing}
          title="Open morning briefing"
          style={{
            background: 'rgba(255, 204, 51, 0.10)',
            color: '#FFCC33',
            border: '1px solid rgba(255, 204, 51, 0.45)',
            borderRadius: 999,
            padding: '6px 18px',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Briefing
        </button>

        <IdentityPickerSlot />
      </div>
    </div>
  )
}
