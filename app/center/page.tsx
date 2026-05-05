import Canvas from '@/components/center/Canvas'
import Column from '@/components/center/Column'
import TopStrip from '@/components/center/TopStrip'
import VoiceShellFooter from '@/components/center/VoiceShellFooter'

export const dynamic = 'force-dynamic'

/**
 * /center — RePrime Command Center kiosk shell.
 *
 * Wave 1 Track A scaffold: chassis only. Other tracks mount their column
 * contents (Pipeline, Inbox, Bucket, Crew) into the four labeled
 * <Column> children, and replace the IdentityPickerSlot / VoiceShellFooter
 * placeholders with their live components.
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
          <Column label="Pipeline" />
          <Column label="Inbox" />
          <Column label="Bucket" />
          <Column label="Crew" />
        </Canvas>
      </main>

      <VoiceShellFooter />
    </>
  )
}
