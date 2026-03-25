import Anthropic from '@anthropic-ai/sdk'
import { fetchLiveData } from '@/lib/live-data'
import { getQuote } from '@/lib/finnhub'
import { getCryptoPrice } from '@/lib/coingecko'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logApiUsage, estimateClaudeCost } from '@/lib/analytics'

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

async function generatePicks(supabase: any, today: string, mode: 'all' | 'stocks' | 'crypto' = 'all') {
  const weekend = isWeekend(today)
  const doStocks = (mode === 'all' || mode === 'stocks') && !weekend
  const doCrypto = mode === 'all' || mode === 'crypto'
  const dataMsg = 'pre-market briefing sector rotation VIX fear greed bitcoin dominance funding rates ethereum solana market movers gainers losers economic macro'
  let liveData = ''
  try {
    const timeout = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000))
    liveData = await Promise.race([fetchLiveData(dataMsg), timeout])
  } catch {}

  const stocksSection = doStocks ? `
═══════════════════════════════════════════
IC STOCK FORMULA — 5 FACTORS (each 0-20 pts)
═══════════════════════════════════════════
Evaluate EVERY candidate stock against all 5 factors. Only include picks scoring 70+.

FACTOR 1 — TREND ALIGNMENT (0-20)
Score 20: Price above 20, 50, AND 200-day MA (bullish) OR below all three (bearish)
Score 15: Above/below 20+50-day MA
Score 10: Above/below 20-day MA only — weak trend
Score 5: Mixed MA signals — choppy
Score 0: Trading against the primary trend — SKIP this pick

FACTOR 2 — MOMENTUM QUALITY (0-20)
Bullish: RSI 50-65 = 20pts (momentum sweet spot), RSI 65-72 = 14pts (extended but ok with catalyst), RSI >72 = 5pts (overbought risk), RSI <50 = 6pts (weak)
Bearish: RSI 35-50 = 20pts, RSI 28-35 = 14pts, RSI <28 = 5pts (oversold bounce risk), RSI >50 = 6pts
Volume confirmation: If today's volume is above 30-day average = +3 bonus pts

FACTOR 3 — SECTOR FLOW (0-20)
Score 20: Stock is in the #1 or #2 leading sector today with clear money inflow
Score 15: In a strengthening sector, stock showing relative strength vs peers
Score 10: Neutral sector but stock has strong individual catalyst
Score 5: Sector slightly lagging, strong stock-specific story
Score 0: In bottom 2 lagging sectors with no independent catalyst — use as bearish pick instead

FACTOR 4 — CATALYST CLARITY (0-20)
Score 20: Specific near-term catalyst — earnings beat, product launch, FDA approval, index add, analyst upgrade, technical breakout of major level with volume
Score 15: Moderate catalyst — sector rotation event, ETF rebalance, peer momentum
Score 10: Technical catalyst only — key support bounce, flag breakout, gap fill
Score 5: Broad market/macro tailwind only
Score 0: No identifiable catalyst — DO NOT include this pick. Vibes are not a catalyst.

FACTOR 5 — MARKET REGIME FIT (0-20)
Score 20: VIX <18 + SPY above 20-day MA = risk-on, favor bullish momentum plays
Score 16: VIX 18-22, neutral regime — favor high-confidence picks only
Score 12: VIX 22-28, elevated fear — only include if catalyst is very specific
Score 6: VIX >28, risk-off — only bearish plays or defensive names
Score 0: Pick goes against current regime (buying high-beta in VIX >28 = skip)

STOCK SCORING → OUTPUT RULES:
90-100 pts → confidence 9-10, include
80-89 pts  → confidence 7-8, include
70-79 pts  → confidence 5-6, include only if catalyst score is ≥15
<70 pts    → SKIP — do not include this stock, find a better one

STOCK HARD RULES:
- Target exactly 10 stock picks — this is the goal every day. Only drop below 10 if the market genuinely cannot produce 10 picks scoring 70+, in which case return as many as qualify (minimum 7).
- Every rationale must mention the 2 strongest factors (e.g. "Above all MAs, RSI 58, tech sector leading")
- Mix: at least 3 bullish AND at least 2 bearish picks (markets always have both directions)
- No picks purely on name recognition — AAPL, TSLA, NVDA only if they score 70+
- Preferred universe: SPY, QQQ, IWM components — liquid, real price action`

  const cryptoSection = `
═══════════════════════════════════════════
IC CRYPTO FORMULA — 5 FACTORS (each 0-20 pts)
═══════════════════════════════════════════
Evaluate EVERY candidate crypto against all 5 factors. Only include picks scoring 70+.

FACTOR 1 — BTC DOMINANCE ALIGNMENT (0-20)
Score 20: BTC dominance RISING → favor BTC + large caps (ETH, BNB, SOL) — altcoins likely bleed
Score 20: BTC dominance FALLING → favor mid/small caps with active narrative — altcoin season
Score 12: BTC dominance flat → favor coins with independent catalysts
Score 0: Pick directly contradicts dominance signal (buying random altcoins in rising dominance = skip)

FACTOR 2 — PRICE MOMENTUM (0-20)
Score 20: Price above 20 AND 50-day MA + BTC up >0.5% today (correlation tailwind)
Score 15: Above 20-day MA, BTC neutral
Score 10: At key support with bounce signal
Score 5: Below MAs but catalyst very specific
Score 0: Downtrend with no catalyst — skip

FACTOR 3 — FUNDING RATE SIGNAL (0-20)
Score 20: Funding rates NEGATIVE or near zero — shorts paying longs, potential squeeze, room to run upward
Score 15: Funding rates slightly positive (0-0.01%) — healthy, not overleveraged
Score 8: Funding rates elevated (0.01-0.05%) — longs paying, caution on new bullish entries
Score 3: Funding rates very high (>0.05%) — heavily overleveraged longs, high crash risk
Score 0: Post-liquidation cascade with no stabilization — skip

FACTOR 4 — NARRATIVE STRENGTH (0-20)
Score 20: Active dominant narrative — AI tokens, L2 ecosystem, RWA, Bitcoin ETF flows, DeFi revival, specific chain upgrade
Score 15: Moderate narrative — sector rotation into the category, peer momentum
Score 10: General crypto bull market tailwind only
Score 5: Stale narrative, fading momentum
Score 0: No narrative, no catalyst, pure speculation — DO NOT include

FACTOR 5 — FEAR & GREED REGIME (0-20)
Score 20: Fear & Greed 40-65 (neutral to greed) = healthy trending market, favor momentum longs
Score 16: Fear & Greed 25-40 (fear) = potential bounce plays with specific catalyst
Score 12: Fear & Greed 65-80 (greed) = still ok but tighten stops
Score 5: Fear & Greed >80 (extreme greed) = avoid new longs, consider bearish plays
Score 5: Fear & Greed <25 (extreme fear) = contrarian longs only with very strong on-chain backing
Score 0: Extreme reading WITH no catalyst for reversal — skip

CRYPTO SCORING → OUTPUT RULES:
90-100 pts → confidence 9-10, include
80-89 pts  → confidence 7-8, include
70-79 pts  → confidence 5-6, include only if narrative score is ≥15
65-69 pts  → confidence 4-5, include only if needed to reach minimum 8 picks
<65 pts   → SKIP

CRYPTO HARD RULES:
- Target 8 crypto picks every day — you must always find 8 that score 65+. If the market is weak, include bearish picks to reach 8. Do not return fewer than 5.
- BTC and ETH MUST be evaluated first — they set the regime for all others
- No meme coins unless they have a genuine active narrative (not just "up today")
- Every rationale must reference the 2 strongest factors
- Mix bullish and bearish — if market is overextended, use bearish picks to fill the slate`

  const prompt = `You are an expert analyst using the IC Formula to generate the highest-conviction daily picks. Score every candidate rigorously. Reject anything under 70.

OUTPUT ONLY RAW JSON — no explanation, no markdown, no code fences. Start with { and end with }.

${doStocks ? stocksSection : ''}
${doCrypto ? cryptoSection : ''}

Required JSON format:
{
  "market_context": "one sentence on current conditions + VIX level + BTC dominance direction",
  "stocks": ${doStocks ? `[
    {
      "symbol": "NVDA",
      "bias": "bullish",
      "confidence": 8,
      "ic_score": 84,
      "rationale": "Above all 3 MAs, RSI 61, tech sector leading with strong volume",
      "catalyst": "AI infrastructure demand + XLK sector rotation inflow",
      "sector": "Technology"
    }
  ]` : '[]'},
  "crypto": ${doCrypto ? `[
    {
      "symbol": "BTC",
      "coingecko_id": "bitcoin",
      "bias": "bullish",
      "confidence": 9,
      "ic_score": 88,
      "rationale": "BTC dominance rising, funding rates near zero, above 20+50-day MA",
      "catalyst": "ETF inflow acceleration + institutional accumulation signal"
    }
  ]` : '[]'}
}

${doStocks && doCrypto ? 'Include 10 stocks AND 8 crypto picks — quality only, no filler.' : doStocks ? 'Include 10 stock picks — quality only. Return empty array [] for crypto.' : 'Crypto runs 24/7. Include 8 crypto picks — quality only. Return empty array [] for stocks.'}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: `You are an expert trader applying the IC Formula rigorously. Score every pick against all 5 factors. Reject anything under 70. Output only valid JSON.${liveData ? `\n\nLIVE MARKET DATA:\n${liveData}` : ''}`,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
  console.log('[ai-picks] response preview:', rawText.slice(0, 150))

  const inputTokens = response.usage.input_tokens
  const outputTokens = response.usage.output_tokens
  await logApiUsage(supabase, {
    apiName: 'claude',
    endpoint: 'ai-picks-generate',
    tokensInput: inputTokens,
    tokensOutput: outputTokens,
    costUsd: estimateClaudeCost(inputTokens, outputTokens),
    success: true,
  })

  const parsed = extractJSON(rawText)

  const stocks: any[] = doStocks ? (parsed.stocks ?? []).slice(0, 10) : []
  const crypto: any[] = doCrypto ? (parsed.crypto ?? []).slice(0, 10) : []
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
    const mode = (searchParams.get('type') ?? 'all') as 'all' | 'stocks' | 'crypto'
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const supabase = createServerSupabaseClient()

    // Evaluate pending picks older than 24h
    await evaluatePending(supabase)

    // Check for today's picks (filter by type if requested)
    let query = supabase.from('ai_picks').select('*').eq('pick_date', today)
      .order('type').order('confidence', { ascending: false })
    if (mode !== 'all') query = query.eq('type', mode === 'stocks' ? 'stock' : 'crypto')
    const { data: todayPicks, error: fetchErr } = await query

    if (fetchErr) throw new Error(`DB error: ${fetchErr.message}`)

    let picks: any[] = todayPicks ?? []
    let isCached = false
    let generatedAt = ''

    const expectedCount = mode === 'crypto' ? 4 : mode === 'stocks' ? 4 : (isWeekend(today) ? 3 : 5)
    if (picks.length >= expectedCount && !refresh) {
      isCached = true
      generatedAt = picks[0]?.created_at ?? ''
    } else {
      if (refresh) {
        // Only delete picks of the requested type
        let del = supabase.from('ai_picks').delete().eq('pick_date', today)
        if (mode !== 'all') del = del.eq('type', mode === 'stocks' ? 'stock' : 'crypto')
        await del
      }
      picks = await generatePicks(supabase, today, mode)
      generatedAt = new Date().toISOString()
    }

    // Re-fetch to get DB-assigned ids and created_at
    if (!isCached) {
      let freshQuery = supabase.from('ai_picks').select('*').eq('pick_date', today)
        .order('type').order('confidence', { ascending: false })
      if (mode !== 'all') freshQuery = freshQuery.eq('type', mode === 'stocks' ? 'stock' : 'crypto')
      const { data: fresh } = await freshQuery
      if (fresh?.length) picks = fresh
    }

    // For 'all' mode fetch, get both types from DB regardless of what was just generated
    if (mode === 'all') {
      const { data: allToday } = await supabase.from('ai_picks').select('*').eq('pick_date', today)
        .order('type').order('confidence', { ascending: false })
      if (allToday?.length) picks = allToday
    }

    const { data: allPicks } = await supabase.from('ai_picks').select('*').order('created_at', { ascending: false }).limit(500)
    const stats = calcStats(allPicks ?? [])
    const marketContext = picks[0]?.market_context ?? ''

    // Build last 7 days history (excluding today)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]
    const { data: historyPicks } = await supabase
      .from('ai_picks').select('*')
      .gte('pick_date', sevenDaysAgoStr)
      .lt('pick_date', today)
      .order('pick_date', { ascending: false })
      .order('confidence', { ascending: false })

    const historyByDate: Record<string, any[]> = {}
    for (const p of (historyPicks ?? [])) {
      if (!historyByDate[p.pick_date]) historyByDate[p.pick_date] = []
      historyByDate[p.pick_date].push(p)
    }
    const history = Object.entries(historyByDate).map(([date, dayPicks]) => {
      const ev = dayPicks.filter(p => p.outcome === 'win' || p.outcome === 'loss')
      const wins = ev.filter(p => p.outcome === 'win').length
      return {
        date,
        picks: dayPicks,
        wins,
        losses: ev.length - wins,
        total: ev.length,
        win_rate: ev.length > 0 ? Math.round((wins / ev.length) * 100) : null,
      }
    })

    return Response.json({ picks, stats, market_context: marketContext, generated_at: generatedAt, is_cached: isCached, history })
  } catch (err) {
    console.error('[ai-picks] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
