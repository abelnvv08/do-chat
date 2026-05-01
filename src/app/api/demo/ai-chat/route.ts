import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getRoomsForUser, getDMRoom, getAIRoom } from '@/lib/demo'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function getMessagesFromRoom(roomId: string, limit = 30) {
  const { data } = await admin()
    .from('demo_messages')
    .select('content, type, room_id, created_at, user:demo_users(name)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data || []).reverse()
}

export async function POST(req: NextRequest) {
  const { user_id, query, room_id: replyRoomId } = await req.json()
  const supabase = admin()

  // Cargar todos los chats del usuario para contexto
  const rooms = getRoomsForUser(user_id).filter(r => r.type !== 'ai')
  const allChatsContext: string[] = []

  for (const room of rooms) {
    const msgs = await getMessagesFromRoom(room.id, 20)
    if (msgs.length === 0) continue
    const formatted = msgs
      .filter(m => m.type === 'text' || m.type === 'ai')
      .map(m => `  [${(m.user as unknown as { name: string } | null)?.name ?? 'do AI'}]: ${m.content}`)
      .join('\n')
    if (formatted) allChatsContext.push(`--- ${room.emoji} ${room.name} ---\n${formatted}`)
  }

  const contextBlock = allChatsContext.length > 0
    ? `\nCONTEXTO DE TODOS LOS CHATS:\n${allChatsContext.join('\n\n')}`
    : '\n(No hay mensajes en los otros chats aún)'

  // Detectar si quiere enviar mensajes
  const lowerQuery = query.toLowerCase()
  const wantsToSend = lowerQuery.includes('manda') || lowerQuery.includes('envía') || lowerQuery.includes('escribe') || lowerQuery.includes('dile')

  const systemPrompt = `Eres do, una IA accionable con acceso completo a todos los chats de esta conversación.
Puedes leer todos los mensajes, resumir conversaciones, extraer tareas, buscar archivos y enviar mensajes.

Cuando el usuario te pide que ENVÍES un mensaje a alguien o a todos, incluye al final de tu respuesta:
[ACCION:ENVIAR:room_id:mensaje]

Los room_ids disponibles son:
- group (grupo general)
- dm-001-002 (directo entre 001 y 002)
- dm-001-003 (directo entre 001 y 003)
- dm-002-003 (directo entre 002 y 003)

Ejemplo: si te piden "manda un mensaje a todos diciéndoles que hay junta mañana", responde normalmente y al final agrega:
[ACCION:ENVIAR:group:Hay junta mañana]

Responde siempre en español. Sé directo y accionable.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `${contextBlock}\n\n---\nSOLICITUD: ${query}`
    }]
  })

  let reply = response.content[0].type === 'text' ? response.content[0].text : ''

  // Ejecutar acciones si las hay
  const actionRegex = /\[ACCION:ENVIAR:([^:]+):([^\]]+)\]/g
  const actions: { roomId: string; message: string }[] = []
  let match

  while ((match = actionRegex.exec(reply)) !== null) {
    actions.push({ roomId: match[1].trim(), message: match[2].trim() })
  }

  // Limpiar los tags de acción de la respuesta
  reply = reply.replace(/\[ACCION:ENVIAR:[^\]]+\]/g, '').trim()

  // Ejecutar envíos
  for (const action of actions) {
    await supabase.from('demo_messages').insert({
      user_id,
      content: action.message,
      type: 'text',
      room_id: action.roomId,
    })
    reply += `\n\n✅ Mensaje enviado a ${action.roomId === 'group' ? 'el grupo' : action.roomId}.`
  }

  // Guardar respuesta en el chat donde se invocó (o en el AI room por defecto)
  const targetRoom = replyRoomId || getAIRoom(user_id)
  await supabase.from('demo_messages').insert({
    user_id,
    content: reply,
    type: 'ai',
    room_id: targetRoom,
  })

  return NextResponse.json({ reply, actions })
}
