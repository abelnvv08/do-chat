import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ tasks: [] })
  const { data } = await admin()
    .from('demo_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return NextResponse.json({ tasks: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { user_id, content, source_room, due_date } = await req.json()
  if (!user_id || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const { data } = await admin()
    .from('demo_tasks')
    .insert({ user_id, content, source_room, due_date: due_date ?? null })
    .select()
    .single()
  return NextResponse.json({ task: data })
}

export async function PATCH(req: NextRequest) {
  const { id, done, due_date } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const update: Record<string, unknown> = { done }
  if (due_date !== undefined) update.due_date = due_date
  const { data } = await admin()
    .from('demo_tasks')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  return NextResponse.json({ task: data })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await admin().from('demo_tasks').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
