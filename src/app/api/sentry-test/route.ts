import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'

export async function GET() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
  })

  const id = Sentry.captureMessage('DO Chat — Sentry conectado ✓', 'info')
  await Sentry.flush(3000)

  return NextResponse.json({ ok: true, eventId: id })
}
