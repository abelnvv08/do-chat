import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
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

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const phone = req.nextUrl.searchParams.get('phone') ?? ''
  const exclude = req.nextUrl.searchParams.get('exclude') ?? ''

  const db = admin()

  const email = req.nextUrl.searchParams.get('email') ?? ''

  const username = req.nextUrl.searchParams.get('username') ?? ''

  // Exact username lookup (for add contact flow)
  if (username) {
    const clean = username.toLowerCase().replace(/^@/, '').trim()
    let query = db.from('demo_profiles').select('id, name, username, emoji, bg').eq('username', clean)
    if (exclude) query = query.neq('id', exclude)
    const { data } = await query.single()
    return NextResponse.json({ user: data ?? null })
  }

  // Exact email lookup (for add contact flow)
  if (email) {
    const { data: authUsers } = await db.auth.admin.listUsers()
    const matched = (authUsers?.users ?? []).find(u => u.email?.toLowerCase() === email.toLowerCase() && u.id !== exclude)
    if (!matched) return NextResponse.json({ user: null })
    const { data: profile } = await db.from('demo_profiles').select('id, name, emoji, bg').eq('id', matched.id).single()
    return NextResponse.json({ user: profile ?? null })
  }

  // Exact phone lookup (for add contact flow)
  if (phone) {
    let query = db.from('demo_profiles').select('id, name, emoji, bg, phone').eq('phone', phone)
    if (exclude) query = query.neq('id', exclude)
    const { data } = await query.single()
    return NextResponse.json({ user: data ?? null })
  }

  if (!q || q.length < 1) return NextResponse.json({ users: [] })

  const user_id = req.nextUrl.searchParams.get('user_id') ?? ''
  let query = db.from('demo_profiles').select('id, name, username, emoji, bg').or(`name.ilike.%${q}%,username.ilike.%${q}%`)
  if (user_id) query = query.neq('id', user_id)

  const { data, error } = await query.limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data ?? [] })
}
