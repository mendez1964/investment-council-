import fs from 'fs'
import path from 'path'

const RESEARCH_DIR = path.join(process.cwd(), 'research', 'markets')
const PINE_DIR = path.join(process.cwd(), 'research', 'markets', 'pine-script')

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

  // ── Crypto Specialists ──────────────────────────────────────────────────────
  saylor: ['../crypto/michael-saylor-bitcoin-thesis.md'],
  microstrategy: ['../crypto/michael-saylor-bitcoin-thesis.md'],
  'corporate bitcoin': ['../crypto/michael-saylor-bitcoin-thesis.md'],
  'bitcoin treasury': ['../crypto/michael-saylor-bitcoin-thesis.md'],
  'bitcoin etf': ['../crypto/michael-saylor-bitcoin-thesis.md'],
  'institutional bitcoin': ['../crypto/michael-saylor-bitcoin-thesis.md'],
  'bitcoin adoption': ['../crypto/michael-saylor-bitcoin-thesis.md', '../crypto/crypto-cycles-complete.md'],

  'cathie wood': ['../crypto/cathie-wood-crypto-framework.md'],
  'ark invest': ['../crypto/cathie-wood-crypto-framework.md'],
  'bitcoin price target': ['../crypto/cathie-wood-crypto-framework.md'],
  'disruptive innovation': ['../crypto/cathie-wood-crypto-framework.md'],
  'bitcoin million': ['../crypto/cathie-wood-crypto-framework.md'],

  'raoul pal': ['../crypto/raoul-pal-macro-crypto.md'],
  'real vision': ['../crypto/raoul-pal-macro-crypto.md'],
  'banana zone': ['../crypto/raoul-pal-macro-crypto.md'],
  'everything code': ['../crypto/raoul-pal-macro-crypto.md'],
  'global m2': ['../crypto/raoul-pal-macro-crypto.md', '../crypto/crypto-macro-correlation.md'],
  'global liquidity': ['../crypto/raoul-pal-macro-crypto.md', '../crypto/crypto-macro-correlation.md'],

  vitalik: ['../crypto/vitalik-buterin-ethereum.md'],
  'ethereum roadmap': ['../crypto/vitalik-buterin-ethereum.md'],
  'proof of stake': ['../crypto/vitalik-buterin-ethereum.md'],
  'blockchain trilemma': ['../crypto/vitalik-buterin-ethereum.md'],
  'ethereum staking': ['../crypto/vitalik-buterin-ethereum.md'],
  'ultra sound money': ['../crypto/vitalik-buterin-ethereum.md'],

  'planb': ['../crypto/planb-stock-to-flow.md'],
  'stock to flow': ['../crypto/planb-stock-to-flow.md'],
  's2f': ['../crypto/planb-stock-to-flow.md'],
  'mvrv': ['../crypto/planb-stock-to-flow.md', '../crypto/on-chain-analysis-complete.md'],
  'realized price': ['../crypto/planb-stock-to-flow.md', '../crypto/on-chain-analysis-complete.md'],
  halving: ['../crypto/planb-stock-to-flow.md', '../crypto/crypto-cycles-complete.md'],
  'thermocap': ['../crypto/planb-stock-to-flow.md'],

  'arthur hayes': ['../crypto/arthur-hayes-derivatives-macro.md'],
  'funding rate': ['../crypto/arthur-hayes-derivatives-macro.md'],
  'open interest': ['../crypto/arthur-hayes-derivatives-macro.md'],
  'yen carry': ['../crypto/arthur-hayes-derivatives-macro.md', '../crypto/crypto-macro-correlation.md'],
  liquidation: ['../crypto/arthur-hayes-derivatives-macro.md'],
  'crypto derivatives': ['../crypto/arthur-hayes-derivatives-macro.md'],
  'basis trade': ['../crypto/arthur-hayes-derivatives-macro.md'],
  'perpetual futures': ['../crypto/arthur-hayes-derivatives-macro.md'],
  perps: ['../crypto/arthur-hayes-derivatives-macro.md'],

  'andreas antonopoulos': ['../crypto/andreas-antonopoulos-bitcoin-fundamentals.md'],
  'mastering bitcoin': ['../crypto/andreas-antonopoulos-bitcoin-fundamentals.md'],
  'not your keys': ['../crypto/andreas-antonopoulos-bitcoin-fundamentals.md'],
  'self custody': ['../crypto/andreas-antonopoulos-bitcoin-fundamentals.md'],
  'lightning network': ['../crypto/andreas-antonopoulos-bitcoin-fundamentals.md'],
  'hash rate': ['../crypto/andreas-antonopoulos-bitcoin-fundamentals.md', '../crypto/on-chain-analysis-complete.md'],
  'bitcoin network': ['../crypto/andreas-antonopoulos-bitcoin-fundamentals.md'],

  hoskinson: ['../crypto/charles-hoskinson-cardano-governance.md'],
  cardano: ['../crypto/charles-hoskinson-cardano-governance.md'],
  '\bada\b': ['../crypto/charles-hoskinson-cardano-governance.md'],
  iohk: ['../crypto/charles-hoskinson-cardano-governance.md'],
  ouroboros: ['../crypto/charles-hoskinson-cardano-governance.md'],
  'formal verification': ['../crypto/charles-hoskinson-cardano-governance.md'],
  'blockchain governance': ['../crypto/charles-hoskinson-cardano-governance.md'],

  // ── Crypto Topics ────────────────────────────────────────────────────────────
  'on chain': ['../crypto/on-chain-analysis-complete.md'],
  'on-chain': ['../crypto/on-chain-analysis-complete.md'],
  'exchange inflow': ['../crypto/on-chain-analysis-complete.md'],
  'exchange outflow': ['../crypto/on-chain-analysis-complete.md'],
  'exchange reserve': ['../crypto/on-chain-analysis-complete.md'],
  sopr: ['../crypto/on-chain-analysis-complete.md'],
  'long term holder': ['../crypto/on-chain-analysis-complete.md'],
  'short term holder': ['../crypto/on-chain-analysis-complete.md'],
  'miner': ['../crypto/on-chain-analysis-complete.md'],
  'nvt': ['../crypto/on-chain-analysis-complete.md'],
  'puell': ['../crypto/on-chain-analysis-complete.md'],

  'crypto cycle': ['../crypto/crypto-cycles-complete.md'],
  'bitcoin cycle': ['../crypto/crypto-cycles-complete.md'],
  'bull market crypto': ['../crypto/crypto-cycles-complete.md'],
  'bear market crypto': ['../crypto/crypto-cycles-complete.md'],
  'crypto bear': ['../crypto/crypto-cycles-complete.md'],
  'crypto bull': ['../crypto/crypto-cycles-complete.md'],
  'fear greed': ['../crypto/crypto-cycles-complete.md'],
  'btc dominance': ['../crypto/crypto-cycles-complete.md', '../crypto/altcoin-season-mechanics.md'],

  'altcoin season': ['../crypto/altcoin-season-mechanics.md'],
  'altcoin': ['../crypto/altcoin-season-mechanics.md'],
  'alt season': ['../crypto/altcoin-season-mechanics.md'],
  'bitcoin dominance': ['../crypto/altcoin-season-mechanics.md'],

  defi: ['../crypto/defi-complete-guide.md'],
  'total value locked': ['../crypto/defi-complete-guide.md'],
  tvl: ['../crypto/defi-complete-guide.md'],
  uniswap: ['../crypto/defi-complete-guide.md'],
  aave: ['../crypto/defi-complete-guide.md'],
  lido: ['../crypto/defi-complete-guide.md'],
  'yield farming': ['../crypto/defi-complete-guide.md'],
  'liquidity pool': ['../crypto/defi-complete-guide.md'],
  'liquid staking': ['../crypto/defi-complete-guide.md'],
  'decentralized exchange': ['../crypto/defi-complete-guide.md'],
  dex: ['../crypto/defi-complete-guide.md'],

  'layer 2': ['../crypto/layer2-scaling-solutions.md'],
  'layer2': ['../crypto/layer2-scaling-solutions.md'],
  '\bl2\b': ['../crypto/layer2-scaling-solutions.md'],
  arbitrum: ['../crypto/layer2-scaling-solutions.md'],
  'optimism': ['../crypto/layer2-scaling-solutions.md'],
  'base chain': ['../crypto/layer2-scaling-solutions.md'],
  zksync: ['../crypto/layer2-scaling-solutions.md'],
  starknet: ['../crypto/layer2-scaling-solutions.md'],
  rollup: ['../crypto/layer2-scaling-solutions.md'],
  'zk rollup': ['../crypto/layer2-scaling-solutions.md'],
  'optimistic rollup': ['../crypto/layer2-scaling-solutions.md'],

  'crypto macro': ['../crypto/crypto-macro-correlation.md'],
  'crypto correlation': ['../crypto/crypto-macro-correlation.md'],
  dxy: ['../crypto/crypto-macro-correlation.md'],
  'm2 money': ['../crypto/crypto-macro-correlation.md'],
  'stablecoin supply': ['../crypto/crypto-macro-correlation.md'],

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

