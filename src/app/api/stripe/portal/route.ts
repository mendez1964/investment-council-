import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' as any })

export async function POST(request: Request) {
  try {
    const authClient = createServerSupabaseClientAuth()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const db = createServerSupabaseClient()
    const { data: profile } = await db
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return Response.json({ error: 'No billing account found' }, { status: 404 })
    }

    const origin = request.headers.get('origin') || 'https://www.investmentcouncil.io'

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/app`,
    })

    return Response.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe/portal]', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
