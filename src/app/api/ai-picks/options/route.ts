import Anthropic from '@anthropic-ai/sdk'
import { fetchLiveData } from '@/lib/live-data'
import { getQuote } from '@/lib/finnhub'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logApiUsage, estimateClaudeCost } from '@/lib/analytics'
import { getBestContract } from '@/lib/tradier'

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
  duration: 'daily' | 'weekly'
): number {
  const inc = getStrikeIncrement(price)
  const atm = Math.round(price / inc) * inc
  // strikesOTM: 0=ATM, 1=one increment OTM, etc.
  let strikesOTM = confidence >= 9 ? 0 : confidence >= 7 ? 1 : confidence >= 5 ? 2 : 3
  // Weekly options: prefer closer to ATM for better fill + value
  if (duration === 'weekly') strikesOTM = Math.max(0, strikesOTM - 1)
  const move = inc * strikesOTM
  return optionType === 'call' ? atm + move : atm - move
}

async function evaluatePending(supabase: any) {
  const todayStr = toDateStr(new Date())
  const { data: pending } = await supabase
    .from('ai_options_picks')
    .select('*')
    .eq('outcome', 'pending')
    .lte('expiry', todayStr)

  if (!pending?.length) return

  await Promise.allSettled(pending.map(async (pick: any) => {
    let exitPrice: number | null = null
    try {
      const q = await getQuote(pick.underlying)
      // For 0DTE (daily) picks: expiry === pick_date, so when we evaluate the next morning
      // q.c is pre-market and unreliable. Use q.pc (previous close) = the closing price on expiry day.
      const isZeroDTE = pick.expiry === pick.pick_date
      exitPrice = isZeroDTE ? (q?.pc ?? q?.c ?? null) : (q?.c ?? null)
    } catch {}
    if (exitPrice == null) return
    const isWin = pick.option_type === 'call' ? exitPrice > pick.strike : exitPrice < pick.strike
    await supabase.from('ai_options_picks').update({
      outcome: isWin ? 'win' : 'loss',
      exit_underlying_price: exitPrice,
      evaluated_at: new Date().toISOString(),
    }).eq('id', pick.id)
  }))
}

