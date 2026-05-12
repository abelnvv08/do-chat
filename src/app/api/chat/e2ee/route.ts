import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const BUCKET = 'demo-files'
const path = (userId: string) => `e2ee/${userId}.pub`

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

  const db = admin()
  const { data } = await db.storage.from(BUCKET).download(path(userId))
  if (!data) return NextResponse.json({ public_key: null })

  const text = await data.text()
  return NextResponse.json({ public_key: text })
}

export async function POST(req: NextRequest) {
  const { user_id, public_key } = await req.json()
  if (!user_id || !public_key) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = admin()
  const encoder = new TextEncoder()
  await db.storage.from(BUCKET).upload(path(user_id), encoder.encode(public_key), {
    contentType: 'text/plain',
    upsert: true,
  })

  return NextResponse.json({ ok: true })
}
