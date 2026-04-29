'use client'
import { useState } from 'react'

export default function GoogleVoiceEmbed() {
  const [embedFailed, setEmbedFailed] = useState(false)

  return (
    <div style={{
      padding: '1rem',
      background: 'var(--rp-surface)',
      border: '1px solid var(--rp-border)',
      borderRadius: '8px',
      marginTop: '1rem'
    }}>
      <h3 style={{ margin: 0, color: 'var(--rp-gold)', fontSize: '0.95rem' }}>
        SMS (305 — Google Voice)
      </h3>
      <p style={{ color: 'var(--rp-gold-lite)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
        305 carrier SMS via Google Voice
      </p>
      {!embedFailed ? (
        <iframe
          src="https://voice.google.com"
          onError={() => setEmbedFailed(true)}
          style={{
            width: '100%',
            height: '500px',
            border: 'none',
            borderRadius: '6px',
            marginTop: '0.75rem',
            background: 'white',
          }}
          title="Google Voice 305 SMS"
        />
      ) : (
        <button
          onClick={() => window.open('https://voice.google.com', '_blank')}
          style={{
            marginTop: '0.75rem',
            padding: '0.5rem 1rem',
            background: 'var(--rp-gold)',
            color: 'var(--rp-navy)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 600,
          }}
        >
          📞 Open Google Voice
        </button>
      )}
    </div>
  )
}
