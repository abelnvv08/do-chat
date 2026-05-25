import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import Anthropic from '@anthropic-ai/sdk'
import { getAIRoom } from '@/lib/demo'
import { parseFile } from '@/lib/file-parser'
import { broadcastToRoom } from '@/lib/realtime-broadcast'
import { encrypt, decrypt } from '@/lib/encryption'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function getSessionUser(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// ── Tool definitions (clean, English, precise) ────────────────────────────────
const ALL_TOOLS: Anthropic.Tool[] = [
  {
    name: 'send_message',
    description: 'Send a message to a contact or group. Use the exact room_id from the directory. Only call this when the user explicitly asks to send a message.',
    input_schema: {
      type: 'object' as const,
      properties: {
        room_id: { type: 'string', description: 'Target room ID (dm-xxx or group-xxx)' },
        message: { type: 'string', description: 'The message text to send' },
      },
      required: ['room_id', 'message'],
    },
  },
  {
    name: 'create_task',
    description: 'Add a task to the user\'s task list. Only call this when explicitly asked to create a task.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: { type: 'string', description: 'Task description' },
        due_date: { type: 'string', description: 'Due date YYYY-MM-DD (optional)' },
      },
      required: ['content'],
    },
  },
  {
    name: 'create_reminder',
    description: 'Create a time-based reminder. Only call this when explicitly asked.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: { type: 'string', description: 'Reminder description' },
        remind_at: { type: 'string', description: 'Exact date and time ISO 8601: YYYY-MM-DDTHH:MM' },
      },
      required: ['content', 'remind_at'],
    },
  },
  {
    name: 'save_project',
    description: 'Save a document, report, meeting notes, or draft to the Projects section.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Document title' },
        content: { type: 'string', description: 'Full content in markdown' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'search_web',
    description: 'Search the internet for real-time information. ONLY use for: breaking news, live prices/quotes, current weather, sports scores, very recent events (last 48h). Do NOT use for general knowledge, history, concepts, or anything in your training data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_calendar_event',
    description: 'Generate a Google Calendar event link the user can add in one click.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Event title' },
        start: { type: 'string', description: 'Start: YYYY-MM-DDTHH:MM' },
        end: { type: 'string', description: 'End: YYYY-MM-DDTHH:MM' },
        description: { type: 'string', description: 'Event description or agenda (optional)' },
      },
      required: ['title', 'start', 'end'],
    },
  },
  {
    name: 'generate_excel',
    description: 'Generate a downloadable Excel file with structured data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        filename: { type: 'string', description: 'File name (no extension)' },
        headers: { type: 'array', items: { type: 'string' }, description: 'Column headers' },
        rows: { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: 'Data rows' },
      },
      required: ['filename', 'headers', 'rows'],
    },
  },
]

// ── Location context ──────────────────────────────────────────────────────────
type CountryCtx = { name: string; currency: string }
const COUNTRY_CTX: Record<string, CountryCtx> = {
  MX: { name: 'México',               currency: 'MXN (Mexican peso, $)' },
  AR: { name: 'Argentina',            currency: 'ARS (Argentine peso, $)' },
  CO: { name: 'Colombia',             currency: 'COP (Colombian peso, $)' },
  CL: { name: 'Chile',                currency: 'CLP (Chilean peso, $)' },
  ES: { name: 'España',               currency: 'EUR (Euro, €)' },
  PE: { name: 'Perú',                 currency: 'PEN (Sol, S/.)' },
  US: { name: 'United States',        currency: 'USD (Dollar, $)' },
  GT: { name: 'Guatemala',            currency: 'GTQ (Quetzal, Q)' },
  CR: { name: 'Costa Rica',           currency: 'CRC (Colón, ₡)' },
  DO: { name: 'República Dominicana', currency: 'DOP (Dominican peso, $)' },
  BR: { name: 'Brasil',               currency: 'BRL (Real, R$)' },
}

const SPANISH_COUNTRIES  = new Set(['MX','CO','AR','CL','PE','VE','EC','GT','CU','BO','DO','HN','PY','SV','NI','CR','PA','UY','ES','PR','GQ'])
const PORTUGUESE_COUNTRIES = new Set(['BR','PT','AO','MZ','CV','ST','GW','TL'])

