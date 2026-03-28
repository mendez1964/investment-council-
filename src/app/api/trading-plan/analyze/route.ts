import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST() {
  const supabase = createServerSupabaseClientAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: plan } = await supabase
    .from('trading_plans')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!plan) return Response.json({ error: 'No trading plan found' }, { status: 404 })

  const styleMap: Record<string, string> = {
    day: 'Day Trading (intraday, positions closed by end of day)',
    swing: 'Swing Trading (holding 2-10 days)',
    position: 'Position Trading (holding weeks to months)',
    'long-term': 'Long-Term Investing (holding months to years)',
  }
  const sizingMap: Record<string, string> = {
    fixed: 'Fixed dollar amount per trade',
    pct: 'Fixed % of account per trade',
    atr: 'ATR-based (volatility-adjusted) sizing',
    kelly: 'Kelly Criterion (edge-based sizing)',
  }

  const prompt = `You are a professional trading coach and risk manager. Evaluate this trader's trading plan and give them a score and detailed feedback.

TRADING PLAN:
- Style: ${styleMap[plan.trading_style] || plan.trading_style}
- Markets: ${plan.markets.join(', ')}
- Timeframes: ${plan.timeframes.join(', ')}
- Risk per trade: ${plan.risk_per_trade_pct}%
- Max daily loss: ${plan.max_daily_loss_pct}%
- Max open positions: ${plan.max_open_positions}
- Max position size: ${plan.max_position_size_pct}% of account
- Entry criteria: ${plan.entry_criteria || '(not specified)'}
- Entry triggers: ${plan.entry_triggers?.length ? plan.entry_triggers.join(', ') : '(none specified)'}
- Profit target: ${plan.profit_target_pct ? plan.profit_target_pct + '%' : '(not specified)'}
- Stop loss: ${plan.stop_loss_pct ? plan.stop_loss_pct + '%' : '(not specified)'}
- Trailing stop: ${plan.uses_trailing_stop ? 'Yes' : 'No'}
- Exit criteria: ${plan.exit_criteria || '(not specified)'}
- Position sizing: ${sizingMap[plan.position_sizing_method] || plan.position_sizing_method}
- Preferred sectors: ${plan.preferred_sectors?.length ? plan.preferred_sectors.join(', ') : '(not specified)'}
- Conditions to avoid: ${plan.avoid_conditions || '(not specified)'}

SCORING RUBRIC (100 points total):
- Risk management completeness (25 pts): stop loss defined, daily loss limit set, position sizing method, max positions
- Entry discipline (20 pts): clear entry criteria, specific triggers defined, style-appropriate timeframes
- Exit discipline (20 pts): profit target defined, exit criteria clear, trailing stop consideration
- Internal consistency (20 pts): risk/reward makes sense, risk per trade vs daily loss limit is logical, style matches markets/timeframes
- Completeness (15 pts): all fields filled, no contradictions, nothing vague

Respond with ONLY valid JSON in this exact format:
{
  "score": <integer 0-100>,
  "grade": "<A/B/C/D/F>",
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "contradictions": ["<contradiction if any>"],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>"],
  "risk_reward_ratio": "<calculated or estimated R:R based on plan>",
  "style_fit": "<assessment of whether the style/markets/timeframes are aligned>"
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  let feedback: Record<string, unknown>
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    feedback = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 0, error: 'Parse failed' }
  } catch {
    return Response.json({ error: 'AI response parse failed' }, { status: 500 })
  }

  const score = typeof feedback.score === 'number' ? feedback.score : 0

  await supabase
    .from('trading_plans')
    .update({
      ai_score: score,
      ai_feedback: JSON.stringify(feedback),
      ai_scored_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  return Response.json({ feedback })
}
