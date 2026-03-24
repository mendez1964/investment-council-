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

// ── ChatGPT's Daily Alpha Engine (WIN SCORE formula) ──────────────────────────

const CHATGPT_CATEGORY_INSTRUCTIONS: Record<string, string> = {
  stock: `You are ChatGPT running your Daily Alpha Engine — WIN SCORE formula on today's market.

WIN SCORE = (Momentum × Acceleration) + (Unusual Activity × Volume Spike) + (Sentiment Shift × News Velocity) + (Liquidity × Volatility Sweet Spot) − (Overcrowding Risk)

FACTOR 1 — MOMENTUM × ACCELERATION:
  Momentum (0-10): Price trend strength — RSI(14) 55-70 = 8-10, RSI 45-55 = 5-7, RSI <45 or >75 = 1-4
  Acceleration (0-10): Rate of change — 3-day ROC > 3% = 10, 1-3% = 6-8, <1% = 1-5
  Combined: Momentum × Acceleration (max 100). Score ≥ 64 required.

FACTOR 2 — UNUSUAL ACTIVITY × VOLUME SPIKE:
  Unusual Activity (0-10): Options unusual flow, dark pool prints, insider filings — confirmed = 9-10, rumored = 5-7, none = 1-3
  Volume Spike (0-10): Today's volume vs 20-day avg — 3× = 10, 2× = 7, 1.5× = 5, <1.5× = 1-3
  Combined: UA × VS (max 100). This is ChatGPT's primary fake-breakout filter.

FACTOR 3 — SENTIMENT SHIFT × NEWS VELOCITY:
  Sentiment Shift (0-10): Change in analyst/social sentiment — upgrade + social momentum = 9-10, steady positive = 5-7, mixed/negative = 1-4
  News Velocity (0-10): Speed of catalyst hitting market — breaking + unpriced = 9-10, today's news = 6-8, old news = 1-4
  Combined: SS × NV (max 100).

FACTOR 4 — LIQUIDITY × VOLATILITY SWEET SPOT:
  Liquidity (0-10): Avg daily volume + tight bid/ask — >$500M ADV = 10, $100-500M = 7, <$100M = 3
  Volatility Sweet Spot (0-10): IV/HV ratio — IV slightly above HV (1.1-1.3×) = 10, IV = HV = 7, IV >> HV = 3 (expensive), IV << HV = 3 (no interest)
  Combined: L × VSS (max 100).

FACTOR 5 — OVERCROWDING RISK (subtract):
  Score 0-50: Short interest >20% + high put/call = 40-50 (crowded short, dangerous)
  Score 20-35: Heavily discussed on social/news = 20-35 (consensus long, take less)
  Score 0-15: Under the radar, fresh idea = 0-15

FINAL WIN SCORE = (F1 + F2 + F3 + F4) / 4 − Overcrowding Risk / 10
Minimum WIN SCORE to pick: 6.5/10. ChatGPT does NOT force a pick below threshold.

In rationale, lead with WIN SCORE and the top 2 factors. Favor growth narratives and earnings catalysts.
Respond ONLY with raw JSON: {"symbol":"X","bias":"bullish","confidence":8,"win_score":7.4,"rationale":"[WIN:7.4] Momentum×Acceleration 81 + Sentiment shift upgrade+gap...","catalyst":"Earnings beat + guidance raise; consensus was too low","target_pct":3.5,"stop_pct":1.5}`,

  crypto: `You are ChatGPT running your Daily Alpha Engine — WIN SCORE adapted for crypto.

WIN SCORE = (Momentum × Acceleration) + (Unusual Activity × Volume Spike) + (Sentiment Shift × News Velocity) + (Liquidity × Volatility Sweet Spot) − (Overcrowding Risk)

Crypto adaptations:
- Momentum: RSI + BTC correlation + above/below 20-day EMA
- Unusual Activity: On-chain whale moves, exchange outflow (accumulation), large OI changes
- Sentiment Shift: Crypto Fear & Greed change direction + social velocity (Twitter/Reddit momentum)
- News Velocity: Protocol upgrades, ETF news, exchange listings — speed of pricing in
- Liquidity: 24h volume + CEX depth
- Volatility Sweet Spot: Options IV/HV on BTC/ETH; for alts use ATR vs 30-day avg
- Overcrowding: Funding rates >0.05% = heavily long/crowded; negative = under-owned

BTC and ETH evaluated first. Min WIN SCORE 6.5.
Respond ONLY with raw JSON: {"symbol":"ETH","bias":"bullish","confidence":8,"win_score":7.1,"rationale":"[WIN:7.1] Funding rates near zero (under-owned) + ETF inflow acceleration + social sentiment turning...","catalyst":"ETH ETF inflows hitting 3-month high; consensus missed the rotation","target_pct":6.0,"stop_pct":3.5}`,

  option: `You are ChatGPT running your Daily Alpha Engine — WIN SCORE for 0DTE options.

Use only: SPY, QQQ, AAPL, NVDA, TSLA, META, AMZN, MSFT, AMD, GLD. Must have same-day catalyst.

WIN SCORE for 0DTE:
- Momentum × Acceleration: Pre-market gap direction + first 30min trend. Gap >0.5% with follow-through = 90+
- Unusual Activity × Volume Spike: 0DTE options flow first — if unusual call/put sweep exists, score doubles. Volume must be ≥ 2× avg.
- Sentiment Shift × News Velocity: Must have a catalyst hitting TODAY. Pre-market earnings, CPI, Fed = 9-10 NV. No catalyst = fail.
- Liquidity × Volatility Sweet Spot: SPY/QQQ have best 0DTE liquidity (score 10). Single stocks variable.
- Overcrowding: If everyone is buying calls after a gap-up, fade. If fear-spike and puts are piling in, consider calls.

Stop = 40% of premium paid. Target = 80%+ premium gain. R:R must be ≥ 2:1.
Min WIN SCORE 6.5. No catalyst = no trade.
Respond ONLY with raw JSON: {"symbol":"SPY","bias":"call","confidence":7,"win_score":7.0,"rationale":"[WIN:7.0] CPI inline gap 0.6% + unusual call sweep pre-market + sentiment relief rally...","catalyst":"CPI print confirms disinflation narrative; market under-positioned for relief rally","target_pct":80,"stop_pct":40}`,
}

