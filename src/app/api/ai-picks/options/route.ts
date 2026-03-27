import Anthropic from '@anthropic-ai/sdk'
import { fetchLiveData } from '@/lib/live-data'
import { getQuote, getPivotLevels } from '@/lib/finnhub'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logApiUsage, estimateClaudeCost } from '@/lib/analytics'
import { getBestContract, getExpirations, pickDailyExpiry, getChain, roundToATM, nearestStrike } from '@/lib/tradier'

// Fixed 0DTE universe — master these 5 tickers for maximum edge
const ODTE_UNIVERSE = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'SPX'] as const

// SPX uses SPY * ratio for price approximation (Finnhub doesn't reliably quote indexes)
const SPX_SPY_RATIO = 10.27

async function getUnderlyingPrice(ticker: string): Promise<number | null> {
  try {
    if (ticker.toUpperCase() === 'SPX') {
      const spy = await getQuote('SPY')
      return spy?.c ? parseFloat((spy.c * SPX_SPY_RATIO).toFixed(2)) : null
    }
    const q = await getQuote(ticker)
    return q?.c ?? null
  } catch { return null }
}

async function fetchTechnicalLevels(): Promise<string> {
  const results = await Promise.allSettled(
    ['SPY', 'QQQ', 'AAPL', 'NVDA'].map(t => getPivotLevels(t))
  )
  const lines: string[] = []
  results.forEach(r => {
    if (r.status === 'fulfilled' && r.value) {
      const p = r.value
      lines.push(
        `${p.ticker}: $${p.price} | PrevH:${p.prevHigh} PrevL:${p.prevLow} PrevC:${p.prevClose}` +
        ` | PP:${p.pp} R1:${p.r1} R2:${p.r2} S1:${p.s1} S2:${p.s2}` +
        ` | Fib61.8%:${p.fib618} Fib50%:${p.fib500} Fib38.2%:${p.fib382}` +
        ` | 20dSwing H:${p.swingHigh20} L:${p.swingLow20}`
      )
    }
  })
  if (!lines.length) return ''
  // Derive SPX levels from SPY * ratio
  const spyLine = lines.find(l => l.startsWith('SPY:'))
  if (spyLine) {
    const spxApprox = spyLine.replace(/SPY:/g, 'SPX(≈SPY×10.27):').replace(/\$?([\d.]+)/g, (m, n) => {
      const v = parseFloat(n)
      return isNaN(v) ? m : `$${(v * SPX_SPY_RATIO).toFixed(0)}`
    })
    lines.push(spxApprox)
  }
  return `\nTECHNICAL LEVELS — pivot points + Fibonacci (use for Factor 3 scoring):\n${lines.join('\n')}\n`
}

async function fetchNewsContext(): Promise<string> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.investmentcouncil.io'
    const res = await fetch(`${base}/api/news/context?hours=24&limit=10&min_level=medium`)
    if (!res.ok) return ''
    const data = await res.json()
    const items: any[] = data.news ?? []
    if (!items.length) return ''
    const lines = items.map((n: any) => {
      const dir = n.impact_direction === 'positive' ? '▲' : n.impact_direction === 'negative' ? '▼' : '●'
      const tickers = (n.affected_tickers ?? []).join(', ')
      const est = n.price_impact_est ? ` · Est: ${n.price_impact_est}` : ''
      return `• [${n.impact_level?.toUpperCase()}] ${dir} ${tickers || 'MARKET'}: ${n.summary}${est}`
    })
    return `\nBREAKING NEWS — last 24h (use for Factor 2 catalyst scoring):\n${lines.join('\n')}\n`
  } catch { return '' }
}

async function fetchOptionsHistory(supabase: any): Promise<string> {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data } = await supabase
      .from('ai_options_picks')
      .select('underlying, option_type, outcome')
      .neq('outcome', 'pending')
      .gte('pick_date', since)
      .limit(300)
    if (!data?.length) return ''
    const stats: Record<string, { w: number; t: number }> = {}
    for (const p of data) {
      const k = `${p.underlying}_${p.option_type}`
      if (!stats[k]) stats[k] = { w: 0, t: 0 }
      stats[k].t++
      if (p.outcome === 'win') stats[k].w++
    }
    const lines = Object.entries(stats)
      .sort(([, a], [, b]) => b.t - a.t)
      .map(([k, s]) => {
        const [ticker, dir] = k.split('_')
        const wr = ((s.w / s.t) * 100).toFixed(0)
        const trend = s.w / s.t >= 0.6 ? '✓ strong' : s.w / s.t <= 0.4 ? '✗ weak — raise bar' : '→ neutral'
        return `  ${ticker} ${dir.toUpperCase()}S: ${s.w}W/${s.t - s.w}L (${wr}%) ${trend}`
      })
    return `\nIC TRACK RECORD — Last 30 days (calibrate confidence from this):\n${lines.join('\n')}\n`
  } catch { return '' }
}

