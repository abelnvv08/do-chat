import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { parseAICommand } from '@/lib/utils'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const { conversationId, message, conversationName } = await req.json()

    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify member
    const { data: member } = await supabase
      .from('conversation_members')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Load last 30 messages for context
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('content, type, sender_id, created_at, profile:profiles(username, full_name)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(30)

    const { command, query } = parseAICommand(message)

    // Build conversation context
    const contextMessages = (recentMessages || [])
      .reverse()
      .filter((m) => m.type !== 'system')
      .map((m) => {
        const senderName = m.type === 'ai'
          ? 'do AI'
          : (m.profile as { username?: string; full_name?: string } | null)?.full_name ||
            (m.profile as { username?: string } | null)?.username ||
            'Usuario'
        return `[${senderName}]: ${m.content}`
      })
      .join('\n')

    const systemPrompt = buildSystemPrompt(command, conversationName)
    const userPrompt = buildUserPrompt(command, query, contextMessages)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('[AI Error]', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}

function buildSystemPrompt(command: string, chatName: string): string {
  const base = `Eres do, una IA accionable integrada en do-chat — una app de mensajería inteligente.
Estás en el chat llamado "${chatName}".
Tu rol: convertir conversaciones en productividad real. Eres conciso, directo y útil.
Responde siempre en español. No uses markdown excesivo — el chat muestra texto plano.
Nunca digas "Como IA" o "No puedo". Si no tienes información, dilo claramente y propón alternativas.`

  const commandGuide: Record<string, string> = {
    summarize: `${base}\nTarea específica: RESUMIR la conversación. Identifica: decisiones tomadas, compromisos adquiridos, temas principales. Formato: lista clara y concisa.`,
    extract_tasks: `${base}\nTarea específica: EXTRAER TAREAS Y PENDIENTES de la conversación. Lista cada tarea con: qué hay que hacer, quién la mencionó, y si hay fecha. Formato: lista numerada.`,
    search: `${base}\nTarea específica: BUSCAR información en la conversación según lo que pide el usuario. Cita los mensajes relevantes y da contexto.`,
    generate_report: `${base}\nTarea específica: GENERAR UN REPORTE completo de la conversación. Incluye: resumen ejecutivo, participantes, decisiones, tareas pendientes, próximos pasos.`,
    free: `${base}\nResponde la consulta del usuario basándote en el contexto de la conversación y tu conocimiento general. Sé útil y accionable.`,
  }

  return commandGuide[command] || commandGuide.free
}

function buildUserPrompt(command: string, query: string, context: string): string {
  if (!context) {
    return `El usuario pregunta: "${query}"\n\nNo hay mensajes previos en esta conversación.`
  }

  return `HISTORIAL DE CONVERSACIÓN:\n${context}\n\n---\nSOLICITUD DEL USUARIO: ${query}`
}
