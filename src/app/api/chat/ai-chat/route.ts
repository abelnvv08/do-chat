import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getAIRoom } from '@/lib/demo'
import { parseFile } from '@/lib/file-parser'
import { broadcastToRoom } from '@/lib/realtime-broadcast'
import { encrypt, decrypt } from '@/lib/encryption'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// ── Agent type detection ──────────────────────────────────────────────────────
type AgentType = 'general' | 'finance' | 'agenda' | 'writing' | 'search'

function detectAgentType(roomId: string): AgentType {
  if (roomId.includes('ai-finance-')) return 'finance'
  if (roomId.includes('ai-agenda-')) return 'agenda'
  if (roomId.includes('ai-writing-')) return 'writing'
  if (roomId.includes('ai-search-')) return 'search'
  return 'general'
}

// ── Tool definitions ──────────────────────────────────────────────────────────
const ALL_TOOLS: Anthropic.Tool[] = [
  {
    name: 'send_message',
    description: 'Envía un mensaje de texto a un chat o grupo del usuario. Usa el room_id exacto del contexto.',
    input_schema: {
      type: 'object' as const,
      properties: {
        room_id: { type: 'string', description: 'ID del room destino (dm-xxx o group-xxx)' },
        message: { type: 'string', description: 'Texto del mensaje a enviar' },
      },
      required: ['room_id', 'message'],
    },
  },
  {
    name: 'create_task',
    description: 'Crea una tarea en los Pendientes del usuario.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: { type: 'string', description: 'Descripción de la tarea' },
        due_date: { type: 'string', description: 'Fecha límite YYYY-MM-DD (opcional)' },
      },
      required: ['content'],
    },
  },
  {
    name: 'create_reminder',
    description: 'Crea un recordatorio con fecha y hora exacta.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: { type: 'string', description: 'Descripción del recordatorio' },
        remind_at: { type: 'string', description: 'Fecha y hora ISO 8601: YYYY-MM-DDTHH:MM' },
      },
      required: ['content', 'remind_at'],
    },
  },
  {
    name: 'save_project',
    description: 'Guarda un documento, reporte, acta o resumen en la sección Proyectos.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Título del documento' },
        content: { type: 'string', description: 'Contenido completo del documento en markdown' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'search_web',
    description: 'Busca información actualizada en internet. SOLO para: noticias del día, precios, cotizaciones, clima, resultados deportivos. NO para preguntas generales.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Términos de búsqueda en español' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_calendar_event',
    description: 'Genera un evento de Google Calendar listo para agregar con un clic.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Título del evento' },
        start: { type: 'string', description: 'Inicio: YYYY-MM-DDTHH:MM' },
        end: { type: 'string', description: 'Fin: YYYY-MM-DDTHH:MM' },
        description: { type: 'string', description: 'Descripción o agenda del evento (opcional)' },
      },
      required: ['title', 'start', 'end'],
    },
  },
  {
    name: 'generate_excel',
    description: 'Genera un archivo Excel descargable con datos tabulares. Úsalo para tablas, reportes, inventarios, listas.',
    input_schema: {
      type: 'object' as const,
      properties: {
        filename: { type: 'string', description: 'Nombre del archivo sin extensión' },
        headers: { type: 'array', items: { type: 'string' }, description: 'Nombres de columnas' },
        rows: { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: 'Filas de datos' },
      },
      required: ['filename', 'headers', 'rows'],
    },
  },
]

const TOOLS_BY_AGENT: Record<AgentType, string[]> = {
  general:  ['send_message','create_task','create_reminder','save_project','search_web','create_calendar_event','generate_excel'],
  finance:  ['generate_excel','save_project','create_task','create_reminder'],
  agenda:   ['create_task','create_reminder','create_calendar_event','send_message'],
  writing:  ['save_project','send_message','create_task'],
  search:   ['search_web','save_project'],
}

