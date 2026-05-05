import Canvas from '@/components/center/Canvas'
import Column from '@/components/center/Column'
import TopStrip from '@/components/center/TopStrip'
import VoiceShellFooter from '@/components/center/VoiceShellFooter'
import WindowManager from '@/components/center/windows/WindowManager'
import WindowTaskbar from '@/components/center/windows/WindowTaskbar'
import {
  COLUMN_SLOTS,
  FOOTER_OVERLAYS,
  WINDOW_REGISTRY,
} from '@/lib/center/slots'

export const dynamic = 'force-dynamic'

/**
 * /center — RePrime Command Center kiosk shell.
 *
 * Mount points come from lib/center/slots.tsx. Add new columns, windows,
 * or overlays THERE, NOT here. This file is for layout chrome only.
 */
export default function CenterPage() {
  return (
    <>
      <TopStrip />

      <main
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        <Canvas>
          {COLUMN_SLOTS.map(({ label, component: Component, fullBleed }) => (
            <Column key={label} label={label} fullBleed={fullBleed}>
              {Component ? <Component /> : null}
            </Column>
          ))}
        </Canvas>
      </main>

      <WindowTaskbar />
      <VoiceShellFooter />
      <WindowManager registry={WINDOW_REGISTRY} />
      {FOOTER_OVERLAYS.map((Overlay, i) => (
        <Overlay key={i} />
      ))}
    </>
  )
}
