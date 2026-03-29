'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserReport {
  id: string
  name: string
  description: string | null
  prompt: string
  category: string
  created_at: string
}

interface PredefinedReport {
  id: string
  name: string
  category: string
  description: string
  prompt: string
}

// ── Predefined reports ────────────────────────────────────────────────────────

const PREDEFINED_REPORTS: PredefinedReport[] = [
  // MARKET INTELLIGENCE
  {
    id: 'weekly-market-recap',
    name: 'Weekly Market Recap',
    category: 'Market Intelligence',
    description: 'Full week summary — what moved, what changed, key setups going into next week',
    prompt: `Generate a comprehensive weekly market recap.

## WEEKLY MARKET RECAP — Week of [Date]

**1. INDEX PERFORMANCE**
Table: Index | Week Change % | Key level held or broken. Cover SPY, QQQ, DIA, IWM.

**2. SECTOR SCORECARD**
Which sectors led and lagged this week? 1 sentence on what the rotation pattern signals.

**3. THE 3 BIGGEST STORIES**
Three things that defined this week's market action. Each: what happened, why it mattered, what changed.

**4. WHAT BROKE DOWN & WHAT HELD UP**
Key technical levels — which broke, which held? Any notable trend changes?

**5. SETUP GOING INTO NEXT WEEK**
Market posture (bullish/cautious/bearish), 3 key things to watch, and the one catalyst that could change everything.

Under 400 words. Data first.`,
  },
  {
    id: 'earnings-season-preview',
    name: 'Earnings Season Preview',
    category: 'Market Intelligence',
    description: 'Upcoming earnings, expected moves, which reports matter most this cycle',
    prompt: `Generate an earnings season preview report.

## EARNINGS SEASON PREVIEW

**1. EARNINGS SEASON CONTEXT**
Where are we in the earnings season? Early, peak, or wind-down? What is the consensus expectation for S&P 500 EPS growth?

**2. MARQUEE REPORTS THIS WEEK**
Top 5 most market-moving earnings reports coming. For each: company, sector, consensus EPS estimate, what the street is watching, options-implied expected move %.

**3. SECTOR EARNINGS THEMES**
Which sectors are expected to report strong / weak earnings? What macro factors are driving sector-level results?

**4. KEY RISK EVENTS**
Earnings that could cause outsized market moves — companies with high short interest, high valuations, or macro sensitivity.

**5. TRADING EARNINGS — WHAT TO KNOW**
Current IV environment for earnings plays. Are options cheap or expensive vs. historical? Best strategy type for this vol environment.

**BOTTOM LINE:** One sentence on the overall earnings season tone.

Under 400 words.`,
  },
  {
    id: 'fed-watch-report',
    name: 'Fed Watch & Rate Outlook',
    category: 'Market Intelligence',
    description: 'Fed trajectory, what markets are pricing in, rate path and implications',
    prompt: `Generate a Fed Watch and interest rate outlook report.

## FED WATCH REPORT — [Date]

**1. CURRENT RATE SNAPSHOT**
Fed Funds Rate (from live data), 2Y yield, 10Y yield, spread. Is the curve normal, flat, or inverted?

**2. WHAT MARKETS ARE PRICING IN**
Based on yield curve shape and Fed Funds rate: is the market pricing in cuts, hikes, or a hold? How many cuts/hikes in the next 12 months?

**3. FED LANGUAGE TRACKER**
What has recent Fed communication emphasized — inflation, employment, financial stability? Hawkish or dovish lean?

**4. RATE IMPACT BY ASSET CLASS**
At current rates: tailwind or headwind for equities / bonds / real estate / crypto? 1 sentence each.

**5. RATE SCENARIO ANALYSIS**
- If rates stay here: market implication
- If rates cut 50bps: market implication
- If rates rise 25bps: market implication

**OUTLOOK:** Most likely path and what changes it.

Under 350 words.`,
  },
  {
    id: 'credit-market-health',
    name: 'Credit Market Health',
    category: 'Market Intelligence',
    description: 'High yield spreads, investment grade conditions, where credit stress is building',
    prompt: `Generate a credit market health report.

## CREDIT MARKET HEALTH REPORT — [Date]

**1. CREDIT SPREAD SNAPSHOT**
High yield (junk) spread vs. investment grade spread context. Are spreads wide, normal, or compressed? Direction of change.

**2. STRESS SIGNALS**
Are credit markets signaling stress that equity markets are ignoring? Any divergence between stocks and credit?

**3. RATE SENSITIVITY**
At current Fed Funds and 10Y yield levels: which borrowers (corporate, government, consumer) are most under pressure?

**4. DEFAULTS & DISTRESS**
Any notable sectors or companies showing credit deterioration? Leveraged loan market conditions.

**5. CREDIT AS A LEADING INDICATOR**
Credit historically leads equities by 3-6 months. What is credit signaling today about equity market conditions 1-2 quarters ahead?

**VERDICT:** Credit health: Strong / Stable / Showing cracks / Deteriorating — one sentence with key reason.

Under 300 words.`,
  },
  {
    id: 'global-markets-snapshot',
    name: 'Global Markets Snapshot',
    category: 'Market Intelligence',
    description: 'International markets, emerging markets, currency dynamics and cross-market signals',
    prompt: `Generate a global markets snapshot report.

## GLOBAL MARKETS SNAPSHOT — [Date]

**1. MAJOR MARKET PERFORMANCE**
Table: Region | Index | Week/Month Change | Trend. Cover: US (SPY), Europe (EFA), Japan (EWJ), China (FXI), Emerging Markets (EEM).

**2. CURRENCY DYNAMICS**
DXY direction and level. EUR/USD, JPY/USD context. What currency moves signal for global capital flows.

**3. US vs. INTERNATIONAL**
Is international outperforming or underperforming US equities? What drives the differential?

**4. EMERGING MARKET PULSE**
Are EM markets a risk-on or risk-off signal right now? Dollar strength/weakness impact on EM.

**5. GLOBAL CAPITAL FLOWS**
Where is institutional money flowing globally? Any notable country or region rotation underway?

**SIGNAL:** Is the global market backdrop supportive or challenging for US equities right now?

Under 350 words.`,
  },

  // POSITIONING & FLOW
  {
    id: 'short-interest-squeeze',
    name: 'Short Interest & Squeeze Report',
    category: 'Positioning & Flow',
    description: 'Most shorted stocks, squeeze candidates, short interest changes',
    prompt: `Generate a short interest and squeeze opportunity report.

## SHORT INTEREST & SQUEEZE REPORT — [Date]

**1. MARKET-WIDE SHORT INTEREST**
Is overall short interest elevated, normal, or low? Rising or falling trend? What does aggregate short interest signal about institutional sentiment?

**2. SQUEEZE CONDITIONS CHECKLIST**
For a short squeeze to work: short interest > 20%, days-to-cover > 5, positive price catalyst, rising volume. What is the current market environment for squeezes — favorable or not?

**3. HIGH SHORT INTEREST SECTORS**
Which sectors currently have elevated short interest? What macro or fundamental thesis are shorts making?

**4. SQUEEZE SETUP FRAMEWORK**
Key factors to evaluate any squeeze candidate: short float %, days to cover, recent insider buying, catalyst timeline, option open interest.

**5. CONTRARIAN VIEW**
For every potential squeeze: what does the short thesis actually say? Sometimes the shorts are right — how to distinguish a squeeze opportunity from a value trap.

**BOTTOM LINE:** Current short squeeze environment: Hot / Moderate / Cold — and why.

Under 350 words.`,
  },
  {
    id: 'options-flow-digest',
    name: 'Options Flow Digest',
    category: 'Positioning & Flow',
    description: 'Unusual options activity summary, smart money positioning, key flow signals',
    prompt: `Generate an options flow digest report.

## OPTIONS FLOW DIGEST — [Date]

**1. OVERALL FLOW TONE**
Put/call ratio context — elevated fear, neutral, or complacency? Is overall options flow bullish or bearish vs. last week?

**2. UNUSUAL ACTIVITY THEMES**
What sectors or asset types are seeing the most unusual options activity? Large block trades, notable strikes, unusual expirations — what do the patterns suggest about institutional positioning?

**3. VIX & VOL SURFACE**
VIX level and 30-day change. Is vol term structure in contango (normal) or backwardation (stress)? What does the skew say about downside demand?

**4. SMART MONEY TELLS**
Institutional options activity often precedes moves. What are the large players positioning for based on options flow this week?

**5. STRATEGY IMPLICATIONS**
Given current options flow and vol environment: what strategies have edge? What should retail traders avoid?

**FLOW VERDICT:** Net options flow signal: Bullish / Neutral / Bearish — one sentence.

Under 350 words.`,
  },

  // PORTFOLIO & STRATEGY
  {
    id: 'portfolio-stress-test',
    name: 'Portfolio Stress Test',
    category: 'Portfolio & Strategy',
    description: 'How a diversified portfolio holds up in bear, crash, and stagflation scenarios',
    prompt: `Generate a portfolio stress test report for a diversified US investor.

## PORTFOLIO STRESS TEST — [Date]

Stress test a standard diversified portfolio (60% equities / 30% bonds / 10% alternatives) against three scenarios. Use current market data where available.

**SCENARIO 1: GROWTH SLOWDOWN (-20% equities)**
- Trigger: GDP contraction, earnings miss cycle, consumer slowdown
- Impact on: equities, bonds, real estate, gold, cash
- How to reduce exposure: what to trim, what to add

**SCENARIO 2: INFLATION SHOCK (rates spike 150bps)**
- Trigger: CPI re-acceleration, Fed forced to hike, bond selloff
- Impact on: growth stocks, value stocks, bonds, real assets, crypto
- How to hedge: TIPS, commodities, short duration

**SCENARIO 3: LIQUIDITY CRISIS (2008-style)**
- Trigger: credit event, banking stress, forced deleveraging
- Impact on: all risk assets, correlation breakdown, safe havens
- What actually works: cash, T-bills, inverse ETFs

**CURRENT RISK ASSESSMENT**
Based on today's macro data (yields, VIX, credit conditions): which scenario is most probable right now and what probability?

**STRESS TEST VERDICT:** Portfolio resilience: Strong / Adequate / Needs hedging — with one specific action.

Under 400 words.`,
  },
  {
    id: 'weekly-trading-plan',
    name: 'Weekly Trading Plan',
    category: 'Portfolio & Strategy',
    description: 'Structured week-ahead plan with key levels, biases, and trade setups to watch',
    prompt: `Generate a structured weekly trading plan for the week ahead.

## WEEKLY TRADING PLAN — Week of [Date]

**1. MARKET BIAS THIS WEEK**
Overall bias: Bullish / Cautious / Bearish + one factual sentence. The key level that confirms or invalidates this bias.

**2. KEY LEVELS TO WATCH**
Table: Instrument | Key Support | Key Resistance | Bias. Cover SPY, QQQ, and Bitcoin minimum.

**3. MACRO EVENTS THIS WEEK**
Calendar of high-impact events (Fed speakers, economic data, major earnings). For each: expected outcome and market impact if it surprises.

**4. SECTOR FOCUS**
1-2 sectors that offer the best risk/reward this week based on current rotation. Why them, why now.

**5. TRADE MANAGEMENT RULES FOR THIS WEEK**
Based on current VIX and market regime: recommended position size (full/half/quarter), stop placement approach, hold duration (day trade / swing / longer term).

**6. WHAT TO AVOID THIS WEEK**
Specific setups, sectors, or conditions to stay away from given the current environment.

**WEEK AHEAD RATING:** Favorable / Neutral / Challenging — for active traders.

Under 400 words.`,
  },
  {
    id: 'breakout-watchlist',
    name: 'Breakout Watchlist',
    category: 'Portfolio & Strategy',
    description: 'Stocks and ETFs setting up at key technical levels for potential breakouts',
    prompt: `Generate a breakout watchlist report.

## BREAKOUT WATCHLIST — [Date]

**1. MARKET CONDITIONS FOR BREAKOUTS**
Are current conditions favorable for breakout trades? Cover: VIX level, trend direction, volume environment. Favorable / Mixed / Unfavorable.

**2. BREAKOUT FRAMEWORK**
What makes a high-probability breakout: 3+ weeks of consolidation, volume on breakout day > 1.5x average, clear resistance level, catalyst or sector leadership. Apply this to all names below.

**3. STOCKS SETTING UP (3-5 names)**
For each candidate:
- Name & Ticker
- The setup: what pattern, what resistance level, consolidation duration
- Entry trigger: exact price where the breakout confirms
- Invalidation: level where setup fails
- Potential target: measured move or next resistance

**4. ETF BREAKOUTS**
1-2 sector or thematic ETFs showing breakout setups. Sector momentum plays.

**5. BREAKOUT TIMING**
What catalysts this week could trigger moves? Earnings, sector data, macro events aligned with these setups?

**SETUP QUALITY RATING:** Hot / Moderate / Thin — for breakout opportunities this week.

Under 400 words.`,
  },
  {
    id: 'growth-vs-value',
    name: 'Growth vs Value Rotation',
    category: 'Portfolio & Strategy',
    description: 'Where institutional money is rotating — growth or value — and how to position',
    prompt: `Generate a growth vs value rotation report.

## GROWTH VS VALUE ROTATION REPORT — [Date]

**1. CURRENT ROTATION SNAPSHOT**
Is money flowing into growth (QQQ, tech, high-multiple stocks) or value (IVE, financials, energy, low-multiple stocks)? Week-over-week and month-over-month direction.

**2. RATE DRIVER**
At current 10Y yield (from live data): does the interest rate environment favor growth or value? (High rates = value; low rates = growth — explain current implication.)

**3. ECONOMIC CYCLE POSITION**
Where are we in the business cycle (early/mid/late)? Which historically outperforms at this stage: growth or value?

**4. SECTOR IMPLICATIONS**
Growth favored: tech, biotech, cloud, consumer discretionary
Value favored: financials, energy, industrials, utilities
Which is outperforming right now and why?

**5. POSITIONING RECOMMENDATION**
Based on rates, cycle, and current rotation momentum: where should a diversified investor be leaning right now? Specific sector tilt recommendation.

**ROTATION SIGNAL:** Growth | Value | Balanced — one sentence with the primary driver.

Under 350 words.`,
  },
  {
    id: 'sector-deep-dive',
    name: 'Sector Deep Dive',
    category: 'Portfolio & Strategy',
    description: 'Comprehensive analysis of a single sector — fundamentals, technicals, outlook',
    prompt: `I want a deep dive on the sector I specify. Please ask me which sector to analyze, then generate this report:

## [SECTOR NAME] SECTOR DEEP DIVE — [Date]

**1. SECTOR SNAPSHOT**
Key ETF performance (1 week, 1 month, 3 month). Trend: above or below 50/200-day MA?

**2. MACRO DRIVERS**
What macro forces drive this sector — rates, dollar, oil, consumer, regulation? Current tailwinds and headwinds.

**3. EARNINGS PICTURE**
Sector EPS growth trend. Is the sector beating or missing estimates this cycle?

**4. TOP HOLDINGS ANALYSIS**
Top 3 names in the sector: current price trend, valuation context (cheap/fair/expensive), catalyst ahead.

**5. INSTITUTIONAL POSITIONING**
Is smart money adding or reducing exposure to this sector? Any notable 13F changes?

**6. TECHNICAL SETUP**
Key support/resistance for the sector ETF. Trend quality. Any notable chart patterns.

**SECTOR VERDICT:** Overweight / Marketweight / Underweight — one sentence with the primary reason.

Under 400 words.`,
  },

  // INCOME & MACRO
  {
    id: 'dividend-income-report',
    name: 'Dividend & Income Report',
    category: 'Income & Macro',
    description: 'Dividend payers, yield analysis, payout safety, income opportunities',
    prompt: `Generate a dividend and income investing report.

## DIVIDEND & INCOME REPORT — [Date]

**1. INCOME ENVIRONMENT**
At current Fed Funds and 10Y yield: is the dividend investing environment favorable or competitive with bonds? What yield is the S&P 500 offering vs. 2Y Treasury?

**2. DIVIDEND SAFETY SCREEN**
What makes a dividend safe right now: payout ratio < 60%, positive free cash flow, debt/equity < 1.5x, dividend growth history. Which sectors currently meet this screen?

**3. HIGH YIELD OPPORTUNITIES**
Sectors currently offering 3%+ dividend yield with reasonable safety: REITs, utilities, financials, energy. What are current yields and are they sustainable?

**4. DIVIDEND GROWTH PLAYS**
Companies growing dividends 10%+ annually — the compounding income approach. Which sectors are increasing dividends in the current environment?

**5. RISKS TO DIVIDEND INCOME**
Which sectors face dividend cut risk right now? Rising debt costs, falling earnings, or regulatory pressure on payouts.

**INCOME VERDICT:** Favorable / Neutral / Challenging — for dividend income investors right now.

Under 350 words.`,
  },
  {
    id: 'commodity-tracker',
    name: 'Commodity Tracker',
    category: 'Income & Macro',
    description: 'Oil, gold, silver, copper — what commodities are signaling about the economy',
    prompt: `Generate a commodity market tracker report.

## COMMODITY TRACKER — [Date]

**1. OIL (WTI/BRENT)**
Current price context. Supply/demand balance. OPEC posture. What oil price signals about global economic activity. Impact on energy sector and inflation.

**2. GOLD**
Current price and trend. Is gold performing its safe haven role? Gold vs. real rates relationship — is gold cheap or expensive given current rates? What gold is signaling.

**3. SILVER & COPPER**
Silver: monetary metal or industrial? Current setup vs. gold ratio.
Copper: the economic barometer — is copper signaling growth or contraction?

**4. AGRICULTURAL**
Wheat, corn, soy — any supply disruptions or price moves with inflation implications?

**5. COMMODITY MACRO SIGNAL**
Taken together, what are commodities signaling about: global growth / inflation / dollar strength / risk appetite?

**COMMODITY VERDICT:** Inflationary pressure / Deflationary signal / Neutral — one sentence with the key driver.

Under 350 words.`,
  },
  {
    id: 'dollar-currency-report',
    name: 'Dollar & Currency Report',
    category: 'Income & Macro',
    description: 'DXY deep dive, major currency pairs, impact on equities and crypto',
    prompt: `Generate a dollar and currency market report.

## DOLLAR & CURRENCY REPORT — [Date]

**1. DXY SNAPSHOT**
Current DXY level and context (strong >103, weak <99). Week/month direction. Is dollar strength accelerating, decelerating, or reversing?

**2. WHAT DRIVES THE DOLLAR NOW**
Fed rate differential vs. ECB/BOJ/BOE. US growth relative to global. Risk-on vs. risk-off flows. Which factor is dominant right now?

**3. MAJOR PAIRS**
EUR/USD, GBP/USD, USD/JPY — trend and key level for each. One sentence on what each pair signals.

**4. DOLLAR IMPACT MATRIX**
Strong dollar → headwind for: commodities, EM stocks, US multinationals, crypto
Weak dollar → tailwind for: commodities, international stocks, risk assets, crypto
Given current DXY direction: winners and losers right now.

**5. CURRENCY RISK FOR INVESTORS**
Should US investors hedge international exposure right now? What's the FX drag/tailwind on international holdings?

**DOLLAR SIGNAL:** Bullish USD / Neutral / Bearish USD — and what it means for risk assets.

Under 350 words.`,
  },
  {
    id: 'small-vs-large-cap',
    name: 'Small Cap vs Large Cap',
    category: 'Income & Macro',
    description: 'Russell 2000 vs S&P 500 rotation signal and what it means for positioning',
    prompt: `Generate a small cap vs large cap rotation report.

## SMALL CAP vs LARGE CAP REPORT — [Date]

**1. PERFORMANCE COMPARISON**
IWM (Russell 2000) vs. SPY (S&P 500): 1-week, 1-month, 3-month performance. Is small cap outperforming or underperforming?

**2. WHAT DRIVES SMALL CAP RELATIVE PERFORMANCE**
Key factors: domestic economic health, interest rates (small caps more rate sensitive), credit conditions, risk appetite. What does each factor say right now?

**3. RATE SENSITIVITY**
Small caps carry more debt at floating rates. At current Fed Funds rate: are small caps structurally disadvantaged vs. large caps?

**4. ECONOMIC CYCLE SIGNAL**
Small caps outperform in early cycle recoveries and underperform in late cycle / recession. Where in the cycle are we and what does that imply?

**5. POSITIONING IMPLICATION**
Should an investor overweight, underweight, or market weight small caps right now? Specific reasoning.

**ROTATION SIGNAL:** Small cap outperform / Neutral / Large cap outperform — one sentence with the key driver.

Under 350 words.`,
  },
]

