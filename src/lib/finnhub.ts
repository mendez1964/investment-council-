// Finnhub — real-time stock market data
// Free tier: 60 API calls/minute — no daily limit
// Docs: https://finnhub.io/docs/api

const BASE = 'https://finnhub.io/api/v1'

function getKey(): string {
  const key = process.env.FINNHUB_API_KEY
  if (!key) throw new Error('FINNHUB_API_KEY is not set')
  return key
}

const NO_CACHE = { cache: 'no-store' as const }

// Real-time quote for a stock
// Returns: c (current price), d (change $), dp (change %), h (day high), l (day low), pc (prev close)
export async function getQuote(ticker: string) {
  const res = await fetch(`${BASE}/quote?symbol=${ticker.toUpperCase()}&token=${getKey()}`, NO_CACHE)
  if (!res.ok) throw new Error(`Finnhub quote failed for ${ticker}: ${res.status}`)
  return res.json()
}

// Company profile: name, sector, market cap, exchange
export async function getProfile(ticker: string) {
  const res = await fetch(`${BASE}/stock/profile2?symbol=${ticker.toUpperCase()}&token=${getKey()}`, NO_CACHE)
  if (!res.ok) throw new Error(`Finnhub profile failed for ${ticker}: ${res.status}`)
  return res.json()
}

// Full fundamental metrics: PE, EPS, ROE, book value, debt/equity, 52wk high/low, short interest, etc.
export async function getMetrics(ticker: string) {
  const res = await fetch(`${BASE}/stock/metric?symbol=${ticker.toUpperCase()}&metric=all&token=${getKey()}`, NO_CACHE)
  if (!res.ok) throw new Error(`Finnhub metrics failed for ${ticker}: ${res.status}`)
  const data = await res.json()
  return data.metric ?? {}
}

// Earnings history — last N quarters to compute beat rate
export async function getEarningsHistory(ticker: string, quarters = 8): Promise<{ date: string; epsEstimate: number | null; epsActual: number | null; beat: boolean | null }[]> {
  const to   = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - quarters * 92 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const res  = await fetch(`${BASE}/stock/earnings?symbol=${ticker.toUpperCase()}&token=${getKey()}`, NO_CACHE)
  if (!res.ok) return []
  const data: any[] = await res.json()
  return (Array.isArray(data) ? data : [])
    .filter(e => e.period >= from && e.period <= to)
    .slice(0, quarters)
    .map(e => ({
      date:        e.period,
      epsEstimate: e.estimate ?? null,
      epsActual:   e.actual   ?? null,
      beat:        e.estimate != null && e.actual != null ? e.actual >= e.estimate : null,
    }))
}

// Intraday candles for VWAP computation (resolution in minutes: 1, 5, 15, 30, 60)
// NOTE: requires Finnhub paid plan for 1-min data; fails gracefully on free tier
export async function getIntradayCandles(ticker: string, resolution = 1, daysBack = 1) {
  const to   = Math.floor(Date.now() / 1000)
  const from = to - daysBack * 24 * 60 * 60
  const res  = await fetch(
    `${BASE}/stock/candle?symbol=${ticker.toUpperCase()}&resolution=${resolution}&from=${from}&to=${to}&token=${getKey()}`,
    NO_CACHE
  )
  if (!res.ok) throw new Error(`Finnhub intraday candles failed for ${ticker}: ${res.status}`)
  return res.json() as Promise<{ c: number[]; h: number[]; l: number[]; o: number[]; s: string; t: number[]; v: number[] }>
}

// Insider transactions — who is buying and selling at the company
export async function getInsiderSentiment(ticker: string) {
  const res = await fetch(`${BASE}/stock/insider-sentiment?symbol=${ticker.toUpperCase()}&from=2024-01-01&token=${getKey()}`, NO_CACHE)
  if (!res.ok) throw new Error(`Finnhub insider sentiment failed for ${ticker}: ${res.status}`)
  return res.json()
}

// Analyst price targets
export async function getPriceTarget(ticker: string) {
  const res = await fetch(`${BASE}/stock/price-target?symbol=${ticker.toUpperCase()}&token=${getKey()}`, NO_CACHE)
  if (!res.ok) throw new Error(`Finnhub price target failed for ${ticker}: ${res.status}`)
  return res.json()
}

