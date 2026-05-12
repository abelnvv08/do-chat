import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Room } from '@/lib/demo'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get('user_id')
  if (!user_id) return NextResponse.json({ rooms: [] })

  const db = admin()

  const { data: members, error } = await db
    .from('demo_room_members')
    .select('room_id, demo_rooms(id, name, type, emoji)')
    .eq('user_id', user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rooms: Room[] = (members ?? []).map((m: any) => {
    const r = Array.isArray(m.demo_rooms) ? m.demo_rooms[0] : m.demo_rooms
    if (!r) return null
    return {
      id: r.id as string,
      name: (r.name ?? r.id) as string,
      emoji: (r.emoji ?? '💬') as string,
      type: r.type as Room['type'],
    }
  }).filter(Boolean) as Room[]

  return NextResponse.json({ rooms })
}
