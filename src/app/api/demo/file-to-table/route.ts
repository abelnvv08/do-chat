import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { parseFile } from '@/lib/file-parser'
import { broadcastToRoom } from '@/lib/realtime-broadcast'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { file_url, file_name, room_id, user_id } = await req.json()
  if (!file_url || !file_name || !room_id || !user_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const fileContent = await parseFile(file_url, file_name)
  if (!fileContent) {
    return NextResponse.json({ error: 'No se pudo leer el archivo' }, { status: 422 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Convierte el siguiente contenido de "${file_name}" en una tabla markdown clara y ordenada. Si ya tiene estructura tabular, formateála bien. Si es texto, extrae los datos más relevantes en columnas lógicas. Solo devuelve la tabla (o tablas si hay varias hojas), sin explicación extra.\n\n${fileContent}`,
    }],
  })

  const reply = (message.content[0] as { text: string }).text.trim()

  await admin().from('demo_messages').insert({
    user_id,
    content: reply,
    type: 'ai',
    room_id,
  })

  await broadcastToRoom(room_id)

  return NextResponse.json({ ok: true })
}
