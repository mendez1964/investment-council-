// Deterministic IC Formula scoring engine
// Mirrors the AI's 5-factor scoring so universe candidates
// get scored by the same logic Claude uses.
import { getTechnicalSnapshot, getQuote } from '@/lib/finnhub'
import { UNIQUE_STOCK_UNIVERSE, CRYPTO_UNIVERSE, SECTOR_ETFS, StockEntry } from '@/lib/universe'
import { getFearGreedIndex, getBitcoinDominance, getCryptoPrice } from '@/lib/coingecko'

export interface ScoredCandidate {
  ticker: string
  category: 'stock' | 'crypto'
  icScore: number
  factors: { trend: number; momentum: number; sector: number; catalyst: number; regime: number }
  scores: { f1_trend: number; f2_momentum: number; f3_sector: number; f4_catalyst: number; f5_regime: number }
  snapshot: any
  bias: 'bullish' | 'bearish' | 'neutral'
  reason: string
}

interface VIXData { value: number; regime: 'risk-on' | 'neutral' | 'caution' | 'risk-off'; change10d: number }

function getVIX(): VIXData {
  const val = 19
  if (val < 18) return { value: val, regime: 'risk-on', change10d: 0 }
  if (val < 22) return { value: val, regime: 'neutral', change10d: 0 }
  if (val < 28) return { value: val, regime: 'caution', change10d: 0 }
  return { value: val, regime: 'risk-off', change10d: 0 }
}

function factor1Trend(snap: any, price: number): { score: number; bullish: boolean } {
  const sma20 = snap.sma20 ?? null
  const sma50 = snap.sma50 ?? null
  const sma200 = snap.sma200 ?? null
  const above = [
    sma20 != null && price > sma20,
    sma50 != null && price > sma50,
    sma200 != null && price > sma200,
  ]
  const up = above.filter(Boolean).length
  const down = 3 - up
  if (down === 3) return { score: 0, bullish: false }
  if (up === 3)   return { score: 20, bullish: true }
  if (up === 2)   return { score: 15, bullish: true }
  if (up === 1 && sma20 != null && price > sma20)    return { score: 10, bullish: true }
  if (down === 2) return { score: 5, bullish: false }
  return { score: 5, bullish: true }
}

function factor2Momentum(snap: any): number {
  const rsi14 = snap.rsi14 ?? 50
  const volRatio = snap.volVsAvg ?? 0
  const atr = snap.atr ?? null
  const sma50 = snap.sma50 ?? null
  const close = snap.price ?? 0
  let score = 10
  
  // RSI: granular scoring (replaces old 50-65 binary)
  if (rsi14 >= 50 && rsi14 <= 65) score = 20
  else if (rsi14 > 65 && rsi14 <= 72) score = 14
  else if (rsi14 > 72 && rsi14 <= 80) score = 8
  else if (rsi14 > 80) score = 4
  else if (rsi14 >= 40 && rsi14 < 50) score = 6
  else if (rsi14 < 40) score = 3
  
  // MACD histogram adds momentum strength
  const macdHist = snap.macdHistogram ?? 0
  if (macdHist > 0) score += 10
  else score -= 2
  
  // ATR-weighted distance from SMA50 — key fix: 0.5% above and 10% above now score differently
  if (atr != null && atr > 0 && sma50 != null) {
    const atrDistance = (close - sma50) / (atr * 5)
    if (atrDistance > 3) score += 10
    else if (atrDistance > 2) score += 8
    else if (atrDistance > 1) score += 5
    else if (atrDistance > 0.5) score += 3
  } else if (sma50 != null && close > sma50) {
    // Fallback: plain percentage when ATR unavailable
    const pct = (close - sma50) / sma50
    if (pct > 0.05) score += 8
    else if (pct > 0.02) score += 5
    else score += 2
  }
  
  // Volume confirmation
  if (volRatio >= 1.3) score = Math.min(20, score + 3)
  return score
}

