import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { caller_id, callee_id, caller_name, room_id, has_video } = await req.json()
  if (!caller_id || !callee_id || !room_id) return NextResponse.json({ ok: false })

  const db = admin()
  const { data: sub } = await db
    .from('demo_push_subscriptions')
    .select('subscription, user_id')
    .eq('user_id', callee_id)
    .single()

  if (!sub?.subscription) return NextResponse.json({ ok: false, reason: 'no_subscription' })

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ ok: false, reason: 'no_vapid' })
  }

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_SUBJECT ?? 'noreply@getdochat.com'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  // Get the callee's userId to build the deep link
  const { data: callerProfile } = await db.from('demo_profiles').select('id').eq('id', callee_id).single()

  try {
    await webpush.sendNotification(
      sub.subscription as webpush.PushSubscription,
      JSON.stringify({
        title: has_video ? `📹 ${caller_name}` : `📞 ${caller_name}`,
        body: has_video ? 'Videollamada entrante · Toca para contestar' : 'Llamada entrante · Toca para contestar',
        tag: `call-${room_id}`,
        renotify: true,
        data: {
          type: 'incoming-call',
          roomId: room_id,
          callerId: caller_id,
          callerName: caller_name,
          hasVideo: has_video,
          userId: callee_id,
        },
      })
    )
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e.message })
  }
}
