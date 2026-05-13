// GET /api/portfolio/lookup?ticker=AAPL&type=stock
// Returns company name, sector, and current price for auto-fill

const FINNHUB_KEY = process.env.FINNHUB_API_KEY
const FINNHUB_BASE = 'https://finnhub.io/api/v1'
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

const CRYPTO_MAP: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', DOGE: 'dogecoin',
  XRP: 'ripple', ADA: 'cardano', AVAX: 'avalanche-2', LINK: 'chainlink',
  DOT: 'polkadot', MATIC: 'matic-network', LTC: 'litecoin', BCH: 'bitcoin-cash',
  UNI: 'uniswap', ATOM: 'cosmos', FIL: 'filecoin', NEAR: 'near',
  ARB: 'arbitrum', OP: 'optimism', INJ: 'injective-protocol', SUI: 'sui',
  APT: 'aptos', TIA: 'celestia', SEI: 'sei-network', JUP: 'jupiter-exchange-solana',
  HBAR: 'hedera-hashgraph', ALGO: 'algorand', XLM: 'stellar', TRX: 'tron',
  VET: 'vechain', XMR: 'monero', TON: 'the-open-network', SHIB: 'shiba-inu',
  PEPE: 'pepe', WIF: 'dogwifcoin', BONK: 'bonk', RENDER: 'render-token',
  GRT: 'the-graph', IMX: 'immutable-x', LDO: 'lido-dao', AAVE: 'aave',
  CRV: 'curve-dao-token', MKR: 'maker', FET: 'fetch-ai', FLOKI: 'floki',
  BNB: 'binancecoin',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')?.toUpperCase().trim()
  const type = searchParams.get('type') || 'stock'

  if (!ticker) return Response.json({ error: 'ticker required' }, { status: 400 })

  try {
    if (type === 'crypto') {
      const coinId = CRYPTO_MAP[ticker]
      if (!coinId) return Response.json({})

      const cgKey = process.env.COINGECKO_API_KEY
      const headers: Record<string, string> = cgKey ? { 'x-cg-demo-api-key': cgKey } : {}
      const res = await fetch(
        `${COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
        { headers }
      )
      if (!res.ok) return Response.json({})
      const data = await res.json()
      return Response.json({
        name: data.name ?? null,
        sector: 'Cryptocurrency',
        price: data.market_data?.current_price?.usd ?? null,
      })
    } else {
      const [profileRes, quoteRes] = await Promise.all([
        fetch(`${FINNHUB_BASE}/stock/profile2?symbol=${ticker}&token=${FINNHUB_KEY}`),
        fetch(`${FINNHUB_BASE}/quote?symbol=${ticker}&token=${FINNHUB_KEY}`),
      ])
      const profile = profileRes.ok ? await profileRes.json() : {}
      const quote = quoteRes.ok ? await quoteRes.json() : {}
      return Response.json({
        name: profile.name ?? null,
        sector: profile.finnhubIndustry ?? null,
        price: quote.c ?? null,
      })
    }
  } catch {
    return Response.json({})
  }
}