// Fetch ATM Greeks for all 0DTE tickers BEFORE the AI prompt so Factor 4 scores from real data
async function fetchATMGreeks(today: string): Promise<string> {
  if (!process.env.TRADIER_API_KEY) return ''
  // SPX options trade under SPXW on Tradier — fall back if unavailable
  const GREEK_TICKERS = ['SPY', 'QQQ', 'AAPL', 'NVDA']
  try {
    const results = await Promise.allSettled(
      GREEK_TICKERS.map(async (ticker) => {
        const expirations = await getExpirations(ticker)
        const expiry = pickDailyExpiry(expirations, today)
        if (!expiry) return null
        const chain = await getChain(ticker, expiry)
        const price = await getQuote(ticker).then(q => q?.c ?? null).catch(() => null)
        if (!price) return null
        const atm = roundToATM(price)
        const atmCall = nearestStrike(chain.calls, atm)
        const atmPut  = nearestStrike(chain.puts,  atm)
        if (!atmCall || !atmPut) return null

        const fmt = (n: number | null) => n != null ? n.toFixed(4) : 'n/a'
        const fmtPct = (n: number | null) => n != null ? `${(n * 100).toFixed(1)}%` : 'n/a'
        const spread = (c: typeof atmCall) => c.ask > 0 && c.bid > 0 ? `$${(c.ask - c.bid).toFixed(2)}` : 'n/a'

        return [
          `${ticker} (price $${price}, ATM strike $${atm}, expiry ${expiry}):`,
          `  CALL: delta=${fmt(atmCall.delta)} gamma=${fmt(atmCall.gamma)} theta=${fmt(atmCall.theta)} IV=${fmtPct(atmCall.implied_volatility)} OI=${atmCall.open_interest.toLocaleString()} vol=${atmCall.volume} bid/ask=$${atmCall.bid}/$${atmCall.ask} spread=${spread(atmCall)}`,
          `  PUT:  delta=${fmt(atmPut.delta)}  gamma=${fmt(atmPut.gamma)} theta=${fmt(atmPut.theta)} IV=${fmtPct(atmPut.implied_volatility)} OI=${atmPut.open_interest.toLocaleString()} vol=${atmPut.volume} bid/ask=$${atmPut.bid}/$${atmPut.ask} spread=${spread(atmPut)}`,
        ].join('\n')
      })
    )
    const lines = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => (r as PromiseFulfilledResult<string>).value)
    if (!lines.length) return ''
    return `\nLIVE OPTIONS CHAIN — ATM Greeks (use THESE exact values to score Factor 4):\n${lines.join('\n')}\nGreeks guide: delta 0.45-0.55=ATM (max leverage) | high gamma=explosive on moves | theta=daily decay cost | IV>60%=expensive premium | spread<$0.05=liquid\n`
  } catch { return '' }
}

const TRADIER_ENABLED = !!process.env.TRADIER_API_KEY

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr + 'T12:00:00').getDay()
  return day === 0 || day === 6
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Get Monday of the current week (Sunday-based week → use ISO Monday)
function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay() // 0=Sun, 1=Mon...6=Sat
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toDateStr(d)
}

// Daily options expire same day (0DTE)
function getDailyExpiry(dateStr: string): string {
  return dateStr
}

// Get expiry ~3 weeks out (next Friday that's at least 18 days away)
function getWeeklyExpiry(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + 18)
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1)
  return toDateStr(d)
}

// Standard option strike increments by underlying price
function getStrikeIncrement(price: number): number {
  if (price < 25) return 0.5
  if (price < 50) return 1
  if (price < 100) return 2
  if (price < 200) return 2.5
  if (price < 500) return 5
  return 10
}

// Compute a realistic strike from the live underlying price + confidence
// High confidence → ATM, lower confidence → further OTM
function computeStrike(
  price: number,
  confidence: number,
  optionType: 'call' | 'put',
  duration: 'daily' | 'weekly',
  ticker?: string
): number {
  // SPX uses 5-point increments
  if (ticker?.toUpperCase() === 'SPX') {
    const atm = Math.round(price / 5) * 5
    let strikesOTM = confidence >= 9 ? 0 : confidence >= 7 ? 1 : confidence >= 5 ? 2 : 3
    if (duration === 'weekly') strikesOTM = Math.max(0, strikesOTM - 1)
    return optionType === 'call' ? atm + 5 * strikesOTM : atm - 5 * strikesOTM
  }
  const inc = getStrikeIncrement(price)
  const atm = Math.round(price / inc) * inc
  let strikesOTM = confidence >= 9 ? 0 : confidence >= 7 ? 1 : confidence >= 5 ? 2 : 3
  if (duration === 'weekly') strikesOTM = Math.max(0, strikesOTM - 1)
  const move = inc * strikesOTM
  return optionType === 'call' ? atm + move : atm - move
}

