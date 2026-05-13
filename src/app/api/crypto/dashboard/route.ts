import { getTop10ByCap, getBitcoinDominance } from '@/lib/coingecko'
import { getCoinMetricsSnapshot } from '@/lib/coinmetrics'

// Alt Season Index: % of top 50 coins that outperformed BTC over last 90 days
// >75% = Alt Season, <25% = Bitcoin Season
async function getAltSeasonIndex(): Promise<{ index: number; alts_beating_btc: number; total_checked: number; season: string }> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=90d',
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) throw new Error('CoinGecko top50 failed')
    const coins = await res.json()

    // Find BTC 90d change
    const btc = coins.find((c: any) => c.id === 'bitcoin')
    const btc90d = btc?.price_change_percentage_90d_in_currency ?? 0

    // Count alts beating BTC (exclude BTC itself)
    const alts = coins.filter((c: any) => c.id !== 'bitcoin' && c.price_change_percentage_90d_in_currency != null)
    const beating = alts.filter((c: any) => c.price_change_percentage_90d_in_currency > btc90d)
    const index = alts.length > 0 ? Math.round((beating.length / alts.length) * 100) : 0

    let season = 'Neutral'
    if (index >= 75) season = 'Alt Season'
    else if (index >= 55) season = 'Altcoins Gaining'
    else if (index <= 25) season = 'Bitcoin Season'
    else if (index <= 45) season = 'Bitcoin Leaning'

    return { index, alts_beating_btc: beating.length, total_checked: alts.length, season }
  } catch {
    return { index: 50, alts_beating_btc: 25, total_checked: 49, season: 'Neutral' }
  }
}

// Funding rates from Binance public API (no key needed)
async function getFundingRates(): Promise<Array<{ symbol: string; rate: number; annualized: number }>> {
  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex', {
      next: { revalidate: 300 }
    })
    if (!res.ok) throw new Error('Binance funding failed')
    const data = await res.json()

    const majors = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ADAUSDT','AVAXUSDT','DOGEUSDT','LINKUSDT','DOTUSDT','MATICUSDT','LTCUSDT','ATOMUSDT','NEARUSDT','ARBUSDT']

    return data
      .filter((d: any) => majors.includes(d.symbol))
      .map((d: any) => ({
        symbol: d.symbol.replace('USDT', ''),
        rate: parseFloat(d.lastFundingRate) * 100,
        annualized: parseFloat(d.lastFundingRate) * 100 * 3 * 365,
      }))
      .sort((a: any, b: any) => Math.abs(b.rate) - Math.abs(a.rate))
  } catch {
    return []
  }
}

// Liquidations from Coinglass public endpoint
async function getLiquidations(): Promise<{ long_24h: number; short_24h: number; total_24h: number; largest: Array<{ symbol: string; amount: number; side: string }> }> {
  try {
    const res = await fetch('https://open-api.coinglass.com/public/v2/liquidation_history?time_type=h24&symbol=BTC', {
      next: { revalidate: 300 }
    })
    if (!res.ok) throw new Error('Coinglass failed')
    const data = await res.json()
    const longs = data?.data?.buyVolUsd ?? 0
    const shorts = data?.data?.sellVolUsd ?? 0
    return {
      long_24h: longs,
      short_24h: shorts,
      total_24h: longs + shorts,
      largest: []
    }
  } catch {
    return { long_24h: 0, short_24h: 0, total_24h: 0, largest: [] }
  }
}

// Transform raw CoinMetrics snapshot into the dashboard on_chain shape
function transformOnChain(snap: Awaited<ReturnType<typeof getCoinMetricsSnapshot>>) {
  function mvrvInterp(v: number | null): string {
    if (v == null) return ''
    if (v > 3.7) return 'Overheated — near cycle top'
    if (v > 2.4) return 'Elevated — bull market'
    if (v > 1.0) return 'Healthy — mid-cycle'
    if (v > 0.8) return 'Undervalued — near bottom'
    return 'Extremely undervalued'
  }

  function flowInterp(v: number | null): string {
    if (v == null) return ''
    if (v > 5000) return 'Large inflow — sell pressure'
    if (v > 1000) return 'Moderate inflow'
    if (v < -5000) return 'Large outflow — accumulation'
    if (v < -1000) return 'Moderate outflow'
    return 'Neutral flow'
  }

  // Convert hash rate from TH/s to EH/s for display
  function toEH(v: number | null): number | null {
    if (v == null) return null
    if (v > 1e5) return parseFloat((v / 1e6).toFixed(2)) // TH/s → EH/s
    return parseFloat(v.toFixed(2))
  }

  return {
    mvrv: { value: snap.mvrv, interpretation: mvrvInterp(snap.mvrv) },
    exchange_flow: { value: snap.exchangeNetFlow != null ? Math.round(snap.exchangeNetFlow) : null, interpretation: flowInterp(snap.exchangeNetFlow) },
    hash_rate: { value: toEH(snap.hashRate), interpretation: snap.hashRate != null ? 'Network security' : '' },
    active_addresses: { value: snap.activeAddresses != null ? Math.round(snap.activeAddresses) : null, interpretation: '' },
    realized_price: { value: null, interpretation: 'Not available on free tier' },
  }
}

// Transform getTop10ByCap result into the shape the page expects
function transformTop10(coins: Awaited<ReturnType<typeof getTop10ByCap>>) {
  return coins.map((c: any) => ({
    id: c.symbol?.toLowerCase() ?? '',
    symbol: c.symbol,
    name: c.name,
    current_price: c.price,
    price_change_percentage_24h: c.priceChange24h,
    market_cap: c.marketCap,
    total_volume: c.volume24h,
    image: '',
  }))
}

// Transform getBitcoinDominance result into the shape the page expects
function transformDominance(d: Awaited<ReturnType<typeof getBitcoinDominance>>) {
  return {
    btc_dominance: d.btcDominance ?? 0,
    eth_dominance: d.ethDominance ?? 0,
    total_market_cap: d.totalMarketCapUsd ?? 0,
    active_cryptocurrencies: d.activeCryptocurrencies ?? 0,
  }
}

let cache: { data: any; ts: number } | null = null
const CACHE_MS = 5 * 60 * 1000

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return Response.json({ ...cache.data, cached: true })
    }

    const [top10Raw, dominanceRaw, altSeason, fundingRates, onChainRaw, liquidations] = await Promise.allSettled([
      getTop10ByCap(),
      getBitcoinDominance(),
      getAltSeasonIndex(),
      getFundingRates(),
      getCoinMetricsSnapshot(),
      getLiquidations(),
    ])

    const result = {
      top10: top10Raw.status === 'fulfilled' ? transformTop10(top10Raw.value) : [],
      dominance: dominanceRaw.status === 'fulfilled' ? transformDominance(dominanceRaw.value) : null,
      alt_season: altSeason.status === 'fulfilled' ? altSeason.value : null,
      funding_rates: fundingRates.status === 'fulfilled' ? fundingRates.value : [],
      on_chain: onChainRaw.status === 'fulfilled' ? transformOnChain(onChainRaw.value) : null,
      liquidations: liquidations.status === 'fulfilled' ? liquidations.value : null,
      fetched_at: new Date().toISOString(),
      cached: false,
    }

    cache = { data: result, ts: Date.now() }
    return Response.json(result)
  } catch (err) {
    console.error('[crypto/dashboard]', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
