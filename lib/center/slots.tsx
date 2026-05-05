import type { ComponentType } from 'react'
import type { ColumnProps } from '@/components/center/Column'
import type { ComponentRegistry } from '@/components/center/windows/WindowManager'
import type { InvestorProfileData } from '@/components/panels/InvestorProfile'

import CrewColumn from '@/components/center/columns/CrewColumn'
import InboxColumn from '@/components/center/columns/InboxColumn'
import PipelineColumn from '@/components/center/columns/PipelineColumn'
import BucketColumn from '@/components/center/columns/BucketColumn'

import BucketItemDetail from '@/components/center/BucketItemDetail'
import InvestorCadenceWindow from '@/components/center/InvestorCadenceWindow'
import InvestorProfileWindow from '@/components/center/InvestorProfileWindow'
import SecretaryWindow from '@/components/center/windows/SecretaryWindow'

import ReminderToast from '@/components/center/ReminderToast'
import VoiceModalsHost from '@/components/center/VoiceModalsHost'

/**
 * Mount points for the /center kiosk.
 *
 * app/center/page.tsx is intentionally dumb layout chrome. Add a new
 * column, window, or overlay HERE — never in page.tsx. Wave 2-5 tracks
 * collided on page.tsx every time; this file is the merge surface.
 */

export type ColumnSlot = {
  label: ColumnProps['label']
  component?: ComponentType
  fullBleed?: boolean
}

export const COLUMN_SLOTS: ColumnSlot[] = [
  { label: 'Pipeline', component: PipelineColumn, fullBleed: true },
  { label: 'Inbox', component: InboxColumn, fullBleed: true },
  { label: 'Bucket', component: BucketColumn, fullBleed: true },
  { label: 'Crew', component: CrewColumn },
]

export const WINDOW_REGISTRY: ComponentRegistry = {
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
  'investor-cadence': () => <InvestorCadenceWindow />,
}

export const FOOTER_OVERLAYS: ComponentType[] = [
  ReminderToast,
  VoiceModalsHost,
]
