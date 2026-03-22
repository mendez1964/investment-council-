import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, prefs } = body

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const { data: existing } = await supabase
      .from('email_subscriptions').select('id').eq('email', email.toLowerCase()).single()

    const payload = {
      email: email.toLowerCase(),
      is_active: true,
      updated_at: new Date().toISOString(),
      morning_briefing_stocks: prefs?.morning_briefing_stocks ?? false,
      morning_briefing_crypto: prefs?.morning_briefing_crypto ?? false,
      eod_recap_stocks: prefs?.eod_recap_stocks ?? false,
      eod_recap_crypto: prefs?.eod_recap_crypto ?? false,
      daily_picks: prefs?.daily_picks ?? false,
      options_trades: prefs?.options_trades ?? false,
      economic_calendar: prefs?.economic_calendar ?? false,
      fear_greed_alerts: prefs?.fear_greed_alerts ?? false,
    }

    if (existing) {
      await supabase.from('email_subscriptions').update(payload).eq('email', email.toLowerCase())
    } else {
      await supabase.from('email_subscriptions').insert(payload)
    }

    return Response.json({ ok: true, message: existing ? 'Preferences updated' : 'Subscribed successfully' })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('email_subscriptions').select('*').eq('email', email.toLowerCase()).single()

  return Response.json(data ?? null)
}
