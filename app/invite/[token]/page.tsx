import type { Metadata } from 'next'
import { Cinzel, EB_Garamond, Playfair_Display } from 'next/font/google'
import { createServiceClient } from '@/lib/supabase/server'
import { getBusyTimes, slotOverlapsBusy } from '@/lib/google/calendar'

// Locked brand fonts per dashboard/_terminal-design-reference/brand/TerminalLogo.jsx
// and 01_Screen1_OG_Card.html. Loaded via next/font for self-hosting + zero CLS.
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--rp-font-cinzel',
  display: 'swap',
})
const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400'],
  style: ['italic'],
  variable: '--rp-font-eb-garamond',
  display: 'swap',
})
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--rp-font-playfair',
  display: 'swap',
})

// Locked brand tokens — sourced from dashboard/lib/design-tokens.ts.
const NAVY = '#0E3470'
const GOLD = '#FFCC33'
const GOLD_RGB = '255, 204, 51'
const BRONZE_BOLD = '#5A3F18'
const BRONZE_SOFT = '#7A5A30'

const FONT_NAME = `var(--rp-font-playfair), 'Playfair Display', Georgia, serif`
const FONT_TERMINAL = `var(--rp-font-cinzel), Cinzel, 'Trajan Pro', Georgia, serif`
const FONT_BY = `var(--rp-font-eb-garamond), 'EB Garamond', Garamond, Georgia, serif`
const FONT_BODY = `'Poppins', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif`

interface SlotGroup {
  date: string
  label: string
  times: Array<{ iso: string; display: string }>
}

interface Invitation {
  contact_first_name: string | null
  contact_name: string | null
  proposed_slots: Array<{ iso: string; display: string }>
  status: 'sent' | 'confirmed' | 'expired' | 'cancelled'
  expires_at: string | null
  meeting_type: 'terminal' | 'meeting' | null
  view_count: number | null
  first_opened_at: string | null
  confirmed_slot_iso: string | null
  zoom_meeting_id: string | null
  zoom_join_url: string | null
  zoom_passcode: string | null
  calendar_event_id: string | null
}

async function loadInvitation(token: string): Promise<{ invitation: Invitation | null; reason: 'not_found' | 'expired' | 'cancelled' | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('invitations')
    .select('contact_first_name, contact_name, proposed_slots, status, expires_at, meeting_type, view_count, first_opened_at, confirmed_slot_iso, zoom_meeting_id, zoom_join_url, zoom_passcode, calendar_event_id')
    .eq('id', token)
    .maybeSingle()
  if (error || !data) return { invitation: null, reason: 'not_found' }
  const inv = data as Invitation
  if (inv.status === 'cancelled') return { invitation: inv, reason: 'cancelled' }
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
    return { invitation: inv, reason: 'expired' }
  }
  // Track this open — fire and move on (non-blocking)
  void supabase.from('invitations').update({
    view_count: (inv.view_count ?? 0) + 1,
    first_opened_at: inv.first_opened_at ?? new Date().toISOString(),
    last_opened_at: new Date().toISOString(),
  }).eq('id', token)
  return { invitation: inv, reason: null }
}

async function loadAvailableSlots(): Promise<SlotGroup[]> {
  try {
    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://project-7e87w.vercel.app'
    ).replace(/\/$/, '')
    const res = await fetch(`${baseUrl}/api/bookings/available-slots`, { cache: 'no-store' })
    if (!res.ok) return []
    const json = (await res.json()) as { slots?: SlotGroup[] }
    return json.slots ?? []
  } catch {
    return []
  }
}