// ── Category colors ───────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Market Intelligence': { bg: '#1e3a5f', text: '#7bb3e0' },
  'Positioning & Flow': { bg: '#3a1a5f', text: '#b07be0' },
  'Portfolio & Strategy': { bg: '#1a3a2f', text: '#7be0b0' },
  'Income & Macro': { bg: '#3a2a1a', text: '#e0b07b' },
  'Custom': { bg: '#2a2a2a', text: '#999999' },
}

function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS['Custom']
}

// ── Crypto predefined reports ─────────────────────────────────────────────────

const CRYPTO_PREDEFINED_REPORTS: PredefinedReport[] = [
  {
    id: 'weekly-crypto-recap',
    name: 'Weekly Crypto Recap',
    category: 'Market Overview',
    description: 'Full week in crypto — BTC/ETH performance, top movers, sentiment shift, what changed',
    prompt: `Generate a comprehensive weekly crypto market recap.

## WEEKLY CRYPTO RECAP — Week of [Date]

**1. BTC & ETH PERFORMANCE**
Table: Asset | Week Change % | Key level held or broken | Trend. Use live data if available.

**2. ALTCOIN SCORECARD**
Top 3 gainers and top 3 losers among major altcoins this week. 1 sentence on what the rotation pattern signals.

**3. THE 3 BIGGEST STORIES**
Three things that defined this week's crypto action. Each: what happened, why it mattered, what changed in the market.

**4. ON-CHAIN CHANGES**
What shifted in the on-chain data this week — exchange flows, whale activity, funding rates, any notable MVRV or sentiment change?

**5. SETUP GOING INTO NEXT WEEK**
Market posture (bullish/cautious/bearish), 3 key levels to watch on BTC and ETH, and the one catalyst that could change everything.

Under 400 words. Data first.`
  },
  {
    id: 'stablecoin-flow-report',
    name: 'Stablecoin Flow Report',
    category: 'On-Chain Intelligence',
    description: 'USDT/USDC supply changes, stablecoin dominance, what flows signal about buying power',
    prompt: `Generate a stablecoin flow analysis report.

## STABLECOIN FLOW REPORT — [Date]

**1. STABLECOIN SUPPLY SNAPSHOT**
Total stablecoin market cap context. USDT and USDC supply trend — growing, shrinking, or flat? What does supply growth signal about incoming buying power?

**2. STABLECOIN DOMINANCE**
Stablecoin dominance % of total crypto market cap. Rising = risk-off / falling = capital deploying into risk assets. Current direction and implication.

**3. EXCHANGE STABLECOIN RESERVES**
Are stablecoins accumulating on exchanges (buy pressure building) or leaving (already deployed)? What does the current level signal?

**4. MINTING & BURNING ACTIVITY**
Recent large USDT/USDC mints or burns. New mints = institutional money entering. Burns = capital exiting crypto.

**5. SIGNAL**
Stablecoin flow verdict: Bullish (dry powder accumulating) / Neutral / Bearish (capital leaving) — one sentence with the key data point.

Under 300 words.`
  },
  {
    id: 'whale-activity-report',
    name: 'Whale Activity Report',
    category: 'On-Chain Intelligence',
    description: 'Large wallet movements, exchange inflows/outflows, accumulation vs distribution signals',
    prompt: `Generate a whale activity and large wallet report.

## WHALE ACTIVITY REPORT — [Date]

**1. EXCHANGE FLOW SUMMARY**
Net BTC flow to/from exchanges over last 7 days. Large inflows = potential sell pressure. Large outflows = accumulation / self-custody. Current net direction.

**2. WHALE WALLET BEHAVIOR**
Wallets holding 1,000+ BTC — net accumulation or distribution recently? What are the largest cohorts doing?

**3. MINER ACTIVITY**
Are miners currently holding or selling? Miner reserves trend. Miner selling pressure = potential headwind; accumulation = confidence in price.

**4. LARGE TRANSACTION VOLUME**
Unusual large transactions (>$1M) on-chain — are they exchange deposits (bearish) or wallet-to-wallet (neutral/bullish)?

**5. SMART MONEY SIGNAL**
Based on whale and large wallet behavior: are sophisticated players accumulating, distributing, or neutral right now?

**WHALE VERDICT:** Accumulating / Neutral / Distributing — one sentence.

Under 300 words.`
  },
  {
    id: 'layer1-comparison',
    name: 'Layer 1 Comparison Report',
    category: 'Ecosystem Analysis',
    description: 'ETH vs SOL vs AVAX vs BNB — performance, ecosystem health, developer activity',
    prompt: `Generate a Layer 1 blockchain comparison report.

## LAYER 1 COMPARISON REPORT — [Date]

**1. PRICE PERFORMANCE**
Table: Chain | Token | 7-Day % | 30-Day % | vs BTC. Cover ETH, SOL, AVAX, BNB, ADA.

**2. NETWORK ACTIVITY**
For each major L1: transaction volume trend, active addresses, gas/fee environment. Which chains are seeing growing vs. declining usage?

**3. DEVELOPER ECOSYSTEM**
Which L1s have the most active developer communities? Recent protocol launches, TVL trends, and ecosystem growth signals.

**4. ETH vs. COMPETITORS**
Is ETH gaining or losing market share vs. Solana and other L1s? ETH/SOL ratio trend. What drives the shift?

**5. CAPITAL FLOW ROTATION**
Where is crypto capital rotating within the L1 space? Which chain is winning the current cycle's developer and user attention?

**L1 VERDICT:** Which L1 has the best risk/reward setup right now and why — one sentence.

Under 350 words.`
  },
  {
    id: 'defi-yield-report',
    name: 'DeFi Yield Report',
    category: 'Ecosystem Analysis',
    description: 'Current yields across major DeFi protocols, risk-adjusted opportunities, TVL trends',
    prompt: `Generate a DeFi yield and opportunity report.

## DEFI YIELD REPORT — [Date]

**1. DEFI MARKET OVERVIEW**
Total DeFi TVL trend — growing, shrinking, or flat? What does TVL direction signal about DeFi health?

**2. YIELD ENVIRONMENT**
Current benchmark yields: stablecoin lending rates (USDC/USDT), ETH staking yield, BTC wrapped lending. Are DeFi yields competitive with TradFi rates?

**3. TOP YIELD OPPORTUNITIES**
3-5 current yield opportunities across risk tiers:
- Low risk (stablecoin): protocol, APY, risk factors
- Medium risk (single asset): protocol, APY, risk factors
- Higher risk (LP/complex): protocol, APY, risk factors

**4. PROTOCOL HEALTH CHECK**
For major protocols (Aave, Compound, Curve, Uniswap): TVL trend, revenue, any security or governance concerns.

**5. DEFI RISK FACTORS**
What are the key risks in DeFi right now — smart contract exploits, oracle manipulation, liquidation cascades, regulatory pressure?

**DEFI VERDICT:** Yield environment: Attractive / Fair / Compressed — and whether now is a good time to deploy capital.

Under 350 words.`
  },
  {
    id: 'crypto-regulatory-report',
    name: 'Crypto Regulatory Report',
    category: 'Market Overview',
    description: 'Latest regulatory developments, enforcement actions, global policy changes and market impact',
    prompt: `Generate a crypto regulatory landscape report.

## CRYPTO REGULATORY REPORT — [Date]

**1. RECENT REGULATORY ACTIONS**
Top 3-5 regulatory developments from the past 2-4 weeks. For each: what happened, which jurisdiction, market impact.

**2. US REGULATORY POSTURE**
Current stance of SEC, CFTC, Treasury on crypto. Any pending legislation or enforcement actions that matter. Is US regulatory risk rising or falling?

**3. GLOBAL REGULATORY MAP**
Key international developments: EU (MiCA implementation), Asia (Japan, Hong Kong, Singapore), emerging markets. Who is crypto-friendly right now?

**4. MARKET IMPACT ASSESSMENT**
Which regulatory developments are bullish (clarity, approval, adoption) vs. bearish (restriction, enforcement, bans)? Net regulatory environment: positive or negative?

**5. COMPLIANCE RISK SECTORS**
Which parts of crypto face the most regulatory risk right now — exchanges, stablecoins, DeFi, NFTs, privacy coins?

**REGULATORY VERDICT:** Improving / Neutral / Worsening — for crypto markets, with the single biggest near-term regulatory risk.

Under 350 words.`
  },
  {
    id: 'mining-economics-report',
    name: 'Bitcoin Mining Economics',
    category: 'On-Chain Intelligence',
    description: 'Hash rate, mining profitability, miner revenue, are miners selling or accumulating',
    prompt: `Generate a Bitcoin mining economics report.

## BITCOIN MINING ECONOMICS REPORT — [Date]

**1. HASH RATE & SECURITY**
Current network hash rate and trend (all-time high, growing, or declining?). What does hash rate signal about miner confidence in BTC price?

**2. MINING PROFITABILITY**
Current miner revenue per EH/s. Post-halving profitability context — are miners profitable at current BTC price? Break-even price estimate for average miner.

**3. MINER BEHAVIOR**
Are miners currently accumulating BTC or selling? Miner reserve trend. Miner-to-exchange flows — high selling pressure or hodling?

**4. DIFFICULTY ADJUSTMENT**
Recent difficulty adjustments — up or down? What does it signal about miner activity and network health?

**5. HALVING CYCLE CONTEXT**
Where are we in the halving cycle? How does current miner economics compare to similar points in previous cycles?

**MINER VERDICT:** Miners are: Accumulating (bullish) / Neutral / Distributing (headwind) — one sentence with key data.

Under 300 words.`
  },
  {
    id: 'liquidation-map-report',
    name: 'Liquidation Map Report',
    category: 'Derivatives & Positioning',
    description: 'Key BTC and ETH liquidation clusters, what happens if price hits those levels',
    prompt: `Generate a crypto liquidation map analysis report.

## LIQUIDATION MAP REPORT — [Date]

**1. CURRENT BTC LIQUIDATION CLUSTERS**
Key price levels where significant long liquidations are concentrated below spot. Key levels where short liquidations cluster above spot. What happens to price if those levels are hit?

**2. CURRENT ETH LIQUIDATION CLUSTERS**
Same analysis for Ethereum — key long liquidation levels below and short squeeze levels above.

**3. LEVERAGE ENVIRONMENT**
Is the market currently over-leveraged long, over-leveraged short, or balanced? What does open interest tell us about the current risk of a cascade?

**4. LIQUIDATION CASCADE RISK**
If BTC drops to [key support level]: estimated liquidations triggered, secondary effect on altcoins, risk of cascade vs. absorption.

**5. TRADING IMPLICATION**
Based on liquidation map: which direction has the easier path right now? Where are the liquidity pools that market makers are likely targeting?

**LIQUIDATION SIGNAL:** Long squeeze risk / Short squeeze setup / Balanced — one sentence with key level to watch.

Under 300 words.`
  },
  {
    id: 'weekly-crypto-trading-plan',
    name: 'Weekly Crypto Trading Plan',
    category: 'Strategy',
    description: 'Week-ahead crypto plan — bias, key BTC/ETH levels, setups, and risk rules',
    prompt: `Generate a weekly crypto trading plan for the week ahead.

## WEEKLY CRYPTO TRADING PLAN — Week of [Date]

**1. MARKET BIAS**
Overall crypto market bias: Bullish / Cautious / Bearish — one sentence, data-backed. The key BTC level that confirms or breaks this bias.

**2. KEY LEVELS**
Table: Asset | Key Support | Key Resistance | Bias. Cover BTC, ETH, and SOL minimum.

**3. MACRO EVENTS THIS WEEK**
Any macro events (Fed speakers, CPI, jobs data) that will impact crypto? For each: expected outcome and crypto impact if it surprises.

**4. SETUPS TO WATCH**
2-3 specific crypto setups worth monitoring this week. For each: asset, setup type, entry trigger, invalidation level.

**5. RISK RULES FOR THIS WEEK**
Based on current funding rates and volatility: recommended position size (full/half/quarter), stop approach, hold duration.

**6. WHAT TO AVOID**
Specific assets, sectors (DeFi/L2/meme coins), or conditions to stay away from this week.

**WEEK RATING:** Favorable / Neutral / Challenging for crypto traders.

Under 400 words.`
  },
  {
    id: 'perpetuals-basis-report',
    name: 'Perpetuals & Basis Report',
    category: 'Derivatives & Positioning',
    description: 'Funding rates, spot-perp basis, carry trade conditions, leverage positioning',
    prompt: `Generate a perpetual futures and basis analysis report.

## PERPETUALS & BASIS REPORT — [Date]

**1. FUNDING RATE SNAPSHOT**
Current funding rates for BTC and ETH perpetuals. Positive = longs paying shorts (market bullish/overheated). Negative = shorts paying longs (market bearish/underhedged). Context vs. last 30 days.

**2. ANNUALIZED FUNDING YIELD**
At current funding rate, what is the annualized yield for a cash-and-carry (long spot / short perp) position? Is this attractive vs. stablecoin yields?

**3. BASIS TRADE CONDITIONS**
Spot-to-futures basis on major exchanges. Is the basis in contango (futures premium) or backwardation (futures discount)? What does it signal?

**4. OPEN INTEREST TREND**
OI rising + price rising = healthy / OI rising + price falling = bearish divergence / OI falling = deleveraging. Current pattern for BTC and ETH.

**5. CARRY TRADE OPPORTUNITY**
Is this a good environment for delta-neutral carry strategies? Risk/reward of current cash-and-carry vs. risks (funding rate flip, liquidation).

**DERIVATIVES SIGNAL:** Overleveraged long / Neutral / Overleveraged short — and whether carry trade is attractive right now.

Under 350 words.`
  },
  {
    id: 'crypto-portfolio-stress',
    name: 'Crypto Portfolio Stress Test',
    category: 'Strategy',
    description: 'How a crypto portfolio holds up in bear, crash, and liquidity crisis scenarios',
    prompt: `Generate a crypto portfolio stress test report.

## CRYPTO PORTFOLIO STRESS TEST — [Date]

Stress test a typical crypto portfolio (60% BTC / 25% ETH / 15% altcoins) against three scenarios.

**SCENARIO 1: BTC CORRECTION (-30%)**
- Trigger: macro risk-off, exchange outflow, sentiment reversal
- BTC: -30% | ETH: estimated % | Altcoins: estimated % (altcoins typically fall 1.5-2x BTC)
- Portfolio impact: estimated drawdown
- Recovery playbook: what to do, what to buy

**SCENARIO 2: BEAR MARKET (-70% from peak)**
- Trigger: cycle top, regulatory shock, macro crisis
- Historical parallel: 2018 or 2022 bear market
- Portfolio impact: how a diversified crypto portfolio would fare
- Survival strategy: position sizing, stable allocation, accumulation zones

**SCENARIO 3: LIQUIDITY CRISIS (2020 March-style)**
- Trigger: correlated selloff, forced deleveraging, exchange stress
- Correlation breakdown: crypto sells with everything
- What holds up (BTC vs. altcoins), what gets crushed
- Defense: where to hold capital during a liquidity event

**CURRENT RISK LEVEL**
Based on today's funding rates, leverage, and market structure: which scenario is most probable and what probability?

**STRESS TEST VERDICT:** Portfolio resilience: Strong / Adequate / Needs de-risking — with one specific action.

Under 400 words.`
  },
]

