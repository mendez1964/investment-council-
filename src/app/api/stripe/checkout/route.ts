import Stripe from 'stripe'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function POST(request: Request) {
  try {
    const authClient = createServerSupabaseClientAuth()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { priceId } = await request.json()
    if (!priceId) {
      return Response.json({ error: 'priceId required' }, { status: 400 })
    }

    const origin = request.headers.get('origin') || 'https://www.investmentcouncil.io'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: user.id },
      },
      customer_email: user.email,
      metadata: { user_id: user.id },
      success_url: `${origin}/app?upgraded=true`,
      cancel_url: `${origin}/app`,
    })

    return Response.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe/checkout]', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
