const FINNHUB = 'https://finnhub.io/api/v1'
const COINGECKO = 'https://api.coingecko.com/api/v3'

const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot',
  DOGE: 'dogecoin', LINK: 'chainlink', MATIC: 'matic-network', LTC: 'litecoin',
  ATOM: 'cosmos', NEAR: 'near', ARB: 'arbitrum', OP: 'optimism',
  SUI: 'sui', APT: 'aptos', TON: 'the-open-network',
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = (searchParams.get('ticker') ?? '').toUpperCase()
    const resolution = searchParams.get('resolution') ?? 'D'
    const days = parseInt(searchParams.get('days') ?? '90')
    const isCrypto = searchParams.get('crypto') === 'true'

    if (!ticker) return Response.json({ error: 'ticker required' }, { status: 400 })

    const to = Math.floor(Date.now() / 1000)
    const from = to - days * 24 * 60 * 60

    if (isCrypto) {
      const coinId = CRYPTO_IDS[ticker] ?? ticker.toLowerCase()
      const res = await fetch(`${COINGECKO}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`)
      if (!res.ok) throw new Error(`CoinGecko OHLC failed: ${res.status}`)
      const raw: number[][] = await res.json()
      // CoinGecko returns [timestamp_ms, open, high, low, close]
      const candles = raw.map(([ts, o, h, l, c]) => ({
        time: Math.floor(ts / 1000) as any,
        open: o, high: h, low: l, close: c,
      }))
      return Response.json(candles)
    }

    // Finnhub stock candles
    const finnhubRes = searchParams.get('resolution') === '60' ? resolution : resolution
    const res = await fetch(
      `${FINNHUB}/stock/candle?symbol=${ticker}&resolution=${finnhubRes}&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`
    )
    if (!res.ok) throw new Error(`Finnhub candles failed: ${res.status}`)
    const data = await res.json()

    if (data.s !== 'ok' || !data.t?.length) return Response.json([])

    const candles = data.t.map((t: number, i: number) => ({
      time: t as any,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v?.[i],
    }))
    return Response.json(candles)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