function groupProposedSlotsByDate(slots: Array<{ iso: string; display: string }>): SlotGroup[] {
  const TZ = 'America/Chicago'
  const dateFmt = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ,
  })
  const labelFmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ,
  })
  const byDate = new Map<string, SlotGroup>()
  for (const slot of slots) {
    const d = new Date(slot.iso)
    if (isNaN(d.getTime())) continue
    const dateStr = dateFmt.format(d)
    if (!byDate.has(dateStr)) {
      byDate.set(dateStr, { date: dateStr, label: labelFmt.format(d), times: [] })
    }
    byDate.get(dateStr)!.times.push(slot)
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/** Render a Zoom URL into a short label (zoom.us/j/...) without the full path. */
function shortZoomUrl(url: string): string {
  try {
    const u = new URL(url)
    const segs = u.pathname.split('/').filter(Boolean)
    return `${u.hostname.replace(/^www\./, '')}/${segs[0] ?? ''}/…`
  } catch {
    return 'zoom.us/j/…'
  }
}

/** Format Zoom meeting ID into "###  ####  ####" groups. */
function formatMeetingId(id: string | null | undefined): string | null {
  if (!id) return null
  const digits = id.replace(/\D/g, '')
  if (digits.length < 9) return id
  // Common 10-11 digit Zoom IDs render as "###-####-####" or "###  ####  ####"
  if (digits.length === 10) return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`
  if (digits.length === 11) return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`
  return digits
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://project-7e87w.vercel.app').replace(/\/$/, '')

  const supabase = createServiceClient()
  const { data: inv } = await supabase
    .from('invitations')
    .select('contact_first_name, contact_name')
    .eq('id', token)
    .maybeSingle()

  const displayName = inv?.contact_name || inv?.contact_first_name || 'Guest'
  const title = `Terminal Introduction — ${displayName}`
  const description = 'Select a time. One click confirms.'
  const imageUrl = `${appUrl}/invite/${token}/opengraph-image`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: 'Terminal Introduction — RePrime Group' }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, images: [imageUrl] },
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Reusable subcomponents
// ────────────────────────────────────────────────────────────────────────────

function GoldSpindle() {
  return (
    <div style={{ height: '7px', width: '70%', margin: '0 auto' }}>
      <svg viewBox="0 0 460 7" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="r-spindle" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"  stopColor={GOLD} stopOpacity={0} />
            <stop offset="6%"  stopColor={GOLD} stopOpacity={1} />
            <stop offset="94%" stopColor={GOLD} stopOpacity={1} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect x="0" y="2.5" width="460" height="2" fill="url(#r-spindle)" />
      </svg>
    </div>
  )
}

function TerminalHeader() {
  return (
    <div style={{ padding: '22px 32px 18px', textAlign: 'center', borderBottom: `1px solid rgba(${GOLD_RGB}, 0.18)` }}>
      <GoldSpindle />
      <div style={{
        fontFamily: FONT_TERMINAL,
        fontSize: '26px',
        letterSpacing: '0.145em',
        textIndent: '0.145em',
        color: GOLD,
        fontWeight: 600,
        margin: '11px 0',
        textTransform: 'uppercase',
      }}>
        Terminal
      </div>
      <GoldSpindle />
    </div>
  )
}

function TerminalFooter() {
  return (
    <div style={{
      padding: '18px 32px',
      borderTop: `1px solid rgba(${GOLD_RGB}, 0.18)`,
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: FONT_NAME,
        fontSize: '14px',
        color: GOLD,
        fontWeight: 600,
        letterSpacing: '0.10em',
        textIndent: '0.10em',
      }}>
        TERMINAL
      </div>
      <div style={{
        fontFamily: FONT_BY,
        fontStyle: 'italic',
        fontSize: '11px',
        color: GOLD,
        marginTop: '3px',
        opacity: 0.75,
      }}>
        by RePrime
      </div>
      <div style={{
        fontFamily: FONT_BODY,
        fontSize: '8px',
        color: GOLD,
        marginTop: '10px',
        letterSpacing: '0.06em',
        opacity: 0.55,
      }}>
        This invitation was sent personally. Reply directly to Gideon.
      </div>
    </div>
  )
}

