import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRoomsForUser, USERS } from '@/lib/demo'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get('user_id')
  if (!user_id) return NextResponse.json({ rooms: [] })

  const supabase = admin()
  const rooms = getRoomsForUser(user_id)
  const roomIds = rooms.map(r => r.id)

  // Get last message per room
  const { data: allMessages } = await supabase
    .from('demo_messages')
    .select('id, content, type, room_id, created_at, user_id')
    .in('room_id', roomIds)
    .order('created_at', { ascending: false })

  // Get reads for this user
  const { data: reads } = await supabase
    .from('demo_reads')
    .select('room_id, last_read_at')
    .eq('user_id', user_id)

  const readsMap: Record<string, string> = {}
  for (const r of reads ?? []) readsMap[r.room_id] = r.last_read_at

  // Get reads of OTHER users (for "visto" on own messages)
  const { data: allReads } = await supabase
    .from('demo_reads')
    .select('user_id, room_id, last_read_at')
    .in('room_id', roomIds)
    .neq('user_id', user_id)

  const result = rooms.map(room => {
    const msgs = (allMessages ?? []).filter(m => m.room_id === room.id)
    const lastMsg = msgs[0] ?? null
    const lastReadAt = readsMap[room.id]
    const unread = lastReadAt
      ? msgs.filter(m => m.user_id !== user_id && m.created_at > lastReadAt).length
      : msgs.filter(m => m.user_id !== user_id).length

    // For "visto": check if others read past last own message
    const lastOwnMsg = msgs.find(m => m.user_id === user_id)
    let seenByOthers = false
    if (lastOwnMsg) {
      const othersInRoom = room.type === 'dm'
        ? [room.otherUserId].filter(Boolean)
        : Object.keys(USERS).filter(id => id !== user_id)
      seenByOthers = othersInRoom.every(otherId => {
        const read = (allReads ?? []).find(r => r.user_id === otherId && r.room_id === room.id)
        return read && read.last_read_at >= lastOwnMsg.created_at
      })
    }

    let lastMsgPreview = ''
    if (lastMsg) {
      const isOwn = lastMsg.user_id === user_id
      const senderName = isOwn ? 'Tú' : USERS[lastMsg.user_id]?.name ?? 'Usuario'
      if (lastMsg.type === 'image') lastMsgPreview = `${senderName}: 📷 Imagen`
      else if (lastMsg.type === 'file') {
        try { lastMsgPreview = `${senderName}: 📎 ${JSON.parse(lastMsg.content).name}` }
        catch { lastMsgPreview = `${senderName}: 📎 Archivo` }
      } else if (lastMsg.type === 'ai') lastMsgPreview = `do AI: ${lastMsg.content}`
      else lastMsgPreview = `${senderName}: ${lastMsg.content}`
    }

    return {
      ...room,
      lastMsg: lastMsg ? { content: lastMsgPreview, created_at: lastMsg.created_at, user_id: lastMsg.user_id } : null,
      unread,
      seenByOthers,
    }
  })

  return NextResponse.json({ rooms: result })
}
