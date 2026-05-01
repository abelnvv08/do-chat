import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRoomsForUser } from '@/lib/demo'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ files: [] })

  const rooms = getRoomsForUser(userId)
  const roomIds = rooms.map(r => r.id)

  const { data } = await admin()
    .from('demo_messages')
    .select('id, content, type, room_id, created_at, user:demo_users(name, emoji)')
    .in('room_id', roomIds)
    .in('type', ['file', 'image'])
    .order('created_at', { ascending: false })
    .limit(100)

  const files = (data ?? []).map((msg: any) => {
    if (msg.type === 'image') {
      return {
        id: msg.id,
        name: 'Imagen',
        url: msg.content,
        size: null,
        type: 'image',
        room_id: msg.room_id,
        created_at: msg.created_at,
        sender: msg.user?.name ?? 'Usuario',
        sender_emoji: msg.user?.emoji ?? '👤',
      }
    }
    try {
      const meta = JSON.parse(msg.content)
      return {
        id: msg.id,
        name: meta.name,
        url: meta.url,
        size: meta.size,
        type: 'file',
        room_id: msg.room_id,
        created_at: msg.created_at,
        sender: msg.user?.name ?? 'Usuario',
        sender_emoji: msg.user?.emoji ?? '👤',
      }
    } catch {
      return null
    }
  }).filter(Boolean)

  return NextResponse.json({ files })
}
