import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Invites are stored as demo_messages in a special room 'invites-{toUserId}'
// so they never appear in any chat UI
const inviteRoom = (userId: string) => `invites-${userId}`

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ invites: [] })

  const db = admin()
  const { data } = await db
    .from('demo_messages')
    .select('id, content, created_at, user_id')
    .eq('room_id', inviteRoom(userId))
    .eq('type', 'task_invite')
    .order('created_at', { ascending: false })

  const invites = (data ?? []).map((m: any) => {
    try {
      const parsed = JSON.parse(m.content)
      return { id: m.id, created_at: m.created_at, ...parsed }
    } catch { return null }
  }).filter(Boolean)

  return NextResponse.json({ invites })
}

export async function POST(req: NextRequest) {
  const { from_user_id, to_user_id, content, invite_type, due_date, remind_at, from_name, from_emoji } = await req.json()
  if (!from_user_id || !to_user_id || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = admin()
  const payload = JSON.stringify({ from_user_id, from_name, from_emoji, content, invite_type: invite_type ?? 'task', due_date: due_date ?? null, remind_at: remind_at ?? null })

  await db.from('demo_messages').insert({
    user_id: from_user_id,
    content: payload,
    type: 'task_invite',
    room_id: inviteRoom(to_user_id),
  })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const { id, action, user_id } = await req.json()
  if (!id || !action || !user_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = admin()

  if (action === 'accept') {
    // Fetch invite content
    const { data: msg } = await db.from('demo_messages').select('content').eq('id', id).single()
    if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    try {
      const invite = JSON.parse(msg.content)
      if (invite.invite_type === 'reminder') {
        await db.from('demo_reminders').insert({
          user_id,
          content: invite.content,
          remind_at: invite.remind_at ?? new Date(Date.now() + 3600000).toISOString(),
        })
      } else {
        await db.from('demo_tasks').insert({
          user_id,
          content: invite.content,
          due_date: invite.due_date ?? null,
          source_room: null,
        })
      }
    } catch { return NextResponse.json({ error: 'Invalid invite' }, { status: 400 }) }
  }

  // Delete the invite message regardless of accept/reject
  await db.from('demo_messages').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
