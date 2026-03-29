// Investment Council — Signal Engine
// Pure computation: takes structured data, returns directional signals
// No API calls — feed it data, get back a signal

export type SignalDirection = 'BULLISH' | 'WEAK_BULLISH' | 'NEUTRAL' | 'WEAK_BEARISH' | 'BEARISH'
export type MarketState = 'Accumulation' | 'Distribution' | 'Expansion' | 'Exhaustion' | 'Neutral'
export type RegimeLabel = 'ACCUMULATE' | 'HOLD' | 'REDUCE' | 'DEFENSIVE'

export interface Signal {
  ticker: string
  assetType: 'crypto' | 'stock'
  direction: SignalDirection
  confidence: number       // 0-95
  state: MarketState
  drivers: string[]        // plain English explanation of each contributing factor
  summary: string          // one-line verdict
  squeeze_setup: boolean
  score: number            // raw score, useful for debugging
  // Crypto cycle intelligence (null for stocks)
  nupl: number | null      // Net Unrealized Profit/Loss: 1 - (1/MVRV). >0.75 = euphoria, <0 = capitulation
  regime: RegimeLabel | null
  regimeReason: string     // one-line plain English reason for the regime
}

// ── NUPL — Net Unrealized Profit/Loss ─────────────────────────────────────────
// Formula: NUPL ≈ 1 - (1/MVRV)
// This is mathematically exact: NUPL = (MarketCap - RealizedCap) / MarketCap = 1 - 1/MVRV
// Zones: <0 Capitulation | 0–0.25 Hope | 0.25–0.5 Optimism | 0.5–0.75 Belief | >0.75 Euphoria

export function computeNUPL(mvrv: number): number {
  return parseFloat((1 - 1 / mvrv).toFixed(4))
}

export function interpretNUPL(nupl: number): string {
  if (nupl > 0.75) return 'Euphoria — historically near cycle tops, extreme caution'
  if (nupl > 0.5)  return 'Belief/Thrill — late bull market, profits elevated'
  if (nupl > 0.25) return 'Optimism — mid-cycle bull market'
  if (nupl > 0)    return 'Hope/Fear — early recovery, holders cautiously profitable'
  return 'Capitulation — majority underwater, historically near cycle bottoms'
}

// ── Regime Signal ──────────────────────────────────────────────────────────────
// ACCUMULATE — undervalued, fear in market, smart money buying
// HOLD       — mid-cycle, stay positioned, no action needed
// REDUCE     — overvalued, greed elevated, start taking profits
// DEFENSIVE  — danger zone, preserve capital

