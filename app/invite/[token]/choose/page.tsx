import type { Metadata } from 'next'
import { Cinzel, EB_Garamond, Playfair_Display } from 'next/font/google'
import { createServiceClient } from '@/lib/supabase/server'

// Match brand fonts loaded on the parent /invite/[token]/page.tsx so CSS variables resolve.
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

const NAVY = '#0E3470'
const GOLD = '#FFCC33'
const GOLD_RGB = '255, 204, 51'

const FONT_NAME = `var(--rp-font-playfair), 'Playfair Display', Georgia, serif`
const FONT_TERMINAL = `var(--rp-font-cinzel), Cinzel, 'Trajan Pro', Georgia, serif`
const FONT_BY = `var(--rp-font-eb-garamond), 'EB Garamond', Garamond, Georgia, serif`
const FONT_BODY = `'Poppins', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif`

interface Invitation {
  contact_first_name: string | null
  contact_name: string | null
  status: 'sent' | 'confirmed' | 'expired' | 'cancelled'
  expires_at: string | null
}

async function loadInvitation(token: string): Promise<Invitation | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('invitations')
    .select('contact_first_name, contact_name, status, expires_at')
    .eq('id', token)
    .maybeSingle()
  if (!data) return null
  return data as Invitation
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
    title: `Choose Your Time — ${displayName}`,
    description: 'Pick any time that works for you.',
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
    return (
      <div style={{ minHeight: '100vh', background: NAVY, color: GOLD, padding: '60px 20px', textAlign: 'center', fontFamily: FONT_NAME }}>
        Invitation not found.
      </div>
    )
  }

  const displayName = inv.contact_name || inv.contact_first_name || 'Guest'
  const firstName = inv.contact_first_name || displayName.split(' ')[0]

  // Tomorrow in Chicago — default date value for the picker
  function chicagoTomorrowDate(): string {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Chicago',
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
    return fmt.format(tomorrow) // YYYY-MM-DD
  }

  // Today in Chicago — min date value (no past picks)
  function chicagoTodayDate(): string {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Chicago',
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
    return fmt.format(new Date())
  }

  const defaultDate = chicagoTomorrowDate()
  const minDate = chicagoTodayDate()

  const fontClasses = `${cinzel.variable} ${ebGaramond.variable} ${playfair.variable}`

  return (
    <div className={fontClasses} style={{
      minHeight: '100vh',
      background: '#DDD9D2',
      padding: '24px 16px',
      display: 'flex',
      justifyContent: 'center',
      fontFamily: FONT_BODY,
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: NAVY,
        border: `1px solid rgba(${GOLD_RGB}, 0.22)`,
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        {/* Header — TERMINAL wordmark */}
        <div style={{ padding: '24px 32px 18px', textAlign: 'center', borderBottom: `1px solid rgba(${GOLD_RGB}, 0.18)` }}>
          <div style={{
            fontFamily: FONT_TERMINAL,
            fontSize: '24px',
            letterSpacing: '0.145em',
            textIndent: '0.145em',
            color: GOLD,
            fontWeight: 600,
            margin: '0 0 6px',
          }}>
            TERMINAL
          </div>
          <div style={{
            fontFamily: FONT_BY,
            fontStyle: 'italic',
            fontSize: '14px',
            color: GOLD,
          }}>
            by RePrime
          </div>
        </div>

        {/* Hero */}
        <div style={{ padding: '28px 32px 20px', textAlign: 'center' }}>
          <div style={{
            fontFamily: FONT_BODY,
            fontSize: '12px',
            letterSpacing: '0.30em',
            textIndent: '0.30em',
            color: GOLD,
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: '14px',
          }}>
            Pick Your Own Time
          </div>
          <h1 style={{
            fontFamily: FONT_NAME,
            fontSize: 'clamp(2rem, 8vw, 2.75rem)',
            color: GOLD,
            fontWeight: 600,
            lineHeight: 1.0,
            letterSpacing: '-0.01em',
            margin: 0,
          }}>
            {displayName}
          </h1>
        </div>

        {/* Form */}
        <div style={{ padding: '14px 32px 32px' }}>
          <p style={{
            fontFamily: FONT_NAME,
            fontStyle: 'italic',
            fontSize: '16px',
            color: GOLD,
            textAlign: 'center',
            margin: '0 0 22px',
            lineHeight: 1.5,
          }}>
            {firstName}, choose any date and time that works.
            Gideon will be there.
          </p>

          <form action="/api/bookings/confirm" method="POST">
            <input type="hidden" name="token" value={token} />

            {/* DATE */}
            <label style={{
              display: 'block',
              fontFamily: FONT_BODY,
              fontSize: '11px',
              letterSpacing: '0.20em',
              textIndent: '0.20em',
              color: GOLD,
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>
              Date
            </label>
            <input
              type="date"
              name="date"
              required
              defaultValue={defaultDate}
              min={minDate}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: `rgba(${GOLD_RGB}, 0.06)`,
                border: `0.5px solid rgba(${GOLD_RGB}, 0.45)`,
                borderRadius: '2px',
                color: GOLD,
                fontFamily: FONT_NAME,
                fontSize: '17px',
                marginBottom: '22px',
                colorScheme: 'dark',
              }}
            />

            {/* TIME */}
            <label style={{
              display: 'block',
              fontFamily: FONT_BODY,
              fontSize: '11px',
              letterSpacing: '0.20em',
              textIndent: '0.20em',
              color: GOLD,
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>
              Time (Central)
            </label>
            <input
              type="time"
              name="time"
              required
              defaultValue="10:00"
              step={900}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: `rgba(${GOLD_RGB}, 0.06)`,
                border: `0.5px solid rgba(${GOLD_RGB}, 0.45)`,
                borderRadius: '2px',
                color: GOLD,
                fontFamily: FONT_NAME,
                fontSize: '17px',
                marginBottom: '24px',
                colorScheme: 'dark',
              }}
            />

            {/* SUBMIT */}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '16px 20px',
                background: GOLD,
                color: NAVY,
                border: 'none',
                borderRadius: '2px',
                fontFamily: FONT_NAME,
                fontSize: '18px',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.02em',
                marginBottom: '14px',
              }}
            >
              Confirm This Time
            </button>

            <a
              href={`/invite/${token}`}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                color: GOLD,
                border: `0.5px solid rgba(${GOLD_RGB}, 0.35)`,
                borderRadius: '2px',
                fontFamily: FONT_BODY,
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.18em',
                textIndent: '0.18em',
                textTransform: 'uppercase',
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              ← Back to suggested times
            </a>
          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '18px 32px', borderTop: `1px solid rgba(${GOLD_RGB}, 0.18)`, textAlign: 'center' }}>
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
            fontSize: '12px',
            color: GOLD,
            marginTop: '3px',
          }}>
            by RePrime
          </div>
        </div>
      </div>
    </div>
  )
}
