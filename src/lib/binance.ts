// Binance public API — no key required for these endpoints
// Futures/perpetuals data: funding rates, open interest

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
let fundingCache: { data: Map<string, number>; ts: number } | null = null

// Get funding rate for a specific symbol (e.g. 'BTC', 'ETH', 'SOL')
// Returns percentage, e.g. -0.01 means shorts paying 0.01% every 8h
export async function getFundingRate(symbol: string): Promise<number | null> {
  const binanceSymbol = symbol.toUpperCase() + 'USDT'
  try {
    // Use cache if warm
    if (fundingCache && Date.now() - fundingCache.ts < CACHE_DURATION) {
      return fundingCache.data.get(binanceSymbol) ?? null
    }
    const res = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex', {
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const data: Array<{ symbol: string; lastFundingRate: string }> = await res.json()
    const map = new Map<string, number>()
    for (const item of data) {
      map.set(item.symbol, parseFloat(item.lastFundingRate) * 100)
    }
    fundingCache = { data: map, ts: Date.now() }
    return map.get(binanceSymbol) ?? null
  } catch {
    return null
  }
}

// Get funding rates for a list of symbols — returns a map of symbol → rate
export async function getFundingRates(symbols: string[]): Promise<Map<string, number>> {
  try {
    if (fundingCache && Date.now() - fundingCache.ts < CACHE_DURATION) {
      const result = new Map<string, number>()
      for (const s of symbols) {
        const rate = fundingCache.data.get(s.toUpperCase() + 'USDT')
        if (rate != null) result.set(s.toUpperCase(), rate)
      }
      return result
    }
    const res = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex', {
      next: { revalidate: 300 },
    })
    if (!res.ok) return new Map()
    const data: Array<{ symbol: string; lastFundingRate: string }> = await res.json()
    const fullMap = new Map<string, number>()
    for (const item of data) {
      fullMap.set(item.symbol, parseFloat(item.lastFundingRate) * 100)
    }
    fundingCache = { data: fullMap, ts: Date.now() }
    const result = new Map<string, number>()
    for (const s of symbols) {
      const rate = fullMap.get(s.toUpperCase() + 'USDT')
      if (rate != null) result.set(s.toUpperCase(), rate)
    }
    return result
  } catch {
    return new Map()
  }
}
