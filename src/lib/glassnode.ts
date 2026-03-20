// Glassnode on-chain data client
// Docs: https://docs.glassnode.com/basic-api/api
//
// Each endpoint returns an array of { t: unixTimestamp, v: number }
// We always take the last element (most recent data point)
//
// Tier notes:
//   Free (Beginner): active addresses, transaction count, hash rate
//   Standard ($39/mo): MVRV, SOPR, realized price, exchange flows, LTH/STH supply
//   Advanced: everything else (thermocap, Puell Multiple, etc.)

const BASE = 'https://api.glassnode.com/v1/metrics'

function getKey(): string {
  return process.env.GLASSNODE_API_KEY ?? ''
}

// Returns the most recent value from a Glassnode timeseries endpoint
async function fetchLatest(path: string, asset = 'BTC', interval = '24h'): Promise<number | null> {
  const key = getKey()
  if (!key) return null

  const url = `${BASE}${path}?a=${asset}&i=${interval}&api_key=${key}&limit=1`
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } }) // cache 1 hour
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    return data[data.length - 1]?.v ?? null
  } catch {
    return null
  }
}

// ── Individual metrics ─────────────────────────────────────────────────────

// MVRV Ratio — market value vs realized value. >3.7 = overheated, <1 = bottom zone
export async function getMVRV(): Promise<number | null> {
  return fetchLatest('/indicators/mvrv')
}

// SOPR — Spent Output Profit Ratio. >1 = sellers in profit, <1 = selling at loss
export async function getSOPR(): Promise<number | null> {
  return fetchLatest('/indicators/sopr')
}

// Bitcoin Realized Price — average cost basis of all BTC on-chain
export async function getRealizedPrice(): Promise<number | null> {
  return fetchLatest('/market/price_realized_usd')
}

// Mean Hash Rate — network security signal in TH/s
export async function getHashRate(): Promise<number | null> {
  return fetchLatest('/mining/hash_rate_mean')
}

// Active Addresses — daily unique addresses used
export async function getActiveAddresses(): Promise<number | null> {
  return fetchLatest('/addresses/active_count')
}

// Exchange Net Position Change — positive = coins flowing to exchanges (sell pressure)
// negative = coins leaving exchanges (accumulation)
export async function getExchangeNetFlow(): Promise<number | null> {
  return fetchLatest('/transactions/transfers_volume_exchanges_net')
}

// Long-Term Holder Supply — BTC held 155+ days (strong hands)
export async function getLTHSupply(): Promise<number | null> {
  return fetchLatest('/supply/lth_sum')
}

// Short-Term Holder Supply — BTC held <155 days (new money / weak hands)
export async function getSTHSupply(): Promise<number | null> {
  return fetchLatest('/supply/sth_sum')
}

// Puell Multiple — miner revenue vs 365d MA. >4 = top zone, <0.5 = bottom zone
export async function getPuellMultiple(): Promise<number | null> {
  return fetchLatest('/indicators/puell_multiple')
}

// ── Composite: fetch all on-chain metrics at once ──────────────────────────

export interface OnChainSnapshot {
  mvrv: number | null
  sopr: number | null
  realizedPrice: number | null
  hashRate: number | null
  activeAddresses: number | null
  exchangeNetFlow: number | null
  lthSupply: number | null
  sthSupply: number | null
  puellMultiple: number | null
}

export async function getOnChainSnapshot(): Promise<OnChainSnapshot> {
  const [mvrv, sopr, realizedPrice, hashRate, activeAddresses, exchangeNetFlow, lthSupply, sthSupply, puellMultiple] =
    await Promise.all([
      getMVRV().catch(() => null),
      getSOPR().catch(() => null),
      getRealizedPrice().catch(() => null),
      getHashRate().catch(() => null),
      getActiveAddresses().catch(() => null),
      getExchangeNetFlow().catch(() => null),
      getLTHSupply().catch(() => null),
      getSTHSupply().catch(() => null),
      getPuellMultiple().catch(() => null),
    ])

  return { mvrv, sopr, realizedPrice, hashRate, activeAddresses, exchangeNetFlow, lthSupply, sthSupply, puellMultiple }
}

