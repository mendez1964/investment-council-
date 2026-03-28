import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase'
import { PRICES } from '@/lib/stripe-prices'
import { getResend, FROM } from '@/lib/email'

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
    const requestType = session.metadata?.request_type

    // Custom feed integration request (one-time payment)
    if (requestType === 'feed_integration') {
      const { provider, provider_url, details, user_email } = session.metadata ?? {}
      try {
        const resend = getResend()
        await resend.emails.send({
          from: FROM,
          to: 'support@investmentcouncil.io',
          replyTo: user_email,
          subject: `[Paid] Custom Feed Request: ${provider}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <h2 style="color:#7c3aed;margin:0 0 16px;">New Custom Feed Integration Request</h2>
              <p style="margin:0 0 16px;font-size:14px;color:#16a34a;font-weight:700;">✓ Payment confirmed — $49.99 received</p>
              <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;width:140px;">Customer Email</td><td style="padding:8px 0;font-size:13px;color:#2563eb;"><a href="mailto:${user_email}">${user_email}</a></td></tr>
                <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;">Provider</td><td style="padding:8px 0;font-size:13px;font-weight:700;color:#111;">${provider}</td></tr>
                <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;">Website</td><td style="padding:8px 0;font-size:13px;color:#2563eb;"><a href="https://${provider_url}" target="_blank">${provider_url}</a></td></tr>
              </table>
              <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;padding:16px;">
                <div style="font-size:11px;color:#9ca3af;font-weight:700;letter-spacing:0.06em;margin-bottom:8px;">DATA NEEDED</div>
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${details}</p>
              </div>
              <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">Reply to this email to follow up with the customer.</p>
            </div>
          `,
        })
      } catch (e: any) {
        console.error('[webhook] feed request email failed:', e.message)
      }
    }

    // Subscription checkout
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

      // Log referral as pending — converted only on first real payment (invoice.payment_succeeded)
      const refCode = session.metadata?.ref_code as string | undefined
      if (refCode) {
        const { data: refCodeRow } = await supabase
          .from('referral_codes')
          .select('user_id')
          .eq('code', refCode)
          .single()

        if (refCodeRow?.user_id) {
          await supabase.from('referrals').upsert({
            referrer_id: refCodeRow.user_id,
            referred_user_id: userId,
            code: refCode,
            status: 'pending',
            reward_type: 'free_month',
          }, { onConflict: 'referrer_id,referred_user_id' })
          console.log(`[webhook] referral pending: referrer:${refCodeRow.user_id} ← referred:${userId} code:${refCode}`)
        }
      }
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
      } else if (status === 'active' || status === 'trialing') {
        // Always trust the price ID mapping for active/trialing subscriptions
        tier = PRICE_TO_TIER[priceId] ?? tier
      }
      await supabase.from('profiles').update({ tier }).eq('id', userId)
      console.log(`[webhook] subscription.updated user:${userId} price:${priceId} status:${status} → tier:${tier}`)
    }
  }

  // First real payment — convert pending referral and reward referrer
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice
    const customerId = invoice.customer as string
    const amountPaid = invoice.amount_paid ?? 0

    if (amountPaid > 0 && customerId) {
      // Find the user by their Stripe customer ID
      const { data: payer } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (payer?.id) {
        // Find their pending referral
        const { data: referral } = await supabase
          .from('referrals')
          .select('id, referrer_id')
          .eq('referred_user_id', payer.id)
          .eq('status', 'pending')
          .single()

        if (referral) {
          // Mark as converted
          await supabase.from('referrals')
            .update({ status: 'converted', converted_at: new Date().toISOString() })
            .eq('id', referral.id)

          // Credit the referrer with 1 free month
          const { data: refProfile } = await supabase
            .from('profiles')
            .select('referral_credit_months')
            .eq('id', referral.referrer_id)
            .single()

          await supabase.from('profiles')
            .update({ referral_credit_months: (refProfile?.referral_credit_months ?? 0) + 1 })
            .eq('id', referral.referrer_id)

          console.log(`[webhook] referral converted on payment: referrer:${referral.referrer_id} ← payer:${payer.id}`)
        }
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata?.user_id
    const customerId = subscription.customer as string

    if (userId && customerId) {
      // Check if the user has any other active subscriptions before reverting to free
      // (handles Trader → Pro upgrades where the old sub is deleted after the new one is created)
      const activeSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 5,
      })
      const trialSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'trialing',
        limit: 5,
      })
      const allActive = [...activeSubs.data, ...trialSubs.data]

      if (allActive.length > 0) {
        // User has another active subscription — set tier from that instead
        const activePriceId = allActive[0].items.data[0]?.price.id
        const activeTier = PRICE_TO_TIER[activePriceId] ?? 'free'
        await supabase.from('profiles').update({ tier: activeTier }).eq('id', userId)
        console.log(`[webhook] subscription.deleted but user has active sub — keeping tier:${activeTier}`)
      } else {
        // No active subscriptions — genuinely downgrade to free
        await supabase.from('profiles').update({ tier: 'free', stripe_customer_id: customerId }).eq('id', userId)
        console.log(`[webhook] subscription.deleted user:${userId} → tier:free`)
      }
    }
  }

  return new Response('ok', { status: 200 })
}
