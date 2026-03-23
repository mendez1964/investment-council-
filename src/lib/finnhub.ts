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