// Pine Script keyword → file mapping (based on LLM_MANIFEST.md)
const PINE_KEYWORD_MAP: Record<string, string[]> = {
  // Execution & core concepts
  'barstate': ['concepts/execution_model.md'],
  'var ': ['concepts/execution_model.md'],
  'varip': ['concepts/execution_model.md'],
  'calc_on_every_tick': ['concepts/execution_model.md'],
  'execution model': ['concepts/execution_model.md'],
  'bar-by-bar': ['concepts/execution_model.md'],
  'repainting': ['concepts/timeframes.md'],
  'request.security': ['concepts/timeframes.md'],
  'multi-timeframe': ['concepts/timeframes.md'],
  'mtf': ['concepts/timeframes.md'],
  'htf': ['concepts/timeframes.md'],
  'color.new': ['concepts/colors_and_display.md'],
  'bgcolor': ['concepts/colors_and_display.md'],
  'color.from_gradient': ['concepts/colors_and_display.md'],
  'common error': ['concepts/common_errors.md'],
  'compile error': ['concepts/common_errors.md'],
  'series string': ['concepts/common_errors.md'],
  'undeclared identifier': ['concepts/common_errors.md'],
  'max_bars_back': ['concepts/common_errors.md'],
  // Reference
  'syminfo': ['reference/variables.md'],
  'bar_index': ['reference/variables.md'],
  'built-in variable': ['reference/variables.md'],
  'color.red': ['reference/constants.md'],
  'shape.triangle': ['reference/constants.md'],
  'plot.style': ['reference/constants.md'],
  'alert.freq': ['reference/constants.md'],
  'simple int': ['reference/types.md'],
  'series float': ['reference/types.md'],
  'type casting': ['reference/types.md'],
  'switch': ['reference/keywords.md'],
  'export': ['reference/keywords.md'],
  'import': ['reference/keywords.md'],
  // Functions by namespace
  'ta.': ['reference/functions/ta.md'],
  'ta.ema': ['reference/functions/ta.md'],
  'ta.rsi': ['reference/functions/ta.md'],
  'ta.macd': ['reference/functions/ta.md'],
  'ta.sma': ['reference/functions/ta.md'],
  'ta.bb': ['reference/functions/ta.md'],
  'ta.atr': ['reference/functions/ta.md'],
  'ta.stoch': ['reference/functions/ta.md'],
  'ta.vwap': ['reference/functions/ta.md'],
  'ta.cross': ['reference/functions/ta.md'],
  'ta.highest': ['reference/functions/ta.md'],
  'ta.lowest': ['reference/functions/ta.md'],
  'ta.pivothigh': ['reference/functions/ta.md'],
  'ta.pivotlow': ['reference/functions/ta.md'],
  'strategy.entry': ['reference/functions/strategy.md'],
  'strategy.exit': ['reference/functions/strategy.md'],
  'strategy.close': ['reference/functions/strategy.md'],
  'strategy.order': ['reference/functions/strategy.md'],
  'strategy(': ['reference/functions/strategy.md'],
  'commission': ['reference/functions/strategy.md'],
  'slippage': ['reference/functions/strategy.md'],
  'pyramiding': ['reference/functions/strategy.md'],
  'request.': ['reference/functions/request.md'],
  'array.': ['reference/functions/collections.md'],
  'matrix.': ['reference/functions/collections.md'],
  'map.': ['reference/functions/collections.md'],
  'line.new': ['reference/functions/drawing.md'],
  'label.new': ['reference/functions/drawing.md'],
  'box.new': ['reference/functions/drawing.md'],
  'table.new': ['reference/functions/drawing.md'],
  'polyline': ['reference/functions/drawing.md'],
  'plot(': ['reference/functions/general.md'],
  'plotshape': ['reference/functions/general.md'],
  'plotchar': ['reference/functions/general.md'],
  'fill(': ['reference/functions/general.md'],
  'hline': ['reference/functions/general.md'],
  'alertcondition': ['reference/functions/general.md'],
  // Methods & objects
  'method ': ['concepts/methods.md'],
  '.new(': ['concepts/objects.md'],
  'user-defined type': ['concepts/objects.md'],
  'udt': ['concepts/objects.md'],
  // Writing scripts
  'debug': ['writing_scripts/debugging.md'],
  'profil': ['writing_scripts/profiling_and_optimization.md'],
  'optimiz': ['writing_scripts/profiling_and_optimization.md'],
  'limitation': ['writing_scripts/limitations.md'],
  'style guide': ['writing_scripts/style_guide.md'],
  'publish': ['writing_scripts/publishing_scripts.md'],
}