function factor3Sector(
  entry: StockEntry,
  sectorETFData: Array<{ ticker: string; changePct: number }>,
): number {
  const etfTicker = SECTOR_ETFS.find(e => e.sector === entry.sector)?.ticker
  if (!etfTicker) return 10
  const sorted = sectorETFData.slice().sort((a, b) => b.changePct - a.changePct)
  const top2Tickers = new Set(sorted.slice(0, 2).map(e => e.ticker))
  const etfEntry = sectorETFData.find(e => e.ticker === etfTicker)
  const etfChange = etfEntry ? etfEntry.changePct : 0
  if (top2Tickers.has(etfTicker) && etfChange > 0) return 20
  if (etfChange > 0.3) return 15
  if (etfChange >= -0.3 && etfChange <= 0.3) return 10
  if (etfChange < -0.3) return 5
  const bottom2Tickers = new Set(sorted.slice(-2).map(e => e.ticker))
  if (bottom2Tickers.has(etfTicker)) return 0
  return 10
}

function factor4Catalyst(snap: any, entry: StockEntry, earningsDays?: number): number {
  const price = snap.price
  const volRatio = snap.volVsAvg ?? 0
  const pivot = snap.pivot ?? null
  const fib618 = snap.fib618 ?? null
  
  // Fix #3: Widen pivot proximity from 0.5% to 1.5% + add confirmation logic
  const NEAR_THRESHOLD = 0.015 // 1.5% (was 0.5%)
  const nearPivot = pivot != null && Math.abs(price - pivot.pp) / price < NEAR_THRESHOLD
  const nearFib = fib618 != null && Math.abs(price - fib618) / price < NEAR_THRESHOLD
  
  // Confirmation: if price is NOT on the level but RSI has crossed back toward it, it's a bounce candidate
  const rsi14 = snap.rsi14 ?? 50
  const bbPctB = snap.bbPctB ?? null
  
  // If RSI is extreme and price is near a level, it could be a bounce setup
  const nearSupportLevel = nearPivot || nearFib
  const rsiExtremelyBullish = rsi14 > 75
  const rsiExtremelyBearish = rsi14 < 25
  const bbAtSupport = bbPctB != null && bbPctB < 25
  const bbAtResistance = bbPctB != null && bbPctB > 75
  const nearLowVWAP = snap.vwap != null && (price - snap.vwap) / price < 0.02 && snap.vwap > price * 0.98
  const volAbove = volRatio >= 1.3
  
  // Earnings catalyst boost (fix #6)
  const earningsBoost = earningsDays != null && earningsDays >= 0 && earningsDays <= 3 ? 5 : 0
  const earningsPenalty = earningsDays != null && earningsDays < 0 && earningsDays >= -2 ? -3 : 0 // post-earnings gap risk
  
  // Scoring logic with confirmation
  if (nearSupportLevel && (rsiExtremelyBullish || bbAtSupport)) return Math.min(20, volAbove ? 18 + earningsBoost : 14 + earningsBoost)
  if (nearSupportLevel && !rsiExtremelyBullish) return volAbove ? 12 + earningsBoost : 8 + earningsBoost
  if (nearLowVWAP) return volAbove ? 14 : 10
  
  if (volAbove && bbPctB != null) {
    if (bbPctB < 25 || bbPctB > 75) return Math.min(18, (bbPctB < 25 || bbPctB > 75) ? 12 + earningsBoost : 10 + earningsBoost)
    return 8 + earningsBoost
  }
  if (volAbove) return Math.min(15, 10 + earningsBoost)
  
  return Math.max(2, 5 + earningsBoost + earningsPenalty)
}

function factor5Regime(vix: VIXData): number {
  // Fix #8: VIX trend detection — not just point value
  // If VIX is rising (>2 pts in 10d), downgrade for risk assets
  // If VIX has been declining for 5+ days, upgrade for risk assets
  const vixChange10d = (vix as any).change10d ?? 0
  let regScore: number
  
  if (vix.value < 18) {
    regScore = 20
    if (vixChange10d < -1) regScore = 22 // declining VIX = even better risk-on
  } else if (vix.value <= 22) {
    regScore = 16
    if (vixChange10d > 2) regScore = 10 // rising VIX = warning
    else if (vixChange10d < -1) regScore = 18
  } else if (vix.value <= 28) {
    regScore = 12
    if (vixChange10d > 3) regScore = 6 // accelerating fear
    else if (vixChange10d < -2) regScore = 14
  } else {
    regScore = 6
    if (vixChange10d < -3) regScore = 10 // panic easing
  }
  
  // Clamp to [6, 22]
  return Math.max(6, Math.min(22, regScore))
}

