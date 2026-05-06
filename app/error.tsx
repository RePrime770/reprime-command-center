'use client'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0E3470',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--rp-font-body)',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          padding: '2rem',
          background: 'rgba(14, 52, 112, 0.85)',
          border: '1px solid rgba(14, 52, 112, 0.70)',
          borderRadius: 8,
          textAlign: 'center',
        }}
      >
        <h2 style={{ color: '#FFCC33', margin: 0 }}>Something broke.</h2>
        <p style={{ color: '#FFCC33', marginTop: '1rem', fontSize: '0.9rem' }}>
          {error.message}
        </p>
        <button
          onClick={() => unstable_retry()}
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1.5rem',
            background: '#FFCC33',
            color: '#0E3470',
            border: 'none',
            borderRadius: 4,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
