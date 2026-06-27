// Stock and crypto universe definitions — shared across ic-scoring and options routes

export interface StockEntry {
  ticker: string
  name: string
  sector: string
}

export const SECTOR_ETFS: { sector: string; ticker: string }[] = [
  { sector: 'Technology',          ticker: 'XLK' },
  { sector: 'Financial',           ticker: 'XLF' },
  { sector: 'Energy',              ticker: 'XLE' },
  { sector: 'Healthcare',          ticker: 'XLV' },
  { sector: 'Industrial',          ticker: 'XLI' },
  { sector: 'Consumer Cyclical',   ticker: 'XLY' },
  { sector: 'Consumer Defensive',  ticker: 'XLP' },
  { sector: 'Utilities',           ticker: 'XLU' },
  { sector: 'Real Estate',         ticker: 'XLRE' },
  { sector: 'Materials',           ticker: 'XLB' },
  { sector: 'Communication',       ticker: 'XLC' },
]

export const UNIQUE_STOCK_UNIVERSE: StockEntry[] = [
  // Technology
  { ticker: 'AAPL',  name: 'Apple',             sector: 'Technology' },
  { ticker: 'MSFT',  name: 'Microsoft',          sector: 'Technology' },
  { ticker: 'NVDA',  name: 'NVIDIA',             sector: 'Technology' },
  { ticker: 'AMD',   name: 'AMD',                sector: 'Technology' },
  { ticker: 'AVGO',  name: 'Broadcom',           sector: 'Technology' },
  { ticker: 'ORCL',  name: 'Oracle',             sector: 'Technology' },
  { ticker: 'CRM',   name: 'Salesforce',         sector: 'Technology' },
  { ticker: 'NOW',   name: 'ServiceNow',         sector: 'Technology' },
  { ticker: 'ADBE',  name: 'Adobe',              sector: 'Technology' },
  { ticker: 'INTC',  name: 'Intel',              sector: 'Technology' },
  { ticker: 'QCOM',  name: 'Qualcomm',           sector: 'Technology' },
  { ticker: 'AMAT',  name: 'Applied Materials',  sector: 'Technology' },
  { ticker: 'KLAC',  name: 'KLA Corp',           sector: 'Technology' },
  { ticker: 'MU',    name: 'Micron',             sector: 'Technology' },
  { ticker: 'MRVL',  name: 'Marvell',            sector: 'Technology' },
  // Communication
  { ticker: 'META',  name: 'Meta',               sector: 'Communication' },
  { ticker: 'GOOG',  name: 'Alphabet',           sector: 'Communication' },
  { ticker: 'NFLX',  name: 'Netflix',            sector: 'Communication' },
  { ticker: 'DIS',   name: 'Disney',             sector: 'Communication' },
  { ticker: 'SNAP',  name: 'Snap',               sector: 'Communication' },
  // Consumer Cyclical
  { ticker: 'AMZN',  name: 'Amazon',             sector: 'Consumer Cyclical' },
  { ticker: 'TSLA',  name: 'Tesla',              sector: 'Consumer Cyclical' },
  { ticker: 'BKNG',  name: 'Booking Holdings',  sector: 'Consumer Cyclical' },
  { ticker: 'MCD',   name: "McDonald's",         sector: 'Consumer Cyclical' },
  { ticker: 'NKE',   name: 'Nike',               sector: 'Consumer Cyclical' },
  { ticker: 'SBUX',  name: 'Starbucks',          sector: 'Consumer Cyclical' },
  // Financial
  { ticker: 'JPM',   name: 'JPMorgan',           sector: 'Financial' },
  { ticker: 'BAC',   name: 'Bank of America',    sector: 'Financial' },
  { ticker: 'GS',    name: 'Goldman Sachs',      sector: 'Financial' },
  { ticker: 'MS',    name: 'Morgan Stanley',     sector: 'Financial' },
  { ticker: 'V',     name: 'Visa',               sector: 'Financial' },
  { ticker: 'MA',    name: 'Mastercard',         sector: 'Financial' },
  { ticker: 'PYPL',  name: 'PayPal',             sector: 'Financial' },
  { ticker: 'HOOD',  name: 'Robinhood',          sector: 'Financial' },
  { ticker: 'COIN',  name: 'Coinbase',           sector: 'Financial' },
  // Healthcare
  { ticker: 'UNH',   name: 'UnitedHealth',       sector: 'Healthcare' },
  { ticker: 'JNJ',   name: 'Johnson & Johnson',  sector: 'Healthcare' },
  { ticker: 'LLY',   name: 'Eli Lilly',          sector: 'Healthcare' },
  { ticker: 'PFE',   name: 'Pfizer',             sector: 'Healthcare' },
  { ticker: 'ABBV',  name: 'AbbVie',             sector: 'Healthcare' },
  // Energy
  { ticker: 'XOM',   name: 'ExxonMobil',         sector: 'Energy' },
  { ticker: 'CVX',   name: 'Chevron',            sector: 'Energy' },
  // Industrial
  { ticker: 'CAT',   name: 'Caterpillar',        sector: 'Industrial' },
  { ticker: 'HON',   name: 'Honeywell',          sector: 'Industrial' },
  { ticker: 'BA',    name: 'Boeing',             sector: 'Industrial' },
  { ticker: 'GE',    name: 'GE Aerospace',       sector: 'Industrial' },
  // Consumer Defensive
  { ticker: 'WMT',   name: 'Walmart',            sector: 'Consumer Defensive' },
  { ticker: 'COST',  name: 'Costco',             sector: 'Consumer Defensive' },
  { ticker: 'PG',    name: 'Procter & Gamble',   sector: 'Consumer Defensive' },
]

