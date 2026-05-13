// FRED (Federal Reserve Economic Data) — macroeconomic indicators
// Provided by the Federal Reserve Bank of St. Louis
// Docs: https://fred.stlouisfed.org/docs/api/fred/

const BASE_URL = 'https://api.stlouisfed.org/fred'

function getKey(): string {
  const key = process.env.FRED_API_KEY
  if (!key) throw new Error('FRED_API_KEY is not set in environment variables')
  return key
}

// Fetch the most recent observation(s) for any FRED data series
async function getObservations(seriesId: string, limit = 1) {
  const url = `${BASE_URL}/series/observations?series_id=${seriesId}&sort_order=desc&limit=${limit}&api_key=${getKey()}&file_type=json`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`FRED request failed for series ${seriesId}: ${res.status}`)
  const data = await res.json()
  if (data.error_message) throw new Error(`FRED error: ${data.error_message}`)
  return data.observations
}

// Current federal funds rate (the key interest rate set by the Fed)
export async function getFedFundsRate() {
  const obs = await getObservations('FEDFUNDS', 1)
  return {
    seriesId: 'FEDFUNDS',
    name: 'Federal Funds Rate',
    value: obs[0]?.value,
    date: obs[0]?.date,
    unit: '% per annum',
  }
}

// Latest CPI inflation reading (Consumer Price Index — tracks cost of living)
export async function getCPIInflation() {
  const [latest, previous] = await getObservations('CPIAUCSL', 2)
  const latestVal = parseFloat(latest?.value)
  const prevVal = parseFloat(previous?.value)
  const yoyChange = prevVal ? (((latestVal - prevVal) / prevVal) * 100).toFixed(2) : null
  return {
    seriesId: 'CPIAUCSL',
    name: 'CPI — All Urban Consumers',
    value: latest?.value,
    date: latest?.date,
    unit: 'Index',
    monthlyChange: yoyChange ? `${yoyChange}%` : null,
  }
}

// 2-year and 10-year Treasury yields, plus the spread between them
// A negative spread (inverted yield curve) historically signals recession risk
export async function getYieldCurve() {
  const [twoYear, tenYear] = await Promise.all([
    getObservations('DGS2', 1),
    getObservations('DGS10', 1),
  ])
  const twoYrVal = parseFloat(twoYear[0]?.value)
  const tenYrVal = parseFloat(tenYear[0]?.value)
  const spread = (!isNaN(twoYrVal) && !isNaN(tenYrVal))
    ? (tenYrVal - twoYrVal).toFixed(2)
    : null
  return {
    twoYear: {
      seriesId: 'DGS2',
      name: '2-Year Treasury Yield',
      value: twoYear[0]?.value,
      date: twoYear[0]?.date,
      unit: '% per annum',
    },
    tenYear: {
      seriesId: 'DGS10',
      name: '10-Year Treasury Yield',
      value: tenYear[0]?.value,
      date: tenYear[0]?.date,
      unit: '% per annum',
    },
    spread: {
      value: spread,
      description: spread
        ? parseFloat(spread) < 0
          ? 'Yield curve is INVERTED (10yr < 2yr) — historically a recession warning signal'
          : 'Yield curve is normal (10yr > 2yr)'
        : null,
    },
  }
}

// Current unemployment rate
export async function getUnemploymentRate() {
  const obs = await getObservations('UNRATE', 1)
  return {
    seriesId: 'UNRATE',
    name: 'Unemployment Rate',
    value: obs[0]?.value,
    date: obs[0]?.date,
    unit: '% of labor force',
  }
}

// Real GDP — last 4 quarters to show trend
export async function getGDPGrowth() {
  const obs = await getObservations('GDPC1', 4)
  const quarters = obs.map((o: any) => ({
    date: o.date,
    value: o.value,
    unit: 'Billions of chained 2017 dollars',
  }))
  // Calculate quarter-over-quarter growth rate
  if (quarters.length >= 2) {
    const latest = parseFloat(quarters[0].value)
    const prior = parseFloat(quarters[1].value)
    const qoqGrowth = prior ? (((latest - prior) / prior) * 100 * 4).toFixed(2) : null // annualized
    return {
      seriesId: 'GDPC1',
      name: 'Real GDP (Chained 2017 Dollars)',
      latestQuarter: quarters[0],
      annualizedGrowthRate: qoqGrowth ? `${qoqGrowth}%` : null,
      recentHistory: quarters,
    }
  }
  return { seriesId: 'GDPC1', name: 'Real GDP', recentHistory: quarters }
}
