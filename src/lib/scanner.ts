// Intelligence-Driven Scanner — Investment Council Framework Scans
// Each scan thinks like a specific council member and finds what THEY would find
// NOTE: Uses Alpha Vantage overview data (10 calls per full scan)
// Alpha Vantage free tier = 25 calls/day — use scans judiciously

import { getTopMovers, getCompanyOverview } from '@/lib/alpha-vantage'
import { getFedFundsRate, getYieldCurve, getUnemploymentRate } from '@/lib/fred'

// Core stock universe — balanced across momentum, growth, and value
// Kept to 10 stocks to stay within Alpha Vantage daily quota
const SCAN_UNIVERSE = [
  'AAPL', 'MSFT', 'NVDA', 'TSLA',   // Tech / momentum
  'META', 'AMZN',                     // Mega-cap growth
  'JPM',  'JNJ',                      // Value / defensive
  'XOM',  'WMT',                      // Energy / consumer
]

// ── Data types ────────────────────────────────────────────────────────────────

interface StockData {
  ticker: string
  name: string
  sector: string
  sma50: number | null    // 50-day moving average — used as price proxy
  sma200: number | null   // 200-day moving average
  week52High: number | null
  week52Low: number | null
  pe: number | null
  eps: number | null
  peg: number | null
  roe: number | null          // Return on equity as % (e.g. 25 = 25%)
  bookValue: number | null    // Book value per share
  priceToBook: number | null
  revenueGrowth: number | null  // Quarterly YOY revenue growth as %
  dividendPerShare: number | null
  marketCap: number | null
}

export interface ScanCandidate {
  ticker: string
  name: string
  reason: string
  price?: string
}

