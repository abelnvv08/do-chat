import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function getAuthUser(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()
  const userId = user.id

  // Get all rooms this user is a member of
  const { data: memberships } = await db.from('demo_room_members').select('room_id').eq('user_id', userId)
  const roomIds = (memberships ?? []).map((m: any) => m.room_id)

  // Delete user's messages from all rooms
  await db.from('demo_messages').delete().eq('user_id', userId)

  // Delete rooms the user created (and that have no other members)
  if (roomIds.length) {
    const { data: otherMembers } = await db
      .from('demo_room_members')
      .select('room_id')
      .in('room_id', roomIds)
      .neq('user_id', userId)
    const roomsWithOthers = new Set((otherMembers ?? []).map((m: any) => m.room_id))
    const soloRooms = roomIds.filter(id => !roomsWithOthers.has(id))
    if (soloRooms.length) await db.from('demo_rooms').delete().in('id', soloRooms)
  }

  // Delete user's tasks, reminders, projects, contacts, reactions
  await Promise.all([
    db.from('demo_tasks').delete().eq('user_id', userId),
    db.from('demo_reminders').delete().eq('user_id', userId),
    db.from('demo_projects').delete().eq('user_id', userId),
    db.from('demo_contacts').delete().eq('user_id', userId),
    db.from('demo_reactions').delete().eq('user_id', userId),
    db.from('demo_room_members').delete().eq('user_id', userId),
    db.from('demo_reads').delete().eq('user_id', userId),
  ])

  // Delete profile
  await db.from('demo_profiles').delete().eq('id', userId)

  // Delete auth user
  await db.auth.admin.deleteUser(userId)

  return NextResponse.json({ ok: true })
}

// Export user data
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()
  const userId = user.id

  const [profile, messages, tasks, reminders, projects] = await Promise.all([
    db.from('demo_profiles').select('*').eq('id', userId).single(),
    db.from('demo_messages').select('content, type, room_id, created_at').eq('user_id', userId).order('created_at'),
    db.from('demo_tasks').select('content, done, due_date, created_at').eq('user_id', userId),
    db.from('demo_reminders').select('content, remind_at, created_at').eq('user_id', userId),
    db.from('demo_projects').select('title, content, created_at').eq('user_id', userId),
  ])

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    profile: profile.data,
    messages: messages.data ?? [],
    tasks: tasks.data ?? [],
    reminders: reminders.data ?? [],
    projects: projects.data ?? [],
  })
}
