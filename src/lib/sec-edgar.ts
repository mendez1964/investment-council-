// SEC EDGAR — company filings and disclosures
// No API key required — EDGAR is a free public database
// SEC requires a descriptive User-Agent identifying your application
// Docs: https://www.sec.gov/developer

const EDGAR_SUBMISSIONS = 'https://data.sec.gov/submissions'
const EDGAR_SEARCH = 'https://efts.sec.gov/LATEST/search-index'
const TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json'

// SEC requires this header on all requests
const HEADERS = {
  'User-Agent': 'Investment Council investment-council-app@example.com',
  'Accept-Encoding': 'gzip, deflate',
}

// Cache the ticker→CIK mapping in memory (it's a large file, ~1MB)
let tickerCIKCache: Record<string, string> | null = null

async function loadTickerCIKMap(): Promise<Record<string, string>> {
  if (tickerCIKCache) return tickerCIKCache
  const res = await fetch(TICKERS_URL, { headers: HEADERS, next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`Failed to load SEC ticker map: ${res.status}`)
  const data = await res.json()
  const map: Record<string, string> = {}
  for (const entry of Object.values(data) as any[]) {
    // CIK must be zero-padded to 10 digits for API calls
    map[entry.ticker.toUpperCase()] = String(entry.cik_str).padStart(10, '0')
  }
  tickerCIKCache = map
  return map
}

// Convert a stock ticker to its SEC CIK number
async function tickerToCIK(ticker: string): Promise<string> {
  const map = await loadTickerCIKMap()
  const cik = map[ticker.toUpperCase()]
  if (!cik) throw new Error(`No CIK found for ticker "${ticker}" — check the ticker symbol`)
  return cik
}

// Get filing history for a company using its CIK
async function getCompanyFilings(cik: string) {
  const url = `${EDGAR_SUBMISSIONS}/CIK${cik}.json`
  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`Failed to fetch EDGAR filings for CIK ${cik}: ${res.status}`)
  return res.json()
}

// Build a URL to view the actual filing on EDGAR
function buildFilingUrl(cik: string, accessionNumber: string): string {
  const accNoClean = accessionNumber.replace(/-/g, '')
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=&dateb=&owner=include&count=40`
}

// Extract recent filings of a specific type from a company's filing history
function extractFilingsByType(filingData: any, formTypes: string[], limit = 5): any[] {
  const recent = filingData.filings?.recent
  if (!recent) return []
  const results: any[] = []
  for (let i = 0; i < recent.form.length && results.length < limit; i++) {
    if (formTypes.includes(recent.form[i])) {
      const accNo = recent.accessionNumber[i]
      results.push({
        formType: recent.form[i],
        filingDate: recent.filingDate[i],
        reportDate: recent.reportDate[i],
        description: recent.primaryDocument[i],
        accessionNumber: accNo,
        url: `https://www.sec.gov/Archives/edgar/data/${parseInt(filingData.cik)}/${accNo.replace(/-/g, '')}/${recent.primaryDocument[i]}`,
        indexUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${filingData.cik}&type=${recent.form[i]}&dateb=&owner=include&count=10`,
      })
    }
  }
  return results
}

// Get the latest 10-K (annual report) and 10-Q (quarterly report) filings
export async function getLatestFilings(ticker: string) {
  const cik = await tickerToCIK(ticker)
  const filingData = await getCompanyFilings(cik)
  return {
    ticker: ticker.toUpperCase(),
    companyName: filingData.name,
    cik,
    annualReports: extractFilingsByType(filingData, ['10-K'], 3),
    quarterlyReports: extractFilingsByType(filingData, ['10-Q'], 5),
  }
}

// Get recent Form 4 insider transaction filings (when insiders buy or sell stock)
export async function getInsiderTransactions(ticker: string) {
  const cik = await tickerToCIK(ticker)
  const filingData = await getCompanyFilings(cik)
  return {
    ticker: ticker.toUpperCase(),
    companyName: filingData.name,
    cik,
    insiderTransactions: extractFilingsByType(filingData, ['4', '4/A'], 15),
  }
}

// Get 13F filings — hedge funds with >$100M AUM must disclose their holdings quarterly
export async function get13FHoldings(managerTicker: string) {
  // 13F filers are often investment managers, not always listed companies
  // We search by name or CIK if available
  try {
    const cik = await tickerToCIK(managerTicker)
    const filingData = await getCompanyFilings(cik)
    return {
      ticker: managerTicker.toUpperCase(),
      entityName: filingData.name,
      cik,
      thirteenF: extractFilingsByType(filingData, ['13F-HR', '13F-HR/A'], 5),
    }
  } catch {
    // Fall back to EDGAR text search for 13F filers not in ticker list
    return searchFilings(managerTicker, '13F-HR', 5)
  }
}

// Get recent 8-K filings — material events (earnings, M&A, leadership changes, etc.)
export async function get8KEvents(ticker: string) {
  const cik = await tickerToCIK(ticker)
  const filingData = await getCompanyFilings(cik)
  return {
    ticker: ticker.toUpperCase(),
    companyName: filingData.name,
    cik,
    materialEvents: extractFilingsByType(filingData, ['8-K', '8-K/A'], 10),
  }
}

// Search EDGAR full-text search by company name or ticker
// Returns mixed filing types — useful for discovery
export async function searchFilings(query: string, formType = '', limit = 10) {
  const formFilter = formType ? `&forms=${encodeURIComponent(formType)}` : ''
  const url = `${EDGAR_SEARCH}?q=${encodeURIComponent(`"${query}"`)}&dateRange=custom&startdt=2022-01-01&enddt=2026-12-31${formFilter}`
  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`EDGAR search failed: ${res.status}`)
  const data = await res.json()
  const hits = data.hits?.hits ?? []
  return {
    query,
    totalResults: data.hits?.total?.value ?? 0,
    results: hits.slice(0, limit).map((hit: any) => ({
      formType: hit._source?.form_type,
      filingDate: hit._source?.file_date,
      companyName: hit._source?.display_names?.[0] ?? hit._source?.entity_name,
      ticker: hit._source?.ticker,
      description: hit._source?.period_of_report,
      url: `https://www.sec.gov/Archives/edgar/data/${hit._source?.entity_id}/${(hit._source?.accession_no ?? '').replace(/-/g, '')}/${hit._source?.file_name ?? ''}`,
    })),
  }
}
