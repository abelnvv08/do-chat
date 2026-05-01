import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { user_id, query } = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: recentMessages } = await supabase
    .from('demo_messages')
    .select('content, type, user:demo_users(name)')
    .order('created_at', { ascending: false })
    .limit(40)

  const context = (recentMessages || [])
    .reverse()
    .filter(m => m.type !== 'ai')
    .map(m => `[${(m.user as unknown as { name: string } | null)?.name ?? 'Usuario'}]: ${m.content}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Eres do, una IA accionable dentro de do-chat.
Conviertes conversaciones en productividad real: resúmenes, tareas, reportes, búsquedas, análisis.
Eres conciso, directo y útil. Responde siempre en español.
No uses markdown excesivo — responde en texto plano con saltos de línea cuando sea necesario.`,
    messages: [{
      role: 'user',
      content: context
        ? `HISTORIAL DEL CHAT:\n${context}\n\n---\nSOLICITUD: ${query}`
        : query
    }]
  })

  const reply = response.content[0].type === 'text' ? response.content[0].text : ''

  // Guardar respuesta de IA en el chat
  await supabase.from('demo_messages').insert({
    user_id,
    content: reply,
    type: 'ai',
  })

  return NextResponse.json({ reply })
}
