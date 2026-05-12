import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { phone } = await req.json()
  if (!phone) return NextResponse.json({ error: 'Número requerido' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'

  // Max 5 SMS per phone per hour
  const byPhone = rateLimit(`sms:phone:${phone}`, 5, 60 * 60 * 1000)
  if (!byPhone.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${byPhone.retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(byPhone.retryAfter) } }
    )
  }

  // Max 10 SMS per IP per hour
  const byIp = rateLimit(`sms:ip:${ip}`, 10, 60 * 60 * 1000)
  if (!byIp.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${byIp.retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(byIp.retryAfter) } }
    )
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!
  const token = process.env.TWILIO_AUTH_TOKEN!
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID!

  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, Channel: 'sms' }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err.message ?? 'Error enviando SMS' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
