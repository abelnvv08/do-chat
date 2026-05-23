import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { username, pin } = await req.json()
  const clean = username.toLowerCase().replace(/^@/, '').trim()
  if (!clean || !pin) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const db = admin()
  const { data: profile } = await db
    .from('demo_profiles')
    .select('id, pin')
    .eq('username', clean)
    .single()

  if (!profile) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  const pinMatch = await bcrypt.compare(pin, profile.pin)
  if (!pinMatch) return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 })

  const email = `${clean}@dochat.app`
  const { data: linkData, error } = await db.auth.admin.generateLink({ type: 'magiclink', email })
  if (error || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: 'Error iniciando sesión' }, { status: 500 })
  }

  return NextResponse.json({ token_hash: linkData.properties.hashed_token, user_id: profile.id })
}
