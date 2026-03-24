import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD

  // Yesterday's date
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = yesterdayDate.toLocaleDateString('en-CA')

  // Last 7 days dates
  const last7Dates: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    last7Dates.push(d.toLocaleDateString('en-CA'))
  }

  // Fetch today's picks
  const { data: picksToday } = await supabase
    .from('battle_picks')
    .select('*')
    .eq('pick_date', today)
    .order('ai_name')
    .order('category')

  // Fetch all resolved picks for leaderboard + recent days
  const sevenDaysAgo = last7Dates[0]
  const { data: recentPicks } = await supabase
    .from('battle_picks')
    .select('*')
    .gte('pick_date', sevenDaysAgo)
    .neq('outcome', 'pending')
    .order('pick_date', { ascending: false })

  // All-time picks for leaderboard
  const { data: allPicks } = await supabase
    .from('battle_picks')
    .select('*')
    .neq('outcome', 'pending')

  const AI_NAMES = ['claude', 'chatgpt', 'gemini', 'grok'] as const
  const CATEGORIES = ['stock', 'crypto', 'option'] as const

  // Build leaderboard
  const leaderboard = AI_NAMES.map(ai => {
    const aiPicks = (allPicks ?? []).filter((p: any) => p.ai_name === ai)
    const wins = aiPicks.filter((p: any) => p.outcome === 'win').length
    const losses = aiPicks.filter((p: any) => p.outcome === 'loss').length
    const total = wins + losses
    const win_rate = total > 0 ? Math.round((wins / total) * 100) : 0
    const target_hit_rate = total > 0
      ? Math.round((aiPicks.filter((p: any) => p.target_hit).length / total) * 100)
      : 0

    // Best category
    let best_category = 'stock'
    let bestRate = -1
    for (const cat of CATEGORIES) {
      const catPicks = aiPicks.filter((p: any) => p.category === cat)
      const catWins = catPicks.filter((p: any) => p.outcome === 'win').length
      const catTotal = catPicks.length
      const rate = catTotal > 0 ? catWins / catTotal : -1
      if (rate > bestRate) { bestRate = rate; best_category = cat }
    }

    // Current streak
    const sorted = [...aiPicks].sort((a: any, b: any) =>
      new Date(b.evaluated_at ?? b.created_at).getTime() - new Date(a.evaluated_at ?? a.created_at).getTime()
    )
    let streak = 0
    let streakType: 'W' | 'L' | null = null
    for (const p of sorted) {
      if (streakType === null) { streakType = p.outcome === 'win' ? 'W' : 'L'; streak = 1 }
      else if ((p.outcome === 'win' && streakType === 'W') || (p.outcome === 'loss' && streakType === 'L')) streak++
      else break
    }

    return { ai_name: ai, wins, losses, total, win_rate, current_streak: streak, streak_type: streakType ?? 'W', best_category, target_hit_rate }
  })

  // Yesterday's winner
  const yesterdayPicks = (recentPicks ?? []).filter((p: any) => p.pick_date === yesterday)
  let yesterday_winner: string | null = null
  if (yesterdayPicks.length > 0) {
    const counts: Record<string, number> = {}
    for (const p of yesterdayPicks) {
      if (p.outcome === 'win') counts[p.ai_name] = (counts[p.ai_name] ?? 0) + 1
    }
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    yesterday_winner = best ? best[0] : null
  }

  // Yesterday's winner stats
  let yesterday_wins = 0
  let yesterday_total = 0
  if (yesterday_winner) {
    const ywPicks = yesterdayPicks.filter((p: any) => p.ai_name === yesterday_winner)
    yesterday_wins = ywPicks.filter((p: any) => p.outcome === 'win').length
    yesterday_total = ywPicks.length
  }

  // Last 7 days results
  const recent_days = last7Dates.map(date => {
    const dayPicks = (recentPicks ?? []).filter((p: any) => p.pick_date === date)

    const aiStats = AI_NAMES.map(ai => {
      const aiDay = dayPicks.filter((p: any) => p.ai_name === ai)
      const wins = aiDay.filter((p: any) => p.outcome === 'win').length
      const losses = aiDay.filter((p: any) => p.outcome === 'loss').length
      return { ai_name: ai, wins, losses }
    })

    // Day winner
    let winner: string | null = null
    let maxWins = -1
    for (const s of aiStats) {
      if (s.wins > maxWins) { maxWins = s.wins; winner = s.ai_name }
      else if (s.wins === maxWins && maxWins > 0) winner = null // tie
    }

    return { date, ai_stats: aiStats, winner: maxWins > 0 ? winner : null }
  })

  return Response.json({
    today,
    picks_today: picksToday ?? [],
    yesterday_winner,
    yesterday_wins,
    yesterday_total,
    leaderboard,
    recent_days,
  })
}
