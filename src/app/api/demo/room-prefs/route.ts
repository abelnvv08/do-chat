import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ prefs: [] })
  const { data } = await admin()
    .from('demo_room_prefs')
    .select('*')
    .eq('user_id', userId)
  return NextResponse.json({ prefs: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { user_id, room_id, pinned, archived, deleted } = await req.json()
  if (!user_id || !room_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const update: Record<string, unknown> = {}
  if (pinned !== undefined) update.pinned = pinned
  if (archived !== undefined) update.archived = archived
  if (deleted !== undefined) update.deleted = deleted
  const { data } = await admin()
    .from('demo_room_prefs')
    .upsert({ user_id, room_id, ...update }, { onConflict: 'user_id,room_id' })
    .select()
    .single()
  return NextResponse.json({ pref: data })
}
