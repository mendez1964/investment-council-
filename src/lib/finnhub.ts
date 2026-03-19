// Finnhub — real-time stock market data
// Free tier: 60 API calls/minute — no daily limit
// Docs: https://finnhub.io/docs/api

const BASE = 'https://finnhub.io/api/v1'

function getKey(): string {
  const key = process.env.FINNHUB_API_KEY
  if (!key) throw new Error('FINNHUB_API_KEY is not set')
  return key
}

// Real-time quote for a stock
// Returns: c (current price), d (change $), dp (change %), h (day high), l (day low), pc (prev close)
export async function getQuote(ticker: string) {
  const res = await fetch(`${BASE}/quote?symbol=${ticker.toUpperCase()}&token=${getKey()}`)
  if (!res.ok) throw new Error(`Finnhub quote failed for ${ticker}: ${res.status}`)
  return res.json()
}

// Company profile: name, sector, market cap, exchange
export async function getProfile(ticker: string) {
  const res = await fetch(`${BASE}/stock/profile2?symbol=${ticker.toUpperCase()}&token=${getKey()}`)
  if (!res.ok) throw new Error(`Finnhub profile failed for ${ticker}: ${res.status}`)
  return res.json()
}

// Full fundamental metrics: PE, EPS, ROE, book value, debt/equity, 52wk high/low, dividends, etc.
export async function getMetrics(ticker: string) {
  const res = await fetch(`${BASE}/stock/metric?symbol=${ticker.toUpperCase()}&metric=all&token=${getKey()}`)
  if (!res.ok) throw new Error(`Finnhub metrics failed for ${ticker}: ${res.status}`)
  const data = await res.json()
  return data.metric ?? {}
}

// Insider transactions — who is buying and selling at the company
export async function getInsiderSentiment(ticker: string) {
  const res = await fetch(`${BASE}/stock/insider-sentiment?symbol=${ticker.toUpperCase()}&from=2024-01-01&token=${getKey()}`)
  if (!res.ok) throw new Error(`Finnhub insider sentiment failed for ${ticker}: ${res.status}`)
  return res.json()
}

// Analyst price targets
export async function getPriceTarget(ticker: string) {
  const res = await fetch(`${BASE}/stock/price-target?symbol=${ticker.toUpperCase()}&token=${getKey()}`)
  if (!res.ok) throw new Error(`Finnhub price target failed for ${ticker}: ${res.status}`)
  return res.json()
}

// Latest company news
export async function getCompanyNews(ticker: string) {
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const res = await fetch(`${BASE}/company-news?symbol=${ticker.toUpperCase()}&from=${weekAgo}&to=${today}&token=${getKey()}`)
  if (!res.ok) throw new Error(`Finnhub news failed for ${ticker}: ${res.status}`)
  return res.json()
}

// Recommendation trends: buy/hold/sell analyst counts
export async function getRecommendations(ticker: string) {
  const res = await fetch(`${BASE}/stock/recommendation?symbol=${ticker.toUpperCase()}&token=${getKey()}`)
  if (!res.ok) throw new Error(`Finnhub recommendations failed for ${ticker}: ${res.status}`)
  return res.json()
}
