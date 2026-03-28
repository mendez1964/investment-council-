import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerSupabaseClientAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ plan: null })

  const { data } = await supabase
    .from('trading_plans')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return Response.json({ plan: data ?? null })
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClientAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const planData = {
    user_id: user.id,
    trading_style: body.trading_style,
    markets: body.markets,
    timeframes: body.timeframes,
    risk_per_trade_pct: body.risk_per_trade_pct,
    max_daily_loss_pct: body.max_daily_loss_pct,
    max_open_positions: body.max_open_positions,
    max_position_size_pct: body.max_position_size_pct,
    entry_criteria: body.entry_criteria,
    entry_triggers: body.entry_triggers,
    profit_target_pct: body.profit_target_pct || null,
    stop_loss_pct: body.stop_loss_pct || null,
    uses_trailing_stop: body.uses_trailing_stop,
    exit_criteria: body.exit_criteria,
    position_sizing_method: body.position_sizing_method,
    preferred_sectors: body.preferred_sectors,
    avoid_conditions: body.avoid_conditions,
    // Reset AI score when plan changes
    ai_score: null,
    ai_feedback: null,
    ai_scored_at: null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('trading_plans')
    .upsert(planData, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ plan: data })
}
