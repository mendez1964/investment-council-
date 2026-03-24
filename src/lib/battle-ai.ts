import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// xAI Grok — uses OpenAI-compatible API
const xai = process.env.GROK_API_KEY
  ? new OpenAI({ apiKey: process.env.GROK_API_KEY, baseURL: 'https://api.x.ai/v1' })
  : null

// OpenAI ChatGPT
const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

// Google Gemini via OpenAI-compatible endpoint
const geminiClient = process.env.GEMINI_API_KEY
  ? new OpenAI({ apiKey: process.env.GEMINI_API_KEY, baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/' })
  : null

export interface BattlePickResult {
  symbol: string        // stock ticker or crypto symbol
  bias: string          // 'bullish' | 'bearish' | 'call' | 'put'
  confidence: number    // 1-10
  rationale: string
  catalyst: string
  target_pct: number    // % move target (e.g., 2.5 = 2.5%)
  stop_pct: number      // % stop loss
}

// Each AI has a distinct personality prompt. Claude currently powers all three.
// To swap in real APIs: replace the body of generateWithChatGPT or generateWithGemini.

const AI_PERSONAS: Record<string, string> = {
  claude:  `You are Claude, Anthropic's AI. You use the IC Formula — a rigorous 5-factor quantitative scoring system. You favor technically confirmed setups with clear catalysts. You reject anything without data backing. Disciplined, precise, systematic.`,
  chatgpt: `You are ChatGPT, OpenAI's AI. You combine fundamental analysis with momentum signals. You look for earnings catalysts, analyst sentiment shifts, and macro tailwinds. You lean slightly more bullish than peers, favor growth narratives, and excel at reading market psychology.`,
  gemini:  `You are Gemini, Google's AI. You use pattern recognition and multi-timeframe analysis. You excel at sector rotation signals, institutional flow patterns, and identifying where smart money is moving. You're data-driven but also factor in narrative strength.`,
  grok:    `You are Grok, xAI's AI built by Elon Musk's team. You are unconventional and contrarian — you look for setups others are missing. You factor in social sentiment, meme momentum, and real-time news flow. You're willing to take asymmetric bets and call out consensus trades that are crowded. Witty but precise.`,
}

const CATEGORY_INSTRUCTIONS: Record<string, string> = {
  stock: `Pick ONE stock (or ETF) from SPY/QQQ/IWM components. Give bullish or bearish bias. Pick the absolute highest conviction play today. Liquid tickers only.`,
  crypto: `Pick ONE cryptocurrency. Give bullish or bearish bias. BTC and ETH must be considered first. No meme coins without genuine catalyst.`,
  option: `Pick ONE 0DTE options trade (expires today). Give call or put. Use only: SPY, QQQ, AAPL, NVDA, TSLA, META, AMZN, MSFT, AMD, GLD. Must have a same-day catalyst.`,
}

// ── Grok's Council Alpha Score formula (distinct from IC Formula) ─────────────

const GROK_CATEGORY_INSTRUCTIONS: Record<string, string> = {
  stock: `You are Grok running your Council Alpha Score formula on today's market.

COUNCIL ALPHA SCORE = (0.25 × Momentum) + (0.20 × VolumeSurge) + (0.15 × SentimentEdge) + (0.15 × CatalystStrength) + (0.15 × MacroAlignment) + (0.10 × RiskRewardQuality)
Each sub-score is 0–100. Only stocks scoring ≥ 78 qualify. Pick the ONE with the highest score.

FACTOR 1 — MOMENTUM SCORE (25% weight, 0-100):
  40 pts: RSI(14) — oversold bounce (RSI 30-45 bullish) or RSI 55-70 (momentum continuation)
  30 pts: Price above 20-day EMA (bullish) or below (bearish)
  30 pts: Relative strength vs SPY today — outperforming = full pts, inline = 15pts, underperforming = 0pts
  Bonus: Pre-market gap + flag/breakout continuation pattern = +5pts

FACTOR 2 — VOLUME SURGE (20% weight, 0-100):
  Score 100: Volume ≥ 3× 20-day average — this is Grok's #1 fake-breakout filter
  Score 70: Volume 2-3× average — elevated but not extreme
  Score 40: Volume 1.5-2× average — moderate
  Score 10: Volume near or below average — REJECT as high risk without this signal
  Unusual options flow or dark-pool prints = +10pts bonus

FACTOR 3 — SENTIMENT EDGE (15% weight, 0-100):
  Score 100: Extreme Fear (CNN F&G <25) + stock showing positive divergence = contrarian long
  Score 85: Fear zone (25-40) + stock holding support = early recovery signal
  Score 60: Neutral sentiment + catalyst confirms direction
  Score 30: Greed (>65) + crowded trade = fade signal, prefer short
  Score 10: Extreme Greed (>80) + no catalyst = skip longs entirely
  Put/call ratio > 1.2 + bullish setup = bonus contrarian signal

FACTOR 4 — CATALYST STRENGTH (15% weight, 0-100):
  Score 100: Earnings beat verified today, insider buying filed, index addition announced
  Score 80: Analyst upgrade with price target raise, major contract win, FDA approval
  Score 60: Sector rotation event, peer momentum, technical breakout of major level
  Score 30: General market tailwind only — no specific catalyst
  Score 0: No identifiable catalyst — Grok never buys vibes

FACTOR 5 — MACRO ALIGNMENT (15% weight, 0-100):
  Yield curve: Normal (10Y > 2Y) + SPY above 20-day MA = score 100 (risk-on)
  Yield curve: Inverted + VIX > 22 = score 30 (risk-off, favor defensives only)
  BTC dominance rising = risk-off signal for equities, favor large-cap value
  BTC dominance falling = risk-on, small/mid caps can run
  Sector rotation: Pick must be in top 2 sectors by flow today

FACTOR 6 — RISK/REWARD QUALITY (10% weight, 0-100) — the tie-breaker:
  Score 100: R:R ≥ 3:1 with clean stop below structure (volume or prior low), position size ≤ 2% account risk
  Score 70: R:R 2:1 to 3:1 — acceptable minimum
  Score 0: R:R < 2:1 — HARD REJECT regardless of other scores. Grok does not take bad R:R.

REJECTION RULES:
- Score < 78 → find a different stock, do not force a pick
- Volume < 1.5× average → reject even if everything else is perfect
- R:R < 2:1 → reject immediately

In your rationale, lead with the alpha score and top 2 factors. In catalyst, include the bear-case in one sentence ("Wrong if: ...").
Respond ONLY with raw JSON: {"symbol":"X","bias":"bullish","confidence":8,"alpha_score":84,"rationale":"[CAS:84] Momentum RSI 58 + 2.8× volume surge...","catalyst":"Earnings beat premarket; Wrong if: market-wide selloff erases gap","target_pct":3.5,"stop_pct":1.5}`,

  crypto: `You are Grok running your Council Alpha Score on crypto — contrarian, sentiment-aware, volume-first.

Apply the same 6-factor Council Alpha Score but crypto-adapted:
- Momentum: RSI + above 20-day EMA + BTC correlation (if BTC bullish, altcoin must outperform)
- Volume Surge: On-chain volume + exchange inflow/outflow (outflow = bullish accumulation)
- Sentiment Edge: Fear & Greed index + funding rates (negative/zero = contrarian long, >0.05% = fade longs)
- Catalyst Strength: Protocol upgrade, ETF news, whale accumulation, exchange listing
- Macro Alignment: BTC dominance direction + risk-on/off regime
- Risk/Reward: Same 2:1 minimum, stop below key on-chain support level

Min score 78 to qualify. BTC and ETH evaluated first.
Respond ONLY with raw JSON: {"symbol":"BTC","bias":"bullish","confidence":8,"alpha_score":81,"rationale":"[CAS:81] Funding rates near zero (contrarian long signal) + BTC dominance falling (altcoin rotation)...","catalyst":"ETF inflow acceleration; Wrong if: macro risk-off spike above VIX 28","target_pct":5.0,"stop_pct":3.0}`,

  option: `You are Grok running your Council Alpha Score on 0DTE options — ruthless risk filter, volume-first.

For 0DTE: use only SPY, QQQ, AAPL, NVDA, TSLA, META, AMZN, MSFT, AMD. Must have same-day catalyst.
Apply Volume Surge factor first — if options volume < 2× average, reject immediately.
Catalyst Strength must score ≥ 60 — no catalyst = no 0DTE trade ever.
R:R minimum 2:1 on the option premium. Stop = 40% of premium. Target = 80%+.
Lead rationale with alpha score and the one dominant factor that makes this trade.
Respond ONLY with raw JSON: {"symbol":"SPY","bias":"call","confidence":7,"alpha_score":79,"rationale":"[CAS:79] CPI inline + SPY pre-market gap 0.5% + volume 2.3× average...","catalyst":"CPI data release confirms disinflation; Wrong if: Fed commentary turns hawkish intraday","target_pct":80,"stop_pct":40}`,
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })
  return res.content[0].type === 'text' ? res.content[0].text : ''
}

