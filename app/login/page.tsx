'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Login() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: 'g@reprime.com',
      options: {
        emailRedirectTo:
          typeof window !== 'undefined' ? window.location.origin : '',
      },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0E3470',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Poppins, Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          padding: '2.5rem',
          background: '#0A1F44',
          border: '1px solid #1A3560',
          borderRadius: 8,
        }}
      >
        <h1
          style={{
            color: '#BC9C45',
            margin: 0,
            fontSize: '1.75rem',
            fontWeight: 600,
          }}
        >
          RePrime Command Center
        </h1>
        <p style={{ color: '#D4B86A', marginTop: '1rem', fontSize: '0.95rem' }}>
          Sign in to continue.
        </p>
        {!sent ? (
          <button
            onClick={submit}
            disabled={loading}
            style={{
              marginTop: '2rem',
              width: '100%',
              padding: '0.85rem',
              background: '#BC9C45',
              color: '#0E3470',
              border: 'none',
              borderRadius: 4,
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Sending...' : 'Send magic link to g@reprime.com'}
          </button>
        ) : (
          <p style={{ marginTop: '2rem', color: '#fff', fontSize: '0.95rem' }}>
            Check your email at g@reprime.com.
          </p>
        )}
        {error && (
          <p style={{ color: '#FF7474', marginTop: '1rem', fontSize: '0.85rem' }}>
            {error}
          </p>
        )}
      </div>
    </main>
  )
}
