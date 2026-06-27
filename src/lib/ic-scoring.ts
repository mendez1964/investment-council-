// Deterministic IC Formula scoring engine
import { getTechnicalSnapshot, getQuote } from '@/lib/finnhub'
import { UNIQUE_STOCK_UNIVERSE, CRYPTO_UNIVERSE, SECTOR_ETFS, StockEntry } from '@/lib/universe'
import { getFearGreedIndex, getBitcoinDominance, getCryptoPrice } from '@/lib/coingecko'
import { getFundingRate } from '@/lib/binance'

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
type SectorETFChange = { ticker: string; changePct: number }

async function getVIX(): Promise<VIXData> {
  try {
    const q = await getQuote('^VIX')
    const val = q?.c ?? 20
    const change10d = q?.dp ?? 0
    const regime = val < 18 ? 'risk-on' : val < 22 ? 'neutral' : val < 28 ? 'caution' : 'risk-off'
    return { value: val, regime, change10d }
  } catch {
    return { value: 20, regime: 'neutral', change10d: 0 }
  }
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
  if (up === 3) return { score: 20, bullish: true }
  if (up === 2) return { score: 15, bullish: true }
  if (up === 1 && sma20 != null && price > sma20) return { score: 10, bullish: true }
  if (up === 0) return { score: 0, bullish: false }
  return { score: 5, bullish: false }
}

function factor2Momentum(snap: any): number {
  const rsi14 = snap.rsi14 ?? 50
  const volRatio = snap.volVsAvg ?? 0
  const atr = snap.atr ?? null
  const sma50 = snap.sma50 ?? null
  const close = snap.price ?? 0
  let score = 10

  if (rsi14 >= 50 && rsi14 <= 65)      score = 20
  else if (rsi14 > 65 && rsi14 <= 72)  score = 14
  else if (rsi14 > 72 && rsi14 <= 80)  score = 8
  else if (rsi14 > 80)                  score = 4
  else if (rsi14 >= 40 && rsi14 < 50)  score = 6
  else if (rsi14 < 40)                  score = 3

  const macdHist = snap.macdHistogram ?? 0
  score += macdHist > 0 ? 10 : -2

  if (atr != null && atr > 0 && sma50 != null) {
    const atrDistance = (close - sma50) / (atr * 5)
    if (atrDistance > 3)        score += 10
    else if (atrDistance > 2)   score += 8
    else if (atrDistance > 1)   score += 5
    else if (atrDistance > 0.5) score += 3
  } else if (sma50 != null && close > sma50) {
    const pct = (close - sma50) / sma50
    score += pct > 0.05 ? 8 : pct > 0.02 ? 5 : 2
  }

  if (volRatio >= 1.3) score = Math.min(20, score + 3)
  return Math.max(0, Math.min(20, score))
}

function factor3Sector(entry: StockEntry, sectorETFData: SectorETFChange[]): number {
  const etfTicker = SECTOR_ETFS.find(e => e.sector === entry.sector)?.ticker
  if (!etfTicker) return 10
  const sorted = sectorETFData.slice().sort((a, b) => b.changePct - a.changePct)
  const top2 = new Set(sorted.slice(0, 2).map(e => e.ticker))
  const bottom2 = new Set(sorted.slice(-2).map(e => e.ticker))
  const etfEntry = sectorETFData.find(e => e.ticker === etfTicker)
  const etfChange = etfEntry?.changePct ?? 0
  if (top2.has(etfTicker) && etfChange > 0) return 20
  if (bottom2.has(etfTicker)) return 0
  if (etfChange > 0.3) return 15
  if (etfChange >= -0.3) return 10
  return 5
}

function factor4Catalyst(snap: any, entry: StockEntry, earningsDays?: number): number {
  const price = snap.price
  const volRatio = snap.volVsAvg ?? 0
  const pivot = snap.pivot ?? null
  const fib618 = snap.fib618 ?? null
  const rsi14 = snap.rsi14 ?? 50
  const bbPctB = snap.bbPctB ?? null

  const NEAR_THRESHOLD = 0.015
  const nearPivot = pivot != null && Math.abs(price - pivot.pp) / price < NEAR_THRESHOLD
  const nearFib = fib618 != null && Math.abs(price - fib618) / price < NEAR_THRESHOLD
  const nearLevel = nearPivot || nearFib
  const volAbove = volRatio >= 1.3
  const bbExtreme = bbPctB != null && (bbPctB < 25 || bbPctB > 75)

  const earningsBoost = earningsDays != null && earningsDays >= 0 && earningsDays <= 3 ? 5 : 0
  const earningsPenalty = earningsDays != null && earningsDays < 0 && earningsDays >= -2 ? -3 : 0

  if (nearLevel && bbExtreme) return Math.min(20, (volAbove ? 18 : 14) + earningsBoost)
  if (nearLevel)               return Math.min(15, (volAbove ? 12 : 8) + earningsBoost)
  if (volAbove && bbExtreme)   return Math.min(18, 12 + earningsBoost)
  if (volAbove)                return Math.min(15, 10 + earningsBoost)
  return Math.max(2, 5 + earningsBoost + earningsPenalty)
}

