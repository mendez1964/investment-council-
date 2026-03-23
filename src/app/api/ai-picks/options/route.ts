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
  const typeLabel = type === 'daily' ? 'short-term daily' : 'medium-term weekly'
  const expiryNote = type === 'daily'
    ? `expiring ${expiryStr} (0DTE — same day, expires today)`
    : `expiring ${expiryStr} (3-week plays)`

  const prompt = `You are an options trading analyst. Generate ${count} specific ${typeLabel} options trade setups using real liquid tickers.

OUTPUT ONLY RAW JSON — no explanation, no markdown, no code fences. Start with { and end with }.

Required format:
{
  "trades": [
    {
      "underlying": "SPY",
      "option_type": "call",
      "strike": 570,
      "expiry": "${expiryStr}",
      "entry_premium": 3.50,
      "stop_loss_pct": 40,
      "take_profit_pct": 80,
      "confidence": 7,
      "rationale": "12-15 word thesis explaining the setup",
      "catalyst": "8-10 word near-term trigger",
      "sector": "ETF"
    }
  ]
}

Rules:
- EXACTLY ${count} trades, ${expiryNote}
- Use highly liquid underlyings: SPY, QQQ, IWM, AAPL, NVDA, TSLA, META, AMZN, MSFT, GOOGL, AMD, GLD, TLT, XLE, etc.
- Mix calls and puts (at least 2 of each) based on real market conditions
- Strike: near ATM (within 2-3% of current price) or slightly OTM
- entry_premium: realistic premium in dollars (e.g. 1.00 to 15.00)
- stop_loss_pct: 30-50, take_profit_pct: 60-120
- confidence: 1-10 integer
- option_type: "call" or "put" only`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: `You generate structured JSON data for options trading. Output only valid JSON with no other text.${liveData ? `\n\n${liveData}` : ''}`,
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
      rationale: trade.rationale ?? '',
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
