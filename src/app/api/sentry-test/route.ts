import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'

export async function GET() {
  Sentry.captureMessage('Sentry conectado correctamente a DO Chat ✓', 'info')
  return NextResponse.json({ ok: true, message: 'Evento enviado a Sentry' })
}
