import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { type Room } from '@/lib/demo'
import { decrypt } from '@/lib/encryption'

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

async function getRoomsForUser(user_id: string): Promise<Room[]> {
  const supabase = admin()
  const { data: members } = await supabase
    .from('demo_room_members')
    .select('room_id, demo_rooms(id, name, type, emoji)')
    .eq('user_id', user_id)

  const baseRooms: Room[] = ((members ?? []).map((m: any) => {
    const r = Array.isArray(m.demo_rooms) ? m.demo_rooms[0] : m.demo_rooms
    if (!r) return null
    return { id: r.id as string, name: (r.name ?? r.id) as string, emoji: (r.emoji ?? '💬') as string, type: r.type as Room['type'] }
  }).filter(Boolean)) as Room[]

  // For DM rooms, resolve the other user's name/emoji — prefer saved contact name
  const dmRooms = baseRooms.filter(r => r.type === 'dm')
  if (dmRooms.length > 0) {
    const dmRoomIds = dmRooms.map(r => r.id)
    const { data: otherMembers } = await supabase
      .from('demo_room_members')
      .select('room_id, user_id, demo_profiles!demo_room_members_user_id_fkey(name, phone, emoji, avatar_url)')
      .in('room_id', dmRoomIds)
      .neq('user_id', user_id)

    // Load saved contact names for this user
    const otherUserIds = (otherMembers ?? []).map((m: any) => m.user_id).filter(Boolean)
    const { data: savedContacts } = otherUserIds.length
      ? await supabase.from('demo_contacts').select('contact_id, first_name, last_name').eq('user_id', user_id).in('contact_id', otherUserIds)
      : { data: [] }
    const savedNameMap: Record<string, string> = {}
    for (const c of savedContacts ?? []) {
      const n = [c.first_name, c.last_name].filter(Boolean).join(' ')
      if (n) savedNameMap[c.contact_id] = n
    }

    for (const room of baseRooms) {
      if (room.type !== 'dm') continue
      const other = (otherMembers ?? []).find((m: any) => m.room_id === room.id)
      if (other) {
        room.otherUserId = other.user_id
        const p = Array.isArray(other.demo_profiles) ? other.demo_profiles[0] : other.demo_profiles
        if (p) {
          room.name = savedNameMap[other.user_id] || p.phone || p.name
          room.emoji = p.emoji
          room.otherAvatarUrl = p.avatar_url ?? null
        }
      }
    }
  }

  return baseRooms
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user_id = user.id

  const supabase = admin()
  const rooms = await getRoomsForUser(user_id)
  const roomIds = rooms.map(r => r.id)
  if (roomIds.length === 0) return NextResponse.json({ rooms: [] })

  // Get all messages for these rooms
  const { data: allMessages } = await supabase
    .from('demo_messages')
    .select('id, content, type, room_id, created_at, user_id')
    .in('room_id', roomIds)
    .order('created_at', { ascending: false })

  // Get this user's reads
  const { data: reads } = await supabase
    .from('demo_reads')
    .select('room_id, last_read_at')
    .eq('user_id', user_id)

  const readsMap: Record<string, string> = {}
  for (const r of reads ?? []) readsMap[r.room_id] = r.last_read_at

  // Get other users' reads (for "visto")
  const { data: allReads } = await supabase
    .from('demo_reads')
    .select('user_id, room_id, last_read_at')
    .in('room_id', roomIds)
    .neq('user_id', user_id)

  // Get sender names from demo_profiles for messages
  const senderIds = [...new Set((allMessages ?? []).map(m => m.user_id))]
  const { data: profiles } = senderIds.length
    ? await supabase.from('demo_profiles').select('id, name').in('id', senderIds)
    : { data: [] }
  const profileMap: Record<string, string> = {}
  for (const p of profiles ?? []) profileMap[p.id] = p.name

  const result = await Promise.all(rooms.map(async room => {
    const msgs = (allMessages ?? []).filter(m => m.room_id === room.id)
    const lastMsg = msgs[0] ?? null
    const lastReadAt = readsMap[room.id]
    const unread = lastReadAt
      ? msgs.filter(m => m.user_id !== user_id && m.created_at > lastReadAt).length
      : msgs.filter(m => m.user_id !== user_id).length

    const lastOwnMsg = msgs.find(m => m.user_id === user_id)
    let seenByOthers = false
    if (lastOwnMsg && room.type === 'dm' && room.otherUserId) {
      const read = (allReads ?? []).find(r => r.user_id === room.otherUserId && r.room_id === room.id)
      seenByOthers = !!(read && read.last_read_at >= lastOwnMsg.created_at)
    }

    let lastMsgPreview = ''
    if (lastMsg) {
      const isOwn = lastMsg.user_id === user_id
      const senderName = isOwn ? 'Tú' : (profileMap[lastMsg.user_id] ?? 'Usuario')
      if (lastMsg.type === 'image') lastMsgPreview = `${senderName}: Imagen`
      else if (lastMsg.type === 'audio') lastMsgPreview = `${senderName}: Audio`
      else if (lastMsg.type === 'file') {
        try { lastMsgPreview = `${senderName}: ${JSON.parse(await decrypt(lastMsg.content)).name}` }
        catch { lastMsgPreview = `${senderName}: Archivo` }
      } else if (lastMsg.type === 'ai') {
        const plain = await decrypt(lastMsg.content)
        lastMsgPreview = `do AI: ${plain}`
      } else {
        const plain = await decrypt(lastMsg.content)
        lastMsgPreview = `${senderName}: ${plain}`
      }
    }

    return {
      ...room,
      lastMsg: lastMsg ? { content: lastMsgPreview, created_at: lastMsg.created_at, user_id: lastMsg.user_id } : null,
      unread,
      seenByOthers,
    }
  }))

  result.sort((a, b) => {
    if (a.lastMsg && b.lastMsg) return new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime()
    if (a.lastMsg) return -1
    if (b.lastMsg) return 1
    return 0
  })

  return NextResponse.json({ rooms: result })
}
