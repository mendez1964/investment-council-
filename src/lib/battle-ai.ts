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
  stock: `Pick ONE stock (or ETF) from SPY/QQQ/IWM components. Give bullish or bearish bias. Pick the absolute highest conviction play today. Liquid tickers only.

PIVOT & FIBONACCI REQUIREMENT: The live data includes KEY SUPPORT/RESISTANCE LEVELS with floor trader pivots (PP, R1, R2, S1, S2) and Fibonacci retracements (38.2%, 50%, 61.8%) from the 20-day swing. You MUST use these levels when available: (1) Prefer picks where price is bouncing off fib/pivot support (bullish) or rejecting from R1/R2 (bearish). (2) Set targets at the next R1 or R2 level. (3) Set stops just below S1 or the nearest fib support. Reference the specific levels in your rationale.`,
  crypto: `Pick ONE cryptocurrency. Give bullish or bearish bias. BTC and ETH must be considered first. No meme coins without genuine catalyst.`,
  option: `Pick ONE 0DTE options trade (expires today). Give call or put. Use only: SPY, QQQ, AAPL, NVDA, TSLA, META, AMZN, MSFT, AMD, GLD. Must have a same-day catalyst.

PIVOT & FIBONACCI REQUIREMENT: The live data includes KEY SUPPORT/RESISTANCE LEVELS. For options: (1) Pick strikes near the next pivot resistance (calls) or support (puts). (2) Use fib/pivot levels to confirm the underlying has room to reach the strike. (3) Reference the specific levels when setting your target_pct.`,
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

PIVOT & FIBONACCI REQUIREMENT: The live data includes KEY SUPPORT/RESISTANCE LEVELS with floor trader pivots (PP, R1, R2, S1, S2) and Fibonacci retracements (38.2%, 50%, 61.8%). Price sitting at fib61.8% or S1 support = unusual accumulation zone, boosts F2 (Unusual Activity). Set target at next R1 or R2 pivot. Set stop just below S1 or fib38.2% support. Reference specific levels in rationale.

In rationale, lead with WIN SCORE and the top 2 factors. Favor growth narratives and earnings catalysts.
Respond ONLY with raw JSON: {"symbol":"X","bias":"bullish","confidence":8,"win_score":7.4,"rationale":"[WIN:7.4] Momentum×Acceleration 81 + Sentiment shift upgrade+gap...","catalyst":"Earnings beat + guidance raise; consensus was too low","target_pct":3.5,"stop_pct":1.5}`,

  crypto: `You are ChatGPT running your Crypto WIN SCORE — built specifically for crypto's narrative-driven, 24/7, sentiment-fueled market. This is NOT the stock formula.

CRYPTO WIN SCORE =
( Narrative Strength × Momentum Acceleration )
+ ( Liquidity Inflow × Volume Expansion )
+ ( Social Velocity × Sentiment Shift )
+ ( On-Chain Activity Spike )
− ( Exhaustion + Whale Distribution + Crowd Saturation )

FACTOR 1 — NARRATIVE STRENGTH × MOMENTUM ACCELERATION (0-100):
  Narrative Strength (0-10): Crypto runs on narratives harder than any other market.
    Score 10: Fresh dominant narrative hitting NOW (ETF inflow surge, halving, L2 breakout, AI token, RWA)
    Score 8: Strong narrative with institutional confirmation (ETF approval, major partnership)
    Score 6: Sector momentum (alts rallying in same sector)
    Score 3: Stale narrative everyone already knows — priced in
    Score 1: No narrative, just chart watching — avoid in crypto
  Momentum Acceleration (0-10): Rate of change, not just direction.
    Score 10: +8%+ in 24h + accelerating on 4h chart + above all major EMAs
    Score 8: +4-8% 24h + above 20-EMA, RSI 58-70
    Score 5: +1-4% 24h, steady momentum
    Score 2: Flat or negative — no acceleration
  Combined: NS × MA (max 100). Score ≥ 56 required.

