// News context API — returns recent analyzed news for given tickers
// Used by: AI Picks, Morning Briefing, AI Chat, Guardian

import { createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tickersParam = searchParams.get('tickers') ?? ''
  const hours = Math.min(parseInt(searchParams.get('hours') ?? '24'), 72)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '15'), 50)
  const minLevel = searchParams.get('min_level') ?? '' // 'high' to only get high-impact

  const tickers = tickersParam
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(Boolean)

  const supabase = createServerSupabaseClient()
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('market_news')
    .select('*')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (tickers.length) {
    query = query.overlaps('affected_tickers', tickers)
  }

  if (minLevel === 'high') {
    query = query.eq('impact_level', 'high')
  } else if (minLevel === 'medium') {
    query = query.in('impact_level', ['high', 'medium'])
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Sort by impact level (high → medium → low)
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const sorted = (data ?? []).sort(
    (a, b) => (order[a.impact_level] ?? 2) - (order[b.impact_level] ?? 2)
  )

  return Response.json({ news: sorted, count: sorted.length })
}
