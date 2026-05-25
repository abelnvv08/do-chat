// src/app/api/chat/do-context/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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

export type DoChip =
  | { type: 'task_today';    label: string; count: number }
  | { type: 'task_tomorrow'; label: string; count: number }
  | { type: 'active_chat';   label: string; roomName: string; unread: number }
  | { type: 'awaiting_reply'; label: string; roomName: string; hours: number }
  | { type: 'generic';       label: string; text: string }

export type DoContextResponse = {
  chips: DoChip[]
  previewText: string
}

const ONE_DAY_MS          = 86_400_000
const FORTY_EIGHT_HOURS_MS = 172_800_000
const ONE_HOUR_MS          = 3_600_000
const THIRTY_DAYS_MS       = 30 * ONE_DAY_MS
const MESSAGES_LIMIT       = 1_000

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  const lang   = req.nextUrl.searchParams.get('lang') === 'es' ? 'es' : 'en'
  const es = lang === 'es'
  if (!userId) return NextResponse.json({ chips: [], previewText: es ? 'Tu asistente · siempre activo' : 'Your assistant · always on' })

  const sessionUser = await getSessionUser(req)
  if (!sessionUser || sessionUser.id !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db    = admin()
  const now   = new Date()
  const todayStr         = now.toISOString().slice(0, 10)
  const tomorrowStr      = new Date(now.getTime() + ONE_DAY_MS).toISOString().slice(0, 10)
  const fortyEightHrsAgo = new Date(now.getTime() - FORTY_EIGHT_HOURS_MS).toISOString()
  const thirtyDaysAgo    = new Date(now.getTime() - THIRTY_DAYS_MS).toISOString()

  // ── Run independent queries in parallel ──────────────────────────────────
  const [
    { count: todayCount },
    { count: tomorrowCount },
    { data: reads },
    { data: memberRows },
  ] = await Promise.all([
    db.from('demo_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('due_date', todayStr)
      .eq('done', false),

    db.from('demo_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('due_date', tomorrowStr)
      .eq('done', false),

    db.from('demo_reads')
      .select('room_id, last_read_at')
      .eq('user_id', userId),

    db.from('demo_room_members')
      .select('room_id, demo_rooms!inner(id, name, type)')
      .eq('user_id', userId)
      .neq('demo_rooms.type', 'ai'),
  ])

  const readsMap: Record<string, string> = {}
  for (const r of reads ?? []) readsMap[r.room_id] = r.last_read_at

  const nonAiRooms = (memberRows ?? [])
    .map((m: any) => {
      const r = Array.isArray(m.demo_rooms) ? m.demo_rooms[0] : m.demo_rooms
      return r ? { id: r.id as string, name: (r.name ?? r.id) as string } : null
    })
    .filter(Boolean) as { id: string; name: string }[]

  // ── Two targeted messages queries (run in parallel) ───────────────────────
  // Split by purpose so neither cap corrupts the other's result:
  //   Q5a — others' messages only  → unread counts   (MESSAGES_LIMIT rows, 30-day window)
  //   Q5b — my messages only       → awaiting-reply  (≤N*5 rows, no time filter)
  let activeChatChip:    DoChip | null = null
  let awaitingReplyChip: DoChip | null = null

  if (nonAiRooms.length > 0) {
    const roomIdList = nonAiRooms.map(r => r.id)

    const [{ data: othersMsgs }, { data: myLatestMsgs }] = await Promise.all([
      // Q5a: Messages from others → unread-count map (active_chat chip)
      db.from('demo_messages')
        .select('room_id, created_at')
        .in('room_id', roomIdList)
        .neq('user_id', userId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_LIMIT),

      // Q5b: My own messages → find my latest per room (awaiting-reply chip)
      // *5 ensures we see at least one of my messages per room even in active rooms
      db.from('demo_messages')
        .select('room_id, created_at')
        .in('room_id', roomIdList)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(roomIdList.length * 5),
    ])

    // Unread count per room + others' latest message per room (for cross-check below)
    const unreadCountMap: Record<string, number>  = {}
    const othersLatestPerRoom: Record<string, string> = {}

    for (const m of othersMsgs ?? []) {
      // First occurrence = latest (ordered desc)
      if (!othersLatestPerRoom[m.room_id]) othersLatestPerRoom[m.room_id] = m.created_at
      const lastRead = readsMap[m.room_id]
      if (!lastRead || m.created_at > lastRead) {
        unreadCountMap[m.room_id] = (unreadCountMap[m.room_id] ?? 0) + 1
      }
    }

    // My latest message per room (first occurrence = most recent, since ordered desc)
    const myLatestPerRoom: Record<string, string> = {}
    for (const m of myLatestMsgs ?? []) {
      if (!myLatestPerRoom[m.room_id]) myLatestPerRoom[m.room_id] = m.created_at
    }

    // Active chat chip: room with most unread messages
    const [topRoomId, topCount] = Object.entries(unreadCountMap)
      .sort(([, a], [, b]) => b - a)[0] ?? [null, 0]

    if (topRoomId && topCount > 0) {
      const roomName = nonAiRooms.find(r => r.id === topRoomId)?.name ?? 'Chat'
      activeChatChip = {
        type: 'active_chat',
        label: es
          ? `${topCount} mensaje${topCount > 1 ? 's' : ''} nuevo${topCount > 1 ? 's' : ''}`
          : `${topCount} new message${topCount > 1 ? 's' : ''}`,
        roomName,
        unread: topCount,
      }
    }

    // Awaiting reply chip: room where my last message received no reply for 48h+
    for (const { id: roomId, name: roomName } of nonAiRooms) {
      const myLast = myLatestPerRoom[roomId]
      if (!myLast) continue                           // I never sent here
      if (myLast >= fortyEightHrsAgo) continue        // My last message is recent
      const othersLast = othersLatestPerRoom[roomId]
      if (othersLast && othersLast > myLast) continue // Someone replied after me
      const diffHours = Math.floor((now.getTime() - new Date(myLast).getTime()) / ONE_HOUR_MS)
      awaitingReplyChip = { type: 'awaiting_reply', label: es ? `Sin respuesta ${diffHours}h` : `No reply ${diffHours}h`, roomName, hours: diffHours }
      break
    }
  }

  // ── Assemble chips in priority order (max 3) ─────────────────────────────
  const chips: DoChip[] = []

  if ((todayCount ?? 0) > 0) {
    chips.push({
      type: 'task_today',
      label: es
        ? `${todayCount} tarea${todayCount! > 1 ? 's' : ''} vence${todayCount! > 1 ? 'n' : ''} hoy`
        : `${todayCount} task${todayCount! > 1 ? 's' : ''} due today`,
      count: todayCount!,
    })
  }
  if (chips.length < 3 && (tomorrowCount ?? 0) > 0) {
    chips.push({
      type: 'task_tomorrow',
      label: es
        ? `${tomorrowCount} tarea${tomorrowCount! > 1 ? 's' : ''} para mañana`
        : `${tomorrowCount} task${tomorrowCount! > 1 ? 's' : ''} tomorrow`,
      count: tomorrowCount!,
    })
  }
  if (chips.length < 3 && activeChatChip)    chips.push(activeChatChip)
  if (chips.length < 3 && awaitingReplyChip) chips.push(awaitingReplyChip)

  const generics: DoChip[] = es ? [
    { type: 'generic', label: 'Resumí mis chats',  text: 'Resumí los chats más activos de esta semana' },
    { type: 'generic', label: 'Ver pendientes',    text: '¿Qué tengo pendiente esta semana?' },
    { type: 'generic', label: '¿En qué quedamos?', text: 'Revisá mis conversaciones y decime qué quedó pendiente de resolver' },
  ] : [
    { type: 'generic', label: 'Summarize my chats', text: 'Summarize my most active chats this week' },
    { type: 'generic', label: 'View pending tasks', text: 'What do I have pending this week?' },
    { type: 'generic', label: "What's pending?",    text: 'Review my conversations and tell me what is still unresolved' },
  ]
  for (const g of generics) {
    if (chips.length >= 3) break
    chips.push(g)
  }

  // ── Preview text for chat list ────────────────────────────────────────────
  const parts: string[] = []
  if ((todayCount ?? 0) > 0)
    parts.push(es
      ? `${todayCount} tarea${todayCount! > 1 ? 's' : ''} vence${todayCount! > 1 ? 'n' : ''} hoy`
      : `${todayCount} task${todayCount! > 1 ? 's' : ''} due today`)
  else if ((tomorrowCount ?? 0) > 0)
    parts.push(es
      ? `${tomorrowCount} tarea${tomorrowCount! > 1 ? 's' : ''} para mañana`
      : `${tomorrowCount} task${tomorrowCount! > 1 ? 's' : ''} tomorrow`)
  if (activeChatChip) parts.push(es
    ? `${activeChatChip.unread} chat${activeChatChip.unread > 1 ? 's' : ''} sin leer`
    : `${activeChatChip.unread} unread chat${activeChatChip.unread > 1 ? 's' : ''}`)

  const previewText = parts.length > 0 ? parts.join(' · ') : (es ? 'Tu asistente · siempre activo' : 'Your assistant · always on')

  return NextResponse.json({ chips, previewText } satisfies DoContextResponse)
}
