import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const STORAGE_LIMITS: Record<string, number> = {
  free:     2   * 1024 * 1024 * 1024,  // 2 GB
  pro:      100 * 1024 * 1024 * 1024,  // 100 GB
  business: 500 * 1024 * 1024 * 1024,  // 500 GB (MAX plan)
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const userId = formData.get('user_id') as string
  const roomId = (formData.get('room_id') as string) || 'group'

  if (!file || !userId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = admin()

  // Get user plan
  const { data: profile } = await supabase.from('demo_profiles').select('plan').eq('id', userId).single()
  const plan = (profile?.plan ?? 'free') as string
  const limit = STORAGE_LIMITS[plan] ?? STORAGE_LIMITS.free

  // Calculate current storage used (sum of all file sizes for this user)
  const { data: fileMessages } = await supabase
    .from('demo_messages')
    .select('content, type')
    .eq('user_id', userId)
    .in('type', ['file', 'image', 'audio'])

  let usedBytes = 0
  for (const msg of fileMessages ?? []) {
    if (msg.type === 'file') {
      try { usedBytes += JSON.parse(msg.content).size ?? 0 } catch { /* skip */ }
    }
  }

  if (usedBytes + file.size > limit) {
    const usedGB = (usedBytes / (1024 ** 3)).toFixed(2)
    const limitGB = (limit / (1024 ** 3)).toFixed(0)
    return NextResponse.json(
      { error: `Límite de almacenamiento alcanzado (${usedGB} GB de ${limitGB} GB usados). Elimina archivos para liberar espacio.` },
      { status: 413 }
    )
  }

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${roomId}/${userId}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from('demo-files')
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('demo-files').getPublicUrl(path)

  const isImage = file.type.startsWith('image/')
  const isAudio = file.type.startsWith('audio/')
  const type = isImage ? 'image' : isAudio ? 'audio' : 'file'
  const content = isImage ? publicUrl : isAudio ? publicUrl : JSON.stringify({ url: publicUrl, name: file.name, size: file.size })

  const { data: msg } = await supabase
    .from('demo_messages')
    .insert({ user_id: userId, content, type, room_id: roomId })
    .select('*, user:demo_profiles(*)')
    .single()

  return NextResponse.json({ message: msg })
}