function factor5Regime(vix: VIXData): number {
  let score: number
  if (vix.value < 18) {
    score = vix.change10d < -1 ? 20 : 20
  } else if (vix.value <= 22) {
    score = vix.change10d > 2 ? 10 : vix.change10d < -1 ? 18 : 16
  } else if (vix.value <= 28) {
    score = vix.change10d > 3 ? 6 : vix.change10d < -2 ? 14 : 12
  } else {
    score = vix.change10d < -3 ? 10 : 6
  }
  return Math.max(0, Math.min(20, score))
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
  return {
    ticker, category: 'stock',
    icScore,
    factors: { trend: f1.score, momentum: f2, sector: f3, catalyst: f4, regime: f5 },
    scores: { f1_trend: f1.score, f2_momentum: f2, f3_sector: f3, f4_catalyst: f4, f5_regime: f5 },
    snapshot: snap,
    bias: f1.bullish ? 'bullish' : 'bearish',
    reason: `${entry.name ?? ticker} IC:${icScore}`,
  }
}

function cryptoFactor1Trend(snap: any, price: number, btcChangePct: number): number {
  const sma20 = snap.sma20 ?? null
  const sma50 = snap.sma50 ?? null
  const above20 = sma20 != null && price > sma20
  const above50 = sma50 != null && price > sma50
  if (btcChangePct > 0.5) return above20 && above50 ? 20 : above20 ? 12 : 5
  if (btcChangePct < -0.5) return !above20 && !above50 ? 15 : 5
  return above20 && above50 ? 15 : 8
}

function cryptoFactor2Momentum(snap: any): number {
  const sma20 = snap.sma20 ?? null
  const sma50 = snap.sma50 ?? null
  const price = snap.price ?? 0
  if (!sma20 || !sma50) return 5
  return price > sma20 && price > sma50 ? 20 : 10
}

// Factor 3: On-chain health proxy via Fear/Greed index
// High greed = active market but crowded; fear = potential accumulation zone
function cryptoFactor3OnChain(fearGreed: number | null): number {
  if (fearGreed == null) return 10
  if (fearGreed >= 40 && fearGreed <= 65) return 18  // healthy greed
  if (fearGreed >= 25 && fearGreed < 40)  return 16  // mild fear = accumulation
  if (fearGreed > 65 && fearGreed <= 80)  return 10  // high greed = crowded
  if (fearGreed < 25)                      return 8   // extreme fear = risky
  return 6                                             // extreme greed > 80
}

// Factor 4: Narrative/sentiment via funding rate anomaly
// Extreme positive funding = crowded longs = mean reversion risk (bearish signal)
// Negative funding = shorts paying = capitulation setup (bullish signal)
async function cryptoFactor4Narrative(symbol: string): Promise<number> {
  const rate = await getFundingRate(symbol).catch(() => null)
  if (rate == null) return 10
  if (rate < -0.05)               return 20  // negative funding: shorts capitulating, bullish
  if (rate >= -0.05 && rate < 0)  return 16  // slightly negative: healthy
  if (rate >= 0 && rate <= 0.01)  return 14  // near neutral: balanced
  if (rate > 0.01 && rate <= 0.1) return 8   // mild positive: slight crowding
  return 4                                    // >0.1%: heavily crowded longs, mean reversion risk
}

function cryptoFactor5Regime(fearGreed: number | null, vix: VIXData): number {
  if (fearGreed != null) {
    if (fearGreed >= 40 && fearGreed <= 65) return 20
    if (fearGreed >= 25 && fearGreed < 40)  return 16
    if (fearGreed > 65 && fearGreed <= 80)  return 12
    if (fearGreed > 80 || fearGreed < 25)   return 5
    return 10
  }
  return vix.regime === 'risk-on' ? 20 : vix.regime === 'neutral' ? 16 : 10
}

