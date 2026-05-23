import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'

const BG_COLORS = ['bg-violet-600', 'bg-emerald-600', 'bg-amber-500', 'bg-blue-600', 'bg-rose-500', 'bg-cyan-600', 'bg-orange-500', 'bg-purple-600']

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function getSession(email: string) {
  const db = admin()
  const { data, error } = await db.auth.admin.generateLink({ type: 'magiclink', email })
  if (error || !data?.properties?.hashed_token) return null
  return data.properties.hashed_token
}

export async function POST(req: NextRequest) {
  const { phone, code } = await req.json()
  if (!phone || !code) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = await rateLimit(`verify:${ip}:${phone}`, 10, 60 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!
  const token = process.env.TWILIO_AUTH_TOKEN!
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID!

  // Verify code with Twilio
  const verifyRes = await fetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, Code: code }),
    }
  )

  const verifyData = await verifyRes.json()
  if (!verifyRes.ok || verifyData.status !== 'approved') {
    return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 })
  }

  const db = admin()
  const fakeEmail = `${phone.replace(/\+/g, '').replace(/\s/g, '')}@sms.dochat.app`

  // Check if profile already exists
  const { data: existingProfile } = await db
    .from('demo_profiles')
    .select('id, name')
    .eq('phone', phone)
    .single()

  if (existingProfile) {
    const token_hash = await getSession(fakeEmail)
    if (!token_hash) return NextResponse.json({ error: 'Error generando sesión' }, { status: 500 })
    return NextResponse.json({ token_hash, user_id: existingProfile.id, is_new: false })
  }

  // New user — create auth user now (OTP already consumed, can't verify again)
  let authUser = null

  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email: fakeEmail,
    email_confirm: true,
  })

  if (createErr) {
    // Auth user may already exist without a profile (edge case: failed profile creation)
    const { data: listData } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    authUser = listData?.users?.find((u: any) => u.email === fakeEmail) ?? null
    if (!authUser) {
      return NextResponse.json({ error: 'Error creando usuario' }, { status: 500 })
    }
  } else {
    authUser = created?.user ?? null
  }

  if (!authUser) {
    return NextResponse.json({ error: 'Error creando usuario' }, { status: 500 })
  }

  // Return user_id so profile step can complete without re-verifying
  return NextResponse.json({ needs_profile: true, user_id: authUser.id })
}
