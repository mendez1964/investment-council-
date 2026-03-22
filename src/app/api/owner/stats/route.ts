import { createServerSupabaseClient } from '@/lib/supabase'

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function weekAgoStr() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

function thirtyDaysAgoStr() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString()
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const today = todayStr()
    const weekAgo = weekAgoStr()
    const thirtyDaysAgo = thirtyDaysAgoStr()
    const todayStart = `${today}T00:00:00.000Z`

    // Today's events
    const { data: todayEvents } = await supabase
      .from('analytics_events').select('event_type').gte('created_at', todayStart)

    const todayPageViews = (todayEvents ?? []).filter(e => e.event_type === 'page_view').length
    const todayFeatureEvents = (todayEvents ?? []).filter(e => e.event_type === 'feature_used').length
    const todayErrors = (todayEvents ?? []).filter(e => e.event_type === 'error').length

    // Today's API calls
    const { count: todayApiCalls } = await supabase
      .from('api_usage').select('id', { count: 'exact', head: true }).gte('created_at', todayStart)

    // This week
    const { data: weekEvents } = await supabase
      .from('analytics_events').select('event_type').gte('created_at', weekAgo)

    const { data: weekApiUsage } = await supabase
      .from('api_usage').select('api_name, cost_usd').gte('created_at', weekAgo)

    const weekClaudeCalls = (weekApiUsage ?? []).filter(r => r.api_name === 'claude').length
    const weekTotalCost = (weekApiUsage ?? []).reduce((s, r) => s + (r.cost_usd ?? 0), 0)

    // Picks generated this week
    const { count: picksGenerated } = await supabase
      .from('ai_picks').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo)

    // Feature popularity (last 30 days)
    const { data: featureEvents } = await supabase
      .from('analytics_events').select('feature')
      .eq('event_type', 'feature_used').gte('created_at', thirtyDaysAgo).not('feature', 'is', null)

    const featureCounts: Record<string, number> = {}
    for (const e of featureEvents ?? []) {
      const k = e.feature ?? 'unknown'
      featureCounts[k] = (featureCounts[k] ?? 0) + 1
    }
    const totalFeatureEvents = Object.values(featureCounts).reduce((s, n) => s + n, 0)
    const featurePopularity = Object.entries(featureCounts)
      .map(([feature, count]) => ({ feature, count, pct: totalFeatureEvents > 0 ? Math.round((count / totalFeatureEvents) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)

    // Top pages (last 30 days)
    const { data: pageEvents } = await supabase
      .from('analytics_events').select('page')
      .eq('event_type', 'page_view').gte('created_at', thirtyDaysAgo).not('page', 'is', null)

    const pageCounts: Record<string, number> = {}
    for (const e of pageEvents ?? []) {
      const k = e.page ?? '/'
      pageCounts[k] = (pageCounts[k] ?? 0) + 1
    }
    const topPages = Object.entries(pageCounts)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)

    // AI picks performance
    const { data: allPicks } = await supabase
      .from('ai_picks').select('outcome').neq('outcome', 'pending')
    const { data: allOptions } = await supabase
      .from('ai_options_picks').select('outcome').neq('outcome', 'pending')

    const picksEv = allPicks ?? []
    const picksWins = picksEv.filter(p => p.outcome === 'win').length
    const optionsEv = allOptions ?? []
    const optionsWins = optionsEv.filter(p => p.outcome === 'win').length

    // API cost breakdown
    const { data: allApiUsage } = await supabase
      .from('api_usage').select('api_name, cost_usd')

    const apiCostMap: Record<string, { calls: number; total: number }> = {}
    for (const r of allApiUsage ?? []) {
      if (!apiCostMap[r.api_name]) apiCostMap[r.api_name] = { calls: 0, total: 0 }
      apiCostMap[r.api_name].calls++
      apiCostMap[r.api_name].total += r.cost_usd ?? 0
    }
    const apiCosts = Object.entries(apiCostMap)
      .map(([api_name, { calls, total }]) => ({
        api_name, calls,
        total_cost: total,
        avg_cost: calls > 0 ? total / calls : 0,
      }))
      .sort((a, b) => b.total_cost - a.total_cost)

    // Recent events
    const { data: recentEvents } = await supabase
      .from('analytics_events').select('created_at, event_type, page, feature, session_id')
      .order('created_at', { ascending: false }).limit(50)

    // Recent errors
    const { data: recentErrors } = await supabase
      .from('analytics_events').select('created_at, feature, metadata')
      .eq('event_type', 'error').order('created_at', { ascending: false }).limit(20)

    return Response.json({
      today: {
        page_views: todayPageViews,
        feature_events: todayFeatureEvents,
        api_calls: todayApiCalls ?? 0,
        errors: todayErrors,
      },
      week: {
        total_events: (weekEvents ?? []).length,
        claude_calls: weekClaudeCalls,
        total_cost_usd: weekTotalCost,
        picks_generated: picksGenerated ?? 0,
      },
      feature_popularity: featurePopularity,
      top_pages: topPages,
      picks_performance: {
        win_rate: picksEv.length > 0 ? (picksWins / picksEv.length) * 100 : 0,
        total_evaluated: picksEv.length,
        options_win_rate: optionsEv.length > 0 ? (optionsWins / optionsEv.length) * 100 : 0,
        options_evaluated: optionsEv.length,
      },
      api_costs: apiCosts,
      recent_events: recentEvents ?? [],
      recent_errors: recentErrors ?? [],
    })
  } catch (err) {
    console.error('[owner/stats]', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
