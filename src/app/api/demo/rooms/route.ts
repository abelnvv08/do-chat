import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const room_id = req.nextUrl.searchParams.get('room_id')
  if (!room_id) return NextResponse.json({ error: 'Missing room_id' }, { status: 400 })

  const supabase = admin()
  const { data: room } = await supabase.from('demo_rooms').select('*').eq('id', room_id).single()
  const { data: members } = await supabase
    .from('demo_room_members')
    .select('user_id, demo_profiles(id, name, emoji, bg)')
    .eq('room_id', room_id)

  const memberList = (members ?? []).map((m: any) => {
    const p = Array.isArray(m.demo_profiles) ? m.demo_profiles[0] : m.demo_profiles
    return p ? { id: p.id, name: p.name, emoji: p.emoji, bg: p.bg } : null
  }).filter(Boolean)

  return NextResponse.json({ room, members: memberList })
}

export async function POST(req: NextRequest) {
  const { user_id, name, member_ids } = await req.json()
  if (!user_id || !name || !member_ids?.length) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = admin()
  const roomId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  await supabase.from('demo_rooms').insert({
    id: roomId,
    name,
    type: 'group',
    emoji: '👥',
    created_by: user_id,
  })

  const allMembers = [...new Set([user_id, ...member_ids])]
  await supabase.from('demo_room_members').insert(
    allMembers.map(uid => ({ room_id: roomId, user_id: uid }))
  )

  return NextResponse.json({ room_id: roomId })
}

export async function PATCH(req: NextRequest) {
  const { room_id, name, add_member_ids, remove_user_id } = await req.json()
  if (!room_id) return NextResponse.json({ error: 'Missing room_id' }, { status: 400 })

  const supabase = admin()

  if (name) {
    await supabase.from('demo_rooms').update({ name }).eq('id', room_id)
  }

  if (add_member_ids?.length) {
    await supabase.from('demo_room_members').upsert(
      add_member_ids.map((uid: string) => ({ room_id, user_id: uid }))
    )
  }

  if (remove_user_id) {
    await supabase.from('demo_room_members').delete().eq('room_id', room_id).eq('user_id', remove_user_id)
  }

  return NextResponse.json({ ok: true })
}
