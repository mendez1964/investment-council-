export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase'

const CRYPTO_TICKERS = new Set([
  'BTC','ETH','SOL','DOGE','XRP','ADA','AVAX','LINK','DOT','MATIC','LTC','BCH',
  'UNI','ATOM','FIL','NEAR','ARB','OP','INJ','SUI','APT','TIA','SEI','JUP',
  'HBAR','ALGO','XLM','TRX','VET','XMR','TON','SHIB','PEPE','WIF','BONK',
  'RENDER','GRT','IMX','LDO','AAVE','CRV','MKR','FET','FLOKI','RNDR',
  'BNB','SAND','MANA','AXS','THETA','EGLD','IOTA','ZEC','DASH','ETC',
])

async function getOrCreateCryptoCategory(supabase: ReturnType<typeof createServerSupabaseClient>) {
  // Try to find existing Crypto category
  const { data: existing } = await supabase
    .from('watchlist_categories')
    .select('id')
    .eq('name', 'Crypto')
    .single()

  if (existing) return existing.id

  // Create it if it doesn't exist
  const { data: created } = await supabase
    .from('watchlist_categories')
    .insert({ name: 'Crypto', color: '#f7931a', sort_order: 99 })
    .select('id')
    .single()

  return created?.id ?? null
}

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('watchlist_stocks')
    .select('*, watchlist_categories(id, name, color)')
    .order('added_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { ticker, company_name, category_id } = await request.json()

  if (!ticker) return Response.json({ error: 'ticker required' }, { status: 400 })

  const clean = ticker.toUpperCase().trim()

  // Auto-assign crypto category if ticker is a known crypto and no category provided
  let resolvedCategoryId = category_id || null
  if (!resolvedCategoryId && CRYPTO_TICKERS.has(clean)) {
    resolvedCategoryId = await getOrCreateCryptoCategory(supabase)
  }

  const { data, error } = await supabase
    .from('watchlist_stocks')
    .upsert({ ticker: clean, company_name: company_name || null, category_id: resolvedCategoryId })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
