// GET /api/crypto/coin?id=bitcoin
// Returns all data needed for a per-coin research page:
// price, market data, funding rate, signal, recent news

import { createServerSupabaseClient } from '@/lib/supabase'
import { getFundingRate } from '@/lib/binance'
import { getCoinMetricsSnapshot } from '@/lib/coinmetrics'
import { getFearGreedIndex } from '@/lib/coingecko'
import { computeCryptoSignal } from '@/lib/signal-engine'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

function cgHeaders(): Record<string, string> {
  const key = process.env.COINGECKO_API_KEY
  return key ? { 'x-cg-demo-api-key': key } : {}
}

// CoinGecko ID → Binance perp symbol
const COIN_ID_TO_SYMBOL: Record<string, string> = {
  bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', ripple: 'XRP',
  cardano: 'ADA', dogecoin: 'DOGE', 'avalanche-2': 'AVAX', polkadot: 'DOT',
  chainlink: 'LINK', 'matic-network': 'MATIC', arbitrum: 'ARB', optimism: 'OP',
  binancecoin: 'BNB', near: 'NEAR', cosmos: 'ATOM', litecoin: 'LTC',
  uniswap: 'UNI', 'injective-protocol': 'INJ', aptos: 'APT', sui: 'SUI',
  celestia: 'TIA', 'hedera-hashgraph': 'HBAR', algorand: 'ALGO',
  stellar: 'XLM', tron: 'TRX', vechain: 'VET', monero: 'XMR',
  'the-open-network': 'TON', 'shiba-inu': 'SHIB', pepe: 'PEPE',
  dogwifcoin: 'WIF', bonk: 'BONK', 'fetch-ai': 'FET',
  'render-token': 'RENDER', 'the-graph': 'GRT', 'immutable-x': 'IMX',
  'lido-dao': 'LDO', aave: 'AAVE', 'curve-dao-token': 'CRV', maker: 'MKR',
}

// Cache per coin ID — 5 minutes
const cache = new Map<string, { data: any; ts: number }>()
const CACHE_MS = 5 * 60 * 1000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const coinId = searchParams.get('id')?.toLowerCase()

  if (!coinId) {
    return Response.json({ error: 'id is required (e.g. ?id=bitcoin)' }, { status: 400 })
  }

  const cached = cache.get(coinId)
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return Response.json({ ...cached.data, cached: true })
  }

  try {
    const binanceSymbol = COIN_ID_TO_SYMBOL[coinId] ?? coinId.toUpperCase().slice(0, 6)
    const isBTC = coinId === 'bitcoin'

    // Fetch all data in parallel
    const [marketRes, fg, fundingRate, coinMetrics] = await Promise.all([
      fetch(
        `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${coinId}&price_change_percentage=24h,7d`,
        { headers: cgHeaders(), next: { revalidate: 300 } }
      ).then(r => r.ok ? r.json() : []).catch(() => []),
      getFearGreedIndex().catch(() => null),
      getFundingRate(binanceSymbol).catch(() => null),
      isBTC ? getCoinMetricsSnapshot().catch(() => null) : Promise.resolve(null),
    ])

    const market = marketRes?.[0] ?? null

    if (!market) {
      return Response.json({ error: `Coin "${coinId}" not found` }, { status: 404 })
    }

    // Compute signal
    const signal = computeCryptoSignal(binanceSymbol, {
      mvrv: coinMetrics?.mvrv ?? null,
      exchangeNetFlow: coinMetrics?.exchangeNetFlow ?? null,
      fundingRate: fundingRate ?? null,
      longLiqUsd: 0,
      shortLiqUsd: 0,
      fearGreed: fg?.value ?? 50,
      priceChange24h: market.price_change_percentage_24h ?? 0,
      btcDominance: null,
    })

    // Pull recent coin-specific news from Supabase
    let news: any[] = []
    try {
      const db = createServerSupabaseClient()
      const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
      const symbol = binanceSymbol.toUpperCase()
      const { data } = await db
        .from('market_news')
        .select('headline, summary, impact_level, impact_direction, affected_tickers, source, created_at')
        .gte('created_at', cutoff)
        .eq('is_price_moving', true)
        .order('created_at', { ascending: false })
        .limit(50)

      news = (data ?? []).filter((n: any) =>
        n.affected_tickers?.some((t: string) =>
          t.toUpperCase() === symbol ||
          t.toLowerCase().includes(coinId.split('-')[0])
        )
      ).slice(0, 8)
    } catch { /* news is optional */ }

    const result = {
      id: coinId,
      symbol: market.symbol?.toUpperCase() ?? binanceSymbol,
      name: market.name,
      image: market.image ?? '',
      price: market.current_price,
      change24h: market.price_change_percentage_24h ?? 0,
      change7d: market.price_change_percentage_7d_in_currency ?? null,
      marketCap: market.market_cap,
      volume24h: market.total_volume,
      high24h: market.high_24h,
      low24h: market.low_24h,
      circulatingSupply: market.circulating_supply,
      ath: market.ath,
      athDate: market.ath_date,
      fundingRate,
      fearGreed: fg ?? null,
      signal,
      news,
      fetched_at: new Date().toISOString(),
    }

    cache.set(coinId, { data: result, ts: Date.now() })
    return Response.json({ ...result, cached: false })

  } catch (err) {
    console.error('[crypto/coin]', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