// ── Gemini's Conviction Score (CS) formula ────────────────────────────────────

const GEMINI_CATEGORY_INSTRUCTIONS: Record<string, string> = {
  stock: `You are Gemini running your Conviction Score (CS) formula — a Multimodal Sentiment & Volatility Arb system.

CS = (μ_sent × w_s + Δ_vol × w_v) / σ_noise

COMPONENT 1 — μ_sent (Aggregate Sentiment Momentum, 0-10):
  Analyze the DELTA in institutional vs retail sentiment — not just whether it's positive or negative.
  Score 9-10: Institutions accumulating while retail is selling (high-conviction divergence — the "Council vs Hype" signal)
  Score 7-8: Institutions quietly adding with neutral retail — early positioning
  Score 5-6: Both sides aligned bullish — valid but less edge
  Score 2-4: Retail FOMO + institutional distribution = high risk of reversal
  Score 0-1: Institutions actively selling into retail enthusiasm = fade signal
  w_s weight: 0.6 base, rises to 0.8 near earnings/events (sentiment more predictive)

COMPONENT 2 — Δ_vol (Volatility Compression, 0-10): The "Coiled Spring" signal.
  Look for price range TIGHTENING while volume stays elevated — breakout is imminent.
  Score 9-10: ATR(5) < 50% of ATR(20) AND volume ≥ 1.5× average — textbook coil
  Score 7-8: ATR(5) 50-70% of ATR(20) with moderate volume — developing compression
  Score 5-6: Normal volatility, no compression pattern
  Score 2-4: Expanding volatility + volume — trend exhaustion, not compression
  w_v weight: 0.4 base, rises to 0.6 at market open (9:30-10:30 EST) when breakouts trigger
  Dynamic: w_v increases when VIX < 18 (low-vol environment favors compression plays)

COMPONENT 3 — σ_noise (Noise Floor, divisor — lower is better):
  Measure the "fake signal" level to ensure you are not chasing ghosts.
  σ_noise 1.0-1.3: Clean signal environment — bot activity low, authentic volume, no wash trading
  σ_noise 1.5-2.0: Moderate noise — social bot mentions rising, verify with fundamentals
  σ_noise 2.0-3.0: High noise — meme activity, social manipulation, wash trading suspected
  σ_noise >3.0: Reject pick — signal-to-noise ratio too low
  Noise indicators: social post velocity without price correlation, round-number volume spikes

THE "NO AGENDA" AUDIT (mandatory for every pick):
  Before finalizing: "If I were shorting this stock to zero, what is my strongest argument?"
  If the bull case survives its own shadow → conviction holds.
  If the bear case is compelling → downgrade pick or reject.
  Include the strongest counter-argument in your catalyst field.

CONTEXTUAL AWARENESS (beyond the chart):
  Check: CEO/insider sales in last 30 days? Competitor news? Patent expirations? Industry headwinds?
  Context overrides math when contradictory. A Golden Cross with CEO selling = lower conviction.

CS threshold: ≥ 6.5 to make a pick. Gemini does not force picks below threshold.
In rationale, lead with CS and the dominant factor (sentiment delta or volatility compression).
Respond ONLY with raw JSON: {"symbol":"X","bias":"bullish","confidence":8,"conviction_score":7.2,"rationale":"[CS:7.2] Institutional accumulation while retail selling (μ_sent 8.5) + ATR compression to 45% of 20-day (Δ_vol 9.0) / noise floor 1.2...","catalyst":"Sector rotation into tech confirmed; Counter-argument: CEO sold 5% stake last week — watch for follow-through","target_pct":3.5,"stop_pct":1.5}`,

  crypto: `You are Gemini running your Conviction Score on crypto — multimodal sentiment + on-chain volatility arb.

CS = (μ_sent × w_s + Δ_vol × w_v) / σ_noise

Crypto adaptations:
- μ_sent: Whale wallet accumulation vs retail exchange deposits. Coins leaving exchanges = institutional accumulation (high CS). Coins flowing to exchanges = retail distribution (low CS). Weight up when funding rates are extreme.
- Δ_vol: Compression on 1H/4H chart before a Bollinger Band squeeze. On-chain volume rising while price consolidates = textbook coil.
- σ_noise: Crypto noise is high — social bot activity, wash trading on smaller exchanges. Score from clean CEX data (Coinbase, Binance) only. Meme-driven spikes raise σ_noise to 2.5+.
- Dynamic weights: w_v higher at key support/resistance levels; w_s higher pre-macro events.

No Agenda Audit: mandatory. What kills this trade? (funding rate flip, whale exit, BTC dominance reversal)
BTC and ETH evaluated first. Min CS 6.5.
Respond ONLY with raw JSON: {"symbol":"ETH","bias":"bullish","confidence":8,"conviction_score":7.0,"rationale":"[CS:7.0] Exchange outflow 3-week high (institutional accumulation) + Bollinger squeeze on 4H / noise floor 1.3...","catalyst":"ETF inflow acceleration + L2 TVL all-time high; Counter-argument: BTC dominance rising could bleed ETH","target_pct":5.5,"stop_pct":3.0}`,

  option: `You are Gemini running your Conviction Score on 0DTE options — noise-filtered, compression-triggered.

Use only: SPY, QQQ, AAPL, NVDA, TSLA, META, AMZN, MSFT, AMD. Must have same-day catalyst.

CS for 0DTE:
- μ_sent: Options flow sentiment — unusual call/put sweep direction vs retail positioning. If smart money (dark pool, block trades) goes opposite to retail → high CS.
- Δ_vol: Pre-market compression is the trigger. SPY/QQQ range tightening in first 30min after catalyst = coil ready to break. Score 10 when 30min ATR < 50% of prior day ATR.
- σ_noise: 0DTE has naturally high noise. Filter: require the catalyst to be price-moving AND unpriced (not already gapped fully). σ_noise >2.5 on 0DTE = skip.
- Adaptive Stop-Loss: Gemini uses real-time order flow to tighten stops. Static stop = 40% of premium. Tighten to 25% if order flow reverses direction within first 15 min.

No Agenda Audit: What kills this trade in the next 4 hours?
Min CS 6.5. No verified same-day catalyst = automatic reject.
Respond ONLY with raw JSON: {"symbol":"SPY","bias":"call","confidence":7,"conviction_score":6.8,"rationale":"[CS:6.8] Smart money call sweep vs retail put-buying divergence (μ_sent 8.0) + pre-market range at 40% of prior day ATR (Δ_vol 8.5) / noise floor 1.6...","catalyst":"CPI inline + Fed silent period = relief compression release; Counter-argument: any hawkish Fed speaker breaks the setup","target_pct":80,"stop_pct":40}`,
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
    max_tokens: 800,
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
    max_tokens: 800,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })
  return res.choices[0]?.message?.content ?? ''
}

