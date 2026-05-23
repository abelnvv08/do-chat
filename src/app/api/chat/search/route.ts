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

async function getRooms(user_id: string) {
  const supabase = admin()
  const { data: members } = await supabase
    .from('demo_room_members')
    .select('room_id, demo_rooms(id, name, type, emoji)')
    .eq('user_id', user_id)

  return ((members ?? []).map((m: any) => {
    const r = Array.isArray(m.demo_rooms) ? m.demo_rooms[0] : m.demo_rooms
    if (!r) return null
    return { id: r.id as string, name: (r.name ?? r.id) as string, emoji: (r.emoji ?? '💬') as string, type: r.type as string }
  }).filter(Boolean)) as { id: string; name: string; emoji: string; type: string }[]
}

export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get('user_id')
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!user_id || !q || q.length < 2) return NextResponse.json({ results: [] })

  const sessionUser = await getSessionUser(req)
  if (!sessionUser || sessionUser.id !== user_id) return NextResponse.json({ results: [] }, { status: 401 })

  const rooms = await getRooms(user_id)
  const roomIds = rooms.map(r => r.id)
  const roomMap = Object.fromEntries(rooms.map(r => [r.id, r]))
  if (roomIds.length === 0) return NextResponse.json({ results: [] })

  const { data: messages } = await admin()
    .from('demo_messages')
    .select('id, content, type, room_id, created_at, user_id')
    .in('room_id', roomIds)
    .ilike('content', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(60)

  const senderIds = [...new Set((messages ?? []).map(m => m.user_id).filter(Boolean))]
  const { data: profiles } = senderIds.length
    ? await admin().from('demo_profiles').select('id, name, emoji').in('id', senderIds)
    : { data: [] }
  const profileMap: Record<string, { name: string; emoji: string }> = {}
  for (const p of profiles ?? []) profileMap[p.id] = p

  const isEnc = (c: string) => { try { const p = JSON.parse(c); return p?.v === 1 && !!p?.iv && !!p?.ct } catch { return false } }
  const results = (messages ?? [])
    .filter(m => {
      if (isEnc(m.content)) return false // skip encrypted messages from search
      if (m.type === 'file') {
        try { return JSON.parse(m.content).name?.toLowerCase().includes(q.toLowerCase()) }
        catch { return false }
      }
      return true
    })
    .map(m => {
      const room = roomMap[m.room_id]
      const sender = m.user_id ? profileMap[m.user_id] : null
      let preview = m.content
      let fileInfo: { name: string; url: string } | null = null

      if (m.type === 'file') {
        try { const meta = JSON.parse(m.content); preview = `📎 ${meta.name}`; fileInfo = { name: meta.name, url: meta.url } }
        catch { preview = '📎 Archivo' }
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