function getToolsForAgent(type: AgentType): Anthropic.Tool[] {
  return ALL_TOOLS.filter(t => TOOLS_BY_AGENT[type].includes(t.name))
}

// ── Country / location ────────────────────────────────────────────────────────
type CountryCtx = { name: string; currency: string }
const COUNTRY_CTX: Record<string, CountryCtx> = {
  MX: { name: 'México', currency: 'Peso mexicano (MXN, $)' },
  AR: { name: 'Argentina', currency: 'Peso argentino (ARS, $)' },
  CO: { name: 'Colombia', currency: 'Peso colombiano (COP, $)' },
  CL: { name: 'Chile', currency: 'Peso chileno (CLP, $)' },
  ES: { name: 'España', currency: 'Euro (EUR, €)' },
  PE: { name: 'Perú', currency: 'Sol peruano (PEN, S/.)' },
  US: { name: 'Estados Unidos', currency: 'Dólar estadounidense (USD, $)' },
  GT: { name: 'Guatemala', currency: 'Quetzal (GTQ, Q)' },
  CR: { name: 'Costa Rica', currency: 'Colón costarricense (CRC, ₡)' },
  DO: { name: 'República Dominicana', currency: 'Peso dominicano (DOP, $)' },
  BR: { name: 'Brasil', currency: 'Real brasileño (BRL, R$)' },
}

function buildLocationContext(countryCode: string | null, city: string | null): string {
  if (!countryCode) return ''
  const geo = COUNTRY_CTX[countryCode]
  const countryName = geo?.name ?? countryCode
  const currency = geo?.currency ?? 'la moneda local'
  return `UBICACIÓN: ${countryName}${city ? `, ${city}` : ''} — Moneda: ${currency}. Habla en español formal y neutro.`
}

// ── Web search ────────────────────────────────────────────────────────────────
async function tavilySearch(query: string): Promise<string | null> {
  const key = process.env.TAVILY_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, query, search_depth: 'basic', max_results: 5, include_answer: true }),
    })
    const data = await res.json()
    if (!data.results?.length) return null
    const answer = data.answer ? `Resumen: ${data.answer}\n\n` : ''
    const sources = (data.results as { title: string; url: string; content: string }[])
      .map(r => `**${r.title}**\n${r.content.slice(0, 400)}\nFuente: ${r.url}`)
      .join('\n\n---\n\n')
    return answer + sources
  } catch { return null }
}

// ── Message loading ───────────────────────────────────────────────────────────
type RawMessage = { content: string; type: string; room_id: string; created_at: string; user_id: string; user?: unknown }

const _profileNameCache: Record<string, string> = {}

async function getMessagesFromRoom(roomId: string, limit = 30): Promise<RawMessage[]> {
  const db = admin()
  const { data } = await db
    .from('demo_messages')
    .select('content, type, room_id, created_at, user_id')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (!data?.length) return []

  const unknownIds = [...new Set(data.map((m: any) => m.user_id as string))].filter(id => !_profileNameCache[id])
  if (unknownIds.length) {
    const { data: profiles } = await db.from('demo_profiles').select('id, name').in('id', unknownIds)
    for (const p of profiles ?? []) _profileNameCache[p.id] = p.name
  }
  const decrypted = await Promise.all(data.map(async (m: any) => ({
    ...m,
    content: (m.type === 'text' || m.type === 'ai') ? await decrypt(m.content) : m.content,
    user: { name: _profileNameCache[m.user_id] ?? 'Usuario' },
  })))
  return decrypted.reverse() as RawMessage[]
}

function getSenderName(msg: RawMessage): string {
  if (msg.type === 'ai') return 'do AI'
  return (msg.user as { name: string } | null)?.name ?? 'Usuario'
}

