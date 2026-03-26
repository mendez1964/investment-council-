import { getExpirations, getChain, getBestContract } from '@/lib/tradier'
import { getQuote } from '@/lib/finnhub'

export async function GET() {
  const results: Record<string, any> = {}

  try {
    // 1. Get SPY quote from Finnhub
    const quote = await getQuote('SPY')
    const spyPrice = quote?.c ?? null
    results.spy_price = spyPrice

    // 2. Get SPY expirations from Tradier
    const expirations = await getExpirations('SPY')
    results.expirations_count = expirations.length
    results.next_3_expirations = expirations.slice(0, 3)

    // 3. Get best 0DTE call contract for SPY
    const today = new Date().toISOString().split('T')[0]
    if (spyPrice) {
      const contract = await getBestContract('SPY', 'call', 8, 'daily', spyPrice, today)
      results.best_call = contract
        ? { strike: contract.strike, expiry: contract.expiry, mid: contract.mid, iv: contract.iv, oi: contract.openInterest, delta: contract.delta }
        : null
    }

    return Response.json({ ok: true, sandbox: process.env.TRADIER_SANDBOX !== 'false', ...results })
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
