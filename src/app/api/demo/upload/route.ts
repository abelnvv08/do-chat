import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const userId = formData.get('user_id') as string
  const roomId = (formData.get('room_id') as string) || 'group'

  if (!file || !userId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = admin()
  const ext = file.name.split('.').pop()
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
