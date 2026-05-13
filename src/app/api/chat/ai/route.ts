import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const PLAN_CONFIG: Record<string, { model: string; limit: number }> = {
  free:     { model: 'claude-haiku-4-5-20251001', limit: 5   },
  pro:      { model: 'claude-sonnet-4-6',         limit: 200 },
  business: { model: 'claude-sonnet-4-6',         limit: 999 },
}

export async function POST(req: NextRequest) {
  const { user_id, query } = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Plan + rate limit
  const { data: profileData } = await supabase.from('demo_profiles').select('plan').eq('id', user_id).single()
  const plan = (profileData?.plan ?? 'free') as string
  const planConfig = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const { count } = await supabase.from('demo_messages').select('id', { count: 'exact', head: true })
    .eq('user_id', user_id).eq('type', 'ai').gte('created_at', todayStart.toISOString())

  if ((count ?? 0) >= planConfig.limit) {
    const upgradeTip = plan === 'free' ? ' Mejora a Pro para 200 consultas/día. 👉 getdochat.com/#precios' : ''
    const reply = `Alcanzaste tu límite de ${planConfig.limit} consultas diarias del plan ${plan}.${upgradeTip} El límite se reinicia a medianoche. 🌙`
    return NextResponse.json({ reply })
  }

  const { data: recentMessages } = await supabase
    .from('demo_messages')
    .select('content, type, user:demo_profiles(name)')
    .order('created_at', { ascending: false })
    .limit(40)

  const context = (recentMessages || [])
    .reverse()
    .filter(m => m.type !== 'ai')
    .map(m => `[${(m.user as unknown as { name: string } | null)?.name ?? 'User'}]: ${m.content}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: planConfig.model,
    max_tokens: 1024,
    system: `You are DO AI, an actionable assistant inside DO Chat.
You turn conversations into real productivity: summaries, tasks, reports, searches, analysis.
Be concise, direct and helpful. Respond in the same language the user writes in.
Do not use excessive markdown — respond in plain text with line breaks when needed.`,
    messages: [{
      role: 'user',
      content: context
        ? `CHAT HISTORY:\n${context}\n\n---\nREQUEST: ${query}`
        : query
    }]
  })

  const reply = response.content[0].type === 'text' ? response.content[0].text : ''

  await supabase.from('demo_messages').insert({
    user_id,
    content: reply,
    type: 'ai',
  })

  return NextResponse.json({ reply })
}