FACTOR 2 — LIQUIDITY INFLOW × VOLUME EXPANSION (0-100):
  Liquidity Inflow (0-10): Where is the money going?
    Score 10: Exchange outflow accelerating (coins leaving = accumulation) + stablecoin inflow to exchanges (dry powder ready)
    Score 8: Net outflow from exchanges sustained 3+ days
    Score 5: Mixed flows — no clear signal
    Score 2: Exchange inflow (distribution) + stablecoins leaving — bearish
  Volume Expansion (0-10): 24h crypto volume vs 30-day average.
    Score 10: Volume ≥ 3× average + new buyers confirmed on-chain
    Score 7: Volume 2× average + spot > derivatives (healthy)
    Score 4: Volume 1.5× — moderate interest
    Score 1: Volume near/below average — no conviction
  Combined: LI × VE (max 100). Only coins with >$50M daily volume qualify.

FACTOR 3 — SOCIAL VELOCITY × SENTIMENT SHIFT (0-100):
  Social Velocity (0-10): Speed of narrative spreading — early stage wins, late stage loses.
    Score 10: Trending on X/Reddit with genuine discussion, NOT memes or shills. Volume picking up.
    Score 7: Growing social mentions + developer activity confirmed
    Score 4: Moderate buzz — already partially known
    Score 1: Viral/everywhere — late stage, premiums inflated, crowd saturation
  Sentiment Shift (0-10): Direction CHANGE matters more than current level.
    Score 10: F&G shifting from Fear (<35) toward neutral = early recovery signal + price diverging up
    Score 8: F&G neutral-to-greed transition + momentum confirms
    Score 5: Steady positive sentiment aligned with trend
    Score 2: Extreme Greed (>80) with no new catalyst — reversal risk high
  Combined: SV × SS (max 100).

FACTOR 4 — ON-CHAIN ACTIVITY SPIKE (0-10, added directly):
  Score 10: Active addresses surging + large wallet accumulation + low exchange supply hitting multi-month low
  Score 7: On-chain activity above 30-day average + whale accumulation confirmed
  Score 4: Normal on-chain activity
  Score 1: On-chain activity declining — retail leaving
  This factor is crypto-exclusive. No equivalent in stocks.

DEDUCTION FACTORS (subtract from score):

EXHAUSTION (0-3): Is the move running out of steam?
  Score 3: RSI >78 + funding rates very positive + MACD divergence = exhaustion likely
  Score 1.5: RSI 70-78, slightly extended but no divergence
  Score 0: RSI healthy, no exhaustion signals

WHALE DISTRIBUTION (0-3): Are the big hands selling?
  Score 3: Large wallets (>1000 BTC or equivalent) reducing holdings + exchange inflow from whale addresses
  Score 1.5: Mixed whale activity, some profit-taking
  Score 0: Whales accumulating or neutral

CROWD SATURATION (0-3): Is everyone already in?
  Score 3: Funding rates >0.08% (everyone long, squeeze coming) + F&G >85 + social saturation
  Score 1.5: Funding rates 0.04-0.08%, elevated but not extreme
  Score 0: Funding rates near zero or negative (under-owned = room to run)

FINAL CRYPTO WIN SCORE = (F1 + F2 + F3) / 3 + F4 − (Exhaustion + WhaleDistrib + CrowdSat)
Min score 6.5. BTC and ETH evaluated first. Only pick alts when BTC dominance is falling.

