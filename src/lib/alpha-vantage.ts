// Alpha Vantage — stock market data
// Docs: https://www.alphavantage.co/documentation/

const BASE_URL = 'https://www.alphavantage.co/query'

function getKey(): string {
  const key = process.env.ALPHA_VANTAGE_API_KEY
  if (!key) throw new Error('ALPHA_VANTAGE_API_KEY is not set in environment variables')
  return key
}

// Get the current price and basic stats for any stock ticker (e.g. "AAPL", "TSLA")
export async function getStockQuote(ticker: string) {
  const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${ticker.toUpperCase()}&apikey=${getKey()}`
  const res = await fetch(url, { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`Alpha Vantage quote request failed: ${res.status}`)
  const data = await res.json()
  if (data['Note']) throw new Error('Alpha Vantage rate limit hit — try again in a minute')
  if (data['Error Message']) throw new Error(`Alpha Vantage error: ${data['Error Message']}`)
  return data['Global Quote']
}

// Get daily, weekly, or monthly price history for a ticker
export async function getPriceHistory(
  ticker: string,
  timeframe: 'daily' | 'weekly' | 'monthly' = 'daily',
  outputsize: 'compact' | 'full' = 'compact'
) {
  const funcMap = {
    daily: 'TIME_SERIES_DAILY',
    weekly: 'TIME_SERIES_WEEKLY',
    monthly: 'TIME_SERIES_MONTHLY',
  }
  const url = `${BASE_URL}?function=${funcMap[timeframe]}&symbol=${ticker.toUpperCase()}&outputsize=${outputsize}&apikey=${getKey()}`
  const res = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`Alpha Vantage history request failed: ${res.status}`)
  const data = await res.json()
  if (data['Note']) throw new Error('Alpha Vantage rate limit hit — try again in a minute')
  if (data['Error Message']) throw new Error(`Alpha Vantage error: ${data['Error Message']}`)
  return data
}

// Get company fundamentals: P/E ratio, revenue, market cap, description, etc.
export async function getCompanyOverview(ticker: string) {
  const url = `${BASE_URL}?function=OVERVIEW&symbol=${ticker.toUpperCase()}&apikey=${getKey()}`
  const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`Alpha Vantage overview request failed: ${res.status}`)
  const data = await res.json()
  if (data['Note']) throw new Error('Alpha Vantage rate limit hit — try again in a minute')
  return data
}

// Get today's top gainers, top losers, and most actively traded stocks
export async function getTopMovers() {
  const url = `${BASE_URL}?function=TOP_GAINERS_LOSERS&apikey=${getKey()}`
  const res = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`Alpha Vantage movers request failed: ${res.status}`)
  const data = await res.json()
  if (data['Note']) throw new Error('Alpha Vantage rate limit hit — try again in a minute')
  return data
}
