const FINNHUB = 'https://finnhub.io/api/v1'
const COINGECKO = 'https://api.coingecko.com/api/v3'

// ── Symbol lists by scan depth ────────────────────────────────────────────────
const STOCKS_QUICK = [
  'AAPL','MSFT','GOOGL','AMZN','META','NVDA','TSLA','AMD','NFLX','JPM',
  'BAC','GS','XOM','WMT','DIS','COIN','SQ','PLTR','UBER','SHOP',
  'INTC','CRM','PYPL','SNAP','RIVN',
]

const STOCKS_STANDARD = [
  ...STOCKS_QUICK,
  'V','MA','ADBE','ORCL','QCOM','TXN','AVGO','MU','SMCI','ARM',
  'MRVL','PANW','ZS','CRWD','NET','SNOW','DDOG','ABNB','LYFT','DASH',
  'RBLX','U','HOOD','MARA','RIOT','BKNG','CCL','DAL','UAL','PG',
  'JNJ','UNH','MRK','PFE','LLY','ABBV','CVX','COP','SLB','WFC',
  'C','MS','BLK','KO','PEP','NKE','MCD','COST','SBUX','LVS',
]

const STOCKS_DEEP = [
  ...STOCKS_STANDARD,
  'AMGN','GILD','REGN','VRTX','MRNA','TMO','DHR','ISRG','ABT','MDT',
  'SYK','BMY','CI','SCHW','IBKR','BX','KKR','APO','EOG','MPC',
  'VLO','OXY','BA','CAT','DE','HON','LMT','RTX','GD','UPS',
  'FDX','HD','LOW','TGT','CMG','LULU','TJX','ROST','T','VZ',
  'TMUS','CHTR','CMCSA','NEE','DUK','AMT','PLD','EQIX','SPG','O',
  'IBM','ACN','DELL','HPQ','TSM','ASML','NIO','GM','F','RCL',
  'NCLH','AAL','LUV','HLT','MAR','IHG','LYV','PINS','ROKU','TTD',
  'MMM','EMR','ITW','ROK','FAST',
]

const CRYPTO_QUICK = ['BTC','ETH','SOL','BNB','XRP','ADA','AVAX','DOT','DOGE','LINK','MATIC','ATOM']

const CRYPTO_STANDARD = [
  ...CRYPTO_QUICK,
  'NEAR','ARB','OP','SUI','APT','LTC','TON','UNI',
]

const CRYPTO_DEEP = [
  ...CRYPTO_STANDARD,
  'AAVE','CRV','FTM','ALGO','HBAR','MANA','INJ','RUNE','FIL','ICP',
]

const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot',
  DOGE: 'dogecoin', LINK: 'chainlink', MATIC: 'matic-network', ATOM: 'cosmos',
  NEAR: 'near', ARB: 'arbitrum', OP: 'optimism', SUI: 'sui',
  APT: 'aptos', LTC: 'litecoin', TON: 'the-open-network', UNI: 'uniswap',
  AAVE: 'aave', CRV: 'curve-dao-token', FTM: 'fantom', ALGO: 'algorand',
  HBAR: 'hedera-hashgraph', MANA: 'decentraland', INJ: 'injective-protocol',
  RUNE: 'thorchain', FIL: 'filecoin', ICP: 'internet-computer',
}

interface Candle { open: number; high: number; low: number; close: number }

// ── Pattern helpers ───────────────────────────────────────────────────────────
const body  = (c: Candle) => Math.abs(c.close - c.open)
const rng   = (c: Candle) => c.high - c.low
const upper = (c: Candle) => c.high - Math.max(c.open, c.close)
const lower = (c: Candle) => Math.min(c.open, c.close) - c.low
const bull  = (c: Candle) => c.close > c.open
const bear  = (c: Candle) => c.close < c.open
const mid   = (c: Candle) => (c.open + c.close) / 2

