import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ ok: false })

  const supabase = admin()
  const now = new Date().toISOString()

  // Get due reminders not yet sent
  const { data: reminders } = await supabase
    .from('demo_reminders')
    .select('id, content')
    .eq('user_id', user_id)
    .eq('done', false)
    .lte('remind_at', now)

  if (!reminders || reminders.length === 0) return NextResponse.json({ ok: true, sent: 0 })

  // Get push subscription
  const { data: sub } = await supabase
    .from('demo_push_subscriptions')
    .select('subscription')
    .eq('user_id', user_id)
    .single()

  if (!sub?.subscription) return NextResponse.json({ ok: true, sent: 0 })

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ ok: false, error: 'VAPID keys not configured' })
  }
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_SUBJECT ?? 'noreply@example.com'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  let sent = 0
  for (const r of reminders) {
    try {
      await webpush.sendNotification(
        sub.subscription as webpush.PushSubscription,
        JSON.stringify({ title: '🔔 Recordatorio · do-chat', body: r.content, tag: r.id })
      )
      await supabase.from('demo_reminders').update({ done: true }).eq('id', r.id)
      sent++
    } catch { /* subscription expired or invalid */ }
  }

  return NextResponse.json({ ok: true, sent })
}
