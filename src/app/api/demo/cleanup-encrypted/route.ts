import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function isEncrypted(content: string) {
  try { const p = JSON.parse(content); return p?.v === 1 && !!p?.iv && !!p?.ct } catch { return false }
}

export async function POST(req: NextRequest) {
  const { room_id } = await req.json()
  if (!room_id) return NextResponse.json({ ok: false })

  const supabase = admin()
  const { data: messages } = await supabase
    .from('demo_messages')
    .select('id, content')
    .eq('room_id', room_id)
    .eq('type', 'text')

  const toUpdate = (messages ?? []).filter(m => isEncrypted(m.content))
  if (toUpdate.length === 0) return NextResponse.json({ ok: true, updated: 0 })

  for (const msg of toUpdate) {
    await supabase
      .from('demo_messages')
      .update({ content: 'Mensaje anterior' })
      .eq('id', msg.id)
  }

  return NextResponse.json({ ok: true, updated: toUpdate.length })
}
