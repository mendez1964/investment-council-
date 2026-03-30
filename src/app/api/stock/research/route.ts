// Investment Council — Stock Research API
// GET /api/stock/research?ticker=NVDA
// Returns quote, profile, fundamentals, technicals, signal, and news in one call.

import { createServerSupabaseClient } from '@/lib/supabase'
import { getQuote, getProfile, getMetrics, getTechnicalSnapshot } from '@/lib/finnhub'
import { getDarkPoolData } from '@/lib/darkpool'
import { getExpirations, getChain, computeGEX, findUnusualFlow, pickExpiry } from '@/lib/tradier'
import { computeStockSignal, type Signal } from '@/lib/signal-engine'

// 5-minute in-memory cache
const cache = new Map<string, { data: Record<string, unknown>; ts: number }>()
const CACHE_MS = 5 * 60 * 1000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')?.toUpperCase()

  if (!ticker) {
    return Response.json({ error: 'ticker is required' }, { status: 400 })
  }

  const cached = cache.get(ticker)
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return Response.json({ ...cached.data, cached: true })
  }

  try {
    const weeklyTarget = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Fetch everything in parallel
    const [quote, profile, metrics, snapshot, darkPool, vixQuote, expirations] = await Promise.all([
      getQuote(ticker).catch(() => null),
      getProfile(ticker).catch(() => null),
      getMetrics(ticker).catch(() => null),
      getTechnicalSnapshot(ticker).catch(() => null),
      getDarkPoolData(ticker).catch(() => null),
      getQuote('^VIX').catch(() => null),
      getExpirations(ticker).catch(() => null),
    ])

    if (!quote || !quote.c) {
      return Response.json({ error: `No data found for ticker ${ticker}` }, { status: 404 })
    }

    // Options chain — GEX + unusual flow
    let gexPositive: boolean | null = null
    let unusualCallFlow = false
    let unusualPutFlow  = false

    if (expirations && expirations.length > 0 && snapshot) {
      const expiry = pickExpiry(expirations, weeklyTarget) ?? expirations[0]
      const chain = await getChain(ticker, expiry).catch(() => null)
      if (chain) {
        const gex = computeGEX(chain, snapshot.price)
        gexPositive = gex.regime === 'positive'
        const unusual = findUnusualFlow(chain, snapshot.price)
        unusualCallFlow = unusual.some(u => u.type === 'call')
        unusualPutFlow  = unusual.some(u => u.type === 'put')
      }
    }

    const shortInterestPct = metrics?.shortPercent
      ?? metrics?.shortInterestPercentOutFloat
      ?? (metrics?.shortInterest && metrics?.sharesOutstanding
        ? (metrics.shortInterest / metrics.sharesOutstanding) * 100
        : null)

    const vix: number | null = vixQuote?.c ?? null

    // Compute signal
    let signal: Signal | null = null
    if (snapshot) {
      signal = computeStockSignal(ticker, {
        aboveSma20: snapshot.aboveSma20,
        aboveSma50: snapshot.aboveSma50,
        aboveSma200: snapshot.aboveSma200,
        rsi14: snapshot.rsi14,
        macdHistogram: snapshot.macdHistogram,
        volVsAvg: snapshot.volVsAvg,
        shortInterestPct: shortInterestPct ?? null,
        unusualCallFlow,
        unusualPutFlow,
        gexPositive,
        vix,
        darkPoolFlow: darkPool?.flow ?? null,
        darkPoolBlockVsAvg: darkPool?.blockTradeVsAvg ?? null,
        congressNetBias: darkPool?.congressNetBias ?? 'neutral',
        darkPoolDrivers: darkPool?.drivers ?? [],
      })
    }

    // Pull news from Supabase market_news — any news mentioning this ticker in last 72h
    const db = createServerSupabaseClient()
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
    const { data: newsItems } = await db
      .from('market_news')
      .select('headline, summary, impact_level, impact_direction, source, created_at')
      .gte('created_at', cutoff)
      .contains('affected_tickers', [ticker])
      .order('created_at', { ascending: false })
      .limit(8)

    const marketCap = profile?.marketCapitalization
      ? profile.marketCapitalization * 1e6
      : metrics?.marketCapitalization
        ? metrics.marketCapitalization * 1e6
        : null

    const result = {
      ticker,
      name: profile?.name ?? ticker,
      sector: profile?.finnhubIndustry ?? null,
      exchange: profile?.exchange ?? null,
      logo: profile?.logo ?? null,
      price: quote.c,
      change: quote.d ?? 0,
      changePct: quote.dp ?? 0,
      high: quote.h,
      low: quote.l,
      open: quote.o,
      prevClose: quote.pc,
      marketCap,
      pe: metrics?.peNormalizedAnnual ?? metrics?.peBasicExclExtraTTM ?? null,
      high52w: metrics?.['52WeekHigh'] ?? null,
      low52w: metrics?.['52WeekLow'] ?? null,
      shortInterestPct: shortInterestPct ?? null,
      dividendYield: metrics?.dividendYieldIndicatedAnnual ?? null,
      rsi14: snapshot?.rsi14 ?? null,
      macdHistogram: snapshot?.macdHistogram ?? null,
      aboveSma20: snapshot?.aboveSma20 ?? null,
      aboveSma50: snapshot?.aboveSma50 ?? null,
      aboveSma200: snapshot?.aboveSma200 ?? null,
      sma20: snapshot?.sma20 ?? null,
      sma50: snapshot?.sma50 ?? null,
      sma200: snapshot?.sma200 ?? null,
      volVsAvg: snapshot?.volVsAvg ?? null,
      signal: signal ? {
        direction: signal.direction,
        confidence: signal.confidence,
        state: signal.state,
        drivers: signal.drivers,
        squeeze_setup: signal.squeeze_setup,
        score: signal.score,
      } : null,
      news: newsItems ?? [],
    }

    cache.set(ticker, { data: result, ts: Date.now() })

    return Response.json({ ...result, cached: false })

  } catch (err) {
    console.error('[stock/research]', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
