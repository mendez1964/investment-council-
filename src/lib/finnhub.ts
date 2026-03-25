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

// Full fundamental metrics: PE, EPS, ROE, book value, debt/equity, 52wk high/low, dividends, etc.
export async function getMetrics(ticker: string) {
  const res = await fetch(`${BASE}/stock/metric?symbol=${ticker.toUpperCase()}&metric=all&token=${getKey()}`, NO_CACHE)
  if (!res.ok) throw new Error(`Finnhub metrics failed for ${ticker}: ${res.status}`)
  const data = await res.json()
  return data.metric ?? {}
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

function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null
  const slice = closes.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
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

function avgVolume(volumes: number[], period = 20): number | null {
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
  volVsAvg: number | null  // today's vol / 20-day avg vol ratio
  trendSignal: string      // plain-english summary for the AI
}

export async function getTechnicalSnapshot(ticker: string): Promise<TechnicalSnapshot | null> {
  try {
    const data = await getCandles(ticker)
    if (data.s !== 'ok' || !data.c?.length) return null

    const closes = data.c
    const volumes = data.v
    const price = closes[closes.length - 1]

    const rsi14 = rsi(closes)
    const sma20 = sma(closes, 20)
    const sma50 = sma(closes, 50)
    const sma200 = sma(closes, 200)

    const aboveSma20 = sma20 != null ? price > sma20 : null
    const aboveSma50 = sma50 != null ? price > sma50 : null
    const aboveSma200 = sma200 != null ? price > sma200 : null

    const todayVol = volumes[volumes.length - 1]
    const avgVol = avgVolume(volumes.slice(0, -1), 20) // exclude today
    const volVsAvg = avgVol && avgVol > 0 ? parseFloat((todayVol / avgVol).toFixed(2)) : null

    // Build a plain-english trend signal so the AI can score Factor 1 + Factor 2 directly
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
      ? volVsAvg >= 1.3 ? `vol ${(volVsAvg * 100).toFixed(0)}% of avg (+3 bonus pts)`
      : `vol ${(volVsAvg * 100).toFixed(0)}% of avg`
      : ''

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
      trendSignal: `${trendSignal} | ${rsiSignal}${volSignal ? ' | ' + volSignal : ''}`,
    }
  } catch {
    return null
  }
}