async function generateWithChatGPT(category: string, liveData: string): Promise<string> {
  const system = `${AI_PERSONAS.chatgpt}\n\nLIVE MARKET DATA:\n${liveData}`
  const user = CHATGPT_CATEGORY_INSTRUCTIONS[category]
  if (openaiClient) {
    try { return await callOpenAICompat(openaiClient, 'gpt-4o', system, user) }
    catch (e) { console.error('[chatgpt] API error, falling back to Claude:', e) }
  }
  return callClaude(system, user)
}

async function generateWithGemini(category: string, liveData: string): Promise<string> {
  const system = `${AI_PERSONAS.gemini}\n\nLIVE MARKET DATA:\n${liveData}`
  const user = GEMINI_CATEGORY_INSTRUCTIONS[category]
  if (geminiClient) {
    try { return await callOpenAICompat(geminiClient, 'gemini-2.0-flash', system, user) }
    catch (e) { console.error('[gemini] API error, falling back to Claude:', e) }
  }
  return callClaude(system, user)
}

async function generateWithGrok(category: string, liveData: string): Promise<string> {
  const system = `${AI_PERSONAS.grok}\n\nLIVE MARKET DATA:\n${liveData}`
  const user = GROK_CATEGORY_INSTRUCTIONS[category]
  if (xai) {
    try { return await callOpenAICompat(xai, 'grok-2-latest', system, user) }
    catch (e) { console.error('[grok] API error, falling back to Claude:', e) }
  }
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

  // Embed formula scores as prefixes if not already present in rationale
  let rationale = parsed.rationale ?? ''
  if (aiName === 'grok' && parsed.alpha_score && !rationale.startsWith('[CAS:')) {
    rationale = `[CAS:${parseInt(parsed.alpha_score)}] ${rationale}`
  }
  if (aiName === 'gemini' && parsed.conviction_score && !rationale.startsWith('[CS:')) {
    rationale = `[CS:${parseFloat(parsed.conviction_score).toFixed(1)}] ${rationale}`
  }
  if (aiName === 'chatgpt' && parsed.win_score && !rationale.startsWith('[WIN:')) {
    rationale = `[WIN:${parseFloat(parsed.win_score).toFixed(1)}] ${rationale}`
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