// ── Real API calls (fallback to Claude persona if key not set) ─────────────────

const PICK_JSON_INSTRUCTION = `Respond ONLY with raw JSON: {"symbol":"X","bias":"bullish","confidence":8,"rationale":"...","catalyst":"...","target_pct":2.5,"stop_pct":1.5}`

async function callOpenAICompat(
  client: OpenAI,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const res = await client.chat.completions.create({
    model,
    max_tokens: 400,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })
  return res.choices[0]?.message?.content ?? ''
}

async function generateWithChatGPT(category: string, liveData: string): Promise<string> {
  const system = `${AI_PERSONAS.chatgpt}\n\nLIVE MARKET DATA:\n${liveData}`
  const user = `${CATEGORY_INSTRUCTIONS[category]}\n\n${PICK_JSON_INSTRUCTION}`
  if (openaiClient) {
    return callOpenAICompat(openaiClient, 'gpt-4o', system, user)
  }
  // Fallback: Claude plays ChatGPT role
  return callClaude(system, user)
}

async function generateWithGemini(category: string, liveData: string): Promise<string> {
  const system = `${AI_PERSONAS.gemini}\n\nLIVE MARKET DATA:\n${liveData}`
  const user = `${CATEGORY_INSTRUCTIONS[category]}\n\n${PICK_JSON_INSTRUCTION}`
  if (geminiClient) {
    return callOpenAICompat(geminiClient, 'gemini-2.0-flash', system, user)
  }
  // Fallback: Claude plays Gemini role
  return callClaude(system, user)
}

