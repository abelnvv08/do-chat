// Run in Supabase SQL editor to add name columns:
// alter table demo_contacts add column if not exists first_name text;
// alter table demo_contacts add column if not exists last_name text;

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getDMRoom } from '@/lib/demo'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function displayName(row: { first_name?: string; last_name?: string }, profileName: string) {
  const parts = [row.first_name, row.last_name].filter(Boolean).join(' ')
  return parts || profileName
}

export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get('user_id')
  if (!user_id) return NextResponse.json({ contacts: [] })

  const supabase = admin()
  const { data } = await supabase
    .from('demo_contacts')
    .select('contact_id, first_name, last_name, demo_profiles!demo_contacts_contact_id_fkey(id, name, emoji, bg, avatar_url)')
    .eq('user_id', user_id)
    .order('first_name', { ascending: true })

  const contacts = (data ?? []).map((row: any) => {
    const p = Array.isArray(row.demo_profiles) ? row.demo_profiles[0] : row.demo_profiles
    if (!p) return null
    return {
      id: p.id,
      name: displayName(row, p.name),
      firstName: row.first_name ?? '',
      lastName: row.last_name ?? '',
      emoji: p.emoji,
      bg: p.bg ?? 'bg-gray-400',
      avatar_url: p.avatar_url ?? null,
      room_id: getDMRoom(user_id, p.id),
    }
  }).filter(Boolean)

  return NextResponse.json({ contacts })
}

export async function POST(req: NextRequest) {
  const { user_id, contact_id, phone, first_name, last_name } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = admin()
  let profile: { id: string; name: string; emoji: string; bg: string; avatar_url?: string | null } | null = null

  if (contact_id) {
    const { data } = await supabase.from('demo_profiles').select('id, name, emoji, bg, avatar_url').eq('id', contact_id).single()
    profile = data
  } else if (phone) {
    const digits = phone.replace(/\D/g, '')
    // Try exact, with +, and suffix match (last 10 digits) to handle different country code formats
    const variants = [phone.trim(), `+${digits}`, digits]
    for (const v of variants) {
      const { data } = await supabase.from('demo_profiles').select('id, name, emoji, bg, avatar_url').eq('phone', v).neq('id', user_id).single()
      if (data) { profile = data; break }
    }
    // Last resort: match by last 10 digits
    if (!profile && digits.length >= 10) {
      const last10 = digits.slice(-10)
      const { data } = await supabase.from('demo_profiles').select('id, name, emoji, bg, avatar_url').ilike('phone', `%${last10}`).neq('id', user_id).single()
      if (data) profile = data
    }
  }

  if (!profile) return NextResponse.json({ error: 'No se encontró el usuario' }, { status: 404 })

  const customName = [first_name, last_name].filter(Boolean).join(' ') || profile.name

  await supabase.from('demo_contacts').upsert({
    user_id,
    contact_id: profile.id,
    first_name: first_name ?? null,
    last_name: last_name ?? null,
  })
  await supabase.from('demo_contacts').upsert({ user_id: profile.id, contact_id: user_id })

  const roomId = getDMRoom(user_id, profile.id)
  await supabase.from('demo_rooms').upsert({ id: roomId, name: 'dm', type: 'dm', emoji: '💬', created_by: user_id })
  await supabase.from('demo_room_members').upsert({ room_id: roomId, user_id })
  await supabase.from('demo_room_members').upsert({ room_id: roomId, user_id: profile.id })

  return NextResponse.json({
    contact: { id: profile.id, name: customName, emoji: profile.emoji, bg: profile.bg, avatar_url: profile.avatar_url ?? null, room_id: roomId }
  })
}

export async function DELETE(req: NextRequest) {
  const { user_id, contact_id } = await req.json()
  if (!user_id || !contact_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const supabase = admin()
  await supabase.from('demo_contacts').delete().eq('user_id', user_id).eq('contact_id', contact_id)
  return NextResponse.json({ ok: true })
}
