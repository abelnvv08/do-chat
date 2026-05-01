import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getRoomsForUser, getAIRoom } from '@/lib/demo'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

type RawMessage = {
  content: string
  type: string
  room_id: string
  created_at: string
  user: unknown
}

async function getMessagesFromRoom(roomId: string, limit = 30): Promise<RawMessage[]> {
  const { data } = await admin()
    .from('demo_messages')
    .select('content, type, room_id, created_at, user:demo_users(name)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return ((data || []) as RawMessage[]).reverse()
}

function getSenderName(msg: RawMessage): string {
  if (msg.type === 'ai') return 'do AI'
  return (msg.user as { name: string } | null)?.name ?? 'Usuario'
}

// Construir contenido para Claude incluyendo imágenes
function buildMessageContent(
  textContext: string,
  images: { url: string; sender: string }[]
): Anthropic.Messages.MessageParam['content'] {
  if (images.length === 0) {
    return textContext
  }

  const parts: Anthropic.Messages.ContentBlockParam[] = [
    { type: 'text', text: textContext }
  ]

  for (const img of images.slice(0, 5)) { // máximo 5 imágenes por request
    parts.push({
      type: 'text',
      text: `\nImagen compartida por ${img.sender}:`
    })
    parts.push({
      type: 'image',
      source: { type: 'url', url: img.url }
    })
  }

  return parts
}

export async function POST(req: NextRequest) {
  const { user_id, query, room_id: replyRoomId } = await req.json()
  const supabase = admin()

  const rooms = getRoomsForUser(user_id).filter(r => r.type !== 'ai')
  const allChatsContext: string[] = []
  const allImages: { url: string; sender: string; room: string }[] = []
  const allFiles: { name: string; url: string; sender: string; room: string }[] = []

  for (const room of rooms) {
    const msgs = await getMessagesFromRoom(room.id, 30)
    if (msgs.length === 0) continue

    const lines: string[] = []
    for (const m of msgs) {
      const sender = getSenderName(m)
      if (m.type === 'text' || m.type === 'ai') {
        lines.push(`  [${sender}]: ${m.content}`)
      } else if (m.type === 'image') {
        lines.push(`  [${sender}]: [📷 imagen adjunta]`)
        allImages.push({ url: m.content, sender, room: room.name })
      } else if (m.type === 'file') {
        try {
          const meta = JSON.parse(m.content)
          lines.push(`  [${sender}]: [📎 archivo: ${meta.name} (${Math.round(meta.size / 1024)}KB)]`)
          allFiles.push({ name: meta.name, url: meta.url, sender, room: room.name })
        } catch {
          lines.push(`  [${sender}]: [📎 archivo adjunto]`)
        }
      }
    }

    if (lines.length > 0) {
      allChatsContext.push(`--- ${room.emoji} ${room.name} ---\n${lines.join('\n')}`)
    }
  }

  // Resumen de archivos para el contexto
  const filesContext = allFiles.length > 0
    ? `\n\nARCHIVOS COMPARTIDOS EN LOS CHATS:\n${allFiles.map(f => `- "${f.name}" — enviado por ${f.sender} en ${f.room}`).join('\n')}`
    : ''

  const contextBlock = allChatsContext.length > 0
    ? `CONTEXTO DE TODOS LOS CHATS:\n${allChatsContext.join('\n\n')}${filesContext}`
    : '(No hay mensajes en los chats aún)'

  const systemPrompt = `Eres do, una IA accionable con acceso completo a todos los chats, imágenes y archivos.
Tienes visión — puedes ver y analizar las imágenes que se comparten en los chats.
Puedes leer mensajes, ver imágenes, conocer qué archivos se compartieron, resumir conversaciones, extraer tareas y enviar mensajes.

Cuando el usuario te pide ENVIAR un mensaje, incluye al final:
[ACCION:ENVIAR:room_id:mensaje]

room_ids disponibles: group, dm-001-002, dm-001-003, dm-001-004, dm-002-003, dm-002-004, dm-003-004

Responde en español. Sé directo y útil.`

  // Incluir imágenes en el request si las hay y la query las menciona o es general
  const queryMentionsImages = /imagen|foto|adjunto|archivo|compartió|mandó/i.test(query)
  const imagesToInclude = (queryMentionsImages || allImages.length > 0) ? allImages : []

  const userContent = buildMessageContent(
    `${contextBlock}\n\n---\nSOLICITUD: ${query}`,
    imagesToInclude
  )

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }]
  })

  let reply = response.content[0].type === 'text' ? response.content[0].text : ''

  // Ejecutar acciones de envío
  const actionRegex = /\[ACCION:ENVIAR:([^:]+):([^\]]+)\]/g
  const actions: { roomId: string; message: string }[] = []
  let match

  while ((match = actionRegex.exec(reply)) !== null) {
    actions.push({ roomId: match[1].trim(), message: match[2].trim() })
  }

  reply = reply.replace(/\[ACCION:ENVIAR:[^\]]+\]/g, '').trim()

  for (const action of actions) {
    await supabase.from('demo_messages').insert({
      user_id,
      content: action.message,
      type: 'text',
      room_id: action.roomId,
    })
    const roomNames: Record<string, string> = {
      'group': 'el grupo general',
      'dm-001-002': 'el chat de Abel y Santi',
      'dm-001-003': 'el chat de Abel y Hernan',
      'dm-001-004': 'el chat de Abel y Walter',
      'dm-002-003': 'el chat de Santi y Hernan',
      'dm-002-004': 'el chat de Santi y Walter',
      'dm-003-004': 'el chat de Hernan y Walter',
    }
    reply += `\n\n✅ Mensaje enviado a ${roomNames[action.roomId] ?? action.roomId}.`
  }

  const targetRoom = replyRoomId || getAIRoom(user_id)
  await supabase.from('demo_messages').insert({
    user_id,
    content: reply,
    type: 'ai',
    room_id: targetRoom,
  })

  return NextResponse.json({ reply, actions })
}