// Latest company news
export async function getCompanyNews(ticker: string) {
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const res = await fetch(`${BASE}/company-news?symbol=${ticker.toUpperCase()}&from=${weekAgo}&to=${today}&token=${getKey()}`, NO_CACHE)
  if (!res.ok) throw new Error(`Finnhub news failed for ${ticker}: ${res.status}`)
  return res.json()
}

// Recommendation trends: buy/hold/sell analyst counts
export async function getRecommendations(ticker: string) {
  const res = await fetch(`${BASE}/stock/recommendation?symbol=${ticker.toUpperCase()}&token=${getKey()}`, NO_CACHE)
  if (!res.ok) throw new Error(`Finnhub recommendations failed for ${ticker}: ${res.status}`)
  return res.json()
}

// Earnings calendar — upcoming and recent earnings reports
// Returns companies reporting earnings in the given date range
export async function getEarningsCalendar(daysAhead = 7): Promise<EarningsEvent[]> {
  const from = new Date().toISOString().split('T')[0]
  const to = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const res = await fetch(
    `${BASE}/calendar/earnings?from=${from}&to=${to}&token=${getKey()}`,
    { next: { revalidate: 3600 } } // cache 1 hour
  )
  if (!res.ok) throw new Error(`Finnhub earnings calendar failed: ${res.status}`)
  const data = await res.json()
  return (data.earningsCalendar ?? []) as EarningsEvent[]
}

export interface EarningsEvent {
  symbol: string
  date: string
  hour: 'bmo' | 'amc' | 'dmh' | string  // before market open, after market close, during hours
  epsEstimate: number | null
  epsActual: number | null
  revenueEstimate: number | null
  revenueActual: number | null
  quarter: number
  year: number
}

// General market news by category
export async function getMarketNews(category: 'general' | 'forex' | 'crypto' | 'merger' = 'general') {
  const res = await fetch(`${BASE}/news?category=${category}&token=${getKey()}`)
  if (!res.ok) throw new Error(`Finnhub market news failed: ${res.status}`)
  return res.json()
}

