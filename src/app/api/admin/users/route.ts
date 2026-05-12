import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function requireAdmin(req: NextRequest): Promise<string | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const allowed = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (!allowed.includes(user.id)) return null
  return user.id
}

export async function GET(req: NextRequest) {
  const adminId = await requireAdmin(req)
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = admin()
  const search = req.nextUrl.searchParams.get('search') ?? ''
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1')
  const limit = 20
  const offset = (page - 1) * limit

  let query = db.from('demo_profiles')
    .select('id, name, phone, emoji, bg, avatar_url, created_at, plan, stripe_subscription_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data: users, count } = await query

  // Get last active + message count for each user
  const userIds = (users ?? []).map((u: any) => u.id)
  const [lastActiveRes, msgCountRes] = await Promise.all([
    userIds.length ? db.from('demo_messages').select('user_id, created_at').in('user_id', userIds).eq('type', 'text').order('created_at', { ascending: false }) : { data: [] },
    userIds.length ? db.from('demo_messages').select('user_id', { count: 'exact' }).in('user_id', userIds).eq('type', 'text') : { data: [] },
  ])

  const lastActiveMap: Record<string, string> = {}
  for (const m of lastActiveRes.data ?? []) {
    if (!lastActiveMap[m.user_id]) lastActiveMap[m.user_id] = m.created_at
  }

  const msgCountMap: Record<string, number> = {}
  for (const u of users ?? []) {
    msgCountMap[u.id] = (lastActiveRes.data ?? []).filter((m: any) => m.user_id === u.id).length
  }

  const enriched = (users ?? []).map((u: any) => ({
    ...u,
    lastActive: lastActiveMap[u.id] ?? null,
    messageCount: msgCountMap[u.id] ?? 0,
  }))

  return NextResponse.json({ users: enriched, total: count ?? 0, page, limit })
}

export async function DELETE(req: NextRequest) {
  const adminId = await requireAdmin(req)
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  if (user_id === adminId) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  const db = admin()

  await Promise.all([
    db.from('demo_messages').delete().eq('user_id', user_id),
    db.from('demo_tasks').delete().eq('user_id', user_id),
    db.from('demo_reminders').delete().eq('user_id', user_id),
    db.from('demo_projects').delete().eq('user_id', user_id),
    db.from('demo_contacts').delete().eq('user_id', user_id),
    db.from('demo_reactions').delete().eq('user_id', user_id),
    db.from('demo_room_members').delete().eq('user_id', user_id),
    db.from('demo_reads').delete().eq('user_id', user_id),
  ])
  await db.from('demo_profiles').delete().eq('id', user_id)
  await db.auth.admin.deleteUser(user_id)

  return NextResponse.json({ ok: true })
}