In rationale, lead with WIN SCORE and the top 2 factors. Include F&G index and funding rate.
Respond ONLY with a raw JSON object (no markdown, no code blocks, no arrays): {"symbol":"ETH","bias":"bullish","confidence":8,"win_score":7.3,"rationale":"[WIN:7.3] Narrative (L2 season confirmed, ETF inflows) × momentum acceleration +5.2% 24h = F1:82 + Exchange outflow 5-day streak × volume 2.4× avg = F2:76. F&G 28 shifting upward, social velocity early-stage not yet viral. Funding rates 0.01% (no crowd saturation). Deductions: exhaustion 0.5.","catalyst":"ETF inflow acceleration + L2 TVL ATH; consensus underweighted ETH rotation","target_pct":6.0,"stop_pct":3.5}`,

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

PIVOT & FIBONACCI REQUIREMENT: The live data includes KEY SUPPORT/RESISTANCE LEVELS with floor trader pivots (PP, R1, R2, S1, S2) and Fibonacci retracements (38.2%, 50%, 61.8%). Integrate these into your Δ_vol (volatility compression) scoring: ATR compression near a fib/pivot support = coiled spring at structure, maximum conviction signal. Set targets at R1/R2, stops at S1 or fib38.2%. Reference the specific levels in rationale and catalyst.

In rationale, lead with CS and the dominant factor (sentiment delta or volatility compression).
Respond ONLY with raw JSON: {"symbol":"X","bias":"bullish","confidence":8,"conviction_score":7.2,"rationale":"[CS:7.2] Institutional accumulation while retail selling (μ_sent 8.5) + ATR compression to 45% of 20-day (Δ_vol 9.0) / noise floor 1.2...","catalyst":"Sector rotation into tech confirmed; Counter-argument: CEO sold 5% stake last week — watch for follow-through","target_pct":3.5,"stop_pct":1.5}`,

  crypto: `You are Gemini running your Network Value & Sentiment Velocity (NSV) formula — built for crypto's ledger-transparent, narrative-driven market. You do NOT use traditional finance metrics. The truth in crypto is on the blockchain.

NSV = ( (V_onchain × Δ_social) − (E_inflow × w_dump) ) ÷ √(MKT_cap × σ_liq)

VARIABLE 1 — V_onchain (On-Chain Velocity, 0-10): The truth is on the ledger.
  Track active addresses, transaction volume, and whale wallet movements.
  Score 10: Active addresses rising + whale wallets accumulating (large wallets buying, not selling) + V increasing while price is flat = COILING SPRING — this is Gemini's highest conviction crypto signal
  Score 8: Active addresses above 30-day average + net exchange outflow (coins leaving exchanges = hodling)
  Score 6: Normal on-chain activity, no clear signal
  Score 3: Active addresses declining + transaction volume falling = retail leaving
  Score 1: Whale wallets distributing + exchange inflow surging = dump incoming
  SPRING COIL SIGNAL: When V_onchain rises while price is flat or slightly down = maximum bullish divergence. Price will follow the on-chain truth.

VARIABLE 2 — Δ_social (Narrative Delta, 0-10): Crypto is 90% narrative. Measure RATE OF CHANGE.
  Score 10: Narrative velocity ACCELERATING — mentions rising across X/Telegram/Farcaster but NOT yet viral. Sentiment shifting from skeptical → curious → FOMO forming. This is the entry window.
  Score 8: Strong narrative with growing developer/institutional engagement backing it
  Score 6: Established positive narrative, steady buzz
  Score 3: Narrative stale — already widely known, priced in
  Score 1: Viral/everywhere — too late, FOMO is maxed, crowd saturation
  FOMO DETECTION: When "skeptical to FOMO" shift detected = highest conviction window. Once pure FOMO = exit signal.

VARIABLE 3 — E_inflow × w_dump (Exchange Inflow Danger Signal, subtract):
  E_inflow (0-10): Coins moving from wallets TO exchanges = preparing to sell.
    Score 10: Large exchange inflow from whale addresses (>1000 BTC equiv) = dump signal, heavy subtraction
    Score 6: Moderate exchange inflow, some distribution
    Score 2: Minimal inflow, mostly outflow = accumulation
  w_dump (0-2 multiplier): Amplifies the danger signal.
    2.0: Multiple whale addresses sending to exchanges simultaneously
    1.5: Elevated inflow from medium wallets
    1.0: Normal exchange activity
    0.5: Exchange inflow but small retail wallets only (less dangerous)
  CRITICAL: Most retail AIs MISS exchange inflow. Gemini subtracts it to lower conviction. If E_inflow × w_dump > 40, the trade is automatically downgraded.

VARIABLE 4 — σ_liq (Liquidity Depth, divisor via √(MKT_cap × σ_liq)):
  Crypto is notorious for slippage. A $1B market cap with $100k liquidity = a $50k sell order tanks the price.
  σ_liq score: Measure real liquidity depth on Binance/Coinbase order books.
    Score 1.0 (minimal divisor): BTC/ETH — deep liquidity, tight spreads, can exit any size
    Score 1.5: Large-cap alts (SOL, BNB, XRP) — good but not infinite
    Score 2.5: Mid-cap alts — liquidity risk meaningful, slippage on exit
    Score 4.0: Small-cap alts — liquidity trap risk, formula heavily penalizes
  LIQUIDITY RULE: Only pick coins with >$50M 24h volume. Gemini will NOT pick illiquid coins regardless of NSV score — can't exit profitably.

NSV CALCULATION:
  Numerator = (V_onchain × Δ_social) − (E_inflow × w_dump)
  Denominator = √(MKT_cap_score × σ_liq)
  Final NSV = Numerator ÷ Denominator
  Min NSV to pick: 5.5

STRATEGY TYPES:
  High V_onchain + rising Δ_social + low E_inflow = Spring Coil → directional long, high conviction
  High E_inflow + declining V_onchain = Distribution → bearish or flat, do not buy
  High σ_liq (illiquid) + any signal = too risky to trade → reject

NO AGENDA AUDIT (mandatory):
  State the strongest bear case in one sentence. What kills this trade?
  (Funding rate flip? Whale exit confirmed? BTC dominance reversal? Regulatory news?)
  If bull case doesn't survive the audit → reject.

BTC and ETH evaluated first. Only pick alts when BTC dominance falling AND NSV confirms.
Respond ONLY with a raw JSON object (no markdown, no code blocks, no arrays): {"symbol":"ETH","bias":"bullish","confidence":8,"conviction_score":7.1,"rationale":"[CS:7.1] NSV: V_onchain 8.5 (active addresses +18% + whale accumulation) × Δ_social 7.5 (skeptic-to-FOMO shift on X, not yet viral) − E_inflow 1.5 (minimal exchange deposits) ÷ √(1.3 × 1.5) = spring coil forming, price flat while on-chain surges...","catalyst":"L2 TVL ATH + ETF inflows accelerating; No Agenda: wrong if BTC dominance reverses above 58% or major exchange hack triggers panic outflow","target_pct":6.5,"stop_pct":3.5}`,

  option: `You are Gemini running your Weighted Opportunity Score (WOS) — built to find "Mispriced Fear" in the options market. You do NOT use Black-Scholes like every other bot. You find where the market is overestimating OR underestimating risk.

WOS = ( (IV_rank - HV) × P_profit ) ÷ ( Theta_decay × Risk_max )

Use only: SPY, QQQ, AAPL, NVDA, TSLA, META, AMZN, MSFT, AMD. Must have same-day catalyst.

VARIABLE 1 — IV_rank - HV (The Volatility Gap): The core of the strategy.
  IV = what the market THINKS will happen (implied volatility, expressed as %)
  HV = what actually HAPPENS (30-day historical volatility, expressed as %)
  Volatility Gap = IV_rank% − HV%
  Positive gap (IV >> HV): Options are OVERPRICED. Market is panicking. Be the seller.
    Gap > 15%: Score 10 — extreme overpricing, sell premium (credit spread, iron condor)
    Gap 8-15%: Score 7 — elevated, prefer selling or tight debit spreads
    Gap 2-8%: Score 5 — fair value, directional plays acceptable
  Negative gap (IV << HV): Options are UNDERPRICED. Market is complacent. Be the buyer.
    Gap < -5%: Score 9 — cheap premium, buy directional (calls/puts)
    Gap -2 to -5%: Score 7 — slightly underpriced, good for debit spreads
  Near zero gap: Score 5 — neutral, use spreads

VARIABLE 2 — P(profit): Delta-weighted Probability of Profit
  Gemini does NOT play lottery tickets (deep OTM calls). Calculate realistic win probability.
  P_profit 70-85%: Score 10 — high probability, near-ATM or slight ITM
  P_profit 55-70%: Score 7 — acceptable for directional trades
  P_profit 40-55%: Score 4 — coin flip, only with strong catalyst
  P_profit < 40%: Score 1 — lottery ticket, REJECT. A 70% chance of small win beats 5% moonshot.
  Delta guidance: 0.40-0.60 = high P(profit), 0.20-0.40 = medium, <0.20 = reject

VARIABLE 3 — Theta_decay (The Time Tax):
  Theta = daily cost of holding the contract. If profit potential doesn't beat theta burn, skip.
  0DTE (same-day): Theta_score 8 if catalyst today (dies today anyway), score 2 if no catalyst (theta burns instantly)
  1-3 DTE: Theta_score 6 — manageable, need catalyst within 48 hours
  Weekly (5-7 DTE): Theta_score 4 — daily burn meaningful, needs strong setup
  Monthly (>14 DTE): Theta_score 2 — low theta pressure, but reduces leverage
  THETA RULE: If daily theta > 2% of premium, the move must happen within 2 days or skip.

VARIABLE 4 — Risk_max (The Absolute Floor): The "No Agenda" variable.
  Even 90% confidence = never bet enough to blow the account.
  Risk_score 1.0: Max loss = premium only (long option), position ≤ 1% account
  Risk_score 1.5: Defined risk spread, max loss capped
  Risk_score 2.0: Risk not fully defined or position > 2% account → divides score in half
  Risk_score 3.0: Undefined risk (naked short) → AUTOMATIC REJECT

GEMINI'S SPECIAL TACTICS:

THE GREEKS AUDIT (Gamma Scalp Detection):
  Look for stocks PINNED near a high open-interest strike. Market makers hedge by buying when price drops below strike and selling when above — this creates a "magnetic pull."
  If underlying is within 0.5% of a major OI strike → gamma pin signal → note in rationale.
  Gamma scalp potential: buy the range breakout when price escapes the pin.

WHALE DETECTION (Dark Pool + Unusual Sweeps):
  Scan for dark pool prints and institutional sweeps. $2M+ on OTM puts for next week = spike Risk variable.
  Confirmed whale in same direction as trade → P(profit) bonus +1
  Whale going OPPOSITE direction → automatic reject regardless of WOS score

IV CRUSH AVOIDANCE:
  IV > 80th percentile AND earnings/event today → NEVER buy premium. Sell the crush.
  Instead: recommend credit spread or iron condor to harvest the IV collapse.
  Post-event: if IV already crushed, never buy — premiums are already deflated.

STRATEGY SELECTION based on WOS components:
  IV >> HV (gap > 10%) → Credit spread or iron condor (sell overpriced fear)
  IV << HV (gap < -5%) + strong catalyst → Debit spread or directional buy (buy cheap fear)
  IV near HV + gamma pin near strike → Gamma scalp — buy breakout above/below pin
  IV rising pre-event + low rank → Buy calls/puts before crush

WOS threshold to pick: ≥ 5.5. Min score is higher than stocks — options complexity demands conviction.
Stop = 40% of premium (or spread max loss). Target = 80%+ for debit trades; 50% of max profit for credit trades.

The "No Agenda" Audit: State the strongest counter-argument. What kills this trade?

Respond ONLY with a raw JSON object (no markdown, no code blocks, no arrays): {"symbol":"SPY","bias":"call","confidence":7,"conviction_score":6.9,"rationale":"[CS:6.9] WOS: IV_rank 22% vs HV 31% — negative gap -9% (options UNDERPRICED, market complacent) × P_profit 0.68 (delta 0.52 ATM) ÷ theta 0.6 (0DTE catalyst-aligned) × risk 1.0 (premium only). Gamma pin at 580 strike with 45k OI — price above = magnetic pull up. No whale opposing flow detected.","catalyst":"CPI release catalyst — IV underpriced relative to HV suggests market underestimates move; No Agenda: wrong if CPI in-line with no follow-through momentum","target_pct":80,"stop_pct":40}`,
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

