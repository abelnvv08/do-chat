import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

async function getSessionUser(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { audio_url } = await req.json()
  if (!audio_url) return NextResponse.json({ error: 'Missing audio_url' }, { status: 400 })

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) return NextResponse.json({ error: 'Transcription not configured' }, { status: 503 })

  // Fetch the audio file from Supabase storage
  const audioRes = await fetch(audio_url)
  if (!audioRes.ok) return NextResponse.json({ error: 'Could not fetch audio' }, { status: 400 })

  const audioBuffer = await audioRes.arrayBuffer()
  const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' })

  // Send to Groq Whisper
  const form = new FormData()
  form.append('file', audioBlob, 'audio.webm')
  form.append('model', 'whisper-large-v3-turbo')
  form.append('language', 'es')
  form.append('response_format', 'json')

  const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}` },
    body: form,
  })

  if (!groqRes.ok) {
    const err = await groqRes.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const { text } = await groqRes.json()
  return NextResponse.json({ transcript: text })
}
