import Anthropic from '@anthropic-ai/sdk'
import { fetchLiveData } from '@/lib/live-data'
import { getQuote } from '@/lib/finnhub'
import { getCryptoPrice } from '@/lib/coingecko'
import { createServerSupabaseClient } from '@/lib/supabase'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CRYPTO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot',
  MATIC: 'matic-network', LINK: 'chainlink', LTC: 'litecoin',
  ATOM: 'cosmos', NEAR: 'near', ARB: 'arbitrum', OP: 'optimism',
  INJ: 'injective-protocol', HBAR: 'hedera-hashgraph', DOGE: 'dogecoin',
  SHIB: 'shiba-inu', UNI: 'uniswap', AAVE: 'aave', MKR: 'maker',
  TON: 'the-open-network', TRX: 'tron', SUI: 'sui', APT: 'aptos',
  FIL: 'filecoin', GRT: 'the-graph', PEPE: 'pepe', WIF: 'dogwifcoin',
  BCH: 'bitcoin-cash', XLM: 'stellar', ICP: 'internet-computer',
  IMX: 'immutable-x', RENDER: 'render-token', RNDR: 'render-token',
  FET: 'fetch-ai', BONK: 'bonk', FLOKI: 'floki',
}


function extractJSON(text: string): any {
  const cleaned = text.trim()
  try { return JSON.parse(cleaned) } catch {}
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) { try { return JSON.parse(fence[1].trim()) } catch {} }
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1) { try { return JSON.parse(cleaned.slice(start, end + 1)) } catch {} }
  throw new Error(`Could not parse JSON. Got: ${cleaned.slice(0, 200)}`)
}

async function evaluatePending(supabase: any) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // UTC is fine for timestamp comparison
  const { data: pending } = await supabase
    .from('ai_picks').select('*').eq('outcome', 'pending').lt('created_at', cutoff)
  if (!pending?.length) return

  await Promise.allSettled(pending.map(async (pick: any) => {
    let currentPrice: number | null = null
    try {
      if (pick.type === 'stock') {
        const q = await getQuote(pick.symbol)
        currentPrice = q?.c ?? null
      } else {
        const coinId = pick.coingecko_id || CRYPTO_ID_MAP[pick.symbol?.toUpperCase()] || pick.symbol?.toLowerCase()
        const p = await getCryptoPrice(coinId) as any
        currentPrice = p?.price ?? null
      }
    } catch {}
    if (currentPrice == null || !pick.entry_price) return
    const priceChangePct = ((currentPrice - pick.entry_price) / pick.entry_price) * 100
    const directionReturnPct = pick.bias === 'bullish' ? priceChangePct : -priceChangePct
    await supabase.from('ai_picks').update({
      outcome: directionReturnPct > 0 ? 'win' : 'loss',
      exit_price: currentPrice,
      price_change_pct: parseFloat(priceChangePct.toFixed(4)),
      direction_return_pct: parseFloat(directionReturnPct.toFixed(4)),
      evaluated_at: new Date().toISOString(),
    }).eq('id', pick.id)
  }))
}

function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr + 'T12:00:00').getDay() // 0=Sun, 6=Sat
  return day === 0 || day === 6
}

