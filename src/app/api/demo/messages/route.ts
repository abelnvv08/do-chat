import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { broadcastToRoom } from '@/lib/realtime-broadcast'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function attachUsers(supabase: ReturnType<typeof admin>, messages: any[]) {
  if (!messages.length) return messages
  const ids = [...new Set(messages.map(m => m.user_id).filter(Boolean))]
  const { data: profiles } = await supabase
    .from('demo_profiles')
    .select('id, name, emoji, bg')
    .in('id', ids)
  const map: Record<string, any> = {}
  for (const p of profiles ?? []) map[p.id] = p
  return messages.map(m => ({ ...m, user: map[m.user_id] ?? null }))
}

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room') || 'group'
  const supabase = admin()

  const { data: rawMessages } = await supabase
    .from('demo_messages')
    .select('*')
    .eq('room_id', room)
    .order('created_at', { ascending: true })
    .limit(100)

  if (!rawMessages?.length) return NextResponse.json({ messages: [] })

  const messageIds = rawMessages.map(m => m.id)
  const { data: reactions } = await supabase
    .from('demo_reactions')
    .select('message_id, user_id, emoji')
    .in('message_id', messageIds)

  const reactionsByMsg: Record<string, { emoji: string; user_ids: string[] }[]> = {}
  for (const r of reactions ?? []) {
    if (!reactionsByMsg[r.message_id]) reactionsByMsg[r.message_id] = []
    const existing = reactionsByMsg[r.message_id].find(x => x.emoji === r.emoji)
    if (existing) existing.user_ids.push(r.user_id)
    else reactionsByMsg[r.message_id].push({ emoji: r.emoji, user_ids: [r.user_id] })
  }

  const replyIds = rawMessages.map(m => m.reply_to_id).filter(Boolean)
  const replyUserMap: Record<string, string> = {}
  if (replyIds.length > 0) {
    const { data: replyMsgs } = await supabase
      .from('demo_messages')
      .select('id, user_id')
      .in('id', replyIds)
    const replyUserIds = [...new Set((replyMsgs ?? []).map(r => r.user_id).filter(Boolean))]
    if (replyUserIds.length) {
      const { data: replyProfiles } = await supabase.from('demo_profiles').select('id, name').in('id', replyUserIds)
      const profileMap: Record<string, string> = {}
      for (const p of replyProfiles ?? []) profileMap[p.id] = p.name
      for (const r of replyMsgs ?? []) replyUserMap[r.id] = profileMap[r.user_id] ?? 'Usuario'
    }
  }

  const withUsers = await attachUsers(supabase, rawMessages)
  const enriched = withUsers.map(m => ({
    ...m,
    reactions: reactionsByMsg[m.id] ?? [],
    reply_user_name: m.reply_to_id ? (replyUserMap[m.reply_to_id] ?? null) : null,
  }))
  return NextResponse.json({ messages: enriched })
}

export async function POST(req: NextRequest) {
  const { user_id, content, type = 'text', room_id = 'group', reply_to_id, reply_preview } = await req.json()
  if (!user_id || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const row: Record<string, unknown> = { user_id, content, type, room_id }
  if (reply_to_id) row.reply_to_id = reply_to_id
  if (reply_preview) row.reply_preview = reply_preview

  const supabase = admin()
  const { data: inserted } = await supabase.from('demo_messages').insert(row).select('*').single()
  if (!inserted) return NextResponse.json({ error: 'Insert failed' }, { status: 500 })

  const { data: profile } = await supabase.from('demo_profiles').select('id, name, emoji, bg').eq('id', user_id).single()
  const message = { ...inserted, user: profile ?? null }

  await broadcastToRoom(room_id)
  return NextResponse.json({ message })
}

export async function PATCH(req: NextRequest) {
  const { message_id, content, user_id } = await req.json()
  if (!message_id || !content || !user_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = admin()
  const { data: msg } = await db.from('demo_messages').select('user_id, room_id').eq('id', message_id).single()
  if (!msg || msg.user_id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.from('demo_messages').update({ content, edited: true }).eq('id', message_id)
  await broadcastToRoom(msg.room_id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { room_id, message_id, user_id } = await req.json()
  const db = admin()

  if (message_id && user_id) {
    const { data: msg } = await db.from('demo_messages').select('user_id, room_id').eq('id', message_id).single()
    if (!msg || msg.user_id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await db.from('demo_messages').delete().eq('id', message_id)
    await broadcastToRoom(msg.room_id)
    return NextResponse.json({ ok: true })
  }

  if (!room_id) return NextResponse.json({ error: 'Missing room_id' }, { status: 400 })
  await db.from('demo_messages').delete().eq('room_id', room_id)
  return NextResponse.json({ ok: true })
}
