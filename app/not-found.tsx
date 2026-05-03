import Link from 'next/link'

export default function NotFound() {
  return (
    <div
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
          maxWidth: 480,
          padding: '2rem',
          background: 'rgba(14, 52, 112, 0.85)',
          border: '1px solid rgba(14, 52, 112, 0.70)',
          borderRadius: 8,
          textAlign: 'center',
        }}
      >
        <h2 style={{ color: '#FFCC33', margin: 0 }}>Page not found.</h2>
        <p style={{ color: '#FFCC33', marginTop: '1rem', fontSize: '0.9rem' }}>
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginTop: '1.5rem',
            padding: '0.75rem 1.5rem',
            background: '#FFCC33',
            color: '#0E3470',
            textDecoration: 'none',
            borderRadius: 4,
            fontWeight: 600,
          }}
        >
          Return home
        </Link>
      </div>
    </div>
  )
}
