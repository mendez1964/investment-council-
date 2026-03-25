// IC Guardian — daily news analysis engine
// Runs at 9 AM ET via /api/cron/guardian
//
// Run this SQL in Supabase SQL editor first:
//
// CREATE TABLE IF NOT EXISTS guardian_alerts (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   alert_date date NOT NULL,
//   user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   ticker text NOT NULL,
//   asset_type text NOT NULL DEFAULT 'stock',
//   headline text NOT NULL,
//   source text DEFAULT '',
//   published_at timestamptz,
//   impact_level text NOT NULL DEFAULT 'medium' CHECK (impact_level IN ('high','medium','low')),
//   impact_direction text NOT NULL DEFAULT 'neutral' CHECK (impact_direction IN ('positive','negative','neutral')),
//   summary text NOT NULL,
//   price_impact_est text DEFAULT '',
//   cleared_at timestamptz,
//   created_at timestamptz DEFAULT now(),
//   UNIQUE(user_id, ticker, headline)
// );
// ALTER TABLE guardian_alerts ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users read own guardian alerts" ON guardian_alerts FOR SELECT USING (auth.uid() = user_id);
// CREATE POLICY "Service insert guardian alerts" ON guardian_alerts FOR INSERT WITH CHECK (true);
// CREATE POLICY "Users clear guardian alerts" ON guardian_alerts FOR UPDATE USING (auth.uid() = user_id);
// CREATE POLICY "Service update guardian alerts" ON guardian_alerts FOR UPDATE USING (true);
//
// CREATE TABLE IF NOT EXISTS guardian_settings (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   ticker text NOT NULL,
//   mode text NOT NULL DEFAULT 'smart' CHECK (mode IN ('smart','everything')),
//   created_at timestamptz DEFAULT now(),
//   updated_at timestamptz DEFAULT now(),
//   UNIQUE(user_id, ticker)
// );
// ALTER TABLE guardian_settings ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users manage guardian settings" ON guardian_settings FOR ALL USING (auth.uid() = user_id);
// CREATE POLICY "Service read guardian settings" ON guardian_settings FOR SELECT USING (true);

export const maxDuration = 120

import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCompanyNews, getMarketNews } from '@/lib/finnhub'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function verifyCron(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === (process.env.CRON_SECRET ?? 'ic-cron-2024')
}

interface NewsItem {
  ticker: string
  headline: string
  source: string
  datetime: number
}

interface AnalyzedItem {
  index: number
  impact_level: 'high' | 'medium' | 'low'
  impact_direction: 'positive' | 'negative' | 'neutral'
  summary: string
  price_impact_est: string
  is_price_moving: boolean
}

async function analyzeNews(ticker: string, items: NewsItem[]): Promise<AnalyzedItem[]> {
  if (!items.length) return []

  const list = items.map((n, i) => `${i + 1}. "${n.headline}"`).join('\n')

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    system: 'You are IC Guardian — an AI that analyzes financial news for retail investors. Be precise, concise, and honest about impact.',
    messages: [{
      role: 'user',
      content: `Analyze these ${ticker} news headlines. For each:
- impact_level: "high" (earnings, FDA, acquisition, major lawsuit, CEO change, index add/remove), "medium" (analyst call, product launch, partnership), "low" (opinion, minor mention, general)
- impact_direction: "positive", "negative", or "neutral"
- summary: max 15 words, plain English, what it means for the stock
- price_impact_est: e.g. "+2-4%" or "-5-8%" or "" if unclear
- is_price_moving: true if likely to move price, false if noise

Headlines:
${list}

Respond ONLY with raw JSON array:
[{"i":1,"impact_level":"high","impact_direction":"negative","summary":"Earnings missed by 8%, weak Q2 guidance issued.","price_impact_est":"-4 to -7%","is_price_moving":true}]`
    }]
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : ''
  try {
    const s = text.indexOf('['), e = text.lastIndexOf(']')
    if (s === -1 || e === -1) return []
    const parsed: any[] = JSON.parse(text.slice(s, e + 1))
    return parsed.map(p => ({
      index: (p.i ?? 1) - 1,
      impact_level: p.impact_level ?? 'low',
      impact_direction: p.impact_direction ?? 'neutral',
      summary: p.summary ?? '',
      price_impact_est: p.price_impact_est ?? '',
      is_price_moving: p.is_price_moving ?? false,
    }))
  } catch { return [] }
}

