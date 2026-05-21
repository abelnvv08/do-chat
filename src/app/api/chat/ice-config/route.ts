import { NextResponse } from 'next/server'

export async function GET() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    // Fallback: solo STUN (sin TURN configurado)
    return NextResponse.json({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Tokens.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    if (!res.ok) throw new Error(`Twilio NTS error: ${res.status}`)

    const data = await res.json()
    // data.ice_servers es un array de { url, urls, username, credential }
    return NextResponse.json({ iceServers: data.ice_servers ?? [] }, {
      headers: {
        // Cache 60 segundos — Twilio tokens duran 86400s por default
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch {
    // Si Twilio falla, usar STUN solo (no romper las llamadas)
    return NextResponse.json({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })
  }
}