export interface FrameworkScanResult {
  framework: string
  subtitle: string
  candidates: ScanCandidate[]
  summary: string
  noResults: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function n(val: string | undefined | null): number | null {
  if (!val || val === 'None' || val === '-' || val === 'N/A') return null
  const parsed = parseFloat(val)
  return isNaN(parsed) ? null : parsed
}

function fmt(num: number | null, prefix = '$', decimals = 2): string {
  if (num === null) return 'N/A'
  return `${prefix}${num.toFixed(decimals)}`
}

// ── Fetch stock universe ──────────────────────────────────────────────────────

async function fetchStockUniverse(): Promise<StockData[]> {
  const results = await Promise.allSettled(
    SCAN_UNIVERSE.map(ticker => getCompanyOverview(ticker))
  )

  return results
    .map((result, idx) => {
      if (result.status === 'rejected') return null
      const o = result.value
      if (!o || !o.Symbol || o.Note) return null  // rate limit or empty response

      const roeRaw = n(o.ReturnOnEquityTTM)
      const revGrowthRaw = n(o.QuarterlyRevenueGrowthYOY)

      return {
        ticker: SCAN_UNIVERSE[idx],
        name: o.Name || SCAN_UNIVERSE[idx],
        sector: o.Sector || 'Unknown',
        sma50: n(o['50DayMovingAverage']),
        sma200: n(o['200DayMovingAverage']),
        week52High: n(o['52WeekHigh']),
        week52Low: n(o['52WeekLow']),
        pe: n(o.PERatio),
        eps: n(o.EPS),
        peg: n(o.PEGRatio),
        roe: roeRaw !== null ? roeRaw * 100 : null,  // convert decimal to %
        bookValue: n(o.BookValue),
        priceToBook: n(o.PriceToBookRatio),
        revenueGrowth: revGrowthRaw !== null ? revGrowthRaw * 100 : null,  // convert to %
        dividendPerShare: n(o.DividendPerShare),
        marketCap: n(o.MarketCapitalization),
      } as StockData
    })
    .filter((s): s is StockData => s !== null)
}

// ── TUDOR JONES: Trend Pullback Setups ───────────────────────────────────────
// Confirmed uptrend (50DMA > 200DMA) with meaningful pullback from 52wk high
// Tudor looks for trend resumption setups, not breakouts

function tudorJonesScan(stocks: StockData[]): FrameworkScanResult {
  const candidates: ScanCandidate[] = []

  for (const s of stocks) {
    if (!s.sma50 || !s.sma200 || !s.week52High || !s.week52Low) continue

    // Must be in confirmed uptrend: 50DMA above 200DMA
    const inUptrend = s.sma50 > s.sma200

    // Must have pulled back from high: 5-25% below 52wk high
    const distFromHigh = (s.week52High - s.sma50) / s.week52High
    const inPullbackZone = distFromHigh >= 0.05 && distFromHigh <= 0.25

    if (inUptrend && inPullbackZone) {
      const pctFromHigh = (distFromHigh * 100).toFixed(1)
      candidates.push({
        ticker: s.ticker,
        name: s.name,
        reason: `Uptrend confirmed (50DMA ${fmt(s.sma50, '$', 0)} > 200DMA ${fmt(s.sma200, '$', 0)}) · Pulled back ${pctFromHigh}% from 52wk high — reset zone`,
        price: fmt(s.sma50),
      })
    }
  }

  return {
    framework: 'TUDOR JONES',
    subtitle: 'Trend Pullback Setups',
    candidates,
    summary: candidates.length > 0
      ? `${candidates.length} stock(s) in confirmed uptrend with meaningful pullback — potential resumption setups. Verify RSI and volume before entry.`
      : 'No clean trend-pullback setups in current universe. Market may be extended or in correction.',
    noResults: candidates.length === 0,
  }
}

// ── LIVERMORE: Pivot Point Breakouts ─────────────────────────────────────────
// Stocks at or near 52-week highs — Livermore's "line of least resistance"
// A close above the pivot is the buy signal

function livermoreScan(stocks: StockData[]): FrameworkScanResult {
  const candidates: ScanCandidate[] = []

  for (const s of stocks) {
    if (!s.week52High || !s.sma50) continue

    // Within 3% of 52-week high — Livermore's pivot zone
    const distFromHigh = (s.week52High - s.sma50) / s.week52High
    const atPivot = distFromHigh >= 0 && distFromHigh <= 0.03

    // Not in a clear downtrend (50DMA not significantly below 200DMA)
    const notDowntrend = !s.sma200 || s.sma50 >= s.sma200 * 0.97

    if (atPivot && notDowntrend) {
      const pctBelow = (distFromHigh * 100).toFixed(1)
      candidates.push({
        ticker: s.ticker,
        name: s.name,
        reason: `${pctBelow}% below 52wk high (${fmt(s.week52High, '$', 0)}) — at Livermore pivot point. Breakout above ${fmt(s.week52High)} is the entry signal.`,
        price: fmt(s.sma50),
      })
    }
  }

  return {
    framework: 'LIVERMORE',
    subtitle: 'Pivot Point Breakout Setups',
    candidates,
    summary: candidates.length > 0
      ? `${candidates.length} stock(s) at Livermore pivot points. A close above the 52wk high confirms the breakout — that is when Livermore would buy.`
      : 'No stocks at Livermore pivot points in this universe right now.',
    noResults: candidates.length === 0,
  }
}

// ── BUFFETT: Quality Value with Moat ─────────────────────────────────────────
// Reasonable P/E, strong ROE, positive earnings
// Buffett wants quality businesses at fair prices

function buffettScan(stocks: StockData[]): FrameworkScanResult {
  const candidates: ScanCandidate[] = []

  for (const s of stocks) {
    if (!s.pe || !s.eps || s.eps <= 0) continue

    const reasonablePE = s.pe > 0 && s.pe < 25       // not overpriced
    const strongROE = s.roe !== null && s.roe > 15    // 15%+ return on equity
    const positiveEPS = s.eps > 0

    if (reasonablePE && strongROE && positiveEPS) {
      const parts: string[] = []
      if (s.pe) parts.push(`P/E ${s.pe.toFixed(1)}`)
      if (s.roe) parts.push(`ROE ${s.roe.toFixed(1)}%`)
      if (s.eps) parts.push(`EPS ${fmt(s.eps)}`)
      parts.push(s.sector)

      candidates.push({
        ticker: s.ticker,
        name: s.name,
        reason: parts.join(' · '),
        price: fmt(s.sma50),
      })
    }
  }

  return {
    framework: 'BUFFETT',
    subtitle: 'Quality Value with Moat',
    candidates,
    summary: candidates.length > 0
      ? `${candidates.length} stock(s) with quality fundamentals at reasonable prices. Buffett would then assess the moat and hold for years.`
      : 'No Buffett-style opportunities in this universe. Market may be fully priced or universe too growth-heavy.',
    noResults: candidates.length === 0,
  }
}

// ── LYNCH: Growth at Reasonable Price (GARP) ─────────────────────────────────
// PEG ratio below 1.5 is Lynch's key metric — growth not yet priced in

function lynchScan(stocks: StockData[]): FrameworkScanResult {
  const candidates: ScanCandidate[] = []

  for (const s of stocks) {
    if (!s.peg || s.peg <= 0) continue

    const goodPEG = s.peg < 1.5                                  // Lynch's threshold
    const positiveEPS = s.eps !== null && s.eps > 0
    const growthPresent = s.revenueGrowth !== null && s.revenueGrowth > 10  // 10%+ revenue growth

    if (goodPEG && positiveEPS) {
      const parts: string[] = [`PEG ${s.peg.toFixed(2)}`]
      if (s.revenueGrowth) parts.push(`Rev growth ${s.revenueGrowth.toFixed(1)}%`)
      if (s.pe) parts.push(`P/E ${s.pe.toFixed(1)}`)
      if (!growthPresent) parts.push('⚠ verify revenue growth')

      candidates.push({
        ticker: s.ticker,
        name: s.name,
        reason: parts.join(' · '),
        price: fmt(s.sma50),
      })
    }
  }

  return {
    framework: 'LYNCH',
    subtitle: 'Growth at Reasonable Price (GARP)',
    candidates,
    summary: candidates.length > 0
      ? `${candidates.length} GARP candidate(s). Lynch said: understand the business before you buy. Know why it will keep growing.`
      : 'No GARP opportunities found. Growth stocks may be fully priced (high PEG).',
    noResults: candidates.length === 0,
  }
}

// ── GRAHAM: Deep Value — Margin of Safety ────────────────────────────────────
// Graham Number = sqrt(22.5 × EPS × BookValue) — the ceiling price for value
// Graham wanted to buy well below this number

function grahamScan(stocks: StockData[]): FrameworkScanResult {
  const candidates: ScanCandidate[] = []

  for (const s of stocks) {
    if (!s.eps || s.eps <= 0) continue

    const lowPE = s.pe !== null && s.pe > 0 && s.pe < 15     // Graham's PE ceiling
    const paysDividend = s.dividendPerShare !== null && s.dividendPerShare > 0
    const positiveEPS = s.eps > 0

    // Graham Number: sqrt(22.5 × EPS × BookValue per share)
    let grahamNumber: number | null = null
    let belowGrahamNumber = false
    if (s.bookValue && s.bookValue > 0 && s.sma50) {
      grahamNumber = Math.sqrt(22.5 * s.eps * s.bookValue)
      belowGrahamNumber = s.sma50 < grahamNumber
    }

    // Qualifies if: below Graham Number OR (low PE + paying dividend)
    if ((belowGrahamNumber || (lowPE && paysDividend)) && positiveEPS) {
      const parts: string[] = []
      if (belowGrahamNumber && grahamNumber) {
        parts.push(`Below Graham Number (${fmt(grahamNumber, '$', 0)} ceiling)`)
      }
      if (s.pe) parts.push(`P/E ${s.pe.toFixed(1)}`)
      if (paysDividend) parts.push(`Dividend ${fmt(s.dividendPerShare)}/share`)
      if (s.bookValue) parts.push(`Book value ${fmt(s.bookValue)}/share`)

      candidates.push({
        ticker: s.ticker,
        name: s.name,
        reason: parts.join(' · '),
        price: fmt(s.sma50),
      })
    }
  }

  return {
    framework: 'GRAHAM',
    subtitle: 'Deep Value — Margin of Safety',
    candidates,
    summary: candidates.length > 0
      ? `${candidates.length} Graham-style deep value candidate(s). Graham would verify balance sheet strength before buying.`
      : 'No deep value found in this universe. These stocks are fairly or richly priced by Graham standards.',
    noResults: candidates.length === 0,
  }
}

// ── GRANTHAM: Bubble Warnings & Mean Reversion ───────────────────────────────
// Grantham watches for extreme valuations and identifies beaten-down assets

function granthamScan(stocks: StockData[]): FrameworkScanResult {
  const warnings: ScanCandidate[] = []
  const meanReversion: ScanCandidate[] = []

  for (const s of stocks) {
    if (!s.sma50) continue

    // Bubble warning: very high PE (extended valuation)
    if (s.pe !== null && s.pe > 35) {
      warnings.push({
        ticker: s.ticker,
        name: s.name,
        reason: `P/E of ${s.pe.toFixed(0)} — extended valuation territory. Grantham would call this bubble-level pricing.`,
        price: fmt(s.sma50),
      })
    }

    // Mean reversion candidate: near 52wk low with positive earnings
    if (s.week52Low && s.eps && s.eps > 0) {
      const distFromLow = (s.sma50 - s.week52Low) / s.week52Low
      if (distFromLow < 0.15) {
        meanReversion.push({
          ticker: s.ticker,
          name: s.name,
          reason: `${(distFromLow * 100).toFixed(1)}% above 52wk low · Positive EPS ${fmt(s.eps)} · Beaten down with intact earnings — mean reversion candidate`,
          price: fmt(s.sma50),
        })
      }
    }
  }

  const all = [
    ...warnings.map(w => ({ ...w, reason: `⚠ BUBBLE RISK: ${w.reason}` })),
    ...meanReversion.map(o => ({ ...o, reason: `↩ MEAN REVERSION: ${o.reason}` })),
  ]

  return {
    framework: 'GRANTHAM',
    subtitle: 'Bubble Warnings & Mean Reversion',
    candidates: all,
    summary: warnings.length > 0
      ? `${warnings.length} bubble warning(s). ${meanReversion.length} mean reversion candidate(s). Grantham would reduce overvalued positions and look at beaten-down assets.`
      : `No extreme bubble signals detected. ${meanReversion.length > 0 ? meanReversion.length + ' mean reversion opportunity(ies) noted.' : 'Universe appears fairly valued.'}`,
    noResults: all.length === 0,
  }
}

// ── DALIO: All Weather — Macro-Aligned Assets ────────────────────────────────
// Dalio's framework is entirely macro-driven using FRED data
// Maps current economic regime to asset class recommendations

async function dalioScan(): Promise<FrameworkScanResult> {
  const [fed, yc, unemp] = await Promise.all([
    getFedFundsRate().catch(() => null),
    getYieldCurve().catch(() => null),
    getUnemploymentRate().catch(() => null),
  ])

  const fedRate = fed ? parseFloat(fed.value) : null
  const spread = yc?.spread?.value ? parseFloat(yc.spread.value) : null
  const unempRate = unemp ? parseFloat(unemp.value) : null

  // Determine macro regime
  const inflationaryEnv = fedRate !== null && fedRate > 3.5   // rates still elevated = inflation concern
  const growthSlowing = spread !== null && spread < 0.5        // flat or inverted curve = slower growth
  const highUnemployment = unempRate !== null && unempRate > 5

  let regime: string
  const candidates: ScanCandidate[] = []

  if (inflationaryEnv && growthSlowing) {
    regime = 'STAGFLATION (High Inflation + Slowing Growth)'
    candidates.push(
      { ticker: 'GLD', name: 'Gold ETF', reason: 'Best performer in stagflation — store of value when both inflation and recession risk are high' },
      { ticker: 'TIP', name: 'TIPS ETF', reason: 'Treasury Inflation-Protected Securities — direct inflation hedge' },
      { ticker: 'XLE', name: 'Energy Sector ETF', reason: 'Energy/commodities historically outperform in stagflation' },
    )
  } else if (inflationaryEnv && !growthSlowing) {
    regime = 'INFLATIONARY GROWTH (Rates High + Economy Growing)'
    candidates.push(
      { ticker: 'XLE', name: 'Energy Sector ETF', reason: 'Commodities and energy outperform when inflation is rising alongside growth' },
      { ticker: 'VNQ', name: 'Real Estate ETF', reason: 'Real assets are inflation stores — rents rise with inflation' },
      { ticker: 'GLD', name: 'Gold ETF', reason: 'Inflation hedge with lower correlation to equities' },
    )
  } else if (!inflationaryEnv && growthSlowing) {
    regime = 'DEFLATIONARY SLOWDOWN (Low Rates + Slowing Growth)'
    candidates.push(
      { ticker: 'TLT', name: 'Long-Term Treasury ETF', reason: 'Bonds rally when growth slows and inflation falls — classic recession trade' },
      { ticker: 'XLU', name: 'Utilities ETF', reason: 'Defensive sector — stable cash flows independent of economic cycle' },
      { ticker: 'GLD', name: 'Gold ETF', reason: 'Safe haven during deflationary uncertainty' },
    )
  } else {
    regime = 'GOLDILOCKS (Moderate Growth + Manageable Inflation)'
    candidates.push(
      { ticker: 'SPY', name: 'S&P 500 ETF', reason: 'Broad equities perform well in goldilocks — risk-on is appropriate' },
      { ticker: 'QQQ', name: 'Nasdaq ETF', reason: 'Growth stocks thrive when rates are manageable and growth is present' },
      { ticker: 'IWM', name: 'Small Cap ETF', reason: 'Risk-on environment with lower rates favors small caps' },
    )
  }

  const macroContext = [
    fed ? `Fed Rate: ${fed.value}%` : null,
    yc ? `Yield Spread (10y−2y): ${yc.spread.value}%` : null,
    unemp ? `Unemployment: ${unemp.value}%` : null,
  ].filter(Boolean).join(' · ')

  return {
    framework: 'DALIO',
    subtitle: 'All Weather — Macro-Aligned Assets',
    candidates,
    summary: `Current macro regime: ${regime}. ${macroContext}. Dalio would balance across these uncorrelated assets for an all-weather portfolio.`,
    noResults: false,
  }
}

// ── BURRY: Contrarian — Ignored Opportunities ────────────────────────────────
// Burry looks for low price-to-book with positive earnings — what the market ignores

function burryScan(stocks: StockData[]): FrameworkScanResult {
  const candidates: ScanCandidate[] = []

  for (const s of stocks) {
    if (!s.eps || s.eps <= 0) continue

    // Below or near book value — market is pricing in problems Burry thinks are overblown
    const nearBookValue = s.priceToBook !== null && s.priceToBook < 3

    // Earnings positive — the underlying business still works
    const earningsMoney = s.eps > 0

    // Being near 52wk low = market consensus is bearish
    const nearLow = s.week52Low && s.sma50 &&
      (s.sma50 - s.week52Low) / s.week52Low < 0.25

    if (nearBookValue && earningsMoney) {
      const parts: string[] = []
      if (s.priceToBook) parts.push(`P/B ${s.priceToBook.toFixed(2)}`)
      if (s.pe) parts.push(`P/E ${s.pe.toFixed(1)}`)
      if (s.eps) parts.push(`EPS ${fmt(s.eps)}`)
      if (nearLow) parts.push('Near 52wk low — consensus is bearish')

      candidates.push({
        ticker: s.ticker,
        name: s.name,
        reason: parts.join(' · '),
        price: fmt(s.sma50),
      })
    }
  }

  return {
    framework: 'BURRY',
    subtitle: 'Contrarian — Ignored Opportunities',
    candidates,
    summary: candidates.length > 0
      ? `${candidates.length} contrarian candidate(s) where market pessimism may be overdone. Burry would dig deep into the balance sheet before entering.`
      : 'No classic Burry contrarian setups in this universe. Consider expanding universe to smaller, less-followed names.',
    noResults: candidates.length === 0,
  }
}

// ── ROUBINI: Systemic Risk Alerts ────────────────────────────────────────────
// Dr. Doom looks for macro warning signals and dangerously leveraged stocks

async function roubiniScan(stocks: StockData[]): Promise<FrameworkScanResult> {
  const [yc, fed] = await Promise.all([
    getYieldCurve().catch(() => null),
    getFedFundsRate().catch(() => null),
  ])

  const candidates: ScanCandidate[] = []

  // Macro risk: yield curve inversion
  if (yc?.spread?.value && parseFloat(yc.spread.value) < 0) {
    candidates.push({
      ticker: 'MACRO',
      name: 'Yield Curve Inversion',
      reason: `⚠ Yield curve inverted (10y−2y spread: ${yc.spread.value}%) — historically precedes recession by 12-18 months. Roubini would be raising cash.`,
    })
  } else if (yc?.spread?.value && parseFloat(yc.spread.value) < 0.3) {
    candidates.push({
      ticker: 'MACRO',
      name: 'Yield Curve Flattening',
      reason: `⚠ Yield curve nearly flat (spread: ${yc.spread.value}%) — watch for inversion. Growth concerns building.`,
    })
  }

  // Macro risk: very high interest rates
  if (fed && parseFloat(fed.value) > 4.5) {
    candidates.push({
      ticker: 'MACRO',
      name: 'High Rate Environment',
      reason: `⚠ Fed rate at ${fed.value}% — elevated rates stress leveraged companies, commercial real estate, and growth stocks with no earnings.`,
    })
  }

  // Company-level risk: very high PE (vulnerable in rate environment)
  for (const s of stocks) {
    if (s.pe !== null && s.pe > 50 && s.eps && s.eps < 2) {
      candidates.push({
        ticker: s.ticker,
        name: s.name,
        reason: `⚠ P/E of ${s.pe.toFixed(0)} with thin earnings — expensive growth stock highly vulnerable to rate increases or earnings miss`,
        price: fmt(s.sma50),
      })
    }
  }

  return {
    framework: 'ROUBINI',
    subtitle: 'Systemic Risk Alerts',
    candidates,
    summary: candidates.length > 0
      ? `${candidates.length} risk signal(s) detected. Roubini would reduce risk exposure, increase hedges, and hold more cash.`
      : 'No major systemic risk signals in current data. Roubini would still urge caution — he always does.',
    noResults: false,
  }
}

// ── Public scan functions ─────────────────────────────────────────────────────

export async function runFullCouncilScan(): Promise<FrameworkScanResult[]> {
  // Fetch stock data once — all stock-based framework scans share this data
  const stocks = await fetchStockUniverse()

  // Run macro scans in parallel with the stock-based scans
  const [dalio, roubini] = await Promise.all([
    dalioScan(),
    roubiniScan(stocks),
  ])

  return [
    tudorJonesScan(stocks),
    livermoreScan(stocks),
    buffettScan(stocks),
    lynchScan(stocks),
    grahamScan(stocks),
    granthamScan(stocks),
    dalio,
    burryScan(stocks),
    roubini,
  ]
}

export async function runFrameworkScan(framework: string): Promise<FrameworkScanResult> {
  const fw = framework.toLowerCase().trim()

  // Macro-only scans (no stock data needed)
  if (fw.includes('dalio')) return dalioScan()

  // Scans that need both stock data and macro data
  if (fw.includes('roubini')) {
    const stocks = await fetchStockUniverse()
    return roubiniScan(stocks)
  }

  // All other scans use stock universe only
  const stocks = await fetchStockUniverse()

  if (fw.includes('tudor') || fw.includes('jones')) return tudorJonesScan(stocks)
  if (fw.includes('livermore'))                        return livermoreScan(stocks)
  if (fw.includes('buffett') || fw.includes('warren')) return buffettScan(stocks)
  if (fw.includes('lynch'))                            return lynchScan(stocks)
  if (fw.includes('graham'))                           return grahamScan(stocks)
  if (fw.includes('grantham'))                         return granthamScan(stocks)
  if (fw.includes('burry') || fw.includes('michael'))  return burryScan(stocks)

  // Default to full scan if framework not recognized
  return tudorJonesScan(stocks)
}

// Format scan results as a text block for Claude's context
export function formatScanResults(results: FrameworkScanResult[]): string {
  const lines: string[] = ['COUNCIL SCAN RESULTS — ' + new Date().toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  })]
  lines.push('Universe scanned: AAPL, MSFT, NVDA, TSLA, META, AMZN, JPM, JNJ, XOM, WMT')
  lines.push('─────────────────────────────────────────────────────────')
  lines.push('')

  for (const r of results) {
    lines.push(`${r.framework} — ${r.subtitle}`)
    if (r.noResults && r.framework !== 'DALIO' && r.framework !== 'ROUBINI') {
      lines.push(`  ${r.summary}`)
    } else {
      for (const c of r.candidates) {
        lines.push(`  • ${c.ticker}${c.price ? ' (' + c.price + ')' : ''}: ${c.reason}`)
      }
      lines.push(`  → ${r.summary}`)
    }
    lines.push('')
  }

  lines.push('─────────────────────────────────────────────────────────')
  lines.push('These are screening candidates only, not buy/sell recommendations.')
  lines.push('Universe limited to 10 stocks. Run individual framework scans for deeper analysis.')

  return lines.join('\n')
}
