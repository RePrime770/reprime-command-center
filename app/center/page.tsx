import Canvas from '@/components/center/Canvas'
import Column from '@/components/center/Column'
import TopStrip from '@/components/center/TopStrip'
import VoiceShellFooter from '@/components/center/VoiceShellFooter'
import PipelineColumn from '@/components/center/columns/PipelineColumn'

export const dynamic = 'force-dynamic'

/**
 * /center — RePrime Command Center kiosk shell.
 *
 * Wave 1 wiring: Pipeline column live; Inbox/Bucket/Crew remain placeholders
 * until Wave 2 ships their column components. IdentityPicker is mounted by
 * IdentityPickerSlot inside TopStrip; VoiceShellFooter remains a placeholder
 * until Track G fills it.
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
          <Column label="Pipeline" fullBleed>
            <PipelineColumn />
          </Column>
          <Column label="Inbox" />
          <Column label="Bucket" />
          <Column label="Crew" />
        </Canvas>
      </main>

      <VoiceShellFooter />
    </>
  )
}