export const CRYPTO_UNIVERSE: { symbol: string; category: string; coingeckoId: string }[] = [
  { symbol: 'BTC',    category: 'Layer1',   coingeckoId: 'bitcoin' },
  { symbol: 'ETH',    category: 'Layer1',   coingeckoId: 'ethereum' },
  { symbol: 'SOL',    category: 'Layer1',   coingeckoId: 'solana' },
  { symbol: 'BNB',    category: 'Layer1',   coingeckoId: 'binancecoin' },
  { symbol: 'XRP',    category: 'Layer1',   coingeckoId: 'ripple' },
  { symbol: 'ADA',    category: 'Layer1',   coingeckoId: 'cardano' },
  { symbol: 'AVAX',   category: 'Layer1',   coingeckoId: 'avalanche-2' },
  { symbol: 'DOT',    category: 'Layer1',   coingeckoId: 'polkadot' },
  { symbol: 'NEAR',   category: 'Layer1',   coingeckoId: 'near' },
  { symbol: 'SUI',    category: 'Layer1',   coingeckoId: 'sui' },
  { symbol: 'APT',    category: 'Layer1',   coingeckoId: 'aptos' },
  { symbol: 'TRX',    category: 'Layer1',   coingeckoId: 'tron' },
  { symbol: 'ARB',    category: 'Layer2',   coingeckoId: 'arbitrum' },
  { symbol: 'OP',     category: 'Layer2',   coingeckoId: 'optimism' },
  { symbol: 'MATIC',  category: 'Layer2',   coingeckoId: 'matic-network' },
  { symbol: 'IMX',    category: 'Layer2',   coingeckoId: 'immutable-x' },
  { symbol: 'LINK',   category: 'DeFi',     coingeckoId: 'chainlink' },
  { symbol: 'UNI',    category: 'DeFi',     coingeckoId: 'uniswap' },
  { symbol: 'AAVE',   category: 'DeFi',     coingeckoId: 'aave' },
  { symbol: 'MKR',    category: 'DeFi',     coingeckoId: 'maker' },
  { symbol: 'INJ',    category: 'DeFi',     coingeckoId: 'injective-protocol' },
  { symbol: 'GRT',    category: 'DeFi',     coingeckoId: 'the-graph' },
  { symbol: 'DOGE',   category: 'Meme',     coingeckoId: 'dogecoin' },
  { symbol: 'SHIB',   category: 'Meme',     coingeckoId: 'shiba-inu' },
  { symbol: 'PEPE',   category: 'Meme',     coingeckoId: 'pepe' },
  { symbol: 'WIF',    category: 'Meme',     coingeckoId: 'dogwifcoin' },
  { symbol: 'BONK',   category: 'Meme',     coingeckoId: 'bonk' },
  { symbol: 'TON',    category: 'Layer1',   coingeckoId: 'the-open-network' },
  { symbol: 'ATOM',   category: 'Layer1',   coingeckoId: 'cosmos' },
  { symbol: 'FIL',    category: 'Storage',  coingeckoId: 'filecoin' },
  { symbol: 'RENDER', category: 'AI',       coingeckoId: 'render-token' },
  { symbol: 'FET',    category: 'AI',       coingeckoId: 'fetch-ai' },
  { symbol: 'HBAR',   category: 'Layer1',   coingeckoId: 'hedera-hashgraph' },
  { symbol: 'XLM',    category: 'Layer1',   coingeckoId: 'stellar' },
  { symbol: 'ICP',    category: 'Layer1',   coingeckoId: 'internet-computer' },
  { symbol: 'LTC',    category: 'Layer1',   coingeckoId: 'litecoin' },
  { symbol: 'BCH',    category: 'Layer1',   coingeckoId: 'bitcoin-cash' },
]

// Options-eligible tickers (liquid enough for 0DTE / weekly options)
export const OPTIONS_ELIGIBLE: string[] = [
  'SPY','QQQ','SPX','AAPL','NVDA','MSFT','TSLA','AMZN','META','GOOG',
  'AMD','NFLX','COIN','HOOD','BAC','JPM','GS','V','MA',
  'XLK','XLF','XLE','XLV','XLI','XLY',
]