const DETECTORS: Record<string, (cs: Candle[]) => boolean> = {
  'hammer': cs => {
    const c = cs[cs.length - 1], b = body(c), r = rng(c), u = upper(c), l = lower(c)
    return r > 0 && b / r < 0.4 && l >= 2 * b && u <= 0.5 * b
  },
  'inverted-hammer': cs => {
    const c = cs[cs.length - 1], b = body(c), r = rng(c), u = upper(c), l = lower(c)
    return r > 0 && b / r < 0.4 && u >= 2 * b && l <= 0.5 * b
  },
  'shooting-star': cs => {
    const c = cs[cs.length - 1], b = body(c), r = rng(c), u = upper(c), l = lower(c)
    return r > 0 && bear(c) && b / r < 0.4 && u >= 2 * b && l <= 0.5 * b
  },
  'hanging-man': cs => {
    const c = cs[cs.length - 1], b = body(c), r = rng(c), u = upper(c), l = lower(c)
    return r > 0 && bear(c) && b / r < 0.4 && l >= 2 * b && u <= 0.5 * b
  },
  'doji': cs => {
    const c = cs[cs.length - 1], r = rng(c)
    return r > 0 && body(c) / r < 0.1
  },
  'spinning-top': cs => {
    const c = cs[cs.length - 1], b = body(c), r = rng(c), u = upper(c), l = lower(c)
    return r > 0 && b / r < 0.3 && u > b && l > b
  },
  'dragonfly-doji': cs => {
    const c = cs[cs.length - 1], r = rng(c), b = body(c), u = upper(c), l = lower(c)
    return r > 0 && b / r < 0.1 && l > r * 0.6 && u < r * 0.1
  },
  'gravestone-doji': cs => {
    const c = cs[cs.length - 1], r = rng(c), b = body(c), u = upper(c), l = lower(c)
    return r > 0 && b / r < 0.1 && u > r * 0.6 && l < r * 0.1
  },
  'bullish-engulfing': cs => {
    if (cs.length < 2) return false
    const [p, c] = [cs[cs.length - 2], cs[cs.length - 1]]
    return bear(p) && bull(c) && c.open < p.close && c.close > p.open
  },
  'bearish-engulfing': cs => {
    if (cs.length < 2) return false
    const [p, c] = [cs[cs.length - 2], cs[cs.length - 1]]
    return bull(p) && bear(c) && c.open > p.close && c.close < p.open
  },
  'bullish-harami': cs => {
    if (cs.length < 2) return false
    const [p, c] = [cs[cs.length - 2], cs[cs.length - 1]]
    return bear(p) && bull(c) && c.open > p.close && c.close < p.open && body(c) < body(p) * 0.5
  },
  'bearish-harami': cs => {
    if (cs.length < 2) return false
    const [p, c] = [cs[cs.length - 2], cs[cs.length - 1]]
    return bull(p) && bear(c) && c.open < p.close && c.close > p.open && body(c) < body(p) * 0.5
  },
  'piercing-line': cs => {
    if (cs.length < 2) return false
    const [p, c] = [cs[cs.length - 2], cs[cs.length - 1]]
    return bear(p) && bull(c) && c.open < p.low && c.close > mid(p) && c.close < p.open
  },
  'dark-cloud-cover': cs => {
    if (cs.length < 2) return false
    const [p, c] = [cs[cs.length - 2], cs[cs.length - 1]]
    return bull(p) && bear(c) && c.open > p.high && c.close < mid(p) && c.close > p.open
  },
  'morning-star': cs => {
    if (cs.length < 3) return false
    const [c1, c2, c3] = [cs[cs.length - 3], cs[cs.length - 2], cs[cs.length - 1]]
    return bear(c1) && body(c2) < body(c1) * 0.35 && bull(c3) && c3.close > mid(c1)
  },
  'evening-star': cs => {
    if (cs.length < 3) return false
    const [c1, c2, c3] = [cs[cs.length - 3], cs[cs.length - 2], cs[cs.length - 1]]
    return bull(c1) && body(c2) < body(c1) * 0.35 && bear(c3) && c3.close < mid(c1)
  },
  'three-white-soldiers': cs => {
    if (cs.length < 3) return false
    const [c1, c2, c3] = [cs[cs.length - 3], cs[cs.length - 2], cs[cs.length - 1]]
    return bull(c1) && bull(c2) && bull(c3) &&
      c2.open > c1.open && c2.open < c1.close &&
      c3.open > c2.open && c3.open < c2.close &&
      c2.close > c1.close && c3.close > c2.close
  },
  'three-black-crows': cs => {
    if (cs.length < 3) return false
    const [c1, c2, c3] = [cs[cs.length - 3], cs[cs.length - 2], cs[cs.length - 1]]
    return bear(c1) && bear(c2) && bear(c3) &&
      c2.open < c1.open && c2.open > c1.close &&
      c3.open < c2.open && c3.open > c2.close &&
      c2.close < c1.close && c3.close < c2.close
  },
  'tweezer-top': cs => {
    if (cs.length < 2) return false
    const [p, c] = [cs[cs.length - 2], cs[cs.length - 1]]
    return bull(p) && bear(c) && Math.abs(p.high - c.high) / (p.high || 1) < 0.003
  },
  'tweezer-bottom': cs => {
    if (cs.length < 2) return false
    const [p, c] = [cs[cs.length - 2], cs[cs.length - 1]]
    return bear(p) && bull(c) && Math.abs(p.low - c.low) / (p.low || 1) < 0.003
  },
  'head-and-shoulders': cs => {
    if (cs.length < 15) return false
    const closes = cs.map(c => c.close)
    const peaks: number[] = [], troughs: number[] = []
    for (let i = 2; i < closes.length - 2; i++) {
      if (closes[i] > closes[i-1] && closes[i] > closes[i-2] && closes[i] > closes[i+1] && closes[i] > closes[i+2]) peaks.push(i)
      if (closes[i] < closes[i-1] && closes[i] < closes[i-2] && closes[i] < closes[i+1] && closes[i] < closes[i+2]) troughs.push(i)
    }
    if (peaks.length < 3 || troughs.length < 2) return false
    const [ls, hd, rs] = [peaks[peaks.length-3], peaks[peaks.length-2], peaks[peaks.length-1]]
    const [t1, t2] = [troughs[troughs.length-2], troughs[troughs.length-1]]
    if (!(ls < t1 && t1 < hd && hd < t2 && t2 < rs)) return false
    const lsH = closes[ls], hdH = closes[hd], rsH = closes[rs]
    if (hdH <= lsH || hdH <= rsH) return false
    if (Math.abs(lsH - rsH) / Math.max(lsH, rsH) > 0.15) return false
    if (Math.abs(closes[t1] - closes[t2]) / Math.max(closes[t1], closes[t2]) > 0.10) return false
    return true
  },
  'inverse-head-and-shoulders': cs => {
    if (cs.length < 15) return false
    const closes = cs.map(c => c.close)
    const peaks: number[] = [], troughs: number[] = []
    for (let i = 2; i < closes.length - 2; i++) {
      if (closes[i] > closes[i-1] && closes[i] > closes[i-2] && closes[i] > closes[i+1] && closes[i] > closes[i+2]) peaks.push(i)
      if (closes[i] < closes[i-1] && closes[i] < closes[i-2] && closes[i] < closes[i+1] && closes[i] < closes[i+2]) troughs.push(i)
    }
    if (troughs.length < 3 || peaks.length < 2) return false
    const [ls, hd, rs] = [troughs[troughs.length-3], troughs[troughs.length-2], troughs[troughs.length-1]]
    const [p1, p2] = [peaks[peaks.length-2], peaks[peaks.length-1]]
    if (!(ls < p1 && p1 < hd && hd < p2 && p2 < rs)) return false
    const lsL = closes[ls], hdL = closes[hd], rsL = closes[rs]
    if (hdL >= lsL || hdL >= rsL) return false
    if (Math.abs(lsL - rsL) / Math.max(lsL, rsL) > 0.15) return false
    if (Math.abs(closes[p1] - closes[p2]) / Math.max(closes[p1], closes[p2]) > 0.10) return false
    return true
  },
  'double-top': cs => {
    if (cs.length < 10) return false
    const closes = cs.map(c => c.close)
    const peaks: number[] = [], troughs: number[] = []
    for (let i = 2; i < closes.length - 2; i++) {
      if (closes[i] > closes[i-1] && closes[i] > closes[i-2] && closes[i] > closes[i+1] && closes[i] > closes[i+2]) peaks.push(i)
      if (closes[i] < closes[i-1] && closes[i] < closes[i-2] && closes[i] < closes[i+1] && closes[i] < closes[i+2]) troughs.push(i)
    }
    if (peaks.length < 2 || !troughs.length) return false
    const [p1, p2] = [peaks[peaks.length-2], peaks[peaks.length-1]]
    const t = troughs.find(t => t > p1 && t < p2)
    if (!t) return false
    const pk1 = closes[p1], pk2 = closes[p2]
    if (Math.abs(pk1 - pk2) / Math.max(pk1, pk2) > 0.04) return false
    if (pk2 > pk1 * 1.02) return false
    return true
  },
  'double-bottom': cs => {
    if (cs.length < 10) return false
    const closes = cs.map(c => c.close)
    const peaks: number[] = [], troughs: number[] = []
    for (let i = 2; i < closes.length - 2; i++) {
      if (closes[i] > closes[i-1] && closes[i] > closes[i-2] && closes[i] > closes[i+1] && closes[i] > closes[i+2]) peaks.push(i)
      if (closes[i] < closes[i-1] && closes[i] < closes[i-2] && closes[i] < closes[i+1] && closes[i] < closes[i+2]) troughs.push(i)
    }
    if (troughs.length < 2 || !peaks.length) return false
    const [t1, t2] = [troughs[troughs.length-2], troughs[troughs.length-1]]
    const p = peaks.find(p => p > t1 && p < t2)
    if (!p) return false
    const tr1 = closes[t1], tr2 = closes[t2]
    if (Math.abs(tr1 - tr2) / Math.max(tr1, tr2) > 0.04) return false
    if (tr2 < tr1 * 0.98) return false
    return true
  },
}

