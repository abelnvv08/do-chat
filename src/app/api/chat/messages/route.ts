import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { broadcastToRoom } from '@/lib/realtime-broadcast'
import { encrypt, decrypt } from '@/lib/encryption'
import webpush from 'web-push'

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

async function attachUsers(supabase: ReturnType<typeof admin>, messages: any[]) {
  if (!messages.length) return messages
  const ids = [...new Set(messages.map(m => m.user_id).filter(Boolean))]
  const { data: profiles } = await supabase
    .from('demo_profiles')
    .select('id, name, phone, emoji, bg, avatar_url')
    .in('id', ids)
  const map: Record<string, any> = {}
  for (const p of profiles ?? []) map[p.id] = p
  return messages.map(m => ({ ...m, user: map[m.user_id] ?? null }))
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
  const decrypted = await Promise.all(withUsers.map(async m => ({
    ...m,
    content: (m.type === 'text' || m.type === 'ai') ? await decrypt(m.content) : m.content,
  })))
  const enriched = decrypted.map(m => ({
    ...m,
    reactions: reactionsByMsg[m.id] ?? [],
    reply_user_name: m.reply_to_id ? (replyUserMap[m.reply_to_id] ?? null) : null,
  }))
  return NextResponse.json({ messages: enriched })
}

export async function POST(req: NextRequest) {
  const { user_id, content, type = 'text', room_id = 'group', reply_to_id, reply_preview } = await req.json()
  if (!user_id || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const sessionUser = await getSessionUser(req)
  if (!sessionUser || sessionUser.id !== user_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const encryptedContent = (type === 'text' || type === 'ai') ? await encrypt(content) : content
  const row: Record<string, unknown> = { user_id, content: encryptedContent, type, room_id }
  if (reply_to_id) row.reply_to_id = reply_to_id
  if (reply_preview) row.reply_preview = reply_preview

  const supabase = admin()
  const { data: inserted } = await supabase.from('demo_messages').insert(row).select('*').single()
  if (!inserted) return NextResponse.json({ error: 'Insert failed' }, { status: 500 })

  // Update sender's last_seen on every message sent (fire-and-forget)
  supabase.from('demo_profiles').update({ last_seen: new Date().toISOString() }).eq('id', user_id).then(() => {})

  const { data: profile } = await supabase.from('demo_profiles').select('id, name, emoji, bg').eq('id', user_id).single()
  const message = { ...inserted, content: await decrypt(encryptedContent), user: profile ?? null }

  await broadcastToRoom(room_id)

  // Push notifications (con detección de @menciones)
  if (type !== 'system' && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_SUBJECT ?? 'noreply@getdochat.com'}`,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )

    // Obtener miembros del room con sus nombres (para detectar menciones)
    const { data: membersWithProfiles } = await supabase
      .from('demo_room_members')
      .select('user_id, demo_profiles!inner(name)')
      .eq('room_id', room_id)
      .neq('user_id', user_id)

    if (membersWithProfiles?.length) {
      const senderName = profile?.name ?? 'Mensaje nuevo'
      const bodyText = type === 'image' ? '🖼 Imagen' : type === 'file' ? '📎 Archivo' : type === 'audio' ? '🎤 Audio' : content

      // Detectar quiénes fueron mencionados: @NombreCompleto en el contenido
      const mentionedIds = new Set(
        (type === 'text' ? membersWithProfiles : [])
          .filter((m: any) => {
            const name: string = m.demo_profiles?.name ?? ''
            return name.length > 0 && content.toLowerCase().includes(`@${name.toLowerCase()}`)
          })
          .map((m: any) => m.user_id as string)
      )

      const otherIds = membersWithProfiles.map((m: any) => m.user_id as string)
      const { data: subs } = await supabase
        .from('demo_push_subscriptions')
        .select('user_id, subscription')
        .in('user_id', otherIds)

      await Promise.allSettled((subs ?? []).map((s: any) => {
        const isMentioned = mentionedIds.has(s.user_id)
        const payload = JSON.stringify(
          isMentioned
            ? {
                title: `💬 ${senderName} te mencionó`,
                body: bodyText,
                tag: `mention-${room_id}`,
                data: { url: `/chat/${s.user_id}` },
              }
            : {
                title: senderName,
                body: bodyText,
                tag: `msg-${room_id}`,
                data: { url: `/chat/${s.user_id}` },
              }
        )
        return webpush.sendNotification(s.subscription as webpush.PushSubscription, payload)
      }))
    }
  }

  return NextResponse.json({ message })
}

export async function PATCH(req: NextRequest) {
  const { message_id, content, user_id } = await req.json()
  if (!message_id || !content || !user_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const sessionUser = await getSessionUser(req)
  if (!sessionUser || sessionUser.id !== user_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()
  const { data: msg } = await db.from('demo_messages').select('user_id, room_id').eq('id', message_id).single()
  if (!msg || msg.user_id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const encContent = await encrypt(content)
  await db.from('demo_messages').update({ content: encContent, edited: true }).eq('id', message_id)
  await broadcastToRoom(msg.room_id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { room_id, message_id, user_id } = await req.json()
  const db = admin()

  if (message_id && user_id) {
    const sessionUser = await getSessionUser(req)
    if (!sessionUser || sessionUser.id !== user_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: msg } = await db.from('demo_messages').select('user_id, room_id, type, content').eq('id', message_id).single()
    if (!msg || msg.user_id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Delete from storage if it's a file/image/audio
    if (msg.type === 'file' || msg.type === 'image' || msg.type === 'audio') {
      try {
        const url = msg.type === 'file' ? JSON.parse(msg.content).url : msg.content
        const match = (url as string).match(/demo-files\/(.+)$/)
        if (match) await db.storage.from('demo-files').remove([match[1]])
      } catch { /* skip */ }
    }

    await db.from('demo_messages').delete().eq('id', message_id)
    await broadcastToRoom(msg.room_id)
    return NextResponse.json({ ok: true })
  }

  if (!room_id) return NextResponse.json({ error: 'Missing room_id' }, { status: 400 })

  // Bulk-room delete: require an authenticated session and room membership
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membership } = await db
    .from('demo_room_members')
    .select('user_id')
    .eq('room_id', room_id)
    .eq('user_id', sessionUser.id)
    .single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.from('demo_messages').delete().eq('room_id', room_id)
  return NextResponse.json({ ok: true })
}