function buildDailyPrompt(count: number, expiryStr: string): string {
  return `You are an expert options trader using the IC Daily Formula — designed for 0DTE (same-day expiry) options. These trades open at market open and must be closed before EOD. Evaluate every candidate ticker against all 5 factors. Only include trades scoring 65+.

OUTPUT ONLY RAW JSON — no explanation, no markdown, no code fences. Start with { and end with }.

═══════════════════════════════════════════
IC DAILY OPTIONS FORMULA — 5 FACTORS (0-20 pts each)
For 0DTE options — intraday edge only
═══════════════════════════════════════════

FACTOR 1 — PRE-MARKET MOMENTUM (0-20)
Score 20: Strong pre-market gap (>0.8%) in direction of trade with volume confirmation
Score 15: Moderate pre-market move (0.3-0.8%) with follow-through signals
Score 10: Flat pre-market but clear opening range setup (first 15-min breakout likely)
Score 5: Weak or opposite pre-market signal — needs intraday confirmation
Score 0: No pre-market edge, no gap, no momentum — skip, find something with edge

FACTOR 2 — INTRADAY CATALYST (0-20)
Score 20: Known same-day binary event: economic data release (CPI, PPI, jobs, Fed minutes), Fed speaker, index rebalance, major earnings AH the night before driving sympathy plays
Score 18: High-impact morning news: analyst upgrade/downgrade at open, product announcement, geopolitical move affecting sector
Score 12: Technical level break at open — gap above major resistance, opening above key MA with volume
Score 6: General market momentum only — sector in play but no specific trigger
Score 0: No same-day catalyst — 0DTE without a catalyst is pure gambling, skip

FACTOR 3 — OPENING RANGE & TECHNICAL SETUP (0-20)
Score 20: Price breaking above (call) or below (put) previous day's high/low at open with 2x+ avg volume
Score 16: Clean technical pattern at key intraday level — VWAP reclaim, gap fill setup, opening drive continuation
Score 12: Strong daily trend supporting direction (above/below 20-day MA) — trend continuation likely
Score 8: Mixed signals but strong intraday momentum favors direction
Score 0: Fighting the trend, choppy open, no clear structure — skip

FACTOR 4 — OPTIONS FLOW & GAMMA (0-20)
Score 20: Unusual options activity pre-market or at open — large call/put sweeps at the ATM strike, high open interest at target strike
Score 16: Elevated options volume vs average — market makers likely to chase gamma, amplifying move
Score 12: Standard liquidity, tight bid/ask spread (<$0.10 for sub-$5 premium), sufficient OI for fill
Score 6: Thin market or wide spread (>$0.15) — slippage risk, hard fills
Score 0: Illiquid strike, wide spread >$0.25, or no open interest — impossible to trade efficiently

FACTOR 5 — VOLATILITY PROFILE FOR 0DTE (0-20)
Score 20: VIX 15-22 range (ideal 0DTE environment — enough movement but not chaotic), IV on the specific option is reasonable (not crushing immediately)
Score 16: VIX 22-28 — elevated vol, 0DTE premium is rich but big moves are possible, manage size
Score 12: VIX <15 — low vol, 0DTE will decay fast, ONLY take if catalyst is very strong (score 18-20 on Factor 2)
Score 5: VIX >28 — chaotic, 0DTE spreads are very wide, extreme risk — only take with massive catalyst
Score 0: VIX spike above 35 or in active crash mode — do NOT trade 0DTE in panic conditions

═══════════════════════════════════════
0DTE SCORING → CONFIDENCE → STRIKE
═══════════════════════════════════════
90-100 pts → confidence 9-10 → ATM strike, full size
80-89 pts  → confidence 7-8  → ATM or 1-strike OTM
70-79 pts  → confidence 5-6  → 1-2 strikes OTM, half size
65-69 pts  → confidence 4    → 2 strikes OTM, quarter size
<65 pts    → SKIP — 0DTE has no margin for error

0DTE RISK RULES (tighter than weekly):
Confidence 8-10: stop_loss_pct=40, take_profit_pct=80 (hit target fast, time decay kills you)
Confidence 6-7:  stop_loss_pct=35, take_profit_pct=60
Confidence 4-5:  stop_loss_pct=30, take_profit_pct=50
CRITICAL: 0DTE = close position by 3:45 PM ET regardless of outcome. No overnight holds.

HARD RULES FOR 0DTE:
- Must have a Factor 2 score of ≥12 — no catalyst, no 0DTE trade
- At least ${Math.ceil(count / 2)} calls AND at least ${Math.floor(count / 2)} puts
- Rationale MUST mention the catalyst and pre-market condition
- ONLY use tickers that have Mon/Wed/Fri or daily options expirations: SPY, QQQ, AAPL, NVDA, TSLA, META, AMZN, MSFT, GOOGL, AMD — do NOT use sector ETFs (XLK, XLE, XLF, XLY, etc.) or IWM for 0DTE as they do not have daily expirations
- Do NOT specify a strike — the system will compute the correct strike from the live price

Required JSON format — EXACTLY ${count} trades, expiring ${expiryStr} (today, 0DTE):
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
      "rationale": "Strong pre-market gap +0.6%, CPI data release this morning in-line, VWAP breakout setup",
      "catalyst": "CPI data release + gap continuation play",
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
  const prompt = type === 'daily' ? buildDailyPrompt(count, expiryStr) : buildWeeklyPrompt(count, expiryStr)

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
  const trades: any[] = (parsed.trades ?? []).slice(0, count)
  const prices = await Promise.allSettled(trades.map(t => getQuote(t.underlying).catch(() => null)))

  // If Tradier is enabled, fetch real chain data for each trade in parallel
  const chainResults = TRADIER_ENABLED
    ? await Promise.allSettled(
        trades.map((trade, i) => {
          const q = prices[i].status === 'fulfilled' ? (prices[i] as any).value : null
          const livePrice: number | null = q?.c ?? null
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
    const q = prices[i].status === 'fulfilled' ? (prices[i] as any).value : null
    const livePrice: number | null = q?.c ?? null
    const optType: 'call' | 'put' = trade.option_type === 'put' ? 'put' : 'call'
    const confidence = Math.min(10, Math.max(1, parseInt(trade.confidence) || 5))

    // Use real chain data if Tradier returned a result
    const chainResult = chainResults?.[i]?.status === 'fulfilled'
      ? (chainResults[i] as any).value
      : null

    const strike = chainResult?.strike
      ?? (livePrice != null ? computeStrike(livePrice, confidence, optType, type) : null)
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
