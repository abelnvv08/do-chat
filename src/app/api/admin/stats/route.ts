import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminSupabase } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const adminId = await requireAdmin(req)
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = adminSupabase()
  const now = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const week = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
  const month = new Date(now.getTime() - 30 * 24 * 3600 * 1000)

  const [
    totalUsersRes,
    activeTodayRes,
    activeWeekRes,
    activeMonthRes,
    msgsTodayRes,
    msgsWeekRes,
    aiTodayRes,
    filesRes,
    newUsersWeekRes,
    proUsersRes,
    businessUsersRes,
  ] = await Promise.all([
    db.from('demo_profiles').select('id', { count: 'exact', head: true }),
    db.from('demo_messages').select('user_id', { count: 'exact', head: true }).eq('type', 'text').gte('created_at', today.toISOString()),
    db.from('demo_messages').select('user_id', { count: 'exact', head: true }).eq('type', 'text').gte('created_at', week.toISOString()),
    db.from('demo_messages').select('user_id', { count: 'exact', head: true }).eq('type', 'text').gte('created_at', month.toISOString()),
    db.from('demo_messages').select('id', { count: 'exact', head: true }).eq('type', 'text').gte('created_at', today.toISOString()),
    db.from('demo_messages').select('id', { count: 'exact', head: true }).in('type', ['text', 'ai']).gte('created_at', week.toISOString()),
    db.from('demo_messages').select('id', { count: 'exact', head: true }).eq('type', 'ai').gte('created_at', today.toISOString()),
    db.from('demo_messages').select('id', { count: 'exact', head: true }).in('type', ['file', 'image', 'audio']),
    db.from('demo_profiles').select('id', { count: 'exact', head: true }).gte('created_at', week.toISOString()),
    db.from('demo_profiles').select('id', { count: 'exact', head: true }).eq('plan', 'pro'),
    db.from('demo_profiles').select('id', { count: 'exact', head: true }).eq('plan', 'business'),
  ])

  // Daily messages for last 7 days
  const { data: dailyRaw } = await db
    .from('demo_messages')
    .select('created_at, type')
    .in('type', ['text', 'ai'])
    .gte('created_at', week.toISOString())
    .order('created_at')

  const dailyMap: Record<string, { text: number; ai: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000)
    const key = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })
    dailyMap[key] = { text: 0, ai: 0 }
  }
  for (const m of dailyRaw ?? []) {
    const d = new Date(m.created_at)
    const key = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })
    if (dailyMap[key]) {
      if (m.type === 'text') dailyMap[key].text++
      else if (m.type === 'ai') dailyMap[key].ai++
    }
  }
  const daily = Object.entries(dailyMap).map(([day, counts]) => ({ day, ...counts }))

  const proCount = proUsersRes.count ?? 0
  const businessCount = businessUsersRes.count ?? 0
  const mrr = proCount * 12.99 + businessCount * 29.99

  return NextResponse.json({
    totalUsers: totalUsersRes.count ?? 0,
    activeToday: activeTodayRes.count ?? 0,
    activeWeek: activeWeekRes.count ?? 0,
    activeMonth: activeMonthRes.count ?? 0,
    msgsToday: msgsTodayRes.count ?? 0,
    msgsWeek: msgsWeekRes.count ?? 0,
    aiToday: aiTodayRes.count ?? 0,
    filesStored: filesRes.count ?? 0,
    newUsersWeek: newUsersWeekRes.count ?? 0,
    proUsers: proCount,
    businessUsers: businessCount,
    mrr,
    daily,
  })
}
