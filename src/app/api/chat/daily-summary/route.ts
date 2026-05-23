export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import Anthropic from '@anthropic-ai/sdk'
import { getAIRoom } from '@/lib/demo'
import { broadcastToRoom } from '@/lib/realtime-broadcast'

function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol)) return false
    const host = u.hostname
    if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|localhost$)/i.test(host)) return false
    return true
  } catch { return false }
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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function getTodayCalendarEvents(icalUrl: string): Promise<string> {
  try {
    const res = await fetch(icalUrl, { next: { revalidate: 0 } })
    if (!res.ok) return 'No se pudo cargar el calendario.'
    const text = await res.text()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const icalLib = require('node-ical')
    const events = icalLib.parseICS(text) as Record<string, { type: string; start?: Date; summary?: string }>
    const now = new Date()
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
    const todayEvents: string[] = []
    for (const ev of Object.values(events)) {
      if (!ev || ev.type !== 'VEVENT') continue
      const start = ev.start instanceof Date ? ev.start : ev.start ? new Date(String(ev.start)) : null
      if (!start) continue
      if (start >= todayStart && start <= todayEnd) {
        const timeStr = start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        todayEvents.push(`  - ${ev.summary ?? 'Sin título'} (${timeStr})`)
      }
    }
    return todayEvents.length > 0 ? todayEvents.join('\n') : 'Sin eventos hoy.'
  } catch {
    return 'No se pudo cargar el calendario.'
  }
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { user_id, ical_url } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

  if (ical_url && !isSafeUrl(ical_url)) return NextResponse.json({ error: 'Invalid calendar URL' }, { status: 400 })

  const supabase = admin()
  const today = new Date().toISOString().slice(0, 10)
  const aiRoom = getAIRoom(user_id)
  const { data: profileData } = await supabase.from('demo_profiles').select('name').eq('id', user_id).single()
  const userName = profileData?.name ?? 'el usuario'

  // 1. Pending and overdue tasks
  const { data: tasks } = await supabase
    .from('demo_tasks')
    .select('content, done, due_date, created_at')
    .eq('user_id', user_id)
    .eq('done', false)
    .order('due_date', { ascending: true, nullsFirst: false })

  // 2. Today's reminders
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const { data: reminders } = await supabase
    .from('demo_reminders')
    .select('content, remind_at')
    .eq('user_id', user_id)
    .eq('done', false)
    .gte('remind_at', todayStart.toISOString())
    .lte('remind_at', todayEnd.toISOString())

  // 3. Unread messages per room
  const { data: roomMembers } = await supabase.from('demo_room_members').select('room_id, demo_rooms(id, name, type)').eq('user_id', user_id)
  const rooms = ((roomMembers ?? []).map((m: any) => { const r = Array.isArray(m.demo_rooms) ? m.demo_rooms[0] : m.demo_rooms; return r ? { id: r.id, name: r.name ?? r.id, type: r.type } : null }).filter((r: any) => r && r.type !== 'ai')) as { id: string; name: string; type: string }[]
  const { data: reads } = await supabase
    .from('demo_reads')
    .select('room_id, last_read_at')
    .eq('user_id', user_id)
  const readsMap: Record<string, string> = {}
  for (const r of reads ?? []) readsMap[r.room_id] = r.last_read_at

  const unreadSummary: string[] = []
  for (const room of rooms) {
    const lastRead = readsMap[room.id]
    const { count } = await supabase
      .from('demo_messages')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)
      .neq('user_id', user_id)
      .gt('created_at', lastRead ?? '1970-01-01')
    if (count && count > 0) {
      unreadSummary.push(`- ${room.name}: ${count} mensaje${count > 1 ? 's' : ''} sin leer`)
    }
  }

  // 4. Overdue and due-today tasks breakdown
  const overdue = (tasks ?? []).filter(t => t.due_date && t.due_date < today)
  const dueToday = (tasks ?? []).filter(t => t.due_date === today)
  const upcoming = (tasks ?? []).filter(t => t.due_date && t.due_date > today)
  const noDueDate = (tasks ?? []).filter(t => !t.due_date)

  const tasksBlock = [
    overdue.length > 0 ? `VENCIDAS (${overdue.length}):\n${overdue.map(t => `  - ${t.content} [vencía ${t.due_date}]`).join('\n')}` : '',
    dueToday.length > 0 ? `VENCEN HOY (${dueToday.length}):\n${dueToday.map(t => `  - ${t.content}`).join('\n')}` : '',
    upcoming.length > 0 ? `PRÓXIMAS:\n${upcoming.slice(0, 5).map(t => `  - ${t.content} [${t.due_date}]`).join('\n')}` : '',
    noDueDate.length > 0 ? `SIN FECHA (${noDueDate.length}):\n${noDueDate.slice(0, 5).map(t => `  - ${t.content}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n') || 'Sin tareas pendientes.'

  const remindersBlock = reminders && reminders.length > 0
    ? reminders.map(r => {
        const dt = new Date(r.remind_at)
        return `  - ${r.content} (${dt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })})`
      }).join('\n')
    : 'Sin recordatorios para hoy.'

  const unreadBlock = unreadSummary.length > 0
    ? unreadSummary.join('\n')
    : 'Todo leído.'

  const calendarBlock = ical_url ? await getTodayCalendarEvents(ical_url) : null

  const prompt = `Hoy es ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. Generá un briefing diario claro y accionable para ${userName}.

TAREAS PENDIENTES:
${tasksBlock}

RECORDATORIOS DE HOY:
${remindersBlock}

MENSAJES SIN LEER:
${unreadBlock}
${calendarBlock ? `\nEVENTOS DE CALENDARIO HOY:\n${calendarBlock}` : ''}
Formato esperado:
- Empezá con un saludo breve y la fecha
- Sección "Urgente" si hay tareas vencidas o que vencen hoy
- Sección "Mensajes pendientes" si hay no leídos
- Sección "Recordatorios de hoy" si los hay
${calendarBlock ? '- Sección "Agenda de hoy" con los eventos del calendario si los hay\n' : ''}- Cierra con 1 línea de motivación o foco del día
- Sé conciso, directo, en español. Usá negritas con **texto**.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const reply = (message.content[0] as { text: string }).text.trim()

  await supabase.from('demo_messages').insert({
    user_id,
    content: reply,
    type: 'ai',
    room_id: aiRoom,
  })

  await broadcastToRoom(aiRoom)
  return NextResponse.json({ ok: true, room_id: aiRoom })
}