function detectLang(countryCode: string | null): 'es' | 'pt' | 'en' {
  if (!countryCode) return 'es'
  if (SPANISH_COUNTRIES.has(countryCode))   return 'es'
  if (PORTUGUESE_COUNTRIES.has(countryCode)) return 'pt'
  return 'en'
}

function buildLocationLine(countryCode: string | null, city: string | null): string {
  if (!countryCode) return ''
  const geo = COUNTRY_CTX[countryCode]
  const parts = [geo?.name ?? countryCode, city].filter(Boolean)
  return `Location: ${parts.join(', ')}. Currency: ${geo?.currency ?? 'local currency'}.`
}

// ── Detect whether query needs workspace context ──────────────────────────────
function needsWorkspaceContext(query: string): boolean {
  return /\b(chat|mensaje|conversaci[oó]n|@\w|contact|tarea|pendiente|recordatorio|calendar|resumir|resum[eéa]|qu[eé].*dijo|qu[eé].*hablaron|summary|summarize|task|reminder|send|envi[aáó]|enviar|chats|historial|mis.*chat|review.*chat|archivo|excel|spreadsheet|proyecto|project|document)\b/i.test(query)
}

// ── Plan config ───────────────────────────────────────────────────────────────
const PLAN_CONFIG: Record<string, { model: string; limit: number }> = {
  free:     { model: 'claude-haiku-4-5',  limit: 20 },
  pro:      { model: 'claude-sonnet-4-5', limit: 100 },
  business: { model: 'claude-sonnet-4-5', limit: 300 },
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
    const answer = data.answer ? `Summary: ${data.answer}\n\n` : ''
    const sources = (data.results as { title: string; url: string; content: string }[])
      .map(r => `**${r.title}**\n${r.content.slice(0, 400)}\nSource: ${r.url}`)
      .join('\n\n---\n\n')
    return answer + sources
  } catch { return null }
}

// ── Message loading ───────────────────────────────────────────────────────────
type RawMessage = { content: string; type: string; room_id: string; created_at: string; user_id: string; user?: unknown }
const _profileNameCache: Record<string, string> = {}

async function getMessagesFromRoom(roomId: string, limit = 40): Promise<RawMessage[]> {
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
    user: { name: _profileNameCache[m.user_id] ?? '?' },
  })))
  return decrypted.reverse() as RawMessage[]
}

function getSenderName(msg: RawMessage): string {
  if (msg.type === 'ai') return 'DO AI'
  return (msg.user as { name: string } | null)?.name ?? '?'
}

// ── Tool executor ─────────────────────────────────────────────────────────────
type ToolContext = {
  userId: string
  replyRoomId: string
  supabase: ReturnType<typeof admin>
  roomDirectory: { name: string; emoji: string; roomId: string }[]
  gcalLinks: string[]
  sentRooms: Set<string>
  lang: string
}

