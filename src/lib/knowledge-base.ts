import fs from 'fs'
import path from 'path'

const RESEARCH_DIR = path.join(process.cwd(), 'research', 'markets')

// Map keywords to knowledge base files
const KEYWORD_MAP: Record<string, string[]> = {
  // Investors
  buffett: ['investors/buffett-philosophy.md'],
  warren: ['investors/buffett-philosophy.md'],
  moat: ['investors/buffett-philosophy.md'],
  'intrinsic value': ['investors/buffett-philosophy.md', 'analysts/benjamin-graham-complete.md'],
  dalio: ['investors/dalio-philosophy.md'],
  'all weather': ['investors/dalio-philosophy.md'],
  'debt cycle': ['investors/dalio-philosophy.md'],
  'risk parity': ['investors/dalio-philosophy.md'],
  soros: ['investors/soros-philosophy.md'],
  reflexivity: ['investors/soros-philosophy.md'],
  'prevailing bias': ['investors/soros-philosophy.md'],
  bubble: ['investors/soros-philosophy.md', 'analysts/jeremy-grantham-complete.md'],
  tudor: ['investors/tudor-jones-philosophy.md'],
  'paul tudor': ['investors/tudor-jones-philosophy.md'],
  trend: ['investors/tudor-jones-philosophy.md', 'investors/livermore-philosophy.md'],
  'risk management': ['risk/risk-management-rules.md', 'investors/tudor-jones-philosophy.md'],
  lynch: ['investors/lynch-philosophy.md'],
  'peter lynch': ['investors/lynch-philosophy.md'],
  peg: ['investors/lynch-philosophy.md'],
  'ten bagger': ['investors/lynch-philosophy.md'],
  livermore: ['investors/livermore-philosophy.md'],
  'jesse livermore': ['investors/livermore-philosophy.md'],
  'tape reading': ['investors/livermore-philosophy.md', 'technical/order-flow-microstructure.md'],
  'pivot point': ['investors/livermore-philosophy.md'],
  'line of least resistance': ['investors/livermore-philosophy.md'],

  // Technical
  candlestick: ['technical/candlestick-patterns.md'],
  doji: ['technical/candlestick-patterns.md'],
  hammer: ['technical/candlestick-patterns.md'],
  engulfing: ['technical/candlestick-patterns.md'],
  'chart pattern': ['technical/chart-patterns.md'],
  'head and shoulders': ['technical/chart-patterns.md'],
  'double top': ['technical/chart-patterns.md'],
  'double bottom': ['technical/chart-patterns.md'],
  'cup and handle': ['technical/chart-patterns.md'],
  'bull flag': ['technical/chart-patterns.md'],
  'bear flag': ['technical/chart-patterns.md'],
  support: ['technical/support-resistance.md'],
  resistance: ['technical/support-resistance.md'],
  vwap: ['technical/support-resistance.md', 'styles/day-trading-complete-guide.md'],
  fibonacci: ['technical/fibonacci-levels.md'],
  fib: ['technical/fibonacci-levels.md'],
  'moving average': ['technical/moving-averages.md'],
  ema: ['technical/moving-averages.md'],
  sma: ['technical/moving-averages.md'],
  '200 day': ['technical/moving-averages.md'],
  rsi: ['technical/momentum-indicators.md'],
  macd: ['technical/momentum-indicators.md'],
  stochastic: ['technical/momentum-indicators.md'],
  momentum: ['technical/momentum-indicators.md'],
  divergence: ['technical/momentum-indicators.md'],
  volume: ['technical/volume-analysis.md'],
  'on balance volume': ['technical/volume-analysis.md'],
  obv: ['technical/volume-analysis.md'],
  'volume profile': ['technical/volume-analysis.md'],
  elliott: ['technical/elliott-wave.md'],
  'elliott wave': ['technical/elliott-wave.md'],
  'wave count': ['technical/elliott-wave.md'],
  'order flow': ['technical/order-flow-microstructure.md'],
  'order block': ['technical/order-flow-microstructure.md'],
  'smart money': ['technical/order-flow-microstructure.md', 'funds/smart-money-tracking-techniques.md'],
  'dark pool': ['technical/order-flow-microstructure.md', 'data-sources/options-flow-scanners-guide.md'],
  'options flow': ['technical/options-flow-dark-pools.md', 'data-sources/options-flow-scanners-guide.md'],
  'unusual options': ['technical/options-flow-dark-pools.md', 'data-sources/options-flow-scanners-guide.md'],
  gamma: ['technical/options-flow-dark-pools.md'],
  'implied volatility': ['technical/options-flow-dark-pools.md'],
  'iv crush': ['technical/options-flow-dark-pools.md'],
  greeks: ['technical/options-flow-dark-pools.md'],
  delta: ['technical/options-flow-dark-pools.md'],

  // Trading Styles
  scalp: ['styles/scalping-complete-guide.md'],
  scalping: ['styles/scalping-complete-guide.md'],
  'day trade': ['styles/day-trading-complete-guide.md'],
  'day trading': ['styles/day-trading-complete-guide.md'],
  intraday: ['styles/day-trading-complete-guide.md'],
  'opening range': ['styles/day-trading-complete-guide.md'],
  swing: ['styles/swing-trading-complete-guide.md'],
  'swing trade': ['styles/swing-trading-complete-guide.md'],
  position: ['styles/position-trading-complete-guide.md'],
  'long term': ['styles/long-term-investing-complete-guide.md'],
  'dollar cost': ['styles/long-term-investing-complete-guide.md'],
  dca: ['styles/long-term-investing-complete-guide.md'],

  // Funds
  'hedge fund': ['funds/hedge-funds-complete-guide.md'],
  '13f': ['funds/fund-flows-and-market-impact.md', 'data-sources/sec-filings-13f-guide.md'],
  'institutional': ['funds/fund-flows-and-market-impact.md'],
  etf: ['funds/etf-mechanics-and-trading.md'],
  'leveraged etf': ['funds/etf-mechanics-and-trading.md'],
  vix: ['funds/etf-mechanics-and-trading.md'],
  'sector rotation': ['funds/fund-flows-and-market-impact.md'],
  'fund flow': ['funds/fund-flows-and-market-impact.md'],
  cot: ['funds/fund-flows-and-market-impact.md'],
  'commitment of traders': ['funds/fund-flows-and-market-impact.md'],
  activist: ['funds/hedge-funds-complete-guide.md'],
  'window dressing': ['funds/fund-flows-and-market-impact.md'],

  // Analysts
  graham: ['analysts/benjamin-graham-complete.md'],
  'benjamin graham': ['analysts/benjamin-graham-complete.md'],
  'margin of safety': ['analysts/benjamin-graham-complete.md', 'investors/buffett-philosophy.md'],
  'net net': ['analysts/benjamin-graham-complete.md'],
  burry: ['analysts/michael-burry-complete.md'],
  'michael burry': ['analysts/michael-burry-complete.md'],
  subprime: ['analysts/michael-burry-complete.md'],
  damodaran: ['analysts/aswath-damodaran-complete.md'],
  dcf: ['analysts/aswath-damodaran-complete.md'],
  'discounted cash flow': ['analysts/aswath-damodaran-complete.md'],
  wacc: ['analysts/aswath-damodaran-complete.md'],
  whitney: ['analysts/meredith-whitney-complete.md'],
  footnote: ['analysts/meredith-whitney-complete.md'],
  'stress test': ['analysts/meredith-whitney-complete.md'],
  meeker: ['analysts/mary-meeker-complete.md'],
  'mary meeker': ['analysts/mary-meeker-complete.md'],
  's-curve': ['analysts/mary-meeker-complete.md'],
  adoption: ['analysts/mary-meeker-complete.md'],
  blodget: ['analysts/henry-blodget-complete.md'],
  narrative: ['analysts/henry-blodget-complete.md'],
  roubini: ['analysts/nouriel-roubini-complete.md'],
  'systemic risk': ['analysts/nouriel-roubini-complete.md'],
  grantham: ['analysts/jeremy-grantham-complete.md'],
  'mean reversion': ['analysts/jeremy-grantham-complete.md'],
  cape: ['analysts/jeremy-grantham-complete.md'],
  shiller: ['analysts/jeremy-grantham-complete.md'],

  // Risk
  'position sizing': ['risk/position-sizing-formulas.md'],
  'stop loss': ['risk/risk-management-rules.md', 'investors/tudor-jones-philosophy.md'],
  drawdown: ['risk/risk-management-rules.md'],
  psychology: ['risk/trading-psychology.md'],
  fomo: ['risk/trading-psychology.md'],
  'revenge trading': ['risk/trading-psychology.md'],
  journal: ['risk/trading-journal-template.md'],

  // Platforms
  tradingview: ['platforms/tradingview-complete-guide.md'],
  thinkorswim: ['platforms/thinkorswim-complete-guide.md'],
  tos: ['platforms/thinkorswim-complete-guide.md'],
  'level 2': ['platforms/thinkorswim-complete-guide.md'],
  scanner: ['platforms/tradingview-complete-guide.md', 'platforms/thinkorswim-complete-guide.md'],

  // Data sources
  barchart: ['data-sources/options-flow-scanners-guide.md'],
  'unusual whales': ['data-sources/options-flow-scanners-guide.md'],
  finviz: ['data-sources/options-flow-scanners-guide.md'],
  '10k': ['data-sources/sec-filings-13f-guide.md'],
  'sec filing': ['data-sources/sec-filings-13f-guide.md'],
  'form 4': ['data-sources/sec-filings-13f-guide.md'],
  insider: ['data-sources/sec-filings-13f-guide.md'],
  'whalewisdom': ['data-sources/sec-filings-13f-guide.md'],
}