function isMarketClosed(): boolean {
  const now = new Date()
  const etTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false }).format(now)
  const [h, m] = etTime.split(':').map(Number)
  return h * 60 + m >= 16 * 60 + 15 // 4:15 PM ET
}

async function evaluatePending(supabase: any) {
  const todayStr = toDateStr(new Date())
  const marketClosed = isMarketClosed()

  // Reset any 0DTE picks that were wrongly evaluated before market close today
  if (!marketClosed) {
    await supabase.from('ai_options_picks')
      .update({ outcome: 'pending', exit_underlying_price: null, evaluated_at: null })
      .eq('expiry', todayStr)
      .neq('outcome', 'pending')
    return // Don't evaluate 0DTE picks until market is closed
  }

  const { data: pending } = await supabase
    .from('ai_options_picks')
    .select('*')
    .eq('outcome', 'pending')
    .lte('expiry', todayStr)

  if (!pending?.length) return

  // TP1 threshold: 0.25% underlying move ≈ +40% on ATM 0DTE premium (gamma math)
  // If intraday high (calls) or low (puts) reached TP1, count as WIN — trader would have locked profit
  const TP1_UNDERLYING_THRESHOLD = 0.0025

  await Promise.allSettled(pending.map(async (pick: any) => {
    let exitPrice: number | null = null
    let dayHigh: number | null = null
    let dayLow: number | null = null
    try {
      const q = await getQuote(pick.underlying)
      exitPrice = q?.c ?? null
      dayHigh = q?.h ?? null
      dayLow = q?.l ?? null
    } catch {}
    if (exitPrice == null) return

    const isZeroDTE = pick.expiry === pick.pick_date
    let isWin = false

    if (isZeroDTE && pick.underlying_entry_price) {
      // 0DTE: check if intraday move hit TP1 threshold during the day
      const entry = pick.underlying_entry_price
      if (pick.option_type === 'call') {
        const tp1Level = entry * (1 + TP1_UNDERLYING_THRESHOLD)
        const tp1Hit = (dayHigh ?? exitPrice) >= tp1Level
        isWin = tp1Hit || exitPrice > pick.strike
      } else {
        const tp1Level = entry * (1 - TP1_UNDERLYING_THRESHOLD)
        const tp1Hit = (dayLow ?? exitPrice) <= tp1Level
        isWin = tp1Hit || exitPrice < pick.strike
      }
    } else {
      // Weekly: standard ITM/OTM at expiry
      isWin = pick.option_type === 'call' ? exitPrice > pick.strike : exitPrice < pick.strike
    }

    await supabase.from('ai_options_picks').update({
      outcome: isWin ? 'win' : 'loss',
      exit_underlying_price: exitPrice,
      evaluated_at: new Date().toISOString(),
    }).eq('id', pick.id)
  }))
}

