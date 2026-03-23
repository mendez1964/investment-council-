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

async function evaluatePending(supabase: any) {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // Get expired picks that are still pending
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

    // For calls: win if current price > strike. For puts: win if current price < strike.
    const isCall = pick.option_type === 'call'
    const isWin = isCall ? currentPrice > pick.strike : currentPrice < pick.strike

    await supabase.from('ai_options_picks').update({
      outcome: isWin ? 'win' : 'loss',
      exit_underlying_price: currentPrice,
      evaluated_at: new Date().toISOString(),
    }).eq('id', pick.id)
  }))
}

async function generateOptions(supabase: any, today: string) {
  if (isWeekend(today)) return []

  let liveData = ''
  try {
    const timeout = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000))
    liveData = await Promise.race([fetchLiveData('pre-market briefing options volatility sector rotation market movers earnings upcoming'), timeout])
  } catch {}

  // Calculate expiry 3 weeks out
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + 21)
  // Move to nearest Friday
  while (expiry.getDay() !== 5) expiry.setDate(expiry.getDate() + 1)
  const expiryStr = `${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, '0')}-${String(expiry.getDate()).padStart(2, '0')}`

  const prompt = `You are an options trading analyst. Generate 10 specific options trade setups for today using real liquid tickers.

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
- EXACTLY 10 trades
- Use highly liquid underlyings: SPY, QQQ, IWM, AAPL, NVDA, TSLA, META, AMZN, MSFT, GOOGL, AMD, GLD, TLT, XLE, etc.
- Mix calls and puts (at least 3 of each) based on real market conditions
- Strike should be near ATM (within 2-3% of current price) or slightly OTM
- entry_premium: realistic options premium in dollars (e.g. 2.50 to 15.00 for liquid names)
- stop_loss_pct: 30-50 (% of premium to cut loss)
- take_profit_pct: 60-120 (% of premium to take profit)
- confidence: 1-10 integer
- option_type: "call" or "put" only`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `You generate structured JSON data for options trading. Output only valid JSON with no other text.${liveData ? `\n\n${liveData}` : ''}`,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
  console.log('[ai-options] response preview:', rawText.slice(0, 200))

  const inputTokens = response.usage.input_tokens
  const outputTokens = response.usage.output_tokens
  await logApiUsage(supabase, {
    apiName: 'claude',
    endpoint: 'ai-options-generate',
    tokensInput: inputTokens,
    tokensOutput: outputTokens,
    costUsd: estimateClaudeCost(inputTokens, outputTokens),
    success: true,
  })

  const parsed = extractJSON(rawText)
  const trades: any[] = (parsed.trades ?? []).slice(0, 10)

  // Fetch current prices for underlying
  const prices = await Promise.allSettled(trades.map(t => getQuote(t.underlying).catch(() => null)))

  const rows = trades.map((trade, i) => {
    const q = prices[i].status === 'fulfilled' ? (prices[i] as any).value : null
    return {
      pick_date: today,
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
    if (error) console.error('[ai-options] insert error:', error)
  }
  return rows
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
  // By date breakdown
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
    .map(([date, d]) => ({ date, wins: d.wins, losses: d.losses, total: d.wins + d.losses, win_rate: ((d.wins / (d.wins + d.losses)) * 100), call_wins: d.call_wins, call_total: d.call_total, put_wins: d.put_wins, put_total: d.put_total }))
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
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const supabase = createServerSupabaseClient()

    await evaluatePending(supabase)

    const { data: todayPicks, error: fetchErr } = await supabase
      .from('ai_options_picks').select('*').eq('pick_date', today)
      .order('confidence', { ascending: false })

    if (fetchErr) {
      // Table might not exist yet
      console.error('[ai-options] fetch error:', fetchErr)
      return Response.json({ picks: [], stats: null, is_cached: false, generated_at: '' })
    }

    let picks: any[] = todayPicks ?? []
    let isCached = false
    let generatedAt = ''

    if (picks.length >= 10 && !refresh) {
      isCached = true
      generatedAt = picks[0]?.created_at ?? ''
    } else {
      if (refresh) await supabase.from('ai_options_picks').delete().eq('pick_date', today)
      if (!isWeekend(today)) {
        picks = await generateOptions(supabase, today)
        generatedAt = new Date().toISOString()
        // Re-fetch to get DB ids
        const { data: fresh } = await supabase
          .from('ai_options_picks').select('*').eq('pick_date', today)
          .order('confidence', { ascending: false })
        if (fresh?.length) picks = fresh
      }
    }

    const { data: allPicks } = await supabase.from('ai_options_picks').select('*')
      .order('created_at', { ascending: false }).limit(500)
    const stats = calcOptionsStats(allPicks ?? [])

    return Response.json({ picks, stats, is_cached: isCached, generated_at: generatedAt })
  } catch (err) {
    console.error('[ai-options] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
