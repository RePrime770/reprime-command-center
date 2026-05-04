'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { GOLD, NAVY, CREAM_TOP, CREAM_BOTTOM, gold, navy } from '@/lib/design-tokens'
import SpeakerButton from '@/components/chat/SpeakerButton'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InvestorTask {
  id: string
  status: 'open' | 'done'
  title: string
  meta: string
  daysLate?: number
}

export interface InvestorEvent {
  id: string
  icon: string
  time: string
  title: string
  body: string
}

export interface InvestorRecommendation {
  headline: string
  detail: string
  actions: { label: string; variant: 'primary' | 'secondary' | 'tertiary' }[]
}

export interface InvestorProfileData {
  id: string
  /** Pipedrive Person id — used as the foreign key when scheduling reminders, etc. */
  pipedriveContactId: number | null
  name: string
  phone: string
  email: string | null
  company: string | null
  lastContactAt: string | null
  lastContactChannel: string | null
  lastContactMessage: string | null
  taggedDaysAgo: number | null
  /** Tier letter parsed from Pipedrive TAG (`investor-A-principal` → A). */
  tier: 'A' | 'B' | 'C' | 'D' | null
  /** Role parsed from Pipedrive TAG. */
  role: 'principal' | 'connector' | null
  /** Pipedrive deals associated with this contact (open status). */
  activeDealsCount: number
  /** Human-readable last meeting time, e.g. "5d ago" or null. */
  lastMeetingAgo: string | null
  summary: string | null
  recommendation: InvestorRecommendation | null
  tasks: InvestorTask[]
  notes: string
  timeline: InvestorEvent[]
  tabCounts: {
    timeline: number
    emails: number
    whatsapp: number
    calls: number
    meetings: number
    tasks: number
  }
}

// ── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_INVESTORS: InvestorProfileData[] = [
  {
    id: 'mock-david-cohen',
    pipedriveContactId: null,
    name: 'David Cohen',
    phone: '+1 (305) 555-0192',
    email: 'david@cohencap.com',
    company: 'Cohen Capital',
    lastContactAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    lastContactChannel: '2h ago · WhatsApp 305 (inbound)',
    lastContactMessage: '"Sounds good, see you Tuesday at 9"',
    taggedDaysAgo: 14,
    tier: 'A',
    role: 'principal',
    activeDealsCount: 2,
    lastMeetingAgo: '5d ago',
    summary:
      'David runs Cohen Capital. He has $40 million to invest in Florida real estate.\n\n' +
      'He likes two of your deals right now:\n' +
      '• Harvard Plaza — this is the main one. Steve still owes him a price list.\n' +
      '• 500 Bailey — early interest, no commitment yet.\n\n' +
      'He prefers WhatsApp on the 305 line. He always wants to be paid every 3 months — that is a hard rule for him.\n\n' +
      'Your next call with him is Tuesday at 9 AM Central.',
    recommendation: {
      headline: "Wait for Steve's price list. Then text David.",
      detail:
        "David asked Steve for prices on Harvard Plaza. Steve has not sent them yet — it's been 3 days.\n\n" +
        'Step 1: Remind Steve today.\n' +
        'Step 2: When Steve sends the prices, text David on WhatsApp 305 with the file.',
      actions: [
        { label: 'Remind Steve now', variant: 'primary' },
        { label: 'Draft WhatsApp to David', variant: 'secondary' },
        { label: 'Wait — no action', variant: 'tertiary' },
      ],
    },
    tasks: [
      {
        id: 'task-1',
        status: 'open',
        title: 'Pull comps for Harvard Plaza',
        meta: '→ Steve · WhatsApp · sent Mon 9:14 AM',
        daysLate: 3,
      },
    ],
    notes:
      "Met at Mendy's Hanukkah party 2025. Comes from textile money, second generation. Wife runs a non-profit. Loves Florida deals — does not touch anything north of Atlanta. Prefers I send him short voice notes, not long emails.",
    timeline: [
      {
        id: 'ev-1',
        icon: '💬',
        time: 'Today · 2h ago · WhatsApp 305',
        title: '"Sounds good, see you Tuesday at 9"',
        body: 'Reply to your slot confirmation. No action needed — the meeting is locked in.',
      },
      {
        id: 'ev-2',
        icon: '✉',
        time: 'Yesterday · 4:12 PM · Email',
        title: 'Re: Harvard Plaza — first look',
        body: "David's reply: he likes the building but wants Steve to pull a price list of similar buildings sold in 2024–2026 before he commits.",
      },
      {
        id: 'ev-3',
        icon: '📞',
        time: '2 days ago · Zoom · 43 min',
        title: 'First call — Terminal introduction',
        body: 'Two deals discussed: Harvard Plaza and 500 Bailey. David asked Steve for a price list. Recording + full transcript saved.',
      },
      {
        id: 'ev-4',
        icon: '✉',
        time: '1 week ago · Terminal invitation sent',
        title: 'Terminal Introduction — David Cohen',
        body: 'Slot confirmed: Tuesday May 5, 9:00 AM Central · 30 min · Zoom',
      },
      {
        id: 'ev-5',
        icon: '💬',
        time: '2 weeks ago · WhatsApp 305',
        title: 'First contact',
        body: 'Introduced via Mendy Tuitou. Brief intro about Cohen Capital — $40 million to invest in Florida real estate.',
      },
    ],
    tabCounts: { timeline: 38, emails: 12, whatsapp: 22, calls: 3, meetings: 2, tasks: 1 },
  },
  {
    id: 'mock-mendy-tuitou',
    pipedriveContactId: null,
    name: 'Mendy Tuitou',
    phone: '+1 (305) 555-0137',
    email: 'mendy@tuitougroup.com',
    company: 'Tuitou Group',
    lastContactAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    lastContactChannel: '3h ago · WhatsApp 305 (inbound)',
    lastContactMessage: '"Got the term sheet, will review tonight"',
    taggedDaysAgo: 30,
    tier: 'B',
    role: 'principal',
    activeDealsCount: 1,
    lastMeetingAgo: 'No meetings yet',
    summary:
      'Mendy is your main connector in the Sephardic community. He has introduced you to at least 4 investors including David Cohen.\n\n' +
      'He is interested in 500 Bailey at $2.5M. He reviewed the term sheet today.\n\n' +
      'He responds fast on WhatsApp 305. Very relationship-driven — he prefers short, personal messages over formal docs.',
    recommendation: {
      headline: 'Follow up on 500 Bailey term sheet tomorrow morning.',
      detail:
        "Mendy said he'd review it tonight. Send a short WhatsApp tomorrow morning asking what he thinks. Keep it casual — one line, no pressure.",
      actions: [
        { label: 'Draft WhatsApp to Mendy', variant: 'primary' },
        { label: 'Wait — no action', variant: 'tertiary' },
      ],
    },
    tasks: [],
    notes: '',
    timeline: [
      {
        id: 'ev-1',
        icon: '💬',
        time: 'Today · 3h ago · WhatsApp 305',
        title: '"Got the term sheet, will review tonight"',
        body: 'He received the 500 Bailey term sheet you sent. Reviewing it tonight.',
      },
      {
        id: 'ev-2',
        icon: '📋',
        time: 'Today · 4h ago',
        title: '500 Bailey term sheet sent',
        body: 'PDF sent via WhatsApp 305.',
      },
      {
        id: 'ev-3',
        icon: '💬',
        time: '3 days ago · WhatsApp 305',
        title: 'Introduction — David Cohen',
        body: 'Mendy introduced you to David Cohen. "He has money to put in Florida, call him."',
      },
    ],
    tabCounts: { timeline: 18, emails: 3, whatsapp: 14, calls: 1, meetings: 0, tasks: 0 },
  },
  {
    id: 'mock-levi-biton',
    pipedriveContactId: null,
    name: 'Levi Izhak Biton',
    phone: '+1 (718) 555-0281',
    email: null,
    company: null,
    lastContactAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    lastContactChannel: '5 days ago · WhatsApp 718 (outbound)',
    lastContactMessage: '"Let\'s talk Q3 — I have a window opening up"',
    taggedDaysAgo: 45,
    tier: 'D',
    role: 'principal',
    activeDealsCount: 0,
    lastMeetingAgo: 'No meetings yet',
    summary:
      'Levi is a private investor from Brooklyn. He said he will have capital available in Q3 2026.\n\n' +
      'No specific deal has been pitched yet. He expressed general interest in commercial Florida real estate.\n\n' +
      'He uses WhatsApp on the 718 line only. Response time is typically 1–2 days.',
    recommendation: {
      headline: 'Ping him in 3 weeks when Q3 starts.',
      detail:
        "He said his window opens in Q3. It is now early May — reach out in late June or early July with a deal that fits his profile.",
      actions: [
        { label: 'Schedule reminder', variant: 'primary' },
        { label: 'Wait — no action', variant: 'tertiary' },
      ],
    },
    tasks: [],
    notes: '',
    timeline: [
      {
        id: 'ev-1',
        icon: '💬',
        time: '5 days ago · WhatsApp 718',
        title: '"Let\'s talk Q3"',
        body: 'He replied to your follow-up. Expressed interest for Q3.',
      },
      {
        id: 'ev-2',
        icon: '💬',
        time: '3 weeks ago · WhatsApp 718',
        title: 'Initial contact',
        body: 'Met at a Brooklyn event. Added as investor contact.',
      },
    ],
    tabCounts: { timeline: 7, emails: 0, whatsapp: 6, calls: 0, meetings: 0, tasks: 0 },
  },
]