export function computeRegime(params: {
  mvrv: number | null
  nupl: number | null
  fearGreed: number
  exchangeNetFlow: number | null  // negative = outflows (bullish), positive = inflows (bearish)
  fundingRate: number | null
}): { regime: RegimeLabel; reason: string } {
  const { mvrv, nupl, fearGreed, exchangeNetFlow, fundingRate } = params

  // DEFENSIVE — multiple danger signals simultaneously
  const mvrvDanger   = mvrv != null && mvrv > 3.5
  const nuplDanger   = nupl != null && nupl > 0.70
  const greedDanger  = fearGreed > 80
  const flowDanger   = exchangeNetFlow != null && exchangeNetFlow > 3000
  const fundingDanger = fundingRate != null && fundingRate > 0.08

  if ((mvrvDanger && greedDanger) || (nuplDanger && greedDanger) || (mvrvDanger && nuplDanger) || (flowDanger && greedDanger) || (fundingDanger && greedDanger)) {
    const reasons: string[] = []
    if (mvrvDanger)  reasons.push(`MVRV ${mvrv!.toFixed(2)} (danger zone)`)
    if (nuplDanger)  reasons.push(`NUPL ${(nupl! * 100).toFixed(0)}% (euphoria)`)
    if (greedDanger) reasons.push(`Fear & Greed ${fearGreed} (extreme greed)`)
    if (flowDanger)  reasons.push('heavy exchange inflows')
    if (fundingDanger) reasons.push(`funding rate ${fundingRate!.toFixed(3)}% (longs overleveraged)`)
    return { regime: 'DEFENSIVE', reason: `Preserve capital — ${reasons.slice(0, 2).join(', ')}` }
  }

  // REDUCE — elevated valuation + greed rising
  const mvrvElevated  = mvrv != null && mvrv > 2.5
  const nuplElevated  = nupl != null && nupl > 0.5
  const greedElevated = fearGreed > 65
  const flowBearish   = exchangeNetFlow != null && exchangeNetFlow > 1000

  if ((mvrvElevated && greedElevated) || (nuplElevated && greedElevated) || (mvrvElevated && flowBearish)) {
    const reasons: string[] = []
    if (mvrvElevated)  reasons.push(`MVRV ${mvrv!.toFixed(2)} (elevated)`)
    if (nuplElevated)  reasons.push(`NUPL ${(nupl! * 100).toFixed(0)}% (belief zone)`)
    if (greedElevated) reasons.push(`Fear & Greed ${fearGreed} (greed)`)
    return { regime: 'REDUCE', reason: `Start taking profits — ${reasons.slice(0, 2).join(', ')}` }
  }

  // ACCUMULATE — undervalued + fear
  const mvrvLow      = mvrv != null && mvrv < 1.5
  const nuplLow      = nupl != null && nupl < 0.25
  const fearPresent  = fearGreed < 40
  const flowBullish  = exchangeNetFlow != null && exchangeNetFlow < -1000

  if ((mvrvLow && fearPresent) || (nuplLow && fearPresent) || (mvrvLow && flowBullish)) {
    const reasons: string[] = []
    if (mvrvLow)      reasons.push(`MVRV ${mvrv!.toFixed(2)} (undervalued)`)
    if (nuplLow)      reasons.push(`NUPL ${(nupl! * 100).toFixed(0)}% (early cycle)`)
    if (fearPresent)  reasons.push(`Fear & Greed ${fearGreed} (fear)`)
    if (flowBullish)  reasons.push('strong exchange outflows')
    return { regime: 'ACCUMULATE', reason: `Buy zone — ${reasons.slice(0, 2).join(', ')}` }
  }

  // HOLD — everything else (mid-cycle)
  const reasons: string[] = []
  if (mvrv != null) reasons.push(`MVRV ${mvrv.toFixed(2)} (mid-cycle)`)
  if (fearGreed >= 40 && fearGreed <= 65) reasons.push(`Fear & Greed ${fearGreed} (neutral)`)
  return { regime: 'HOLD', reason: `Stay positioned — ${reasons.slice(0, 2).join(', ') || 'mid-cycle conditions'}` }
}

// ── Crypto Signal ─────────────────────────────────────────────────────────────

export interface CryptoSignalData {
  mvrv: number | null
  exchangeNetFlow: number | null  // BTC: negative = outflow (bullish), positive = inflow (bearish)
  fundingRate: number | null      // pct, e.g. -0.01 means -0.01% (shorts paying)
  longLiqUsd: number              // 24h long liquidations in USD
  shortLiqUsd: number             // 24h short liquidations in USD
  fearGreed: number               // 0-100
  priceChange24h: number          // pct
  btcDominance: number | null
}

