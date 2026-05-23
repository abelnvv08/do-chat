import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { broadcastToRoom } from '@/lib/realtime-broadcast'

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
  const { message_id, user_id, emoji, room_id } = await req.json()
  if (!message_id || !user_id || !emoji) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (sessionUser.id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Toggle: if exists delete it, otherwise insert
  const { data: existing } = await admin()
    .from('demo_reactions')
    .select('id')
    .eq('message_id', message_id)
    .eq('user_id', user_id)
    .eq('emoji', emoji)
    .single()

  if (existing) {
    await admin().from('demo_reactions').delete().eq('id', existing.id)
  } else {
    await admin().from('demo_reactions').insert({ message_id, user_id, emoji })
  }

  if (room_id) await broadcastToRoom(room_id)
  return NextResponse.json({ action: existing ? 'removed' : 'added' })
}
