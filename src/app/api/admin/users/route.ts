import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminSupabase } from '@/lib/admin-auth'

const VALID_PLANS = ['free', 'pro', 'business'] as const
type Plan = typeof VALID_PLANS[number]

export async function GET(req: NextRequest) {
  const adminId = await requireAdmin(req)
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = adminSupabase()
  const search = req.nextUrl.searchParams.get('search') ?? ''
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1')
  const limit = 20
  const offset = (page - 1) * limit

  let query = db.from('demo_profiles')
    .select('id, name, phone, emoji, bg, avatar_url, created_at, plan, stripe_subscription_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    // Sanitize search: only allow alphanumeric, spaces, and basic punctuation
    const safeSearch = search.replace(/[^a-zA-Z0-9\s\-_@.+]/g, '').slice(0, 100)
    if (!safeSearch) return NextResponse.json({ users: [] })
    query = query.or(`name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`)
  }

  const { data: users, count } = await query

  // Get last active + message count for each user
  const userIds = (users ?? []).map((u: any) => u.id)
  const [lastActiveRes] = await Promise.all([
    userIds.length
      ? db.from('demo_messages').select('user_id, created_at').in('user_id', userIds).eq('type', 'text').order('created_at', { ascending: false })
      : { data: [] },
  ])

  const lastActiveMap: Record<string, string> = {}
  const msgCountMap: Record<string, number> = {}
  for (const m of lastActiveRes.data ?? []) {
    if (!lastActiveMap[m.user_id]) lastActiveMap[m.user_id] = m.created_at
    msgCountMap[m.user_id] = (msgCountMap[m.user_id] ?? 0) + 1
  }

  const enriched = (users ?? []).map((u: any) => ({
    ...u,
    lastActive: lastActiveMap[u.id] ?? null,
    messageCount: msgCountMap[u.id] ?? 0,
  }))

  return NextResponse.json({ users: enriched, total: count ?? 0, page, limit })
}

export async function PATCH(req: NextRequest) {
  const adminId = await requireAdmin(req)
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id, plan } = await req.json()
  if (!user_id || !plan) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!VALID_PLANS.includes(plan as Plan)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const db = adminSupabase()
  const { error } = await db.from('demo_profiles').update({ plan }).eq('id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const adminId = await requireAdmin(req)
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  if (user_id === adminId) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  const db = adminSupabase()

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
