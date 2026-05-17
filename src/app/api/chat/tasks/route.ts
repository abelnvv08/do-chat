import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ tasks: [], received: [], sent: [] })
  const db = admin()

  // Personal tasks
  const { data: tasks } = await db
    .from('demo_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('task_status', 'personal')
    .not('source_room', 'like', 'invite|%')
    .not('source_room', 'like', 'sent-invite|%')
    .order('created_at', { ascending: false })

  // Tasks assigned TO me (I need to accept/complete)
  const { data: received } = await db
    .from('demo_tasks')
    .select('*')
    .eq('assigned_to', userId)
    .order('created_at', { ascending: false })

  // Tasks I sent to others
  const { data: sent } = await db
    .from('demo_tasks')
    .select('*')
    .eq('assigned_by', userId)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    tasks: tasks ?? [],
    received: received ?? [],
    sent: sent ?? [],
  })
}

export async function POST(req: NextRequest) {
  const { user_id, content, source_room, due_date, assigned_to, assigned_by, assigned_by_name, assigned_by_emoji, assigned_to_name } = await req.json()
  if (!user_id || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const isAssignment = !!assigned_to
  const { data } = await admin()
    .from('demo_tasks')
    .insert({
      user_id: isAssignment ? assigned_to : user_id,
      content,
      source_room: source_room ?? null,
      due_date: due_date ?? null,
      assigned_to: assigned_to ?? null,
      assigned_by: assigned_by ?? null,
      assigned_by_name: assigned_by_name ?? null,
      assigned_by_emoji: assigned_by_emoji ?? null,
      assigned_to_name: assigned_to_name ?? null,
      task_status: isAssignment ? 'pending' : 'personal',
    })
    .select()
    .single()

  // Send push notification to assignee
  if (isAssignment && assigned_to && data) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getdochat.com'}/api/chat/task-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_user_id: assigned_to,
        from_name: assigned_by_name ?? 'Alguien',
        task_content: content,
        task_id: data.id,
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ task: data })
}

export async function PATCH(req: NextRequest) {
  const { id, done, due_date, action, evidence_url, evidence_name, user_id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = admin()
  const update: Record<string, unknown> = {}

  if (action === 'accept') {
    update.task_status = 'in_progress'
  } else if (action === 'reject') {
    update.task_status = 'rejected'
  } else if (action === 'complete') {
    update.task_status = 'completed'
    update.done = true
    update.completed_at = new Date().toISOString()
    if (evidence_url) update.evidence_url = evidence_url
    if (evidence_name) update.evidence_name = evidence_name
  } else {
    if (done !== undefined) update.done = done
    if (due_date !== undefined) update.due_date = due_date
  }

  const { data } = await db
    .from('demo_tasks')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  return NextResponse.json({ task: data })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await admin().from('demo_tasks').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
