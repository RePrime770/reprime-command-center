export type Panel = '718' | '305'
export type ChannelType = 'whatsapp' | 'sms' | 'imessage' | 'google_voice'
export type Direction = 'in' | 'out'

export interface TimelinesChat {
  id: number
  name: string
  phone: string
  jid: string
  is_group: boolean
  closed: boolean
  read: boolean
  labels: string[]
  whatsapp_account_id: string
  chat_url: string
  created_timestamp: string
  last_message_uid: string | null
  last_message_timestamp: string | null
  unattended: boolean
  photo: string | null
  is_allowed_to_message: boolean
  group_members: any[]
}

export interface TimelinesMessage {
  uid: string
  chat_id: number
  timestamp: string
  sender_phone: string
  sender_name: string
  recipient_phone: string
  recipient_name: string
  from_me: boolean
  text: string
  attachment_url: string | null
  attachment_filename: string | null
  status: string
  origin: string
  has_attachment: boolean
  message_type: string
  reactions: { users: any[]; reactions: Record<string, any>; total: number }
  data: Record<string, any>
}

export interface DashboardThread {
  id: string
  panel: Panel
  channel_type: ChannelType
  phone: string
  contact_name: string | null
  is_group: boolean
  jid: string | null
  last_message_at: string | null
  last_message_preview: string | null
  unread_count: number
  pipedrive_contact_id: number | null
  is_investor: boolean
}

export interface DashboardMessage {
  id: string
  thread_id: string
  panel: Panel
  channel_type: ChannelType
  direction: Direction
  body: string | null
  media_url: string | null
  media_type: string | null
  media_filename: string | null
  timelines_uid: string | null
  from_phone: string | null
  from_name: string | null
  sent_at: string | null
  status: string | null
  is_group_message: boolean
}
