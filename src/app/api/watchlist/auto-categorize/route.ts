import { createServerSupabaseClient } from '@/lib/supabase'

const CRYPTO_TICKERS = new Set([
  'BTC','ETH','SOL','DOGE','XRP','ADA','AVAX','LINK','DOT','MATIC','LTC','BCH',
  'UNI','ATOM','FIL','NEAR','ARB','OP','INJ','SUI','APT','TIA','SEI','JUP',
  'HBAR','ALGO','XLM','TRX','VET','XMR','TON','SHIB','PEPE','WIF','BONK',
  'RENDER','GRT','IMX','LDO','AAVE','CRV','MKR','FET','FLOKI','BNB',
  'RNDR','SAND','MANA','AXS','THETA','EGLD','IOTA','ZEC','DASH','ETC',
])

export async function POST() {
  const supabase = createServerSupabaseClient()

  // Get all stocks with no category assigned
  const { data: stocks } = await supabase
    .from('watchlist_stocks')
    .select('ticker, category_id')
    .is('category_id', null)

  if (!stocks || stocks.length === 0) return Response.json({ assigned: 0 })

  const cryptoStocks = stocks.filter(s => CRYPTO_TICKERS.has(s.ticker))
  if (cryptoStocks.length === 0) return Response.json({ assigned: 0 })

  // Find or create Crypto category
  let { data: cat } = await supabase
    .from('watchlist_categories')
    .select('id')
    .eq('name', 'Crypto')
    .single()

  if (!cat) {
    const { data: created } = await supabase
      .from('watchlist_categories')
      .insert({ name: 'Crypto', color: '#f7931a', sort_order: 99 })
      .select('id')
      .single()
    cat = created
  }

  if (!cat) return Response.json({ error: 'Could not find or create Crypto category' }, { status: 500 })

  // Assign all uncat'd crypto tickers to the Crypto category
  const tickers = cryptoStocks.map(s => s.ticker)
  const { error } = await supabase
    .from('watchlist_stocks')
    .update({ category_id: cat.id })
    .in('ticker', tickers)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ assigned: tickers.length, tickers })
}