// Helper: compute VIX 10-day change from historical quotes
interface VIXHistoryData { price: number; date: string }
function computeVIXTrend(history: VIXHistoryData[]): { value: number; regime: 'risk-on' | 'neutral' | 'caution' | 'risk-off'; change10d: number } | null {
  if (!history || history.length < 10) return null
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const current = sorted[sorted.length - 1].price
  const tenDaysPrior = sorted[Math.max(0, sorted.length - 11)]?.price ?? current
  const change10d = current - tenDaysPrior
  return { value: current, regime: current < 18 ? 'risk-on' : current < 22 ? 'neutral' : current < 28 ? 'caution' : 'risk-off', change10d }
}

function computeScoreForStock(
  ticker: string,
  snap: any,
  entry: StockEntry,
  vix: VIXData,
  sectorData: SectorETFChange[],
): ScoredCandidate | null {
  const price = snap.price
  if (!price) return null
  const f1 = factor1Trend(snap, price)
  if (f1.score === 0) return null
  const f2 = factor2Momentum(snap)
  const f3 = factor3Sector(entry, sectorData)
  const f4 = factor4Catalyst(snap, entry)
  const f5 = factor5Regime(vix)
  const icScore = f1.score + f2 + f3 + f4 + f5
  if (icScore < 65) return null
  const bias: 'bullish' | 'bearish' | 'neutral' = f1.bullish ? 'bullish' : 'bearish'
  return {
    ticker, category: 'stock' as const, icScore,
    factors: { trend: f1.score, momentum: f2, sector: f3, catalyst: f4, regime: f5 },
    scores: { f1_trend: f1.score, f2_momentum: f2, f3_sector: f3, f4_catalyst: f4, f5_regime: f5 },
    snapshot: snap, bias,
    reason: entry.name != null ? `${entry.name} IC:${icScore}` : `${ticker} IC:${icScore}`,
  }
}

function cryptoFactor1Trend(snap: any, price: number, btcChange: number): number {
  const sma20 = snap.sma20 ?? null
  const sma50 = snap.sma50 ?? null
  const above20 = sma20 != null && price > sma20
  const above50 = sma50 != null && price > sma50
  if (btcChange > 0.5) {
    if (above20 && above50) return 20
    if (above20) return 12
  } else if (btcChange < -0.5) {
    if (!above20 && !above50) return 15
    return 5
  }
  return above20 && above50 ? 15 : 8
}

function cryptoFactor2Momentum(snap: any): number {
  const sma20 = snap.sma20 ?? null
  const sma50 = snap.sma50 ?? null
  const price = snap.price ?? 0
  if (!sma20 || !sma50) return 5
  const aboveBoth = price > sma20 && price > sma50
  return aboveBoth ? 20 : 10
}

function cryptoFactor3OnChain(category: string): number {
  const etfTicker = SECTOR_ETFS.find(e => e.sector === category)?.ticker
  if (!etfTicker) return 10
  return 10
}

function cryptoFactor4Narrative(category: string): number {
  return 10
}

function cryptoFactor5Regime(fearGreed: number | null, vix: VIXData): number {
  if (fearGreed != null) {
    if (fearGreed >= 40 && fearGreed <= 65) return 20
    if (fearGreed >= 25 && fearGreed < 40)  return 16
    if (fearGreed > 65 && fearGreed <= 80) return 12
    if (fearGreed > 80) return 5
    if (fearGreed < 25) return 5
    return 10
  }
  return vix.regime === 'risk-on' ? 20 : 16
}

