import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { Resend } from 'resend'
import webpush from 'web-push'

export const config = { api: { bodyParser: false } }

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function planFromPriceId(priceId: string): 'pro' | 'business' | null {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID)      return 'pro'
  if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) return 'business'
  return null
}

async function setPlan(userId: string, plan: 'free' | 'pro' | 'business', subscriptionId?: string) {
  const db = admin()
  await db.from('demo_profiles').update({
    plan,
    stripe_subscription_id: subscriptionId ?? null,
  }).eq('id', userId)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  if (!webhookSecret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = admin()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id
      if (!userId || session.mode !== 'subscription') break

      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      const priceId = sub.items.data[0]?.price.id
      const plan = planFromPriceId(priceId)
      if (plan) await setPlan(userId, plan, sub.id)
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata.user_id
      if (!userId) break

      const priceId = sub.items.data[0]?.price.id
      const plan = planFromPriceId(priceId)
      const isActive = sub.status === 'active' || sub.status === 'trialing'
      await setPlan(userId, isActive && plan ? plan : 'free', isActive ? sub.id : undefined)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata.user_id
      if (userId) {
        await setPlan(userId, 'free')
      } else {
        const { data } = await db.from('demo_profiles').select('id').eq('stripe_customer_id', sub.customer as string).single()
        if (data) await setPlan(data.id, 'free')
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string
      const customerEmail = invoice.customer_email

      // Find user in our DB
      const { data: profile } = await db
        .from('demo_profiles')
        .select('id, name')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        // Push notification to all their devices
        if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
          webpush.setVapidDetails(
            `mailto:${process.env.VAPID_SUBJECT ?? 'noreply@getdochat.com'}`,
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
          )
          const { data: subs } = await db
            .from('demo_push_subscriptions')
            .select('subscription')
            .eq('user_id', profile.id)
          const payload = JSON.stringify({
            title: 'Payment failed',
            body: 'We could not process your payment. Update your card to keep your plan.',
            tag: 'payment-failed',
            data: { url: `/demo/${profile.id}` },
          })
          await Promise.allSettled((subs ?? []).map((s: any) =>
            webpush.sendNotification(s.subscription as webpush.PushSubscription, payload)
          ))
        }

        // Email notification
        if (customerEmail && process.env.RESEND_API_KEY) {
          const resend = new Resend(process.env.RESEND_API_KEY)
          await resend.emails.send({
            from: 'DO Chat <noreply@getdochat.com>',
            to: customerEmail,
            subject: 'Action required: payment failed',
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
                <img src="https://getdochat.com/icon-192.png" alt="DO Chat" width="48" height="48" style="border-radius:12px;margin-bottom:24px"/>
                <h2 style="margin:0 0 8px;font-size:20px;color:#111">We couldn't process your payment</h2>
                <p style="margin:0 0 24px;color:#555;line-height:1.6">
                  Hi ${profile.name}, your DO Chat subscription payment failed. To keep access to your plan, please update your payment method.
                </p>
                <a href="https://getdochat.com/demo/${profile.id}?tab=billing"
                   style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px">
                  Update payment method
                </a>
                <p style="margin:24px 0 0;color:#999;font-size:12px">
                  If you have any questions, reply to this email or contact support@getdochat.com
                </p>
              </div>
            `,
          })
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
