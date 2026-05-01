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
      <main style={{ minHeight: '100vh', background: '#0E3470', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Poppins, Arial, sans-serif' }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <h1 style={{ color: '#BC9C45', fontWeight: 600 }}>{message}</h1>
        </div>
      </main>
    )
  }

  const firstName = invitation.contact_first_name || 'there'
  const isTerminal = invitation.meeting_type !== 'meeting'
  const slotGroups = await loadAvailableSlots()

  return (
    <main style={{ minHeight: '100vh', background: '#0E3470', color: '#fff', fontFamily: 'Poppins, Arial, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #1A3560', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ color: '#D4B86A', letterSpacing: '0.1em', fontSize: '0.85rem', textTransform: 'uppercase' }}>
          RePrime Group · {isTerminal ? 'Terminal Introduction' : 'Meeting Request'}
        </span>
      </header>

      <section style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 2rem' }}>
        <h1 style={{ color: '#BC9C45', fontSize: '2rem', fontWeight: 600, margin: 0 }}>{firstName},</h1>
        <p style={{ color: '#D4B86A', fontSize: '1.1rem', lineHeight: 1.7, marginTop: '1.5rem' }}>
          {isTerminal
            ? "A time to connect. Pick the slot that works best — confirm with one click. I'll be there."
            : "Pick the time that works — confirm with one click and it's locked."}
        </p>

        {slotGroups.length === 0 ? (
          <p style={{ color: '#D4B86A', fontSize: '1rem', marginTop: '3rem' }}>
            Please reach out directly to schedule.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '3rem' }}>
            {slotGroups.map((group) => (
              <div key={group.date}>
                <h2 style={{ color: '#D4B86A', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>
                  {group.label}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {group.times.map((slot) => (
                    <form key={slot.iso} action="/api/bookings/confirm" method="POST">
                      <input type="hidden" name="token" value={token} />
                      <input type="hidden" name="slot_iso" value={slot.iso} />
                      <button
                        type="submit"
                        style={{
                          width: '100%',
                          padding: '1rem 1.5rem',
                          background: 'transparent',
                          color: '#fff',
                          border: '1px solid #BC9C45',
                          borderRadius: '4px',
                          fontSize: '1rem',
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          textAlign: 'left',
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
        )}

        <p style={{ marginTop: '4rem', color: '#8A8680', fontSize: '0.85rem', borderTop: '1px solid #1A3560', paddingTop: '1.5rem' }}>
          Gideon Gratsiani · Founder, RePrime Group
        </p>
      </section>
    </main>
  )
}