// ── Format for Council context ─────────────────────────────────────────────

export function interpretMVRV(v: number): string {
  if (v > 3.7) return 'OVERHEATED — historically near cycle tops'
  if (v > 2.4) return 'Elevated — bull market territory, caution warranted'
  if (v > 1.0) return 'Healthy — mid-cycle range'
  if (v > 0.8) return 'Undervalued — historically near cycle bottoms'
  return 'EXTREMELY UNDERVALUED — deep bear market bottom zone'
}

export function interpretSOPR(v: number): string {
  if (v > 1.05) return 'Sellers strongly in profit — potential distribution'
  if (v > 1.0) return 'Sellers slightly in profit — normal bull market'
  if (v === 1.0) return 'Breakeven — key inflection point'
  return 'Sellers at a loss — capitulation or bear market'
}

export function interpretExchangeFlow(v: number): string {
  if (v > 5000) return 'Large inflow to exchanges — significant sell pressure'
  if (v > 1000) return 'Moderate inflow — mild sell pressure'
  if (v < -5000) return 'Large outflow from exchanges — strong accumulation signal'
  if (v < -1000) return 'Moderate outflow — accumulation in progress'
  return 'Neutral flow — balanced'
}

export function interpretPuell(v: number): string {
  if (v > 4) return 'EXTREME — historically near cycle tops (miners selling heavily)'
  if (v > 2) return 'Elevated — miners profitable, potential distribution'
  if (v > 0.5) return 'Normal range'
  return 'DEPRESSED — historically near cycle bottoms (miners under stress)'
}

export function formatOnChainForCouncil(snap: OnChainSnapshot, btcPrice?: number): string {
  const lines: string[] = []

  if (snap.mvrv !== null) {
    lines.push(`MVRV Ratio: ${snap.mvrv.toFixed(3)} — ${interpretMVRV(snap.mvrv)}`)
  }
  if (snap.realizedPrice !== null) {
    lines.push(`Bitcoin Realized Price: $${snap.realizedPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}${btcPrice ? ` | Current Price Premium: ${((btcPrice / snap.realizedPrice - 1) * 100).toFixed(1)}% above realized` : ''}`)
  }
  if (snap.sopr !== null) {
    lines.push(`SOPR: ${snap.sopr.toFixed(4)} — ${interpretSOPR(snap.sopr)}`)
  }
  if (snap.exchangeNetFlow !== null) {
    lines.push(`Exchange Net Flow (BTC): ${snap.exchangeNetFlow > 0 ? '+' : ''}${snap.exchangeNetFlow.toFixed(0)} — ${interpretExchangeFlow(snap.exchangeNetFlow)}`)
  }
  if (snap.lthSupply !== null && snap.sthSupply !== null) {
    const total = snap.lthSupply + snap.sthSupply
    const lthPct = ((snap.lthSupply / total) * 100).toFixed(1)
    lines.push(`Long-Term Holders: ${snap.lthSupply.toFixed(0)} BTC (${lthPct}% of circulating) | Short-Term Holders: ${snap.sthSupply.toFixed(0)} BTC`)
  } else if (snap.lthSupply !== null) {
    lines.push(`Long-Term Holder Supply: ${snap.lthSupply.toFixed(0)} BTC`)
  }
  if (snap.hashRate !== null) {
    const th = (snap.hashRate / 1e12).toFixed(2)
    lines.push(`Mean Hash Rate: ${th} EH/s — network security metric`)
  }
  if (snap.activeAddresses !== null) {
    lines.push(`Active Addresses (24h): ${snap.activeAddresses.toLocaleString()}`)
  }
  if (snap.puellMultiple !== null) {
    lines.push(`Puell Multiple: ${snap.puellMultiple.toFixed(3)} — ${interpretPuell(snap.puellMultiple)}`)
  }

  if (lines.length === 0) return ''

  return `LIVE ON-CHAIN DATA (Glassnode — Bitcoin):\n${lines.join('\n')}`
}