async function executeTool(name: string, input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const db = ctx.supabase
  const es = ctx.lang === 'es'

  if (name === 'send_message') {
    const { room_id, message } = input as { room_id: string; message: string }
    const roomName = ctx.roomDirectory.find(r => r.roomId === room_id)?.name ?? room_id
    await db.from('demo_messages').insert({ user_id: ctx.userId, content: await encrypt(message), type: 'text', room_id })
    ctx.sentRooms.add(room_id)
    return es ? `Mensaje enviado a ${roomName}.` : `Message sent to ${roomName}.`
  }

  if (name === 'create_task') {
    const { content, due_date } = input as { content: string; due_date?: string }
    await db.from('demo_tasks').insert({ user_id: ctx.userId, content, due_date: due_date ?? null, source_room: ctx.replyRoomId })
    return es
      ? `Tarea creada: "${content}"${due_date ? ` — vence ${due_date}` : ''}.`
      : `Task created: "${content}"${due_date ? ` — due ${due_date}` : ''}.`
  }

  if (name === 'create_reminder') {
    const { content, remind_at } = input as { content: string; remind_at: string }
    await db.from('demo_reminders').insert({ user_id: ctx.userId, content, remind_at })
    return es
      ? `Recordatorio guardado: "${content}" para ${remind_at}.`
      : `Reminder set: "${content}" for ${remind_at}.`
  }

  if (name === 'save_project') {
    const { title, content } = input as { title: string; content: string }
    await db.from('demo_projects').insert({ user_id: ctx.userId, title, content })
    return es ? `Documento "${title}" guardado en Proyectos.` : `Document "${title}" saved to Projects.`
  }

  if (name === 'search_web') {
    const { query } = input as { query: string }
    const results = await tavilySearch(query)
    return results ?? (es ? 'Sin resultados.' : 'No results found.')
  }

  if (name === 'create_calendar_event') {
    const { title, start, end, description = '' } = input as { title: string; start: string; end: string; description?: string }
    const fmt = (s: string) => s.replace(/[-:]/g, '').padEnd(15, '0')
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(description)}`
    const startDt = new Date(start)
    const locale = es ? 'es-MX' : 'en-US'
    const dateStr = startDt.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
    const timeStr = startDt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    ctx.gcalLinks.push(`[GCAL:${title}|${dateStr} · ${timeStr}|${gcalUrl}]`)
    return es
      ? `Evento "${title}" listo para ${dateStr} a las ${timeStr}.`
      : `Event "${title}" ready for ${dateStr} at ${timeStr}.`
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
      XLSX.utils.book_append_sheet(wb, ws, 'Data')
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      const fname = `${filename.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s_-]/g, '').trim()}.xlsx`
      const storagePath = `excel/${Date.now()}-${fname}`
      const { error } = await db.storage.from('demo-files').upload(storagePath, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      })
      if (!error) {
        const { data: { publicUrl } } = db.storage.from('demo-files').getPublicUrl(storagePath)
        const meta = JSON.stringify({ url: publicUrl, name: fname, size: buffer.length })
        await db.from('demo_messages').insert({ user_id: ctx.userId, content: meta, type: 'file', room_id: ctx.replyRoomId })
        return es
          ? `Excel "${fname}" generado con ${rows.length} filas.`
          : `Excel "${fname}" generated with ${rows.length} rows.`
      }
    } catch { /* fall through */ }
    return es ? 'No se pudo generar el Excel.' : 'Could not generate the Excel file.'
  }

  return 'Tool not found.'
}

// ── System prompt — conversational, GPT-quality ───────────────────────────────
function buildSystemPrompt(opts: {
  today: string
  locationLine: string
  lang: string
  directoryBlock: string
  activeRoom: string | null
  hasContext: boolean
  hasFiles: boolean
}): string {
  const { today, locationLine, lang, directoryBlock, activeRoom, hasContext, hasFiles } = opts
  const langRule = lang === 'es'
    ? 'Always respond in Spanish unless the user writes in another language.'
    : lang === 'pt'
    ? 'Always respond in Portuguese unless the user writes in another language.'
    : 'Always respond in English unless the user writes in another language.'

  return `You are DO AI — an advanced AI assistant embedded in DO Chat, a business messaging platform.

You have expert-level knowledge across every domain: mathematics, science, history, philosophy, business, law, medicine, technology, programming, creative writing, and more. You reason carefully, give accurate and nuanced answers, and adapt to what each user needs.

## YOUR WORKSPACE POWERS
You can take real actions inside this user's workspace:
- Send messages to any contact in their network
- Create tasks and set time-based reminders
- Schedule calendar events (Google Calendar links)
- Generate Excel spreadsheets with structured data
- Save documents and reports to their Projects section
- Search the internet for live information
${directoryBlock ? `\n${directoryBlock}` : ''}
${activeRoom ? `\nActive chat: room_id ${activeRoom} — "this chat" or "here" refers to it.` : ''}

## PERSONALITY & STYLE
- Direct and confident — get to the point immediately, no filler phrases
- Never start with "Great question!", "Certainly!", "Of course!", "Absolutely!", or similar sycophantic openers — just answer
- Honest about uncertainty — if you're not sure, say so clearly and explain what you do know
- Use markdown (bold, bullet lists, numbered lists, code blocks, tables) when it makes the response clearer
- Match the user's energy: casual if they're casual, technical if they're technical
- For code: always use properly fenced code blocks with the language identifier
- For math: show your reasoning step by step when calculation is involved
- For writing tasks: produce the actual content, not a description of it

## TOOL USE RULES
Only use tools when explicitly required — never speculatively:

