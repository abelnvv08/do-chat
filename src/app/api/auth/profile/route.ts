// Run in Supabase SQL editor:
// create table demo_profiles (
//   id uuid references auth.users on delete cascade primary key,
//   name text not null,
//   phone text,
//   emoji text not null default '😊',
//   bg text not null default 'bg-blue-600',
//   text_color text not null default 'text-white',
//   created_at timestamptz default now()
// );
// create table demo_rooms (
//   id text primary key,
//   name text,
//   type text not null default 'dm',
//   emoji text default '💬',
//   created_by uuid references demo_profiles(id),
//   created_at timestamptz default now()
// );
// create table demo_room_members (
//   room_id text references demo_rooms(id) on delete cascade,
//   user_id uuid references demo_profiles(id) on delete cascade,
//   primary key (room_id, user_id),
//   joined_at timestamptz default now()
// );
// alter table demo_profiles enable row level security;
// create policy "profiles_read" on demo_profiles for select using (true);
// create policy "profiles_write" on demo_profiles for all using (auth.uid() = id);

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const BG_COLORS = [
  'bg-violet-600',
  'bg-emerald-600',
  'bg-amber-500',
  'bg-blue-600',
  'bg-rose-500',
  'bg-cyan-600',
  'bg-orange-500',
  'bg-purple-600',
]

const EMOJIS = ['😊','😎','🤙','🔥','⚡','🦁','🐺','🦊','🐉','🎯','🚀','💎','🌊','🎸','🏆','🌙','⭐','🎭','🦋','💫']

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function getAuthUser(req: NextRequest) {
  // Try Bearer token first (client sends it explicitly)
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user } } = await db.auth.getUser(token)
    if (user) return user
  }

  // Fall back to cookie-based session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ profile: null })

  const db = admin()
  const { data: profile } = await db
    .from('demo_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ profile: profile ?? null })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, emoji } = body as { name: string; emoji: string }

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Name too short' }, { status: 400 })
  }

  const emojiIndex = EMOJIS.indexOf(emoji)
  const bg = emoji ? BG_COLORS[(emojiIndex >= 0 ? emojiIndex : 0) % BG_COLORS.length] : 'bg-gray-300'
  const phone = user.phone ?? user.email ?? null

  const db = admin()

  // Upsert profile
  const { data: profile, error: profileError } = await db
    .from('demo_profiles')
    .upsert({
      id: user.id,
      name,
      emoji: emoji ?? '',
      bg,
      text_color: 'text-white',
      phone,
    })
    .select()
    .single()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Create AI room
  const aiRoomId = `ai-${user.id}`
  await db.from('demo_rooms').upsert({
    id: aiRoomId,
    name: 'do AI',
    type: 'ai',
    emoji: '✦',
    created_by: user.id,
  })

  // Add user to AI room
  await db.from('demo_room_members').upsert({
    room_id: aiRoomId,
    user_id: user.id,
  })

  return NextResponse.json({ profile, room_id: aiRoomId })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, emoji, username, avatar_url } = await req.json()
  if (!name || name.length < 2) return NextResponse.json({ error: 'Name too short' }, { status: 400 })

  const db = admin()
  const updates: Record<string, string | null> = { name }

  if (emoji !== undefined) {
    const emojiIndex = EMOJIS.indexOf(emoji)
    const bg = BG_COLORS[(emojiIndex >= 0 ? emojiIndex : 0) % BG_COLORS.length]
    updates.emoji = emoji
    updates.bg = bg
  }

  if (avatar_url !== undefined) updates.avatar_url = avatar_url ?? null

  if (username) {
    const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
    const { data: taken } = await db.from('demo_profiles').select('id').eq('username', clean).neq('id', user.id).single()
    if (taken) return NextResponse.json({ error: 'Nombre de usuario no disponible' }, { status: 409 })
    updates.username = clean
  }

  const { data: profile, error } = await db
    .from('demo_profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile })
}
