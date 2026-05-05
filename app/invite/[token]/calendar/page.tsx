import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

interface SlotGroup {
  date: string
  label: string
  times: Array<{ iso: string; display: string }>
}

interface Invitation {
  contact_first_name: string | null
  contact_name: string | null
  status: 'sent' | 'confirmed' | 'expired' | 'cancelled'
  meeting_type: 'terminal' | 'meeting' | null
  confirmed_slot_iso: string | null
  reschedule_count: number | null
}

async function loadInvitation(token: string): Promise<Invitation | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('invitations')
    .select('contact_first_name, contact_name, status, meeting_type, confirmed_slot_iso, reschedule_count')
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
    if (!res.ok) return []
    const json = (await res.json()) as { slots?: SlotGroup[] }
    return json.slots ?? []
  } catch {
    return []
  }
}

function formatCurrentSlot(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  }) + ' Central'
}

export const metadata: Metadata = {
  title: 'Reschedule — RePrime Terminal',
  description: 'Pick a new time.',
}

export default async function ReschedulePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const inv = await loadInvitation(token)

  if (!inv) {
    return <NotValidPage message="This invitation link is not valid." />
  }
  if (inv.status === 'cancelled') {
    return <NotValidPage message="This introduction has been cancelled." />
  }
  if (inv.status !== 'confirmed') {
    return (
      <NotValidPage message="There is no confirmed time to reschedule. Open the original invitation to pick a time." />
    )
  }

  const firstName =
    (inv.contact_first_name || inv.contact_name || 'there').trim().split(' ')[0] || 'there'
  const isMeeting = inv.meeting_type === 'meeting'
  const headline = isMeeting ? 'Reschedule meeting' : 'Reschedule introduction'
  const currentSlotLine = formatCurrentSlot(inv.confirmed_slot_iso)
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
            <div style={letterBody}>{headline}.</div>
            {currentSlotLine && (
              <div style={letterTime}>
                Currently set for
                <br />
                <span style={{ fontWeight: 700 }}>{currentSlotLine}</span>
              </div>
            )}
            <div style={letterClosing}>
              Pick a new time below — one click moves it.
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
              <div style={lblSm}>Pick a new time →</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {slotGroups.map((group) => (
                  <div key={group.date}>
                    <div style={dayLabel}>{group.label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {group.times.map((slot) => (
                        <form
                          key={slot.iso}
                          action={`/api/invitations/${token}/reschedule`}
                          method="POST"
                        >
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
          <a href={`/invite/${token}/confirm`} style={backLink}>
            ← Keep current time
          </a>
        </div>

        <div style={footerStyle}>
          <div style={footerName}>RePrime</div>
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
            color: 'rgba(255, 204, 51, 0.6)',
            fontSize: '0.65rem',
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
          <linearGradient id="tl-spindle-r" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0E3470" />
            <stop offset="10%" stopColor="#FFCC33" />
            <stop offset="90%" stopColor="#FFCC33" />
            <stop offset="100%" stopColor="#0E3470" />
          </linearGradient>
        </defs>
        <path d="M0,3.5 Q230,0 460,3.5 Q230,7 0,3.5 Z" fill="url(#tl-spindle-r)" />
      </svg>
    </div>
  )
}

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

const letterTime: React.CSSProperties = {
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 14,
  color: 'rgba(14, 52, 112, 0.78)',
  margin: '14px 0 6px',
  lineHeight: 1.5,
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
  fontSize: 11,
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
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.22em',
  color: 'rgba(255, 204, 51, 0.7)',
  margin: '0 0 8px',
}

const slotBtn: React.CSSProperties = {
  width: '100%',
  padding: '14px 18px',
  background: 'rgba(255, 204, 51, 0.07)',
  color: 'rgba(255, 255, 255, 0.92)',
  border: '1px solid rgba(255, 204, 51, 0.32)',
  borderRadius: 2,
  fontSize: 14,
  fontFamily: 'inherit',
  cursor: 'pointer',
  textAlign: 'left',
  letterSpacing: '0.02em',
  lineHeight: 1.4,
}

const emptyMsg: React.CSSProperties = {
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 14,
  fontStyle: 'italic',
  color: 'rgba(255, 204, 51, 0.62)',
  textAlign: 'center',
  padding: '24px 12px',
  lineHeight: 1.6,
}

const backLink: React.CSSProperties = {
  fontFamily: 'Poppins, sans-serif',
  fontSize: 11,
  color: 'rgba(255, 204, 51, 0.6)',
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

const footerSub: React.CSSProperties = {
  fontFamily: 'Poppins, sans-serif',
  fontSize: 8,
  color: 'rgba(255, 204, 51, 0.55)',
  marginTop: 11,
  letterSpacing: '0.06em',
}