export function mockProfileForName(name: string | null): InvestorProfileData {
  if (name) {
    const lower = name.toLowerCase()
    const match = MOCK_INVESTORS.find((m) => m.name.toLowerCase() === lower)
    if (match) return match
  }
  return MOCK_INVESTORS[0]
}

/**
 * Build a profile from a real DashboardThread row (e.g. a stub investor with
 * just a Pipedrive id, name, and tier). Falls back to a matching mock if the
 * name happens to match (for David / Mendy / Levi narratives), otherwise
 * returns a minimal real-data record so the panel can render.
 */
export function profileFromThread(thread: {
  contact_name: string | null
  phone: string
  pipedrive_contact_id: number | null
  investor_tier: 'A' | 'B' | 'C' | 'D' | null
  investor_role: 'principal' | 'connector' | null
}): InvestorProfileData {
  // If we have a matching mock by name, prefer its rich content but graft real ids/tier.
  const mock = thread.contact_name
    ? MOCK_INVESTORS.find((m) => m.name.toLowerCase() === thread.contact_name!.toLowerCase())
    : null
  if (mock) {
    return {
      ...mock,
      pipedriveContactId: thread.pipedrive_contact_id ?? mock.pipedriveContactId,
      tier: thread.investor_tier ?? mock.tier,
      role: thread.investor_role ?? mock.role,
    }
  }
  // Real stub — minimal record with no AI summary or recommendation yet.
  return {
    id: `pipedrive:${thread.pipedrive_contact_id ?? 'unknown'}`,
    pipedriveContactId: thread.pipedrive_contact_id,
    name: thread.contact_name || thread.phone || 'Unknown',
    phone: thread.phone,
    email: null,
    company: null,
    lastContactAt: null,
    lastContactChannel: null,
    lastContactMessage: null,
    taggedDaysAgo: null,
    tier: thread.investor_tier,
    role: thread.investor_role,
    activeDealsCount: 0,
    lastMeetingAgo: null,
    summary: null,
    recommendation: null,
    tasks: [],
    notes: '',
    timeline: [],
    tabCounts: { timeline: 0, emails: 0, whatsapp: 0, calls: 0, meetings: 0, tasks: 0 },
  }
}

