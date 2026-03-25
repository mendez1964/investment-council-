// GET  — fetch all holdings enriched with live prices + portfolio summary
// POST — add a new holding

export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

// ─── Quote helpers (copied from /api/watchlist/quotes) ───────────────────────

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

async function getStockQuote(ticker: string) {
  try {
    const res = await fetch(`${FINNHUB_BASE}/quote?symbol=${ticker}&token=${FINNHUB_KEY}`)
    if (!res.ok) return null
    const q = await res.json()
    if (!q.c) return null
    return {
      ticker,
      price: q.c as number,
      change: q.d as number,
      changePct: q.dp as number,
      prevClose: q.pc as number,
      isCrypto: false,
    }
  } catch {
    return null
  }
}

async function getCryptoQuotes(symbols: string[]): Promise<Record<string, any>> {
  try {
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
      const price = c.usd as number
      const changePct = (c.usd_24h_change ?? 0) as number
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
  } catch {
    return {}
  }
}

async function fetchAllQuotes(tickers: string[]): Promise<Record<string, any>> {
  const cryptoTickers = tickers.filter(t => CRYPTO_MAP[t])
  const stockTickers = tickers.filter(t => !CRYPTO_MAP[t])
  const results: Record<string, any> = {}

  if (cryptoTickers.length > 0) {
    const cryptoData = await getCryptoQuotes(cryptoTickers)
    Object.assign(results, cryptoData)
  }

  for (const ticker of stockTickers) {
    const quote = await getStockQuote(ticker)
    if (quote) results[ticker] = quote
    if (stockTickers.length > 1) await new Promise(r => setTimeout(r, 500))
  }

  return results
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const authClient = createServerSupabaseClientAuth()
    const { data: { user } } = await authClient.auth.getUser()

    const supabase = createServerSupabaseClient()
    const query = supabase
      .from('portfolio_holdings')
      .select('*')
      .order('added_at', { ascending: false })

    if (user) query.eq('user_id', user.id)

    const { data: holdings, error } = await query

    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (!holdings || holdings.length === 0) {
      return Response.json({
        holdings: [],
        summary: { totalValue: 0, totalCost: 0, totalPnl: 0, totalPnlPct: 0, dayChange: 0, dayChangePct: 0 },
      })
    }

    const tickers = Array.from(new Set(holdings.map((h: any) => h.ticker as string)))
    const quotes = await fetchAllQuotes(tickers)

    const enriched = holdings.map((h: any) => {
      const q = quotes[h.ticker]
      const currentPrice: number = q?.price ?? 0
      const dayChangePct: number = q?.changePct ?? 0
      const dayChangePerShare: number = q?.change ?? 0
      const shares: number = Number(h.shares)
      const avgCost: number = Number(h.avg_cost)
      const marketValue: number = shares * currentPrice
      const costBasis: number = shares * avgCost
      const pnlDollar: number = marketValue - costBasis
      const pnlPct: number = costBasis > 0 ? (pnlDollar / costBasis) * 100 : 0
      const dayChangeDollar: number = shares * dayChangePerShare

      return {
        ...h,
        shares,
        avg_cost: avgCost,
        currentPrice,
        marketValue,
        costBasis,
        pnlDollar,
        pnlPct,
        dayChangePct,
        dayChangeDollar,
        isCrypto: q?.isCrypto ?? false,
      }
    })

    const totalValue = enriched.reduce((sum: number, h: any) => sum + h.marketValue, 0)
    const totalCost = enriched.reduce((sum: number, h: any) => sum + h.costBasis, 0)
    const totalPnl = totalValue - totalCost
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0
    const dayChange = enriched.reduce((sum: number, h: any) => sum + h.dayChangeDollar, 0)
    const dayChangePct = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0

    return Response.json({
      holdings: enriched,
      summary: { totalValue, totalCost, totalPnl, totalPnlPct, dayChange, dayChangePct },
    })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const authClient = createServerSupabaseClientAuth()
    const { data: { user } } = await authClient.auth.getUser()

    const body = await request.json()
    const { ticker, company_name, asset_type, shares, avg_cost, sector, notes } = body

    if (!ticker || !shares || !avg_cost) {
      return Response.json({ error: 'ticker, shares, and avg_cost are required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('portfolio_holdings')
      .insert({
        ticker: ticker.toUpperCase().trim(),
        company_name: company_name || null,
        asset_type: asset_type || 'stock',
        shares: Number(shares),
        avg_cost: Number(avg_cost),
        sector: sector || null,
        notes: notes || null,
        user_id: user?.id ?? null,
      })
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
