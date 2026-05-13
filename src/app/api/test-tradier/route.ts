import { getQuote } from '@/lib/finnhub'

const BASE_URL = process.env.TRADIER_SANDBOX === 'false'
  ? 'https://api.tradier.com/v1'
  : 'https://sandbox.tradier.com/v1'

export async function GET() {
  const results: Record<string, any> = {
    tradier_sandbox: process.env.TRADIER_SANDBOX,
    tradier_key_set: !!process.env.TRADIER_API_KEY,
    tradier_key_prefix: process.env.TRADIER_API_KEY?.slice(0, 8) + '...',
    base_url: BASE_URL,
  }

  // Step 1: Finnhub quote
  try {
    const quote = await getQuote('SPY')
    results.spy_price = quote?.c ?? null
    results.finnhub = 'ok'
  } catch (err) {
    results.finnhub = `ERROR: ${(err as Error).message}`
  }

  // Step 2: Tradier expirations
  try {
    const res = await fetch(
      `${BASE_URL}/markets/options/expirations?symbol=SPY&includeAllRoots=true`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TRADIER_API_KEY}`,
          Accept: 'application/json',
        },
      }
    )
    const text = await res.text()
    if (!res.ok) {
      results.tradier_expirations = `ERROR ${res.status}: ${text}`
    } else {
      const data = JSON.parse(text)
      const dates: string[] = data?.expirations?.date ?? []
      results.tradier_expirations = 'ok'
      results.next_3_expirations = dates.slice(0, 3)
    }
  } catch (err) {
    results.tradier_expirations = `ERROR: ${(err as Error).message}`
  }

  // Step 3: Tradier chain for first expiry
  if (results.next_3_expirations?.length) {
    const expiry = results.next_3_expirations[0]
    try {
      const res = await fetch(
        `${BASE_URL}/markets/options/chains?symbol=SPY&expiration=${expiry}&greeks=true`,
        {
          headers: {
            Authorization: `Bearer ${process.env.TRADIER_API_KEY}`,
            Accept: 'application/json',
          },
        }
      )
      const text = await res.text()
      if (!res.ok) {
        results.tradier_chain = `ERROR ${res.status}: ${text}`
      } else {
        const data = JSON.parse(text)
        const options = data?.options?.option ?? []
        results.tradier_chain = 'ok'
        results.contracts_count = options.length
        results.sample_contract = options[0] ?? null
      }
    } catch (err) {
      results.tradier_chain = `ERROR: ${(err as Error).message}`
    }
  }

  return Response.json(results)
}
