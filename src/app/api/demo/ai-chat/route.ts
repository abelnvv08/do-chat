import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getAIRoom } from '@/lib/demo'
import { parseFile } from '@/lib/file-parser'
import { broadcastToRoom } from '@/lib/realtime-broadcast'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function tavilySearch(query: string): Promise<string | null> {
  const key = process.env.TAVILY_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
    })
    const data = await res.json()
    if (!data.results?.length) return null
    const answer = data.answer ? `Resumen: ${data.answer}\n\n` : ''
    const sources = (data.results as { title: string; url: string; content: string }[])
      .map(r => `**${r.title}**\n${r.content.slice(0, 400)}\nFuente: ${r.url}`)
      .join('\n\n---\n\n')
    return answer + sources
  } catch {
    return null
  }
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
    .select('content, type, room_id, created_at, user:demo_profiles(name)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return ((data || []) as RawMessage[]).reverse()
}

function getSenderName(msg: RawMessage): string {
  if (msg.type === 'ai') return 'do AI'
  return (msg.user as { name: string } | null)?.name ?? 'Usuario'
}

function buildMessageContent(
  textContext: string,
  images: { url: string; sender: string }[]
): Anthropic.Messages.MessageParam['content'] {
  if (images.length === 0) return textContext

  const parts: Anthropic.Messages.ContentBlockParam[] = [
    { type: 'text', text: textContext }
  ]

  for (const img of images.slice(0, 5)) {
    parts.push({ type: 'text', text: `\nImagen compartida por ${img.sender}:` })
    parts.push({ type: 'image', source: { type: 'url', url: img.url } })
  }

  return parts
}