// ── Tool executor ─────────────────────────────────────────────────────────────
type ToolContext = {
  userId: string
  replyRoomId: string
  supabase: ReturnType<typeof admin>
  roomDirectory: { name: string; emoji: string; roomId: string }[]
  gcalLinks: string[]
  excelMessages: string[]
  sentRooms: Set<string>
}

async function executeTool(name: string, input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const db = ctx.supabase

  if (name === 'send_message') {
    const { room_id, message } = input as { room_id: string; message: string }
    const roomName = ctx.roomDirectory.find(r => r.roomId === room_id)?.name ?? room_id
    await db.from('demo_messages').insert({ user_id: ctx.userId, content: await encrypt(message), type: 'text', room_id })
    ctx.sentRooms.add(room_id)
    return `Mensaje enviado a ${roomName}.`
  }

  if (name === 'create_task') {
    const { content, due_date } = input as { content: string; due_date?: string }
    await db.from('demo_tasks').insert({ user_id: ctx.userId, content, due_date: due_date ?? null, source_room: ctx.replyRoomId })
    return `Tarea creada: "${content}"${due_date ? ` — vence ${due_date}` : ''}.`
  }

  if (name === 'create_reminder') {
    const { content, remind_at } = input as { content: string; remind_at: string }
    await db.from('demo_reminders').insert({ user_id: ctx.userId, content, remind_at })
    return `Recordatorio guardado: "${content}" para ${remind_at}.`
  }

  if (name === 'save_project') {
    const { title, content } = input as { title: string; content: string }
    await db.from('demo_projects').insert({ user_id: ctx.userId, title, content })
    return `Documento "${title}" guardado en Proyectos.`
  }

  if (name === 'search_web') {
    const { query } = input as { query: string }
    const results = await tavilySearch(query)
    return results ?? 'Sin resultados de búsqueda disponibles.'
  }

  if (name === 'create_calendar_event') {
    const { title, start, end, description = '' } = input as { title: string; start: string; end: string; description?: string }
    const fmt = (s: string) => s.replace(/[-:]/g, '').padEnd(15, '0')
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(description)}`
    const startDt = new Date(start)
    const dateStr = startDt.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    const timeStr = startDt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    ctx.gcalLinks.push(`[GCAL:${title}|${dateStr} · ${timeStr}|${gcalUrl}]`)
    return `Evento "${title}" creado para ${dateStr} a las ${timeStr}.`
  }

  if (name === 'generate_excel') {
    const { filename, headers, rows } = input as { filename: string; headers: string[]; rows: string[][] }
    try {
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      ws['!cols'] = headers.map(() => ({ wch: 20 }))
      const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
      for (let c = range.s.c; c <= range.e.c; c++) {
        const ref = XLSX.utils.encode_cell({ r: 0, c })
        if (ws[ref]) ws[ref].s = { font: { bold: true } }
      }
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Datos')
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      const fname = `${filename.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '').trim()}.xlsx`
      const storagePath = `excel/${Date.now()}-${fname}`
      const { error } = await db.storage.from('demo-files').upload(storagePath, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      })
      if (!error) {
        const { data: { publicUrl } } = db.storage.from('demo-files').getPublicUrl(storagePath)
        const meta = JSON.stringify({ url: publicUrl, name: fname, size: buffer.length })
        await db.from('demo_messages').insert({ user_id: ctx.userId, content: meta, type: 'file', room_id: ctx.replyRoomId })
        return `Excel "${fname}" generado con ${rows.length} filas — disponible en el chat y en Documentos.`
      }
    } catch { /* fall through */ }
    return 'No se pudo generar el Excel. Intenta de nuevo.'
  }

  return 'Herramienta no encontrada.'
}

// ── System prompts per agent ──────────────────────────────────────────────────
function buildSystemPrompt(
  agentType: AgentType,
  today: string,
  locationContext: string,
  activeRoom: string | null,
  hasFiles: boolean,
  directoryBlock: string,
): string {
  const base = `Today's date: ${today}.${locationContext ? `\n${locationContext}` : ''}