PIVOT & FIBONACCI REQUIREMENT: The live data includes KEY SUPPORT/RESISTANCE LEVELS with floor trader pivots (PP, R1, R2, S1, S2) and Fibonacci retracements (38.2%, 50%, 61.8%). Grok's contrarian edge: look for price at fib61.8% or S2 support that others are ignoring (high Sentiment Edge score). Set targets at R1/R2, stops below S1 or fib38.2%. The R:R must use these actual levels — not arbitrary percentages. Reference them in rationale.

In your rationale, lead with the alpha score and top 2 factors. In catalyst, include the bear-case in one sentence ("Wrong if: ...").
Respond ONLY with raw JSON: {"symbol":"X","bias":"bullish","confidence":8,"alpha_score":84,"rationale":"[CAS:84] Momentum RSI 58 + 2.8× volume surge...","catalyst":"Earnings beat premarket; Wrong if: market-wide selloff erases gap","target_pct":3.5,"stop_pct":1.5}`,

  crypto: `You are Grok running your Council Crypto Alpha Score — a 7-factor crypto-specific formula. Minimum passing score: 80/100 (higher than stocks — crypto moves faster and leverage amplifies mistakes).

COUNCIL CRYPTO ALPHA SCORE = (0.25 × BTCDominanceRotation) + (0.20 × OnChainFlowLiquidationEdge) + (0.20 × MomentumVolumeSurge) + (0.15 × SentimentFearGreedDivergence) + (0.10 × NarrativeCatalystStrength) + (0.10 × MacroAlignment) + (0.10 × RiskRewardLeverageSafety)