async function generateWithGrok(category: string, liveData: string): Promise<string> {
  // Grok uses its own Council Alpha Score formula, not the shared instructions
  const system = `${AI_PERSONAS.grok}\n\nLIVE MARKET DATA:\n${liveData}`
  const user = GROK_CATEGORY_INSTRUCTIONS[category]
  if (xai) {
    return callOpenAICompat(xai, 'grok-2-latest', system, user)
  }
  // Fallback: Claude plays Grok role using the same Council Alpha Score formula
  return callClaude(system, user)
}

async function generateWithClaude(category: string, liveData: string): Promise<string> {
  return callClaude(
    `${AI_PERSONAS.claude}\n\nLIVE MARKET DATA:\n${liveData}`,
    `${CATEGORY_INSTRUCTIONS[category]}\n\nRespond ONLY with raw JSON: {"symbol":"X","bias":"bullish","confidence":8,"rationale":"...","catalyst":"...","target_pct":2.5,"stop_pct":1.5}`
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

function extractJSON(text: string): any {
  const cleaned = text.trim()
  try { return JSON.parse(cleaned) } catch {}
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) { try { return JSON.parse(fence[1].trim()) } catch {} }
  const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1) { try { return JSON.parse(cleaned.slice(start, end + 1)) } catch {} }
  throw new Error(`JSON parse failed: ${cleaned.slice(0, 100)}`)
}

export async function generateBattlePick(
  aiName: 'claude' | 'chatgpt' | 'gemini' | 'grok',
  category: 'stock' | 'crypto' | 'option',
  liveData: string
): Promise<BattlePickResult> {
  let raw: string
  if (aiName === 'chatgpt') raw = await generateWithChatGPT(category, liveData)
  else if (aiName === 'gemini') raw = await generateWithGemini(category, liveData)
  else if (aiName === 'grok') raw = await generateWithGrok(category, liveData)
  else raw = await generateWithClaude(category, liveData)

  const parsed = extractJSON(raw)

  // For Grok picks: embed alpha_score as [CAS:XX] prefix if not already in rationale
  let rationale = parsed.rationale ?? ''
  if (aiName === 'grok' && parsed.alpha_score && !rationale.startsWith('[CAS:')) {
    rationale = `[CAS:${parseInt(parsed.alpha_score)}] ${rationale}`
  }

  return {
    symbol: (parsed.symbol ?? '').toString().toUpperCase(),
    bias: parsed.bias ?? 'bullish',
    confidence: Math.min(10, Math.max(1, parseInt(parsed.confidence) || 7)),
    rationale,
    catalyst: parsed.catalyst ?? '',
    target_pct: parseFloat(parsed.target_pct) || 2.0,
    stop_pct: parseFloat(parsed.stop_pct) || 1.5,
  }
}
