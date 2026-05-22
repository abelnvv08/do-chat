import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminSupabase } from '@/lib/admin-auth'
import { encrypt } from '@/lib/encryption'
import { broadcastToRoom } from '@/lib/realtime-broadcast'

/**
 * POST /api/admin/broadcast
 * Body: { message: string }
 *
 * Inserts an AI message into every user's AI room so they see it
 * the next time they open the app. Used for announcements.
 */
export async function POST(req: NextRequest) {
  const adminId = await requireAdmin(req)
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Missing message' }, { status: 400 })

  const db = adminSupabase()

  // Fetch all user IDs
  const { data: profiles, error } = await db
    .from('demo_profiles')
    .select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = (profiles ?? []).map((p: any) => p.id as string)
  if (userIds.length === 0) return NextResponse.json({ ok: true, sent: 0 })

  const encrypted = await encrypt(message.trim())
  const now = new Date().toISOString()

  // Batch insert — Supabase accepts arrays up to a few thousand rows
  const rows = userIds.map(id => ({
    user_id: id,
    content: encrypted,
    type: 'ai',
    room_id: `ai-${id}`,
    created_at: now,
  }))

  const { error: insertErr } = await db.from('demo_messages').insert(rows)
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Notify connected sockets — fire-and-forget for each room
  // (we don't await because it could be slow for large user bases)
  for (const id of userIds) {
    broadcastToRoom(`ai-${id}`).catch(() => {})
  }

  return NextResponse.json({ ok: true, sent: userIds.length })
}