export async function POST(req: NextRequest) {
  const { user_id, query, room_id: replyRoomId } = await req.json()
  const supabase = admin()
  const aiRoomId = `ai-${user_id}`

  const { data: roomMembers } = await supabase.from('demo_room_members').select('room_id, demo_rooms(id, name, type, emoji)').eq('user_id', user_id)
  const rooms = ((roomMembers ?? []).map((m: any) => { const r = Array.isArray(m.demo_rooms) ? m.demo_rooms[0] : m.demo_rooms; return r ? { id: r.id, name: r.name ?? r.id, type: r.type, emoji: r.emoji ?? '💬' } : null }).filter((r: any) => r && r.type !== 'ai')) as { id: string; name: string; type: string; emoji: string }[]
  const allChatsContext: string[] = []
  const allImages: { url: string; sender: string; room: string }[] = []
  const allFiles: { name: string; url: string; sender: string; room: string }[] = []

  // Files uploaded directly to the AI chat (highest priority — always parsed)
  const aiRoomFiles: { name: string; url: string }[] = []
  const aiMsgs = await getMessagesFromRoom(aiRoomId, 20)
  for (const m of aiMsgs) {
    if (m.type === 'file') {
      try {
        const meta = JSON.parse(m.content)
        aiRoomFiles.push({ name: meta.name, url: meta.url })
      } catch { /* skip */ }
    } else if (m.type === 'image') {
      allImages.push({ url: m.content, sender: 'tú', room: 'do AI' })
    }
  }

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

  // Always parse files uploaded directly to AI chat
  const parsedFilesContext: string[] = []
  for (const f of aiRoomFiles.slice(0, 3)) {
    const content = await parseFile(f.url, f.name)
    if (content) {
      parsedFilesContext.push(`\n--- Archivo subido por el usuario: "${f.name}" ---\n${content}`)
    }
  }

  // Also parse files from other chats when query mentions them
  const queryMentionsFiles = /archivo|excel|word|pdf|csv|documento|contenido|tabla|hoja|dato/i.test(query)
  if (allFiles.length > 0 && (queryMentionsFiles || /analiz|lee|mostr|resum/i.test(query))) {
    for (const f of allFiles.slice(0, 3)) {
      const content = await parseFile(f.url, f.name)
      if (content) {
        parsedFilesContext.push(`\n--- Contenido de "${f.name}" (enviado por ${f.sender} en ${f.room}) ---\n${content}`)
      }
    }
  }

  const filesListContext = allFiles.length > 0
    ? `\n\nARCHIVOS COMPARTIDOS EN LOS CHATS:\n${allFiles.map(f => `- "${f.name}" — enviado por ${f.sender} en ${f.room}`).join('\n')}`
    : ''

  const parsedFilesBlock = parsedFilesContext.length > 0
    ? `\n\nCONTENIDO DE ARCHIVOS ANALIZADOS:${parsedFilesContext.join('\n')}`
    : ''

  const contextBlock = allChatsContext.length > 0
    ? `CONTEXTO DE TODOS LOS CHATS:\n${allChatsContext.join('\n\n')}${filesListContext}${parsedFilesBlock}`
    : '(No hay mensajes en los chats aún)'

  const hasDirectFiles = aiRoomFiles.length > 0
  const systemPrompt = `Eres do, una IA accionable con acceso completo a todos los chats, imágenes y archivos.
Tienes visión — puedes ver y analizar las imágenes que se comparten en los chats.
Puedes leer mensajes, ver imágenes, leer el contenido de archivos (PDF, Excel, Word, CSV, TXT), resumir conversaciones, extraer tareas, crear proyectos y enviar mensajes.
${hasDirectFiles ? 'El usuario adjuntó archivos directamente en este chat — su contenido está disponible en el contexto.' : ''}
Si el usuario menciona un documento o archivo pero no lo adjuntó y no hay archivos disponibles en el contexto, pregúntale amablemente: ¿lo tiene en uno de sus chats o puede adjuntarlo directamente aquí usando el ícono de clip (📎)?

ACCIONES DISPONIBLES — incluirlas al final de tu respuesta:

1. Enviar mensaje a un chat:
[ACCION:ENVIAR:room_id:mensaje]
room_ids: group, dm-001-002, dm-001-003, dm-001-004, dm-002-003, dm-002-004, dm-003-004

2. Guardar una tarea en "Mis pendientes" del usuario:
[ACCION:TAREA:contenido de la tarea|YYYY-MM-DD]
La fecha (YYYY-MM-DD) es opcional. Incluyela si el usuario menciona una fecha límite o deadline. Podés incluir múltiples acciones TAREA.

3. Crear un proyecto/reporte en "Proyectos":
[ACCION:PROYECTO:título|contenido completo del reporte]
Usá esto cuando el usuario pide generar un reporte, resumen ejecutivo, acta o proyecto.

4. Crear un recordatorio para el usuario:
[ACCION:RECORDATORIO:descripción del recordatorio|YYYY-MM-DD HH:MM]
Usá esto cuando el usuario pide que le recuerdes algo o menciona una fecha/hora. La fecha y hora son obligatorias.
Ejemplo: [ACCION:RECORDATORIO:Llamar a Pedro|2026-05-02 10:00]

5. Generar un archivo Excel descargable:
[ACCION:EXCEL:nombre del archivo|Columna1;Columna2;Columna3|valor1;valor2;valor3|valor1;valor2;valor3]
- La primera fila después del nombre es el encabezado (separado por ;)
- Cada fila siguiente es una fila de datos (separada por ;)
- Usá esto cuando el usuario pide un Excel, tabla, planilla o compilación de datos
- Podés incluir tantas filas como necesites
- Ejemplo: [ACCION:EXCEL:Facturas abril|Proveedor;Monto;Fecha;Estado|Pedro García;$5.000;15/04;Pendiente|María López;$3.200;20/04;Pagado]

6. Buscar información actual en internet:
[ACCION:BUSCAR:tu query de búsqueda]
Usá esto SOLO cuando el usuario necesita información actual que no tenés: noticias de hoy, precios, cotizaciones, clima, eventos recientes, datos de mercado, resultados deportivos. NO lo uses para preguntas generales que podés responder con tu conocimiento. Solo una búsqueda por respuesta.

7. Crear un evento en Google Calendar:
[ACCION:CALENDARIO:título del evento|YYYY-MM-DDTHH:MM|YYYY-MM-DDTHH:MM|descripción opcional]
- El primer campo es el título
- El segundo es la fecha y hora de inicio (ISO 8601)
- El tercero es la fecha y hora de fin (ISO 8601)
- El cuarto es la descripción (puede estar vacío)
- Usá esto cuando el usuario pide agendar algo, crear una reunión, o programar un evento
- Ejemplo: [ACCION:CALENDARIO:Reunión con el equipo|2026-05-05T10:00|2026-05-05T11:00|Revisar avances del proyecto]

Responde en español. Sé directo y útil. Siempre confirmá qué acciones tomaste.`

  const queryMentionsImages = /imagen|foto|adjunto|compartió|mandó/i.test(query)
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

  // Process BUSCAR action — web search via Tavily (2-pass)
  const buscarMatch = reply.match(/\[ACCION:BUSCAR:([^\]]+)\]/)
  if (buscarMatch) {
    const searchQuery = buscarMatch[1].trim()
    reply = reply.replace(/\[ACCION:BUSCAR:[^\]]+\]/g, '').trim()
    const searchResults = await tavilySearch(searchQuery)
    if (searchResults) {
      const response2 = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userContent },
          { role: 'assistant', content: reply || 'Buscando información actualizada…' },
          { role: 'user', content: `RESULTADOS DE BÚSQUEDA WEB para "${searchQuery}":\n\n${searchResults}\n\nAhora respondé la pregunta original usando estos resultados. Citá las fuentes al final con sus URLs.` },
        ],
      })
      reply = response2.content[0].type === 'text' ? response2.content[0].text : reply
    } else {
      reply = reply || 'No pude obtener resultados de búsqueda. Intentá de nuevo más tarde.'
    }
  }

  // Process ENVIAR actions
  const sendRegex = /\[ACCION:ENVIAR:([^:]+):([^\]]+)\]/g
  const sendActions: { roomId: string; message: string }[] = []
  let match
  while ((match = sendRegex.exec(reply)) !== null) {
    sendActions.push({ roomId: match[1].trim(), message: match[2].trim() })
  }
  reply = reply.replace(/\[ACCION:ENVIAR:[^\]]+\]/g, '').trim()

  const roomNames: Record<string, string> = {
    'group': 'el grupo general',
    'dm-001-002': 'el chat de Abel y Santi',
    'dm-001-003': 'el chat de Abel y Hernan',
    'dm-001-004': 'el chat de Abel y Walter',
    'dm-002-003': 'el chat de Santi y Hernan',
    'dm-002-004': 'el chat de Santi y Walter',
    'dm-003-004': 'el chat de Hernan y Walter',
  }
  for (const action of sendActions) {
    await supabase.from('demo_messages').insert({
      user_id, content: action.message, type: 'text', room_id: action.roomId,
    })
    reply += `\n\n✅ Mensaje enviado a ${roomNames[action.roomId] ?? action.roomId}.`
  }

  // Process TAREA actions
  const taskRegex = /\[ACCION:TAREA:([^\]]+)\]/g
  const tasks: { content: string; due_date: string | null }[] = []
  while ((match = taskRegex.exec(reply)) !== null) {
    const parts = match[1].split('|')
    const content = parts[0].trim()
    const due_date = parts[1]?.trim().match(/^\d{4}-\d{2}-\d{2}$/) ? parts[1].trim() : null
    tasks.push({ content, due_date })
  }
  reply = reply.replace(/\[ACCION:TAREA:[^\]]+\]/g, '').trim()

  for (const task of tasks) {
    await supabase.from('demo_tasks').insert({
      user_id, content: task.content, due_date: task.due_date, source_room: replyRoomId || getAIRoom(user_id),
    })
  }
  if (tasks.length > 0) {
    reply += `\n\n📋 ${tasks.length} tarea${tasks.length > 1 ? 's' : ''} guardada${tasks.length > 1 ? 's' : ''} en Mis pendientes.`
  }

  // Process RECORDATORIO actions
  const reminderRegex = /\[ACCION:RECORDATORIO:([^|]+)\|([^\]]+)\]/g
  const reminders: { content: string; remind_at: string }[] = []
  while ((match = reminderRegex.exec(reply)) !== null) {
    const content = match[1].trim()
    const remind_at = match[2].trim()
    reminders.push({ content, remind_at })
  }
  reply = reply.replace(/\[ACCION:RECORDATORIO:[^\]]+\]/g, '').trim()

  for (const r of reminders) {
    await supabase.from('demo_reminders').insert({ user_id, content: r.content, remind_at: r.remind_at })
  }
  if (reminders.length > 0) {
    reply += `\n\n🔔 ${reminders.length} recordatorio${reminders.length > 1 ? 's' : ''} guardado${reminders.length > 1 ? 's' : ''}.`
  }

  // Process PROYECTO actions
  const projectRegex = /\[ACCION:PROYECTO:([^|]+)\|([^\]]+)\]/g
  const projects: { title: string; content: string }[] = []
  while ((match = projectRegex.exec(reply)) !== null) {
    projects.push({ title: match[1].trim(), content: match[2].trim() })
  }
  reply = reply.replace(/\[ACCION:PROYECTO:[^\]]+\]/g, '').trim()

  for (const proj of projects) {
    await supabase.from('demo_projects').insert({
      user_id, title: proj.title, content: proj.content,
    })
  }
  if (projects.length > 0) {
    reply += `\n\n📁 Proyecto "${projects[0].title}" guardado en Proyectos.`
  }

  // Process EXCEL actions
  const excelRegex = /\[ACCION:EXCEL:([^|]+)\|([^\]]+)\]/g
  const excelActions: { name: string; headers: string[]; rows: string[][] }[] = []
  while ((match = excelRegex.exec(reply)) !== null) {
    const name = match[1].trim()
    const lines = match[2].split('|').map(l => l.trim()).filter(Boolean)
    if (lines.length >= 1) {
      const headers = lines[0].split(';').map(h => h.trim())
      const rows = lines.slice(1).map(l => l.split(';').map(v => v.trim()))
      excelActions.push({ name, headers, rows })
    }
  }
  reply = reply.replace(/\[ACCION:EXCEL:[^\]]+\]/g, '').trim()

  for (const excel of excelActions) {
    try {
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.aoa_to_sheet([excel.headers, ...excel.rows])
      // Style header row bold
      const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c })
        if (ws[cellRef]) ws[cellRef].s = { font: { bold: true } }
      }
      ws['!cols'] = excel.headers.map(() => ({ wch: 20 }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Datos')
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

      const fileName = `${excel.name.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '').trim()}.xlsx`
      const storagePath = `excel/${Date.now()}-${fileName}`
      const { error } = await supabase.storage
        .from('demo-files')
        .upload(storagePath, buffer, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', upsert: true })

      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('demo-files').getPublicUrl(storagePath)
        const fileMeta = JSON.stringify({ url: publicUrl, name: fileName, size: buffer.length })
        await supabase.from('demo_messages').insert({
          user_id, content: fileMeta, type: 'file', room_id: replyRoomId || getAIRoom(user_id),
        })
        reply += `\n\n📊 Excel "${fileName}" generado con ${excel.rows.length} filas — disponible arriba y en Documentos.`
      }
    } catch (e) {
      reply += `\n\n⚠️ No pude generar el Excel. Intentá de nuevo.`
    }
  }

  // Process CALENDARIO actions — generate Google Calendar links
  const calendarRegex = /\[ACCION:CALENDARIO:([^|]+)\|([^|]+)\|([^|]+)\|([^\]]*)\]/g
  const calendarEvents: { title: string; start: string; end: string; description: string }[] = []
  while ((match = calendarRegex.exec(reply)) !== null) {
    calendarEvents.push({ title: match[1].trim(), start: match[2].trim(), end: match[3].trim(), description: match[4].trim() })
  }
  reply = reply.replace(/\[ACCION:CALENDARIO:[^\]]+\]/g, '').trim()

  for (const event of calendarEvents) {
    const fmt = (s: string) => s.replace(/[-:]/g, '').replace('T', 'T').padEnd(15, '0')
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${fmt(event.start)}/${fmt(event.end)}&details=${encodeURIComponent(event.description)}`
    const startDt = new Date(event.start)
    const dateStr = startDt.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    const timeStr = startDt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    reply += `\n\n[GCAL:${event.title}|${dateStr} · ${timeStr}|${gcalUrl}]`
  }

  const actions = sendActions

  const targetRoom = replyRoomId || getAIRoom(user_id)
  await supabase.from('demo_messages').insert({
    user_id,
    content: reply,
    type: 'ai',
    room_id: targetRoom,
  })

  // Also broadcast to rooms where AI sent messages via actions
  const broadcastRooms = new Set([targetRoom, ...sendActions.map(a => a.roomId)])
  await Promise.all([...broadcastRooms].map(r => broadcastToRoom(r)))

  return NextResponse.json({ reply, actions })
}
