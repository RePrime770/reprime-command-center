import Canvas from '@/components/center/Canvas'
import Column from '@/components/center/Column'
import ReminderToast from '@/components/center/ReminderToast'
import TopStrip from '@/components/center/TopStrip'
import VoiceShellFooter from '@/components/center/VoiceShellFooter'
import VoiceModalsHost from '@/components/center/VoiceModalsHost'
import CrewColumn from '@/components/center/columns/CrewColumn'
import InboxColumn from '@/components/center/columns/InboxColumn'
import PipelineColumn from '@/components/center/columns/PipelineColumn'
import BucketColumn from '@/components/center/columns/BucketColumn'
import BucketItemDetail from '@/components/center/BucketItemDetail'
import InvestorProfileWindow from '@/components/center/InvestorProfileWindow'
import SecretaryWindow from '@/components/center/windows/SecretaryWindow'
import WindowManager from '@/components/center/windows/WindowManager'
import WindowTaskbar from '@/components/center/windows/WindowTaskbar'
import type { InvestorProfileData } from '@/components/panels/InvestorProfile'

export const dynamic = 'force-dynamic'

/**
 * /center — RePrime Command Center kiosk shell.
 *
 * Wave 1 + Tracks B, C, D, G wiring: Pipeline + Inbox + Bucket + Crew
 * columns all live; the voice shell footer is wired (hold space /
 * Ctrl+Shift+V). IdentityPicker is mounted by IdentityPickerSlot
 * inside TopStrip.
 *
 * BucketItemDetail is registered into the WindowManager so clicking a
 * Bucket row opens a real detail body instead of the default stub.
 *
 * VoiceModalsHost listens for `center:open-search|call|email|briefing`
 * CustomEvents that VoiceShell dispatches and opens the existing modals.
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
          <Column label="Inbox" fullBleed>
            <InboxColumn />
          </Column>
          <Column label="Bucket" fullBleed>
            <BucketColumn />
          </Column>
          <Column label="Crew">
            <CrewColumn />
          </Column>
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
          'investor-profile': (props) => (
            <InvestorProfileWindow
              {...(props as {
                pipedriveContactId?: number
                name?: string
                fallbackData?: InvestorProfileData
              })}
            />
          ),
          secretary: () => <SecretaryWindow />,
        }}
      />
      <ReminderToast />
      <VoiceModalsHost />
    </>
  )
}