export async function POST(request: Request) {
  if (!verifyCron(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  // Get all users with portfolio holdings
  const { data: holdings } = await supabase
    .from('portfolio_holdings')
    .select('user_id, ticker, asset_type')
    .not('user_id', 'is', null)

  if (!holdings?.length) return Response.json({ ok: true, alerts: 0, reason: 'no holdings' })

  // Build ticker → {asset_type, users[]} map
  const tickerMap: Record<string, { asset_type: string; users: string[] }> = {}
  for (const h of holdings) {
    if (!h.user_id || !h.ticker) continue
    const t = h.ticker.toUpperCase()
    if (!tickerMap[t]) tickerMap[t] = { asset_type: h.asset_type ?? 'stock', users: [] }
    if (!tickerMap[t].users.includes(h.user_id)) tickerMap[t].users.push(h.user_id)
  }

  const userIds = Array.from(new Set(holdings.map(h => h.user_id).filter(Boolean)))
  const { data: settingsRows } = await supabase
    .from('guardian_settings').select('user_id, ticker, mode').in('user_id', userIds)

  const settings: Record<string, Record<string, string>> = {}
  for (const s of settingsRows ?? []) {
    if (!settings[s.user_id]) settings[s.user_id] = {}
    settings[s.user_id][s.ticker.toUpperCase()] = s.mode
  }

  // Try to use pre-analyzed market_news pipeline first (more accurate — sees indirect impacts)
  const { data: pipelineNews } = await supabase
    .from('market_news')
    .select('*')
    .eq('news_date', today)
    .eq('is_price_moving', true)
    .neq('impact_level', 'low')

  let totalAlerts = 0

  if (pipelineNews && pipelineNews.length > 0) {
    // ── Fast path: use centralized market_news pipeline ──
    console.log(`[guardian/analyze] using pipeline: ${pipelineNews.length} pre-analyzed items`)

    for (const newsItem of pipelineNews) {
      const affectedTickers: string[] = newsItem.affected_tickers ?? []

      for (const ticker of affectedTickers) {
        const entry = tickerMap[ticker.toUpperCase()]
        if (!entry) continue

        for (const userId of entry.users) {
          const mode = settings[userId]?.[ticker.toUpperCase()] ?? 'smart'
          if (mode === 'smart' && !newsItem.is_price_moving) continue

          try {
            await supabase.from('guardian_alerts').upsert({
              alert_date: today,
              user_id: userId,
              ticker: ticker.toUpperCase(),
              asset_type: entry.asset_type,
              headline: newsItem.headline,
              source: newsItem.source,
              published_at: newsItem.published_at,
              impact_level: newsItem.impact_level,
              impact_direction: newsItem.impact_direction,
              summary: newsItem.summary,
              price_impact_est: newsItem.price_impact_est,
            }, { onConflict: 'user_id,ticker,headline', ignoreDuplicates: true })
            totalAlerts++
          } catch {}
        }
      }
    }

    return Response.json({ ok: true, alerts: totalAlerts, source: 'pipeline', date: today })
  }

  // ── Fallback: per-ticker fetch (pipeline hasn't run yet) ──
  console.log('[guardian/analyze] pipeline empty — falling back to per-ticker fetch')
  const cutoff = Date.now() / 1000 - 24 * 60 * 60

  for (const [ticker, { asset_type, users }] of Object.entries(tickerMap)) {
    let newsItems: NewsItem[] = []

    try {
      if (asset_type === 'crypto') {
        const raw = await getMarketNews('crypto')
        const q = ticker.toLowerCase()
        newsItems = (raw ?? [])
          .filter((n: any) => n.headline?.toLowerCase().includes(q) || n.summary?.toLowerCase().includes(q))
          .filter((n: any) => n.datetime && n.datetime > cutoff)
          .slice(0, 5)
          .map((n: any) => ({ ticker, headline: n.headline ?? '', source: n.source ?? '', datetime: n.datetime ?? 0 }))
      } else {
        const raw = await getCompanyNews(ticker)
        newsItems = (raw ?? [])
          .filter((n: any) => n.datetime && n.datetime > cutoff)
          .slice(0, 5)
          .map((n: any) => ({ ticker, headline: n.headline ?? '', source: n.source ?? '', datetime: n.datetime ?? 0 }))
      }
    } catch { continue }

    if (!newsItems.length) continue

    let analyzed: AnalyzedItem[] = []
    try { analyzed = await analyzeNews(ticker, newsItems) } catch { continue }

    for (const userId of users) {
      const mode = settings[userId]?.[ticker] ?? 'smart'
      for (const item of analyzed) {
        const original = newsItems[item.index] ?? newsItems[0]
        if (!original?.headline) continue
        if (mode === 'smart' && (!item.is_price_moving || item.impact_level === 'low')) continue
        try {
          await supabase.from('guardian_alerts').upsert({
            alert_date: today, user_id: userId, ticker, asset_type,
            headline: original.headline, source: original.source,
            published_at: original.datetime ? new Date(original.datetime * 1000).toISOString() : null,
            impact_level: item.impact_level, impact_direction: item.impact_direction,
            summary: item.summary, price_impact_est: item.price_impact_est,
          }, { onConflict: 'user_id,ticker,headline', ignoreDuplicates: true })
          totalAlerts++
        } catch {}
      }
    }
  }

  return Response.json({ ok: true, alerts: totalAlerts, source: 'fallback', date: today, tickers: Object.keys(tickerMap).length })
}
