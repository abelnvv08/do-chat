import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function getSessionUser(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET /api/chat/block → lista de IDs bloqueados del usuario autenticado
export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await admin()
    .from('demo_blocked_users')
    .select('blocked_user_id')
    .eq('user_id', sessionUser.id)
  return NextResponse.json({ blocked: (data ?? []).map((r: any) => r.blocked_user_id) })
}

// POST /api/chat/block — bloquear usuario
export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user_id, blocked_user_id } = await req.json()
  if (!user_id || !blocked_user_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (sessionUser.id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await admin()
    .from('demo_blocked_users')
    .upsert({ user_id, blocked_user_id }, { onConflict: 'user_id,blocked_user_id' })
  return NextResponse.json({ ok: true })
}

// DELETE /api/chat/block — desbloquear usuario
export async function DELETE(req: NextRequest) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user_id, blocked_user_id } = await req.json()
  if (!user_id || !blocked_user_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (sessionUser.id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await admin()
    .from('demo_blocked_users')
    .delete()
    .eq('user_id', user_id)
    .eq('blocked_user_id', blocked_user_id)
  return NextResponse.json({ ok: true })
}