// ── Styles (inline constants) ─────────────────────────────────────────────────

const TEXT = '#F5EFD8'

type Tab = 'timeline' | 'emails' | 'whatsapp' | 'calls' | 'meetings' | 'tasks'

const TABS: { key: Tab; label: string }[] = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'emails', label: 'Emails' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'calls', label: 'Calls' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'tasks', label: 'Tasks' },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  data: InvestorProfileData
  onClose: () => void
}

export default function InvestorProfile({ data, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('timeline')
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [notes, setNotes] = useState(data.notes)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (reminderOpen) setReminderOpen(false)
        else onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, reminderOpen])

  useEffect(() => {
    setNotes(data.notes)
    setActiveTab('timeline')
    setTimelineOpen(false)
  }, [data.id, data.notes])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const openTasks = data.tasks.filter((t) => t.status === 'open').length
  const doneTasks = data.tasks.filter((t) => t.status === 'done').length

  const openReminder = () => setReminderOpen(true)
  const onReminderSaved = (when: string) => {
    setReminderOpen(false)
    setToast(`Reminder set for ${when}.`)
  }

  const panel = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 200,
        }}
      />

      {/* Slide-in */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '70%',
          background: NAVY,
          borderLeft: `2px solid ${GOLD}`,
          boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
          overflowY: 'auto',
          zIndex: 201,
          fontFamily: "'Poppins', sans-serif",
          color: TEXT,
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: '22px 32px 18px',
            borderBottom: `1px solid ${gold[25]}`,
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            title="Close (Esc)"
            style={{
              position: 'absolute',
              top: 16,
              right: 24,
              background: 'transparent',
              border: `0.5px solid ${gold[45]}`,
              color: GOLD,
              fontSize: 22,
              cursor: 'pointer',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >
            ✕
          </button>

          {/* Top row: name + tier badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, paddingRight: 56 /* room for ✕ button */ }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  display: 'inline-block',
                  fontSize: 9,
                  letterSpacing: '0.30em',
                  color: GOLD,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  border: `0.5px solid ${GOLD}`,
                  padding: '3px 10px',
                  marginBottom: 12,
                }}
              >
                ★ Investor
              </div>

              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 44,
                  color: GOLD,
                  fontWeight: 600,
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                }}
              >
                {data.name}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.65)',
                  marginTop: 8,
                  display: 'flex',
                  gap: 18,
                  flexWrap: 'wrap',
                }}
              >
                {data.phone && <span>📞 {data.phone}</span>}
                {data.email && <span>✉ {data.email}</span>}
                {data.company && <span>🏢 {data.company}</span>}
              </div>
            </div>

            {/* Tier badge — large pill */}
            {(data.tier || data.role) && (
              <div
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  border: `1px solid ${GOLD}`,
                  background: 'transparent',
                  color: GOLD,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  borderRadius: 999,
                }}
                aria-label="Investor tier"
              >
                {data.tier ? `Tier ${data.tier}` : 'Tier ?'}
                <span style={{ opacity: 0.55, fontWeight: 400 }}>·</span>
                {data.role ?? 'Investor'}
              </div>
            )}
          </div>

          {/* Stats row — three blocks side by side */}
          <div
            style={{
              marginTop: 18,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            <StatBlock
              label="Active deals"
              value={
                data.activeDealsCount > 0
                  ? `${data.activeDealsCount} active deal${data.activeDealsCount === 1 ? '' : 's'}`
                  : 'No open deals'
              }
            />
            <StatBlock label="Last meeting" value={data.lastMeetingAgo ?? 'No meetings yet'} />
            <StatBlock
              label="Tagged"
              value={
                data.taggedDaysAgo === null
                  ? 'Newly tagged'
                  : data.taggedDaysAgo === 0
                  ? 'Today'
                  : `${data.taggedDaysAgo} day${data.taggedDaysAgo === 1 ? '' : 's'} ago`
              }
            />
          </div>

          {/* Header Quick Actions — three big buttons */}
          <div
            style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            <HeaderActionButton
              label="💬 WhatsApp"
              onClick={() => setToast('Opening WhatsApp — ' + data.name + '…')}
            />
            <HeaderActionButton
              label="📞 Call"
              onClick={() => setToast('Calling ' + data.name + '…')}
            />
            <HeaderActionButton label="📅 Schedule" onClick={openReminder} />
          </div>
        </div>

        {/* ── Tabs ── */}
        <div
          style={{
            display: 'flex',
            borderBottom: `1px solid ${gold[18]}`,
            padding: '0 32px',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '14px 18px',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: activeTab === t.key ? GOLD : `rgba(255,204,51,0.5)`,
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === t.key ? `2px solid ${GOLD}` : '2px solid transparent',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {t.label}
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  background: gold[15],
                  padding: '2px 6px',
                  borderRadius: 8,
                }}
              >
                {data.tabCounts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {/* ── Hero: last comm + summary ── */}
        <div
          style={{
            padding: '24px 32px 20px',
            background:
              'linear-gradient(180deg, rgba(14,52,112,0.5) 0%, rgba(7,16,30,0) 100%)',
            borderBottom: `1px solid ${gold[18]}`,
          }}
        >
          {data.lastContactMessage && (
            <div
              style={{
                borderLeft: `2px solid ${GOLD}`,
                padding: '4px 0 4px 14px',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: '0.30em',
                  color: gold[55],
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  marginBottom: 4,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Last communication</span>
                <SpeakerButton
                  text={`Last communication: ${data.lastContactMessage}`}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: `rgba(255,204,51,0.85)`,
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {data.lastContactChannel}
                </span>
                <span style={{ fontSize: 15, color: GOLD, fontWeight: 500 }}>
                  {data.lastContactMessage}
                </span>
              </div>
            </div>
          )}

          {data.summary && (
            <div
              style={{
                background: `linear-gradient(180deg, ${CREAM_TOP} 0%, ${CREAM_BOTTOM} 100%)`,
                color: NAVY,
                padding: '22px 26px',
                border: `0.5px solid ${gold[45]}`,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: '0.30em',
                  color: navy.labelOnCream,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>Summary · Opus 4.7</span>
                <SpeakerButton text={data.summary} />
              </div>
              <div
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 15,
                  lineHeight: 1.75,
                  fontWeight: 400,
                  color: NAVY,
                  whiteSpace: 'pre-line',
                }}
              >
                {data.summary}
              </div>
            </div>
          )}
        </div>

        {/* ── Active zone: rec card + tasks ── */}
        <div
          style={{
            padding: '8px 32px 20px',
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gap: 18,
            borderBottom: `1px solid ${gold[15]}`,
          }}
        >
          {/* Rec card */}
          {data.recommendation && (
            <div
              style={{
                background: gold[6],
                border: `1px solid ${gold[45]}`,
                padding: '20px 24px',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.30em',
                  color: GOLD,
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>⚡ What to do next</span>
                <SpeakerButton
                  text={`${data.recommendation.headline} ${data.recommendation.detail}`}
                />
              </div>
              <div
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 21,
                  color: GOLD,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  letterSpacing: '-0.005em',
                  marginBottom: 12,
                }}
              >
                {data.recommendation.headline}
              </div>
              <div
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 14,
                  color: '#e8e8e8',
                  lineHeight: 1.75,
                  fontWeight: 400,
                  marginBottom: 16,
                  whiteSpace: 'pre-line',
                }}
              >
                {data.recommendation.detail}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {data.recommendation.actions.map((a, i) => {
                  const isPrimary = a.variant === 'primary'
                  const isSecondary = a.variant === 'secondary'
                  const isReminder = /reminder/i.test(a.label)
                  const isWait = /^wait/i.test(a.label)
                  const onClick = isReminder
                    ? openReminder
                    : isWait
                    ? () => setToast('No action queued. Recommendation parked.')
                    : () => setToast(`Action: ${a.label}`)
                  return (
                    <button
                      key={i}
                      onClick={onClick}
                      style={{
                        background: isPrimary ? GOLD : 'transparent',
                        color: isPrimary ? NAVY : isSecondary ? GOLD : gold[55],
                        border: isPrimary
                          ? 'none'
                          : isSecondary
                          ? `0.5px solid ${GOLD}`
                          : `0.5px solid ${gold[45]}`,
                        padding: '11px 18px',
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: 12,
                        fontWeight: isPrimary ? 700 : 600,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                    >
                      {a.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tasks panel */}
          <div
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: `0.5px solid ${gold[25]}`,
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.30em',
                color: GOLD,
                textTransform: 'uppercase',
                fontWeight: 700,
                marginBottom: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <span>⚡ Tasks</span>
              <span
                style={{
                  fontSize: 10,
                  color: gold[55],
                  letterSpacing: '0.10em',
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                {openTasks} open · {doneTasks} done
              </span>
            </div>

            {data.tasks.length === 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: gold[55],
                  padding: '16px 4px',
                  textAlign: 'center',
                  border: `0.5px dashed ${gold[18]}`,
                  marginTop: 8,
                }}
              >
                No open tasks for {data.name.split(' ')[0]}.
              </div>
            )}

            {data.tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  border: `0.5px solid ${task.daysLate ? `rgba(255,204,51,0.85)` : gold[18]}`,
                  background: task.daysLate ? gold[6] : 'transparent',
                  padding: '12px 14px',
                  marginBottom: 8,
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.20em',
                      fontWeight: 700,
                      padding: '2px 8px',
                      textTransform: 'uppercase',
                      background:
                        task.status === 'open'
                          ? gold[15]
                          : 'rgba(40,167,69,0.18)',
                      color: task.status === 'open' ? GOLD : '#6ee7b7',
                    }}
                  >
                    {task.status.toUpperCase()}
                  </span>
                  {task.daysLate && (
                    <span style={{ fontSize: 11, color: `rgba(255,204,51,0.85)` }}>
                      ⚠ {task.daysLate} days late
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{task.title}</div>
                <div style={{ fontSize: 11, color: gold[55], marginBottom: 8 }}>
                  {task.meta}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    style={{
                      background: GOLD,
                      color: NAVY,
                      fontWeight: 600,
                      border: 'none',
                      fontSize: 10,
                      padding: '5px 10px',
                      cursor: 'pointer',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Remind
                  </button>
                  <button
                    style={{
                      background: 'transparent',
                      color: GOLD,
                      border: `0.5px solid ${gold[45]}`,
                      fontSize: 10,
                      padding: '5px 10px',
                      cursor: 'pointer',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Mark done
                  </button>
                </div>
              </div>
            ))}

            <button
              style={{
                marginTop: data.tasks.length === 0 ? 12 : 'auto' as unknown as number,
                background: 'transparent',
                color: GOLD,
                border: `0.5px dashed ${gold[45]}`,
                padding: '10px 14px',
                fontFamily: "'Poppins', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              + New task to team
            </button>
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div
          style={{
            padding: '18px 32px',
            borderBottom: `1px solid ${gold[15]}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.30em',
              color: gold[55],
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            Quick actions
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['💬 Send WhatsApp', '✉ Send Email', '📅 Schedule Meeting', '📝 Add Note to Pipedrive'].map(
              (label) => (
                <button
                  key={label}
                  style={{
                    flex: '1 1 auto',
                    minWidth: 180,
                    background: 'transparent',
                    border: `0.5px solid ${gold[45]}`,
                    color: GOLD,
                    padding: '12px 14px',
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              )
            )}
            <button
              style={{
                flex: '1 1 auto',
                minWidth: 180,
                background: 'transparent',
                border: '0.5px solid rgba(255,107,107,0.4)',
                color: '#ff6b6b',
                padding: '12px 14px',
                fontFamily: "'Poppins', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              🚫 Block / Mark Spam
            </button>
          </div>
        </div>

        {/* ── Notes ── */}
        <div
          style={{
            padding: '18px 32px 20px',
            borderBottom: `1px solid ${gold[15]}`,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.30em',
              color: GOLD,
              textTransform: 'uppercase',
              fontWeight: 700,
              marginBottom: 10,
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
            }}
          >
            📝 Your notes
            <span
              style={{
                fontSize: 10,
                color: gold[55],
                fontWeight: 400,
                letterSpacing: '0.04em',
                textTransform: 'none',
              }}
            >
              Only you see these
            </span>
          </div>
          <textarea
            className="rp-investor-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = GOLD
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 204, 51, 0.25)'
            }}
            placeholder={`Type your own notes about ${data.name.split(' ')[0]} here. Auto-saves as you type.`}
            style={{
              width: '100%',
              minHeight: 100,
              // Faint gold tint on dark backdrop — readable on the navy panel
              background: 'rgba(255, 204, 51, 0.04)',
              border: '1px solid rgba(255, 204, 51, 0.25)',
              color: GOLD,
              padding: '12px 14px',
              fontFamily: "'Poppins', sans-serif",
              fontSize: 13,
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              caretColor: GOLD,
            }}
          />
        </div>

        {/* ── Timeline ── */}
        <div style={{ padding: '18px 32px 32px' }}>
          <div
            onClick={() => setTimelineOpen((prev) => !prev)}
            style={{
              cursor: 'pointer',
              padding: '12px 16px',
              border: `0.5px dashed ${gold[35]}`,
              color: gold[55],
              fontSize: 11,
              letterSpacing: '0.10em',
              marginBottom: timelineOpen ? 14 : 0,
            }}
          >
            {timelineOpen ? '▲' : '▾'} Full timeline · {data.tabCounts.timeline} events across all
            channels · click to {timelineOpen ? 'collapse' : 'expand'}
          </div>

          {timelineOpen && (
            <div>
              {data.timeline.map((event) => (
                <div
                  key={event.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr',
                    gap: 12,
                    padding: '14px 0',
                    borderBottom: `0.5px solid ${gold[8]}`,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      border: `0.5px solid ${gold[45]}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                    }}
                  >
                    {event.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: gold[55],
                        letterSpacing: '0.04em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      {event.time}
                      <SpeakerButton text={`${event.title}. ${event.body}`} />
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        margin: '2px 0 4px',
                        color: GOLD,
                      }}
                    >
                      {event.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.75)',
                        lineHeight: 1.5,
                      }}
                    >
                      {event.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {reminderOpen && (
        <ScheduleReminderModal
          contactId={data.pipedriveContactId}
          contactName={data.name}
          onClose={() => setReminderOpen(false)}
          onSaved={onReminderSaved}
        />
      )}
      {toast && <Toast text={toast} onDismiss={() => setToast(null)} />}
    </>
  )

  if (typeof document === 'undefined') return null
  return createPortal(panel, document.body)
}

// ── Header sub-components ─────────────────────────────────────────────────────

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.25)',
        border: `0.5px solid ${gold[18]}`,
        padding: '10px 14px',
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: '0.20em',
          color: gold[55],
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, color: GOLD, fontWeight: 600, lineHeight: 1.3 }}>
        {value}
      </div>
    </div>
  )
}

function HeaderActionButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: `0.5px solid ${gold[45]}`,
        color: GOLD,
        padding: '12px 14px',
        fontFamily: "'Poppins', sans-serif",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,204,51,0.10)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {label}
    </button>
  )
}

// ── Schedule Reminder Modal ───────────────────────────────────────────────────

function ScheduleReminderModal({
  contactId,
  contactName,
  onClose,
  onSaved,
}: {
  contactId: number | null
  contactName: string
  onClose: () => void
  onSaved: (when: string) => void
}) {
  // Default to tomorrow 9 AM local
  const tomorrow9 = new Date()
  tomorrow9.setDate(tomorrow9.getDate() + 1)
  tomorrow9.setHours(9, 0, 0, 0)
  const defaultDate = tomorrow9.toISOString().slice(0, 10)
  const defaultTime = '09:00'

  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState(defaultTime)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (!date || !time) {
      setError('Pick a date and time.')
      return
    }
    if (contactId == null) {
      // Mock contacts (no Pipedrive id) — just show the toast without writing
      onSaved(`${date} at ${time}`)
      return
    }
    setSubmitting(true)
    try {
      const remindAt = new Date(`${date}T${time}:00`).toISOString()
      const r = await fetch('/api/investors/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipedrive_contact_id: contactId,
          contact_name: contactName,
          remind_at: remindAt,
          note: note.trim() || undefined,
        }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        setError(j?.detail || j?.error || `Server returned ${r.status}`)
        setSubmitting(false)
        return
      }
      onSaved(`${date} at ${time}`)
    } catch (err) {
      setError((err as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div
        style={{
          width: 440,
          maxWidth: 'calc(100vw - 32px)',
          background: NAVY,
          border: `1px solid ${GOLD}`,
          color: '#F5EFD8',
          padding: 28,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Schedule reminder"
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.30em',
            color: GOLD,
            fontWeight: 700,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          📅 Schedule Reminder
        </div>
        <div style={{ fontSize: 16, color: GOLD, fontWeight: 600, marginBottom: 14 }}>
          Reminder for {contactName}
        </div>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: gold[55], marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.10em' }}>
            Date
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'rgba(255,204,51,0.04)',
              border: `1px solid ${gold[35]}`,
              color: GOLD,
              fontFamily: 'inherit',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: gold[55], marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.10em' }}>
            Time
          </div>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'rgba(255,204,51,0.04)',
              border: `1px solid ${gold[35]}`,
              color: GOLD,
              fontFamily: 'inherit',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: gold[55], marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.10em' }}>
            Note <span style={{ opacity: 0.6 }}>(optional)</span>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`e.g. "Follow up on Q3 capital window"`}
            className="rp-investor-notes"
            style={{
              width: '100%',
              minHeight: 70,
              padding: '10px 12px',
              background: 'rgba(255,204,51,0.04)',
              border: `1px solid ${gold[35]}`,
              color: GOLD,
              fontFamily: 'inherit',
              fontSize: 13,
              lineHeight: 1.5,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              caretColor: GOLD,
            }}
          />
        </label>

        {error && (
          <div
            style={{
              fontSize: 12,
              color: '#ff8b8b',
              marginBottom: 12,
              padding: '8px 12px',
              background: 'rgba(255,107,107,0.10)',
              border: '0.5px solid rgba(255,107,107,0.40)',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: `0.5px solid ${gold[45]}`,
              color: gold[55],
              padding: '10px 18px',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              cursor: submitting ? 'wait' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              background: GOLD,
              border: 'none',
              color: NAVY,
              padding: '10px 18px',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Saving…' : 'Set Reminder'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        zIndex: 230,
        background: NAVY,
        border: `1px solid ${GOLD}`,
        color: GOLD,
        padding: '14px 22px',
        fontFamily: "'Poppins', sans-serif",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        boxShadow: '0 4px 18px rgba(0,0,0,0.5)',
        maxWidth: 360,
      }}
      role="status"
    >
      {text}
    </div>
  )
}
