import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase'
import { PRICES } from '@/lib/stripe-prices'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' as any })

const PRICE_TO_TIER: Record<string, 'trader' | 'pro'> = {
  [PRICES.trader.monthly]: 'trader',
  [PRICES.trader.yearly]:  'trader',
  [PRICES.pro.monthly]:    'pro',
  [PRICES.pro.yearly]:     'pro',
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('[webhook] signature failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const userId = session.metadata?.user_id
    const subscriptionId = session.subscription as string

    if (userId && subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const priceId = subscription.items.data[0]?.price.id
      const tier = PRICE_TO_TIER[priceId] ?? 'trader'
      const trialEnd = subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null

      await supabase.from('profiles').update({
        tier,
        trial_ends_at: trialEnd,
        stripe_customer_id: session.customer as string,
      }).eq('id', userId)
      console.log(`[webhook] checkout.completed user:${userId} price:${priceId} → tier:${tier}`)
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata?.user_id
    const priceId = subscription.items.data[0]?.price.id
    const status = subscription.status

    if (userId) {
      let tier: 'free' | 'trader' | 'pro' = PRICE_TO_TIER[priceId] ?? 'free'
      if (status === 'canceled' || status === 'unpaid' || status === 'past_due') {
        tier = 'free'
      }
      await supabase.from('profiles').update({ tier }).eq('id', userId)
      console.log(`[webhook] subscription.updated user:${userId} price:${priceId} status:${status} → tier:${tier}`)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata?.user_id
    if (userId) {
      await supabase.from('profiles').update({ tier: 'free' }).eq('id', userId)
    }
  }

  return new Response('ok', { status: 200 })
}
