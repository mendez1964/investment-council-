// Generate social posts from picks performance data and blog articles
// Uses real Supabase data — no scraping needed
// All posts are keyword-tied for SEO consistency

import { createServerSupabaseClient } from '@/lib/supabase'

const SITE_URL = 'https://investmentcouncil.ai'

const SEO_KEYWORDS = [
  'AI stock picks', 'options trading AI', 'AI investment analysis',
  'investment council AI', 'AI options picks', 'fintech AI platform'
]

function verifyOwner(request: Request): boolean {
  const pw = request.headers.get('x-owner-password')
  return pw === (process.env.OWNER_PASSWORD ?? 'council2024')
}

function sevenDaysAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

function thirtyDaysAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString()
}

async function callClaude(prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

export async function POST(request: Request) {
  if (!verifyOwner(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServerSupabaseClient()
    const weekAgo = sevenDaysAgo()
    const monthAgo = thirtyDaysAgo()

    // Pull evaluated picks from last 7 days
    const { data: weekPicks } = await supabase
      .from('ai_options_picks')
      .select('underlying, option_type, strike, expiry, confidence, rationale, catalyst, sector, underlying_entry_price, exit_underlying_price, outcome, pick_date, evaluated_at')
      .neq('outcome', 'pending')
      .gte('pick_date', weekAgo.split('T')[0])
      .order('pick_date', { ascending: false })

    // Pull 30-day stats for monthly accuracy post
    const { data: monthPicks } = await supabase
      .from('ai_options_picks')
      .select('outcome, confidence, sector, underlying')
      .neq('outcome', 'pending')
      .gte('pick_date', monthAgo.split('T')[0])

    const week = weekPicks ?? []
    const month = monthPicks ?? []

    // Calculate weekly stats
    const weekWins = week.filter(p => p.outcome === 'win').length
    const weekTotal = week.length
    const weekWinRate = weekTotal > 0 ? Math.round((weekWins / weekTotal) * 100) : 0

    // Find best pick this week (biggest underlying move)
    const bestPick = week
      .filter(p => p.outcome === 'win' && p.exit_underlying_price && p.underlying_entry_price)
      .map(p => ({
        ...p,
        move_pct: Math.abs(((p.exit_underlying_price - p.underlying_entry_price) / p.underlying_entry_price) * 100)
      }))
      .sort((a, b) => b.move_pct - a.move_pct)[0] ?? null

    // High-confidence win rate (confidence 8-10)
    const highConfPicks = week.filter(p => p.confidence >= 8)
    const highConfWins = highConfPicks.filter(p => p.outcome === 'win').length
    const highConfRate = highConfPicks.length > 0 ? Math.round((highConfWins / highConfPicks.length) * 100) : 0

    // Monthly stats
    const monthWins = month.filter(p => p.outcome === 'win').length
    const monthWinRate = month.length > 0 ? Math.round((monthWins / month.length) * 100) : 0

    // Sector breakdown (wins only)
    const sectorWins: Record<string, number> = {}
    week.filter(p => p.outcome === 'win' && p.sector).forEach(p => {
      sectorWins[p.sector] = (sectorWins[p.sector] ?? 0) + 1
    })
    const topSector = Object.entries(sectorWins).sort((a, b) => b[1] - a[1])[0]

    // Build performance summary for Claude
    const perfSummary = {
      week: { wins: weekWins, total: weekTotal, win_rate: weekWinRate },
      month: { wins: monthWins, total: month.length, win_rate: monthWinRate },
      best_pick: bestPick ? {
        ticker: bestPick.underlying,
        type: bestPick.option_type,
        move_pct: bestPick.move_pct.toFixed(1),
        confidence: bestPick.confidence,
        catalyst: bestPick.catalyst,
        date: bestPick.pick_date,
      } : null,
      high_confidence: { picks: highConfPicks.length, win_rate: highConfRate },
      top_sector: topSector ? { name: topSector[0], wins: topSector[1] } : null,
      recent_picks: week.slice(0, 5).map(p => ({
        ticker: p.underlying,
        type: p.option_type,
        outcome: p.outcome,
        confidence: p.confidence,
        catalyst: p.catalyst?.slice(0, 80),
      })),
    }

    // Step 1: Claude generates marketing summary
    const summaryPrompt = `You are a financial content strategist for Investment Council, an AI-powered options trading and stock picks platform at ${SITE_URL}.

Here is the platform's recent performance data:
${JSON.stringify(perfSummary, null, 2)}

Write a concise marketing summary (200 words max) that:
- Highlights the most compelling performance stats
- Uses specific numbers (not vague language)
- Frames everything as "our AI flagged/picked" NOT as investment advice
- Naturally includes these SEO keywords: ${SEO_KEYWORDS.slice(0, 3).join(', ')}
- Focuses on proof of accuracy, not predictions

Return only the summary text, no headers or labels.`

    const marketingSummary = await callClaude(summaryPrompt)

    // Step 2: Claude generates 8 themed posts (Twitter + LinkedIn for key themes)
    const postsPrompt = `You are a social media expert for Investment Council, an AI-powered options trading platform at ${SITE_URL}.

Platform performance summary:
${marketingSummary}

Raw stats:
- This week: ${weekWins}/${weekTotal} picks profitable (${weekWinRate}% win rate)
- This month: ${monthWinRate}% win rate across ${month.length} evaluated picks
- High-confidence picks (8-10): ${highConfRate}% win rate
${bestPick ? `- Best pick this week: $${bestPick.underlying} ${bestPick.option_type.toUpperCase()} — underlying moved ${Number(bestPick.move_pct).toFixed(1)}% (confidence: ${bestPick.confidence}/10)` : ''}
${topSector ? `- Top sector this week: ${topSector[0]} (${topSector[1]} winners)` : ''}

Target SEO keywords to weave in naturally: ${SEO_KEYWORDS.join(', ')}
Site URL for CTAs: ${SITE_URL}

Generate exactly 8 social media posts as a JSON array. Each post object must have:
- "theme": one of: weekly_accuracy | best_pick | high_confidence | sector_winners | monthly_recap | feature_highlight | monday_preview | proof_post
- "platform": "twitter" or "linkedin"
- "post_text": the full post text ready to publish
- "hashtags": array of 3-5 relevant hashtags (no # prefix)

Rules:
- Twitter posts: under 250 characters (leaving room for hashtags)
- LinkedIn posts: 3-5 sentences, more professional tone
- NEVER say "buy", "invest", or make price predictions
- Always frame as "our AI flagged/picked/identified"
- Include ${SITE_URL} in every post
- Use $TICKER format for stock mentions
- Be specific with numbers — vague posts get no engagement
- Make the reader curious enough to click the link
- Generate: 4 Twitter posts (weekly_accuracy, best_pick, high_confidence, proof_post) and 4 LinkedIn posts (monthly_recap, sector_winners, feature_highlight, monday_preview)

Return only valid JSON array, no other text.`

    const postsRaw = await callClaude(postsPrompt)

    // Parse Claude's JSON response
    let posts: Array<{
      theme: string
      platform: string
      post_text: string
      hashtags: string[]
    }> = []

    try {
      const jsonMatch = postsRaw.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        posts = JSON.parse(jsonMatch[0])
      }
    } catch {
      console.error('[social/generate] JSON parse error:', postsRaw.slice(0, 200))
      return Response.json({ error: 'Failed to parse Claude response' }, { status: 500 })
    }

    // Store all posts in Supabase
    const inserts = posts.map(p => ({
      platform: p.platform,
      theme: p.theme,
      content_type: 'picks_performance',
      source_data: perfSummary,
      marketing_summary: marketingSummary,
      post_text: p.post_text,
      hashtags: p.hashtags ?? [],
      keywords: SEO_KEYWORDS,
      status: 'pending',
    }))

    const { data: saved, error: insertError } = await supabase
      .from('social_posts')
      .insert(inserts)
      .select()

    if (insertError) {
      console.error('[social/generate] insert error:', insertError)
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    console.log(`[social/generate] generated ${saved?.length ?? 0} posts`)

    return Response.json({
      ok: true,
      generated: saved?.length ?? 0,
      posts: saved,
      stats: perfSummary,
    })

  } catch (err) {
    console.error('[social/generate]', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