async function generatePicks(supabase: any, today: string) {
  const weekend = isWeekend(today)
  const dataMsg = 'pre-market briefing bitcoin ethereum solana binancecoin ripple cardano avalanche chainlink dogecoin economic macro sector rotation movers gainers losers'
  let liveData = ''
  try {
    const timeout = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000))
    liveData = await Promise.race([fetchLiveData(dataMsg), timeout])
  } catch {}

  const stocksRule = weekend
    ? 'stocks=EXACTLY 0 (markets closed on weekends — omit the stocks array entirely or return [])'
    : 'stocks=EXACTLY 10'

  const prompt = `You are an AI analyst. Using the live market data provided, generate today's research picks.

OUTPUT ONLY RAW JSON — no explanation, no markdown, no code fences. Start your response with { and end with }.

Required format:
{
  "market_context": "one sentence on current conditions",
  "stocks": [
    {"symbol":"NVDA","bias":"bullish","confidence":8,"rationale":"12-15 word thesis","catalyst":"8-10 word trigger","sector":"Technology"}
  ],
  "crypto": [
    {"symbol":"BTC","coingecko_id":"bitcoin","bias":"bullish","confidence":9,"rationale":"12-15 word thesis","catalyst":"8-10 word trigger"}
  ]
}

Rules: ${stocksRule}, crypto=EXACTLY 10, bias="bullish" or "bearish", confidence=1-10 integer, mix bullish/bearish based on real conditions, correct coingecko_id.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `You generate structured JSON data. You MUST output only valid JSON with no other text.${liveData ? `\n\n${liveData}` : ''}`,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
  console.log('[ai-picks] response preview:', rawText.slice(0, 150))
  const parsed = extractJSON(rawText)

  const stocks: any[] = weekend ? [] : (parsed.stocks ?? []).slice(0, 10)
  const crypto: any[] = (parsed.crypto ?? []).slice(0, 10)
  const marketContext: string = parsed.market_context ?? ''

  const stockPrices = await Promise.allSettled(stocks.map(p => getQuote(p.symbol).catch(() => null)))
  const cryptoPrices = await Promise.allSettled(
    crypto.map(p => {
      const coinId = p.coingecko_id || CRYPTO_ID_MAP[p.symbol?.toUpperCase()] || p.symbol?.toLowerCase()
      return getCryptoPrice(coinId).catch(() => null)
    })
  )

  const rows: any[] = []
  stocks.forEach((pick, i) => {
    const q = stockPrices[i].status === 'fulfilled' ? (stockPrices[i] as any).value : null
    rows.push({
      pick_date: today, symbol: pick.symbol?.toUpperCase() ?? '', type: 'stock',
      bias: pick.bias === 'bearish' ? 'bearish' : 'bullish',
      entry_price: q?.c ?? null,
      confidence: Math.min(10, Math.max(1, parseInt(pick.confidence) || 5)),
      rationale: pick.rationale ?? '', catalyst: pick.catalyst ?? '',
      sector: pick.sector ?? '', coingecko_id: null,
      market_context: marketContext, outcome: 'pending',
    })
  })
  crypto.forEach((pick, i) => {
    const p = cryptoPrices[i].status === 'fulfilled' ? (cryptoPrices[i] as any).value : null
    rows.push({
      pick_date: today, symbol: pick.symbol?.toUpperCase() ?? '', type: 'crypto',
      bias: pick.bias === 'bearish' ? 'bearish' : 'bullish',
      entry_price: (p as any)?.price ?? null,
      confidence: Math.min(10, Math.max(1, parseInt(pick.confidence) || 5)),
      rationale: pick.rationale ?? '', catalyst: pick.catalyst ?? '',
      sector: null,
      coingecko_id: pick.coingecko_id || CRYPTO_ID_MAP[pick.symbol?.toUpperCase()] || pick.symbol?.toLowerCase(),
      market_context: marketContext, outcome: 'pending',
    })
  })

  if (rows.length > 0) {
    const { error } = await supabase.from('ai_picks').insert(rows)
    if (error) console.error('[ai-picks] insert error:', error)
  }
  return rows
}

function calcStats(picks: any[]) {
  const ev = picks.filter(p => p.outcome === 'win' || p.outcome === 'loss')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const wins = ev.filter(p => p.outcome === 'win')
  const losses = ev.filter(p => p.outcome === 'loss')
  const total = ev.length
  const winRate = total > 0 ? (wins.length / total) * 100 : 0
  const avgWin = wins.length > 0 ? wins.reduce((s, p) => s + (p.direction_return_pct ?? 0), 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((s, p) => s + Math.abs(p.direction_return_pct ?? 0), 0) / losses.length : 0
  let streakType: 'win' | 'loss' | null = null; let streakCount = 0
  for (const p of ev) {
    if (!streakType) { streakType = p.outcome; streakCount = 1 }
    else if (p.outcome === streakType) streakCount++
    else break
  }
  const se = ev.filter(p => p.type === 'stock'), ce = ev.filter(p => p.type === 'crypto')
  const sorted = [...ev].sort((a, b) => (b.direction_return_pct ?? 0) - (a.direction_return_pct ?? 0))
  return {
    wins: wins.length, losses: losses.length, total, win_rate: winRate,
    avg_win: avgWin, avg_loss: avgLoss, streak_type: streakType, streak_count: streakCount,
    stock_wins: se.filter(p => p.outcome === 'win').length, stock_losses: se.filter(p => p.outcome === 'loss').length,
    crypto_wins: ce.filter(p => p.outcome === 'win').length, crypto_losses: ce.filter(p => p.outcome === 'loss').length,
    best: sorted[0] ? { symbol: sorted[0].symbol, return_pct: sorted[0].direction_return_pct } : null,
    worst: sorted[sorted.length - 1] ? { symbol: sorted[sorted.length - 1].symbol, return_pct: sorted[sorted.length - 1].direction_return_pct } : null,
    recent: ev.slice(0, 30).map(p => ({ outcome: p.outcome, return_pct: p.direction_return_pct })).reverse(),
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get('refresh') === 'true'
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const supabase = createServerSupabaseClient()

    // Evaluate pending picks older than 24h
    await evaluatePending(supabase)

    // Check for today's picks
    const { data: todayPicks, error: fetchErr } = await supabase
      .from('ai_picks').select('*').eq('pick_date', today)
      .order('type').order('confidence', { ascending: false })

    if (fetchErr) throw new Error(`DB error: ${fetchErr.message}`)

    let picks: any[] = todayPicks ?? []
    let isCached = false
    let generatedAt = ''

    const expectedCount = isWeekend(today) ? 10 : 20
    if (picks.length >= expectedCount && !refresh) {
      isCached = true
      generatedAt = picks[0]?.created_at ?? ''
    } else {
      if (refresh) await supabase.from('ai_picks').delete().eq('pick_date', today)
      picks = await generatePicks(supabase, today)
      generatedAt = new Date().toISOString()
    }

    // Re-fetch to get DB-assigned ids and created_at
    if (!isCached) {
      const { data: fresh } = await supabase
        .from('ai_picks').select('*').eq('pick_date', today)
        .order('type').order('confidence', { ascending: false })
      if (fresh?.length) picks = fresh
    }

    const { data: allPicks } = await supabase.from('ai_picks').select('*').order('created_at', { ascending: false }).limit(500)
    const stats = calcStats(allPicks ?? [])
    const marketContext = picks[0]?.market_context ?? ''

    return Response.json({ picks, stats, market_context: marketContext, generated_at: generatedAt, is_cached: isCached })
  } catch (err) {
    console.error('[ai-picks] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
