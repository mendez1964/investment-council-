import Stripe from 'stripe'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' as any })

export async function POST(request: Request) {
  try {
    const authClient = createServerSupabaseClientAuth()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const { provider, url, details } = await request.json()
    if (!provider || !url || !details) {
      return Response.json({ error: 'All fields required' }, { status: 400 })
    }

    const origin = request.headers.get('origin') || 'https://www.investmentcouncil.io'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: 4999,
          product_data: {
            name: 'Custom Data Feed Integration',
            description: `Integration request for: ${provider}`,
          },
        },
        quantity: 1,
      }],
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        user_email: user.email ?? '',
        request_type: 'feed_integration',
        provider,
        provider_url: url,
        details: details.slice(0, 500),
      },
      success_url: `${origin}/profile?feed_request=success`,
      cancel_url: `${origin}/profile`,
    })

    return Response.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe/feed-request]', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
