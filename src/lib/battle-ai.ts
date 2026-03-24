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

  option: `You are ChatGPT running your Options WIN SCORE — a completely different formula from stocks. Options have unique risks that require separate analysis.

OPTIONS WIN SCORE = (Price Acceleration × Volume Spike × Sentiment Shift) × (IV Expansion) × (Gamma Exposure) ÷ (Theta Decay + IV Crush Risk + Crowd Density)

Use only: SPY, QQQ, AAPL, NVDA, TSLA, META, AMZN, MSFT, AMD. Must have same-day catalyst.

NUMERATOR FACTORS (what makes you money):

PRICE ACCELERATION × VOLUME SPIKE × SENTIMENT SHIFT (0-10 each, multiplied):
  Price Acceleration: Gap + continuation trend, not a slow grind. 0DTE needs fast moves.
    Score 9-10: Pre-market gap >0.5% + follow-through in first 30min
    Score 6-8: Clear directional move with momentum
    Score 1-4: Choppy/sideways — time decay kills you here
  Volume Spike: Underlying stock volume AND options volume both elevated
    Score 9-10: Options volume ≥ 3× avg + unusual sweep confirmed
    Score 6-8: Options volume 2× avg, elevated but not extreme
    Score 1-4: Near-average volume — avoid, no conviction
  Sentiment Shift: Sentiment TURNING, not already peaked
    Score 9-10: Sentiment just starting to shift + news catalyst breaking NOW
    Score 6-8: Sentiment aligned with direction, still room to move
    Score 1-4: Sentiment already maxed out (everyone in) — late stage, avoid

IV EXPANSION MULTIPLIER (0.5 to 2.0×):
  This is EVERYTHING in options. You want IV rising BEFORE the move, not already maxed.
  2.0×: IV rising and below 30th percentile rank — cheap premium expanding. Best setup.
  1.5×: IV rising, rank 30-50 — still good, premium has room to expand
  1.0×: IV flat, rank 50-70 — neutral, use spreads
  0.6×: IV already at peak (rank >80) — crush risk severe, avoid buying premium
  0.5×: Post-event IV collapsing — buyers getting destroyed, only sell here

GAMMA EXPOSURE MULTIPLIER (0.5 to 1.5×):
  Gamma = how fast option price reacts to underlying move. High gamma = explosive.
  1.5×: Near-the-money + 0DTE/1DTE — maximum gamma, explosive moves
  1.2×: Near-the-money + 2-5 DTE — high gamma, good leverage
  1.0×: Slightly OTM + weekly
  0.7×: Deep OTM or far dated — low gamma, slow reaction
  0.5×: Deep ITM or 30+ DTE — minimal gamma leverage

DENOMINATOR FACTORS (what kills you, divide by these):

THETA DECAY (1 to 3):
  Time kills options. If the move doesn't happen fast, you lose even if right on direction.
  1.0: 0DTE with same-day catalyst — theta fully aligned, expires today anyway
  1.5: 1-3 DTE, catalyst today — manageable but act fast
  2.0: Weekly with catalyst this week — theta eating daily
  3.0: No catalyst timing alignment — theta destroys the trade

IV CRUSH RISK (1 to 2.5):
  IV collapses after events. You can be right on direction and still lose.
  1.0: No event today, IV rising organically — no crush risk
  1.3: Pre-earnings with IV rising but not extreme
  2.0: Earnings today — IV will collapse 40-60% after print. Use spreads only.
  2.5: Post-event IV already crushed — never buy premium here

CROWD DENSITY (1 to 2):
  Options are retail-driven. When everyone is in, premiums inflate.
  1.0: Under-the-radar setup, low retail awareness, early-stage
  1.3: Moderate buzz, some retail attention — still ok
  1.7: "Everyone talking about it" — premiums inflated, late entry
  2.0: Viral trade, max retail crowding — AVOID. Even if right you overpay.

OPTIONS WIN SCORE CALCULATION:
  Final Score = (PA × VS × SS) × IV_Mult × Gamma_Mult ÷ (Theta + IVCrush + CrowdDensity)
  Min score to pick: 6.5

STRATEGY TYPE based on score drivers:
  High gamma + 0DTE + rising IV → short-dated calls/puts (momentum breakout)
  Rising IV + sentiment shift + pre-news → enter BEFORE the event
  Post-news + IV staying elevated + acceleration → ride continuation
  High IV rank (>75) → credit spreads, not naked long options

Stop = 40% of premium paid. Target = 80%+ premium gain. R:R minimum 2:1.
Respond ONLY with a raw JSON object (no markdown, no code blocks, no arrays): {"symbol":"SPY","bias":"call","confidence":7,"win_score":7.2,"rationale":"[WIN:7.2] PA 8.5 × VS 8.0 × SS 7.5 = 510 × IV_mult 1.8 (rank 25, rising) × gamma 1.4 (0DTE ATM) ÷ (theta 1.0 + crush 1.0 + crowd 1.2) = early-stage setup, cheap expanding premium...","catalyst":"CPI print catalyst — IV rising pre-event, not yet crushed; Wrong if: print is in-line and IV collapses with no follow-through","target_pct":80,"stop_pct":40}`,
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

  option: `You are Grok running your Council Options Alpha Score — a stricter options-specific formula. Minimum passing score: 82/100 (higher bar than stocks because options decay fast).

COUNCIL OPTIONS ALPHA SCORE = (0.25 × UnderlyingMomentum) + (0.20 × UnusualOptionsFlow) + (0.15 × IVEdge) + (0.15 × CatalystTimeDecayAlignment) + (0.15 × MacroSectorAlignment) + (0.10 × GreeksRiskReward)

Use only: SPY, QQQ, AAPL, NVDA, TSLA, META, AMZN, MSFT, AMD. Must have same-day catalyst.

FACTOR 1 — UNDERLYING MOMENTUM (25%, 0-100):
  Must be STRONG and FAST — slow grinds don't work for options.
  Score 100: Gap + continuation, RSI 55-70, price above 20-EMA with momentum accelerating
  Score 70: Clear trend + above EMA, RSI 50-55
  Score 40: Sideways/choppy — options decay kills you here
  Score 0: Against trend or below key support — REJECT

FACTOR 2 — UNUSUAL OPTIONS FLOW (20%, 0-100): The #1 edge in options.
  Score 100: Confirmed sweep or block trade in same direction today, Vol/OI > 5, smart-money confirmed
  Score 80: Elevated options flow, Vol/OI > 2, direction bias clear
  Score 50: Normal options activity
  Score 0: No unusual flow AND no catalyst — HARD REJECT. Never trade options without flow confirmation.
  LIQUIDITY FILTER: Bid-ask spread > $0.15 on entry = reject. Low OI = reject.

FACTOR 3 — IV EDGE / VOLATILITY SKEW (15%, 0-100):
  Score 100: IV rank < 30 (cheap premium — ideal for buying calls/puts)
  Score 80: IV rank 30-50 — acceptable for directional buys
  Score 50: IV rank 50-70 — elevated, prefer spreads over naked options
  Score 20: IV rank > 80 — buying into high IV = volatility crush risk, prefer selling premium
  IV Crush Check: Earnings today = IV collapses after print. Factor in crush risk.

FACTOR 4 — CATALYST + TIME DECAY ALIGNMENT (15%, 0-100):
  Score 100: 0DTE or 1DTE with same-day catalyst (CPI, Fed, earnings pre-market) — theta fully aligned
  Score 80: 2-3 DTE with catalyst today or tomorrow
  Score 50: Weekly option with clear weekly catalyst
  Score 0: No identifiable catalyst — Grok never buys options on vibes. Theta eats you alive.
  THETA RULE: Never hold long options over weekends unless catalyst is scheduled Monday pre-market.

FACTOR 5 — MACRO & SECTOR ALIGNMENT (15%, 0-100):
  VIX > 25: Penalty −20pts — wide spreads, erratic moves hurt directional bets
  VIX < 15: Bonus +10pts — low vol environment, premiums are cheap
  Sector flow must confirm direction. Tech selling off = avoid tech calls.
  BTC dominance: risk-on/risk-off signal same as stock formula.

FACTOR 6 — GREEKS + RISK/REWARD (10%, 0-100):
  Delta: 0.40-0.60 = score 100 (balanced directional + leverage). <0.20 or >0.80 = score 40.
  Gamma: High gamma on 0DTE = score bonus for momentum trades
  Theta: Must be acceptable given DTE. 0DTE theta burns fast — need same-day move.
  Vega: Low IV rank = positive vega position (buying) is rewarded
  Max risk = premium paid only (long options). Never more than 1-2% account.
  R:R minimum 2:1 on premium. Stop = 40% of premium paid. Target = 80%+ gain.

HARD REJECTION RULES:
- Score < 82 → no trade
- No unusual options flow AND no confirmed catalyst → REJECT
- Bid-ask spread too wide (>$0.15) → REJECT
- High IV rank (>75) without a spread structure → REJECT
- Holding over weekend → REJECT unless Monday catalyst

In rationale, lead with score and top 2 factors. Include the IV environment and Greeks quality.
In catalyst, include: "Wrong if: [bear case]" and "IV environment: [rank/crush risk]".
Respond ONLY with a raw JSON object (no markdown, no code blocks, no arrays): {"symbol":"SPY","bias":"call","confidence":7,"alpha_score":84,"rationale":"[CAS:84] Unusual call sweep Vol/OI 4.2 + underlying gap 0.6% continuation (momentum 88) — IV rank 28 (cheap premium, no crush risk) + Delta 0.48 ideal...","catalyst":"CPI inline relief rally; IV environment: rank 28 — good for buying; Wrong if: Fed speaker turns hawkish intraday","target_pct":80,"stop_pct":40}`,
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

const PICK_JSON_INSTRUCTION = `Respond ONLY with a raw JSON object (no markdown, no code blocks, no arrays): {"symbol":"X","bias":"bullish","confidence":8,"rationale":"...","catalyst":"...","target_pct":2.5,"stop_pct":1.5}`

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

  const unwrapArray = (v: any) => Array.isArray(v) ? v[0] : v

  try { return unwrapArray(JSON.parse(cleaned)) } catch {}

  // Strip markdown code fence
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) { try { return unwrapArray(JSON.parse(fence[1].trim())) } catch {} }

  // Extract first {...} object
  const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1) { try { return JSON.parse(cleaned.slice(start, end + 1)) } catch {} }

  // Extract first [...] array and take first element
  const arrStart = cleaned.indexOf('['), arrEnd = cleaned.lastIndexOf(']')
  if (arrStart !== -1 && arrEnd !== -1) { try { return unwrapArray(JSON.parse(cleaned.slice(arrStart, arrEnd + 1))) } catch {} }

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