export function computeCryptoSignal(ticker: string, data: CryptoSignalData): Signal {
  let score = 0
  const drivers: string[] = []

  // 1. Exchange flow — weight ±30
  if (data.exchangeNetFlow != null) {
    if (data.exchangeNetFlow < -5000) {
      score += 30
      drivers.push(`Large exchange outflows (${Math.abs(data.exchangeNetFlow).toFixed(0)} BTC net) — smart money moving to cold storage`)
    } else if (data.exchangeNetFlow < -1000) {
      score += 20
      drivers.push(`Exchange outflows (${Math.abs(data.exchangeNetFlow).toFixed(0)} BTC net) — accumulation signal`)
    } else if (data.exchangeNetFlow < -200) {
      score += 10
      drivers.push(`Moderate exchange outflows — mild accumulation signal`)
    } else if (data.exchangeNetFlow > 5000) {
      score -= 30
      drivers.push(`Large exchange inflows (${data.exchangeNetFlow.toFixed(0)} BTC) — distribution, sell pressure building`)
    } else if (data.exchangeNetFlow > 1000) {
      score -= 20
      drivers.push(`Exchange inflows (${data.exchangeNetFlow.toFixed(0)} BTC) — distribution signal`)
    } else if (data.exchangeNetFlow > 200) {
      score -= 10
      drivers.push(`Moderate exchange inflows — mild distribution`)
    }
  }

  // 2. Funding rate — weight ±25
  if (data.fundingRate != null) {
    if (data.fundingRate < -0.03) {
      score += 25
      drivers.push(`Funding rate ${data.fundingRate.toFixed(3)}% — shorts paying heavily, high squeeze risk`)
    } else if (data.fundingRate < -0.01) {
      score += 15
      drivers.push(`Negative funding (${data.fundingRate.toFixed(3)}%) — shorts paying, squeeze conditions building`)
    } else if (data.fundingRate < 0) {
      score += 5
      drivers.push(`Slightly negative funding (${data.fundingRate.toFixed(3)}%) — mild short bias in market`)
    } else if (data.fundingRate > 0.1) {
      score -= 25
      drivers.push(`Extreme funding (${data.fundingRate.toFixed(3)}%) — longs dangerously overleveraged, correction risk`)
    } else if (data.fundingRate > 0.05) {
      score -= 15
      drivers.push(`High funding rate (${data.fundingRate.toFixed(3)}%) — overleveraged longs, watch for long squeeze`)
    } else if (data.fundingRate > 0.01) {
      score -= 8
      drivers.push(`Positive funding (${data.fundingRate.toFixed(3)}%) — longs paying, mild caution`)
    }
  }

  // 3. Liquidations — weight ±20
  if (data.shortLiqUsd > 0 || data.longLiqUsd > 0) {
    const ratio = data.shortLiqUsd / Math.max(data.longLiqUsd, 1)
    if (ratio > 3) {
      score += 20
      drivers.push(`Short liquidations 3x+ long liquidations — active short squeeze in progress`)
    } else if (ratio > 1.5) {
      score += 10
      drivers.push(`More shorts liquidating than longs — squeeze momentum present`)
    } else if (ratio < 0.33) {
      score -= 20
      drivers.push(`Long liquidations dominating — heavy market selling pressure`)
    } else if (ratio < 0.67) {
      score -= 10
      drivers.push(`More longs liquidating than shorts — bearish flush`)
    }
  }

  // 4. MVRV — weight ±30
  if (data.mvrv != null) {
    if (data.mvrv < 0.8) {
      score += 30
      drivers.push(`MVRV ${data.mvrv.toFixed(2)} — below realized price, historically near cycle bottoms`)
    } else if (data.mvrv < 1.0) {
      score += 25
      drivers.push(`MVRV ${data.mvrv.toFixed(2)} — undervalued vs realized price`)
    } else if (data.mvrv < 2.4) {
      score += 10
      drivers.push(`MVRV ${data.mvrv.toFixed(2)} — healthy mid-cycle range`)
    } else if (data.mvrv < 3.7) {
      score -= 10
      drivers.push(`MVRV ${data.mvrv.toFixed(2)} — elevated, caution zone`)
    } else {
      score -= 30
      drivers.push(`MVRV ${data.mvrv.toFixed(2)} — historically near cycle tops, high risk`)
    }
  }

  // 5. Fear & Greed — weight ±20
  if (data.fearGreed < 15) {
    score += 20
    drivers.push(`Fear & Greed ${data.fearGreed}/100 (Extreme Fear) — historically strong buy zone`)
  } else if (data.fearGreed < 30) {
    score += 15
    drivers.push(`Fear & Greed ${data.fearGreed}/100 (Fear) — contrarian bullish signal`)
  } else if (data.fearGreed < 45) {
    score += 8
    drivers.push(`Fear & Greed ${data.fearGreed}/100 (Fear/Neutral) — mild bullish sentiment setup`)
  } else if (data.fearGreed > 85) {
    score -= 20
    drivers.push(`Fear & Greed ${data.fearGreed}/100 (Extreme Greed) — historically dangerous, top risk`)
  } else if (data.fearGreed > 70) {
    score -= 12
    drivers.push(`Fear & Greed ${data.fearGreed}/100 (Greed) — elevated sentiment, reduce risk`)
  } else if (data.fearGreed > 60) {
    score -= 5
    drivers.push(`Fear & Greed ${data.fearGreed}/100 (Greed) — mild caution`)
  }

  // Squeeze detection
  const squeeze_setup = (
    (data.exchangeNetFlow ?? 1) < -200 &&
    (data.fundingRate ?? 1) < 0 &&
    data.shortLiqUsd > data.longLiqUsd
  )
  if (squeeze_setup && !drivers.some(d => d.includes('squeeze'))) {
    drivers.push('Confluence: outflows + negative funding + short liquidations — squeeze conditions aligned')
  }

  // Direction
  let direction: SignalDirection
  if (score >= 40) direction = 'BULLISH'
  else if (score >= 20) direction = 'WEAK_BULLISH'
  else if (score <= -40) direction = 'BEARISH'
  else if (score <= -20) direction = 'WEAK_BEARISH'
  else direction = 'NEUTRAL'

  const confidence = Math.min(Math.round(Math.abs(score) / 60 * 100), 95)

  // Market state
  let state: MarketState = 'Neutral'
  if ((data.exchangeNetFlow ?? 1) < -200 && (data.mvrv ?? 2) < 2.0 && data.fearGreed < 50) {
    state = 'Accumulation'
  } else if ((data.exchangeNetFlow ?? -1) > 200 && (data.mvrv ?? 0) > 2.5 && data.fearGreed > 60) {
    state = 'Distribution'
  } else if ((data.exchangeNetFlow ?? 1) < 0 && data.priceChange24h > 2 && data.fearGreed > 50) {
    state = 'Expansion'
  } else if ((data.mvrv ?? 0) > 3.5 && data.fearGreed > 75) {
    state = 'Exhaustion'
  }

  // NUPL + Regime
  const nupl = data.mvrv != null ? computeNUPL(data.mvrv) : null
  const { regime, reason: regimeReason } = computeRegime({
    mvrv: data.mvrv,
    nupl,
    fearGreed: data.fearGreed,
    exchangeNetFlow: data.exchangeNetFlow,
    fundingRate: data.fundingRate,
  })

  if (nupl != null) {
    drivers.push(`NUPL ${(nupl * 100).toFixed(1)}% — ${interpretNUPL(nupl)}`)
  }

  const topDriver = drivers[0] ?? 'Insufficient data for strong conviction'
  const summary = `${ticker.toUpperCase()} — ${direction.replace('_', ' ')} (${confidence}% confidence). Regime: ${regime}. State: ${state}.${squeeze_setup ? ' SQUEEZE SETUP ACTIVE.' : ''} Key factor: ${topDriver}`

  return { ticker, assetType: 'crypto', direction, confidence, state, drivers, summary, squeeze_setup, score, nupl, regime, regimeReason }
}

