'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body
        style={{
          minHeight: '100vh',
          background: '#0E3470',
          color: '#FFCC33',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Poppins, Arial, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ margin: 0 }}>Something broke.</h2>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            The error has been logged. Reload to try again.
          </p>
        </div>
      </body>
    </html>
  )
}
