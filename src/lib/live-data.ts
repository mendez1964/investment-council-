// Fetches live market data relevant to the user's message
// and returns it as a formatted context block for Claude

import { getTopMovers } from '@/lib/alpha-vantage'
import { getQuote, getProfile, getMetrics, getTechnicalSnapshot, getEarningsCalendar, formatEarningsCalendar, getMarketNews, getCompanyNews, getEarningsHistory, getPriceTarget, getInsiderSentiment } from '@/lib/finnhub'
import { getFedFundsRate, getCPIInflation, getYieldCurve, getUnemploymentRate, getGDPGrowth, getDXY } from '@/lib/fred'
import { getCryptoPrice, getTop10ByCap, getFearGreedIndex, getBitcoinDominance } from '@/lib/coingecko'
import { getLatestFilings, getInsiderTransactions, get8KEvents } from '@/lib/sec-edgar'
import { runFullCouncilScan, runFrameworkScan, formatScanResults } from '@/lib/scanner'
import { getOnChainSnapshot, formatOnChainForCouncil } from '@/lib/glassnode'
import { getCoinMetricsSnapshot, formatCoinMetricsForCouncil } from '@/lib/coinmetrics'
import { getExpirations, getChain, roundToATM, midPrice, computeGEX, findUnusualFlow, pickExpiry } from '@/lib/tradier'
import { getFundingRate } from '@/lib/binance'
import { getDarkPoolData } from '@/lib/darkpool'
import { computeStockSignal, computeCryptoSignal, formatSignalBlock, type Signal } from '@/lib/signal-engine'

// CoinGecko ID → Binance/exchange symbol (for funding rate lookup)
const COIN_ID_TO_SYMBOL: Record<string, string> = {
  bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', ripple: 'XRP',
  cardano: 'ADA', dogecoin: 'DOGE', 'avalanche-2': 'AVAX', polkadot: 'DOT',
  chainlink: 'LINK', 'matic-network': 'MATIC', arbitrum: 'ARB', optimism: 'OP',
  'binancecoin': 'BNB', near: 'NEAR', cosmos: 'ATOM', litecoin: 'LTC',
  uniswap: 'UNI', 'injective-protocol': 'INJ', aptos: 'APT', sui: 'SUI',
}

// Words that look like tickers but aren't — skip these
const NOT_TICKERS = new Set([
  'A','I','AM','AN','AS','AT','BE','BY','DO','GO','IF','IN','IS','IT',
  'MY','NO','OF','ON','OR','SO','TO','UP','US','WE','AI','TV','PM','OK',
  'THE','AND','BUT','FOR','NOT','ARE','WAS','HAS','HAD','ITS','YOU','HIM',
  'HER','HIS','OUR','OUT','ALL','NEW','NOW','OLD','ONE','TWO','GET','GOT',
  'PUT','SET','RUN','BUY','ETF','IPO','CEO','CFO','COO','CTO','P/E','EPS',
  'GDP','CPI','FED','SEC','NYSE','RATE','FUND','LONG','SHORT','CALL','PUT',
  'HIGH','LOW','OPEN','NEXT','LAST','BEST','MOST','OVER','JUST','EVEN',
  'WILL','BEEN','HAVE','DOES','SAID','MAKE','LIKE','THEM','THEY','FROM',
  'WITH','THIS','THAT','WHAT','WHEN','WHO','WHY','HOW','CAN','MAY','WOULD',
  'COULD','SHOULD','THEIR','THERE','THESE','THOSE','SOME','MANY','MUCH',
])

// Company name → ticker mapping so users can say "apple" instead of "AAPL"
const COMPANY_NAMES: Record<string, string> = {
  apple: 'AAPL', microsoft: 'MSFT', google: 'GOOGL', alphabet: 'GOOGL',
  amazon: 'AMZN', meta: 'META', facebook: 'META', netflix: 'NFLX',
  nvidia: 'NVDA', tesla: 'TSLA', palantir: 'PLTR', salesforce: 'CRM',
  intel: 'INTC', amd: 'AMD', qualcomm: 'QCOM', broadcom: 'AVGO',
  smci: 'SMCI', 'super micro': 'SMCI', supermicro: 'SMCI',
  arm: 'ARM', mstr: 'MSTR', microstrategy: 'MSTR', coin: 'COIN', coinbase: 'COIN',
  pltr: 'PLTR', crwd: 'CRWD', panw: 'PANW', hood: 'HOOD', robinhood: 'HOOD',
  sofi: 'SOFI', rivian: 'RIVN', rivn: 'RIVN', lucid: 'LCID', lcid: 'LCID',
  disney: 'DIS', walmart: 'WMT', target: 'TGT', costco: 'COST',
  jpmorgan: 'JPM', 'jp morgan': 'JPM', 'bank of america': 'BAC',
  goldman: 'GS', 'goldman sachs': 'GS', morgan: 'MS', 'morgan stanley': 'MS',
  berkshire: 'BRK.B', visa: 'V', mastercard: 'MA', paypal: 'PYPL',
  exxon: 'XOM', chevron: 'CVX', johnson: 'JNJ', pfizer: 'PFE',
  'johnson and johnson': 'JNJ', unitedhealth: 'UNH', abbvie: 'ABBV',
  boeing: 'BA', caterpillar: 'CAT', deere: 'DE', 'lockheed': 'LMT',
  'home depot': 'HD', nike: 'NKE', starbucks: 'SBUX', mcdonalds: 'MCD',
  uber: 'UBER', lyft: 'LYFT', airbnb: 'ABNB', doordash: 'DASH',
  shopify: 'SHOP', square: 'SQ', 'block inc': 'SQ', twilio: 'TWLO',
  snowflake: 'SNOW', datadog: 'DDOG', crowdstrike: 'CRWD', palo: 'PANW',
  'palo alto': 'PANW', fortinet: 'FTNT', okta: 'OKTA', 'service now': 'NOW',
  servicenow: 'NOW', workday: 'WDAY', zoom: 'ZM', 'c3 ai': 'AI',
  'circle': 'CRCL', spy: 'SPY', qqq: 'QQQ', iwm: 'IWM', dia: 'DIA',
}

