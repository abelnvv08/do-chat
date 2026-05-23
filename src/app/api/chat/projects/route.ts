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

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await admin()
    .from('demo_projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return NextResponse.json({ projects: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, content, type, project_files, instructions } = await req.json()
  const { data } = await admin()
    .from('demo_projects')
    .insert({ user_id: user.id, title: title || 'Proyecto', content: content ?? '', type: type ?? 'report', project_files: project_files ?? [], instructions: instructions ?? '' })
    .select()
    .single()
  return NextResponse.json({ project: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, title, instructions, project_files } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Verify ownership
  const { data: existing } = await admin().from('demo_projects').select('user_id').eq('id', id).single()
  if (!existing || existing.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title
  if (instructions !== undefined) updates.instructions = instructions
  if (project_files !== undefined) updates.project_files = project_files
  const { data } = await admin().from('demo_projects').update(updates).eq('id', id).select().single()
  return NextResponse.json({ project: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Verify ownership
  const { data: existing } = await admin().from('demo_projects').select('user_id').eq('id', id).single()
  if (!existing || existing.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await admin().from('demo_projects').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
