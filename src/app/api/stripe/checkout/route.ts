import Stripe from 'stripe'
import { cookies } from 'next/headers'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getReferrerByCode } from '@/lib/referral'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' as any })

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const authClient = createServerSupabaseClientAuth()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { priceId, skipTrial } = await request.json()
    if (!priceId) {
      return Response.json({ error: 'priceId required' }, { status: 400 })
    }

    const origin = request.headers.get('origin') || 'https://www.investmentcouncil.io'

    // Check for referral code cookie
    const cookieStore = await cookies()
    const refCode = cookieStore.get('ref_code')?.value ?? null

    // Check if this user has pending referral credits from being a referrer
    const supabase = createServerSupabaseClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_credit_months')
      .eq('id', user.id)
      .single()
    const creditMonths = profile?.referral_credit_months ?? 0

    // Base trial: 7 days. Extend 30 days if referred, +30 per earned credit
    let trialDays = skipTrial ? 0 : 7
    if (!skipTrial && refCode) trialDays += 30
    if (!skipTrial && creditMonths > 0) trialDays += creditMonths * 30

    // Clear earned credits if applied
    if (creditMonths > 0) {
      await supabase.from('profiles').update({ referral_credit_months: 0 }).eq('id', user.id)
    }

    // Verify the ref code belongs to a real user (not self-referral)
    let validRefCode: string | null = null
    if (refCode) {
      const referrerId = await getReferrerByCode(refCode)
      if (referrerId && referrerId !== user.id) {
        validRefCode = refCode
      }
    }

    const sessionMetadata: Record<string, string> = { user_id: user.id }
    if (validRefCode) sessionMetadata.ref_code = validRefCode

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
        metadata: { user_id: user.id },
      },
      customer_email: user.email,
      metadata: sessionMetadata,
      success_url: `${origin}/app?upgraded=true`,
      cancel_url: `${origin}/app`,
    })

    return Response.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe/checkout]', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