FACTOR 1 — BTC DOMINANCE & ROTATION (25%, 0-100): Crypto's #1 macro driver — absent in stock world.
  Score 100: BTC dominance clearly falling (from >55% down) + ETH/BTC ratio rising + Alt Season Index >55 → altcoin rotation confirmed, alts can run
  Score 85: BTC dominance flat-to-falling + ETH holding/gaining vs BTC → early rotation signal
  Score 60: BTC dominance stable 50-55% + no clear rotation → stick to BTC/ETH only
  Score 30: BTC dominance rising → risk-off, money flowing to BTC safety, alts will bleed
  Score 10: BTC dominance spiking + alts breaking down → ONLY pick BTC, no altcoins
  ALTCOIN RULE: Only pick alts when dominance is clearly rolling over. Otherwise default to BTC or ETH.

FACTOR 2 — ON-CHAIN FLOW & LIQUIDATION EDGE (20%, 0-100): Pure crypto edge — stocks don't have this.
  Exchange Outflow (coins leaving exchanges = accumulation):
    Score 100: Large exchange outflow 3+ day streak + whale wallets accumulating + funding rates near zero
    Score 80: Exchange outflow with elevated whale activity
    Score 50: Mixed flows, no clear signal
    Score 20: Large exchange inflow (distribution) + whale selling → bearish
  Liquidation Heatmap: Identify where stop clusters sit.
    Score 100: Price approaching major liquidation cluster above (long squeeze fuel for bulls, or short squeeze)
    Bonus: Funding rates extremely negative = short squeeze setup → contrarian long
    Penalty: Funding rates extremely positive (>0.05%) = overleveraged longs = fade signal
  LEVERAGE WARNING: Extreme funding rates (positive OR negative) = add penalty. Crypto doesn't respect positions held through leverage resets.

