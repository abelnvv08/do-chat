import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { to_user_id, from_name, task_content, task_id } = await req.json()
  if (!to_user_id) return NextResponse.json({ ok: false })

  const db = admin()
  const { data: sub } = await db
    .from('demo_push_subscriptions')
    .select('subscription')
    .eq('user_id', to_user_id)
    .single()

  if (!sub?.subscription) return NextResponse.json({ ok: false, reason: 'no_subscription' })

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY)
    return NextResponse.json({ ok: false, reason: 'no_vapid' })

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_SUBJECT ?? 'noreply@getdochat.com'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  try {
    await webpush.sendNotification(
      sub.subscription as webpush.PushSubscription,
      JSON.stringify({
        title: `📋 Nueva tarea de ${from_name}`,
        body: task_content?.slice(0, 100) ?? 'Tienes una nueva tarea asignada',
        tag: `task-${task_id}`,
        renotify: true,
        data: { type: 'task', taskId: task_id, userId: to_user_id },
      })
    )
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e.message })
  }
}
