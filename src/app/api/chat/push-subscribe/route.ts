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

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user_id, subscription } = await req.json()
  if (!user_id || !subscription) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (sessionUser.id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await admin()
    .from('demo_push_subscriptions')
    .upsert({ user_id, subscription }, { onConflict: 'user_id' })
  return NextResponse.json({ ok: true })
}