// ── Data fetchers ─────────────────────────────────────────────────────────────
async function fetchStockCandles(symbol: string): Promise<Candle[]> {
  try {
    const to = Math.floor(Date.now() / 1000)
    const from = to - 30 * 24 * 60 * 60
    const res = await fetch(
      `${FINNHUB}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (data.s !== 'ok' || !data.t?.length) return []
    return data.t.map((_: number, i: number) => ({
      open: data.o[i], high: data.h[i], low: data.l[i], close: data.c[i],
    }))
  } catch { return [] }
}

async function fetchCryptoCandles(coinId: string): Promise<Candle[]> {
  try {
    const res = await fetch(
      `${COINGECKO}/coins/${coinId}/ohlc?vs_currency=usd&days=14`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return []
    const raw: number[][] = await res.json()
    return raw.map(([, o, h, l, c]) => ({ open: o, high: h, low: l, close: c }))
  } catch { return [] }
}

async function batchProcess<T>(
  items: T[], batchSize: number, delayMs: number, fn: (item: T) => Promise<Candle[]>
): Promise<Array<{ item: T; candles: Candle[] }>> {
  const results: Array<{ item: T; candles: Candle[] }> = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchRes = await Promise.all(batch.map(async item => ({ item, candles: await fn(item) })))
    results.push(...batchRes)
    if (i + batchSize < items.length) await new Promise(r => setTimeout(r, delayMs))
  }
  return results
}

// ── Route ────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    // Support both single pattern (legacy) and multiple patterns array
    const patterns: string[] = body.patterns ?? (body.pattern ? [body.pattern] : [])
    if (!patterns.length) return Response.json({ error: 'No patterns specified' }, { status: 400 })

    const detectors = patterns.map(p => ({ id: p, fn: DETECTORS[p] })).filter(d => d.fn)
    if (!detectors.length) return Response.json({ error: 'Unknown pattern(s)' }, { status: 400 })

    // Single symbol check (uses first pattern only)
    if (action === 'check') {
      const { symbol, isCrypto, pattern } = body
      const detector = DETECTORS[pattern ?? patterns[0]]
      if (!detector) return Response.json({ error: 'Unknown pattern' }, { status: 400 })
      const candles = isCrypto
        ? await fetchCryptoCandles(CRYPTO_IDS[symbol.toUpperCase()] ?? symbol.toLowerCase())
        : await fetchStockCandles(symbol.toUpperCase())
      if (candles.length < 3) return Response.json({ found: false, error: 'Insufficient data' })
      const found = detector(candles)
      const last = candles[candles.length - 1]
      const prev = candles[candles.length - 2]
      return Response.json({ found, close: last.close, prevClose: prev.close })
    }

    // Full scan
    const { scanType, depth = 'quick' } = body

    const stockList = depth === 'deep' ? STOCKS_DEEP : depth === 'standard' ? STOCKS_STANDARD : STOCKS_QUICK
    const cryptoList = depth === 'deep' ? CRYPTO_DEEP : depth === 'standard' ? CRYPTO_STANDARD : CRYPTO_QUICK

    // Batch sizes & delays by depth to respect rate limits
    const stockBatch = depth === 'deep' ? 10 : depth === 'standard' ? 8 : 5
    const stockDelay = depth === 'deep' ? 500 : depth === 'standard' ? 300 : 200
    const cryptoBatch = 3
    const cryptoDelay = depth === 'deep' ? 1000 : 800

    const matches: Array<{ symbol: string; isCrypto: boolean; close: number; prevClose: number; matchedPatterns: string[] }> = []
    let scanned = 0

    if (scanType === 'stocks' || scanType === 'both') {
      const results = await batchProcess(stockList, stockBatch, stockDelay, fetchStockCandles)
      for (const { item: symbol, candles } of results) {
        if (candles.length >= 3) {
          scanned++
          const matched = detectors.filter(d => d.fn(candles)).map(d => d.id)
          if (matched.length) {
            const last = candles[candles.length - 1], prev = candles[candles.length - 2]
            matches.push({ symbol, isCrypto: false, close: last.close, prevClose: prev.close, matchedPatterns: matched })
          }
        }
      }
    }

    if (scanType === 'crypto' || scanType === 'both') {
      const entries = cryptoList.map(sym => ({ sym, coinId: CRYPTO_IDS[sym] ?? sym.toLowerCase() }))
      const results = await batchProcess(entries, cryptoBatch, cryptoDelay, ({ coinId }) => fetchCryptoCandles(coinId))
      for (let i = 0; i < entries.length; i++) {
        const candles = results[i]?.candles ?? []
        if (candles.length >= 3) {
          scanned++
          const matched = detectors.filter(d => d.fn(candles)).map(d => d.id)
          if (matched.length) {
            const last = candles[candles.length - 1], prev = candles[candles.length - 2]
            matches.push({ symbol: entries[i].sym, isCrypto: true, close: last.close, prevClose: prev.close, matchedPatterns: matched })
          }
        }
      }
    }

    return Response.json({ matches, scanned, total: matches.length })
  } catch (err) {
    console.error('[patterns] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
