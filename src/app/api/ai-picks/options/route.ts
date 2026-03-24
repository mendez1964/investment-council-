import Anthropic from '@anthropic-ai/sdk'
import { fetchLiveData } from '@/lib/live-data'
import { getQuote } from '@/lib/finnhub'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logApiUsage, estimateClaudeCost } from '@/lib/analytics'

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

async function evaluatePending(supabase: any) {
  const todayStr = toDateStr(new Date())
  const { data: pending } = await supabase
    .from('ai_options_picks')
    .select('*')
    .eq('outcome', 'pending')
    .lte('expiry', todayStr)

  if (!pending?.length) return

  await Promise.allSettled(pending.map(async (pick: any) => {
    let currentPrice: number | null = null
    try {
      const q = await getQuote(pick.underlying)
      currentPrice = q?.c ?? null
    } catch {}
    if (currentPrice == null) return
    const isWin = pick.option_type === 'call' ? currentPrice > pick.strike : currentPrice < pick.strike
    await supabase.from('ai_options_picks').update({
      outcome: isWin ? 'win' : 'loss',
      exit_underlying_price: currentPrice,
      evaluated_at: new Date().toISOString(),
    }).eq('id', pick.id)
  }))
}

async function generatePicks(supabase: any, pickDate: string, expiryStr: string, count: number, type: 'daily' | 'weekly', liveData: string) {
  const expiryNote = type === 'daily'
    ? `expiring ${expiryStr} (0DTE — expires today at close)`
    : `expiring ${expiryStr} (~3 weeks out)`

  const prompt = `You are an expert options trader using the IC Formula — a 5-factor scoring system. Evaluate every candidate ticker against all 5 factors before selecting. Only include trades scoring 65+.

OUTPUT ONLY RAW JSON — no explanation, no markdown, no code fences. Start with { and end with }.

═══════════════════════════════════════
IC FORMULA — 5 FACTORS (each 0-20 pts)
═══════════════════════════════════════

FACTOR 1 — TREND ALIGNMENT (0-20)
Score 20: Price above 20, 50, AND 200-day MA (calls) OR below all 3 (puts)
Score 15: Above/below 20+50-day MA only
Score 10: Above/below 20-day MA only
Score 5: Mixed/choppy signals
Score 0: Trading against the primary trend — skip this trade

FACTOR 2 — MOMENTUM QUALITY (0-20)
Calls: RSI 50-68 = 20pts (strong momentum, not overbought), RSI 40-50 = 12pts (building), RSI >75 = 5pts (overbought risk), RSI <45 = 3pts (weak)
Puts: RSI 32-50 = 20pts, RSI 25-32 = 12pts, RSI <25 = 5pts (oversold bounce risk), RSI >55 = 3pts (too strong)
Also: High relative volume (>1.3x avg) = +3 bonus pts

FACTOR 3 — SECTOR ROTATION (0-20)
Score 20: Underlying is in the #1 or #2 leading sector today AND the sector has positive money flow
Score 15: In a strengthening/neutral sector with positive bias
Score 10: Sector neutral, stock has independent catalyst
Score 5: Sector lagging but stock showing relative strength
Score 0: In a lagging sector with no independent catalyst — use as PUT candidate instead

FACTOR 4 — CATALYST PRESENT (0-20)
Score 20: Clear identifiable catalyst within expiry window — Fed decision, earnings, product launch, economic data, technical breakout of major level
Score 15: Moderate catalyst — sector rotation event, index rebalance, options expiry effect
Score 10: Technical only — bouncing off key support, breaking key resistance
Score 5: Macro tailwind only
Score 0: No clear catalyst identified — do NOT include this trade

FACTOR 5 — OPTIONS CONDITIONS (0-20)
Score 20: IV rank estimated <30 (cheap premium — ideal for buying options)
Score 15: IV rank ~30-50 (fair value — acceptable with strong catalyst)
Score 10: IV rank ~50-70 (elevated — require higher conviction catalyst)
Score 5: IV rank >70 (expensive — only include if massive catalyst)
Score 0: IV crush risk present (within 1 day of earnings/event that already happened)

═══════════════════════════════════
SCORING → CONFIDENCE → STRIKE SELECTION
═══════════════════════════════════
90-100 pts → confidence 9-10 → ATM strike
80-89 pts  → confidence 7-8  → ATM or 1-strike OTM
70-79 pts  → confidence 5-6  → 1-2 strikes OTM
65-69 pts  → confidence 4    → 2 strikes OTM, smaller size
<65 pts    → SKIP — find a better trade

RISK MANAGEMENT BY CONFIDENCE:
Confidence 8-10: stop_loss_pct=35, take_profit_pct=100 (3:1 minimum)
Confidence 6-7:  stop_loss_pct=40, take_profit_pct=80  (2:1 minimum)
Confidence 4-5:  stop_loss_pct=30, take_profit_pct=60

HARD RULES:
- Never pick a stock with earnings within the expiry window UNLESS earnings IS the catalyst
- At least ${Math.ceil(count / 2)} calls AND at least ${Math.floor(count / 2)} puts — use sector leaders for calls, laggards for puts
- Every rationale must reference 2+ factors (trend, RSI level, sector position, or catalyst)
- Use only liquid tickers: SPY, QQQ, IWM, AAPL, NVDA, TSLA, META, AMZN, MSFT, GOOGL, AMD, GLD, TLT, XLE, XLK, XLF, XLV, XLY, XLC

Required JSON format — EXACTLY ${count} trades, ${expiryNote}:
{
  "trades": [
    {
      "underlying": "SPY",
      "option_type": "call",
      "strike": 570,
      "expiry": "${expiryStr}",
      "entry_premium": 3.50,
      "stop_loss_pct": 35,
      "take_profit_pct": 100,
      "confidence": 8,
      "ic_score": 83,
      "rationale": "Above all 3 MAs, RSI 61, tech sector leading with strong breadth",
      "catalyst": "Tech momentum + NVDA earnings tailwind driving index",
      "sector": "ETF"
    }
  ]
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: `You are an expert options trader applying the IC Formula. Score every trade rigorously — reject anything under 65. Output only valid JSON with no other text.${liveData ? `\n\nLIVE MARKET DATA:\n${liveData}` : ''}`,
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

  const rows = trades.map((trade, i) => {
    const q = prices[i].status === 'fulfilled' ? (prices[i] as any).value : null
    return {
      pick_date: pickDate,
      underlying: trade.underlying?.toUpperCase() ?? '',
      option_type: trade.option_type === 'put' ? 'put' : 'call',
      strike: parseFloat(trade.strike) || null,
      expiry: trade.expiry ?? expiryStr,
      entry_premium: parseFloat(trade.entry_premium) || null,
      stop_loss_pct: parseInt(trade.stop_loss_pct) || 40,
      take_profit_pct: parseInt(trade.take_profit_pct) || 80,
      confidence: Math.min(10, Math.max(1, parseInt(trade.confidence) || 5)),
      rationale: trade.ic_score ? `[IC:${parseInt(trade.ic_score) || '?'}] ${trade.rationale ?? ''}` : (trade.rationale ?? ''),
      catalyst: trade.catalyst ?? '',
      sector: trade.sector ?? '',
      underlying_entry_price: q?.c ?? null,
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
