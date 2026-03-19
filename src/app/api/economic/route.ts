// Economic data API — powered by FRED (Federal Reserve Bank of St. Louis)
// Usage:
//   GET /api/economic?action=fed-funds
//   GET /api/economic?action=cpi
//   GET /api/economic?action=yield-curve
//   GET /api/economic?action=unemployment
//   GET /api/economic?action=gdp

import { NextRequest, NextResponse } from 'next/server'
import {
  getFedFundsRate,
  getCPIInflation,
  getYieldCurve,
  getUnemploymentRate,
  getGDPGrowth,
} from '@/lib/fred'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'fed-funds': {
        const data = await getFedFundsRate()
        return NextResponse.json({ action, data })
      }
      case 'cpi': {
        const data = await getCPIInflation()
        return NextResponse.json({ action, data })
      }
      case 'yield-curve': {
        const data = await getYieldCurve()
        return NextResponse.json({ action, data })
      }
      case 'unemployment': {
        const data = await getUnemploymentRate()
        return NextResponse.json({ action, data })
      }
      case 'gdp': {
        const data = await getGDPGrowth()
        return NextResponse.json({ action, data })
      }
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: fed-funds, cpi, yield-curve, unemployment, gdp' },
          { status: 400 }
        )
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
