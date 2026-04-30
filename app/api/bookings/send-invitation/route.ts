import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { getPerson } from '@/lib/pipedrive/client'
import { sendEmail } from '@/lib/sendgrid/client'
import { buildTerminalInvitationEmail } from '@/lib/email/templates/terminal-invitation'
import { buildGeneralMeetingEmail } from '@/lib/email/templates/general-meeting'
import { getChats, sendMessage, PANEL_ACCOUNT_MAP } from '@/lib/timelines/client'
import { normalizePhone } from '@/lib/timelines/normalize-phone'
import type { Panel } from '@/lib/timelines/types'

// Required table (run once in Supabase SQL editor):
//   CREATE TABLE IF NOT EXISTS invitations (
//     id uuid PRIMARY KEY,
//     contact_pipedrive_id integer,
//     contact_first_name text,
//     contact_name text,
//     contact_email text,
//     contact_phone text,
//     proposed_slots jsonb,
//     status text DEFAULT 'sent',
//     confirmed_slot_iso text,
//     zoom_meeting_id text,
//     zoom_join_url text,
//     calendar_event_id text,
//     created_at timestamptz DEFAULT now(),
//     expires_at timestamptz DEFAULT (now() + interval '14 days')
//   );

export const dynamic = 'force-dynamic'

const ALLOWED_EMAIL = 'g@reprime.com'
const FROM_EMAIL = 'g@reprime-terminal.com'
const REPLY_TO = 'g@reprime.com'

type Channel = 'whatsapp_718' | 'whatsapp_305' | 'email' | 'all'

type MeetingType = 'terminal' | 'meeting'

interface SendInvitationBody {
  contact: number
  channel: Channel
  meeting_type?: MeetingType
  slots?: string[]
}

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://project-7e87w.vercel.app'
  ).replace(/\/$/, '')
}

function formatSlotDisplay(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const fmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  })
  return `${fmt.format(d)} Central`
}

function panelFromChannel(channel: Channel): Panel | null {
  if (channel === 'whatsapp_718') return '718'
  if (channel === 'whatsapp_305') return '305'
  if (channel === 'all') return '305'
  return null
}

function buildWhatsAppCopy(
  firstName: string,
  inviteUrl: string,
  meetingType: MeetingType
): string {
  if (meetingType === 'meeting') {
    return `${firstName} — I'd value some time with you.\n\n30 minutes, your schedule. Pick what works:\n${inviteUrl}\n— Gideon`
  }
  return `${firstName} — I'm hosting a Terminal Introduction.\n\nThe Terminal is a deal sourcing machine unlike anything that exists — built to source, qualify, and close at a different level. One of a kind.\n\n30 minutes to walk you through it. Pick a time:\n${inviteUrl}\n— Gideon`
}

async function findChatIdForPhone(panel: Panel, phone: string): Promise<number | null> {
  const target = phone.replace(/\D/g, '')
  for (let page = 1; page <= 5; page++) {
    const chats = await getChats(panel, page)
    if (chats.length === 0) return null
    const match = chats.find((c) => c.phone.replace(/\D/g, '') === target && !c.is_group)
    if (match) return match.id
  }
  return null
}

