// SEC EDGAR API — company filings (no API key required)
// Usage:
//   GET /api/sec?action=filings&ticker=AAPL
//   GET /api/sec?action=insider&ticker=AAPL
//   GET /api/sec?action=13f&ticker=AAPL
//   GET /api/sec?action=8k&ticker=AAPL
//   GET /api/sec?action=search&query=Apple&formType=10-K

import { NextRequest, NextResponse } from 'next/server'
import {
  getLatestFilings,
  getInsiderTransactions,
  get13FHoldings,
  get8KEvents,
  searchFilings,
} from '@/lib/sec-edgar'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')
  const ticker = searchParams.get('ticker')
  const query = searchParams.get('query')
  const formType = searchParams.get('formType') ?? ''

  try {
    switch (action) {
      case 'filings': {
        if (!ticker) return NextResponse.json({ error: 'ticker is required' }, { status: 400 })
        const data = await getLatestFilings(ticker)
        return NextResponse.json({ action, data })
      }
      case 'insider': {
        if (!ticker) return NextResponse.json({ error: 'ticker is required' }, { status: 400 })
        const data = await getInsiderTransactions(ticker)
        return NextResponse.json({ action, data })
      }
      case '13f': {
        if (!ticker) return NextResponse.json({ error: 'ticker is required (fund ticker or manager name)' }, { status: 400 })
        const data = await get13FHoldings(ticker)
        return NextResponse.json({ action, data })
      }
      case '8k': {
        if (!ticker) return NextResponse.json({ error: 'ticker is required' }, { status: 400 })
        const data = await get8KEvents(ticker)
        return NextResponse.json({ action, data })
      }
      case 'search': {
        if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 })
        const data = await searchFilings(query, formType)
        return NextResponse.json({ action, data })
      }
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: filings, insider, 13f, 8k, search' },
          { status: 400 }
        )
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