function buildDailyPrompt(count: number, expiryStr: string, technicalLevels: string, newsContext: string, historyContext: string, greeksContext: string): string {
  return `You are an expert 0DTE options trader using the IC Daily Formula. You ONLY trade these 5 tickers: SPX, SPY, QQQ, AAPL, NVDA. Score every trade against all 5 factors using the REAL data provided. Reject anything under 65.

OUTPUT ONLY RAW JSON — no explanation, no markdown, no code fences. Start with { and end with }.
${newsContext}
${technicalLevels}
${greeksContext}
${historyContext}

═══════════════════════════════════════════
IC DAILY OPTIONS FORMULA — 5 FACTORS (0-20 pts each)
UNIVERSE: SPX, SPY, QQQ, AAPL, NVDA ONLY
═══════════════════════════════════════════

FACTOR 1 — PRE-MARKET MOMENTUM (0-20)
Score 20: Strong pre-market gap (>0.8%) in direction of trade with volume confirmation
Score 15: Moderate pre-market move (0.3-0.8%) with follow-through signals
Score 10: Flat pre-market but clear opening range setup (first 15-min breakout likely)
Score 5: Weak or opposite pre-market signal
Score 0: No pre-market edge, no gap, no momentum — skip

FACTOR 2 — INTRADAY CATALYST + NEWS (0-20)
Score 20: Known same-day binary event: economic data release (CPI, PPI, jobs, Fed minutes), Fed speaker, index rebalance
Score 18: High-impact news in the last 24h (from NEWS section above) directly affecting this ticker — analyst upgrade/downgrade, product announcement, earnings reaction
Score 14: News affecting broader market/sector (from NEWS section) with indirect impact on this ticker
Score 12: Technical level break at open — gap above major resistance, VWAP reclaim with volume
Score 6: General market momentum only — no specific trigger
Score 0: No catalyst AND no relevant news — 0DTE without a catalyst is gambling, skip

FACTOR 3 — TECHNICAL STRUCTURE: S/R + FIBONACCI + PIVOT POINTS (0-20)
Use the REAL pivot levels and Fibonacci data provided above for each ticker.

Score 20: HIGH-CONFLUENCE ZONE — price at or within 0.3% of BOTH a Pivot level (PP/R1/S1) AND a Fibonacci level (38.2%/50%/61.8%) simultaneously. This is the highest-probability 0DTE entry.
Score 16: Price breaking above R1 (call) or below S1 (put) with volume — confirmed pivot breakout
Score 16: Price bouncing off Fib 61.8% retracement (strong support) → call, or rejecting from Fib 61.8% → put
Score 14: Price at Fib 38.2% or 50% with trend confirmation. Or price breaking above/below prior day's High/Low.
Score 12: VWAP reclaim (call) or VWAP loss (put) with volume. Or gap fill setup in progress.
Score 8: General trend continuation — above/below 20-day MA but no specific level confluence
Score 4: Mixed signals — price mid-range between S/R levels, no technical anchor
Score 0: Entry against key S/R — buying above R2 or selling below S2 with no momentum — skip

Fibonacci trade setups:
• Call: price at Fib 61.8% support + holding → target Fib 38.2% or R1 as profit objective
• Put: price rejecting from Fib 61.8% resistance → target Fib 50% or S1 as profit objective
• Strike selection: ATM or 1-strike OTM from the Fib/Pivot confluence level

FACTOR 4 — OPTIONS FLOW & GREEKS (0-20)
Use the REAL Greek values from LIVE OPTIONS CHAIN above for this ticker. Do NOT estimate — score from the actual numbers.
Score 20: Delta 0.45-0.55 (ATM, max gamma leverage) + gamma >0.005 (explosive moves) + spread <$0.05 (tight, liquid) + OI >5,000 + volume elevated vs OI
Score 16: Delta 0.35-0.45 or 0.55-0.65 + gamma 0.003-0.005 + spread $0.05-$0.10 + OI >2,000 — good but slightly off ATM
Score 12: Standard liquidity — spread <$0.15, OI >500, gamma >0.001 — tradeable but not ideal
Score 6: Spread $0.15-$0.25 or OI <500 or gamma <0.001 — slippage risk, size down
Score 0: Spread >$0.25 or OI <100 or gamma near zero — illiquid, skip
Theta note: for 0DTE, theta is always high — factor this in by requiring a same-day catalyst (Factor 2) to justify the decay. If theta > $0.50/day and no catalyst → reduce score.

FACTOR 5 — VOLATILITY PROFILE (0-20)
Score 20: VIX 15-22 (ideal 0DTE environment), IV reasonable — not crushing immediately
Score 16: VIX 22-28 — elevated vol, big moves possible, manage size
Score 12: VIX <15 — low vol, 0DTE decays fast, ONLY take if Factor 2 scores 18-20
Score 5: VIX >28 — chaotic, extreme risk — only with massive catalyst
Score 0: VIX >35 or crash mode — do NOT trade 0DTE

═══════════════════════════════════════════
SCORING → CONFIDENCE → STRIKE
═══════════════════════════════════════════
90-100 pts → confidence 9-10 → ATM strike, target next Pivot/Fib level
80-89 pts  → confidence 7-8  → ATM or 1-strike OTM
70-79 pts  → confidence 5-6  → 1-2 strikes OTM, half size
65-69 pts  → confidence 4    → 2 strikes OTM, quarter size
<65 pts    → SKIP

0DTE RISK RULES:
Confidence 8-10: stop_loss_pct=40, take_profit_pct=80
Confidence 6-7:  stop_loss_pct=35, take_profit_pct=60
Confidence 4-5:  stop_loss_pct=30, take_profit_pct=50
CRITICAL: Close all positions by 3:45 PM ET. No overnight holds.

HARD RULES:
- ONLY trade: SPX, SPY, QQQ, AAPL, NVDA — no other tickers ever
- EXACTLY ONE trade per underlying — all 5 must appear: SPX, SPY, QQQ, AAPL, NVDA. No ticker may appear twice.
- Must have Factor 2 score ≥12 — no catalyst + no news = no trade
- Must have Factor 3 score ≥10 — no technical anchor = no trade
- At least ${Math.ceil(count / 2)} calls AND at least ${Math.floor(count / 2)} puts
- Rationale MUST mention: (1) the catalyst or news driver, (2) the specific Pivot/Fibonacci level, (3) the measured move target — TP1 hit at half of take_profit_pct counts as a WIN
- Do NOT specify a strike — the system computes it from live price

Required JSON format — EXACTLY ${count} trades, expiring ${expiryStr}:
{
  "trades": [
    {
      "underlying": "SPY",
      "option_type": "call",
      "strike": 570,
      "expiry": "${expiryStr}",
      "entry_premium": 1.85,
      "stop_loss_pct": 40,
      "take_profit_pct": 80,
      "confidence": 8,
      "ic_score": 83,
      "rationale": "SPY pre-market +0.7%, price at Pivot Point $568.50 confluent with Fib 38.2% at $568.20 — high-conviction zone. Fed minutes released this morning — dovish tone removing rate hike risk.",
      "catalyst": "Fed minutes dovish + gap continuation above PP/Fib38.2% confluence",
      "sector": "ETF"
    }
  ]
}`
}