function readFile(filePath: string): string {
  try {
    const fullPath = path.join(RESEARCH_DIR, filePath)
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf-8')
    }
  } catch {
    // file not found
  }
  return ''
}

export function getSystemPrompt(): string {
  const systemPromptPath = path.join(RESEARCH_DIR, 'SYSTEM-PROMPT.md')
  try {
    return fs.readFileSync(systemPromptPath, 'utf-8')
  } catch {
    return 'You are The Investment Council, a personal market intelligence agent.'
  }
}

export function getRelevantKnowledge(userMessage: string): string {
  const message = userMessage.toLowerCase()
  const filesToLoad = new Set<string>()

  // Match keywords to relevant files
  for (const [keyword, files] of Object.entries(KEYWORD_MAP)) {
    if (message.includes(keyword)) {
      files.forEach(f => filesToLoad.add(f))
    }
  }

  // Always load a small core context if nothing specific matched
  if (filesToLoad.size === 0) {
    // General question - load high-level framework summaries
    filesToLoad.add('investors/buffett-philosophy.md')
    filesToLoad.add('investors/dalio-philosophy.md')
    filesToLoad.add('risk/risk-management-rules.md')
  }

  // Cap at 4 files to keep context manageable and response fast
  const limitedFiles = Array.from(filesToLoad).slice(0, 4)

  const contents: string[] = []
  for (const file of limitedFiles) {
    const content = readFile(file)
    if (content) {
      const fileName = path.basename(file, '.md').replace(/-/g, ' ').toUpperCase()
      contents.push(`\n\n---\n## KNOWLEDGE BASE: ${fileName}\n\n${content}`)
    }
  }

  return contents.join('')
}