function extractTickers(message: string): string[] {
  const msg = message.toLowerCase()
  const found = new Set<string>()

  // 1. Check company names (lowercase match)
  for (const [name, ticker] of Object.entries(COMPANY_NAMES)) {
    if (msg.includes(name)) found.add(ticker)
  }

  // 2. Match explicit $ticker (any case) or ALL-CAPS tokens in the original message
  const capsMatches = message.match(/\$([A-Za-z]{1,5})|(?<![A-Za-z])([A-Z]{2,5})(?![A-Za-z])/g) ?? []
  for (const t of capsMatches.map(t => t.replace('$', '').toUpperCase()).filter(t => !NOT_TICKERS.has(t))) {
    found.add(t)
  }

  // 3. Catch lowercase tickers typed after context keywords: "for nvda", "will smci fall", "buy aapl", etc.
  const contextRe = /(?:for|of|on|analyze|analysis|check|quote|pull|about|get|will|far|should|would|could|buy|sell|short|long|watch|own|hold|trade|play)\s+([a-z]{2,5})\b/gi
  let cm: RegExpExecArray | null
  while ((cm = contextRe.exec(message)) !== null) {
    const t = cm[1].toUpperCase()
    if (!NOT_TICKERS.has(t)) found.add(t)
  }

  return Array.from(found).slice(0, 3)
}

// Full crypto map: ticker/name → CoinGecko ID
const CRYPTO_COIN_MAP: Record<string, string> = {
  // Major coins
  btc: 'bitcoin', bitcoin: 'bitcoin',
  eth: 'ethereum', ethereum: 'ethereum',
  sol: 'solana', solana: 'solana',
  bnb: 'binancecoin', binance: 'binancecoin',
  xrp: 'ripple', ripple: 'ripple',
  ada: 'cardano', cardano: 'cardano',
  doge: 'dogecoin', dogecoin: 'dogecoin',
  avax: 'avalanche-2', avalanche: 'avalanche-2',
  dot: 'polkadot', polkadot: 'polkadot',
  matic: 'matic-network', polygon: 'matic-network',
  link: 'chainlink', chainlink: 'chainlink',
  ltc: 'litecoin', litecoin: 'litecoin',
  bch: 'bitcoin-cash',
  uni: 'uniswap', uniswap: 'uniswap',
  atom: 'cosmos', cosmos: 'cosmos',
  // Layer 2 & newer
  arb: 'arbitrum', arbitrum: 'arbitrum',
  op: 'optimism', optimism: 'optimism',
  near: 'near',
  fil: 'filecoin', filecoin: 'filecoin',
  apt: 'aptos', aptos: 'aptos',
  sui: 'sui',
  inj: 'injective-protocol', injective: 'injective-protocol',
  tia: 'celestia', celestia: 'celestia',
  jup: 'jupiter-exchange-solana', jupiter: 'jupiter-exchange-solana',
  // Hedera & ecosystem
  hbar: 'hedera-hashgraph', hedera: 'hedera-hashgraph',
  // DeFi / other top coins
  crv: 'curve-dao-token', curve: 'curve-dao-token',
  aave: 'aave',
  mkr: 'maker', maker: 'maker',
  snx: 'synthetix-network-token', synthetix: 'synthetix-network-token',
  comp: 'compound-governance-token', compound: 'compound-governance-token',
  ldo: 'lido-dao', lido: 'lido-dao',
  // Meme & trending
  shib: 'shiba-inu', shiba: 'shiba-inu',
  pepe: 'pepe',
  wif: 'dogwifcoin',
  bonk: 'bonk',
  floki: 'floki',
  // Infrastructure
  fet: 'fetch-ai', fetch: 'fetch-ai',
  render: 'render-token', rndr: 'render-token',
  grt: 'the-graph', graph: 'the-graph',
  imx: 'immutable-x', immutable: 'immutable-x',
  sand: 'the-sandbox', sandbox: 'the-sandbox',
  mana: 'decentraland', decentraland: 'decentraland',
  axs: 'axie-infinity', axie: 'axie-infinity',
  algo: 'algorand', algorand: 'algorand',
  xlm: 'stellar', stellar: 'stellar',
  xtz: 'tezos', tezos: 'tezos',
  eos: 'eos',
  xmr: 'monero', monero: 'monero',
  zec: 'zcash', zcash: 'zcash',
  ton: 'the-open-network',
  trx: 'tron', tron: 'tron',
  vet: 'vechain', vechain: 'vechain',
}

