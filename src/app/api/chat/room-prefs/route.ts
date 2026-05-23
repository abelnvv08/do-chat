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

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = sessionUser.id
  const { data } = await admin()
    .from('demo_room_prefs')
    .select('*')
    .eq('user_id', userId)
  return NextResponse.json({ prefs: data ?? [] })
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user_id, room_id, pinned, archived, deleted, muted_until } = await req.json()
  if (!user_id || !room_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (sessionUser.id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const update: Record<string, unknown> = {}
  if (pinned !== undefined) update.pinned = pinned
  if (archived !== undefined) update.archived = archived
  if (deleted !== undefined) update.deleted = deleted
  if (muted_until !== undefined) update.muted_until = muted_until
  const { data } = await admin()
    .from('demo_room_prefs')
    .upsert({ user_id, room_id, ...update }, { onConflict: 'user_id,room_id' })
    .select()
    .single()
  return NextResponse.json({ pref: data })
}
