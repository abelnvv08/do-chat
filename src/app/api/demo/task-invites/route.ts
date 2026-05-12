import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Invites are stored in demo_tasks with source_room encoding:
// Received (pending):  source_room = 'invite|{fromId}|{fromName}|{fromEmoji}|{inviteType}'
// Sent (tracking):     source_room = 'sent-invite|{toId}|{toName}|{toEmoji}|{inviteType}'
// remind_at is encoded in content as JSON when invite_type = 'reminder'

const INVITE_PREFIX = 'invite|'
const SENT_PREFIX = 'sent-invite|'

function encodeInviteRoom(fromId: string, fromName: string, fromEmoji: string, inviteType: string) {
  return `${INVITE_PREFIX}${fromId}|${fromName}|${fromEmoji}|${inviteType}`
}
function encodeSentRoom(toId: string, toName: string, toEmoji: string, inviteType: string) {
  return `${SENT_PREFIX}${toId}|${toName}|${toEmoji}|${inviteType}`
}

function parseInviteSource(source: string) {
  const parts = source.split('|')
  return { userId: parts[1], name: parts[2], emoji: parts[3], inviteType: parts[4] ?? 'task' }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ invites: [], sent: [] })

  const db = admin()

  // Received: pending invite tasks for this user
  const { data: receivedData } = await db
    .from('demo_tasks')
    .select('id, content, due_date, created_at, source_room')
    .eq('user_id', userId)
    .like('source_room', `${INVITE_PREFIX}%`)
    .eq('done', false)
    .order('created_at', { ascending: false })

  const invites = (receivedData ?? []).map((t: any) => {
    const meta = parseInviteSource(t.source_room ?? '')
    let content = t.content
    let remind_at: string | null = null
    if (meta.inviteType === 'reminder') {
      try { const p = JSON.parse(t.content); content = p.text; remind_at = p.remind_at } catch { /* keep raw */ }
    }
    return {
      id: t.id,
      created_at: t.created_at,
      from_user_id: meta.userId,
      from_name: meta.name,
      from_emoji: meta.emoji,
      invite_type: meta.inviteType,
      content,
      due_date: t.due_date,
      remind_at,
    }
  })

  // Sent: tracking tasks created by this user
  const { data: sentData } = await db
    .from('demo_tasks')
    .select('id, content, due_date, created_at, source_room')
    .eq('user_id', userId)
    .like('source_room', `${SENT_PREFIX}%`)
    .order('created_at', { ascending: false })

  const sent = (sentData ?? []).map((t: any) => {
    const meta = parseInviteSource(t.source_room ?? '')
    let content = t.content
    let remind_at: string | null = null
    if (meta.inviteType === 'reminder') {
      try { const p = JSON.parse(t.content); content = p.text; remind_at = p.remind_at } catch { /* keep raw */ }
    }
    return {
      id: t.id,
      created_at: t.created_at,
      to_user_id: meta.userId,
      to_name: meta.name,
      to_emoji: meta.emoji,
      invite_type: meta.inviteType,
      content,
      due_date: t.due_date,
      remind_at,
    }
  })

  return NextResponse.json({ invites, sent })
}

export async function POST(req: NextRequest) {
  const { from_user_id, to_user_id, content, invite_type, due_date, remind_at, from_name, from_emoji, to_name, to_emoji } = await req.json()
  if (!from_user_id || !to_user_id || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = admin()
  const type = invite_type ?? 'task'

  // Resolve recipient name/emoji if not passed
  let recipientName = to_name
  let recipientEmoji = to_emoji
  if (!recipientName || !recipientEmoji) {
    const { data: p } = await db.from('demo_profiles').select('name, emoji').eq('id', to_user_id).single()
    recipientName = p?.name ?? 'Usuario'
    recipientEmoji = p?.emoji ?? '👤'
  }

  const taskContent = type === 'reminder'
    ? JSON.stringify({ text: content, remind_at: remind_at ?? null })
    : content

  // 1. Create pending invite task for recipient
  await db.from('demo_tasks').insert({
    user_id: to_user_id,
    content: taskContent,
    due_date: type === 'task' ? (due_date ?? null) : null,
    done: false,
    source_room: encodeInviteRoom(from_user_id, from_name ?? 'Usuario', from_emoji ?? '👤', type),
  })

  // 2. Create sent-tracking task for sender (done=true so it doesn't pollute their task list)
  await db.from('demo_tasks').insert({
    user_id: from_user_id,
    content: taskContent,
    due_date: type === 'task' ? (due_date ?? null) : null,
    done: true,
    source_room: encodeSentRoom(to_user_id, recipientName, recipientEmoji, type),
  })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const { id, action, user_id } = await req.json()
  if (!id || !action || !user_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = admin()

  if (action === 'accept') {
    const { data: task } = await db.from('demo_tasks').select('content, due_date, source_room').eq('id', id).single()
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const meta = parseInviteSource(task.source_room ?? '')

    if (meta.inviteType === 'reminder') {
      try {
        const p = JSON.parse(task.content)
        await db.from('demo_reminders').insert({
          user_id,
          content: p.text ?? task.content,
          remind_at: p.remind_at ?? new Date(Date.now() + 3600000).toISOString(),
        })
      } catch { /* fallback: add as task */ }
      await db.from('demo_tasks').delete().eq('id', id)
    } else {
      // Convert pending invite → real task by clearing the invite source_room
      await db.from('demo_tasks').update({ source_room: null }).eq('id', id)
    }
  } else {
    // reject: delete the pending invite task
    await db.from('demo_tasks').delete().eq('id', id)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await admin().from('demo_tasks').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