function pickPrimary(values: Array<{ value: string; primary: boolean }> | null | undefined): string | null {
  if (!values || values.length === 0) return null
  const primary = values.find((v) => v.primary && v.value)
  return (primary?.value || values[0]?.value || null) as string | null
}

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: SendInvitationBody
  try {
    body = (await request.json()) as SendInvitationBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!Number.isInteger(body.contact) || body.contact <= 0) {
    return NextResponse.json({ error: 'contact_required' }, { status: 400 })
  }
  if (!['whatsapp_718', 'whatsapp_305', 'email', 'all'].includes(body.channel)) {
    return NextResponse.json({ error: 'invalid_channel' }, { status: 400 })
  }
  // slots is optional; if provided must be an array of ISO strings
  if (body.slots !== undefined && body.slots !== null) {
    if (!Array.isArray(body.slots) || !body.slots.every((s) => typeof s === 'string')) {
      return NextResponse.json({ error: 'slots_must_be_iso_strings_array' }, { status: 400 })
    }
  }

  let person
  try {
    person = await getPerson(body.contact)
  } catch (err) {
    return NextResponse.json(
      { error: 'pipedrive_error', message: (err as Error).message },
      { status: 502 }
    )
  }
  if (!person) {
    return NextResponse.json({ error: 'contact_not_found' }, { status: 404 })
  }

  const firstName = (person.first_name || person.name?.split(' ')[0] || 'there').trim()
  const fullName = (person.name || firstName).trim()
  const email = person.primary_email || pickPrimary(person.email ?? null)
  const phoneRaw = pickPrimary(person.phone ?? null)
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null
  const meetingType: MeetingType = body.meeting_type === 'meeting' ? 'meeting' : 'terminal'

  const slotsWithDisplay = (body.slots ?? []).map((iso) => ({
    iso,
    display: formatSlotDisplay(iso),
  }))

  const token = randomUUID()
  const inviteUrl = `${appUrl()}/invite/${token}`

  const service = createServiceClient()
  const { error: insertError } = await service.from('invitations').insert({
    id: token,
    contact_pipedrive_id: person.id,
    contact_first_name: firstName,
    contact_name: fullName,
    contact_email: email,
    contact_phone: phone,
    proposed_slots: slotsWithDisplay,
    meeting_type: meetingType,
    status: 'sent',
  })
  if (insertError) {
    return NextResponse.json(
      {
        error: 'invitation_insert_failed',
        message: insertError.message,
        hint: 'If table is missing, create the invitations table per the SQL in this route file header.',
      },
      { status: 500 }
    )
  }

  const sentChannels: string[] = []
  const errors: Array<{ channel: string; message: string }> = []

  const wantsEmail = body.channel === 'email' || body.channel === 'all'
  const wantsWhatsApp =
    body.channel === 'whatsapp_718' || body.channel === 'whatsapp_305' || body.channel === 'all'

  if (wantsEmail) {
    if (!email) {
      errors.push({ channel: 'email', message: 'no_email_on_contact' })
    } else {
      try {
        const tmpl = meetingType === 'meeting'
          ? buildGeneralMeetingEmail({ firstName, inviteUrl })
          : buildTerminalInvitationEmail({ firstName, inviteUrl, slots: slotsWithDisplay.map((s) => ({ display: s.display })) })
        await sendEmail({
          to: email,
          from: FROM_EMAIL,
          replyTo: REPLY_TO,
          subject: tmpl.subject,
          html: tmpl.html,
          text: tmpl.text,
        })
        sentChannels.push('email')
      } catch (err) {
        errors.push({ channel: 'email', message: (err as Error).message })
      }
    }
  }

  if (wantsWhatsApp) {
    const panel = panelFromChannel(body.channel) ?? '305'
    if (!phone) {
      errors.push({ channel: `whatsapp_${panel}`, message: 'no_phone_on_contact' })
    } else {
      try {
        const chatId = await findChatIdForPhone(panel, phone)
        if (!chatId) {
          errors.push({
            channel: `whatsapp_${panel}`,
            message: 'no_existing_chat_with_this_phone_on_panel',
          })
        } else {
          const text = buildWhatsAppCopy(firstName, inviteUrl, meetingType)
          await sendMessage({
            phone,
            text,
            whatsappAccountPhone: PANEL_ACCOUNT_MAP[panel],
          })
          sentChannels.push(`whatsapp_${panel}`)
        }
      } catch (err) {
        errors.push({ channel: `whatsapp_${panel}`, message: (err as Error).message })
      }
    }
  }

  return NextResponse.json({
    invitation_id: token,
    invite_url: inviteUrl,
    sent_channels: sentChannels,
    errors,
  })
}
