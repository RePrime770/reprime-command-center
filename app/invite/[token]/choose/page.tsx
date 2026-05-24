import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

// Captain 2026-05-24 rebuild: mirrors the existing /invite/[token]/calendar
// reschedule page design — gold slot grid grouped by date, fed from
// /api/bookings/available-slots (Google Calendar freebusy). Each slot is a
// button that POSTs to /api/bookings/confirm. No manual date+time inputs.

interface SlotGroup {
  date: string
  label: string
  times: Array<{ iso: string; display: string }>
}

interface Invitation {
  contact_first_name: string | null
  contact_name: string | null
  status: 'sent' | 'confirmed' | 'expired' | 'cancelled'
  expires_at: string | null
  meeting_type: 'terminal' | 'meeting' | null
}

async function loadInvitation(token: string): Promise<Invitation | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('invitations')
    .select('contact_first_name, contact_name, status, expires_at, meeting_type')
    .eq('id', token)
    .maybeSingle()
  return (data as Invitation) ?? null
}

async function loadAvailableSlots(): Promise<SlotGroup[]> {
  try {
    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://project-7e87w.vercel.app'
    ).replace(/\/$/, '')
    const res = await fetch(`${baseUrl}/api/bookings/available-slots`, { cache: 'no-store' })
    if (res.ok) {
      const json = (await res.json()) as { slots?: SlotGroup[] }
      const slots = json.slots ?? []
      if (slots.length > 0) return slots
    }
  } catch {
    // fall through to generated fallback
  }
  // Fallback when Google Calendar freebusy returns empty (e.g. OAuth expired).
  // Generate the next 7 business days × 3 times each (10am / 2pm / 4:30pm
  // Central), skipping Saturday (Shabbat). Recipient still sees a populated
  // calendar grid; the confirm flow will create the Zoom + calendar event.
  return generateFallbackSlots(7)
}

function generateFallbackSlots(daysAhead: number): SlotGroup[] {
  const TIMES: Array<[number, number, string]> = [
    [10, 0, '10 AM Central'],
    [14, 0, '2 PM Central'],
    [16, 30, '4:30 PM Central'],
  ]
  function chicagoParts(date: Date) {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Chicago',
      year: 'numeric', month: '2-digit', day: '2-digit',
      weekday: 'short',
    })
    const parts = fmt.formatToParts(date)
    const get = (t: string) => parts.find((p) => p.type === t)?.value || ''
    return { yyyy: get('year'), mm: get('month'), dd: get('day'), wk: get('weekday') }
  }
  function chicagoOffset(yyyy: string, mm: string, dd: string): string {
    const probe = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`)
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      timeZoneName: 'longOffset',
    })
    const tz = fmt.formatToParts(probe).find((p) => p.type === 'timeZoneName')?.value || 'GMT-05:00'
    return tz.match(/GMT([+-]\d{2}:\d{2})/)?.[1] || '-05:00'
  }
  function dayLabel(yyyy: string, mm: string, dd: string): string {
    const probe = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`)
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'long', month: 'long', day: 'numeric',
    }).format(probe)
  }

  const groups: SlotGroup[] = []
  let probe = new Date(Date.now() + 24 * 60 * 60 * 1000) // tomorrow
  let added = 0
  while (added < daysAhead) {
    const parts = chicagoParts(probe)
    if (parts.wk !== 'Sat') { // skip Saturday (Shabbat)
      const offset = chicagoOffset(parts.yyyy, parts.mm, parts.dd)
      const dateStr = `${parts.yyyy}-${parts.mm}-${parts.dd}`
      const times = TIMES.map(([h, m, label]) => {
        const hh = String(h).padStart(2, '0')
        const min = String(m).padStart(2, '0')
        const iso = `${dateStr}T${hh}:${min}:00.000${offset}`
        return { iso, display: label }
      })
      groups.push({
        date: dateStr,
        label: dayLabel(parts.yyyy, parts.mm, parts.dd),
        times,
      })
      added++
    }
    probe = new Date(probe.getTime() + 24 * 60 * 60 * 1000)
  }
  return groups
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const inv = await loadInvitation(token)
  const displayName = inv?.contact_name || inv?.contact_first_name || 'Guest'
  return {
    title: `Pick a Time — ${displayName}`,
    description: 'All open times.',
    robots: { index: false, follow: false },
  }
}