// IPO Calendar — upcoming IPOs in the next N days
export async function getIPOCalendar(daysAhead = 90): Promise<IPOEvent[]> {
  const now = new Date()
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const to = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
  const toStr = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`
  const res = await fetch(
    `${BASE}/calendar/ipo?from=${from}&to=${toStr}&token=${getKey()}`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) throw new Error(`Finnhub IPO calendar failed: ${res.status}`)
  const data = await res.json()
  return (data.ipoCalendar ?? []) as IPOEvent[]
}

export interface IPOEvent {
  date: string
  exchange: string
  name: string
  numberOfShares: number
  price: string       // e.g. "18.00-20.00" or "20.00"
  status: string      // "expected" | "priced" | "filed" | "withdrawn"
  symbol: string
  totalSharesValue: number
}

// Format earnings calendar for Claude context
export function formatEarningsCalendar(events: EarningsEvent[]): string {
  if (!events.length) return ''

  // Filter to notable names only — skip tiny/unknown tickers
  const byDate: Record<string, EarningsEvent[]> = {}
  events.forEach(e => {
    if (!byDate[e.date]) byDate[e.date] = []
    byDate[e.date].push(e)
  })

  const lines: string[] = []
  Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).forEach(([date, evts]) => {
    const label = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const items = evts.slice(0, 20).map(e => {
      const time = e.hour === 'bmo' ? 'BMO' : e.hour === 'amc' ? 'AMC' : e.hour === 'dmh' ? 'DMH' : e.hour?.toUpperCase() ?? '—'
      const eps = e.epsEstimate != null ? ` | EPS est: $${e.epsEstimate.toFixed(2)}` : ''
      return `  ${e.symbol} (${time})${eps}`
    })
    lines.push(`${label}:\n${items.join('\n')}`)
  })

  return `EARNINGS CALENDAR — Next ${Object.keys(byDate).length} days (Finnhub):\nBMO=Before Market Open  AMC=After Market Close  DMH=During Market Hours\n${lines.join('\n')}`
}

// ─── Technical Indicators ─────────────────────────────────────────────────────

// Fetch daily OHLCV candles — one call returns up to 250 days of history
export async function getCandles(ticker: string, daysBack = 260) {
  const to = Math.floor(Date.now() / 1000)
  const from = to - daysBack * 24 * 60 * 60
  const res = await fetch(
    `${BASE}/stock/candle?symbol=${ticker.toUpperCase()}&resolution=D&from=${from}&to=${to}&token=${getKey()}`,
    NO_CACHE
  )
  if (!res.ok) throw new Error(`Finnhub candles failed for ${ticker}: ${res.status}`)
  return res.json() as Promise<{ c: number[]; h: number[]; l: number[]; o: number[]; s: string; t: number[]; v: number[] }>
}

// Compute VWAP from intraday candles (typical price = (H+L+C)/3)
export function computeVWAP(candles: { h: number[]; l: number[]; c: number[]; v: number[] }): number | null {
  if (!candles.c?.length) return null
  let sumPV = 0, sumV = 0
  for (let i = 0; i < candles.c.length; i++) {
    const tp = (candles.h[i] + candles.l[i] + candles.c[i]) / 3
    sumPV += tp * candles.v[i]
    sumV  += candles.v[i]
  }
  return sumV > 0 ? parseFloat((sumPV / sumV).toFixed(2)) : null
}

function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null
  const slice = closes.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

function ema(closes: number[], period: number): number | null {
  if (closes.length < period) return null
  const k = 2 / (period + 1)
  let val = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < closes.length; i++) val = closes[i] * k + val * (1 - k)
  return val
}

function macd(closes: number[]): { macdLine: number; signalLine: number; histogram: number } | null {
  if (closes.length < 35) return null // need 26 + 9 minimum
  const ema12 = ema(closes, 12)
  const ema26 = ema(closes, 26)
  if (ema12 == null || ema26 == null) return null
  // Build MACD series from each point to compute EMA9 of MACD
  const macdSeries: number[] = []
  for (let i = 26; i <= closes.length; i++) {
    const e12 = ema(closes.slice(0, i), 12)
    const e26 = ema(closes.slice(0, i), 26)
    if (e12 != null && e26 != null) macdSeries.push(e12 - e26)
  }
  if (macdSeries.length < 9) return null
  const signal = ema(macdSeries, 9)
  if (signal == null) return null
  const macdLine = macdSeries[macdSeries.length - 1]
  return {
    macdLine: parseFloat(macdLine.toFixed(4)),
    signalLine: parseFloat(signal.toFixed(4)),
    histogram: parseFloat((macdLine - signal).toFixed(4)),
  }
}

function atr(highs: number[], lows: number[], closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null
  const trs: number[] = []
  for (let i = closes.length - period; i < closes.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    )
    trs.push(tr)
  }
  return parseFloat((trs.reduce((a, b) => a + b, 0) / trs.length).toFixed(4))
}

function bollingerBands(closes: number[], period = 20, multiplier = 2): { upper: number; middle: number; lower: number; pctB: number } | null {
  if (closes.length < period) return null
  const slice = closes.slice(-period)
  const mid = slice.reduce((a, b) => a + b, 0) / period
  const variance = slice.reduce((sum, c) => sum + Math.pow(c - mid, 2), 0) / period
  const stdDev = Math.sqrt(variance)
  const upper = mid + multiplier * stdDev
  const lower = mid - multiplier * stdDev
  const price = closes[closes.length - 1]
  const pctB = stdDev > 0 ? parseFloat(((price - lower) / (upper - lower) * 100).toFixed(1)) : 50
  return {
    upper: parseFloat(upper.toFixed(2)),
    middle: parseFloat(mid.toFixed(2)),
    lower: parseFloat(lower.toFixed(2)),
    pctB,
  }
}

function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null
  let gains = 0, losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff
    else losses -= diff
  }
  if (losses === 0) return 100
  const rs = gains / losses
  return parseFloat((100 - 100 / (1 + rs)).toFixed(1))
}

function avgVolume(volumes: number[], period = 30): number | null {
  if (volumes.length < period) return null
  const slice = volumes.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

export interface TechnicalSnapshot {
  ticker: string
  price: number
  rsi14: number | null
  sma20: number | null
  sma50: number | null
  sma200: number | null
  aboveSma20: boolean | null
  aboveSma50: boolean | null
  aboveSma200: boolean | null
  volVsAvg: number | null       // today's vol / 30-day avg vol ratio
  atr14: number | null          // Average True Range (14-day)
  macdLine: number | null       // MACD line (EMA12 - EMA26)
  macdSignal: number | null     // Signal line (EMA9 of MACD)
  macdHistogram: number | null  // Histogram (MACD - Signal) — positive = bullish momentum building
  bbUpper: number | null        // Bollinger Band upper (SMA20 + 2σ)
  bbLower: number | null        // Bollinger Band lower (SMA20 - 2σ)
  bbPctB: number | null         // %B: >80 = overbought, <20 = oversold, 50 = at midband
  trendSignal: string           // plain-english summary for the AI
}

export interface PivotLevels {
  ticker: string
  price: number
  prevHigh: number
  prevLow: number
  prevClose: number
  pp: number        // Pivot Point = (H+L+C)/3
  r1: number        // Resistance 1
  r2: number        // Resistance 2
  s1: number        // Support 1
  s2: number        // Support 2
  swingHigh20: number
  swingLow20: number
  fib618: number    // 61.8% retracement from 20-day swing high
  fib500: number    // 50.0% retracement
  fib382: number    // 38.2% retracement
}

export async function getPivotLevels(ticker: string): Promise<PivotLevels | null> {
  try {
    const data = await getCandles(ticker, 30)
    if (data.s !== 'ok' || !data.c?.length || data.c.length < 3) return null

    const closes = data.c
    const highs = data.h
    const lows = data.l

    // Second-to-last candle = previous completed day
    const prevIdx = closes.length - 2
    const prevHigh = highs[prevIdx]
    const prevLow = lows[prevIdx]
    const prevClose = closes[prevIdx]
    const price = closes[closes.length - 1]

    // Standard floor trader pivot points
    const pp = (prevHigh + prevLow + prevClose) / 3
    const r1 = 2 * pp - prevLow
    const r2 = pp + (prevHigh - prevLow)
    const s1 = 2 * pp - prevHigh
    const s2 = pp - (prevHigh - prevLow)

    // 20-day swing high/low for Fibonacci retracements
    const start = Math.max(0, closes.length - 21)
    const swingHigh20 = Math.max(...highs.slice(start, -1))
    const swingLow20 = Math.min(...lows.slice(start, -1))
    const range = swingHigh20 - swingLow20

    const fib618 = swingHigh20 - range * 0.618
    const fib500 = swingHigh20 - range * 0.500
    const fib382 = swingHigh20 - range * 0.382

    const fmt = (n: number) => parseFloat(n.toFixed(2))

    return {
      ticker: ticker.toUpperCase(),
      price: fmt(price),
      prevHigh: fmt(prevHigh),
      prevLow: fmt(prevLow),
      prevClose: fmt(prevClose),
      pp: fmt(pp),
      r1: fmt(r1),
      r2: fmt(r2),
      s1: fmt(s1),
      s2: fmt(s2),
      swingHigh20: fmt(swingHigh20),
      swingLow20: fmt(swingLow20),
      fib618: fmt(fib618),
      fib500: fmt(fib500),
      fib382: fmt(fib382),
    }
  } catch {
    return null
  }
}

export async function getTechnicalSnapshot(ticker: string): Promise<TechnicalSnapshot | null> {
  try {
    const data = await getCandles(ticker)
    if (data.s !== 'ok' || !data.c?.length) return null

    const closes = data.c
    const highs  = data.h
    const lows   = data.l
    const volumes = data.v
    const price = closes[closes.length - 1]

    const rsi14 = rsi(closes)
    const sma20 = sma(closes, 20)
    const sma50 = sma(closes, 50)
    const sma200 = sma(closes, 200)

    const aboveSma20 = sma20 != null ? price > sma20 : null
    const aboveSma50 = sma50 != null ? price > sma50 : null
    const aboveSma200 = sma200 != null ? price > sma200 : null

    // Volume vs 30-day average (excluding today)
    const todayVol = volumes[volumes.length - 1]
    const avgVol = avgVolume(volumes.slice(0, -1), 30)
    const volVsAvg = avgVol && avgVol > 0 ? parseFloat((todayVol / avgVol).toFixed(2)) : null

    // MACD (12, 26, 9)
    const macdResult = macd(closes)

    // ATR (14-day)
    const atr14 = atr(highs, lows, closes, 14)

    // Bollinger Bands (20, 2)
    const bb = bollingerBands(closes, 20, 2)

    // Build plain-english trend signal
    const maCount = [aboveSma20, aboveSma50, aboveSma200].filter(v => v === true).length
    const belowCount = [aboveSma20, aboveSma50, aboveSma200].filter(v => v === false).length
    let trendSignal = ''
    if (maCount === 3) trendSignal = 'above all 3 MAs (bullish trend — Factor1=20)'
    else if (maCount === 2) trendSignal = 'above 20+50-day MA, below 200 (moderate trend — Factor1=15)'
    else if (maCount === 1 && aboveSma20) trendSignal = 'above 20-day MA only (weak trend — Factor1=10)'
    else if (belowCount === 3) trendSignal = 'below all 3 MAs (bearish trend — Factor1=20 for short)'
    else if (belowCount === 2) trendSignal = 'below 20+50-day MA (moderate bearish — Factor1=15 for short)'
    else trendSignal = 'mixed MA signals (choppy — Factor1=5)'

    const rsiSignal = rsi14 != null
      ? rsi14 >= 50 && rsi14 <= 65 ? `RSI ${rsi14} (momentum sweet spot — Factor2 bullish=20)`
      : rsi14 > 65 && rsi14 <= 72 ? `RSI ${rsi14} (extended — Factor2 bullish=14)`
      : rsi14 > 72 ? `RSI ${rsi14} (overbought — Factor2 bullish=5)`
      : rsi14 >= 35 && rsi14 < 50 ? `RSI ${rsi14} (weak — Factor2 bullish=6, bearish=20)`
      : rsi14 >= 28 ? `RSI ${rsi14} (oversold range — Factor2 bearish=14)`
      : `RSI ${rsi14} (deeply oversold — Factor2 bearish=5)`
      : 'RSI unavailable'

    const volSignal = volVsAvg != null
      ? volVsAvg >= 1.3 ? `vol ${(volVsAvg * 100).toFixed(0)}% of 30d avg (+3 bonus pts)`
      : `vol ${(volVsAvg * 100).toFixed(0)}% of 30d avg`
      : ''

    const macdSignal = macdResult != null
      ? macdResult.histogram > 0
        ? `MACD bullish (line=${macdResult.macdLine} sig=${macdResult.macdSignal} hist=+${macdResult.histogram})`
        : `MACD bearish (line=${macdResult.macdLine} sig=${macdResult.macdSignal} hist=${macdResult.histogram})`
      : ''

    const bbSignal = bb != null
      ? bb.pctB > 80 ? `BB %B=${bb.pctB} (near upper band — overbought)`
      : bb.pctB < 20 ? `BB %B=${bb.pctB} (near lower band — oversold/support)`
      : `BB %B=${bb.pctB} (mid-range)`
      : ''

    const atrSignal = atr14 != null ? `ATR14=$${atr14} (${price > 0 ? ((atr14 / price) * 100).toFixed(1) : '?'}% daily range)` : ''

    const parts = [trendSignal, rsiSignal, volSignal, macdSignal, bbSignal, atrSignal].filter(Boolean)

    return {
      ticker: ticker.toUpperCase(),
      price,
      rsi14,
      sma20: sma20 ? parseFloat(sma20.toFixed(2)) : null,
      sma50: sma50 ? parseFloat(sma50.toFixed(2)) : null,
      sma200: sma200 ? parseFloat(sma200.toFixed(2)) : null,
      aboveSma20,
      aboveSma50,
      aboveSma200,
      volVsAvg,
      atr14,
      macdLine:      macdResult?.macdLine      ?? null,
      macdSignal:    macdResult?.signalLine     ?? null,
      macdHistogram: macdResult?.histogram      ?? null,
      bbUpper:       bb?.upper                  ?? null,
      bbLower:       bb?.lower                  ?? null,
      bbPctB:        bb?.pctB                   ?? null,
      trendSignal: parts.join(' | '),
    }
  } catch {
    return null
  }
}
