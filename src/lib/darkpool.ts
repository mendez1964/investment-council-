// Investment Council — Dark Pool & Smart Money Data
//
// Two data sources:
// 1. Quiver Quantitative (free tier — requires QUIVER_QUANT_API_KEY)
//    - Real dark pool block trade aggregates per ticker
//    - Congressional trading disclosures (massive edge — politicians outperform the market)
//
// 2. Stocksera FINRA short volume (no key required — fallback / supplement)
//    - Daily FINRA short volume ratio as a dark flow proxy
//    - High short ratio = selling pressure; low ratio = accumulation signal

export interface DarkPoolResult {
  // Core signal
  flow: 'bullish' | 'bearish' | 'neutral' | null
  confidence: 'high' | 'medium' | 'low'
  source: 'quiver' | 'finra' | 'none'

  // Quiver dark pool data
  blockTradeVolume: number | null       // aggregate block trades (recent)
  blockTradeVsAvg: number | null        // ratio vs 30-day avg block volume (>1.2 = elevated)
  darkPoolPct: number | null            // % of total volume in dark pools

  // Congressional trades (last 90 days)
  congressBuys: number
  congressSells: number
  congressNetBias: 'bullish' | 'bearish' | 'neutral'

  // FINRA short volume (1-day lag)
  shortVolRatio: number | null          // 0–1, e.g. 0.52 = 52% of volume is short
  shortVolDirection: 'bullish' | 'bearish' | 'neutral' | null

  // Summary for signal engine
  drivers: string[]
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: DarkPoolResult; ts: number }>()
const CACHE_MS = 10 * 60 * 1000 // 10 min — dark pool data is slow-moving

// ── Quiver Quantitative ───────────────────────────────────────────────────────

const QUIVER_BASE = 'https://api.quiverquant.com/beta'

async function fetchQuiverDarkPool(ticker: string, apiKey: string): Promise<{
  blockTradeVolume: number | null
  blockTradeVsAvg: number | null
  darkPoolPct: number | null
}> {
  const res = await fetch(`${QUIVER_BASE}/live/darkpool/${ticker}`, {
    headers: { Authorization: `Token ${apiKey}` },
    next: { revalidate: 0 },
  })
  if (!res.ok) return { blockTradeVolume: null, blockTradeVsAvg: null, darkPoolPct: null }

  const rows: Array<{ Date: string; AggregateBlockTrades: number; Close?: number }> = await res.json()
  if (!rows || rows.length === 0) return { blockTradeVolume: null, blockTradeVsAvg: null, darkPoolPct: null }

  // Most recent entry
  const latest = rows[0]
  const blockTradeVolume = latest.AggregateBlockTrades ?? null

  // Compute 30-day average from the rows (up to 30)
  const sample = rows.slice(0, 30)
  const avg = sample.length > 0
    ? sample.reduce((sum, r) => sum + (r.AggregateBlockTrades ?? 0), 0) / sample.length
    : null

  const blockTradeVsAvg = avg && avg > 0 && blockTradeVolume != null
    ? blockTradeVolume / avg
    : null

  return { blockTradeVolume, blockTradeVsAvg, darkPoolPct: null }
}

async function fetchQuiverCongress(ticker: string, apiKey: string): Promise<{
  buys: number
  sells: number
}> {
  const res = await fetch(`${QUIVER_BASE}/historical/congresstrading/${ticker}`, {
    headers: { Authorization: `Token ${apiKey}` },
    next: { revalidate: 0 },
  })
  if (!res.ok) return { buys: 0, sells: 0 }

  const rows: Array<{ Date: string; Transaction: string; Representative?: string }> = await res.json()
  if (!rows || rows.length === 0) return { buys: 0, sells: 0 }

  // Filter last 90 days
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
  const recent = rows.filter(r => new Date(r.Date).getTime() > cutoff)

  const buys  = recent.filter(r => /purchase|buy/i.test(r.Transaction)).length
  const sells = recent.filter(r => /sale|sell/i.test(r.Transaction)).length

  return { buys, sells }
}

// ── Stocksera FINRA Short Volume ──────────────────────────────────────────────

