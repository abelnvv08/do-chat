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
  const formData = await req.formData()
  const file = formData.get('file') as File
  const userId = formData.get('user_id') as string

  if (!file || !userId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (sessionUser.id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Solo imágenes' }, { status: 400 })

  const db = admin()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `avatars/${userId}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error } = await db.storage
    .from('demo-files')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = db.storage.from('demo-files').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
