import { createServiceClient } from '@/lib/supabase/server'

interface Slot { iso: string; display: string }
interface Invitation {
  contact_first_name: string | null
  contact_name: string | null
  proposed_slots: Slot[]
  status: 'sent' | 'confirmed' | 'expired' | 'cancelled'
  expires_at: string | null
}

async function loadInvitation(token: string): Promise<{ invitation: Invitation | null; reason: 'not_found' | 'used' | 'expired' | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('invitations')
    .select('contact_first_name, contact_name, proposed_slots, status, expires_at')
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
  const slots = Array.isArray(invitation.proposed_slots) ? invitation.proposed_slots : []

  return (
    <main style={{ minHeight: '100vh', background: '#0E3470', color: '#fff', fontFamily: 'Poppins, Arial, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #1A3560', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '2rem', color: '#BC9C45', fontWeight: 700, fontFamily: 'serif' }}>ת</span>
        <span style={{ color: '#D4B86A', letterSpacing: '0.1em', fontSize: '0.85rem', textTransform: 'uppercase' }}>RePrime Group · Terminal Introduction</span>
      </header>

      <section style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 2rem' }}>
        <h1 style={{ color: '#BC9C45', fontSize: '2rem', fontWeight: 600, margin: 0 }}>{firstName},</h1>
        <p style={{ color: '#D4B86A', fontSize: '1.1rem', lineHeight: 1.7, marginTop: '1.5rem' }}>
          A time to connect. Pick the slot that works best — confirm with one click. I&apos;ll be there.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '3rem' }}>
          {slots.map((slot, idx) => (
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
