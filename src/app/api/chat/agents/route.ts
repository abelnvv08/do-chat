import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
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

const AGENTS = [
  { key: 'finance', name: 'do Finance',   emoji: '💰', description: 'Facturas, gastos y reportes financieros' },
  { key: 'agenda',  name: 'do Agenda',    emoji: '📅', description: 'Reuniones, calendario y recordatorios' },
  { key: 'writing', name: 'do Redacción', emoji: '✍️', description: 'Emails, propuestas y documentos' },
  { key: 'search',  name: 'do Búsqueda',  emoji: '🔍', description: 'Búsqueda en internet en tiempo real' },
]

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  if (sessionUser.id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = admin()
  const created: string[] = []

  for (const agent of AGENTS) {
    const roomId = `ai-${agent.key}-${user_id}`
    const { error: roomErr } = await db.from('demo_rooms').upsert({
      id: roomId,
      name: agent.name,
      type: 'ai',
      emoji: agent.emoji,
      created_by: user_id,
    })
    if (roomErr) continue

    await db.from('demo_room_members').upsert({ room_id: roomId, user_id })
    created.push(agent.key)
  }

  return NextResponse.json({ ok: true, created })
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ agents: [] })

  const db = admin()
  const agentRoomIds = AGENTS.map(a => `ai-${a.key}-${userId}`)
  const { data } = await db.from('demo_rooms').select('id, name, emoji').in('id', agentRoomIds)

  return NextResponse.json({ agents: data ?? [] })
}
