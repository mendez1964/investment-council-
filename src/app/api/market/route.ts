// Market data API — powered by Alpha Vantage
// Usage:
//   GET /api/market?action=quote&ticker=AAPL
//   GET /api/market?action=history&ticker=AAPL&timeframe=daily
//   GET /api/market?action=overview&ticker=AAPL
//   GET /api/market?action=movers

import { NextRequest, NextResponse } from 'next/server'
import {
  getStockQuote,
  getPriceHistory,
  getCompanyOverview,
  getTopMovers,
} from '@/lib/alpha-vantage'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')
  const ticker = searchParams.get('ticker')
  const timeframe = (searchParams.get('timeframe') ?? 'daily') as 'daily' | 'weekly' | 'monthly'
  const outputsize = (searchParams.get('outputsize') ?? 'compact') as 'compact' | 'full'

  try {
    switch (action) {
      case 'quote': {
        if (!ticker) return NextResponse.json({ error: 'ticker is required' }, { status: 400 })
        const data = await getStockQuote(ticker)
        return NextResponse.json({ action, ticker: ticker.toUpperCase(), data })
      }
      case 'history': {
        if (!ticker) return NextResponse.json({ error: 'ticker is required' }, { status: 400 })
        const data = await getPriceHistory(ticker, timeframe, outputsize)
        return NextResponse.json({ action, ticker: ticker.toUpperCase(), timeframe, data })
      }
      case 'overview': {
        if (!ticker) return NextResponse.json({ error: 'ticker is required' }, { status: 400 })
        const data = await getCompanyOverview(ticker)
        return NextResponse.json({ action, ticker: ticker.toUpperCase(), data })
      }
      case 'movers': {
        const data = await getTopMovers()
        return NextResponse.json({ action, data })
      }
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: quote, history, overview, movers' },
          { status: 400 }
        )
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
