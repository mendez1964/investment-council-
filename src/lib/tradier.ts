// Tradier options chain API
// Sandbox base URL (delayed data, free): https://sandbox.tradier.com/v1
// Production base URL (real-time, $10/mo): https://api.tradier.com/v1
// Set TRADIER_API_KEY in env vars — sandbox key works immediately after signup

const BASE_URL = process.env.TRADIER_SANDBOX === 'false'
  ? 'https://api.tradier.com/v1'
  : 'https://sandbox.tradier.com/v1'

const TRADIER_KEY = process.env.TRADIER_API_KEY

function tradierHeaders() {
  return {
    Authorization: `Bearer ${TRADIER_KEY}`,
    Accept: 'application/json',
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OptionContract {
  symbol: string        // OCC symbol e.g. AAPL240119C00150000
  strike: number
  expiration_date: string
  option_type: 'call' | 'put'
  bid: number
  ask: number
  last: number
  volume: number
  open_interest: number
  implied_volatility: number | null
  delta: number | null
  gamma: number | null
  theta: number | null
}

export interface OptionsChain {
  expiry: string
  underlying_price: number | null
  calls: OptionContract[]
  puts: OptionContract[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function midPrice(contract: OptionContract): number {
  if (contract.bid > 0 && contract.ask > 0) {
    return parseFloat(((contract.bid + contract.ask) / 2).toFixed(2))
  }
  return contract.last ?? 0
}

// Find the contract closest to a target strike
export function nearestStrike(contracts: OptionContract[], targetStrike: number): OptionContract | null {
  if (!contracts.length) return null
  return contracts.reduce((best, c) =>
    Math.abs(c.strike - targetStrike) < Math.abs(best.strike - targetStrike) ? c : best
  )
}

// Standard strike increment by price (for ATM calculation)
function strikeIncrement(price: number): number {
  if (price < 25) return 0.5
  if (price < 50) return 1
  if (price < 100) return 2
  if (price < 200) return 2.5
  if (price < 500) return 5
  return 10
}

// Round price to nearest valid strike
export function roundToATM(price: number): number {
  const inc = strikeIncrement(price)
  return Math.round(price / inc) * inc
}

// ── API calls ─────────────────────────────────────────────────────────────────

// Get all available expiration dates for a ticker
export async function getExpirations(ticker: string): Promise<string[]> {
  if (!TRADIER_KEY) throw new Error('TRADIER_API_KEY not set')

  const res = await fetch(
    `${BASE_URL}/markets/options/expirations?symbol=${ticker}&includeAllRoots=true`,
    { headers: tradierHeaders(), next: { revalidate: 3600 } }
  )
  if (!res.ok) throw new Error(`Tradier expirations ${ticker}: ${res.status}`)

  const data = await res.json()
  const dates: string[] = data?.expirations?.date ?? []
  return dates.sort()
}

// Get the next valid expiry on or after a target date
export function pickExpiry(expirations: string[], targetDate: string): string | null {
  return expirations.find(d => d >= targetDate) ?? expirations[expirations.length - 1] ?? null
}

// Get next 0DTE expiry — same day if available, otherwise next trading day with expiry
export function pickDailyExpiry(expirations: string[], today: string): string | null {
  // Prefer same-day (0DTE)
  if (expirations.includes(today)) return today
  // Otherwise next available date
  return expirations.find(d => d > today) ?? null
}

// Get weekly expiry ~3 weeks out
export function pickWeeklyExpiry(expirations: string[], today: string): string | null {
  const target = new Date(today + 'T12:00:00')
  target.setDate(target.getDate() + 18)
  const targetStr = target.toISOString().split('T')[0]
  return pickExpiry(expirations, targetStr)
}

// Fetch the full options chain for a ticker + expiry
export async function getChain(ticker: string, expiry: string): Promise<OptionsChain> {
  if (!TRADIER_KEY) throw new Error('TRADIER_API_KEY not set')

  const res = await fetch(
    `${BASE_URL}/markets/options/chains?symbol=${ticker}&expiration=${expiry}&greeks=true`,
    { headers: tradierHeaders(), next: { revalidate: 900 } } // cache 15 min
  )
  if (!res.ok) throw new Error(`Tradier chain ${ticker} ${expiry}: ${res.status}`)

  const data = await res.json()
  const options: any[] = data?.options?.option ?? []

  const calls: OptionContract[] = []
  const puts: OptionContract[] = []

  for (const o of options) {
    const contract: OptionContract = {
      symbol: o.symbol,
      strike: parseFloat(o.strike),
      expiration_date: o.expiration_date,
      option_type: o.option_type,
      bid: parseFloat(o.bid) || 0,
      ask: parseFloat(o.ask) || 0,
      last: parseFloat(o.last) || 0,
      volume: parseInt(o.volume) || 0,
      open_interest: parseInt(o.open_interest) || 0,
      implied_volatility: o.greeks?.mid_iv ? parseFloat(o.greeks.mid_iv) : null,
      delta: o.greeks?.delta ? parseFloat(o.greeks.delta) : null,
      gamma: o.greeks?.gamma ? parseFloat(o.greeks.gamma) : null,
      theta: o.greeks?.theta ? parseFloat(o.greeks.theta) : null,
    }
    if (o.option_type === 'call') calls.push(contract)
    else puts.push(contract)
  }

  return { expiry, underlying_price: null, calls, puts }
}

// ── Main helper used by options picks route ───────────────────────────────────

// Given a ticker, direction, confidence, and duration — return the best contract
export async function getBestContract(
  ticker: string,
  optionType: 'call' | 'put',
  confidence: number,
  duration: 'daily' | 'weekly',
  underlyingPrice: number,
  today: string
): Promise<{
  expiry: string
  strike: number
  mid: number
  iv: number | null
  openInterest: number
  delta: number | null
  contract: OptionContract
} | null> {
  try {
    const expirations = await getExpirations(ticker)
    if (!expirations.length) return null

    const expiry = duration === 'daily'
      ? pickDailyExpiry(expirations, today)
      : pickWeeklyExpiry(expirations, today)

    if (!expiry) return null

    const chain = await getChain(ticker, expiry)
    const contracts = optionType === 'call' ? chain.calls : chain.puts
    if (!contracts.length) return null

    // Determine target strike based on confidence
    // High confidence = ATM, lower = OTM
    const inc = strikeIncrement(underlyingPrice)
    const atm = roundToATM(underlyingPrice)
    let strikesOTM = confidence >= 9 ? 0 : confidence >= 7 ? 1 : confidence >= 5 ? 2 : 3
    if (duration === 'weekly') strikesOTM = Math.max(0, strikesOTM - 1)

    const targetStrike = optionType === 'call'
      ? atm + (inc * strikesOTM)
      : atm - (inc * strikesOTM)

    const best = nearestStrike(contracts, targetStrike)
    if (!best) return null

    // Filter out illiquid contracts (0 bid or 0 open interest)
    if (best.bid === 0 && best.last === 0) return null

    return {
      expiry,
      strike: best.strike,
      mid: midPrice(best),
      iv: best.implied_volatility,
      openInterest: best.open_interest,
      delta: best.delta,
      contract: best,
    }
  } catch (err) {
    console.error(`[tradier] getBestContract ${ticker} ${optionType} ${duration}:`, (err as Error).message)
    return null
  }
}

// IV rank helper — compares current IV to 52-week range
// Returns 0-100 where 100 = highest IV of the year (expensive), 0 = cheapest
export function calcIVRank(currentIV: number, low52: number, high52: number): number {
  if (high52 <= low52) return 50
  return Math.round(((currentIV - low52) / (high52 - low52)) * 100)
}
