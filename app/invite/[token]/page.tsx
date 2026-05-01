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

  const firstName = inv?.contact_first_name || inv?.contact_name?.split(' ')[0] || 'Guest'
  const title = `Terminal Introduction — ${firstName}`
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

  if (!invitation || reason) {
    const message =
      reason === 'used' ? 'This invitation has already been used.'
      : reason === 'expired' ? 'This invitation has expired.'
      : 'This invitation link is not valid.'
    return (
      <main style={{ minHeight: '100vh', background: '#080d18', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Georgia, serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(188,156,69,0.6)', fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '1.5rem', fontFamily: 'Poppins, Arial, sans-serif' }}>RePrime Group</p>
          <p style={{ color: '#BC9C45', fontSize: '1.1rem', letterSpacing: '0.04em', fontStyle: 'italic' }}>{message}</p>
        </div>
      </main>
    )
  }

  const firstName = invitation.contact_first_name || invitation.contact_name?.split(' ')[0] || 'there'
  const isTerminal = invitation.meeting_type !== 'meeting'
  const slotGroups = await loadAvailableSlots()

  return (
    <main style={{
      minHeight: '100vh',
      background: '#080d18',
      color: '#fff',
      fontFamily: 'Poppins, Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: 520, textAlign: 'center' }}>

        {/* ── Guest name ── */}
        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontSize: 'clamp(3.5rem, 10vw, 5.5rem)',
          fontWeight: 700,
          color: '#C9A84C',
          margin: '0 0 0.4rem',
          lineHeight: 1,
          letterSpacing: '0.01em',
        }}>
          {firstName}
        </h1>

        {/* Private Introduction */}
        <p style={{
          color: 'rgba(201,168,76,0.7)',
          fontSize: '0.72rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          margin: '0 0 2.75rem',
          fontWeight: 500,
        }}>
          Private Introduction
        </p>

        {/* ══ Terminal Logo Block ══ */}
        {isTerminal && (
          <div style={{ margin: '0 0 2.75rem' }}>
            {/* Top rule */}
            <div style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, #C9A84C 25%, #C9A84C 75%, transparent 100%)',
              marginBottom: '1.5rem',
            }} />

            {/* TERMINAL */}
            <h2 style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(1.9rem, 5.5vw, 3rem)',
              fontWeight: 400,
              color: '#C9A84C',
              letterSpacing: '0.38em',
              textTransform: 'uppercase',
              margin: '0 0 0.55rem',
              paddingLeft: '0.38em',
            }}>
              Terminal
            </h2>

            {/* by RePrime */}
            <p style={{
              fontFamily: 'Georgia, serif',
              color: 'rgba(201,168,76,0.75)',
              fontSize: '1rem',
              fontStyle: 'italic',
              letterSpacing: '0.04em',
              margin: '0 0 1.5rem',
            }}>
              by RePrime
            </p>

            {/* Bottom rule */}
            <div style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, #C9A84C 25%, #C9A84C 75%, transparent 100%)',
            }} />
          </div>
        )}

        {/* Private Membership · By Invitation Only */}
        <p style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          margin: '0 0 0.4rem',
          fontWeight: 500,
        }}>
          Private Membership
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.38)',
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
            color: 'rgba(201,168,76,0.45)',
            fontSize: '0.9rem',
            letterSpacing: '0.03em',
            lineHeight: 1.8,
            fontStyle: 'italic',
          }}>
            Please reach out directly to schedule.
          </p>
        ) : (
          <>
            <p style={{
              color: 'rgba(201,168,76,0.85)',
              fontSize: '0.7rem',
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
                    color: 'rgba(201,168,76,0.6)',
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.22em',
                    margin: '0 0 0.6rem',
                  }}>
                    {group.label}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {group.times.map((slot) => (
                      <form key={slot.iso} action="/api/bookings/confirm" method="POST">
                        <input type="hidden" name="token" value={token} />
                        <input type="hidden" name="slot_iso" value={slot.iso} />
                        <button
                          type="submit"
                          style={{
                            width: '100%',
                            padding: '0.9rem 1.5rem',
                            background: 'rgba(201,168,76,0.07)',
                            color: 'rgba(255,255,255,0.88)',
                            border: '1px solid rgba(201,168,76,0.28)',
                            borderRadius: '2px',
                            fontSize: '0.9rem',
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            textAlign: 'left',
                            letterSpacing: '0.02em',
                            lineHeight: 1.4,
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

        {/* Signature */}
        <p style={{
          marginTop: '4.5rem',
          color: 'rgba(255,255,255,0.18)',
          fontSize: '0.68rem',
          letterSpacing: '0.1em',
        }}>
          Gideon Gratsiani · Founder, RePrime Group
        </p>

      </div>
    </main>
  )
}