function buildWeeklyPrompt(count: number, expiryStr: string): string {
  return `You are an expert options trader using the IC Weekly Formula — designed for 3-week swing options. These trades look for multi-day directional moves using trend, macro, and institutional positioning. Evaluate every candidate ticker against all 5 factors. Only include trades scoring 65+.

OUTPUT ONLY RAW JSON — no explanation, no markdown, no code fences. Start with { and end with }.

═══════════════════════════════════════════
IC WEEKLY OPTIONS FORMULA — 5 FACTORS (0-20 pts each)
For 3-week swing options — institutional edge
═══════════════════════════════════════════

FACTOR 1 — MULTI-TIMEFRAME TREND ALIGNMENT (0-20)
Score 20: Aligned on all 3 timeframes — daily above 20+50+200 MA (calls) OR below all 3 (puts). Weekly chart also trending in same direction.
Score 16: Daily above/below 20+50 MA, weekly neutral but not fighting
Score 12: Daily above/below 20-day MA only, weekly trend unclear
Score 8: Mixed MA signals — price chopping between levels
Score 0: Daily trend clearly opposing trade direction — DO NOT fight a confirmed trend, skip

FACTOR 2 — SWING MOMENTUM & MEAN REVERSION (0-20)
Calls: Weekly RSI 45-65 = 20pts (sweet spot, room to run), Daily RSI 50-68 = 20pts | RSI 68-75 = 12pts (extended but momentum valid) | RSI >75 = 5pts (overbought, mean reversion risk)
Puts: Weekly RSI 35-55 = 20pts | Daily RSI 32-50 = 20pts | RSI 25-32 = 12pts | RSI <25 = 5pts (oversold bounce risk)
Bonus: 52-week breakout above resistance = +3pts (calls) | breakdown below support = +3pts (puts)
Score 0: RSI >80 (calls) or <20 (puts) — extreme readings = mean reversion trap, skip

FACTOR 3 — MACRO CATALYST IN 3-WEEK WINDOW (0-20)
Score 20: Confirmed high-impact event within expiry window: FOMC meeting, CPI/PPI release, major earnings for that company, FDA decision, index inclusion date
Score 16: Sector catalyst: major conference, product launch, contract award, M&A activity in the space
Score 12: Technical breakout of major multi-month level — measured move target within 3 weeks is realistic
Score 8: Institutional positioning signal — 13F filing showing accumulation, unusual block trades, insider buying
Score 3: No specific catalyst, pure trend/momentum play — higher risk, require higher score elsewhere
Score 0: No catalyst within window AND stock has earnings in window that could crater the trade — dangerous setup, skip

FACTOR 4 — SUPPORT/RESISTANCE STRUCTURE (0-20)
Score 20: Clear swing structure — entry near major support (calls) or resistance (puts), measured move to next key level is 2:1+ vs stop. Options strike placed at logical technical level.
Score 16: Good structure — entry at secondary support/resistance, move to target reasonable within timeframe
Score 12: Adequate structure — some technical basis for strike selection, general trend support
Score 8: Weak structure — strikes chosen more for premium than technicals
Score 0: No technical basis for entry — stock mid-range with no clear support/resistance context, random strike selection

FACTOR 5 — INSTITUTIONAL & OPTIONS MARKET POSITIONING (0-20)
Score 20: Smart money signals present: large block options buying matching your direction (open interest spike at your strike or beyond), institutional 13F activity, sector ETF inflows, dark pool prints in direction
Score 16: Elevated options activity vs average for that name — market is positioned for a move, low IV rank (<35) means premium is cheap for the potential move
Score 12: IV rank 35-55 — reasonable premium, catalyst justifies the cost, open interest growing
Score 8: IV rank 55-70 — expensive but strong catalyst makes it acceptable
Score 3: IV rank >70 — premium is very elevated, small move won't cover theta decay over 3 weeks
Score 0: IV crush risk — upcoming event will deflate IV significantly regardless of direction (e.g., post-earnings, post-Fed)

═══════════════════════════════════════
WEEKLY SCORING → CONFIDENCE → STRIKE
═══════════════════════════════════════
90-100 pts → confidence 9-10 → ATM or 1-strike OTM (best value)
80-89 pts  → confidence 7-8  → 1-2 strikes OTM
70-79 pts  → confidence 5-6  → 2-3 strikes OTM, defined risk
65-69 pts  → confidence 4    → 3 strikes OTM, smallest size
<65 pts    → SKIP — insufficient edge for 3-week hold

WEEKLY RISK RULES (wider stops for swing room):
Confidence 8-10: stop_loss_pct=35, take_profit_pct=120 (let winners run on swings)
Confidence 6-7:  stop_loss_pct=40, take_profit_pct=90
Confidence 4-5:  stop_loss_pct=35, take_profit_pct=70
NOTE: Weekly trades need room — don't stop out on normal daily noise.

HARD RULES FOR WEEKLY:
- Must have Factor 3 score ≥12 — no macro/catalyst context = no weekly trade
- Check if earnings fall WITHIN the 3-week expiry window — if yes, earnings must BE the catalyst or skip
- At least ${Math.ceil(count / 2)} calls AND at least ${Math.floor(count / 2)} puts
- Rationale MUST mention the macro catalyst and multi-week trend direction
- Use liquid tickers with healthy options chains: SPY, QQQ, IWM, AAPL, NVDA, TSLA, META, AMZN, MSFT, GOOGL, AMD, GLD, TLT, XLE, XLK, XLF, XLV, XLY, XLC, COIN, MSTR
- Do NOT specify a strike — the system will compute the correct strike from the live price

Required JSON format — EXACTLY ${count} trades, expiring ${expiryStr} (~3 weeks out):
{
  "trades": [
    {
      "underlying": "NVDA",
      "option_type": "call",
      "strike": 900,
      "expiry": "${expiryStr}",
      "entry_premium": 12.50,
      "stop_loss_pct": 35,
      "take_profit_pct": 120,
      "confidence": 8,
      "ic_score": 86,
      "rationale": "Above all 3 MAs on daily and weekly, RSI 58 on weekly (room to run), FOMC in 2 weeks expected dovish",
      "catalyst": "FOMC meeting + AI infrastructure spending cycle driving semi sector",
      "sector": "Technology"
    }
  ]
}`
}

