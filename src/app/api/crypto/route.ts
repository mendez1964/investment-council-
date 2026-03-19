// Crypto data API — powered by CoinGecko + Alternative.me (Fear & Greed)
// Usage:
//   GET /api/crypto?action=price&coinId=bitcoin
//   GET /api/crypto?action=top10
//   GET /api/crypto?action=fear-greed
//   GET /api/crypto?action=dominance
//
// Note: coinId uses CoinGecko slugs — "bitcoin", "ethereum", "solana", "cardano", etc.
// Not the ticker symbol — use "bitcoin" not "BTC"

import { NextRequest, NextResponse } from 'next/server'
import {
  getCryptoPrice,
  getTop10ByCap,
  getFearGreedIndex,
  getBitcoinDominance,
} from '@/lib/coingecko'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')
  const coinId = searchParams.get('coinId')
  const currency = searchParams.get('currency') ?? 'usd'

  try {
    switch (action) {
      case 'price': {
        if (!coinId) return NextResponse.json({ error: 'coinId is required (e.g. "bitcoin")' }, { status: 400 })
        const data = await getCryptoPrice(coinId, currency)
        return NextResponse.json({ action, data })
      }
      case 'top10': {
        const data = await getTop10ByCap(currency)
        return NextResponse.json({ action, currency, data })
      }
      case 'fear-greed': {
        const data = await getFearGreedIndex()
        return NextResponse.json({ action, data })
      }
      case 'dominance': {
        const data = await getBitcoinDominance()
        return NextResponse.json({ action, data })
      }
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: price, top10, fear-greed, dominance' },
          { status: 400 }
        )
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
