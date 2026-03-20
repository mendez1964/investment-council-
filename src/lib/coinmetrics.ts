// CoinMetrics Community API — free, no API key required
// Docs: https://docs.coinmetrics.io/api/v4
//
// Metrics we pull (all available on free community tier):
//   CapMVRVCur   — MVRV Ratio
//   FlowInExNtv  — BTC flowing INTO exchanges (sell pressure)
//   FlowOutExNtv — BTC flowing OUT of exchanges (accumulation)
//   HashRate     — Mean hash rate (TH/s)
//   AdrActCnt    — Active addresses (24h)

const BASE = 'https://community-api.coinmetrics.io/v4'

const METRICS = [
  'CapMVRVCur',   // MVRV
  'FlowInExNtv',  // exchange inflow
  'FlowOutExNtv', // exchange outflow
  'HashRate',     // hash rate
  'AdrActCnt',    // active addresses
].join(',')

export interface CoinMetricsSnapshot {
  mvrv: number | null
  exchangeInflow: number | null
  exchangeOutflow: number | null
  exchangeNetFlow: number | null // inflow - outflow (positive = sell pressure)
  hashRate: number | null
  activeAddresses: number | null
  asOf: string | null
}

export async function getCoinMetricsSnapshot(): Promise<CoinMetricsSnapshot> {
  const empty: CoinMetricsSnapshot = {
    mvrv: null, exchangeInflow: null, exchangeOutflow: null,
    exchangeNetFlow: null, hashRate: null, activeAddresses: null, asOf: null,
  }

  try {
    // Get the last 3 days to ensure we have a recent data point (daily resolution)
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - 3)

    const url = `${BASE}/timeseries/asset-metrics?assets=btc&metrics=${METRICS}&frequency=1d&start_time=${start.toISOString().split('T')[0]}&page_size=5`
    const res = await fetch(url, { next: { revalidate: 3600 } })

    if (!res.ok) return empty

    const json = await res.json()
    const rows: any[] = json?.data ?? []
    if (rows.length === 0) return empty

    // Take the most recent row that has data
    const latest = rows[rows.length - 1]

    const inflow = latest.FlowInExNtv != null ? parseFloat(latest.FlowInExNtv) : null
    const outflow = latest.FlowOutExNtv != null ? parseFloat(latest.FlowOutExNtv) : null

    return {
      mvrv: latest.CapMVRVCur != null ? parseFloat(latest.CapMVRVCur) : null,
      exchangeInflow: inflow,
      exchangeOutflow: outflow,
      exchangeNetFlow: inflow != null && outflow != null ? inflow - outflow : null,
      hashRate: latest.HashRate != null ? parseFloat(latest.HashRate) : null,
      activeAddresses: latest.AdrActCnt != null ? parseFloat(latest.AdrActCnt) : null,
      asOf: latest.time ?? null,
    }
  } catch {
    return empty
  }
}

export function formatCoinMetricsForCouncil(snap: CoinMetricsSnapshot): string {
  const lines: string[] = []

  if (snap.mvrv != null) {
    let mvrvSignal = ''
    if (snap.mvrv > 3.7) mvrvSignal = 'OVERHEATED — historically near cycle tops'
    else if (snap.mvrv > 2.4) mvrvSignal = 'Elevated — bull market territory'
    else if (snap.mvrv > 1.0) mvrvSignal = 'Healthy — mid-cycle range'
    else if (snap.mvrv > 0.8) mvrvSignal = 'Undervalued — near historical bottoms'
    else mvrvSignal = 'EXTREMELY UNDERVALUED — deep bear market'
    lines.push(`MVRV Ratio: ${snap.mvrv.toFixed(3)} — ${mvrvSignal}`)
  }

  if (snap.exchangeNetFlow != null) {
    const net = snap.exchangeNetFlow
    let signal = ''
    if (net > 5000) signal = 'Large inflow to exchanges — significant sell pressure'
    else if (net > 1000) signal = 'Moderate inflow — mild sell pressure'
    else if (net < -5000) signal = 'Large outflow from exchanges — strong accumulation'
    else if (net < -1000) signal = 'Moderate outflow — accumulation in progress'
    else signal = 'Neutral — balanced flow'
    lines.push(`Exchange Net Flow: ${net > 0 ? '+' : ''}${net.toFixed(0)} BTC — ${signal}`)
    if (snap.exchangeInflow != null && snap.exchangeOutflow != null) {
      lines.push(`  Inflow: ${snap.exchangeInflow.toFixed(0)} BTC | Outflow: ${snap.exchangeOutflow.toFixed(0)} BTC`)
    }
  }

  if (snap.hashRate != null && snap.hashRate > 0) {
    // CoinMetrics returns HashRate in TH/s — convert to EH/s (1 EH = 1,000,000 TH)
    const eh = snap.hashRate > 1e15
      ? (snap.hashRate / 1e18).toFixed(2)  // H/s path (fallback)
      : snap.hashRate > 1e5
      ? (snap.hashRate / 1e6).toFixed(2)   // TH/s → EH/s
      : snap.hashRate.toFixed(2)           // already EH/s
    lines.push(`Mean Hash Rate: ${eh} EH/s — network security`)
  }

  if (snap.activeAddresses != null) {
    lines.push(`Active Addresses (24h): ${snap.activeAddresses.toLocaleString()}`)
  }

  if (lines.length === 0) return ''

  const date = snap.asOf ? ` (as of ${snap.asOf.split('T')[0]})` : ''
  return `LIVE ON-CHAIN DATA — Bitcoin (CoinMetrics Community)${date}:\n${lines.join('\n')}`
}
