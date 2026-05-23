import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const BG_COLORS = ['bg-violet-600', 'bg-emerald-600', 'bg-amber-500', 'bg-blue-600', 'bg-rose-500', 'bg-cyan-600', 'bg-orange-500', 'bg-purple-600']

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { username, name, pin } = await req.json()
  const clean = username.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_.]/g, '').trim()

  if (!clean || clean.length < 3) return NextResponse.json({ error: 'Usuario muy corto (mín. 3 caracteres)' }, { status: 400 })
  if (!name || name.trim().length < 2) return NextResponse.json({ error: 'Nombre muy corto' }, { status: 400 })
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) return NextResponse.json({ error: 'PIN debe ser 4 dígitos' }, { status: 400 })

  const db = admin()

  const { data: existing } = await db.from('demo_profiles').select('id').eq('username', clean).single()
  if (existing) return NextResponse.json({ error: 'Ese usuario ya está tomado' }, { status: 409 })

  const email = `${clean}@dochat.app`
  const { data: authData, error: authError } = await db.auth.admin.createUser({ email, email_confirm: true })
  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Error creando usuario' }, { status: 500 })
  }

  const userId = authData.user.id
  const bg = BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)]
  const hashedPin = await bcrypt.hash(pin, 10)

  await db.from('demo_profiles').upsert({
    id: userId,
    name: name.trim(),
    username: clean,
    pin: hashedPin,
    emoji: '',
    bg,
    text_color: 'text-white',
    phone: null,
  })

  const aiRoomId = `ai-${userId}`
  await db.from('demo_rooms').upsert({ id: aiRoomId, name: 'do AI', type: 'ai', emoji: '✦', created_by: userId })
  await db.from('demo_room_members').upsert({ room_id: aiRoomId, user_id: userId })

  const { data: linkData, error: linkError } = await db.auth.admin.generateLink({ type: 'magiclink', email })
  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: 'Error generando sesión' }, { status: 500 })
  }

  return NextResponse.json({ token_hash: linkData.properties.hashed_token, user_id: userId })
}
