import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { getQuote } from '@/lib/finnhub'
import { getCryptoPrice } from '@/lib/coingecko'

const CRYPTO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot',
  DOGE: 'dogecoin', LINK: 'chainlink', LTC: 'litecoin', ATOM: 'cosmos',
  NEAR: 'near', ARB: 'arbitrum', OP: 'optimism', INJ: 'injective-protocol',
  HBAR: 'hedera-hashgraph', SHIB: 'shiba-inu', UNI: 'uniswap', AAVE: 'aave',
}

function parseIcScore(rationale: string | null): number | null {
  if (!rationale) return null
  const m = rationale.match(/^\[IC:(\d+)\]/)
  return m ? parseInt(m[1]) : null
}

function getBestPick(picks: any[]): any | null {
  if (!picks?.length) return null
  let best = picks[0]
  let bestScore = parseIcScore(best.rationale) ?? best.confidence
  for (const pick of picks) {
    const score = parseIcScore(pick.rationale) ?? pick.confidence
    if (score > bestScore) {
      best = pick
      bestScore = score
    }
  }
  return best
}

function getToday(): string {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
}

async function getCurrentUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase.auth.getUser(token)
  return data.user ?? null
}

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const today = getToday()

  // Council stock pick
  const { data: stockPicks } = await supabase
    .from('ai_picks')
    .select('*')
    .eq('pick_date', today)
    .eq('type', 'stock')
    .order('confidence', { ascending: false })
    .limit(20)

  // Council crypto pick
  const { data: cryptoPicks } = await supabase
    .from('ai_picks')
    .select('*')
    .eq('pick_date', today)
    .eq('type', 'crypto')
    .order('confidence', { ascending: false })
    .limit(20)

  // Council option pick (0DTE: expiry = pick_date)
  const { data: optionPicks } = await supabase
    .from('ai_options_picks')
    .select('*')
    .eq('pick_date', today)
    .eq('expiry', today)
    .order('confidence', { ascending: false })
    .limit(10)

  const councilStock = getBestPick(stockPicks ?? [])
  const councilCrypto = getBestPick(cryptoPicks ?? [])
  const councilOption = getBestPick(optionPicks ?? [])

  // Council stats (wins/losses from ai_picks)
  const { data: stockResolved } = await supabase
    .from('ai_picks')
    .select('outcome')
    .neq('outcome', 'pending')

  const { data: optionResolved } = await supabase
    .from('ai_options_picks')
    .select('outcome')
    .neq('outcome', 'pending')

  const allCouncilResolved = [...(stockResolved ?? []), ...(optionResolved ?? [])]
  const councilWins = allCouncilResolved.filter(r => r.outcome === 'win').length
  const councilLosses = allCouncilResolved.filter(r => r.outcome === 'loss').length
  const councilTotal = councilWins + councilLosses
  const councilWinRate = councilTotal > 0 ? Math.round((councilWins / councilTotal) * 100) : null

  // Council streak
  const { data: recentCouncil } = await supabase
    .from('ai_picks')
    .select('outcome, pick_date')
    .neq('outcome', 'pending')
    .order('pick_date', { ascending: false })
    .limit(20)

  let councilStreak = 0
  let councilStreakType: 'win' | 'loss' | null = null
  if (recentCouncil?.length) {
    councilStreakType = recentCouncil[0].outcome as 'win' | 'loss'
    for (const r of recentCouncil) {
      if (r.outcome === councilStreakType) councilStreak++
      else break
    }
  }

  // User's pick for today
  let userToday: Record<string, unknown> | null = null
  let userStats: { wins: number; losses: number; win_rate: number | null; streak: number; streak_type: 'win' | 'loss' | null } | null = null

  const user = await getCurrentUser(req)

  if (user) {
    const { data: userPickToday } = await supabase
      .from('user_picks')
      .select('*')
      .eq('user_id', user.id)
      .eq('pick_date', today)
      .single()

    userToday = userPickToday ?? null

    // User stats
    const { data: userResolved } = await supabase
      .from('user_picks')
      .select('stock_outcome, crypto_outcome, option_outcome')
      .eq('user_id', user.id)

    let uWins = 0
    let uLosses = 0
    for (const row of userResolved ?? []) {
      const outcomes = [row.stock_outcome, row.crypto_outcome, row.option_outcome]
      for (const o of outcomes) {
        if (o === 'win') uWins++
        else if (o === 'loss') uLosses++
      }
    }
    const uTotal = uWins + uLosses
    const uWinRate = uTotal > 0 ? Math.round((uWins / uTotal) * 100) : null

    // User streak
    const { data: userRecentPicks } = await supabase
      .from('user_picks')
      .select('stock_outcome, crypto_outcome, option_outcome, pick_date')
      .eq('user_id', user.id)
      .order('pick_date', { ascending: false })
      .limit(20)

    let userStreak = 0
    let userStreakType: 'win' | 'loss' | null = null
    if (userRecentPicks?.length) {
      const allOutcomes: Array<{ outcome: string; date: string }> = []
      for (const row of userRecentPicks) {
        const candidates = [row.stock_outcome, row.crypto_outcome, row.option_outcome].filter(o => o && o !== 'pending')
        if (candidates.length) {
          const lastOutcome = candidates[candidates.length - 1]
          allOutcomes.push({ outcome: lastOutcome, date: row.pick_date })
        }
      }
      if (allOutcomes.length) {
        userStreakType = allOutcomes[0].outcome as 'win' | 'loss'
        for (const r of allOutcomes) {
          if (r.outcome === userStreakType) userStreak++
          else break
        }
      }
    }

    userStats = {
      wins: uWins,
      losses: uLosses,
      win_rate: uWinRate,
      streak: userStreak,
      streak_type: userStreakType,
    }
  }

  // History: last 10 days of council picks + user picks
  const tenDaysAgo = new Date()
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 9)
  const fromDate = tenDaysAgo.toLocaleDateString('en-CA')

  const { data: historyStockPicks } = await supabase
    .from('ai_picks')
    .select('pick_date, symbol, type, bias, outcome, rationale, confidence')
    .gte('pick_date', fromDate)
    .order('pick_date', { ascending: false })

  const { data: historyOptionPicks } = await supabase
    .from('ai_options_picks')
    .select('pick_date, underlying, option_type, outcome, rationale, confidence')
    .gte('pick_date', fromDate)
    .order('pick_date', { ascending: false })

  let userHistory: any[] = []
  if (user) {
    const { data: userHistoryData } = await supabase
      .from('user_picks')
      .select('*')
      .eq('user_id', user.id)
      .gte('pick_date', fromDate)
      .order('pick_date', { ascending: false })
    userHistory = userHistoryData ?? []
  }

  return NextResponse.json({
    council: {
      stock: councilStock,
      crypto: councilCrypto,
      option: councilOption,
    },
    user_today: userToday,
    council_stats: {
      wins: councilWins,
      losses: councilLosses,
      win_rate: councilWinRate,
      streak: councilStreak,
      streak_type: councilStreakType,
    },
    user_stats: userStats,
    today: today,
    history: {
      stock_picks: historyStockPicks ?? [],
      option_picks: historyOptionPicks ?? [],
      user_picks: userHistory,
    },
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    stock_symbol,
    stock_bias,
    crypto_symbol,
    crypto_bias,
    option_underlying,
    option_type,
  } = body

  const today = getToday()
  const supabase = createServerSupabaseClient()

  // Fetch entry prices
  let stockEntryPrice: number | null = null
  let cryptoEntryPrice: number | null = null

  if (stock_symbol) {
    try {
      const quote = await getQuote(stock_symbol)
      stockEntryPrice = quote?.c ?? null
    } catch { /* price unavailable */ }
  }

  if (crypto_symbol) {
    try {
      const coinId = CRYPTO_ID_MAP[crypto_symbol.toUpperCase()] ?? 'bitcoin'
      const price = await getCryptoPrice(coinId)
      cryptoEntryPrice = price?.price ?? null
    } catch { /* price unavailable */ }
  }

  const { data, error } = await supabase
    .from('user_picks')
    .upsert(
      {
        user_id: user.id,
        pick_date: today,
        stock_symbol: stock_symbol || null,
        stock_bias: stock_bias || null,
        stock_entry_price: stockEntryPrice,
        crypto_symbol: crypto_symbol || null,
        crypto_bias: crypto_bias || null,
        crypto_entry_price: cryptoEntryPrice,
        option_underlying: option_underlying || null,
        option_type: option_type || null,
      },
      { onConflict: 'user_id,pick_date' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