async function fetchFinraShortVolume(ticker: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://stocksera.quantcdn.ca/api/short_volume/?ticker=${ticker}&days=5`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return null

    const json = await res.json()
    const rows: Array<{ shortVolume: number; totalVolume: number }> = json?.data ?? json ?? []
    if (!rows || rows.length === 0) return null

    // Average short volume ratio over last 5 days
    const valid = rows.filter(r => r.totalVolume > 0)
    if (valid.length === 0) return null

    const avgRatio = valid.reduce((sum, r) => sum + r.shortVolume / r.totalVolume, 0) / valid.length
    return avgRatio
  } catch {
    return null
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function getDarkPoolData(ticker: string): Promise<DarkPoolResult> {
  const cacheKey = ticker.toUpperCase()
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_MS) return cached.data

  const apiKey = process.env.QUIVER_QUANT_API_KEY ?? ''
  const drivers: string[] = []

  let blockTradeVolume: number | null = null
  let blockTradeVsAvg: number | null = null
  let darkPoolPct: number | null = null
  let congressBuys = 0
  let congressSells = 0
  let shortVolRatio: number | null = null
  let source: DarkPoolResult['source'] = 'none'

  // ── Fetch in parallel ─────────────────────────────────────────────────────
  const [quiverDark, quiverCongress, finraRatio] = await Promise.all([
    apiKey ? fetchQuiverDarkPool(ticker, apiKey).catch(() => null) : Promise.resolve(null),
    apiKey ? fetchQuiverCongress(ticker, apiKey).catch(() => null) : Promise.resolve(null),
    fetchFinraShortVolume(ticker).catch(() => null),
  ])

  if (quiverDark) {
    blockTradeVolume = quiverDark.blockTradeVolume
    blockTradeVsAvg  = quiverDark.blockTradeVsAvg
    darkPoolPct      = quiverDark.darkPoolPct
    source = 'quiver'
  }

  if (quiverCongress) {
    congressBuys  = quiverCongress.buys
    congressSells = quiverCongress.sells
  }

  if (finraRatio != null) {
    shortVolRatio = finraRatio
    if (source === 'none') source = 'finra'
  }

  // ── Block trade flow signal ───────────────────────────────────────────────
  let blockFlow: 'bullish' | 'bearish' | 'neutral' | null = null

  if (blockTradeVsAvg != null) {
    if (blockTradeVsAvg > 2.0) {
      // 2x+ average block volume = major institutional interest
      // Direction inferred from price context — treated as accumulation if we don't know
      blockFlow = 'bullish'
      drivers.push(`Dark pool block trades at ${blockTradeVsAvg.toFixed(1)}x 30-day average — major institutional activity off-exchange`)
    } else if (blockTradeVsAvg > 1.3) {
      blockFlow = 'bullish'
      drivers.push(`Dark pool block volume elevated at ${blockTradeVsAvg.toFixed(1)}x average — institutional accumulation signal`)
    } else if (blockTradeVsAvg < 0.5) {
      blockFlow = 'bearish'
      drivers.push(`Dark pool block volume at ${blockTradeVsAvg.toFixed(1)}x average — institutions stepping back, distribution possible`)
    } else {
      blockFlow = 'neutral'
    }
  }

  // ── FINRA short volume signal ─────────────────────────────────────────────
  let shortVolDirection: 'bullish' | 'bearish' | 'neutral' | null = null

  if (shortVolRatio != null) {
    const pct = (shortVolRatio * 100).toFixed(1)
    if (shortVolRatio > 0.58) {
      shortVolDirection = 'bearish'
      drivers.push(`FINRA short volume ${pct}% of total — heavy short-side activity, selling pressure`)
    } else if (shortVolRatio > 0.52) {
      shortVolDirection = 'bearish'
      drivers.push(`FINRA short volume ${pct}% — elevated short selling in dark venues`)
    } else if (shortVolRatio < 0.38) {
      shortVolDirection = 'bullish'
      drivers.push(`FINRA short volume only ${pct}% — low short activity, institutions buying rather than hedging`)
    } else if (shortVolRatio < 0.44) {
      shortVolDirection = 'bullish'
      drivers.push(`FINRA short volume ${pct}% — below average short pressure, mild accumulation signal`)
    } else {
      shortVolDirection = 'neutral'
    }
  }

  // ── Congressional trade signal ────────────────────────────────────────────
  let congressNetBias: 'bullish' | 'bearish' | 'neutral' = 'neutral'

  if (congressBuys > 0 || congressSells > 0) {
    if (congressBuys > congressSells * 1.5) {
      congressNetBias = 'bullish'
      drivers.push(`Congressional trades: ${congressBuys} buys vs ${congressSells} sells (last 90d) — insider government positioning bullish`)
    } else if (congressSells > congressBuys * 1.5) {
      congressNetBias = 'bearish'
      drivers.push(`Congressional trades: ${congressSells} sells vs ${congressBuys} buys (last 90d) — politicians exiting`)
    } else if (congressBuys > 0) {
      drivers.push(`Congressional trades: ${congressBuys} buys, ${congressSells} sells (last 90d) — mixed positioning`)
    }
  }

  // ── Combined flow signal ──────────────────────────────────────────────────
  // Priority: block trades > FINRA short volume > congress
  const signals = [blockFlow, shortVolDirection].filter(Boolean)
  const bullCount = signals.filter(s => s === 'bullish').length
  const bearCount = signals.filter(s => s === 'bearish').length

  let flow: DarkPoolResult['flow'] = null
  if (signals.length === 0) {
    flow = null
  } else if (bullCount > bearCount) {
    flow = 'bullish'
  } else if (bearCount > bullCount) {
    flow = 'bearish'
  } else {
    flow = 'neutral'
  }

  const confidence: DarkPoolResult['confidence'] =
    source === 'quiver' && congressBuys + congressSells > 0 ? 'high'
    : source === 'quiver' || source === 'finra' ? 'medium'
    : 'low'

  const result: DarkPoolResult = {
    flow,
    confidence,
    source,
    blockTradeVolume,
    blockTradeVsAvg,
    darkPoolPct,
    congressBuys,
    congressSells,
    congressNetBias,
    shortVolRatio,
    shortVolDirection,
    drivers,
  }

  cache.set(cacheKey, { data: result, ts: Date.now() })
  return result
}
