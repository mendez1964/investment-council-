import { createServerSupabaseClient } from '@/lib/supabase'
import { getUniversePicks } from '@/lib/ic-scoring'

const CRON_SECRET = process.env.CRON_SECRET ?? 'ic-cron-2024'

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { stocks, cryptos, marketContext } = await getUniversePicks(30, 10)
    return Response.json({ stocks, cryptos, marketContext, generated_at: new Date().toISOString() })
  } catch (err) {
    console.error('[universe] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

// Cron endpoint — pre-scores and caches universe candidates into Supabase
export async function POST(request: Request) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== CRON_SECRET) return Response.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { stocks, cryptos, marketContext } = await getUniversePicks(30, 10)
    const supabase = createServerSupabaseClient()
    const today = new Date().toISOString().split('T')[0]

    const rows = [
      ...stocks.map(s => ({
        pick_date: today, type: 'stock', symbol: s.ticker,
        ic_score: s.icScore, bias: s.bias, source: 'universe',
        scores: s.scores, market_context: marketContext,
        outcome: 'pending',
      })),
      ...cryptos.map(c => ({
        pick_date: today, type: 'crypto', symbol: c.ticker,
        ic_score: c.icScore, bias: c.bias, source: 'universe',
        scores: c.scores, market_context: marketContext,
        outcome: 'pending',
      })),
    ]

    await supabase.from('ai_picks').upsert(rows, { onConflict: 'pick_date,symbol,source' })
    return Response.json({ ok: true, stocks: stocks.length, cryptos: cryptos.length })
  } catch (err) {
    console.error('[universe cron] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