async function generatePicks(supabase: any, pickDate: string, expiryStr: string, count: number, type: 'daily' | 'weekly', liveData: string) {
  // For daily picks: fetch technical levels, news, and historical performance
  let technicalLevels = '', newsContext = '', historyContext = ''
  let greeksContext = ''
  if (type === 'daily') {
    const [techRes, newsRes, histRes, greeksRes] = await Promise.allSettled([
      fetchTechnicalLevels(),
      fetchNewsContext(),
      fetchOptionsHistory(supabase),
      fetchATMGreeks(pickDate),
    ])
    if (techRes.status === 'fulfilled') technicalLevels = techRes.value
    if (newsRes.status === 'fulfilled') newsContext = newsRes.value
    if (histRes.status === 'fulfilled') historyContext = histRes.value
    if (greeksRes.status === 'fulfilled') greeksContext = greeksRes.value
  }
  const prompt = type === 'daily' ? buildDailyPrompt(count, expiryStr, technicalLevels, newsContext, historyContext, greeksContext) : buildWeeklyPrompt(count, expiryStr)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: `You are an expert options trader applying the ${type === 'daily' ? 'IC Daily Options Formula (0DTE intraday edge)' : 'IC Weekly Options Formula (3-week swing positioning)'}. Score every trade rigorously — reject anything under 65. Output only valid JSON with no other text.${liveData ? `\n\nLIVE MARKET DATA:\n${liveData}` : ''}`,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
  console.log(`[ai-options][${type}] preview:`, rawText.slice(0, 200))

  await logApiUsage(supabase, {
    apiName: 'claude',
    endpoint: `ai-options-${type}`,
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    costUsd: estimateClaudeCost(response.usage.input_tokens, response.usage.output_tokens),
    success: true,
  })

  const parsed = extractJSON(rawText)
  // Deduplicate: keep only the highest ic_score pick per underlying
  const seenUnderlying = new Map<string, any>()
  for (const t of (parsed.trades ?? [])) {
    const key = (t.underlying ?? '').toUpperCase()
    const existing = seenUnderlying.get(key)
    if (!existing || (parseInt(t.ic_score) || 0) > (parseInt(existing.ic_score) || 0)) {
      seenUnderlying.set(key, t)
    }
  }
  const trades: any[] = Array.from(seenUnderlying.values()).slice(0, count)
  const prices = await Promise.allSettled(trades.map(t => getUnderlyingPrice(t.underlying).catch(() => null)))

  // If Tradier is enabled, fetch real chain data for each trade in parallel
  const chainResults = TRADIER_ENABLED
    ? await Promise.allSettled(
        trades.map((trade, i) => {
          const livePrice: number | null = prices[i].status === 'fulfilled' ? (prices[i] as any).value : null
          const optType: 'call' | 'put' = trade.option_type === 'put' ? 'put' : 'call'
          const confidence = Math.min(10, Math.max(1, parseInt(trade.confidence) || 5))
          if (!livePrice) return Promise.resolve(null)
          return getBestContract(
            trade.underlying?.toUpperCase() ?? '',
            optType,
            confidence,
            type,
            livePrice,
            pickDate
          )
        })
      )
    : null

  const rows = trades.map((trade, i) => {
    const livePrice: number | null = prices[i].status === 'fulfilled' ? (prices[i] as any).value : null
    const optType: 'call' | 'put' = trade.option_type === 'put' ? 'put' : 'call'
    const confidence = Math.min(10, Math.max(1, parseInt(trade.confidence) || 5))
    const tickerUpper = trade.underlying?.toUpperCase() ?? ''

    // Use real chain data if Tradier returned a result
    const chainResult = chainResults?.[i]?.status === 'fulfilled'
      ? (chainResults[i] as any).value
      : null

    const strike = chainResult?.strike
      ?? (livePrice != null ? computeStrike(livePrice, confidence, optType, type, tickerUpper) : null)
    const expiry = chainResult?.expiry ?? expiryStr
    const entry_premium = chainResult?.mid ?? null
    const iv = chainResult?.iv ?? null
    const open_interest = chainResult?.openInterest ?? null
    const delta = chainResult?.delta ?? null

    const rationale = trade.ic_score
      ? `[IC:${parseInt(trade.ic_score) || '?'}] ${trade.rationale ?? ''}`
      : (trade.rationale ?? '')

    // Append IV and OI to rationale when available
    const chainNote = iv != null
      ? ` | IV: ${(iv * 100).toFixed(1)}%${open_interest ? ` | OI: ${open_interest.toLocaleString()}` : ''}`
      : ''

    return {
      pick_date: pickDate,
      underlying: trade.underlying?.toUpperCase() ?? '',
      option_type: optType,
      strike,
      expiry,
      entry_premium,
      stop_loss_pct: parseInt(trade.stop_loss_pct) || 40,
      take_profit_pct: parseInt(trade.take_profit_pct) || 80,
      confidence,
      rationale: rationale + chainNote,
      catalyst: trade.catalyst ?? '',
      sector: trade.sector ?? '',
      underlying_entry_price: livePrice,
      outcome: 'pending',
    }
  })

  if (rows.length > 0) {
    const { error } = await supabase.from('ai_options_picks').insert(rows)
    if (error) console.error(`[ai-options][${type}] insert error:`, error)
  }
  return rows
}