function PageShell({ children, fontClasses }: { children: React.ReactNode, fontClasses: string }) {
  return (
    <main className={fontClasses} style={{
      minHeight: '100vh',
      background: '#DDD9D2',
      padding: '24px 16px',
      display: 'flex',
      justifyContent: 'center',
      fontFamily: FONT_BODY,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 460,
        background: NAVY,
        border: `1px solid rgba(${GOLD_RGB}, 0.22)`,
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </main>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────────────

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { invitation, reason } = await loadInvitation(token)

  const fontClasses = `${cinzel.variable} ${ebGaramond.variable} ${playfair.variable}`

  // ── Hard-failure states ────────────────────────────────────────────────────
  if (!invitation || reason) {
    const message =
      reason === 'cancelled' ? 'This invitation was cancelled.'
      : reason === 'expired' ? 'This invitation has expired.'
      : 'This invitation link is not valid.'
    return (
      <PageShell fontClasses={fontClasses}>
        <TerminalHeader />
        <div style={{ padding: '40px 32px 32px', textAlign: 'center' }}>
          <p style={{ color: GOLD, fontSize: '15px', letterSpacing: '0.02em', fontStyle: 'italic', fontFamily: FONT_NAME }}>
            {message}
          </p>
          <p style={{ color: `rgba(${GOLD_RGB}, 0.70)`, fontSize: '12px', marginTop: '14px', fontFamily: FONT_NAME, fontStyle: 'italic' }}>
            Reply to the original message and I&apos;ll sort it out.
          </p>
        </div>
        <TerminalFooter />
      </PageShell>
    )
  }

  const displayName = invitation.contact_name || invitation.contact_first_name || 'Guest'
  const firstName = invitation.contact_first_name || displayName.split(' ')[0] || 'there'
  const isTerminal = invitation.meeting_type !== 'meeting'

  // ── CONFIRMED state → Screen 3 (cream letter + meeting details) ───────────
  if (invitation.status === 'confirmed' && invitation.confirmed_slot_iso) {
    const slotDate = new Date(invitation.confirmed_slot_iso)
    const TZ = 'America/Chicago'
    const dayLine = new Intl.DateTimeFormat('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ,
    }).format(slotDate)
    const timeLine = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', timeZone: TZ,
    }).format(slotDate) + ' Central'

    const zoomUrl = invitation.zoom_join_url
    const meetingIdFormatted = formatMeetingId(invitation.zoom_meeting_id)
    const zoomShort = zoomUrl ? shortZoomUrl(zoomUrl) : null

    return (
      <PageShell fontClasses={fontClasses}>
        <TerminalHeader />

        {/* CREAM LETTER BUBBLE */}
        <div style={{ padding: '18px 12px 14px' }}>
          <div style={{ position: 'relative' }}>
            <svg viewBox="0 0 480 460" width="100%" style={{ display: 'block', filter: 'drop-shadow(0 4px 14px rgba(0, 0, 0, 0.22))' }}>
              <defs>
                <linearGradient id="bubble-bg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F8F0DA" />
                  <stop offset="100%" stopColor="#EFE2C4" />
                </linearGradient>
              </defs>
              <path
                d="M 18,28 L 215,28 C 222,28 234,2 240,1 C 246,2 258,28 265,28 L 462,28 Q 480,28 480,46 L 480,442 Q 480,460 462,460 L 18,460 Q 0,460 0,442 L 0,46 Q 0,28 18,28 Z"
                fill="url(#bubble-bg)"
                stroke={`rgba(${GOLD_RGB}, 0.30)`}
                strokeWidth="1"
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: '6%',
              left: '6%',
              right: '6%',
              bottom: '4%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: FONT_NAME,
                fontSize: '17px',
                color: BRONZE_SOFT,
                fontStyle: 'italic',
                marginBottom: '16px',
                lineHeight: 1.4,
              }}>
                A confirmation from <span style={{ fontWeight: 600, color: BRONZE_BOLD }}>Gideon Gratsiani</span>
              </div>
              <div style={{
                fontFamily: FONT_NAME,
                fontSize: '30px',
                color: BRONZE_BOLD,
                fontWeight: 600,
                fontStyle: 'italic',
                marginBottom: '12px',
              }}>
                {firstName} —
              </div>
              <div style={{
                fontFamily: FONT_NAME,
                fontSize: '21px',
                color: NAVY,
                lineHeight: 1.55,
                fontStyle: 'italic',
              }}>
                Your {isTerminal ? 'introduction' : 'meeting'} is set.
              </div>
              <div style={{
                fontFamily: FONT_NAME,
                fontSize: '28px',
                color: NAVY,
                fontWeight: 600,
                margin: '16px 0 4px',
                letterSpacing: '-0.01em',
                lineHeight: 1.15,
              }}>
                {dayLine}
              </div>
              <div style={{
                fontFamily: FONT_NAME,
                fontSize: '28px',
                color: NAVY,
                fontWeight: 600,
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
              }}>
                {timeLine}
              </div>
              <div style={{
                fontFamily: FONT_NAME,
                fontSize: '19px',
                color: NAVY,
                lineHeight: 1.5,
                fontStyle: 'italic',
                marginTop: '18px',
              }}>
                Looking forward to showing you what I&apos;ve been building.
              </div>
              <div style={{
                fontFamily: FONT_NAME,
                fontSize: '22px',
                color: BRONZE_BOLD,
                fontStyle: 'italic',
                fontWeight: 600,
                marginTop: '14px',
              }}>
                — Gideon
              </div>
            </div>
          </div>
        </div>

        {/* ADD ATTENDEE — form posts to existing /api/invitations/add-attendee */}
        <div style={{ padding: '8px 28px 18px' }}>
          <div style={{
            fontFamily: FONT_NAME,
            fontSize: '24px',
            color: GOLD,
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: '8px',
          }}>
            Add Attendee
          </div>
          <div style={{
            fontFamily: FONT_NAME,
            fontStyle: 'italic',
            fontSize: '15px',
            color: `rgba(${GOLD_RGB}, 0.70)`,
            textAlign: 'center',
            marginBottom: '14px',
            lineHeight: 1.4,
          }}>
            Want to bring a colleague? Add their email — separate multiple addresses with a comma.
          </div>
          <form action={`/api/invitations/add-attendee`} method="POST">
            <input type="hidden" name="token" value={token} />
            <input
              name="emails"
              type="text"
              required
              placeholder="name@firm.com, another@firm.com"
              style={{
                width: '100%',
                background: `rgba(${GOLD_RGB}, 0.06)`,
                border: `1px solid rgba(${GOLD_RGB}, 0.40)`,
                padding: '14px 16px',
                color: GOLD,
                fontFamily: FONT_NAME,
                fontSize: '17px',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
              <button type="submit" style={{
                fontFamily: FONT_BODY,
                fontSize: '15px',
                color: NAVY,
                fontWeight: 700,
                background: GOLD,
                border: 'none',
                padding: '10px 22px',
                borderRadius: '4px',
                cursor: 'pointer',
                letterSpacing: '0.02em',
              }}>
                Send Invitation →
              </button>
            </div>
          </form>
        </div>

        {/* CALENDAR ADD */}
        <div style={{ padding: '0 32px 18px' }}>
          <div style={{
            fontFamily: FONT_BODY,
            fontSize: '14px',
            letterSpacing: '0.24em',
            textIndent: '0.24em',
            color: GOLD,
            textTransform: 'uppercase',
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: '14px',
            opacity: 0.80,
          }}>
            Add to your calendar
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            <a href={`/invite/${token}/calendar?provider=apple`} style={calBtnStyle}>Apple</a>
            <a href={`/invite/${token}/calendar?provider=google`} style={calBtnStyle}>Google</a>
            <a href={`/invite/${token}/calendar?provider=outlook`} style={calBtnStyle}>Outlook</a>
          </div>
        </div>

        {/* MEETING DETAILS */}
        {zoomUrl && (
          <div style={{ padding: '0 32px 18px' }}>
            <div style={{
              fontFamily: FONT_BODY,
              fontSize: '9px',
              letterSpacing: '0.24em',
              textIndent: '0.24em',
              color: GOLD,
              textTransform: 'uppercase',
              fontWeight: 600,
              textAlign: 'center',
              marginBottom: '11px',
              opacity: 0.7,
            }}>
              Meeting Details
            </div>
            <div style={{ borderTop: `0.5px solid rgba(${GOLD_RGB}, 0.18)`, paddingTop: '8px' }}>
              <MdRow keyText="Zoom" valText={zoomShort ?? 'zoom.us/j/…'} href={zoomUrl} />
              {meetingIdFormatted && <MdRow keyText="Meeting ID" valText={meetingIdFormatted} />}
              {invitation.zoom_passcode && <MdRow keyText="Passcode" valText={invitation.zoom_passcode} />}
            </div>
          </div>
        )}

        {/* JOIN ZOOM (big tap target) */}
        {zoomUrl && (
          <div style={{ padding: '0 32px 22px', textAlign: 'center' }}>
            <a
              href={zoomUrl}
              style={{
                display: 'inline-block',
                padding: '0.95rem 2rem',
                background: GOLD,
                color: NAVY,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
                fontFamily: FONT_BODY,
                letterSpacing: '0.02em',
                borderRadius: '2px',
              }}
            >
              Join Zoom
            </a>
          </div>
        )}

        {/* RESCHEDULE */}
        <div style={{ padding: '0 32px 22px', textAlign: 'center' }}>
          <a
            href={`/invite/${token}/calendar?reschedule=1`}
            style={{
              fontFamily: FONT_NAME,
              fontStyle: 'italic',
              fontSize: '17px',
              color: GOLD,
              lineHeight: 1.55,
              textDecoration: 'none',
              opacity: 0.90,
            }}
          >
            Need a different time?<br />
            Reschedule with one click →
          </a>
        </div>

        <TerminalFooter />
      </PageShell>
    )
  }

  // ── SENT state → Screen 2 (booking) ────────────────────────────────────────
  // Captain hotfix 2026-05-19: prefer per-invite proposed_slots if present
  // (bypasses Google Calendar OAuth dependency). Also cross-checks freebusy so
  // we never offer recipients a slot Gideon is already booked in.
  let slotGroups: SlotGroup[]
  if (invitation.proposed_slots && invitation.proposed_slots.length > 0) {
    const slots = invitation.proposed_slots
    const isoTimes = slots.map(s => new Date(s.iso).getTime()).filter(t => !isNaN(t))
    if (isoTimes.length > 0) {
      const windowStart = new Date(Math.min(...isoTimes) - 30 * 60 * 1000).toISOString()
      const windowEnd = new Date(Math.max(...isoTimes) + 60 * 60 * 1000).toISOString()
      const busy = await getBusyTimes(windowStart, windowEnd)
      const nonConflicting = slots.filter(s => !slotOverlapsBusy(s.iso, 30, busy))
      slotGroups = groupProposedSlotsByDate(nonConflicting)
    } else {
      slotGroups = groupProposedSlotsByDate(slots)
    }
  } else {
    slotGroups = await loadAvailableSlots()
  }

  return (
    <PageShell fontClasses={fontClasses}>
      <TerminalHeader />

      {/* Hero — recipient name in Playfair Display */}
      <div style={{ padding: '26px 32px 18px', textAlign: 'center' }}>
        <div style={{
          fontFamily: FONT_BODY,
          fontSize: '8px',
          letterSpacing: '0.30em',
          textIndent: '0.30em',
          color: GOLD,
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: '11px',
          opacity: 0.85,
        }}>
          Private Introduction
        </div>
        <h1 style={{
          fontFamily: FONT_NAME,
          fontSize: 'clamp(2.4rem, 9vw, 3.25rem)',
          color: GOLD,
          fontWeight: 600,
          lineHeight: 1.0,
          letterSpacing: '-0.01em',
          margin: 0,
        }}>
          {displayName}
        </h1>
      </div>

      {/* Private Membership · By Invitation Only */}
      <div style={{ padding: '0 32px 18px', textAlign: 'center' }}>
        <div style={{
          fontFamily: FONT_BODY,
          fontSize: '9px',
          letterSpacing: '0.24em',
          textIndent: '0.24em',
          color: `rgba(${GOLD_RGB}, 0.80)`,
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}>
          Private Membership
        </div>
        <div style={{
          fontFamily: FONT_BODY,
          fontSize: '9px',
          letterSpacing: '0.24em',
          textIndent: '0.24em',
          color: `rgba(${GOLD_RGB}, 0.55)`,
          fontWeight: 500,
          textTransform: 'uppercase',
        }}>
          By Invitation Only
        </div>
      </div>

      {/* Time slots */}
      <div style={{ padding: '6px 32px 24px' }}>
        {slotGroups.length === 0 ? (
          <p style={{
            color: `rgba(${GOLD_RGB}, 0.55)`,
            fontSize: '14px',
            letterSpacing: '0.02em',
            lineHeight: 1.8,
            fontStyle: 'italic',
            fontFamily: FONT_NAME,
            textAlign: 'center',
          }}>
            Please reach out directly to schedule.
          </p>
        ) : (
          <>
            <div style={{
              fontFamily: FONT_BODY,
              fontSize: '9px',
              letterSpacing: '0.24em',
              textIndent: '0.24em',
              color: GOLD,
              fontWeight: 600,
              textTransform: 'uppercase',
              textAlign: 'center',
              marginBottom: '14px',
              opacity: 0.85,
            }}>
              Select a time
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {slotGroups.map((group) => (
                <div key={group.date}>
                  <p style={{
                    color: `rgba(${GOLD_RGB}, 0.70)`,
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.20em',
                    textIndent: '0.20em',
                    margin: '0 0 6px',
                    fontFamily: FONT_BODY,
                  }}>
                    {group.label}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {group.times.map((slot) => (
                      <form key={slot.iso} action="/api/bookings/confirm" method="POST">
                        <input type="hidden" name="token" value={token} />
                        <input type="hidden" name="slot_iso" value={slot.iso} />
                        <button
                          type="submit"
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            background: `rgba(${GOLD_RGB}, 0.04)`,
                            color: GOLD,
                            border: `0.5px solid rgba(${GOLD_RGB}, 0.35)`,
                            borderRadius: '2px',
                            fontSize: '13px',
                            fontFamily: FONT_NAME,
                            cursor: 'pointer',
                            textAlign: 'left',
                            letterSpacing: '0.01em',
                            lineHeight: 1.4,
                            transition: 'background 0.15s ease, border-color 0.15s ease',
                          }}
                        >
                          {slot.display}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <TerminalFooter />
    </PageShell>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Inline subcomponent styles
// ────────────────────────────────────────────────────────────────────────────

const calBtnStyle: React.CSSProperties = {
  border: `0.5px solid rgba(${GOLD_RGB}, 0.40)`,
  padding: '14px 8px',
  textAlign: 'center',
  fontFamily: FONT_BODY,
  fontSize: '14px',
  color: GOLD,
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
  fontWeight: 600,
  textIndent: '0.10em',
  background: 'transparent',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'block',
}

function MdRow({ keyText, valText, href }: { keyText: string; valText: string; href?: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: `0.5px dashed rgba(${GOLD_RGB}, 0.14)`,
    }}>
      <span style={{ fontFamily: FONT_BODY, fontSize: '16px', color: GOLD, letterSpacing: '0.04em', opacity: 0.70 }}>{keyText}</span>
      {href ? (
        <a href={href} style={{ fontFamily: FONT_BODY, fontSize: '16px', color: GOLD, fontWeight: 500, textDecoration: 'none' }}>{valText}</a>
      ) : (
        <span style={{ fontFamily: FONT_BODY, fontSize: '16px', color: GOLD, fontWeight: 500 }}>{valText}</span>
      )}
    </div>
  )
}
