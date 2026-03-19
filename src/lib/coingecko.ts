// CoinGecko — cryptocurrency market data
// Free Demo tier works with an API key; free public tier works without one
// Docs: https://docs.coingecko.com/reference/introduction

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

// Fear & Greed Index comes from Alternative.me, not CoinGecko
const FEAR_GREED_URL = 'https://api.alternative.me/fng/?limit=1'

function getHeaders(): Record<string, string> {
  const key = process.env.COINGECKO_API_KEY
  // Demo key uses x-cg-demo-api-key header
  return key ? { 'x-cg-demo-api-key': key } : {}
}

// Get current price for any coin by its CoinGecko ID (e.g. "bitcoin", "ethereum", "solana")
// The ID is the coin's CoinGecko slug, not the ticker symbol
export async function getCryptoPrice(coinId: string, currency = 'usd') {
  const url = `${COINGECKO_BASE}/simple/price?ids=${coinId.toLowerCase()}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
  const res = await fetch(url, {
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error(`CoinGecko price request failed: ${res.status}`)
  const data = await res.json()
  const coin = data[coinId.toLowerCase()]
  if (!coin) throw new Error(`Coin "${coinId}" not found — use the CoinGecko ID (e.g. "bitcoin" not "BTC")`)
  return {
    coinId,
    currency,
    price: coin[currency],
    priceChange24h: coin[`${currency}_24h_change`],
    marketCap: coin[`${currency}_market_cap`],
    volume24h: coin[`${currency}_24h_vol`],
  }
}

// Get the top 10 cryptocurrencies ranked by market cap
export async function getTop10ByCap(currency = 'usd') {
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`
  const res = await fetch(url, {
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error(`CoinGecko top 10 request failed: ${res.status}`)
  const data = await res.json()
  return data.map((coin: any) => ({
    rank: coin.market_cap_rank,
    name: coin.name,
    symbol: coin.symbol.toUpperCase(),
    price: coin.current_price,
    priceChange24h: coin.price_change_percentage_24h,
    marketCap: coin.market_cap,
    volume24h: coin.total_volume,
    currency,
  }))
}

// Crypto Fear & Greed Index — 0 = Extreme Fear, 100 = Extreme Greed
// This is a market sentiment indicator, not a price signal
export async function getFearGreedIndex() {
  const res = await fetch(FEAR_GREED_URL)
  if (!res.ok) throw new Error(`Fear & Greed index request failed: ${res.status}`)
  const data = await res.json()
  const entry = data.data?.[0]
  if (!entry) throw new Error('Fear & Greed data unavailable')
  return {
    value: parseInt(entry.value),
    classification: entry.value_classification, // e.g. "Greed", "Fear", "Neutral"
    timestamp: entry.timestamp,
    description: `${entry.value}/100 — ${entry.value_classification}`,
  }
}

// Bitcoin dominance — what % of total crypto market cap is Bitcoin
// High dominance = investors moving to BTC safety; low = altcoin season
export async function getBitcoinDominance() {
  const url = `${COINGECKO_BASE}/global`
  const res = await fetch(url, {
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error(`CoinGecko global request failed: ${res.status}`)
  const data = await res.json()
  const pct = data.data?.market_cap_percentage
  return {
    btcDominance: pct?.btc ? parseFloat(pct.btc.toFixed(2)) : null,
    ethDominance: pct?.eth ? parseFloat(pct.eth.toFixed(2)) : null,
    totalMarketCapUsd: data.data?.total_market_cap?.usd,
    totalVolume24hUsd: data.data?.total_volume?.usd,
    activeCryptocurrencies: data.data?.active_cryptocurrencies,
  }
}