// ── Grouped predefined reports ─────────────────────────────────────────────────

const STOCK_CATEGORIES = ['Market Intelligence', 'Positioning & Flow', 'Portfolio & Strategy', 'Income & Macro']
const CRYPTO_CATEGORIES = ['Market Overview', 'On-Chain Intelligence', 'Ecosystem Analysis', 'Derivatives & Positioning', 'Strategy']

function groupByCategory(reports: PredefinedReport[], categories: string[]) {
  const grouped: Record<string, PredefinedReport[]> = {}
  for (const cat of categories) {
    const items = reports.filter(r => r.category === cat)
    if (items.length > 0) grouped[cat] = items
  }
  return grouped
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const router = useRouter()
  const locale = useLocale()
  const searchParams = useSearchParams()
  const mode = searchParams?.get('mode') === 'crypto' ? 'crypto' : 'stocks'
  const supabase = createBrowserSupabaseClient()

  const predefinedReports = mode === 'crypto' ? CRYPTO_PREDEFINED_REPORTS : PREDEFINED_REPORTS
  const categories = mode === 'crypto' ? CRYPTO_CATEGORIES : STOCK_CATEGORIES

  const [activeTab, setActiveTab] = useState<'library' | 'my-reports'>('library')
  const [userReports, setUserReports] = useState<UserReport[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalStep, setModalStep] = useState<'details' | 'preview'>('details')

  // Form state
  const [reportName, setReportName] = useState('')
  const [reportCategory, setReportCategory] = useState('Custom')
  const [reportDescription, setReportDescription] = useState('')
  const [dataSources, setDataSources] = useState<string[]>(['Live market prices', 'Options data', 'Economic indicators', 'Crypto data'])
  const [specificTickers, setSpecificTickers] = useState('')
  const [showTickerInput, setShowTickerInput] = useState(false)

  // Build state
  const [building, setBuilding] = useState(false)
  const [builtPrompt, setBuiltPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [buildError, setBuildError] = useState('')

  // Load user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load user reports when My Reports tab is active
  useEffect(() => {
    if (activeTab === 'my-reports' && user) {
      loadUserReports()
    }
  }, [activeTab, user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadUserReports() {
    setLoadingReports(true)
    try {
      const res = await fetch('/api/reports')
      if (res.ok) {
        const data = await res.json()
        setUserReports(Array.isArray(data) ? data : [])
      }
    } catch {}
    setLoadingReports(false)
  }

  function openModal() {
    setShowModal(true)
    setModalStep('details')
    setReportName('')
    setReportCategory('Custom')
    setReportDescription('')
    setDataSources(['Live market prices', 'Options data', 'Economic indicators', 'Crypto data'])
    setSpecificTickers('')
    setShowTickerInput(false)
    setBuiltPrompt('')
    setBuildError('')
  }

  function closeModal() {
    setShowModal(false)
  }

  function toggleDataSource(source: string) {
    setDataSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    )
  }

  async function handleBuild() {
    if (!reportName.trim()) return
    setBuilding(true)
    setBuildError('')
    try {
      const sources = [...dataSources]
      if (showTickerInput && specificTickers.trim()) {
        sources.push(`Specific tickers: ${specificTickers.trim()}`)
      }
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: reportName, description: reportDescription, dataSources: sources }),
      })
      const data = await res.json()
      if (!res.ok) {
        setBuildError(data.error || 'Failed to build report')
      } else {
        setBuiltPrompt(data.prompt)
        setModalStep('preview')
      }
    } catch {
      setBuildError('Network error. Please try again.')
    }
    setBuilding(false)
  }

  async function handleSaveReport() {
    if (!builtPrompt) return
    setSaving(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reportName,
          description: reportDescription || null,
          prompt: builtPrompt,
          category: reportCategory,
        }),
      })
      if (res.ok) {
        closeModal()
        if (activeTab === 'my-reports') loadUserReports()
      }
    } catch {}
    setSaving(false)
  }

  async function handleDeleteReport(id: string) {
    if (!confirm('Delete this report?')) return
    try {
      await fetch('/api/reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setUserReports(prev => prev.filter(r => r.id !== id))
    } catch {}
  }

  function runReport(prompt: string, name: string) {
    localStorage.setItem('ic_pending_report', prompt)
    localStorage.setItem('ic_pending_report_name', name)
    router.push(`/${locale}/app` as any)
  }

  const grouped = groupByCategory(predefinedReports, categories)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'inherit' }}>
      {/* Fixed header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#0a0a0a',
        borderBottom: '1px solid #1a1a1a',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => router.push(`/${locale}/app` as any)}
            style={{
              background: 'transparent',
              border: '1px solid #1f1f1f',
              borderRadius: '6px',
              padding: '5px 12px',
              color: '#666',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#999'}
            onMouseLeave={e => e.currentTarget.style.color = '#666'}
          >
            ← Back
          </button>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e5e5e5', letterSpacing: '-0.01em' }}>
            {mode === 'crypto' ? 'Crypto Reports' : 'Stock & Market Reports'}
          </h1>
        </div>
        <button
          onClick={openModal}
          style={{
            background: '#2d6a4f',
            border: '1px solid #3d8a6f',
            borderRadius: '8px',
            padding: '8px 18px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#3d8a6f'}
          onMouseLeave={e => e.currentTarget.style.background = '#2d6a4f'}
        >
          ⚡ Create Report
        </button>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '0' }}>
        {(['library', 'my-reports'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #4a9a6a' : '2px solid transparent',
              padding: '12px 20px',
              color: activeTab === tab ? '#4a9a6a' : '#666',
              fontSize: '13px',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.02em',
              transition: 'color 0.15s',
            }}
          >
            {tab === 'library' ? 'Report Library' : 'My Reports'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '28px 24px', maxWidth: '1200px' }}>

        {/* ── Report Library ────────────────────────────────────── */}
        {activeTab === 'library' && (
          <div>
            {categories.map(cat => {
              const reports = grouped[cat]
              if (!reports || reports.length === 0) return null
              const catStyle = getCategoryStyle(cat)
              return (
                <div key={cat} style={{ marginBottom: '36px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <span style={{
                      background: catStyle.bg,
                      color: catStyle.text,
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '20px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}>
                      {cat}
                    </span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '14px',
                  }}>
                    {reports.map(report => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        onRun={() => runReport(report.prompt, report.name)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── My Reports ───────────────────────────────────────── */}
        {activeTab === 'my-reports' && (
          <div>
            {!user ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
                <div style={{ fontSize: '15px', marginBottom: '12px' }}>Sign in to save and view your custom reports.</div>
                <button
                  onClick={() => router.push(`/${locale}/login` as any)}
                  style={{
                    background: '#2d6a4f',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Sign In
                </button>
              </div>
            ) : loadingReports ? (
              <div style={{ color: '#555', padding: '40px 0', textAlign: 'center', fontSize: '14px' }}>Loading reports...</div>
            ) : userReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ color: '#555', fontSize: '15px', marginBottom: '8px' }}>No saved reports yet.</div>
                <div style={{ color: '#444', fontSize: '13px', marginBottom: '20px' }}>Create your first report to get started.</div>
                <button
                  onClick={openModal}
                  style={{
                    background: '#2d6a4f',
                    border: '1px solid #3d8a6f',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  ⚡ Create Report
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '14px',
              }}>
                {userReports.map(report => (
                  <UserReportCard
                    key={report.id}
                    report={report}
                    onRun={() => runReport(report.prompt, report.name)}
                    onDelete={() => handleDeleteReport(report.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create Report Modal ───────────────────────────────────────────────── */}
      {showModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{
            background: '#111',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            {modalStep === 'details' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e5e5e5' }}>Create a Report</h2>
                  <button
                    onClick={closeModal}
                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '0 4px' }}
                  >
                    ×
                  </button>
                </div>

                {/* Report name */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Report Name
                  </label>
                  <input
                    value={reportName}
                    onChange={e => setReportName(e.target.value)}
                    placeholder="e.g. My Weekly Watchlist"
                    style={{
                      width: '100%',
                      background: '#0d0d0d',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#e5e5e5',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#2d6a4f'}
                    onBlur={e => e.currentTarget.style.borderColor = '#2a2a2a'}
                  />
                </div>

                {/* Category */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Category
                  </label>
                  <select
                    value={reportCategory}
                    onChange={e => setReportCategory(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0d0d0d',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#e5e5e5',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Market Intelligence">Market Intelligence</option>
                    <option value="Positioning & Flow">Positioning &amp; Flow</option>
                    <option value="Portfolio & Strategy">Portfolio &amp; Strategy</option>
                    <option value="Income & Macro">Income &amp; Macro</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                {/* Description */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    What do you want this report to cover?
                  </label>
                  <textarea
                    value={reportDescription}
                    onChange={e => setReportDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe in plain English what you want. Example: Every Monday I want to see which stocks are setting up for breakouts, which sectors are leading, and 3 specific trade ideas I should consider for the week."
                    style={{
                      width: '100%',
                      background: '#0d0d0d',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#e5e5e5',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: '1.6',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#2d6a4f'}
                    onBlur={e => e.currentTarget.style.borderColor = '#2a2a2a'}
                  />
                </div>

                {/* Data sources */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Data Sources
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {['Live market prices', 'Options data', 'Economic indicators', 'Crypto data'].map(source => (
                      <label key={source} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#ccc' }}>
                        <input
                          type="checkbox"
                          checked={dataSources.includes(source)}
                          onChange={() => toggleDataSource(source)}
                          style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#4a9a6a' }}
                        />
                        {source}
                      </label>
                    ))}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#ccc' }}>
                      <input
                        type="checkbox"
                        checked={showTickerInput}
                        onChange={e => setShowTickerInput(e.target.checked)}
                        style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#4a9a6a' }}
                      />
                      Specific tickers
                    </label>
                    {showTickerInput && (
                      <input
                        value={specificTickers}
                        onChange={e => setSpecificTickers(e.target.value)}
                        placeholder="e.g. AAPL, NVDA, SPY"
                        style={{
                          marginLeft: '25px',
                          background: '#0d0d0d',
                          border: '1px solid #2a2a2a',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          color: '#e5e5e5',
                          fontSize: '13px',
                          fontFamily: 'inherit',
                          outline: 'none',
                          width: 'calc(100% - 25px)',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = '#2d6a4f'}
                        onBlur={e => e.currentTarget.style.borderColor = '#2a2a2a'}
                      />
                    )}
                  </div>
                </div>

                {buildError && (
                  <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '12px' }}>{buildError}</div>
                )}

                <button
                  onClick={handleBuild}
                  disabled={building || !reportName.trim()}
                  style={{
                    width: '100%',
                    background: building || !reportName.trim() ? '#1a3a2f' : '#2d6a4f',
                    border: '1px solid #3d8a6f',
                    borderRadius: '8px',
                    padding: '12px',
                    color: building || !reportName.trim() ? '#4a9a6a' : '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: building || !reportName.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    letterSpacing: '0.02em',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!building && reportName.trim()) e.currentTarget.style.background = '#3d8a6f' }}
                  onMouseLeave={e => { if (!building && reportName.trim()) e.currentTarget.style.background = '#2d6a4f' }}
                >
                  {building ? 'Building Report…' : 'Build Report with AI →'}
                </button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e5e5e5' }}>Report built! Preview:</h2>
                  <button
                    onClick={closeModal}
                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '0 4px' }}
                  >
                    ×
                  </button>
                </div>

                <div style={{
                  background: '#0d0d0d',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  padding: '16px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  marginBottom: '20px',
                  fontSize: '12px',
                  lineHeight: '1.7',
                  color: '#888',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'ui-monospace, monospace',
                }}>
                  {builtPrompt}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setModalStep('details')}
                    style={{
                      flex: '0 0 auto',
                      background: 'transparent',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      padding: '10px 18px',
                      color: '#888',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#555'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#333'}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSaveReport}
                    disabled={saving}
                    style={{
                      flex: 1,
                      background: saving ? '#1a3a2f' : '#2d6a4f',
                      border: '1px solid #3d8a6f',
                      borderRadius: '8px',
                      padding: '10px',
                      color: saving ? '#4a9a6a' : '#fff',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#3d8a6f' }}
                    onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#2d6a4f' }}
                  >
                    {saving ? 'Saving…' : 'Save Report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReportCard({ report, onRun }: { report: PredefinedReport; onRun: () => void }) {
  const [hovered, setHovered] = useState(false)
  const catStyle = getCategoryStyle(report.category)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#111',
        border: `1px solid ${hovered ? '#2d6a4f' : '#1a1a1a'}`,
        borderRadius: '10px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'border-color 0.15s',
        cursor: 'default',
      }}
    >
      <span style={{
        background: catStyle.bg,
        color: catStyle.text,
        fontSize: '10px',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: '20px',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        alignSelf: 'flex-start',
      }}>
        {report.category}
      </span>
      <div style={{ fontWeight: 700, fontSize: '14px', color: '#e5e5e5', lineHeight: '1.4' }}>
        {report.name}
      </div>
      <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.5', flexGrow: 1 }}>
        {report.description}
      </div>
      <button
        onClick={onRun}
        style={{
          background: 'transparent',
          border: '1px solid #2d6a4f',
          borderRadius: '6px',
          padding: '7px 14px',
          color: '#4a9a6a',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          alignSelf: 'flex-start',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#1a3a2f' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        ▶ Run Report
      </button>
    </div>
  )
}

function UserReportCard({ report, onRun, onDelete }: { report: UserReport; onRun: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false)
  const catStyle = getCategoryStyle(report.category)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#111',
        border: `1px solid ${hovered ? '#2d6a4f' : '#1a1a1a'}`,
        borderRadius: '10px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'border-color 0.15s',
      }}
    >
      <span style={{
        background: catStyle.bg,
        color: catStyle.text,
        fontSize: '10px',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: '20px',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        alignSelf: 'flex-start',
      }}>
        {report.category}
      </span>
      <div style={{ fontWeight: 700, fontSize: '14px', color: '#e5e5e5', lineHeight: '1.4' }}>
        {report.name}
      </div>
      {report.description && (
        <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.5', flexGrow: 1 }}>
          {report.description}
        </div>
      )}
      <div style={{ fontSize: '11px', color: '#444' }}>
        {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onRun}
          style={{
            background: 'transparent',
            border: '1px solid #2d6a4f',
            borderRadius: '6px',
            padding: '7px 14px',
            color: '#4a9a6a',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1a3a2f'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          ▶ Run Report
        </button>
        <button
          onClick={onDelete}
          style={{
            background: 'transparent',
            border: '1px solid #3a1a1a',
            borderRadius: '6px',
            padding: '7px 12px',
            color: '#7f3030',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#2a1010'; e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7f3030' }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