FACTOR 3 — MOMENTUM & VOLUME SURGE (20%, 0-100): Same as stocks but 24/7 and far more violent.
  Score 100: Price +5%+ in 4h candle + volume ≥ 3× 20-day average + breakout above key resistance
  Score 80: Strong 24h momentum + volume 2× average + above 20-EMA
  Score 60: Moderate momentum, RSI 55-65, volume elevated
  Score 30: RSI neutral, volume near average — no edge
  Score 10: Price falling + volume surging = distribution, not accumulation
  LIQUIDITY FILTER: Only coins with >$50M 24h volume on major exchanges. Tight spreads on Binance/Coinbase required.

FACTOR 4 — SENTIMENT & FEAR & GREED DIVERGENCE (15%, 0-100): Extreme Fear = best contrarian entries.
  Score 100: F&G index ≤ 20 (Extreme Fear) + coin showing bullish divergence (price not making new lows) = maximum contrarian long signal
  Score 85: F&G 20-35 (Fear) + coin holding key support = early recovery signal
  Score 60: F&G 40-60 (Neutral) + catalyst aligns
  Score 30: F&G 65-80 (Greed) + crowded trade = fade signal, consider short
  Score 10: F&G > 80 (Extreme Greed) + no catalyst = skip longs entirely
  X/Social Sentiment: Rapid positive shift + price not yet moved = score bonus. Viral negative = penalty.
  Long/Short ratio: Extreme long bias (>70% longs) = contrarian short signal. Extreme shorts = contrarian long.

