#!/usr/bin/env node
// Investment Council — Market Watcher
// Runs as a separate PM2 process alongside the Next.js app
// Monitors your watchlist every 5 minutes during market hours
// Fires alerts to Supabase when setups are detected

require('dotenv').config({ path: __dirname + '/.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FINNHUB_KEY = process.env.FINNHUB_API_KEY
const BASE = 'https://finnhub.io/api/v1'
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

// Map crypto ticker symbols to CoinGecko IDs
const CRYPTO_MAP = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', DOGE: 'dogecoin',
  XRP: 'ripple', ADA: 'cardano', AVAX: 'avalanche-2', LINK: 'chainlink',
  DOT: 'polkadot', MATIC: 'matic-network', LTC: 'litecoin', BCH: 'bitcoin-cash',
  UNI: 'uniswap', ATOM: 'cosmos', NEAR: 'near', ARB: 'arbitrum',
  OP: 'optimism', INJ: 'injective-protocol', SUI: 'sui', APT: 'aptos',
  HBAR: 'hedera-hashgraph', ALGO: 'algorand', XLM: 'stellar', TRX: 'tron',
  VET: 'vechain', TON: 'the-open-network', SHIB: 'shiba-inu', PEPE: 'pepe',
  RENDER: 'render-token', GRT: 'the-graph', IMX: 'immutable-x', AAVE: 'aave',
  MKR: 'maker', FET: 'fetch-ai', LDO: 'lido-dao', CRV: 'curve-dao-token',
}

// ── Rate limiter (Finnhub free: 60 calls/min) ─────────────────────────────────
let callsThisWindow = 0
let windowStart = Date.now()

async function rateLimitedFetch(url) {
  const now = Date.now()
  if (now - windowStart > 60000) {
    callsThisWindow = 0
    windowStart = now
  }
  if (callsThisWindow >= 55) {
    const wait = 60000 - (Date.now() - windowStart) + 2000
    console.log(`[Watcher] Rate limit – waiting ${Math.round(wait / 1000)}s`)
    await new Promise(r => setTimeout(r, wait))
    callsThisWindow = 0
    windowStart = Date.now()
  }
  callsThisWindow++
  return fetch(url)
}

// ── Market hours (EST) ────────────────────────────────────────────────────────
function getMarketSession() {
  const estStr = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  const est = new Date(estStr)
  const day = est.getDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return null

  const t = est.getHours() * 100 + est.getMinutes()
  if (t >= 800 && t < 930) return 'premarket'
  if (t >= 930 && t < 1600) return 'market'
  if (t >= 1600 && t < 1800) return 'afterhours'
  return null
}

// ── Fetch stock data ──────────────────────────────────────────────────────────
async function fetchStockData(ticker) {
  try {
    const [qRes, mRes] = await Promise.all([
      rateLimitedFetch(`${BASE}/quote?symbol=${ticker}&token=${FINNHUB_KEY}`),
      rateLimitedFetch(`${BASE}/stock/metric?symbol=${ticker}&metric=all&token=${FINNHUB_KEY}`),
    ])
    if (!qRes.ok || !mRes.ok) return null
    const quote = await qRes.json()
    const { metric = {} } = await mRes.json()
    return {
      price: quote.c,
      change: quote.d,
      changePct: quote.dp,
      prevClose: quote.pc,
      high: quote.h,
      low: quote.l,
      metrics: metric,
    }
  } catch (e) {
    console.error(`[Watcher] ${ticker} fetch error:`, e.message)
    return null
  }
}

// ── Fetch crypto data (CoinGecko) ─────────────────────────────────────────────
async function fetchCryptoData(ticker) {
  const coinId = CRYPTO_MAP[ticker]
  if (!coinId) return null
  try {
    const cgKey = process.env.COINGECKO_API_KEY
    const headers = cgKey ? { 'x-cg-demo-api-key': cgKey } : {}
    const url = `${COINGECKO_BASE}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
    const res = await fetch(url, { headers })
    if (!res.ok) return null
    const data = await res.json()
    const c = data[coinId]
    if (!c) return null
    const price = c.usd
    const changePct = c.usd_24h_change ?? 0
    return { price, changePct, marketCap: c.usd_market_cap, isCrypto: true }
  } catch (e) {
    console.error(`[Watcher] ${ticker} crypto fetch error:`, e.message)
    return null
  }
}

// ── Crypto-specific checks ────────────────────────────────────────────────────

function checkCryptoBigMove(ticker, d) {
  const absChange = Math.abs(d.changePct || 0)
  if (absChange > 8) {
    const dir = d.changePct > 0 ? 'up' : 'down'
    return {
      framework: 'Technical',
      setup: `${ticker} moving ${dir} ${absChange.toFixed(1)}% in 24h — major crypto move`,
      signal: 'Significant 24-hour price move — check volume and on-chain data for conviction',
    }
  }
  return null
}

function checkCryptoBullish(ticker, d) {
  if (d.changePct > 5) {
    return {
      framework: 'Tudor Jones',
      setup: `${ticker} up ${d.changePct.toFixed(1)}% in 24h — momentum building`,
      signal: 'Positive momentum in crypto — Tudor Jones would watch for trend continuation above key levels',
    }
  }
  return null
}

function checkCryptoBearish(ticker, d) {
  if (d.changePct < -5) {
    return {
      framework: 'Burry',
      setup: `${ticker} down ${Math.abs(d.changePct).toFixed(1)}% in 24h — potential entry zone`,
      signal: 'Sharp pullback in crypto — contrarian opportunity or continued downside — check broader market sentiment',
    }
  }
  return null
}

const CRYPTO_CHECKS = [
  checkCryptoBigMove,
  checkCryptoBullish,
  checkCryptoBearish,
]

// ── Framework checks ──────────────────────────────────────────────────────────

function checkTudorJones(ticker, d) {
  const { price, metrics: m } = d
  if (!price || !m.sma50 || !m.rsi14) return null
  const distPct = Math.abs(price - m.sma50) / m.sma50 * 100
  if (distPct < 2 && m.rsi14 >= 40 && m.rsi14 <= 60) {
    return {
      framework: 'Tudor Jones',
      setup: `${ticker} at $${price.toFixed(2)} — within 2% of 50-day MA ($${m.sma50.toFixed(2)}) with RSI ${m.rsi14.toFixed(0)}`,
      signal: 'Trend continuation setup forming — pullback to moving average on neutral momentum',
    }
  }
  return null
}

function checkLivermore(ticker, d) {
  const { price, metrics: m } = d
  if (!price || !m['52WeekHigh'] || !m['52WeekLow']) return null
  const pivot = (m['52WeekHigh'] + m['52WeekLow'] + price) / 3
  const distPct = Math.abs(price - pivot) / pivot * 100
  if (distPct < 1) {
    return {
      framework: 'Livermore',
      setup: `${ticker} at $${price.toFixed(2)} — within 1% of key pivot level $${pivot.toFixed(2)}`,
      signal: 'Major decision point — Livermore pivot break may trigger a significant directional move',
    }
  }
  return null
}

function checkBuffett(ticker, d) {
  const { price, metrics: m } = d
  const eps = m.epsNormalizedAnnual
  if (!price || !eps || eps <= 0) return null
  const g = Math.min(Math.max(m.revenueGrowth3Y || m.revenueGrowthTTMYoy || 5, 0), 20)
  const iv = eps * (8.5 + 2 * g) * 4.4 / 4.5
  if (price < iv * 0.85) {
    const discount = Math.round((1 - price / iv) * 100)
    return {
      framework: 'Buffett',
      setup: `${ticker} at $${price.toFixed(2)} — ${discount}% below estimated intrinsic value of $${iv.toFixed(2)}`,
      signal: 'Quality company trading below intrinsic value — Buffett margin of safety present',
    }
  }
  return null
}

function checkLynch(ticker, d) {
  const { metrics: m } = d
  if (!m.peNormalizedAnnual || !m.revenueGrowthTTMYoy || m.revenueGrowthTTMYoy <= 0) return null
  const peg = m.peNormalizedAnnual / m.revenueGrowthTTMYoy
  if (peg < 1.0 && m.revenueGrowthTTMYoy > 15) {
    return {
      framework: 'Lynch',
      setup: `${ticker} — PEG ratio ${peg.toFixed(2)} with ${m.revenueGrowthTTMYoy.toFixed(0)}% revenue growth`,
      signal: 'Growth at a bargain price — Lynch PEG under 1.0 with strong revenue growth',
    }
  }
  return null
}

function checkGraham(ticker, d) {
  const { price, metrics: m } = d
  const eps = m.epsNormalizedAnnual
  const bvps = m.bookValuePerShareAnnual
  const cr = m.currentRatioAnnual
  if (!price || !eps || eps <= 0 || !bvps || bvps <= 0 || !cr) return null
  const gn = Math.sqrt(22.5 * eps * bvps)
  if (price < gn && cr > 2) {
    return {
      framework: 'Graham',
      setup: `${ticker} at $${price.toFixed(2)} — below Graham Number $${gn.toFixed(2)} with current ratio ${cr.toFixed(1)}`,
      signal: 'Deep value — stock below Graham Number with strong balance sheet',
    }
  }
  return null
}

function checkGrantham(ticker, d) {
  const { metrics: m } = d
  if (!m.peNormalizedAnnual) return null
  if (m.peNormalizedAnnual > 35) {
    return {
      framework: 'Grantham',
      setup: `${ticker} — P/E ratio ${m.peNormalizedAnnual.toFixed(1)}x, significantly above historical norms`,
      signal: 'Bubble warning — extreme valuation suggests elevated risk of mean reversion',
    }
  }
  return null
}

function checkBurry(ticker, d) {
  const { metrics: m } = d
  if (!m.shortRatio) return null
  if (m.shortRatio > 10) {
    return {
      framework: 'Burry',
      setup: `${ticker} — short ratio ${m.shortRatio.toFixed(1)} days to cover (heavily shorted)`,
      signal: 'Contrarian opportunity — extreme short interest may create short squeeze potential',
    }
  }
  return null
}

function checkRoubini(ticker, d) {
  const { price } = d
  if (ticker === 'VIX' && price > 25) {
    return {
      framework: 'Roubini',
      setup: `VIX at ${price.toFixed(1)} — fear gauge elevated above 25`,
      signal: 'Systemic risk alert — Roubini signals risk-off, reduce exposure and hold defensive positions',
    }
  }
  return null
}

function checkBreakout(ticker, d) {
  const { price, metrics: m } = d
  if (!price || !m['52WeekHigh']) return null
  if (price >= m['52WeekHigh'] * 0.99) {
    return {
      framework: 'Technical',
      setup: `${ticker} at $${price.toFixed(2)} — at or testing 52-week high $${m['52WeekHigh'].toFixed(2)}`,
      signal: 'Breakout alert — price at 52-week high is a major technical resistance/breakout level',
    }
  }
  return null
}

function checkVolumeMove(ticker, d) {
  const absChange = Math.abs(d.changePct || 0)
  if (absChange > 5) {
    const dir = d.changePct > 0 ? 'up' : 'down'
    return {
      framework: 'Technical',
      setup: `${ticker} moving ${dir} ${absChange.toFixed(1)}% — significant intraday move`,
      signal: 'Large price movement detected — check volume for confirmation of conviction',
    }
  }
  return null
}

function checkMACross(ticker, d) {
  const { metrics: m } = d
  if (!m.sma50 || !m.sma200) return null
  const gap = Math.abs(m.sma50 - m.sma200) / m.sma200 * 100
  if (gap < 1) {
    const type = m.sma50 >= m.sma200 ? 'Golden Cross' : 'Death Cross'
    return {
      framework: 'Technical',
      setup: `${ticker} — 50-day MA ($${m.sma50.toFixed(2)}) within 1% of 200-day MA ($${m.sma200.toFixed(2)}) — ${type} forming`,
      signal: `${type} is a major trend change signal — high significance technical event`,
    }
  }
  return null
}

const ALL_CHECKS = [
  checkTudorJones,
  checkLivermore,
  checkBuffett,
  checkLynch,
  checkGraham,
  checkGrantham,
  checkBurry,
  checkRoubini,
  checkBreakout,
  checkVolumeMove,
  checkMACross,
]

// ── Deduplication (skip if same ticker+framework alerted in last 4 hours) ─────
async function isDuplicate(ticker, framework) {
  const since = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('alert_history')
    .select('id')
    .eq('ticker', ticker)
    .eq('framework', framework)
    .gte('fired_at', since)
    .limit(1)
  return data && data.length > 0
}

// ── Main scan cycle ────────────────────────────────────────────────────────────
async function runScan() {
  const session = getMarketSession()
  if (!session) return

  const { data: enabled } = await supabase
    .from('alert_settings')
    .select('value')
    .eq('key', 'watcher_enabled')
    .single()
  if (enabled?.value === 'false') return

  const { data: stocks, error } = await supabase
    .from('watchlist_stocks')
    .select('ticker, company_name, specialists')
  if (error || !stocks || stocks.length === 0) {
    console.log('[Watcher] No stocks on watchlist')
    return
  }

  const now = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false })
  console.log(`[Watcher] ${now} EST — scanning ${stocks.length} stocks (${session})`)

  let totalAlerts = 0

  for (const stock of stocks) {
    const isCrypto = !!CRYPTO_MAP[stock.ticker]
    await new Promise(r => setTimeout(r, isCrypto ? 1000 : 2000))

    const data = isCrypto
      ? await fetchCryptoData(stock.ticker)
      : await fetchStockData(stock.ticker)
    if (!data || !data.price) continue

    const checks = isCrypto ? CRYPTO_CHECKS : ALL_CHECKS
    const stockAlerts = []

    for (const check of checks) {
      const result = check(stock.ticker, data)
      if (!result) continue

      const dup = await isDuplicate(stock.ticker, result.framework)
      if (dup) continue

      stockAlerts.push({
        ticker: stock.ticker,
        framework: result.framework,
        alert_type: isCrypto ? 'crypto' : 'framework',
        price: data.price,
        setup_description: result.setup,
        signal_explanation: result.signal,
        confluence_count: 1,
      })
    }

    // Update confluence count
    if (stockAlerts.length > 1) {
      stockAlerts.forEach(a => { a.confluence_count = stockAlerts.length })
    }

    if (stockAlerts.length > 0) {
      await supabase.from('alert_history').insert(stockAlerts)
      await supabase
        .from('watchlist_stocks')
        .update({
          setup_score: Math.min(stockAlerts.length * 2 + 3, 10),
          last_alert_at: new Date().toISOString(),
          last_alert_text: stockAlerts[0].setup_description,
        })
        .eq('ticker', stock.ticker)

      console.log(`[Watcher] ${stock.ticker}: ${stockAlerts.length} alert(s) — ${stockAlerts.map(a => a.framework).join(', ')}`)
      totalAlerts += stockAlerts.length
    }
  }

  console.log(`[Watcher] Cycle complete — ${totalAlerts} new alert(s)`)
}

// ── Start ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('[Watcher] Investment Council Market Watcher starting...')
  console.log('[Watcher] Monitors your watchlist every 5 minutes during market hours (Mon–Fri, 8am–6pm EST)')

  await runScan()
  setInterval(runScan, 5 * 60 * 1000)
}

main().catch(console.error)
