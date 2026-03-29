// Investment Council — Signal Engine API
// GET /api/signals?ticker=BTC&type=crypto
// GET /api/signals?ticker=NVDA&type=stock
//
// Returns a pre-computed directional signal for the given asset.
// Used by the crypto dashboard Command Center and any component needing a signal.

import { getCoinMetricsSnapshot } from '@/lib/coinmetrics'
import { getFearGreedIndex, getBitcoinDominance, getCryptoPrice } from '@/lib/coingecko'
import { getTechnicalSnapshot, getMetrics } from '@/lib/finnhub'
import { getFundingRate } from '@/lib/binance'
import {
  computeCryptoSignal,
  computeStockSignal,
  formatSignalBlock,
  type Signal,
} from '@/lib/signal-engine'

// CoinGecko ID → Binance symbol mapping for funding rate lookup
const COIN_ID_TO_SYMBOL: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  ripple: 'XRP',
  cardano: 'ADA',
  dogecoin: 'DOGE',
  'avalanche-2': 'AVAX',
  polkadot: 'DOT',
  chainlink: 'LINK',
  'matic-network': 'MATIC',
  arbitrum: 'ARB',
  optimism: 'OP',
  'binancecoin': 'BNB',
  'near': 'NEAR',
  'cosmos': 'ATOM',
  'litecoin': 'LTC',
  'uniswap': 'UNI',
  'injective-protocol': 'INJ',
}

// In-memory cache per ticker — 5 minutes
const cache = new Map<string, { signal: Signal; ts: number }>()
const CACHE_MS = 5 * 60 * 1000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')?.toUpperCase()
  const type = searchParams.get('type') as 'crypto' | 'stock' | null

  if (!ticker || !type) {
    return Response.json({ error: 'ticker and type are required' }, { status: 400 })
  }

  const cacheKey = `${type}:${ticker}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return Response.json({ signal: cached.signal, cached: true })
  }

  try {
    let signal: Signal

    if (type === 'crypto') {
      // Resolve CoinGecko ID from ticker symbol
      const coinId = Object.entries(COIN_ID_TO_SYMBOL).find(([, sym]) => sym === ticker)?.[0]
        ?? ticker.toLowerCase()
      const binanceSymbol = COIN_ID_TO_SYMBOL[coinId] ?? ticker

      const [coinMetrics, fg, priceData, fundingRate] = await Promise.all([
        getCoinMetricsSnapshot().catch(() => null),
        getFearGreedIndex().catch(() => null),
        getCryptoPrice(coinId).catch(() => null),
        getFundingRate(binanceSymbol).catch(() => null),
      ])

      signal = computeCryptoSignal(ticker, {
        mvrv: coinMetrics?.mvrv ?? null,
        exchangeNetFlow: coinMetrics?.exchangeNetFlow ?? null,
        fundingRate: fundingRate ?? null,
        longLiqUsd: 0,    // Coinglass requires paid key — skip for now
        shortLiqUsd: 0,
        fearGreed: fg?.value ?? 50,
        priceChange24h: (priceData as any)?.priceChange24h ?? 0,
        btcDominance: null,
      })

    } else {
      // Stock signal
      const [snapshot, metrics] = await Promise.all([
        getTechnicalSnapshot(ticker).catch(() => null),
        getMetrics(ticker).catch(() => null),
      ])

      if (!snapshot) {
        return Response.json({ error: 'No technical data available for this ticker' }, { status: 404 })
      }

      // Short interest: try multiple field names Finnhub may return
      const shortInterestPct = metrics?.shortPercent
        ?? metrics?.shortInterestPercentOutFloat
        ?? (metrics?.shortInterest && metrics?.sharesOutstanding
          ? (metrics.shortInterest / metrics.sharesOutstanding) * 100
          : null)

      signal = computeStockSignal(ticker, {
        aboveSma20: snapshot.aboveSma20,
        aboveSma50: snapshot.aboveSma50,
        aboveSma200: snapshot.aboveSma200,
        rsi14: snapshot.rsi14,
        macdHistogram: snapshot.macdHistogram,
        volVsAvg: snapshot.volVsAvg,
        shortInterestPct: shortInterestPct ?? null,
        unusualCallFlow: false,   // Requires Tradier options chain — see /api/signals/options
        unusualPutFlow: false,
        gexPositive: null,
        vix: null,
      })
    }

    cache.set(cacheKey, { signal, ts: Date.now() })

    return Response.json({
      signal,
      formatted: formatSignalBlock([signal]),
      cached: false,
    })

  } catch (err) {
    console.error('[signals]', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
