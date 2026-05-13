// Returns live quotes for a list of tickers
// Stocks use Finnhub; crypto uses CoinGecko
// GET /api/watchlist/quotes?tickers=AAPL,BTC,ETH,MSFT

export const dynamic = 'force-dynamic'

const FINNHUB_KEY = process.env.FINNHUB_API_KEY
const FINNHUB_BASE = 'https://finnhub.io/api/v1'
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

// Map crypto ticker symbols → CoinGecko IDs
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
}

async function getStockQuote(ticker: string) {
  const res = await fetch(`${FINNHUB_BASE}/quote?symbol=${ticker}&token=${FINNHUB_KEY}`)
  if (!res.ok) return null
  const q = await res.json()
  if (!q.c) return null
  return {
    ticker,
    price: q.c,
    change: q.d,
    changePct: q.dp,
    prevClose: q.pc,
    high: q.h,
    low: q.l,
    isCrypto: false,
  }
}

async function getCryptoQuotes(symbols: string[]): Promise<Record<string, any>> {
  const ids = symbols.map(s => CRYPTO_MAP[s]).filter(Boolean).join(',')
  if (!ids) return {}
  const cgKey = process.env.COINGECKO_API_KEY
  const headers: Record<string, string> = cgKey ? { 'x-cg-demo-api-key': cgKey } : {}
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
  const res = await fetch(url, { headers })
  if (!res.ok) return {}
  const data = await res.json()
  const out: Record<string, any> = {}
  for (const sym of symbols) {
    const coinId = CRYPTO_MAP[sym]
    if (!coinId || !data[coinId]) continue
    const c = data[coinId]
    const price = c.usd
    const changePct = c.usd_24h_change ?? 0
    out[sym] = {
      ticker: sym,
      price,
      change: price * changePct / 100,
      changePct,
      prevClose: price / (1 + changePct / 100),
      isCrypto: true,
    }
  }
  return out
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tickersParam = searchParams.get('tickers')
  if (!tickersParam) return Response.json({})

  const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).slice(0, 40)
  const cryptoTickers = tickers.filter(t => CRYPTO_MAP[t])
  const stockTickers = tickers.filter(t => !CRYPTO_MAP[t])

  const results: Record<string, any> = {}

  // Fetch all crypto at once (single CoinGecko call)
  if (cryptoTickers.length > 0) {
    const cryptoData = await getCryptoQuotes(cryptoTickers).catch(() => ({}))
    Object.assign(results, cryptoData)
  }

  // Fetch stocks with 500ms stagger to respect Finnhub rate limit
  for (const ticker of stockTickers) {
    const quote = await getStockQuote(ticker).catch(() => null)
    if (quote) results[ticker] = quote
    if (stockTickers.length > 1) await new Promise(r => setTimeout(r, 500))
  }

  return Response.json(results)
}
