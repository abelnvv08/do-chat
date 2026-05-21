import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/chat/block?user_id=xxx → lista de IDs bloqueados
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ blocked: [] })
  const { data } = await admin()
    .from('demo_blocked_users')
    .select('blocked_user_id')
    .eq('user_id', userId)
  return NextResponse.json({ blocked: (data ?? []).map((r: any) => r.blocked_user_id) })
}

// POST /api/chat/block — bloquear usuario
export async function POST(req: NextRequest) {
  const { user_id, blocked_user_id } = await req.json()
  if (!user_id || !blocked_user_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  await admin()
    .from('demo_blocked_users')
    .upsert({ user_id, blocked_user_id }, { onConflict: 'user_id,blocked_user_id' })
  return NextResponse.json({ ok: true })
}

// DELETE /api/chat/block — desbloquear usuario
export async function DELETE(req: NextRequest) {
  const { user_id, blocked_user_id } = await req.json()
  if (!user_id || !blocked_user_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  await admin()
    .from('demo_blocked_users')
    .delete()
    .eq('user_id', user_id)
    .eq('blocked_user_id', blocked_user_id)
  return NextResponse.json({ ok: true })
}
