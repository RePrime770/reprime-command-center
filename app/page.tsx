import PhoneLinkEmbed from '@/components/sms/PhoneLinkEmbed'
import GoogleVoiceEmbed from '@/components/sms/GoogleVoiceEmbed'

export default function Dashboard() {
  return (
    <main style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <div style={{ flex: 1, background: 'var(--personal-bg)', borderRight: '1px solid var(--personal-border)', padding: '1.5rem', overflowY: 'auto' }}>
        <h1 style={{ color: 'var(--personal-text)', fontWeight: 600, fontSize: '1.5rem', margin: 0 }}>718 — Personal</h1>
        <p style={{ color: 'var(--personal-muted)', marginTop: '0.5rem' }}>+1 (718) 550-5500</p>
        <PhoneLinkEmbed />
      </div>
      <div style={{ flex: 1, background: 'var(--rp-navy)', color: 'var(--rp-white)', padding: '1.5rem', overflowY: 'auto' }}>
        <h1 style={{ color: 'var(--rp-gold)', fontWeight: 600, fontSize: '1.5rem', margin: 0 }}>305 — RePrime</h1>
        <p style={{ color: 'var(--rp-gold-lite)', marginTop: '0.5rem' }}>+1 (305) 778-4861</p>
        <GoogleVoiceEmbed />
      </div>
    </main>
  )
}
