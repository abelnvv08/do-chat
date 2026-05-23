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

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user_id, room_id } = await req.json()
  if (!user_id || !room_id) return NextResponse.json({ ok: false })
  if (sessionUser.id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await admin()
    .from('demo_reads')
    .upsert({ user_id, room_id, last_read_at: new Date().toISOString() }, { onConflict: 'user_id,room_id' })
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get('user_id')
  const room_id = req.nextUrl.searchParams.get('room_id')

  // Fetch all readers of a specific room (for read receipts UI)
  if (room_id) {
    const { data } = await admin()
      .from('demo_reads')
      .select('user_id, last_read_at')
      .eq('room_id', room_id)
    return NextResponse.json({ reads: data ?? [] })
  }

  if (!user_id) return NextResponse.json({ reads: [] })
  const { data } = await admin()
    .from('demo_reads')
    .select('room_id, last_read_at')
    .eq('user_id', user_id)
  return NextResponse.json({ reads: data ?? [] })
}
