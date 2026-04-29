import Link from 'next/link'

interface Slot { iso: string; display: string }
interface Invitation {
  contact_first_name: string
  contact_name: string
  proposed_slots: Slot[]
  status: 'sent' | 'confirmed' | 'expired' | 'cancelled'
}

const MOCK: Invitation = {
  contact_first_name: 'PLACEHOLDER',
  contact_name: 'PLACEHOLDER',
  proposed_slots: [
    { iso: '2026-04-30T14:00:00-05:00', display: 'Thursday, April 30 at 2:00 PM Central' },
    { iso: '2026-05-01T10:00:00-05:00', display: 'Friday, May 1 at 10:00 AM Central' },
    { iso: '2026-05-01T15:00:00-05:00', display: 'Friday, May 1 at 3:00 PM Central' },
  ],
  status: 'sent',
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = MOCK

  if (invitation.status !== 'sent') {
    return (
      <main style={{ minHeight: '100vh', background: '#0E3470', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Poppins, Arial, sans-serif' }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <h1 style={{ color: '#BC9C45', fontWeight: 600 }}>This invitation has already been used or expired.</h1>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0E3470', color: '#fff', fontFamily: 'Poppins, Arial, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #1A3560', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '2rem', color: '#BC9C45', fontWeight: 700, fontFamily: 'serif' }}>ת</span>
        <span style={{ color: '#D4B86A', letterSpacing: '0.1em', fontSize: '0.85rem', textTransform: 'uppercase' }}>RePrime Group · Terminal Introduction</span>
      </header>

      <section style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 2rem' }}>
        <h1 style={{ color: '#BC9C45', fontSize: '2rem', fontWeight: 600, margin: 0 }}>{invitation.contact_first_name},</h1>
        <p style={{ color: '#D4B86A', fontSize: '1.1rem', lineHeight: 1.7, marginTop: '1.5rem' }}>
          A time to connect. Pick the slot that works best — confirm with one click. I'll be there.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '3rem' }}>
          {invitation.proposed_slots.map((slot, idx) => (
            <form key={idx} action={`/api/bookings/confirm`} method="POST">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="slot_index" value={idx} />
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '1.25rem 2rem',
                  background: 'transparent',
                  color: '#fff',
                  border: '1px solid #BC9C45',
                  borderRadius: '4px',
                  fontSize: '1.05rem',
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

        <p style={{ marginTop: '4rem', color: '#8A8680', fontSize: '0.85rem', borderTop: '1px solid #1A3560', paddingTop: '1.5rem' }}>
          Gideon Gratsiani · Founder, RePrime Group
        </p>
      </section>
    </main>
  )
}