function extractCryptoIds(message: string): string[] {
  const lower = message.toLowerCase()
  const found = new Set<string>()
  for (const [keyword, coinId] of Object.entries(CRYPTO_COIN_MAP)) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i')
    if (regex.test(lower)) found.add(coinId)
  }
  return Array.from(found).slice(0, 5)
}

export async function fetchLiveData(userMessage: string): Promise<string> {
  const msg = userMessage

  // ── Scan detection (checked first — these are expensive multi-call operations) ──
  const wantsFullScan = /council\s*scan|full\s*scan|run\s*(all|the|council)\s*scan|run\s*scan/i.test(msg)
  const frameworkScanMatch = msg.match(/run\s+(?:the\s+)?(tudor(?:\s+jones)?|livermore|buffett|warren|lynch|graham|grantham|dalio|burry|michael\s+burry|roubini)\s+scan/i)
    || msg.match(/what\s+would\s+(tudor(?:\s+jones)?|livermore|buffett|warren|lynch|graham|grantham|dalio|burry|roubini)\s+(?:be\s+buying|buy|say|warn|recommend|find|look\s+for)/i)
    || msg.match(/\b(tudor(?:\s+jones)?|livermore|buffett|lynch|graham|grantham|dalio|burry|roubini)\s+scan\b/i)

  if (wantsFullScan) {
    const results = await runFullCouncilScan()
    const formatted = formatScanResults(results)
    return `\n\n# COUNCIL SCAN DATA — fetched right now\nPresent these results clearly grouped by framework. Remind the user these are screening candidates for further analysis, not buy recommendations.\n\n${formatted}`
  }

  if (frameworkScanMatch) {
    const framework = frameworkScanMatch[1] || frameworkScanMatch[0]
    const result = await runFrameworkScan(framework)
    const formatted = formatScanResults([result])
    return `\n\n# FRAMEWORK SCAN DATA — fetched right now\nPresent these results clearly. Remind the user these are screening candidates for further analysis, not buy recommendations.\n\n${formatted}`
  }

  const wantsBriefing = /pre.?market\s*briefing|end.?of.?day\s*(summary|briefing|report)|market\s*summary|market\s*briefing/i.test(msg)
  const wantsEarnings = wantsBriefing || /earnings\s*calendar|earnings\s*this\s*week|earnings\s*today|upcoming\s*earnings|who.*reporting|what.*reporting|earnings\s*schedule/i.test(msg)
  const wantsEconomic = wantsBriefing || /fed\s*funds|interest\s*rate|federal\s*reserve|inflation|cpi|consumer\s*price|yield\s*curve|treasury|2.year|10.year|unemployment|jobless|\bgdp\b|gross\s*domestic|macro|economic/i.test(msg)
  const wantsMovers = wantsBriefing || /movers|gainers|losers|most\s*active|top\s*stocks|market\s*today|pre.?market|what.s moving|what is moving/i.test(msg)
  const wantsSEC = /10-?k|10-?q|annual\s*report|quarterly\s*report|sec\s*filing|insider\s*(buy|sell|transaction)|form\s*4|\b8-?k\b|material\s*event|13[fF]|hedge\s*fund\s*hold/i.test(msg)

  const SECTOR_ETFS = ['XLK','XLF','XLE','XLV','XLI','XLY','XLP','XLU','XLRE','XLB','XLC']
  const SECTOR_NAMES: Record<string, string> = {
    XLK: 'Technology', XLF: 'Financials', XLE: 'Energy', XLV: 'Healthcare',
    XLI: 'Industrials', XLY: 'Consumer Disc.', XLP: 'Consumer Staples',
    XLU: 'Utilities', XLRE: 'Real Estate', XLB: 'Materials', XLC: 'Communication',
  }

  // For briefings, always pull key market proxies: SPY, QQQ, DIA, IWM + Bitcoin
  const briefingTickers = wantsBriefing ? ['SPY', 'QQQ', 'DIA', 'IWM'] : []
  const combined = [...briefingTickers, ...extractTickers(msg)]
  const tickers = combined.filter((t, i) => combined.indexOf(t) === i).slice(0, 5)
  const cryptoIds = extractCryptoIds(msg)
  const wantsCrypto = wantsBriefing || cryptoIds.length > 0 || /\bcrypto\b|fear.greed|dominance|altcoin|defi|web3|blockchain/i.test(msg)
  if (wantsBriefing && !cryptoIds.includes('bitcoin')) cryptoIds.push('bitcoin')
  const wantsOnChain = /mvrv|sopr|realized.price|on.?chain|hash.?rate|exchange.?flow|long.?term.?holder|\blth\b|\bsth\b|puell|thermocap|cycle.?position|bitcoin.?health|network.?health|glassnode|accumulation|whale|exchange.?reserve/i.test(msg)

  const sections: string[] = []
  const tasks: Promise<void>[] = []
  const signalResults: Signal[] = []

  // ── Signal Engine — stock signals (runs in parallel with other tasks) ─────────
  // Skip index ETFs — signals only meaningful for individual stocks
  const SKIP_SIGNAL = new Set(['SPY', 'QQQ', 'DIA', 'IWM', 'VIX', 'GLD', 'TLT'])
  const signalTickers = tickers.filter(t => !SKIP_SIGNAL.has(t)).slice(0, 2)

  if (signalTickers.length > 0) {
    tasks.push(
      (async () => {
        // Fetch VIX once — shared across all stock signals
        const vixQuote = await getQuote('^VIX').catch(() => null)
        const vix: number | null = vixQuote?.c ?? null

        const today = new Date().toISOString().split('T')[0]
        // Weekly expiry ~2 weeks out — best liquidity for unusual flow detection
        const weeklyTarget = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        await Promise.all(
          signalTickers.map(async ticker => {
            try {
              const [snapshot, metrics, darkPool, expirations] = await Promise.all([
                getTechnicalSnapshot(ticker).catch(() => null),
                getMetrics(ticker).catch(() => null),
                getDarkPoolData(ticker).catch(() => null),
                getExpirations(ticker).catch(() => null),
              ])
              if (!snapshot) return

              const shortInterestPct = metrics?.shortPercent
                ?? metrics?.shortInterestPercentOutFloat
                ?? null

              // Options chain for GEX + unusual flow
              let gexPositive: boolean | null = null
              let unusualCallFlow = false
              let unusualPutFlow = false

              if (expirations && expirations.length > 0) {
                const expiry = pickExpiry(expirations, weeklyTarget) ?? expirations[0]
                const chain = await getChain(ticker, expiry).catch(() => null)

                if (chain) {
                  const spot = snapshot.price ?? metrics?.['52WeekHigh'] ?? 100
                  const gex = computeGEX(chain, spot)
                  gexPositive = gex.regime === 'positive'

                  const unusual = findUnusualFlow(chain, spot)
                  unusualCallFlow = unusual.some(u => u.type === 'call')
                  unusualPutFlow  = unusual.some(u => u.type === 'put')
                }
              }

              const signal = computeStockSignal(ticker, {
                aboveSma20: snapshot.aboveSma20,
                aboveSma50: snapshot.aboveSma50,
                aboveSma200: snapshot.aboveSma200,
                rsi14: snapshot.rsi14,
                macdHistogram: snapshot.macdHistogram,
                volVsAvg: snapshot.volVsAvg,
                shortInterestPct,
                unusualCallFlow,
                unusualPutFlow,
                gexPositive,
                vix,
                darkPoolFlow: darkPool?.flow ?? null,
                darkPoolBlockVsAvg: darkPool?.blockTradeVsAvg ?? null,
                congressNetBias: darkPool?.congressNetBias ?? 'neutral',
                darkPoolDrivers: darkPool?.drivers ?? [],
              })
              signalResults.push(signal)
            } catch { /* skip on error */ }
          })
        )
      })()
    )
  }

  // ── Signal Engine — crypto signals ───────────────────────────────────────────
  if (wantsCrypto && cryptoIds.length > 0) {
    tasks.push(
      (async () => {
        try {
          const primaryId = cryptoIds[0]
          const binanceSymbol = COIN_ID_TO_SYMBOL[primaryId] ?? primaryId.toUpperCase().slice(0, 6)

          const [coinMetrics, fg, priceData, fundingRate] = await Promise.all([
            getCoinMetricsSnapshot().catch(() => null),
            getFearGreedIndex().catch(() => null),
            getCryptoPrice(primaryId).catch(() => null),
            getFundingRate(binanceSymbol).catch(() => null),
          ])

          const signal = computeCryptoSignal(binanceSymbol, {
            mvrv: coinMetrics?.mvrv ?? null,
            exchangeNetFlow: coinMetrics?.exchangeNetFlow ?? null,
            fundingRate: fundingRate ?? null,
            longLiqUsd: 0,
            shortLiqUsd: 0,
            fearGreed: fg?.value ?? 50,
            priceChange24h: (priceData as any)?.priceChange24h ?? 0,
            btcDominance: null,
          })
          signalResults.push(signal)
        } catch { /* skip on error */ }
      })()
    )
  }

  // ── Stock quotes & fundamentals (Finnhub — 60 calls/min, no daily cap) ───────
  if (tickers.length > 0) {
    tasks.push(
      Promise.all(
        tickers.map(ticker =>
          Promise.all([
            getQuote(ticker).catch(() => null),
            getProfile(ticker).catch(() => null),
            getMetrics(ticker).catch(() => null),
            getEarningsHistory(ticker, 6).catch(() => []),
            getPriceTarget(ticker).catch(() => null),
            getInsiderSentiment(ticker).catch(() => null),
          ])
        )
      ).then(results => {
        const lines: string[] = []
        results.forEach(([quote, profile, metrics, earnings, priceTarget, insiderRaw], idx) => {
          const ticker = tickers[idx]

          // Price + day range
          if (quote && quote.c) {
            const change = (quote.d ?? 0)
            lines.push(`${ticker}: $${quote.c.toFixed(2)}  |  ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${(quote.dp ?? 0).toFixed(2)}%)  |  Day Range: $${quote.l?.toFixed(2)}–$${quote.h?.toFixed(2)}`)
          }

          // Company profile + fundamentals
          if (profile && profile.name) {
            const mktCap = profile.marketCapitalization ? `$${(profile.marketCapitalization * 1e6).toLocaleString()}` : '—'
            lines.push(`  ${profile.name} | ${profile.finnhubIndustry ?? '—'} | Market Cap: ${mktCap}`)
          }
          if (metrics) {
            const pe = metrics['peBasicExclExtraTTM'] ?? metrics['peTTM'] ?? null
            const eps = metrics['epsTTM'] ?? null
            const high52 = metrics['52WeekHigh'] ?? null
            const low52 = metrics['52WeekLow'] ?? null
            if (pe || eps || high52) {
              lines.push(`  P/E: ${pe?.toFixed(2) ?? '—'} | EPS TTM: ${eps?.toFixed(2) ?? '—'} | 52wk: $${low52?.toFixed(2) ?? '—'}–$${high52?.toFixed(2) ?? '—'}`)
            }
          }

          // Earnings beat rate — last 6 quarters
          const earningsArr = earnings as { date: string; epsEstimate: number | null; epsActual: number | null; beat: boolean | null }[]
          if (earningsArr && earningsArr.length > 0) {
            const withVerdict = earningsArr.filter(e => e.beat !== null)
            const beats = withVerdict.filter(e => e.beat).length
            const beatRate = withVerdict.length > 0 ? `${beats}/${withVerdict.length} beats (${Math.round(beats / withVerdict.length * 100)}%)` : null
            const last = earningsArr[0]
            const surprise = last?.epsActual != null && last?.epsEstimate != null && last.epsEstimate !== 0
              ? `${((last.epsActual - last.epsEstimate) / Math.abs(last.epsEstimate) * 100).toFixed(1)}%`
              : null
            if (beatRate) lines.push(`  Earnings: ${beatRate} last ${withVerdict.length}Q${surprise ? ` | Last surprise: ${parseFloat(surprise) >= 0 ? '+' : ''}${surprise}` : ''}${last?.date ? ` (${last.date})` : ''}`)
          }

          // Analyst consensus + price target
          if (priceTarget && priceTarget.targetMean) {
            const rating = priceTarget.targetMean
            lines.push(`  Analyst Target: $${rating.toFixed(2)} (High: $${priceTarget.targetHigh?.toFixed(2) ?? '—'} | Low: $${priceTarget.targetLow?.toFixed(2) ?? '—'}) — ${priceTarget.numberOfAnalysts ?? '?'} analysts`)
          }

          // Insider sentiment — net buying/selling (MSPR = monthly share purchase ratio)
          if (insiderRaw?.data?.length > 0) {
            const recent = (insiderRaw.data as any[]).slice(0, 3)
            const netBuying = recent.reduce((sum: number, d: any) => sum + (d.change ?? 0), 0)
            const mspr = recent.reduce((sum: number, d: any) => sum + (d.mspr ?? 0), 0) / recent.length
            if (Math.abs(netBuying) > 0 || !isNaN(mspr)) {
              const bias = mspr > 0.1 ? 'BULLISH (insiders net buying)' : mspr < -0.1 ? 'BEARISH (insiders net selling)' : 'Neutral'
              lines.push(`  Insider Sentiment (3mo): ${bias} | MSPR: ${mspr.toFixed(3)} | Net shares: ${netBuying > 0 ? '+' : ''}${netBuying.toLocaleString()}`)
            }
          }
        })
        if (lines.length > 0) sections.push(`LIVE STOCK DATA (Finnhub — real-time):\n${lines.join('\n')}`)
      })
    )
  }

  // ── Company news — dual source for any ticker, no watchlist needed ──────────
  // Source 1: Finnhub company-specific endpoint (7-day window)
  // Source 2: Finnhub general market news filtered by ticker mention in headline/related
  // If either source fails the other still provides coverage
  if (tickers.length > 0) {
    tasks.push(
      Promise.allSettled([
        ...tickers.map(ticker => getCompanyNews(ticker).catch(() => [])),
        getMarketNews('general').catch(() => []),
      ]).then(results => {
        const cutoff72h = Date.now() - 72 * 60 * 60 * 1000
        const allNews: { ticker: string; datetime: number; headline: string; source: string; summary?: string }[] = []

        // Company-specific results (one per ticker)
        results.slice(0, tickers.length).forEach((r, idx) => {
          if (r.status !== 'fulfilled') return
          const ticker = tickers[idx]
          ;(r.value as any[] ?? [])
            .filter((n: any) => n.datetime && n.datetime * 1000 >= cutoff72h)
            .forEach((n: any) => allNews.push({ ticker, datetime: n.datetime, headline: n.headline, source: n.source, summary: n.summary }))
        })

        // General market news — filter for any ticker mention in headline or related field
        const generalResult = results[tickers.length]
        if (generalResult?.status === 'fulfilled') {
          for (const ticker of tickers) {
            ;(generalResult.value as any[] ?? [])
              .filter((n: any) =>
                n.datetime && n.datetime * 1000 >= cutoff72h &&
                (n.related?.toUpperCase().includes(ticker) || n.headline?.toUpperCase().includes(ticker))
              )
              .forEach((n: any) => allNews.push({ ticker, datetime: n.datetime, headline: n.headline, source: n.source, summary: n.summary }))
          }
        }

        // Deduplicate by headline prefix, sort newest first
        const seen = new Set<string>()
        const unique = allNews
          .filter(n => { const k = n.headline?.slice(0, 60); if (!k || seen.has(k)) return false; seen.add(k); return true })
          .sort((a, b) => b.datetime - a.datetime)

        if (unique.length === 0) return

        const lines: string[] = []
        for (const ticker of tickers) {
          const items = unique.filter(n => n.ticker === ticker).slice(0, 6)
          if (items.length === 0) continue
          lines.push(`\n${ticker} — recent news:`)
          items.forEach(n => {
            const dt = new Date(n.datetime * 1000).toLocaleString('en-US', {
              timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })
            lines.push(`  [${dt} ET] ${n.headline} — ${n.source}`)
            if (n.summary) lines.push(`  ${n.summary.slice(0, 200)}`)
          })
        }
        if (lines.length > 0) sections.push(`RECENT NEWS (last 72h):${lines.join('\n')}`)
      })
    )
  }

  // ── Earnings calendar (briefings + earnings queries — Finnhub, cached 1hr) ───
  if (wantsEarnings) {
    tasks.push(
      getEarningsCalendar(7).then(events => {
        const formatted = formatEarningsCalendar(events)
        if (formatted) sections.push(formatted)
      }).catch(() => {})
    )
  }

  // ── Sector ETF scorecard (briefings only — Finnhub, no daily cap) ────────────
  if (wantsBriefing) {
    tasks.push(
      Promise.all(
        SECTOR_ETFS.map(etf => getQuote(etf).catch(() => null))
      ).then(results => {
        console.log('[sectors] raw results:', JSON.stringify(results?.slice(0,2)))
        const rows: string[] = []
        results.forEach((q: any, i: number) => {
          const etf = SECTOR_ETFS[i]
          const name = SECTOR_NAMES[etf]
          if (q != null && q.c != null && q.c > 0) {
            const chg = (q.dp ?? 0).toFixed(2)
            const dir = (q.dp ?? 0) > 0 ? '▲' : (q.dp ?? 0) < 0 ? '▼' : '—'
            rows.push(`${name} (${etf}): ${dir} ${chg}%  |  $${q.c.toFixed(2)}`)
          }
        })
        console.log('[sectors] rows built:', rows.length)
        if (rows.length > 0) {
          sections.push(`LIVE SECTOR SCORECARD (Finnhub):\n${rows.join('\n')}`)
        }
      })
    )
  }

  // ── Economic indicators ──────────────────────────────────────────────────────
  if (wantsEconomic) {
    tasks.push(
      Promise.all([
        getFedFundsRate().catch(() => null),
        getCPIInflation().catch(() => null),
        getYieldCurve().catch(() => null),
        getUnemploymentRate().catch(() => null),
        getGDPGrowth().catch(() => null),
        getDXY().catch(() => null),
      ]).then(([fed, cpi, yc, unemp, gdp, dxy]) => {
        const lines: string[] = []
        if (fed) lines.push(`Federal Funds Rate: ${fed.value}% (as of ${fed.date})`)
        if (cpi) lines.push(`CPI Index: ${cpi.value} (as of ${cpi.date})`)
        if (yc) {
          lines.push(`2-Year Treasury: ${yc.twoYear.value}%  |  10-Year Treasury: ${yc.tenYear.value}%  |  Spread: ${yc.spread.value}%`)
          if (yc.spread.description) lines.push(`Yield Curve Status: ${yc.spread.description}`)
        }
        if (unemp) lines.push(`Unemployment Rate: ${unemp.value}% (as of ${unemp.date})`)
        if (gdp && gdp.annualizedGrowthRate) lines.push(`Real GDP Growth (annualized): ${gdp.annualizedGrowthRate} — latest quarter: ${gdp.latestQuarter?.date}`)
        if (dxy?.value != null) lines.push(`U.S. Dollar Index (DXY): ${dxy.value.toFixed(2)}${dxy.changePct != null ? ` (${dxy.changePct > 0 ? '+' : ''}${dxy.changePct.toFixed(3)}% today)` : ''} — ${dxy.signal} · ${dxy.cryptoImpact}`)
        if (lines.length > 0) sections.push(`LIVE ECONOMIC DATA (FRED — Federal Reserve):\n${lines.join('\n')}`)
      })
    )
  }

  // ── DXY for crypto queries (dollar strength is a primary BTC driver) ──────────
  if (wantsCrypto && !wantsEconomic) {
    tasks.push(
      getDXY().catch(() => null).then(dxy => {
        if (dxy?.value != null) {
          sections.push(`U.S. DOLLAR INDEX (DXY): ${dxy.value.toFixed(2)}${dxy.changePct != null ? ` (${dxy.changePct > 0 ? '+' : ''}${dxy.changePct.toFixed(3)}% today)` : ''} — ${dxy.signal} · ${dxy.cryptoImpact}`)
        }
      })
    )
  }

  // ── Crypto prices & sentiment ────────────────────────────────────────────────
  if (wantsCrypto) {
    const idsToFetch = cryptoIds.length > 0 ? cryptoIds.slice(0, 3) : ['bitcoin']
    tasks.push(
      Promise.all([
        ...idsToFetch.map(id => getCryptoPrice(id).catch(() => null)),
        getFearGreedIndex().catch(() => null),
        getBitcoinDominance().catch(() => null),
      ]).then(results => {
        const lines: string[] = []
        idsToFetch.forEach((id, i) => {
          const p = results[i] as any
          if (p?.price) {
            lines.push(`${id.charAt(0).toUpperCase() + id.slice(1)}: $${p.price.toLocaleString()}  |  24h change: ${p.priceChange24h?.toFixed(2)}%  |  Market cap: $${p.marketCap?.toLocaleString()}`)
          }
        })
        const fg = results[idsToFetch.length] as any
        const dom = results[idsToFetch.length + 1] as any
        if (fg) lines.push(`Fear & Greed Index: ${fg.value}/100 — ${fg.classification}`)
        if (dom?.btcDominance) lines.push(`BTC Dominance: ${dom.btcDominance}%  |  Total Market Cap: $${dom.totalMarketCapUsd?.toLocaleString()}`)
        if (lines.length > 0) sections.push(`LIVE CRYPTO DATA (CoinGecko — real-time):\n${lines.join('\n')}`)
      })
    )
  }

  // ── BTC ETF flows (crypto queries — institutional demand signal) ─────────────
  if (wantsCrypto) {
    tasks.push(
      (async () => {
        try {
          const BTC_ETFS = ['IBIT','FBTC','GBTC','ARKB','BITB']
          const results = await Promise.all(
            BTC_ETFS.map(async ticker => {
              try {
                const res = await fetch(
                  `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d&interval=1d`,
                  { next: { revalidate: 1800 }, headers: { 'User-Agent': 'Mozilla/5.0' } }
                )
                if (!res.ok) return null
                const json = await res.json()
                const meta = json?.chart?.result?.[0]?.meta
                if (!meta) return null
                const price = meta.regularMarketPrice ?? null
                const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? null
                const changePct = price && prevClose ? ((price - prevClose) / prevClose * 100) : null
                return { ticker, changePct }
              } catch { return null }
            })
          )
          const valid = results.filter(Boolean) as { ticker: string; changePct: number }[]
          if (valid.length === 0) return
          const inflows  = valid.filter(e => (e.changePct ?? 0) > 0.1)
          const outflows = valid.filter(e => (e.changePct ?? 0) < -0.1)
          const signal = inflows.length > outflows.length ? 'INFLOW (bullish institutional demand)' : outflows.length > inflows.length ? 'OUTFLOW (institutions reducing exposure)' : 'MIXED'
          const perFund = valid.map(e => `${e.ticker}: ${(e.changePct ?? 0) > 0 ? '+' : ''}${(e.changePct ?? 0).toFixed(2)}%`).join(' | ')
          sections.push(`SPOT BTC ETF FLOWS (Yahoo Finance — top 5 funds):\nAggregate Signal: ${signal}\nPer Fund: ${perFund}\nNote: Price change used as daily flow proxy — positive = net inflow day`)
        } catch { /* skip */ }
      })()
    )
  }

  // ── Top market movers ────────────────────────────────────────────────────────
  if (wantsMovers) {
    tasks.push(
      getTopMovers().catch(() => null).then(data => {
        if (!data?.top_gainers) return
        const gainers = data.top_gainers.slice(0, 5).map((s: any) => `${s.ticker} +${s.change_percentage}`).join(', ')
        const losers = data.top_losers.slice(0, 5).map((s: any) => `${s.ticker} ${s.change_percentage}`).join(', ')
        const active = data.most_actively_traded.slice(0, 5).map((s: any) => `${s.ticker}`).join(', ')
        sections.push(`LIVE MARKET MOVERS (Alpha Vantage):\nTop Gainers: ${gainers}\nTop Losers: ${losers}\nMost Active: ${active}`)
      })
    )
  }

  // ── SEC filings ──────────────────────────────────────────────────────────────
  if (wantsSEC && tickers.length > 0) {
    tasks.push(
      Promise.all(
        tickers.map(ticker =>
          Promise.all([
            getLatestFilings(ticker).catch(() => null),
            get8KEvents(ticker).catch(() => null),
          ])
        )
      ).then(results => {
        const lines: string[] = []
        results.forEach(([filings, events], idx) => {
          const ticker = tickers[idx]
          const f = filings as any
          const e = events as any
          if (f?.annualReports?.length > 0) {
            lines.push(`${ticker} Latest 10-K: filed ${f.annualReports[0].filingDate}`)
          }
          if (f?.quarterlyReports?.length > 0) {
            lines.push(`${ticker} Latest 10-Q: filed ${f.quarterlyReports[0].filingDate}`)
          }
          if (e?.materialEvents?.length > 0) {
            lines.push(`${ticker} Latest 8-K: filed ${e.materialEvents[0].filingDate}`)
          }
        })
        if (lines.length > 0) sections.push(`LIVE SEC FILING DATA (EDGAR):\n${lines.join('\n')}`)
      })
    )
  }

  // ── On-chain data (Glassnode + CoinMetrics) ──────────────────────────────
  if (wantsOnChain || (wantsCrypto && /bitcoin|\bbtc\b|cycle|halving|planb|saylor|andreas|hayes/i.test(msg))) {
    tasks.push(
      (async () => {
        // Run both in parallel — Glassnode (needs key) + CoinMetrics (always free)
        const [glassnodeSnap, coinmetricsSnap] = await Promise.all([
          getOnChainSnapshot().catch(() => null),
          getCoinMetricsSnapshot().catch(() => null),
        ])

        // Glassnode takes priority when key is set; CoinMetrics fills in the rest
        const btcData = await getCryptoPrice('bitcoin').catch(() => null) as any
        const btcPrice = btcData?.price ?? undefined

        if (glassnodeSnap) {
          const formatted = formatOnChainForCouncil(glassnodeSnap, btcPrice)
          if (formatted) sections.push(formatted)
        }

        // CoinMetrics: add metrics not already covered by Glassnode
        if (coinmetricsSnap) {
          const glassnodeHasData = glassnodeSnap && (
            glassnodeSnap.mvrv != null ||
            glassnodeSnap.hashRate != null ||
            glassnodeSnap.activeAddresses != null
          )

          if (glassnodeHasData) {
            // Glassnode is active — only add CoinMetrics exchange flow detail if Glassnode missed it
            if (glassnodeSnap!.exchangeNetFlow == null && coinmetricsSnap.exchangeNetFlow != null) {
              sections.push(`EXCHANGE FLOW (CoinMetrics): Net ${coinmetricsSnap.exchangeNetFlow > 0 ? '+' : ''}${coinmetricsSnap.exchangeNetFlow.toFixed(0)} BTC | Inflow: ${coinmetricsSnap.exchangeInflow?.toFixed(0)} | Outflow: ${coinmetricsSnap.exchangeOutflow?.toFixed(0)}`)
            }
          } else {
            // No Glassnode key — use CoinMetrics as primary on-chain source
            const formatted = formatCoinMetricsForCouncil(coinmetricsSnap)
            if (formatted) sections.push(formatted)
          }
        }
      })()
    )
  }

  // ── Options chain data (Tradier — real-time) ─────────────────────────────────
  const wantsOptions = /\boption|call|put|\bstrike\b|expir|0dte|odte|chain|implied.vol|\biv\b|delta|gamma|theta|vega|open.interest|\boi\b/i.test(msg)
  const optionsTickers = tickers.filter(t => ['SPY','QQQ','AAPL','NVDA','TSLA','MSFT','AMZN','GOOGL','META','SPX','IWM','NFLX','AMD','PLTR'].includes(t))

  if (wantsOptions && optionsTickers.length > 0 && process.env.TRADIER_API_KEY) {
    tasks.push(
      (async () => {
        const today = new Date().toISOString().split('T')[0]
        const lines: string[] = []

        await Promise.all(
          optionsTickers.slice(0, 2).map(async ticker => {
            try {
              const [quote, expirations] = await Promise.all([
                getQuote(ticker).catch(() => null),
                getExpirations(ticker).catch(() => [] as string[]),
              ])

              if (!expirations.length) return
              const underlying = quote?.c ?? null

              // Pick nearest expiry (today if 0DTE exists, else next available)
              const expiry = expirations.includes(today)
                ? today
                : (expirations.find(d => d > today) ?? expirations[0])

              const chain = await getChain(ticker, expiry).catch(() => null)
              if (!chain) return

              const atm = underlying ? roundToATM(underlying) : null
              lines.push(`\n${ticker} Options — exp ${expiry} | Underlying: $${underlying?.toFixed(2) ?? '—'} | ATM strike: $${atm ?? '—'}`)

              // Show ATM ± 2 strikes for calls and puts
              const strikesToShow = (contracts: typeof chain.calls) => {
                if (!atm) return contracts.slice(0, 5)
                return contracts
                  .filter(c => Math.abs(c.strike - atm) <= (underlying! * 0.02))
                  .sort((a, b) => Math.abs(a.strike - atm) - Math.abs(b.strike - atm))
                  .slice(0, 5)
              }

              const calls = strikesToShow(chain.calls)
              const puts = strikesToShow(chain.puts)

              if (calls.length) {
                lines.push('  CALLS:')
                calls.forEach(c => {
                  const mid = midPrice(c)
                  const iv = c.implied_volatility ? ` IV:${(c.implied_volatility * 100).toFixed(1)}%` : ''
                  const delta = c.delta != null ? ` Δ${c.delta.toFixed(2)}` : ''
                  const oi = c.open_interest ? ` OI:${c.open_interest.toLocaleString()}` : ''
                  lines.push(`    $${c.strike}C  bid:${c.bid} ask:${c.ask} mid:${mid}${iv}${delta}${oi}`)
                })
              }
              if (puts.length) {
                lines.push('  PUTS:')
                puts.forEach(c => {
                  const mid = midPrice(c)
                  const iv = c.implied_volatility ? ` IV:${(c.implied_volatility * 100).toFixed(1)}%` : ''
                  const delta = c.delta != null ? ` Δ${c.delta.toFixed(2)}` : ''
                  const oi = c.open_interest ? ` OI:${c.open_interest.toLocaleString()}` : ''
                  lines.push(`    $${c.strike}P  bid:${c.bid} ask:${c.ask} mid:${mid}${iv}${delta}${oi}`)
                })
              }

              // Also list next 3 available expiry dates
              const upcoming = expirations.filter(d => d >= today).slice(0, 4)
              lines.push(`  Available expiries: ${upcoming.join(', ')}`)
            } catch { /* skip failed tickers */ }
          })
        )

        if (lines.length > 0) {
          sections.push(`LIVE OPTIONS CHAIN DATA (Tradier — real-time):\n${lines.join('\n')}`)
        }
      })()
    )
  }

  await Promise.all(tasks)

  // Prepend signal block if we computed any signals
  const signalBlock = formatSignalBlock(signalResults)
  if (signalBlock) sections.unshift(signalBlock)

  if (sections.length === 0) return ''

  return `\n\n# LIVE MARKET DATA — fetched right now for this query\nUse these exact numbers in your response. Do not say you lack market data — you have it below.\n\n${sections.join('\n\n')}`
}
