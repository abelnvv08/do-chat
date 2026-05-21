import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Update own last_seen
export async function POST(req: NextRequest) {
  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  await admin().from('demo_profiles').update({ last_seen: new Date().toISOString() }).eq('id', user_id)
  return NextResponse.json({ ok: true })
}

// Get another user's last_seen
export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get('user_id')
  if (!user_id) return NextResponse.json({ last_seen: null })
  const { data } = await admin().from('demo_profiles').select('last_seen').eq('id', user_id).single()
  return NextResponse.json({ last_seen: data?.last_seen ?? null })
}
