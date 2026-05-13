import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

export const dynamic = 'force-dynamic'

// GET — return all saved versions for this user, newest first
export async function GET() {
  const supabase = createServerSupabaseClientAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ plans: [] })

  const { data } = await supabase
    .from('trading_plans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return Response.json({ plans: data ?? [] })
}

// POST — always INSERT a new versioned record
export async function POST(request: Request) {
  const supabase = createServerSupabaseClientAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('trading_plans')
    .insert({
      user_id: user.id,
      plan_name: body.plan_name ?? '',
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
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ plan: data })
}

// DELETE — remove a specific version by id
export async function DELETE(request: Request) {
  const supabase = createServerSupabaseClientAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  await supabase
    .from('trading_plans')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  return Response.json({ ok: true })
}
