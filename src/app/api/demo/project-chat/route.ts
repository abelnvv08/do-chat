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
  const { user_id, project_id, query } = await req.json()
  if (!user_id || !project_id || !query) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = admin()
  const roomId = `project-${project_id}`

  // Load project
  const { data: project } = await db.from('demo_projects').select('*').eq('id', project_id).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Save user message
  await db.from('demo_messages').insert({ user_id, content: query, type: 'text', room_id: roomId })

  // Parse project files
  const projectFiles: { name: string; url: string }[] = project.project_files ?? []
  const parsedFiles: string[] = []
  for (const f of projectFiles.slice(0, 5)) {
    const content = await parseFile(f.url, f.name)
    if (content) parsedFiles.push(`--- Archivo: "${f.name}" ---\n${content}`)
  }

  // Recent chat history
  const { data: history } = await db
    .from('demo_messages')
    .select('content, type, user_id')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(20)
  const historyLines = ((history ?? []) as { content: string; type: string; user_id: string }[])
    .reverse()
    .map(m => `[${m.type === 'ai' ? 'do AI' : 'Usuario'}]: ${m.content}`)
    .join('\n')

  const filesBlock = parsedFiles.length > 0
    ? `\nARCHIVOS DEL PROYECTO:\n${parsedFiles.join('\n\n')}`
    : '(Sin archivos en el proyecto aún)'

  const systemPrompt = `Eres do, una IA asistente integrada en el proyecto "${project.title}".
${project.instructions ? `\nINSTRUCCIONES DEL PROYECTO:\n${project.instructions}\n` : ''}
Tienes acceso completo a los archivos del proyecto. Analízalos, responde preguntas, extrae información, genera reportes y ejecuta cualquier acción que el usuario pida.

ACCIONES DISPONIBLES — incluirlas al final de tu respuesta cuando aplique:

Guardar tarea: [ACCION:TAREA:contenido|YYYY-MM-DD]
Crear recordatorio: [ACCION:RECORDATORIO:descripción|YYYY-MM-DD HH:MM]
Generar Excel: [ACCION:EXCEL:nombre|Col1;Col2;Col3|val1;val2;val3]

Responde en español. Sé directo y útil.`

  const userContent = `${filesBlock}\n\nHISTORIAL:\n${historyLines}\n\nSOLICITUD: ${query}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  })

  let reply = response.content[0].type === 'text' ? response.content[0].text : ''

  // Process TAREA
  const taskRegex = /\[ACCION:TAREA:([^\]]+)\]/g
  let match
  const tasks: { content: string; due_date: string | null }[] = []
  while ((match = taskRegex.exec(reply)) !== null) {
    const parts = match[1].split('|')
    tasks.push({ content: parts[0].trim(), due_date: parts[1]?.trim().match(/^\d{4}-\d{2}-\d{2}$/) ? parts[1].trim() : null })
  }
  reply = reply.replace(/\[ACCION:TAREA:[^\]]+\]/g, '').trim()
  for (const t of tasks) await db.from('demo_tasks').insert({ user_id, content: t.content, due_date: t.due_date, source_room: roomId })
  if (tasks.length > 0) reply += `\n\n📋 ${tasks.length} tarea${tasks.length > 1 ? 's' : ''} guardada${tasks.length > 1 ? 's' : ''}.`

  // Process RECORDATORIO
  const reminderRegex = /\[ACCION:RECORDATORIO:([^|]+)\|([^\]]+)\]/g
  while ((match = reminderRegex.exec(reply)) !== null) {
    await db.from('demo_reminders').insert({ user_id, content: match[1].trim(), remind_at: match[2].trim() })
  }
  reply = reply.replace(/\[ACCION:RECORDATORIO:[^\]]+\]/g, '').trim()

  // Process EXCEL
  const excelRegex = /\[ACCION:EXCEL:([^|]+)\|([^\]]+)\]/g
  while ((match = excelRegex.exec(reply)) !== null) {
    try {
      const name = match[1].trim()
      const lines = match[2].split('|').map((l: string) => l.trim()).filter(Boolean)
      if (lines.length >= 1) {
        const XLSX = await import('xlsx')
        const headers = lines[0].split(';').map((h: string) => h.trim())
        const rows = lines.slice(1).map((l: string) => l.split(';').map((v: string) => v.trim()))
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        ws['!cols'] = headers.map(() => ({ wch: 20 }))
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Datos')
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
        const fileName = `${name}.xlsx`
        const { error } = await db.storage.from('demo-files').upload(`excel/${Date.now()}-${fileName}`, buffer, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', upsert: true })
        if (!error) {
          const { data: { publicUrl } } = db.storage.from('demo-files').getPublicUrl(`excel/${Date.now()}-${fileName}`)
          await db.from('demo_messages').insert({ user_id, content: JSON.stringify({ url: publicUrl, name: fileName, size: buffer.length }), type: 'file', room_id: roomId })
          reply += `\n\n📊 Excel "${fileName}" generado.`
        }
      }
    } catch { /* skip */ }
  }
  reply = reply.replace(/\[ACCION:EXCEL:[^\]]+\]/g, '').trim()

  // Save AI reply
  await db.from('demo_messages').insert({ user_id, content: reply, type: 'ai', room_id: roomId })
  await broadcastToRoom(roomId)

  return NextResponse.json({ reply })
}
