import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { message, history } = await req.json()

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Eres do, una IA accionable integrada en do-chat.
Tu rol: convertir conversaciones en productividad real.
Eres conciso, directo y útil. Responde siempre en español.
Puedes resumir conversaciones, extraer tareas, buscar información, generar reportes y responder cualquier consulta con contexto del chat.`,
    messages: [
      ...history,
      { role: 'user', content: message }
    ],
  })

  const reply = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ reply })
}