✅ USE search_web: only for live data — today's breaking news, current stock prices, live sports scores, real-time weather. NEVER for facts already in your training data (history, science, concepts, general knowledge).

✅ USE create_task / create_reminder: only when user explicitly says "create a task", "remind me", "add to my to-do", etc.

✅ USE send_message: only when user explicitly says to send a specific message to a specific contact.

✅ USE generate_excel: only when user asks for a spreadsheet, table download, or Excel file.

✅ USE save_project: only when user asks to save/document/archive something.

❌ DO NOT use any tool just to show capability. For explanations, analysis, writing, coding, math, general questions — JUST ANSWER directly.

## CONTEXT RULES
${hasContext
  ? 'Chat context is provided. Use it when the user asks about their conversations, contacts, or workspace data. For pure knowledge questions unrelated to their chats, ignore the context and answer from your training.'
  : 'No chat context loaded. Answer from your knowledge.'}
${hasFiles ? '\nThe user has attached files — analyze their content as needed.' : ''}

## RESPONSE LENGTH
- Simple factual questions: 1–3 sentences
- Technical explanations: as long as needed, use structure
- Creative tasks: produce complete, high-quality output
- Summaries: concise, hit the key points

${langRule}
Today: ${today}.${locationLine ? ` ${locationLine}` : ''}`
}

function buildLimitMessage(lang: string, limit: number): string {
  if (lang === 'pt') return `Você atingiu o limite de ${limit} consultas diárias. O limite é renovado à meia-noite. 🌙`
  if (lang === 'es') return `Alcanzaste el límite de ${limit} consultas diarias. El límite se renueva a medianoche. 🌙`
  return `You've reached your ${limit} daily query limit. Resets at midnight. 🌙`
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { user_id, query, room_id: replyRoomId, lang: clientLang } = await req.json()

  const sessionUser = await getSessionUser(req)
  if (!sessionUser || sessionUser.id !== user_id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabase = admin()
  const aiRoomId = replyRoomId ?? getAIRoom(user_id)

  // ── Plan + rate limit ────────────────────────────────────────────────────────
  const { data: profileData } = await supabase.from('demo_profiles').select('plan').eq('id', user_id).single()
  const plan = (profileData?.plan ?? 'free') as string
  const planConfig = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const { count } = await supabase.from('demo_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user_id).eq('type', 'ai').gte('created_at', todayStart.toISOString())
  if ((count ?? 0) >= planConfig.limit) {
    const geoCountry = req.headers.get('x-vercel-ip-country') ?? null
    const effectiveLang = (clientLang === 'es' || clientLang === 'pt' || clientLang === 'en') ? clientLang : detectLang(geoCountry)
    const msg = buildLimitMessage(effectiveLang, planConfig.limit)
    await supabase.from('demo_messages').insert({ user_id, content: msg, type: 'ai_limit', room_id: aiRoomId })
    return new Response(JSON.stringify({ reply: msg }), { headers: { 'Content-Type': 'application/json' } })
  }

  // ── Location + language ──────────────────────────────────────────────────────
  const geoCountry = req.headers.get('x-vercel-ip-country') ?? null
  const geoCity = req.headers.get('x-vercel-ip-city') ? decodeURIComponent(req.headers.get('x-vercel-ip-city')!) : null
  const effectiveLang: 'es' | 'pt' | 'en' =
    (clientLang === 'es' || clientLang === 'pt' || clientLang === 'en') ? clientLang : detectLang(geoCountry)
  const locationLine = buildLocationLine(geoCountry, geoCity)

  // ── Conversation history from AI room (last 40 messages) ────────────────────
  const aiMsgs = await getMessagesFromRoom(aiRoomId, 42)
  const aiHistoryMsgs = aiMsgs.slice(0, -1) // exclude the current message we're about to add

  const aiRoomFiles: { name: string; url: string }[] = []
  for (const m of aiHistoryMsgs) {
    if (m.type === 'file') {
      try { aiRoomFiles.push(JSON.parse(m.content)) } catch { /* skip */ }
    }
  }

  // Build proper alternating conversation turns for Claude
  const rawTurns: Anthropic.MessageParam[] = []
  for (const m of aiHistoryMsgs) {
    if (m.type === 'text') {
      rawTurns.push({ role: 'user', content: m.content.slice(0, 1200) })
    } else if (m.type === 'ai') {
      const cleaned = m.content.replace(/\[GCAL:[^\]]+\]/g, '').trim()
      rawTurns.push({ role: 'assistant', content: cleaned.slice(0, 2000) || '…' })
    }
  }
  // Ensure strict alternation and start with user
  const conversationHistory: Anthropic.MessageParam[] = []
  for (const msg of rawTurns) {
    if (conversationHistory.length === 0) {
      if (msg.role === 'user') conversationHistory.push(msg)
    } else if (conversationHistory[conversationHistory.length - 1].role !== msg.role) {
      conversationHistory.push(msg)
    }
  }
  // Must end with assistant for proper context
  while (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role !== 'assistant') {
    conversationHistory.pop()
  }

  // ── Smart context loading — only when the query needs it ─────────────────────
  const queryNeedsContext = needsWorkspaceContext(query)
  const activeRoom = replyRoomId && replyRoomId !== aiRoomId ? replyRoomId : null

  const allChatsContext: string[] = []
  const allFiles: { name: string; url: string; sender: string; room: string }[] = []
  const roomDirectory: { name: string; emoji: string; roomId: string }[] = []

  async function loadRoomContext(roomId: string, roomName: string, roomEmoji: string, limit: number) {
    roomDirectory.push({ name: roomName, emoji: roomEmoji, roomId })
    const msgs = await getMessagesFromRoom(roomId, limit)
    if (!msgs.length) return
    const lines: string[] = []
    for (const m of msgs) {
      const sender = getSenderName(m)
      if (m.type === 'text' || m.type === 'ai') {
        lines.push(`  [${sender}]: ${m.content.slice(0, 600)}`)
      } else if (m.type === 'image') {
        lines.push(`  [${sender}]: [image]`)
      } else if (m.type === 'file') {
        try {
          const meta = JSON.parse(m.content)
          lines.push(`  [${sender}]: [file: ${meta.name}]`)
          allFiles.push({ name: meta.name, url: meta.url, sender, room: roomName })
        } catch { lines.push(`  [${sender}]: [file]`) }
      }
    }
    if (lines.length) allChatsContext.push(`--- ${roomEmoji} ${roomName} (room_id: ${roomId}) ---\n${lines.join('\n')}`)
  }

  if (queryNeedsContext || activeRoom) {
    if (activeRoom) {
      const { data: roomData } = await supabase.from('demo_rooms').select('name, emoji').eq('id', activeRoom).single()
      await loadRoomContext(activeRoom, roomData?.name ?? activeRoom, roomData?.emoji ?? '💬', 100)
    }

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

    for (const room of rooms.slice(0, 10)) {
      if (room.id === activeRoom) continue
      await loadRoomContext(room.id, room.name, room.emoji, 30)
    }
  }

  // Parse attached files
  const parsedFilesContext: string[] = []
  if (aiRoomFiles.length > 0) {
    for (const f of aiRoomFiles.slice(0, 2)) {
      const content = await parseFile(f.url, f.name)
      if (content) parsedFilesContext.push(`\n--- Attached file: "${f.name}" ---\n${content}`)
    }
  }
  const shouldParseOtherFiles = /archivo|excel|word|pdf|csv|documento|tabla|dato|factura|recibo|cuenta|invoice|contrato|reporte|presupuesto|verifica|revisa|analiza|file|document|spreadsheet/i.test(query)
  if (shouldParseOtherFiles && allFiles.length > 0) {
    for (const f of allFiles.slice(0, 3)) {
      const content = await parseFile(f.url, f.name)
      if (content) parsedFilesContext.push(`\n--- "${f.name}" (from ${f.room}) ---\n${content}`)
    }
  }

  // ── Build final message content ───────────────────────────────────────────────
  const hasContext = allChatsContext.length > 0 || parsedFilesContext.length > 0
  const directoryBlock = roomDirectory.length > 0
    ? `Available chats:\n${roomDirectory.map(r => `  ${r.emoji} ${r.name} → ${r.roomId}`).join('\n')}`
    : ''

  const today = new Date().toLocaleDateString(effectiveLang === 'en' ? 'en-US' : 'es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const systemPrompt = buildSystemPrompt({
    today, locationLine, lang: effectiveLang, directoryBlock,
    activeRoom, hasContext, hasFiles: aiRoomFiles.length > 0,
  })

  // Assemble user message (context only when needed)
  const contextSections: string[] = []
  if (allChatsContext.length) contextSections.push(`CHAT HISTORY:\n${allChatsContext.join('\n\n')}`)
  if (parsedFilesContext.length) contextSections.push(`FILES:\n${parsedFilesContext.join('\n')}`)

  const userMessageContent = contextSections.length > 0
    ? `${contextSections.join('\n\n')}\n\n---\nREQUEST: ${query}`
    : query

  // ── Agentic loop with tool use ────────────────────────────────────────────────
  const ctx: ToolContext = {
    userId: user_id,
    replyRoomId: aiRoomId,
    supabase,
    roomDirectory,
    gcalLinks: [],
    sentRooms: new Set([aiRoomId]),
    lang: effectiveLang,
  }

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory,
    { role: 'user', content: userMessageContent },
  ]

  let toolCallsDone = false
  let finalReply = ''

  // Phase 1: execute tool calls (non-streaming, max 4 iterations)
  for (let iteration = 0; iteration < 4; iteration++) {
    const response = await anthropic.messages.create({
      model: planConfig.model,
      max_tokens: 4096,
      system: systemPrompt,
      tools: ALL_TOOLS,
      messages,
    })

    const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    const textBlocks    = response.content.filter((b): b is Anthropic.TextBlock    => b.type === 'text')

    // No tool calls → this IS the final response
    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
      finalReply = textBlocks.map(b => b.text).join('\n').trim()
      toolCallsDone = true
      break
    }

    // Execute tools in parallel
    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => {
        const result = await executeTool(block.name, block.input as Record<string, unknown>, ctx)
        return { type: 'tool_result' as const, tool_use_id: block.id, content: result }
      })
    )

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })
  }

  // If tools were used, get a final synthesis (streaming)
  // If no tools, we already have finalReply and will stream it below

  // Append calendar links
  if (ctx.gcalLinks.length > 0) {
    finalReply = finalReply
      ? `${finalReply}\n\n${ctx.gcalLinks.join('\n')}`
      : ctx.gcalLinks.join('\n')
  }

  // ── Stream response back to client ───────────────────────────────────────────
  const encoder = new TextEncoder()

  if (!toolCallsDone || !finalReply) {
    // Tools were used but no final text yet → make a streaming synthesis call
    let streamController!: ReadableStreamDefaultController<Uint8Array>
    const readable = new ReadableStream<Uint8Array>({
      start(c) { streamController = c }
    })

    ;(async () => {
      try {
        const stream = anthropic.messages.stream({
          model: planConfig.model,
          max_tokens: 2048,
          system: systemPrompt,
          messages,
        })

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            finalReply += chunk.delta.text
            streamController.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`))
          }
        }
      } catch (err: any) {
        console.error('AI stream error:', err?.message ?? err)
      }

      if (ctx.gcalLinks.length > 0) {
        const gcalText = '\n\n' + ctx.gcalLinks.join('\n')
        finalReply += gcalText
        streamController.enqueue(encoder.encode(`data: ${JSON.stringify({ text: gcalText })}\n\n`))
      }

      // Save to DB
      await supabase.from('demo_messages').insert({
        user_id, content: await encrypt(finalReply), type: 'ai', room_id: aiRoomId,
      })

      // Broadcast to rooms that received messages
      await Promise.all([...ctx.sentRooms].map(r => broadcastToRoom(r)))

      streamController.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
      streamController.close()
    })()

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  // We already have finalReply (no-tool path) → save and stream it
  await supabase.from('demo_messages').insert({
    user_id, content: await encrypt(finalReply), type: 'ai', room_id: aiRoomId,
  })
  await Promise.all([...ctx.sentRooms].map(r => broadcastToRoom(r)))

  // Stream the reply token by token (real words, fast)
  const tokens = finalReply.split(/(\s+)/)
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const token of tokens) {
        if (!token) continue
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: token })}\n\n`))
        if (token.trim()) await new Promise(r => setTimeout(r, 10))
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
