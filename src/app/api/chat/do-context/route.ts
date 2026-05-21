// src/app/api/chat/do-context/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type DoChip =
  | { type: 'task_today';    label: string; count: number }
  | { type: 'task_tomorrow'; label: string; count: number }
  | { type: 'active_chat';   label: string; roomName: string; unread: number }
  | { type: 'awaiting_reply'; label: string; roomName: string; hours: number }
  | { type: 'generic';       label: string; text: string }

export type DoContextResponse = {
  chips: DoChip[]
  previewText: string   // for the chat list row
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ chips: [], previewText: 'Tu asistente · siempre activo' })

  const db = admin()
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)           // YYYY-MM-DD
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10)
  const fortyEightHoursAgo = new Date(now.getTime() - 172800000).toISOString()

  // ── Query 1: tasks due today ──────────────────────────────────────────────
  const { count: todayCount } = await db
    .from('demo_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('due_date', todayStr)
    .eq('done', false)

  // ── Query 2: tasks due tomorrow ───────────────────────────────────────────
  const { count: tomorrowCount } = await db
    .from('demo_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('due_date', tomorrowStr)
    .eq('done', false)

  // ── Query 3: rooms with unread messages (non-AI) ──────────────────────────
  // Get this user's last-read timestamps
  const { data: reads } = await db
    .from('demo_reads')
    .select('room_id, last_read_at')
    .eq('user_id', userId)

  const readsMap: Record<string, string> = {}
  for (const r of reads ?? []) readsMap[r.room_id] = r.last_read_at

  // Get all rooms the user is in (non-AI)
  const { data: memberRows } = await db
    .from('demo_room_members')
    .select('room_id, demo_rooms!inner(id, name, type)')
    .eq('user_id', userId)
    .neq('demo_rooms.type', 'ai')

  const nonAiRoomIds = (memberRows ?? [])
    .map((m: any) => {
      const r = Array.isArray(m.demo_rooms) ? m.demo_rooms[0] : m.demo_rooms
      return r ? { id: r.id as string, name: (r.name ?? r.id) as string } : null
    })
    .filter(Boolean) as { id: string; name: string }[]

  let activeChatChip: DoChip | null = null
  if (nonAiRoomIds.length > 0) {
    // Count unread per room
    const roomIdList = nonAiRoomIds.map(r => r.id)
    const { data: unreadMsgs } = await db
      .from('demo_messages')
      .select('room_id, created_at, user_id')
      .in('room_id', roomIdList)
      .neq('user_id', userId)

    const unreadCountMap: Record<string, number> = {}
    for (const msg of unreadMsgs ?? []) {
      const lastRead = readsMap[msg.room_id]
      if (!lastRead || msg.created_at > lastRead) {
        unreadCountMap[msg.room_id] = (unreadCountMap[msg.room_id] ?? 0) + 1
      }
    }

    // Find room with most unread messages
    const [topRoomId, topCount] = Object.entries(unreadCountMap)
      .sort(([, a], [, b]) => b - a)[0] ?? [null, 0]

    if (topRoomId && topCount > 0) {
      const roomName = nonAiRoomIds.find(r => r.id === topRoomId)?.name ?? 'Chat'
      activeChatChip = {
        type: 'active_chat',
        label: `${topCount} mensaje${topCount > 1 ? 's' : ''} nuevo${topCount > 1 ? 's' : ''}`,
        roomName,
        unread: topCount,
      }
    }
  }

  // ── Query 4: awaiting reply (last msg is mine, no reply since, > 48h) ────
  let awaitingReplyChip: DoChip | null = null
  if (nonAiRoomIds.length > 0) {
    const roomIdList = nonAiRoomIds.map(r => r.id)
    const { data: lastMsgs } = await db
      .from('demo_messages')
      .select('room_id, user_id, created_at')
      .in('room_id', roomIdList)
      .order('created_at', { ascending: false })

    // Group last message per room
    const lastMsgPerRoom: Record<string, { userId: string; createdAt: string }> = {}
    for (const m of lastMsgs ?? []) {
      if (!lastMsgPerRoom[m.room_id]) {
        lastMsgPerRoom[m.room_id] = { userId: m.user_id, createdAt: m.created_at }
      }
    }

    // Find a room where last msg is mine and it's older than 48h
    for (const { id: roomId, name: roomName } of nonAiRoomIds) {
      const last = lastMsgPerRoom[roomId]
      if (last?.userId === userId && last.createdAt < fortyEightHoursAgo) {
        const diffHours = Math.floor((now.getTime() - new Date(last.createdAt).getTime()) / 3600000)
        awaitingReplyChip = {
          type: 'awaiting_reply',
          label: `Sin respuesta ${diffHours}h`,
          roomName,
          hours: diffHours,
        }
        break
      }
    }
  }

  // ── Build chips in priority order (max 3) ────────────────────────────────
  const chips: DoChip[] = []

  if ((todayCount ?? 0) > 0) {
    chips.push({
      type: 'task_today',
      label: `${todayCount} tarea${todayCount! > 1 ? 's' : ''} vence${todayCount! > 1 ? 'n' : ''} hoy`,
      count: todayCount!,
    })
  }

  if (chips.length < 3 && (tomorrowCount ?? 0) > 0) {
    chips.push({
      type: 'task_tomorrow',
      label: `${tomorrowCount} tarea${tomorrowCount! > 1 ? 's' : ''} para mañana`,
      count: tomorrowCount!,
    })
  }

  if (chips.length < 3 && activeChatChip) chips.push(activeChatChip)
  if (chips.length < 3 && awaitingReplyChip) chips.push(awaitingReplyChip)

  // Fill remaining slots with generics
  const generics: DoChip[] = [
    { type: 'generic', label: 'Resumí mis chats', text: 'Resumí los chats más activos de esta semana' },
    { type: 'generic', label: 'Ver pendientes', text: '¿Qué tengo pendiente esta semana?' },
    { type: 'generic', label: '¿En qué quedamos?', text: 'Revisá mis conversaciones y decime qué quedó pendiente de resolver' },
  ]
  for (const g of generics) {
    if (chips.length >= 3) break
    chips.push(g)
  }

  // ── Build preview text for chat list ─────────────────────────────────────
  const parts: string[] = []
  if ((todayCount ?? 0) > 0) parts.push(`${todayCount} tarea${todayCount! > 1 ? 's' : ''} vence hoy`)
  else if ((tomorrowCount ?? 0) > 0) parts.push(`${tomorrowCount} tarea${tomorrowCount! > 1 ? 's' : ''} para mañana`)
  if (activeChatChip) parts.push(`${activeChatChip.unread} chats sin leer`)
  const previewText = parts.length > 0 ? parts.join(' · ') : 'Tu asistente · siempre activo'

  return NextResponse.json({ chips, previewText } satisfies DoContextResponse)
}