export default async function ChooseTimePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const inv = await loadInvitation(token)

  if (!inv) {
    return <NotValidPage message="This invitation link is not valid." />
  }
  if (inv.status === 'cancelled') {
    return <NotValidPage message="This introduction has been cancelled." />
  }
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
    return <NotValidPage message="This invitation has expired." />
  }
  if (inv.status === 'confirmed') {
    return <NotValidPage message="Already confirmed. Open the original invitation to reschedule." />
  }

  const firstName =
    (inv.contact_first_name || inv.contact_name || 'there').trim().split(' ')[0] || 'there'
  const slotGroups = await loadAvailableSlots()

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={hdrStyle}>
          <Spindle />
          <div style={wordmarkStyle}>TERMINAL</div>
          <Spindle />
        </div>

        <div style={letterWrap}>
          <div style={letterContent}>
            <div style={letterLabel}>A note from Gideon Gratsiani</div>
            <div style={letterGreeting}>{firstName} —</div>
            <div style={letterBody}>Pick any time that works for you.</div>
            <div style={letterClosing}>
              One click confirms — calendar + Zoom land on both our calendars instantly.
            </div>
          </div>
        </div>

        <div style={{ ...padBlock, paddingTop: 18, paddingBottom: 28 }}>
          {slotGroups.length === 0 ? (
            <div style={emptyMsg}>
              No open times right now. Reply to the original message and we&rsquo;ll sort it out.
            </div>
          ) : (
            <>
              <div style={lblSm}>Open times →</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {slotGroups.map((group) => (
                  <div key={group.date}>
                    <div style={dayLabel}>{group.label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {group.times.map((slot) => (
                        <form
                          key={slot.iso}
                          action="/api/bookings/confirm"
                          method="POST"
                        >
                          <input type="hidden" name="token" value={token} />
                          <input type="hidden" name="slot_iso" value={slot.iso} />
                          <button type="submit" style={slotBtn}>
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

        <div style={{ padding: '14px 48px 22px', textAlign: 'center', background: '#0E3470' }}>
          <a href={`/invite/${token}`} style={backLink}>
            ← Back to suggested times
          </a>
        </div>

        <div style={footerStyle}>
          <div style={footerName}>TERMINAL</div>
          <div style={footerBy}>by RePrime</div>
          <div style={footerSub}>This invitation was sent personally. Reply directly to Gideon.</div>
        </div>
      </div>
    </main>
  )
}

function NotValidPage({ message }: { message: string }) {
  return (
    <main style={{ ...pageStyle, padding: '4rem 1.5rem', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 520, textAlign: 'center' }}>
        <p
          style={{
            color: '#FFCC33',
            fontSize: '0.7rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            marginBottom: '1.5rem',
            fontFamily: 'Poppins, Arial, sans-serif',
          }}
        >
          RePrime Group
        </p>
        <p
          style={{
            color: '#FFCC33',
            fontSize: '1.1rem',
            letterSpacing: '0.04em',
            fontStyle: 'italic',
            fontFamily: 'Georgia, serif',
          }}
        >
          {message}
        </p>
      </div>
    </main>
  )
}

function Spindle() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width="70%" height="7" viewBox="0 0 460 7" preserveAspectRatio="none">
        <defs>
          <linearGradient id="tl-spindle-choose" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0E3470" />
            <stop offset="10%" stopColor="#FFCC33" />
            <stop offset="90%" stopColor="#FFCC33" />
            <stop offset="100%" stopColor="#0E3470" />
          </linearGradient>
        </defs>
        <path d="M0,3.5 Q230,0 460,3.5 Q230,7 0,3.5 Z" fill="url(#tl-spindle-choose)" />
      </svg>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Styles — mirror /invite/[token]/calendar (reschedule) page
// ────────────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  background: '#DDD9D2',
  minHeight: '100vh',
  padding: '40px 20px',
  display: 'flex',
  justifyContent: 'center',
  fontFamily: 'Poppins, sans-serif',
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 560,
  background: '#0E3470',
  border: '1px solid rgba(255, 204, 51, 0.22)',
  borderRadius: 2,
  overflow: 'hidden',
}

const hdrStyle: React.CSSProperties = {
  background: '#0E3470',
  padding: '22px 48px 20px',
  textAlign: 'center',
  borderBottom: '1px solid rgba(255, 204, 51, 0.18)',
}

const wordmarkStyle: React.CSSProperties = {
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 26,
  letterSpacing: '0.30em',
  color: '#FFCC33',
  fontWeight: 600,
  margin: '11px 0',
  textIndent: '0.30em',
}

const letterWrap: React.CSSProperties = {
  padding: '30px 48px 22px',
  background: 'linear-gradient(180deg, #F8F0DA 0%, #EFE2C4 100%)',
  margin: '30px 48px 22px',
  border: '1px solid rgba(255, 204, 51, 0.30)',
  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)',
}

const letterContent: React.CSSProperties = {
  textAlign: 'center',
  padding: '12px 8px',
}

const letterLabel: React.CSSProperties = {
  fontFamily: 'Poppins, sans-serif',
  fontSize: 11,
  color: 'rgba(14, 52, 112, 0.55)',
  fontStyle: 'italic',
  marginBottom: 18,
  letterSpacing: '0.04em',
}

const letterGreeting: React.CSSProperties = {
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 26,
  color: '#0E3470',
  fontWeight: 600,
  fontStyle: 'italic',
  marginBottom: 14,
}

const letterBody: React.CSSProperties = {
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 18,
  color: '#0E3470',
  lineHeight: 1.6,
  fontStyle: 'italic',
  marginBottom: 4,
}

const letterClosing: React.CSSProperties = {
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 13,
  color: '#0E3470',
  lineHeight: 1.6,
  fontStyle: 'italic',
  marginTop: 12,
}

const padBlock: React.CSSProperties = {
  padding: '8px 48px 14px',
  background: '#0E3470',
}

const lblSm: React.CSSProperties = {
  fontFamily: 'Poppins, sans-serif',
  fontSize: 12,
  letterSpacing: '0.24em',
  color: '#FFCC33',
  textTransform: 'uppercase',
  fontWeight: 600,
  textAlign: 'center',
  marginBottom: 18,
  textIndent: '0.24em',
}

const dayLabel: React.CSSProperties = {
  fontFamily: 'Poppins, sans-serif',
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.22em',
  color: '#FFCC33',
  margin: '0 0 8px',
}

const slotBtn: React.CSSProperties = {
  width: '100%',
  padding: '14px 18px',
  background: 'rgba(255, 204, 51, 0.07)',
  color: '#FFCC33',
  border: '1px solid rgba(255, 204, 51, 0.35)',
  borderRadius: 2,
  fontSize: 15,
  fontFamily: 'Playfair Display, Georgia, serif',
  cursor: 'pointer',
  textAlign: 'center',
  letterSpacing: '0.02em',
  lineHeight: 1.4,
}

const emptyMsg: React.CSSProperties = {
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 14,
  fontStyle: 'italic',
  color: '#FFCC33',
  textAlign: 'center',
  padding: '24px 12px',
  lineHeight: 1.6,
}

const backLink: React.CSSProperties = {
  fontFamily: 'Poppins, sans-serif',
  fontSize: 12,
  color: '#FFCC33',
  letterSpacing: '0.10em',
  textDecoration: 'none',
  textTransform: 'uppercase',
}

const footerStyle: React.CSSProperties = {
  background: '#0E3470',
  padding: '22px 48px',
  borderTop: '1px solid rgba(255, 204, 51, 0.18)',
  textAlign: 'center',
}

const footerName: React.CSSProperties = {
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 16,
  color: '#FFCC33',
  fontWeight: 600,
  letterSpacing: '0.10em',
  textIndent: '0.10em',
}

const footerBy: React.CSSProperties = {
  fontFamily: 'EB Garamond, Garamond, Georgia, serif',
  fontStyle: 'italic',
  fontSize: 12,
  color: '#FFCC33',
  marginTop: 3,
}

const footerSub: React.CSSProperties = {
  fontFamily: 'Poppins, sans-serif',
  fontSize: 9,
  color: '#FFCC33',
  marginTop: 11,
  letterSpacing: '0.06em',
}