// Derive daily vs weekly from expiry proximity to pick_date
function getPickDuration(pick: any): 'daily' | 'weekly' {
  if (!pick.expiry || !pick.pick_date) return 'weekly'
  const days = Math.round(
    (new Date(pick.expiry + 'T12:00:00').getTime() - new Date(pick.pick_date + 'T12:00:00').getTime()) / 86400000
  )
  return days <= 1 ? 'daily' : 'weekly'
}

function calcOptionsStats(picks: any[]) {
  const ev = picks.filter(p => p.outcome === 'win' || p.outcome === 'loss')
    .sort((a: any, b: any) => new Date(b.pick_date).getTime() - new Date(a.pick_date).getTime() || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const wins = ev.filter(p => p.outcome === 'win')
  const losses = ev.filter(p => p.outcome === 'loss')
  const total = ev.length
  const winRate = total > 0 ? (wins.length / total) * 100 : 0
  const callPicks = ev.filter(p => p.option_type === 'call')
  const putPicks = ev.filter(p => p.option_type === 'put')
  const callWins = callPicks.filter(p => p.outcome === 'win').length
  const putWins = putPicks.filter(p => p.outcome === 'win').length
  let streakType: 'win' | 'loss' | null = null; let streakCount = 0
  for (const p of ev) {
    if (!streakType) { streakType = p.outcome; streakCount = 1 }
    else if (p.outcome === streakType) streakCount++
    else break
  }
  const dateMap: Record<string, { wins: number; losses: number; call_wins: number; call_total: number; put_wins: number; put_total: number }> = {}
  for (const p of ev) {
    const d = p.pick_date
    if (!dateMap[d]) dateMap[d] = { wins: 0, losses: 0, call_wins: 0, call_total: 0, put_wins: 0, put_total: 0 }
    if (p.outcome === 'win') dateMap[d].wins++; else dateMap[d].losses++
    if (p.option_type === 'call') { dateMap[d].call_total++; if (p.outcome === 'win') dateMap[d].call_wins++ }
    else { dateMap[d].put_total++; if (p.outcome === 'win') dateMap[d].put_wins++ }
  }
  const by_date = Object.entries(dateMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, d]) => ({ date, wins: d.wins, losses: d.losses, total: d.wins + d.losses, win_rate: (d.wins / (d.wins + d.losses)) * 100, call_wins: d.call_wins, call_total: d.call_total, put_wins: d.put_wins, put_total: d.put_total }))
  return {
    wins: wins.length, losses: losses.length, total, win_rate: winRate,
    call_wins: callWins, call_total: callPicks.length,
    put_wins: putWins, put_total: putPicks.length,
    streak_type: streakType, streak_count: streakCount,
    recent: ev.slice(0, 30).map(p => ({ outcome: p.outcome, option_type: p.option_type })).reverse(),
    by_date,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get('refresh') === 'true'
    const today = toDateStr(new Date())
    const monday = getMondayOfWeek(today)
    const isMondayToday = monday === today
    const isWeekendToday = isWeekend(today)

    const supabase = createServerSupabaseClient()

    await evaluatePending(supabase)

    // Fetch error check
    const { data: probe, error: fetchErr } = await supabase
      .from('ai_options_picks').select('id').limit(1)
    if (fetchErr) {
      console.error('[ai-options] fetch error:', fetchErr)
      return Response.json({ picks: [], stats: null, is_cached: false, generated_at: '', daily_date: null, weekly_date: null })
    }

    // Clear today's picks on refresh
    if (refresh && !isWeekendToday) {
      await supabase.from('ai_options_picks').delete().eq('pick_date', today)
    }

    // --- Determine which date to show daily picks from ---
    // If weekend, find most recent weekday with picks
    let dailyDate = today
    if (isWeekendToday) {
      const { data: recent } = await supabase
        .from('ai_options_picks').select('pick_date').neq('pick_date', monday)
        .order('pick_date', { ascending: false }).limit(1)
      if (recent?.[0]?.pick_date) dailyDate = recent[0].pick_date
    }

    // Fetch daily picks (short expiry ≤10 days)
    let { data: dailyPicks } = await supabase
      .from('ai_options_picks').select('*').eq('pick_date', dailyDate)
      .order('confidence', { ascending: false })
    dailyPicks = (dailyPicks ?? []).filter((p: any) => getPickDuration(p) === 'daily')

    // Generate daily picks if missing (weekday only)
    if (dailyPicks.length < 5 && !isWeekendToday) {
      let liveData = ''
      try {
        const timeout = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000))
        liveData = await Promise.race([fetchLiveData('pre-market briefing options volatility sector rotation market movers'), timeout])
      } catch {}
      await generatePicks(supabase, today, getDailyExpiry(today), 5, 'daily', liveData)
      const { data: fresh } = await supabase
        .from('ai_options_picks').select('*').eq('pick_date', today)
        .order('confidence', { ascending: false })
      dailyPicks = (fresh ?? []).filter((p: any) => getPickDuration(p) === 'daily')
      dailyDate = today
    }

    // --- Weekly picks: always from Monday of this week ---
    let { data: weeklyRaw } = await supabase
      .from('ai_options_picks').select('*').eq('pick_date', monday)
      .order('confidence', { ascending: false })
    let weeklyPicks = (weeklyRaw ?? []).filter((p: any) => getPickDuration(p) === 'weekly').slice(0, 5)

    // Generate weekly picks if it's Monday and none exist
    if (weeklyPicks.length < 5 && isMondayToday) {
      let liveData = ''
      try {
        const timeout = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000))
        liveData = await Promise.race([fetchLiveData('weekly market outlook sector rotation institutional flow options volatility'), timeout])
      } catch {}
      await generatePicks(supabase, monday, getWeeklyExpiry(monday), 5, 'weekly', liveData)
      const { data: fresh } = await supabase
        .from('ai_options_picks').select('*').eq('pick_date', monday)
        .order('confidence', { ascending: false })
      weeklyPicks = (fresh ?? []).filter((p: any) => getPickDuration(p) === 'weekly').slice(0, 5)
    }

    const picks = [...dailyPicks, ...weeklyPicks]

    const { data: allPicks } = await supabase.from('ai_options_picks').select('*')
      .order('created_at', { ascending: false }).limit(500)
    const stats = calcOptionsStats(allPicks ?? [])

    return Response.json({
      picks,
      stats,
      is_cached: true,
      generated_at: picks[0]?.created_at ?? '',
      daily_date: dailyPicks[0]?.pick_date ?? null,
      weekly_date: weeklyPicks[0]?.pick_date ?? null,
    })
  } catch (err) {
    console.error('[ai-options] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
