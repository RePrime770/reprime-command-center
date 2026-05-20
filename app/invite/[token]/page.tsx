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
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--rp-font-playfair',
  display: 'swap',
})

// Locked brand tokens — sourced from dashboard/lib/design-tokens.ts.
// One gold (#FFCC33 Imperial Gold), one navy (#0E3470 Brand Navy). Hierarchy via opacity.
const NAVY = '#0E3470'
const GOLD = '#FFCC33'
const GOLD_RGB = '255, 204, 51'

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
}

async function loadInvitation(token: string): Promise<{ invitation: Invitation | null; reason: 'not_found' | 'used' | 'expired' | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('invitations')
    .select('contact_first_name, contact_name, proposed_slots, status, expires_at, meeting_type, view_count, first_opened_at')
    .eq('id', token)
    .maybeSingle()
  if (error || !data) return { invitation: null, reason: 'not_found' }
  const inv = data as Invitation
  if (inv.status !== 'sent') return { invitation: inv, reason: 'used' }
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
    return { invitation: inv, reason: 'expired' }
  }
  // Track this open — fire and move on (non-blocking via void)
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

/**
 * Group flat proposed_slots into SlotGroups keyed by Chicago date.
 * Lets the booking page work without Google Calendar OAuth.
 * Captain hotfix 2026-05-19.
 */
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

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { invitation, reason } = await loadInvitation(token)

  const fontClasses = `${cinzel.variable} ${ebGaramond.variable} ${playfair.variable}`

  if (!invitation || reason) {
    const message =
      reason === 'used' ? 'This invitation has already been used.'
      : reason === 'expired' ? 'This invitation has expired.'
      : 'This invitation link is not valid.'
    return (
      <main className={fontClasses} style={{ minHeight: '100vh', background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: FONT_BODY }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: `rgba(${GOLD_RGB}, 0.55)`, fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>RePrime Group</p>
          <p style={{ color: GOLD, fontSize: '1.1rem', letterSpacing: '0.04em', fontStyle: 'italic', fontFamily: FONT_NAME }}>{message}</p>
        </div>
      </main>
    )
  }

  const displayName = invitation.contact_name || invitation.contact_first_name || 'Guest'
  const isTerminal = invitation.meeting_type !== 'meeting'
  // Captain hotfix 2026-05-19: prefer per-invite proposed_slots if present
  // (bypasses Google Calendar OAuth dependency). Falls back to live Calendar
  // freebusy if invitation was minted without proposed_slots.
  // ALSO: even when using proposed_slots, cross-check against Gideon's actual
  // calendar via freebusy so we never offer a recipient a slot Gideon is
  // already booked in.
  let slotGroups: SlotGroup[]
  if (invitation.proposed_slots && invitation.proposed_slots.length > 0) {
    const slots = invitation.proposed_slots
    // Compute freebusy window covering all proposed slots (with 30-min buffer)
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
    <main
      className={fontClasses}
      style={{
        minHeight: '100vh',
        background: NAVY,
        color: '#fff',
        fontFamily: FONT_BODY,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: 560, textAlign: 'center' }}>

        {/* ── Guest name (Playfair Display 700, Imperial Gold) ── */}
        <h1 style={{
          fontFamily: FONT_NAME,
          fontSize: 'clamp(3.25rem, 9vw, 5rem)',
          fontWeight: 700,
          color: GOLD,
          margin: '0 0 0.4rem',
          lineHeight: 1.0,
          letterSpacing: '-0.01em',
        }}>
          {displayName}
        </h1>

        {/* Private Introduction — Poppins small-caps */}
        <p style={{
          color: `rgba(${GOLD_RGB}, 0.70)`,
          fontSize: '0.72rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          margin: '0 0 2.75rem',
          fontWeight: 500,
        }}>
          Private Introduction
        </p>

        {/* ══ Terminal Wordmark Block ══ */}
        {isTerminal && (
          <div style={{ margin: '0 0 2.75rem' }}>
            {/* Top spindle rule */}
            <div style={{
              height: '1.5px',
              background: `linear-gradient(90deg, transparent 0%, ${GOLD} 6%, ${GOLD} 94%, transparent 100%)`,
              marginBottom: '1.5rem',
            }} />

            {/* TERMINAL — Cinzel SemiBold per locked logo spec */}
            <h2 style={{
              fontFamily: FONT_TERMINAL,
              fontSize: 'clamp(1.9rem, 5.5vw, 2.85rem)',
              fontWeight: 600,
              color: GOLD,
              letterSpacing: '0.145em',
              textIndent: '0.145em',
              textTransform: 'uppercase',
              margin: '0 0 0.55rem',
            }}>
              Terminal
            </h2>

            {/* by RePrime — EB Garamond Italic */}
            <p style={{
              fontFamily: FONT_BY,
              color: `rgba(${GOLD_RGB}, 0.90)`,
              fontSize: '1.1rem',
              fontStyle: 'italic',
              letterSpacing: '0.04em',
              margin: '0 0 1.5rem',
            }}>
              by RePrime
            </p>

            {/* Bottom spindle rule */}
            <div style={{
              height: '1.5px',
              background: `linear-gradient(90deg, transparent 0%, ${GOLD} 6%, ${GOLD} 94%, transparent 100%)`,
            }} />
          </div>
        )}

        {/* Private Membership · By Invitation Only */}
        <p style={{
          color: 'rgba(255, 255, 255, 0.60)',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          margin: '0 0 0.4rem',
          fontWeight: 500,
        }}>
          Private Membership
        </p>
        <p style={{
          color: 'rgba(255, 255, 255, 0.42)',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          margin: '0 0 3rem',
          fontWeight: 400,
        }}>
          By Invitation Only
        </p>

        {/* ── Time slots ── */}
        {slotGroups.length === 0 ? (
          <p style={{
            color: `rgba(${GOLD_RGB}, 0.55)`,
            fontSize: '0.95rem',
            letterSpacing: '0.02em',
            lineHeight: 1.8,
            fontStyle: 'italic',
            fontFamily: FONT_NAME,
          }}>
            Please reach out directly to schedule.
          </p>
        ) : (
          <>
            <p style={{
              color: GOLD,
              fontSize: '0.72rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginBottom: '2rem',
              fontWeight: 600,
            }}>
              Select a time →
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem', textAlign: 'left' }}>
              {slotGroups.map((group) => (
                <div key={group.date}>
                  <p style={{
                    color: `rgba(${GOLD_RGB}, 0.85)`,
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.22em',
                    margin: '0 0 0.7rem',
                  }}>
                    {group.label}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {group.times.map((slot) => (
                      <form key={slot.iso} action="/api/bookings/confirm" method="POST">
                        <input type="hidden" name="token" value={token} />
                        <input type="hidden" name="slot_iso" value={slot.iso} />
                        <button
                          type="submit"
                          style={{
                            width: '100%',
                            padding: '0.95rem 1.5rem',
                            background: `rgba(${GOLD_RGB}, 0.08)`,
                            color: '#fff',
                            border: `1px solid rgba(${GOLD_RGB}, 0.35)`,
                            borderRadius: '2px',
                            fontSize: '0.95rem',
                            fontFamily: FONT_BODY,
                            cursor: 'pointer',
                            textAlign: 'left',
                            letterSpacing: '0.02em',
                            lineHeight: 1.4,
                            transition: 'background 0.18s ease, border-color 0.18s ease',
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

        {/* Signature — sits on a subtle gold divider */}
        <div style={{
          marginTop: '4.5rem',
          paddingTop: '1.75rem',
          borderTop: `1px solid rgba(${GOLD_RGB}, 0.18)`,
        }}>
          <p style={{
            color: 'rgba(255, 255, 255, 0.55)',
            fontSize: '0.72rem',
            letterSpacing: '0.12em',
            margin: 0,
          }}>
            Gideon Gratsiani · Founder, RePrime Group
          </p>
        </div>

      </div>
    </main>
  )
}
