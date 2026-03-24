// Run in Supabase SQL editor:
// CREATE TABLE IF NOT EXISTS battle_picks (
//   id serial PRIMARY KEY,
//   pick_date date NOT NULL,
//   ai_name text NOT NULL CHECK (ai_name IN ('claude', 'chatgpt', 'gemini')),
//   category text NOT NULL CHECK (category IN ('stock', 'crypto', 'option')),
//   symbol text NOT NULL,
//   bias text NOT NULL,
//   entry_price numeric,
//   target_price numeric,
//   stop_price numeric,
//   confidence integer,
//   rationale text,
//   catalyst text,
//   outcome text DEFAULT 'pending' CHECK (outcome IN ('win', 'loss', 'pending')),
//   target_hit boolean DEFAULT false,
//   exit_price numeric,
//   return_pct numeric,
//   evaluated_at timestamptz,
//   created_at timestamptz DEFAULT now(),
//   UNIQUE(pick_date, ai_name, category)
// );
// ALTER TABLE battle_picks ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Public read battle_picks" ON battle_picks FOR SELECT USING (true);
// CREATE POLICY "Service insert battle_picks" ON battle_picks FOR INSERT WITH CHECK (true);
// CREATE POLICY "Service update battle_picks" ON battle_picks FOR UPDATE USING (true);

import { fetchLiveData } from '@/lib/live-data'
import { getQuote } from '@/lib/finnhub'
import { getCryptoPrice } from '@/lib/coingecko'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logApiUsage, estimateClaudeCost } from '@/lib/analytics'
import { generateBattlePick } from '@/lib/battle-ai'

const CRYPTO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot',
  MATIC: 'matic-network', LINK: 'chainlink', LTC: 'litecoin',
  ATOM: 'cosmos', NEAR: 'near', ARB: 'arbitrum', OP: 'optimism',
  INJ: 'injective-protocol', HBAR: 'hedera-hashgraph', DOGE: 'dogecoin',
  SHIB: 'shiba-inu', UNI: 'uniswap', AAVE: 'aave', MKR: 'maker',
  TON: 'the-open-network', TRX: 'tron', SUI: 'sui', APT: 'aptos',
  FIL: 'filecoin', GRT: 'the-graph', PEPE: 'pepe', WIF: 'dogwifcoin',
  BCH: 'bitcoin-cash', XLM: 'stellar', ICP: 'internet-computer',
  IMX: 'immutable-x', RENDER: 'render-token', RNDR: 'render-token',
  FET: 'fetch-ai', BONK: 'bonk', FLOKI: 'floki',
}

function verifyCron(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === (process.env.CRON_SECRET ?? 'ic-cron-2024')
}

export async function POST(request: Request) {
  if (!verifyCron(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const refresh = url.searchParams.get('refresh') === 'true'

  const supabase = createServerSupabaseClient()
  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time

  // Check if all 9 picks already exist for today
  if (!refresh) {
    const { data: existing } = await supabase
      .from('battle_picks')
      .select('id')
      .eq('pick_date', today)
    if (existing && existing.length >= 9) {
      return Response.json({ ok: true, skipped: true, reason: 'already_generated', date: today })
    }
  }

  // Fetch live market data
  let liveData = ''
  try {
    const timeout = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000))
    liveData = await Promise.race([
      fetchLiveData('pre-market briefing sector rotation VIX fear greed bitcoin dominance funding rates ethereum solana market movers gainers losers economic macro options'),
      timeout,
    ])
  } catch {
    liveData = `Date: ${today}. Live data unavailable — use general market knowledge.`
  }

  const AIs = ['claude', 'chatgpt', 'gemini'] as const
  const categories = ['stock', 'crypto', 'option'] as const
  const startTime = Date.now()
  let generated = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0

  const jobs = AIs.flatMap(ai =>
    categories.map(async (category) => {
      try {
        const pick = await generateBattlePick(ai, category, liveData)

        // Fetch entry price
        let entry_price: number | null = null
        try {
          if (category === 'crypto') {
            const coinId = CRYPTO_ID_MAP[pick.symbol.toUpperCase()] ?? pick.symbol.toLowerCase()
            const p = await getCryptoPrice(coinId) as any
            entry_price = p?.price ?? null
          } else {
            const q = await getQuote(pick.symbol)
            entry_price = q?.c ?? null
          }
        } catch {}

        const target_price = entry_price != null
          ? parseFloat((entry_price * (1 + pick.target_pct / 100)).toFixed(4))
          : null
        const stop_price = entry_price != null
          ? parseFloat((entry_price * (1 - pick.stop_pct / 100)).toFixed(4))
          : null

        const { error } = await supabase.from('battle_picks').upsert({
          pick_date: today,
          ai_name: ai,
          category,
          symbol: pick.symbol,
          bias: pick.bias,
          confidence: pick.confidence,
          rationale: pick.rationale,
          catalyst: pick.catalyst,
          entry_price,
          target_price,
          stop_price,
          outcome: 'pending',
        }, { onConflict: 'pick_date,ai_name,category' })

        if (!error) generated++

        // Rough token estimate: ~300 input + ~150 output per call
        totalInputTokens += 300
        totalOutputTokens += 150
      } catch (err) {
        console.error(`[war/generate] ${ai}/${category} error:`, err)
      }
    })
  )

  await Promise.allSettled(jobs)

  const durationMs = Date.now() - startTime
  const costUsd = estimateClaudeCost(totalInputTokens, totalOutputTokens)

  await logApiUsage(supabase, {
    apiName: 'claude',
    endpoint: '/api/war/generate',
    tokensInput: totalInputTokens,
    tokensOutput: totalOutputTokens,
    costUsd,
    durationMs,
    success: generated > 0,
    metadata: { generated, date: today },
  })

  return Response.json({ ok: true, generated, date: today })
}
