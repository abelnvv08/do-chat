import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRoomsForUser, USERS } from '@/lib/demo'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get('user_id')
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!user_id || !q || q.length < 2) return NextResponse.json({ results: [] })

  const rooms = getRoomsForUser(user_id)
  const roomIds = rooms.map(r => r.id)
  const roomMap = Object.fromEntries(rooms.map(r => [r.id, r]))

  const { data } = await admin()
    .from('demo_messages')
    .select('id, content, type, room_id, created_at, user_id')
    .in('room_id', roomIds)
    .ilike('content', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(60)

  const results = (data ?? [])
    .filter(m => {
      // For file type, search in the name inside JSON
      if (m.type === 'file') {
        try { return JSON.parse(m.content).name?.toLowerCase().includes(q.toLowerCase()) }
        catch { return false }
      }
      return true
    })
    .map(m => {
      const room = roomMap[m.room_id]
      const sender = m.user_id ? USERS[m.user_id] : null
      let preview = m.content
      let fileInfo: { name: string; url: string } | null = null

      if (m.type === 'file') {
        try {
          const meta = JSON.parse(m.content)
          preview = `📎 ${meta.name}`
          fileInfo = { name: meta.name, url: meta.url }
        } catch { preview = '📎 Archivo' }
      } else if (m.type === 'image') {
        preview = '📷 Imagen'
      } else if (m.type === 'ai') {
        preview = `do AI: ${m.content}`
      }

      return {
        id: m.id,
        room_id: m.room_id,
        room_name: room?.name ?? m.room_id,
        room_emoji: room?.emoji ?? '💬',
        room_type: room?.type ?? 'dm',
        sender_name: m.type === 'ai' ? 'do AI' : (sender?.name ?? 'Usuario'),
        sender_emoji: m.type === 'ai' ? '✦' : (sender?.emoji ?? '👤'),
        preview,
        type: m.type,
        created_at: m.created_at,
        fileInfo,
      }
    })

  return NextResponse.json({ results })
}
