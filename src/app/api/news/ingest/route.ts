// Market News Ingest — centralized news pipeline
// Powers: Guardian alerts, AI Picks context, Morning Briefing, AI Chat
//
// Run this SQL in Supabase first:
//
// CREATE TABLE IF NOT EXISTS market_news (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   news_date date NOT NULL DEFAULT CURRENT_DATE,
//   headline text NOT NULL,
//   source text DEFAULT '',
//   published_at timestamptz,
//   affected_tickers text[] DEFAULT '{}',
//   impact_level text CHECK (impact_level IN ('high','medium','low')),
//   impact_direction text CHECK (impact_direction IN ('positive','negative','neutral')),
//   summary text DEFAULT '',
//   price_impact_est text DEFAULT '',
//   is_price_moving boolean DEFAULT false,
//   created_at timestamptz DEFAULT now(),
//   UNIQUE(news_date, headline)
// );
// ALTER TABLE market_news ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Public read market_news" ON market_news FOR SELECT USING (true);
// CREATE POLICY "Service manage market_news" ON market_news FOR ALL USING (true);

export const maxDuration = 120

import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCompanyNews, getMarketNews } from '@/lib/finnhub'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CRYPTO_SET = new Set([
  'BTC','ETH','SOL','DOGE','XRP','ADA','AVAX','LINK','DOT','MATIC','LTC','BCH',
  'UNI','ATOM','NEAR','ARB','OP','INJ','SUI','APT','HBAR','ALGO','XLM','TRX',
  'TON','SHIB','PEPE','WIF','BONK','RENDER','GRT','FET','FLOKI','BNB','XMR',
  'DASH','ZEC','ETC','TIA','SEI','JUP','RNDR','VET','IOTA','THETA',
])

function verifyCron(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === (process.env.CRON_SECRET ?? 'ic-cron-2024')
}

interface RawItem { headline: string; source: string; datetime: number }

async function scanAndAnalyze(items: RawItem[], tickers: string[]): Promise<any[]> {
  if (!items.length || !tickers.length) return []

  const list = items.map((n, i) => `${i + 1}. "${n.headline}"`).join('\n')

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: 'You are IC Guardian — a financial news scanner. Identify which assets from a watchlist are affected by news, including indirect impacts (macro, sector, regulatory).',
    messages: [{
      role: 'user',
      content: `Tracked assets: ${tickers.join(', ')}

For each headline below, identify:
- Which tickers from the list are affected (direct OR indirect — "Fed raises rates" affects rate-sensitive stocks, sector news affects all stocks in that sector)
- impact_level: "high" (earnings, FDA, M&A, major macro/Fed, index changes), "medium" (analyst calls, partnerships, sector rotation), "low" (opinions, minor mentions)
- impact_direction: "positive", "negative", or "neutral"
- summary: 15 words max — what it means for those specific tickers
- price_impact_est: "+2-4%" or "-5-8%" or "" if unclear
- is_price_moving: true if likely to move price within 24h

Skip any item where no tracked tickers are affected.

Headlines:
${list}

Respond ONLY with a raw JSON array:
[{"i":1,"tickers":["AAPL"],"impact_level":"high","impact_direction":"negative","summary":"Apple misses revenue guidance, weak iPhone demand.","price_impact_est":"-3 to -5%","is_price_moving":true}]`
    }],
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : ''
  try {
    const s = text.indexOf('['), e = text.lastIndexOf(']')
    if (s === -1 || e === -1) return []
    return JSON.parse(text.slice(s, e + 1))
  } catch { return [] }
}

async function run() {
  const supabase = createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]
  const cutoff = Date.now() / 1000 - 24 * 60 * 60

  // Collect all unique tickers across portfolio holdings + watchlist
  const [{ data: holdings }, { data: watchlist }] = await Promise.all([
    supabase.from('portfolio_holdings').select('ticker').not('ticker', 'is', null),
    supabase.from('watchlist_stocks').select('ticker').not('ticker', 'is', null),
  ])

  const allTickers = Array.from(new Set([
    ...(holdings ?? []).map((h: any) => h.ticker.toUpperCase()),
    ...(watchlist ?? []).map((w: any) => w.ticker.toUpperCase()),
  ])).filter(Boolean)

  if (!allTickers.length) return { ok: true, reason: 'no tickers tracked' }

  const stockTickers = allTickers.filter(t => !CRYPTO_SET.has(t))
  const hasCrypto = allTickers.some(t => CRYPTO_SET.has(t))

  // Fetch news — deduplicated by headline
  const newsMap = new Map<string, RawItem>()

  // General market news (top 50)
  try {
    const general = await getMarketNews('general')
    for (const n of (general ?? []).slice(0, 50)) {
      if (n.headline && n.datetime > cutoff) {
        newsMap.set(n.headline, { headline: n.headline, source: n.source ?? '', datetime: n.datetime })
      }
    }
  } catch (e) { console.error('[news/ingest] general news error:', e) }

  // Crypto news
  if (hasCrypto) {
    try {
      const crypto = await getMarketNews('crypto')
      for (const n of (crypto ?? []).slice(0, 30)) {
        if (n.headline && n.datetime > cutoff) {
          newsMap.set(n.headline, { headline: n.headline, source: n.source ?? '', datetime: n.datetime })
        }
      }
    } catch (e) { console.error('[news/ingest] crypto news error:', e) }
  }

  // Company-specific news (up to 20 stocks, 5 items each)
  for (const ticker of stockTickers.slice(0, 20)) {
    try {
      const news = await getCompanyNews(ticker)
      for (const n of (news ?? []).slice(0, 5)) {
        if (n.headline && n.datetime > cutoff) {
          newsMap.set(n.headline, { headline: n.headline, source: n.source ?? '', datetime: n.datetime })
        }
      }
    } catch {}
  }

  const newsItems = Array.from(newsMap.values())
  console.log(`[news/ingest] fetched ${newsItems.length} unique headlines for ${allTickers.length} tickers`)

  if (!newsItems.length) return { ok: true, reason: 'no news in last 24h', tickers: allTickers.length }

  // Claude scans ALL news against ALL tracked tickers
  const analyzed = await scanAndAnalyze(newsItems, allTickers)
  console.log(`[news/ingest] claude identified ${analyzed.length} relevant items`)

  // Store in market_news
  let stored = 0
  for (const item of analyzed) {
    if (!item.tickers?.length) continue
    const original = newsItems[(item.i ?? 1) - 1] ?? newsItems[0]
    if (!original?.headline) continue

    try {
      const { error } = await supabase.from('market_news').upsert({
        news_date: today,
        headline: original.headline,
        source: original.source,
        published_at: original.datetime ? new Date(original.datetime * 1000).toISOString() : null,
        affected_tickers: item.tickers,
        impact_level: item.impact_level ?? 'low',
        impact_direction: item.impact_direction ?? 'neutral',
        summary: item.summary ?? '',
        price_impact_est: item.price_impact_est ?? '',
        is_price_moving: item.is_price_moving ?? false,
      }, { onConflict: 'news_date,headline', ignoreDuplicates: true })
      if (!error) stored++
    } catch {}
  }

  return { ok: true, fetched: newsItems.length, analyzed: analyzed.length, stored, tickers: allTickers.length, date: today }
}

export async function POST(request: Request) {
  if (!verifyCron(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  run()
    .then(r => console.log('[news/ingest] done:', JSON.stringify(r)))
    .catch(e => console.error('[news/ingest] fatal:', e))
  return Response.json({ ok: true, status: 'started' })
}
