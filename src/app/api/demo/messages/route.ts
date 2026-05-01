import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room') || 'group'
  const { data } = await admin()
    .from('demo_messages')
    .select('*, user:demo_users(*)')
    .eq('room_id', room)
    .order('created_at', { ascending: true })
    .limit(100)
  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { user_id, content, type = 'text', room_id = 'group' } = await req.json()
  if (!user_id || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data } = await admin()
    .from('demo_messages')
    .insert({ user_id, content, type, room_id })
    .select('*, user:demo_users(*)')
    .single()

  return NextResponse.json({ message: data })
}
