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
}

async function loadInvitation(token: string): Promise<{ invitation: Invitation | null; reason: 'not_found' | 'used' | 'expired' | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('invitations')
    .select('contact_first_name, contact_name, proposed_slots, status, expires_at, meeting_type')
    .eq('id', token)
    .maybeSingle()
  if (error || !data) return { invitation: null, reason: 'not_found' }
  const inv = data as Invitation
  if (inv.status !== 'sent') return { invitation: inv, reason: 'used' }
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
    return { invitation: inv, reason: 'expired' }
  }
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

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { invitation, reason } = await loadInvitation(token)

  if (!invitation || reason) {
    const message =
      reason === 'used'
        ? 'This invitation has already been used.'
        : reason === 'expired'
          ? 'This invitation has expired.'
          : 'This invitation link is not valid.'
    return (
      <main style={{ minHeight: '100vh', background: '#0A1628', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Poppins, Arial, sans-serif' }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <p style={{ color: 'rgba(188,156,69,0.5)', fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '1rem' }}>RePrime Group</p>
          <h1 style={{ color: '#BC9C45', fontWeight: 500, fontSize: '1.1rem', letterSpacing: '0.04em' }}>{message}</h1>
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
      background: 'linear-gradient(170deg, #080f1f 0%, #0a1628 40%, #0e1f48 100%)',
      color: '#fff',
      fontFamily: 'Poppins, Arial, sans-serif',
    }}>
      {/* Minimal header */}
      <header style={{ padding: '1.75rem 2.5rem' }}>
        <span style={{
          color: '#BC9C45',
          fontSize: '0.65rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          fontWeight: 600,
          opacity: 0.75,
        }}>
          RePrime Group
        </span>
      </header>

      {/* Hero + slots */}
      <section style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: '1.5rem 2.5rem 6rem',
        textAlign: 'center',
      }}>

        {/* ── Name ── */}
        <h1 style={{
          color: '#BC9C45',
          fontSize: 'clamp(2.8rem, 8vw, 4.8rem)',
          fontWeight: 700,
          fontFamily: 'Georgia, serif',
          letterSpacing: '0.01em',
          margin: '0 0 0.5rem',
          lineHeight: 1.05,
        }}>
          {firstName}
        </h1>

        {/* PRIVATE INTRODUCTION */}
        <p style={{
          color: 'rgba(212,184,106,0.6)',
          fontSize: '0.65rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          margin: '0 0 2.25rem',
          fontWeight: 500,
        }}>
          Private Introduction
        </p>

        {/* Divider */}
        <div style={{ width: 44, height: 1, background: 'rgba(188,156,69,0.35)', margin: '0 auto 2.25rem' }} />

        {/* TERMINAL */}
        {isTerminal && (
          <>
            <h2 style={{
              color: '#D4B86A',
              fontSize: 'clamp(1.6rem, 5vw, 2.8rem)',
              fontWeight: 300,
              fontFamily: 'Georgia, serif',
              letterSpacing: '0.6em',
              textTransform: 'uppercase',
              margin: '0 0 0.5rem',
              paddingLeft: '0.6em',
            }}>
              Terminal
            </h2>

            <p style={{
              color: 'rgba(212,184,106,0.45)',
              fontSize: '0.8rem',
              fontStyle: 'italic',
              letterSpacing: '0.06em',
              margin: '0 0 2.25rem',
            }}>
              by RePrime
            </p>

            {/* Divider */}
            <div style={{ width: 44, height: 1, background: 'rgba(188,156,69,0.35)', margin: '0 auto 1.75rem' }} />
          </>
        )}

        {/* PRIVATE MEMBERSHIP / BY INVITATION ONLY */}
        <p style={{
          color: 'rgba(255,255,255,0.25)',
          fontSize: '0.58rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          margin: '0 0 0.3rem',
          fontWeight: 500,
        }}>
          Private Membership
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.16)',
          fontSize: '0.58rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          margin: '0 0 3.5rem',
          fontWeight: 500,
        }}>
          By Invitation Only
        </p>

        {/* ── Slots ── */}
        {slotGroups.length === 0 ? (
          <p style={{
            color: 'rgba(212,184,106,0.35)',
            fontSize: '0.88rem',
            letterSpacing: '0.04em',
            lineHeight: 1.7,
          }}>
            Please reach out directly to schedule.
          </p>
        ) : (
          <>
            <p style={{
              color: 'rgba(212,184,106,0.65)',
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: '2rem',
              fontWeight: 500,
            }}>
              Select a time →
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {slotGroups.map((group) => (
                <div key={group.date} style={{ textAlign: 'left' }}>
                  <h3 style={{
                    color: 'rgba(212,184,106,0.5)',
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    margin: '0 0 0.7rem',
                  }}>
                    {group.label}
                  </h3>
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
                            background: 'rgba(188,156,69,0.05)',
                            color: 'rgba(255,255,255,0.8)',
                            border: '1px solid rgba(188,156,69,0.22)',
                            borderRadius: '2px',
                            fontSize: '0.88rem',
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            textAlign: 'left',
                            letterSpacing: '0.02em',
                            lineHeight: 1.4,
                            transition: 'border-color 0.15s, background 0.15s',
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

        {/* Footer */}
        <p style={{
          marginTop: '5rem',
          color: 'rgba(255,255,255,0.13)',
          fontSize: '0.68rem',
          letterSpacing: '0.1em',
        }}>
          Gideon Gratsiani · Founder, RePrime Group
        </p>
      </section>
    </main>
  )
}
