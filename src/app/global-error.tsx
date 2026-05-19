'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body style={{ background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0, fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>⚠️</p>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Algo salió mal</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>Nuestro equipo ya fue notificado.</p>
          <button onClick={reset} style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