// ── Stock Signal ──────────────────────────────────────────────────────────────

export interface StockSignalData {
  aboveSma20: boolean | null
  aboveSma50: boolean | null
  aboveSma200: boolean | null
  rsi14: number | null
  macdHistogram: number | null   // positive = bullish momentum building
  volVsAvg: number | null        // ratio vs 30-day avg volume
  shortInterestPct: number | null
  unusualCallFlow: boolean
  unusualPutFlow: boolean
  gexPositive: boolean | null
  vix: number | null
  // Dark pool / smart money
  darkPoolFlow: 'bullish' | 'bearish' | 'neutral' | null
  darkPoolBlockVsAvg: number | null   // ratio vs 30-day avg block volume
  congressNetBias: 'bullish' | 'bearish' | 'neutral'
  darkPoolDrivers: string[]           // pre-computed plain-English drivers from darkpool.ts
}

export function computeStockSignal(ticker: string, data: StockSignalData): Signal {
  let score = 0
  const drivers: string[] = []

  // 1. Trend alignment with MAs — weight ±30
  const maValues = [data.aboveSma20, data.aboveSma50, data.aboveSma200]
  const aboveCount = maValues.filter(Boolean).length
  const knownCount = maValues.filter(x => x != null).length

  if (knownCount > 0) {
    if (aboveCount === 3) {
      score += 30
      drivers.push('Price above 20/50/200-day MAs — full uptrend alignment')
    } else if (data.aboveSma50 && data.aboveSma200) {
      score += 18
      drivers.push('Price above 50/200-day MAs — intermediate uptrend intact')
    } else if (data.aboveSma200 && !data.aboveSma50) {
      score += 5
      drivers.push('Above 200-day MA but below 50-day — long-term support, near-term mixed')
    } else if (!data.aboveSma200 && data.aboveSma50) {
      score -= 10
      drivers.push('Below 200-day MA — long-term downtrend, caution')
    } else if (aboveCount === 0 && knownCount >= 2) {
      score -= 30
      drivers.push('Below all major MAs — full downtrend, no support from trend')
    }
  }

  // 2. RSI — weight ±20
  if (data.rsi14 != null) {
    if (data.rsi14 >= 50 && data.rsi14 < 65) {
      score += 20
      drivers.push(`RSI ${data.rsi14} — momentum zone, room to run without being overbought`)
    } else if (data.rsi14 >= 65 && data.rsi14 < 75) {
      score += 10
      drivers.push(`RSI ${data.rsi14} — strong momentum, approaching overbought territory`)
    } else if (data.rsi14 >= 75) {
      score -= 5
      drivers.push(`RSI ${data.rsi14} — overbought, elevated reversal risk`)
    } else if (data.rsi14 >= 40 && data.rsi14 < 50) {
      score += 3
      drivers.push(`RSI ${data.rsi14} — neutral zone, building base`)
    } else if (data.rsi14 >= 30 && data.rsi14 < 40) {
      score -= 15
      drivers.push(`RSI ${data.rsi14} — weak momentum, approaching oversold`)
    } else {
      score -= 20
      drivers.push(`RSI ${data.rsi14} — oversold, bearish signal despite bounce potential`)
    }
  }

  // 3. MACD histogram — weight ±10
  if (data.macdHistogram != null) {
    if (data.macdHistogram > 0) {
      score += 10
      drivers.push('MACD histogram positive — bullish momentum building')
    } else {
      score -= 8
      drivers.push('MACD histogram negative — bearish momentum, trend may be weakening')
    }
  }

  // 4. Volume vs average — weight +10
  if (data.volVsAvg != null) {
    if (data.volVsAvg > 2.0) {
      score += 10
      drivers.push(`Volume ${data.volVsAvg.toFixed(1)}x average — strong institutional participation`)
    } else if (data.volVsAvg > 1.5) {
      score += 7
      drivers.push(`Volume ${data.volVsAvg.toFixed(1)}x average — elevated buying interest`)
    } else if (data.volVsAvg > 1.2) {
      score += 3
    }
  }

  // 5. Options flow — weight ±20
  if (data.unusualCallFlow && !data.unusualPutFlow) {
    score += 20
    drivers.push('Unusual call flow — institutional positioning bullish, smart money buying calls')
  } else if (data.unusualPutFlow && !data.unusualCallFlow) {
    score -= 20
    drivers.push('Unusual put flow — institutional hedging or directional bearish bet')
  } else if (data.unusualCallFlow && data.unusualPutFlow) {
    drivers.push('Unusual flow on both sides — conflicting institutional positioning, volatility expected')
  }

  // 6. Short interest as squeeze fuel — weight +15 when setup is bullish
  if (data.shortInterestPct != null) {
    if (data.shortInterestPct > 15 && score > 0) {
      score += 15
      drivers.push(`Short interest ${data.shortInterestPct.toFixed(1)}% — high short float, squeeze fuel if price advances`)
    } else if (data.shortInterestPct > 10 && score > 0) {
      score += 8
      drivers.push(`Short interest ${data.shortInterestPct.toFixed(1)}% — elevated short interest, some squeeze risk`)
    }
  }

  // 7. GEX — weight ±10
  if (data.gexPositive === true) {
    score += 10
    drivers.push('Positive GEX — market maker pin effect, price stability support')
  } else if (data.gexPositive === false) {
    score -= 10
    drivers.push('Negative GEX — market makers amplify moves, higher volatility expected')
  }

  // 8. VIX regime — weight ±15
  if (data.vix != null) {
    if (data.vix < 15) {
      score += 15
      drivers.push(`VIX ${data.vix.toFixed(1)} — low fear, risk-on environment`)
    } else if (data.vix < 18) {
      score += 8
    } else if (data.vix > 28) {
      score -= 15
      drivers.push(`VIX ${data.vix.toFixed(1)} — high fear, risk-off environment`)
    } else if (data.vix > 22) {
      score -= 8
      drivers.push(`VIX ${data.vix.toFixed(1)} — elevated fear, cautious positioning warranted`)
    }
  }

  // 9. Dark pool flow — weight ±20
  // Block trade volume elevated = institutional accumulation off-exchange (bullish)
  // Block trade volume collapsed = institutions distributing (bearish)
  if (data.darkPoolFlow === 'bullish') {
    const boost = data.darkPoolBlockVsAvg != null && data.darkPoolBlockVsAvg > 2.0 ? 20 : 12
    score += boost
    // drivers already provided by darkpool.ts — push them here
    for (const d of data.darkPoolDrivers) drivers.push(d)
  } else if (data.darkPoolFlow === 'bearish') {
    const drag = data.darkPoolBlockVsAvg != null && data.darkPoolBlockVsAvg < 0.5 ? 20 : 12
    score -= drag
    for (const d of data.darkPoolDrivers) drivers.push(d)
  } else if (data.darkPoolFlow === 'neutral' && data.darkPoolDrivers.length > 0) {
    for (const d of data.darkPoolDrivers) drivers.push(d)
  }

  // 10. Congressional trades — weight ±10
  // Politicians have historically outperformed the market; their buys are a meaningful signal
  if (data.congressNetBias === 'bullish') {
    score += 10
  } else if (data.congressNetBias === 'bearish') {
    score -= 10
  }

  // Direction
  let direction: SignalDirection
  if (score >= 45) direction = 'BULLISH'
  else if (score >= 25) direction = 'WEAK_BULLISH'
  else if (score <= -45) direction = 'BEARISH'
  else if (score <= -25) direction = 'WEAK_BEARISH'
  else direction = 'NEUTRAL'

  const confidence = Math.min(Math.round(Math.abs(score) / 70 * 100), 95)

  const squeeze_setup = !!(
    data.shortInterestPct && data.shortInterestPct > 15 &&
    score > 0 &&
    (data.unusualCallFlow || data.aboveSma50)
  )

  let state: MarketState = 'Neutral'
  if (aboveCount === 3 && (data.rsi14 ?? 50) >= 55 && (data.macdHistogram ?? 0) > 0) {
    state = 'Expansion'
  } else if (data.aboveSma200 && (data.rsi14 ?? 50) < 55 && (data.rsi14 ?? 50) > 35) {
    state = 'Accumulation'
  } else if (!data.aboveSma50 && (data.rsi14 ?? 50) < 50 && (data.macdHistogram ?? 0) < 0) {
    state = 'Distribution'
  } else if ((data.rsi14 ?? 50) > 75 && (data.macdHistogram ?? 1) < 0) {
    state = 'Exhaustion'
  }

  const topDriver = drivers[0] ?? 'Insufficient technical data for strong conviction'
  const summary = `${ticker.toUpperCase()} — ${direction.replace('_', ' ')} (${confidence}% confidence). State: ${state}.${squeeze_setup ? ' SQUEEZE SETUP ACTIVE.' : ''} Key factor: ${topDriver}`

  return { ticker, assetType: 'stock', direction, confidence, state, drivers, summary, squeeze_setup, score, nupl: null, regime: null, regimeReason: '' }
}

// ── Format for Claude context ─────────────────────────────────────────────────

export function formatSignalBlock(signals: Signal[]): string {
  if (signals.length === 0) return ''

  const lines: string[] = [
    '## INVESTMENT COUNCIL — SIGNAL ENGINE',
    'Pre-computed directional signals based on real data. Lead your analysis with these signals.',
  ]

  for (const s of signals) {
    lines.push('')
    lines.push(`### ${s.ticker.toUpperCase()} SIGNAL: ${s.direction.replace('_', ' ')} | Confidence: ${s.confidence}%`)
    lines.push(`State: ${s.state}${s.squeeze_setup ? ' | SQUEEZE SETUP ACTIVE' : ''}`)
    if (s.drivers.length > 0) {
      lines.push('Drivers:')
      s.drivers.slice(0, 5).forEach(d => lines.push(`  - ${d}`))
    }
  }

  lines.push('')
  lines.push('Instruction: When responding, start with the signal verdict for each ticker. Then explain what the drivers mean in plain English. Do not bury the signal — it is the headline.')

  return lines.join('\n')
}