${directoryBlock}
${activeRoom ? `The user is messaging from chat room_id: ${activeRoom}. "This chat" and "here" refer to that chat.` : ''}
${hasFiles ? 'The user attached files — their content is available for analysis.' : ''}

CRITICAL RULES:
— Never invent messages that are not in the context.
— Respond in the same language the user writes in. If they write in Spanish, reply in Spanish. If in English, reply in English.
— Be direct and clear, no long introductions.
— When using tools, execute them without asking for confirmation — the user already requested it.
— You can use multiple tools in parallel if they are independent.`

  const prompts: Record<AgentType, string> = {
    general: `You are "DO AI", the artificial intelligence assistant of DO Chat. You have full access to all the user's chats and can execute real actions: send messages, create tasks, reminders, documents, calendar events and Excel files.

Mental process for each request:
1. IDENTIFY exactly what is being asked
2. LOCATE the relevant context in the chats
3. ACT by executing the necessary tools
4. RESPOND with what you did and any useful insights

${base}`,

    finance: `You are "DO AI", the financial agent of DO Chat. Your specialty: invoice analysis, expenses, budgets, cash flow and financial reports. You are precise with numbers, always verify calculations and generate clear Excel reports.

When analyzing financial documents:
- Verify subtotals, taxes and totals
- Detect inconsistencies or errors
- Suggest improvements or payment alerts
- Generate Excel reports when useful

${base}`,

    agenda: `You are "DO AI", the organization agent of DO Chat. Your specialty: meetings, calendars, reminders and team coordination. You turn conversations into concrete commitments and never let anything slip through.

When reading chats:
- Detect dates, times and commitments mentioned
- Create calendar events and reminders automatically
- Alert on scheduling conflicts
- Coordinate availability among contacts

${base}`,

    writing: `You are "DO AI", the writing agent of DO Chat. Your specialty: drafting professional emails, proposals, minutes, contracts and any business document. You write with clarity, conciseness and the right tone for each context.

When drafting:
- Adapt the tone to the recipient (formal/informal)
- Structure documents clearly
- Save everything in Projects for easy access
- You can send the document directly to the recipient's chat

${base}`,

    search: `You are "DO AI", the research agent of DO Chat. Your specialty: finding up-to-date information on the internet and synthesizing it into clear, useful answers. Always cite sources.

When to search:
- Current news and events
- Real-time prices and quotes
- Product or service information
- Data that changes frequently

Save important results in Projects if the user will need them later.

${base}`,
  }

  return prompts[agentType]
}

// ── Language detection by country code ───────────────────────────────────────
const SPANISH_COUNTRIES = new Set([
  'MX','CO','AR','CL','PE','VE','EC','GT','CU','BO','DO','HN','PY','SV','NI','CR','PA','UY','ES','PR','GQ',
])
const PORTUGUESE_COUNTRIES = new Set(['BR','PT','AO','MZ','CV','ST','GW','TL'])

function detectLang(countryCode: string | null): 'es' | 'pt' | 'en' {
  if (!countryCode) return 'es' // mayoría de usuarios son LATAM
  if (SPANISH_COUNTRIES.has(countryCode)) return 'es'
  if (PORTUGUESE_COUNTRIES.has(countryCode)) return 'pt'
  return 'en'
}

function buildLimitMessage(plan: string, limit: number, countryCode: string | null): string {
  const lang = detectLang(countryCode)
  const isFree = plan === 'free'

  if (lang === 'es') {
    const tip = isFree ? ' Pasa a Pro para 80 consultas diarias. 👉 getdochat.com/pricing' : ''
    return `Alcanzaste el límite de ${limit} consultas diarias del plan ${plan === 'free' ? 'gratuito' : plan}.${tip} El límite se renueva a medianoche. 🌙`
  }
  if (lang === 'pt') {
    const tip = isFree ? ' Mude para o Pro e tenha 80 consultas diárias. 👉 getdochat.com/pricing' : ''
    return `Você atingiu o limite de ${limit} consultas diárias do plano ${plan === 'free' ? 'gratuito' : plan}.${tip} O limite é renovado à meia-noite. 🌙`
  }
  // English
  const tip = isFree ? ' Upgrade to Pro for 80 queries/day. 👉 getdochat.com/pricing' : ''
  return `You've reached your ${limit} daily query limit on the ${plan} plan.${tip} Limit resets at midnight. 🌙`
}

