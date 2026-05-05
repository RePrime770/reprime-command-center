import Canvas from '@/components/center/Canvas'
import Column from '@/components/center/Column'
import TopStrip from '@/components/center/TopStrip'
import VoiceShellFooter from '@/components/center/VoiceShellFooter'
import PipelineColumn from '@/components/center/columns/PipelineColumn'
import BucketColumn from '@/components/center/columns/BucketColumn'
import BucketItemDetail from '@/components/center/BucketItemDetail'
import WindowManager from '@/components/center/windows/WindowManager'
import WindowTaskbar from '@/components/center/windows/WindowTaskbar'

export const dynamic = 'force-dynamic'

/**
 * /center — RePrime Command Center kiosk shell.
 *
 * Wave 1 + Track B wiring: Pipeline + Bucket columns live; Inbox/Crew
 * remain placeholders until those tracks ship. IdentityPicker is mounted
 * by IdentityPickerSlot inside TopStrip; VoiceShellFooter remains a
 * placeholder until Track G fills it.
 *
 * BucketItemDetail is registered into the WindowManager so clicking a
 * Bucket row opens a real detail body instead of the default stub.
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
          <Column label="Bucket" fullBleed>
            <BucketColumn />
          </Column>
          <Column label="Crew" />
        </Canvas>
      </main>

      <WindowTaskbar />
      <VoiceShellFooter />
      <WindowManager
        registry={{
          'bucket-item': (props) => (
            <BucketItemDetail
              {...(props as { itemId?: string; title?: string })}
            />
          ),
        }}
      />
    </>
  )
}