async function computeScoreForCrypto(
  entry: typeof CRYPTO_UNIVERSE[0],
  snap: any,
  btcChangePct: number,
  fearGreed: number | null,
  vix: VIXData,
): Promise<ScoredCandidate | null> {
  const price = snap.price
  if (!price) return null
  const f1 = cryptoFactor1Trend(snap, price, btcChangePct)
  const f2 = cryptoFactor2Momentum(snap)
  const f3 = cryptoFactor3OnChain(fearGreed)
  const f4 = await cryptoFactor4Narrative(entry.symbol)
  const f5 = cryptoFactor5Regime(fearGreed, vix)
  const icScore = f1 + f2 + f3 + f4 + f5
  if (icScore < 60) return null
  return {
    ticker: entry.symbol, category: 'crypto',
    icScore,
    factors: { trend: f1, momentum: f2, sector: f3, catalyst: f4, regime: f5 },
    scores: { f1_trend: f1, f2_momentum: f2, f3_sector: f3, f4_catalyst: f4, f5_regime: f5 },
    snapshot: snap,
    bias: f1 >= 12 ? 'bullish' : f1 < 8 ? 'bearish' : 'neutral',
    reason: `${entry.symbol} IC:${icScore}`,
  }
}

async function getSectorETFChanges(): Promise<SectorETFChange[]> {
  const results = await Promise.allSettled(
    SECTOR_ETFS.map(async (etf) => {
      const d = await getQuote(etf.ticker).catch(() => null)
      return { ticker: etf.ticker, changePct: d?.dp ?? 0 }
    })
  )
  return results
    .filter((r): r is PromiseFulfilledResult<SectorETFChange> => r.status === 'fulfilled')
    .map(r => r.value)
}

export async function getUniversePicks(maxStock = 30, maxCrypto = 10): Promise<{
  stocks: ScoredCandidate[]
  cryptos: ScoredCandidate[]
  marketContext: string
}> {
  const [vix, sectorData, fgResult, btcDomResult, btcResult] = await Promise.allSettled([
    getVIX(),
    getSectorETFChanges(),
    getFearGreedIndex(),
    getBitcoinDominance(),
    getCryptoPrice('bitcoin'),
  ])

  const vixData: VIXData = vix.status === 'fulfilled' ? vix.value : { value: 20, regime: 'neutral', change10d: 0 }
  const sectors: SectorETFChange[] = sectorData.status === 'fulfilled' ? sectorData.value : []
  const fg: number | null = fgResult.status === 'fulfilled' ? (fgResult.value?.value ?? null) : null
  const btcDom: number | null = btcDomResult.status === 'fulfilled' ? (btcDomResult.value?.btcDominance ?? null) : null
  const btcPrice: number = btcResult.status === 'fulfilled' ? ((btcResult.value as any)?.price ?? 0) : 0
  const btcChangePct: number = btcResult.status === 'fulfilled' ? ((btcResult.value as any)?.change_pct_24h ?? 0) : 0

  // Score stocks
  const stockSnaps = await Promise.allSettled(
    UNIQUE_STOCK_UNIVERSE.map(async (entry) => ({
      entry,
      snap: await getTechnicalSnapshot(entry.ticker).catch(() => null),
    }))
  )
  const stockResults: ScoredCandidate[] = []
  for (const r of stockSnaps) {
    if (r.status !== 'fulfilled' || !r.value.snap?.price) continue
    const scored = computeScoreForStock(r.value.entry.ticker, r.value.snap, r.value.entry, vixData, sectors)
    if (scored) stockResults.push(scored)
  }
  stockResults.sort((a, b) => b.icScore - a.icScore)

  // Score cryptos
  const cryptoSnaps = await Promise.allSettled(
    CRYPTO_UNIVERSE.map(async (entry) => ({
      entry,
      snap: await getTechnicalSnapshot(entry.symbol).catch(() => null),
    }))
  )
  const cryptoResults: ScoredCandidate[] = []
  for (const r of cryptoSnaps) {
    if (r.status !== 'fulfilled' || !r.value.snap?.price) continue
    const scored = await computeScoreForCrypto(r.value.entry, r.value.snap, btcChangePct, fg, vixData)
    if (scored) cryptoResults.push(scored)
  }
  cryptoResults.sort((a, b) => b.icScore - a.icScore)

  const marketContext = [
    `VIX: ${vixData.value.toFixed(1)} (${vixData.regime}, 10d change: ${vixData.change10d > 0 ? '+' : ''}${vixData.change10d.toFixed(1)})`,
    fg != null ? `Fear & Greed: ${fg}` : null,
    btcDom != null ? `BTC Dominance: ${btcDom.toFixed(1)}%` : null,
    btcPrice > 0 ? `BTC: $${btcPrice.toLocaleString()}` : null,
  ].filter(Boolean).join(' | ')

  return {
    stocks: stockResults.slice(0, maxStock),
    cryptos: cryptoResults.slice(0, maxCrypto),
    marketContext,
  }
}