function readFile(filePath: string): string {
  try {
    // Support ../crypto/ prefix for crypto knowledge base files
    const fullPath = filePath.startsWith('../crypto/')
      ? path.join(RESEARCH_DIR, '..', 'markets', 'crypto', filePath.replace('../crypto/', ''))
      : path.join(RESEARCH_DIR, filePath)
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf-8')
    }
  } catch {
    // file not found
  }
  return ''
}

function readPineFile(relativePath: string): string {
  try {
    const fullPath = path.join(PINE_DIR, relativePath)
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf-8')
    }
  } catch {}
  return ''
}

export function getRelevantPineKnowledge(userMessage: string): string {
  const message = userMessage.toLowerCase()
  const filesToLoad = new Set<string>()

  for (const [keyword, files] of Object.entries(PINE_KEYWORD_MAP)) {
    if (message.includes(keyword.toLowerCase())) {
      files.forEach(f => filesToLoad.add(f))
    }
  }

  // If it's a pine script question but no specific keyword matched, load the complete reference
  const isPineQuestion = /pine\s*script|indicator\(|strategy\(|@version\s*=\s*[56]|tradingview\s*script/i.test(userMessage)
  if (isPineQuestion && filesToLoad.size === 0) {
    // Load the complete reference (it's 400KB — only do this as fallback)
    filesToLoad.add('pinescriptv6_complete_reference.md')
  }

  const contents: string[] = []
  for (const file of Array.from(filesToLoad).slice(0, 5)) {
    const content = readPineFile(file)
    if (content) {
      const name = path.basename(file, '.md').replace(/-/g, ' ').toUpperCase()
      contents.push(`\n\n---\n## PINE SCRIPT v6 DOCS: ${name}\n\n${content}`)
    }
  }

  return contents.join('')
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
