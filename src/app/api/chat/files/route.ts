import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function getRoomIds(userId: string): Promise<string[]> {
  const { data } = await admin().from('demo_room_members').select('room_id').eq('user_id', userId)
  return (data ?? []).map((r: any) => r.room_id)
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ files: [] })

  const roomIds = await getRoomIds(userId)

  const query = admin()
    .from('demo_messages')
    .select('id, content, type, room_id, created_at, user_id')
    .in('type', ['file', 'image'])

  const { data } = await (roomIds.length
    ? query.or(`room_id.in.(${roomIds.map(id => `"${id}"`).join(',')}),user_id.eq.${userId}`)
    : query.eq('user_id', userId)
  )
    .order('created_at', { ascending: false })
    .limit(100)

  // Get sender profiles
  const senderIds = [...new Set((data ?? []).map((m: any) => m.user_id))]
  const { data: profiles } = senderIds.length
    ? await admin().from('demo_profiles').select('id, name, emoji').in('id', senderIds)
    : { data: [] }
  const profileMap: Record<string, { name: string; emoji: string }> = {}
  for (const p of profiles ?? []) profileMap[p.id] = p

  const files = (data ?? []).map((msg: any) => {
    const sender = profileMap[msg.user_id]
    if (msg.type === 'image') {
      return { id: msg.id, name: 'Imagen', url: msg.content, size: null, type: 'image', room_id: msg.room_id, created_at: msg.created_at, sender: sender?.name ?? 'Usuario', sender_emoji: sender?.emoji ?? '👤' }
    }
    try {
      const meta = JSON.parse(msg.content)
      return { id: msg.id, name: meta.name, url: meta.url, size: meta.size, type: 'file', room_id: msg.room_id, created_at: msg.created_at, sender: sender?.name ?? 'Usuario', sender_emoji: sender?.emoji ?? '👤' }
    } catch { return null }
  }).filter(Boolean)

  return NextResponse.json({ files })
}
