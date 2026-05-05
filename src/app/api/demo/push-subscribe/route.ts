import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { user_id, subscription } = await req.json()
  if (!user_id || !subscription) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  await admin()
    .from('demo_push_subscriptions')
    .upsert({ user_id, subscription }, { onConflict: 'user_id' })
  return NextResponse.json({ ok: true })
}
