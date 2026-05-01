import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ projects: [] })
  const { data } = await admin()
    .from('demo_projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return NextResponse.json({ projects: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { user_id, title, content } = await req.json()
  if (!user_id || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const { data } = await admin()
    .from('demo_projects')
    .insert({ user_id, title: title || 'Reporte', content })
    .select()
    .single()
  return NextResponse.json({ project: data })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await admin().from('demo_projects').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
