import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ reminders: [] })
  const { data } = await admin()
    .from('demo_reminders')
    .select('*')
    .eq('user_id', userId)
    .eq('done', false)
    .order('remind_at', { ascending: true })
  return NextResponse.json({ reminders: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { user_id, content, remind_at } = await req.json()
  if (!user_id || !content || !remind_at) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const { data } = await admin()
    .from('demo_reminders')
    .insert({ user_id, content, remind_at })
    .select()
    .single()
  return NextResponse.json({ reminder: data })
}

export async function PATCH(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await admin().from('demo_reminders').update({ done: true }).eq('id', id)
  return NextResponse.json({ ok: true })
}
