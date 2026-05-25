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

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = sessionUser.id
  const db = admin()

  // Personal tasks (all of mine, regardless of source)
  const { data: tasks } = await db
    .from('demo_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('task_status', 'personal')
    .order('created_at', { ascending: false })

  // Tasks assigned TO me (new system: assigned_to field)
  const { data: receivedNew } = await db
    .from('demo_tasks')
    .select('*')
    .eq('assigned_to', userId)
    .order('created_at', { ascending: false })

  // Tasks received via old invite system (source_room starts with 'invite|')
  const { data: receivedOld } = await db
    .from('demo_tasks')
    .select('*')
    .eq('user_id', userId)
    .like('source_room', 'invite|%')
    .order('created_at', { ascending: false })

  // Merge received, deduplicate by id
  type TaskRow = NonNullable<typeof receivedNew>[number]
  const receivedMap = new Map<string, TaskRow>()
  for (const t of [...(receivedNew ?? []), ...(receivedOld ?? [])]) receivedMap.set(t.id, t)
  const received = [...receivedMap.values()].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // Tasks I sent (new system: assigned_by field)
  const { data: sentNew } = await db
    .from('demo_tasks')
    .select('*')
    .eq('assigned_by', userId)
    .order('created_at', { ascending: false })

  // Tasks sent via old invite system (source_room starts with 'sent-invite|')
  const { data: sentOld } = await db
    .from('demo_tasks')
    .select('*')
    .eq('user_id', userId)
    .like('source_room', 'sent-invite|%')
    .order('created_at', { ascending: false })

  // Merge sent, deduplicate by id
  const sentMap = new Map<string, TaskRow>()
  for (const t of [...(sentNew ?? []), ...(sentOld ?? [])]) sentMap.set(t.id, t)
  const sent = [...sentMap.values()].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return NextResponse.json({
    tasks: tasks ?? [],
    received: received ?? [],
    sent: sent ?? [],
  })
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user_id, content, source_room, due_date, assigned_to, assigned_by, assigned_by_name, assigned_by_emoji, assigned_to_name } = await req.json()
  if (!user_id || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (sessionUser.id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

  // Send push notification to assignee (forward session cookies so task-notify can authenticate)
  if (isAssignment && assigned_to && data) {
    const cookieHeader = req.headers.get('cookie') ?? ''
    fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getdochat.com'}/api/chat/task-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
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
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, done, due_date, action, evidence_url, evidence_name, user_id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = admin()

  // Fetch task to verify ownership before mutating
  const { data: existingTask } = await db.from('demo_tasks').select('user_id, assigned_to').eq('id', id).single()
  if (!existingTask) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'accept' || action === 'reject' || action === 'complete') {
    // Only the person assigned to the task can accept/reject/complete it
    if (existingTask.assigned_to !== sessionUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else {
    // For done/due_date toggles: must be the task owner
    if (user_id && sessionUser.id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (existingTask.user_id !== sessionUser.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const db = admin()
  const { data: task } = await db.from('demo_tasks').select('user_id, assigned_to').eq('id', id).single()
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (task.user_id !== sessionUser.id && task.assigned_to !== sessionUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await db.from('demo_tasks').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