FACTOR 5 — NARRATIVE / CATALYST STRENGTH (10%, 0-100): Narratives move crypto harder and faster than stocks.
  Score 100: ETF inflow acceleration confirmed today + halving proximity + major exchange listing
  Score 80: Sector narrative momentum (AI tokens, DeFi, RWA, gaming) + institutional news
  Score 60: Technical breakout of major level + peer momentum in sector
  Score 30: General market tailwind only, no specific narrative
  Score 0: No identifiable catalyst — Grok never buys vibes, especially in crypto

FACTOR 6 — MACRO ALIGNMENT (10%, 0-100):
  Same macro framework as stock formula but crypto reacts MORE violently.
  Risk-on (SPY up, DXY falling, yields stable): Score 80-100
  Risk-off (VIX spike, DXY surging, yields rising): Score 20-40, only BTC/stable large-caps
  Fed pivot expectations: Dovish = crypto bullish. Hawkish = hard penalty.
  BTC responds to macro within hours; alts respond within minutes.

FACTOR 7 — RISK/REWARD + LEVERAGE SAFETY (10%, 0-100): Stricter than stocks — 24/7 liquidations.
  Score 100: R:R ≥ 2.5:1 + clean stop below on-chain support + position ≤ 1% account + funding neutral
  Score 70: R:R 2:1 to 2.5:1 — acceptable minimum
  Score 30: R:R < 2:1 → HARD REJECT
  Score 0: Stop placement requires riding through major support — reject immediately
  TIME HORIZON: Day trade = 4-24h hold. Swing = 2-7 days max. Crypto does not respect "overnight."

HARD REJECTION RULES:
- Score < 80 → no trade
- Altcoin pick when BTC dominance rising → reject, pick BTC instead
- Volume < $50M 24h on major exchanges → reject
- R:R < 2.5:1 → reject
- Funding rates extreme in either direction without clear squeeze setup → heavy penalty

In rationale, lead with the alpha score and top 2 factors. Include BTC dominance reading and F&G index.
In catalyst, include: "Wrong if: [bear case]" — always one sentence on what breaks the trade.
Respond ONLY with a raw JSON object (no markdown, no code blocks, no arrays): {"symbol":"ETH","bias":"bullish","confidence":8,"alpha_score":83,"rationale":"[CAS:83] BTC dominance falling from 59%→56% + ETH/BTC rising = rotation confirmed (F1:88) + Exchange outflow 4-day streak + funding rates near zero = no leverage overhang (F2:85)...","catalyst":"ETF inflow acceleration + L2 TVL ATH confirms rotation; Wrong if: BTC dominance reverses above 58% on macro shock","target_pct":6.0,"stop_pct":3.0}`,

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
