// Fetches live market data relevant to the user's message
// and returns it as a formatted context block for Claude

import { getStockQuote, getCompanyOverview, getTopMovers } from '@/lib/alpha-vantage'
import { getFedFundsRate, getCPIInflation, getYieldCurve, getUnemploymentRate, getGDPGrowth } from '@/lib/fred'
import { getCryptoPrice, getTop10ByCap, getFearGreedIndex, getBitcoinDominance } from '@/lib/coingecko'
import { getLatestFilings, getInsiderTransactions, get8KEvents } from '@/lib/sec-edgar'
import { runFullCouncilScan, runFrameworkScan, formatScanResults } from '@/lib/scanner'
import { getOnChainSnapshot, formatOnChainForCouncil } from '@/lib/glassnode'
import { getCoinMetricsSnapshot, formatCoinMetricsForCouncil } from '@/lib/coinmetrics'

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

  // 2. Match explicit $TICKER or ALL-CAPS ticker symbols only
  const matches = message.match(/\$([A-Za-z]{1,5})|(?<![A-Za-z])([A-Z]{2,5})(?![A-Za-z])/g) ?? []
  for (const t of matches.map(t => t.replace('$', '').toUpperCase()).filter(t => !NOT_TICKERS.has(t))) {
    found.add(t)
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
  const wantsEconomic = wantsBriefing || /fed\s*funds|interest\s*rate|federal\s*reserve|inflation|cpi|consumer\s*price|yield\s*curve|treasury|2.year|10.year|unemployment|jobless|\bgdp\b|gross\s*domestic|macro|economic/i.test(msg)
  const wantsMovers = wantsBriefing || /movers|gainers|losers|most\s*active|top\s*stocks|market\s*today|pre.?market|what.s moving|what is moving/i.test(msg)
  const wantsSEC = /10-?k|10-?q|annual\s*report|quarterly\s*report|sec\s*filing|insider\s*(buy|sell|transaction)|form\s*4|\b8-?k\b|material\s*event|13[fF]|hedge\s*fund\s*hold/i.test(msg)

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

  // ── Stock quotes & fundamentals ─────────────────────────────────────────────
  if (tickers.length > 0) {
    tasks.push(
      Promise.all(
        tickers.map(ticker =>
          Promise.all([
            getStockQuote(ticker).catch(() => null),
            getCompanyOverview(ticker).catch(() => null),
          ])
        )
      ).then(results => {
        const lines: string[] = []
        results.forEach(([quote, overview], idx) => {
          const ticker = tickers[idx]
          if (quote && quote['05. price']) {
            const price = parseFloat(quote['05. price']).toFixed(2)
            const change = quote['09. change']
            const changePct = quote['10. change percent']
            const volume = parseInt(quote['06. volume']).toLocaleString()
            const day = quote['07. latest trading day']
            lines.push(`${ticker}: $${price}  |  Change: ${change} (${changePct})  |  Volume: ${volume}  |  Date: ${day}`)
          }
          if (overview && overview.Name) {
            lines.push(`  Company: ${overview.Name} | Sector: ${overview.Sector} | Market Cap: $${parseInt(overview.MarketCapitalization).toLocaleString()}`)
            lines.push(`  P/E: ${overview.PERatio} | EPS: ${overview.EPS} | 52wk High: $${overview['52WeekHigh']} | 52wk Low: $${overview['52WeekLow']}`)
            if (overview.Description) {
              lines.push(`  Description: ${overview.Description.substring(0, 300)}...`)
            }
          }
        })
        if (lines.length > 0) sections.push(`LIVE STOCK DATA (Alpha Vantage — real-time):\n${lines.join('\n')}`)
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
      ]).then(([fed, cpi, yc, unemp, gdp]) => {
        const lines: string[] = []
        if (fed) lines.push(`Federal Funds Rate: ${fed.value}% (as of ${fed.date})`)
        if (cpi) lines.push(`CPI Index: ${cpi.value} (as of ${cpi.date})`)
        if (yc) {
          lines.push(`2-Year Treasury: ${yc.twoYear.value}%  |  10-Year Treasury: ${yc.tenYear.value}%  |  Spread: ${yc.spread.value}%`)
          if (yc.spread.description) lines.push(`Yield Curve Status: ${yc.spread.description}`)
        }
        if (unemp) lines.push(`Unemployment Rate: ${unemp.value}% (as of ${unemp.date})`)
        if (gdp && gdp.annualizedGrowthRate) lines.push(`Real GDP Growth (annualized): ${gdp.annualizedGrowthRate} — latest quarter: ${gdp.latestQuarter?.date}`)
        if (lines.length > 0) sections.push(`LIVE ECONOMIC DATA (FRED — Federal Reserve):\n${lines.join('\n')}`)
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

  await Promise.all(tasks)

  if (sections.length === 0) return ''

  return `\n\n# LIVE MARKET DATA — fetched right now for this query\nUse these exact numbers in your response. Do not say you lack market data — you have it below.\n\n${sections.join('\n\n')}`
}
