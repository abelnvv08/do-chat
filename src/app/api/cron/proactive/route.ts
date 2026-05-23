import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { broadcastToRoom } from '@/lib/realtime-broadcast'
import { decrypt, encrypt } from '@/lib/encryption'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Vercel cron calls this with a secret header
function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false  // fail-closed: no secret = no access
  return auth === `Bearer ${secret}`
}

async function getRecentMessages(db: ReturnType<typeof admin>, roomId: string, hours = 24) {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString()
  const { data } = await db.from('demo_messages')
    .select('content, type, user_id, created_at')
    .eq('room_id', roomId)
    .gte('created_at', since)
    .in('type', ['text', 'ai'])
    .order('created_at', { ascending: true })
    .limit(40)
  return await Promise.all((data ?? []).map(async (m: any) => ({
    ...m,
    content: (m.type === 'text' || m.type === 'ai') ? await decrypt(m.content) : m.content,
  })))
}

async function analyzeAndNotify(db: ReturnType<typeof admin>, userId: string) {
  const aiRoomId = `ai-${userId}`

  // Get last proactive message time to avoid spamming
  const { data: lastMsg } = await db.from('demo_messages')
    .select('created_at').eq('room_id', aiRoomId).eq('type', 'ai')
    .order('created_at', { ascending: false }).limit(1).single()

  if (lastMsg) {
    const lastTime = new Date(lastMsg.created_at).getTime()
    const hoursSinceLast = (Date.now() - lastTime) / 3600000
    if (hoursSinceLast < 6) return // don't disturb if recently active
  }

  // Load all user rooms
  const { data: memberships } = await db.from('demo_room_members')
    .select('room_id, demo_rooms(id, name, type, emoji)')
    .eq('user_id', userId)

  const rooms = ((memberships ?? []).map((m: any) => {
    const r = Array.isArray(m.demo_rooms) ? m.demo_rooms[0] : m.demo_rooms
    return r && r.type !== 'ai' ? { id: r.id, name: r.name ?? r.id, emoji: r.emoji ?? '💬' } : null
  }).filter(Boolean)) as { id: string; name: string; emoji: string }[]

  if (rooms.length === 0) return

  // Gather recent activity
  const chatSummaries: string[] = []
  for (const room of rooms.slice(0, 6)) {
    const msgs = await getRecentMessages(db, room.id)
    if (!msgs.length) continue
    const lines = msgs.map((m: any) => `  [${m.type === 'ai' ? 'do AI' : 'usuario'}]: ${(m.content as string).slice(0, 200)}`).join('\n')
    chatSummaries.push(`--- ${room.emoji} ${room.name} ---\n${lines}`)
  }

  if (chatSummaries.length === 0) return

  // Load pending tasks and upcoming reminders
  const { data: tasks } = await db.from('demo_tasks')
    .select('content, due_date').eq('user_id', userId).eq('done', false)
    .not('source_room', 'like', 'invite|%').not('source_room', 'like', 'sent-invite|%')
    .order('due_date', { ascending: true }).limit(10)

  const { data: reminders } = await db.from('demo_reminders')
    .select('content, remind_at').eq('user_id', userId)
    .gte('remind_at', new Date().toISOString())
    .order('remind_at', { ascending: true }).limit(5)

  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const taskBlock = tasks?.length
    ? `TAREAS PENDIENTES:\n${tasks.map((t: any) => `  - ${t.content}${t.due_date ? ` (vence: ${t.due_date})` : ''}`).join('\n')}`
    : ''
  const reminderBlock = reminders?.length
    ? `PRÓXIMOS RECORDATORIOS:\n${reminders.map((r: any) => `  - ${r.content} (${new Date(r.remind_at).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})`).join('\n')}`
    : ''

  const context = [
    `Fecha: ${today}`,
    chatSummaries.join('\n\n'),
    taskBlock,
    reminderBlock,
  ].filter(Boolean).join('\n\n')

  const prompt = `Eres "do", el asistente proactivo de DO Chat. Analizas la actividad reciente del usuario y le das un brief útil sin que te lo pida.

CONTEXTO DEL USUARIO:
${context}

Tu tarea: escribe un brief proactivo corto (máximo 200 palabras) que:
1. Destaque 1-2 cosas importantes que pasaron en los chats en las últimas 24h
2. Alerte sobre compromisos pendientes o conversaciones sin respuesta que requieran atención
3. Mencione las tareas o recordatorios más urgentes
4. Sea directo, útil y no invasivo — solo lo que realmente vale la pena destacar

Si no hay nada relevante que decir, responde exactamente: SKIP

No uses saludos genéricos. Ve directo al punto. Usa bullet points si hay varios temas.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content.find(b => b.type === 'text') as Anthropic.TextBlock | undefined
  const reply = text?.text?.trim() ?? ''

  if (!reply || reply === 'SKIP' || reply.startsWith('SKIP')) return

  await db.from('demo_messages').insert({
    user_id: userId,
    content: await encrypt(reply),
    type: 'ai',
    room_id: aiRoomId,
  })
  await broadcastToRoom(aiRoomId)
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()

  // Get users active in the last 48h
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  const { data: activeUsers } = await db.from('demo_messages')
    .select('user_id').gte('created_at', since).eq('type', 'text')
    .not('user_id', 'is', null).limit(500)

  const userIds = [...new Set((activeUsers ?? []).map((m: any) => m.user_id as string))]

  let processed = 0
  let skipped = 0

  for (const userId of userIds) {
    try {
      await analyzeAndNotify(db, userId)
      processed++
    } catch (err) {
      console.error(`Proactive agent failed for ${userId}:`, err)
      skipped++
    }
  }

  return NextResponse.json({ ok: true, processed, skipped, total: userIds.length })
}
