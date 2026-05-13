import { getCompanyNews } from '@/lib/finnhub'

export const dynamic = 'force-dynamic'

interface RSSFeed { url: string; source: string; category: string }

const FEEDS: RSSFeed[] = [
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',               source: 'CNBC',        category: 'general' },
  { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html',                source: 'CNBC Markets', category: 'general' },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',          source: 'MarketWatch', category: 'general' },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_marketpulse',         source: 'MarketWatch', category: 'general' },
  { url: 'https://www.cnbc.com/id/10000115/device/rss/rss.html',                source: 'CNBC Crypto', category: 'crypto' },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_realestate',          source: 'MarketWatch', category: 'forex' },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_merger',              source: 'MarketWatch', category: 'merger' },
]

function extractCDATA(text: string): string {
  const m = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  return m ? m[1].trim() : text.trim()
}

function parseRSS(xml: string, source: string): any[] {
  const items: any[] = []
  const itemMatches = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g))
  let id = Date.now()
  for (const match of itemMatches) {
    const block = match[1]
    const title = extractCDATA((block.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1] ?? '')
    const link = ((block.match(/<link>([\s\S]*?)<\/link>/) ?? []) [1] ?? '').trim()
      || extractCDATA((block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/) ?? [])[1] ?? '')
    const pubDate = ((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) ?? [])[1] ?? '').trim()
    const summary = extractCDATA((block.match(/<description>([\s\S]*?)<\/description>/) ?? [])[1] ?? '')
      .replace(/<[^>]+>/g, '').slice(0, 300)
    const datetime = pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000)
    if (title && link) {
      items.push({ id: id++, headline: title, summary, source, url: link, datetime, category: 'general' })
    }
  }
  return items
}

async function fetchRSS(feed: RSSFeed): Promise<any[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InvestmentCouncil/1.0)', 'Accept': 'application/rss+xml, application/xml, text/xml' },
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseRSS(xml, feed.source).map(a => ({ ...a, category: feed.category }))
  } catch {
    return []
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tickers = searchParams.get('tickers')?.split(',').filter(Boolean) ?? []
    const category = searchParams.get('category') ?? 'general'

    if (tickers.length > 0) {
      const results = await Promise.allSettled(
        tickers.slice(0, 8).map(async (ticker, i) => {
          await new Promise(r => setTimeout(r, i * 120))
          const data = await getCompanyNews(ticker)
          return (Array.isArray(data) ? data : []).slice(0, 5).map((a: any) => ({ ...a, ticker: ticker.toUpperCase() }))
        })
      )
      const articles = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
      articles.sort((a: any, b: any) => b.datetime - a.datetime)
      return Response.json(articles.slice(0, 60))
    }

    // Fetch from RSS feeds matching the requested category
    const targetFeeds = category === 'general'
      ? FEEDS.filter(f => f.category === 'general')
      : FEEDS.filter(f => f.category === category)

    const feedResults = await Promise.allSettled(targetFeeds.map(fetchRSS))
    const all = feedResults.flatMap(r => r.status === 'fulfilled' ? r.value : [])

    // Deduplicate by headline
    const seen = new Set<string>()
    const unique = all.filter(a => {
      const key = a.headline.slice(0, 60)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    unique.sort((a, b) => b.datetime - a.datetime)
    return Response.json(unique.slice(0, 60))
  } catch (err) {
    console.error('[news] error:', err)
    return Response.json([])
  }
}