// ── Plan config ──────────────────────────────────────────────────────────────
const PLAN_CONFIG: Record<string, { model: string; limit: number }> = {
  free:     { model: 'claude-haiku-4-5-20251001', limit: 15 },
  pro:      { model: 'claude-sonnet-4-6',         limit: 80 },
  business: { model: 'claude-sonnet-4-6',         limit: 200 },
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { user_id, query, room_id: replyRoomId } = await req.json()
  const supabase = admin()
  const agentType = detectAgentType(replyRoomId ?? '')
  const aiRoomId = replyRoomId ?? getAIRoom(user_id)

  // Plan
  const { data: profileData } = await supabase.from('demo_profiles').select('plan').eq('id', user_id).single()
  const plan = (profileData?.plan ?? 'free') as string
  const planConfig = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free

  // Location
  const geoCountry = req.headers.get('x-vercel-ip-country') ?? null
  const geoCity = req.headers.get('x-vercel-ip-city') ? decodeURIComponent(req.headers.get('x-vercel-ip-city')!) : null
  const locationContext = buildLocationContext(geoCountry, geoCity)

  // Rate limit
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const { count } = await supabase.from('demo_messages').select('id', { count: 'exact', head: true })
    .eq('user_id', user_id).eq('type', 'ai').gte('created_at', todayStart.toISOString())
  if ((count ?? 0) >= planConfig.limit) {
    const msg = buildLimitMessage(plan, planConfig.limit, geoCountry)
    await supabase.from('demo_messages').insert({ user_id, content: msg, type: 'ai', room_id: aiRoomId })
    return NextResponse.json({ reply: msg, actions: [] })
  }

  // ── Load conversation history from this AI room ───────────────────────────
  const aiMsgs = await getMessagesFromRoom(aiRoomId, 21)
  const aiHistoryMsgs = aiMsgs.slice(0, -1)

  const aiRoomFiles: { name: string; url: string }[] = []
  for (const m of aiHistoryMsgs) {
    if (m.type === 'file') {
      try { aiRoomFiles.push(JSON.parse(m.content)) } catch { /* skip */ }
    }
  }

  // Build conversation turns for multi-turn memory
  const rawTurns: Anthropic.MessageParam[] = []
  for (const m of aiHistoryMsgs) {
    if (m.type === 'text') {
      rawTurns.push({ role: 'user', content: m.content.slice(0, 800) })
    } else if (m.type === 'ai') {
      const cleaned = m.content.replace(/\[GCAL:[^\]]+\]/g, '').trim()
      rawTurns.push({ role: 'assistant', content: cleaned.slice(0, 1500) || '…' })
    }
  }
  const conversationHistory: Anthropic.MessageParam[] = []
  for (const msg of rawTurns) {
    if (conversationHistory.length === 0) { if (msg.role === 'user') conversationHistory.push(msg) }
    else if (conversationHistory[conversationHistory.length - 1].role !== msg.role) conversationHistory.push(msg)
  }
  while (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role !== 'assistant') {
    conversationHistory.pop()
  }

  // ── Load chat context (other rooms) ──────────────────────────────────────
  const allImages: { url: string; sender: string; room: string }[] = []
  const allFiles: { name: string; url: string; sender: string; room: string }[] = []
  const allChatsContext: string[] = []
  const roomDirectory: { name: string; emoji: string; roomId: string }[] = []

  const activeRoom = replyRoomId && replyRoomId !== aiRoomId ? replyRoomId : null

  async function loadRoomContext(roomId: string, roomName: string, roomEmoji: string, limit: number) {
    roomDirectory.push({ name: roomName, emoji: roomEmoji, roomId })
    const msgs = await getMessagesFromRoom(roomId, limit)
    if (!msgs.length) return
    const lines: string[] = []
    for (const m of msgs) {
      const sender = getSenderName(m)
      if (m.type === 'text' || m.type === 'ai') {
        lines.push(`  [${sender}]: ${m.content.slice(0, 500)}`)
      } else if (m.type === 'image') {
        lines.push(`  [${sender}]: [📷 imagen]`)
        allImages.push({ url: m.content, sender, room: roomName })
      } else if (m.type === 'file') {
        try {
          const meta = JSON.parse(m.content)
          lines.push(`  [${sender}]: [📎 ${meta.name}]`)
          allFiles.push({ name: meta.name, url: meta.url, sender, room: roomName })
        } catch { lines.push(`  [${sender}]: [📎 archivo]`) }
      }
    }
    if (lines.length) allChatsContext.push(`--- ${roomEmoji} ${roomName} (room_id: ${roomId}) ---\n${lines.join('\n')}`)
  }

  if (activeRoom) {
    const { data: roomData } = await supabase.from('demo_rooms').select('name, emoji').eq('id', activeRoom).single()
    await loadRoomContext(activeRoom, roomData?.name ?? activeRoom, roomData?.emoji ?? '💬', 100)
  }

  // Load all rooms for general + finance agents; others only load what's needed
  const loadAllRooms = agentType === 'general' || agentType === 'finance' || !activeRoom
  if (loadAllRooms) {
    const { data: roomMembers } = await supabase.from('demo_room_members')
      .select('room_id, demo_rooms(id, name, type, emoji)').eq('user_id', user_id)
    const rooms = ((roomMembers ?? []).map((m: any) => {
      const r = Array.isArray(m.demo_rooms) ? m.demo_rooms[0] : m.demo_rooms
      return r && r.type !== 'ai' ? { id: r.id, name: r.name ?? r.id, type: r.type, emoji: r.emoji ?? '💬' } : null
    }).filter(Boolean)) as { id: string; name: string; type: string; emoji: string }[]

    const dmRooms = rooms.filter(r => r.type === 'dm')
    if (dmRooms.length > 0) {
      const { data: otherMembers } = await supabase.from('demo_room_members')
        .select('room_id, user_id, demo_profiles!demo_room_members_user_id_fkey(name, phone)')
        .in('room_id', dmRooms.map(r => r.id)).neq('user_id', user_id)
      const otherUserIds = (otherMembers ?? []).map((m: any) => m.user_id).filter(Boolean)
      const { data: savedContacts } = otherUserIds.length
        ? await supabase.from('demo_contacts').select('contact_id, first_name, last_name').eq('user_id', user_id).in('contact_id', otherUserIds)
        : { data: [] }
      const savedNameMap: Record<string, string> = {}
      for (const c of savedContacts ?? []) {
        const n = [c.first_name, c.last_name].filter(Boolean).join(' ')
        if (n) savedNameMap[c.contact_id] = n
      }
      for (const room of rooms) {
        if (room.type !== 'dm') continue
        const other = (otherMembers ?? []).find((m: any) => m.room_id === room.id)
        if (other) {
          const p = Array.isArray(other.demo_profiles) ? other.demo_profiles[0] : other.demo_profiles
          room.name = savedNameMap[other.user_id] || p?.phone || p?.name || room.id
        }
      }
    }

    for (const room of rooms.slice(0, 8)) {
      if (room.id === activeRoom) continue
      await loadRoomContext(room.id, room.name, room.emoji, 30)
    }
  }

  // Parse AI room files
  const parsedFilesContext: string[] = []
  for (const f of aiRoomFiles.slice(0, 2)) {
    const content = await parseFile(f.url, f.name)
    if (content) parsedFilesContext.push(`\n--- Archivo adjunto: "${f.name}" ---\n${content}`)
  }
  const shouldParseOtherFiles = /archivo|excel|word|pdf|csv|documento|tabla|dato|factura|recibo|cuenta|invoice|contrato|reporte|presupuesto|verifica|revisa|analiza/i.test(query)
  if (shouldParseOtherFiles && allFiles.length > 0) {
    for (const f of allFiles.slice(0, 3)) {
      const content = await parseFile(f.url, f.name)
      if (content) parsedFilesContext.push(`\n--- "${f.name}" (${f.room}) ---\n${content}`)
    }
  }

  const directoryBlock = roomDirectory.length > 0
    ? `CHATS DISPONIBLES:\n${roomDirectory.map(r => `  ${r.emoji} ${r.name} → room_id: ${r.roomId}`).join('\n')}`
    : ''

  const contextBlock = [
    allChatsContext.length > 0 ? `MENSAJES RECIENTES:\n${allChatsContext.join('\n\n')}` : '',
    parsedFilesContext.length > 0 ? `ARCHIVOS:\n${parsedFilesContext.join('\n')}` : '',
  ].filter(Boolean).join('\n\n') || '(Sin contexto de chats disponible)'

  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const systemPrompt = buildSystemPrompt(agentType, today, locationContext, activeRoom, aiRoomFiles.length > 0, directoryBlock)

  // ── Agentic loop with Tool Use ────────────────────────────────────────────
  const tools = getToolsForAgent(agentType)
  const ctx: ToolContext = {
    userId: user_id,
    replyRoomId: aiRoomId,
    supabase,
    roomDirectory,
    gcalLinks: [],
    excelMessages: [],
    sentRooms: new Set([aiRoomId]),
  }

  const userMessageContent = contextBlock
    ? `${contextBlock}\n\n---\nSOLICITUD: ${query}`
    : query

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory,
    { role: 'user', content: userMessageContent },
  ]

  let finalReply = ''

  try {
    for (let iteration = 0; iteration < 5; iteration++) {
      const response = await anthropic.messages.create({
        model: planConfig.model,
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages,
      })

      // Collect text from this turn
      const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text')
      if (textBlocks.length) finalReply += (finalReply ? '\n' : '') + textBlocks.map(b => b.text).join('\n')

      // If no tool calls or done → break
      const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) break

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const result = await executeTool(block.name, block.input as Record<string, unknown>, ctx)
          return { type: 'tool_result' as const, tool_use_id: block.id, content: result }
        })
      )

      // Add assistant turn + tool results for next iteration
      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })
    }
  } catch (err: any) {
    console.error('AI agent error:', err?.message ?? err)
    return NextResponse.json({ error: 'AI error: ' + (err?.message ?? 'unknown') }, { status: 500 })
  }

  // Append calendar links at end of reply
  if (ctx.gcalLinks.length > 0) {
    finalReply += '\n\n' + ctx.gcalLinks.join('\n')
  }

  // Save AI response to DB (encrypted)
  await supabase.from('demo_messages').insert({
    user_id,
    content: await encrypt(finalReply),
    type: 'ai',
    room_id: aiRoomId,
  })

  // Broadcast to all rooms that got messages
  await Promise.all([...ctx.sentRooms].map(r => broadcastToRoom(r)))

  // Stream the reply back word-by-word so the client sees it appear progressively
  const encoder = new TextEncoder()
  const tokens = finalReply.split(/(\s+)/)
  const stream = new ReadableStream({
    async start(controller) {
      for (const token of tokens) {
        if (!token) continue
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: token })}\n\n`))
        if (token.trim()) await new Promise(r => setTimeout(r, 18))
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