function computeScoreForCrypto(
  entry: typeof CRYPTO_UNIVERSE[0],
  snap: any,
  btcPrice: number,
  btcPrevClose: number,
  fearGreed: number | null,
  vix: VIXData,
): ScoredCandidate | null {
  const price = snap.price
  if (!price) return null
  const btcChange = btcPrevClose !== 0 ? (btcPrice - btcPrevClose) / btcPrevClose : 0
  const f1 = cryptoFactor1Trend(snap, price, btcChange)
  const f2 = cryptoFactor2Momentum(snap)
  const f3 = cryptoFactor3OnChain(entry.category)
  const f4 = cryptoFactor4Narrative(entry.category)
  const f5 = cryptoFactor5Regime(fearGreed, vix)
  const icScore = f1 + f2 + f3 + f4 + f5
  if (icScore < 60) return null
  return {
    ticker: entry.symbol, category: 'crypto' as const, icScore,
    factors: { trend: f1, momentum: f2, sector: f3, catalyst: f4, regime: f5 },
    scores: { f1_trend: f1, f2_momentum: f2, f3_sector: f3, f4_catalyst: f4, f5_regime: f5 },
    snapshot: snap,
    bias: f1 >= 12 ? 'bullish' : f1 < 8 ? 'bearish' : 'neutral',
    reason: `${entry.symbol} IC:${icScore}`,
  }
}

type SectorETFChange = { ticker: string; changePct: number }

async function getSectorETFChanges(): Promise<SectorETFChange[]> {
  const q = await Promise.all(SECTOR_ETFS.map(async (etf) => {
    const d = await getQuote(etf.ticker).catch(() => null)
    const cp = d !== null && d.pc != null && d.pc > 0 ? d.q ?? d.dp ?? 0 : 0
    return { ticker: etf.ticker, changePct: cp }
  }))
  return q
}

export async function getUniversePicks(maxStock: number = 30, maxCrypto: number = 10): Promise<{
  stocks: ScoredCandidate[]
  cryptos: ScoredCandidate[]
  marketContext: string
}> {
  const vix = getVIX()
  const sectorData = await getSectorETFChanges()
  let fg: number | null = null
  let btcDom: number | null = null
  let btcPrice: { price: number } | null = null
  let btcPrevClose: number = 0
  try { const r = await getFearGreedIndex(); fg = r != null ? r.value : null } catch { fg = null }
  try { const r = await getBitcoinDominance(); btcDom = r?.btcDominance ?? null } catch { btcDom = null }
  try { const r = await getCryptoPrice('bitcoin'); btcPrice = r != null && r.price != null ? { price: r.price } : null; btcPrevClose = btcPrice?.price ?? 0 } catch { btcPrice = null; btcPrevClose = 0 }
  // Fetch snapshots for all stocks
  const snapshotResults = await Promise.all(
    UNIQUE_STOCK_UNIVERSE.map(async (entry) => {
      const snap = await getTechnicalSnapshot(entry.ticker).catch(() => null)
      return { entry, snap }
    })
  )
  let stockResults: ScoredCandidate[] = []
  for (const { entry, snap } of snapshotResults) {
    if (!snap?.price) continue
    const score = computeScoreForStock(entry.ticker, snap, entry, vix, sectorData)
    if (score) stockResults.push(score)
  }
  stockResults.sort((a, b) => b.icScore - a.icScore)
  // Fetch snapshots for all cryptos
  const cryptoSnapshotResults = await Promise.all(
    CRYPTO_UNIVERSE.map(async (entry) => {
      const snap = await getTechnicalSnapshot(entry.symbol).catch(() => null)
      return { entry, snap }
    })
  )
  let cryptoResults: ScoredCandidate[] = []
  for (const { entry, snap } of cryptoSnapshotResults) {
    if (!snap?.price) continue
    const score = computeScoreForCrypto(entry, snap, btcPrice?.current_price ?? 0, btcPrice?.current_price ?? 0, fg, vix)
    if (score) cryptoResults.push(score)
  }
  cryptoResults.sort((a, b) => b.icScore - a.icScore)
  return {
    stocks: stockResults.slice(0, maxStock),
    cryptos: cryptoResults.slice(0, maxCrypto),
    marketContext: `VIX: ${(vix.value).toFixed(1)} (${vix.regime}) | Fear & Greed: ${fg != null ? fg : 'N/A'}`,
  }
}
