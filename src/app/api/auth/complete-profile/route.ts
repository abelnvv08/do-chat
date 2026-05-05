import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BG_COLORS = ['bg-violet-600', 'bg-emerald-600', 'bg-amber-500', 'bg-blue-600', 'bg-rose-500', 'bg-cyan-600', 'bg-orange-500', 'bg-purple-600']

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { user_id, name, phone, avatar_url } = await req.json()
  const trimmedName = name?.trim() ?? ''
  if (!user_id || trimmedName.length < 2 || trimmedName.length > 30) {
    return NextResponse.json({ error: 'Nombre debe tener entre 2 y 30 caracteres' }, { status: 400 })
  }

  const db = admin()
  const bg = BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)]
  const cleanUsername = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) + Math.floor(Math.random() * 999)

  await db.from('demo_profiles').upsert({
    id: user_id,
    name: trimmedName,
    phone: phone ?? null,
    username: cleanUsername,
    emoji: '',
    bg,
    text_color: 'text-white',
    avatar_url: avatar_url ?? null,
  })

  const aiRoomId = `ai-${user_id}`
  await db.from('demo_rooms').upsert({ id: aiRoomId, name: 'do AI', type: 'ai', emoji: '✦', created_by: user_id })
  await db.from('demo_room_members').upsert({ room_id: aiRoomId, user_id })

  // Get the fake email to generate session
  const { data: authUser } = await db.auth.admin.getUserById(user_id)
  if (!authUser.user?.email) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email: authUser.user.email,
  })
  if (linkErr || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: 'Error generando sesión' }, { status: 500 })
  }

  return NextResponse.json({ token_hash: linkData.properties.hashed_token, user_id })
}
