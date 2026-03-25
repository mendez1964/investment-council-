export const dynamic = 'force-dynamic'

// Fetches an article URL server-side (bypasses CORS) and returns clean readable text
// Used by the Guardian in-app article reader modal

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) return Response.json({ error: 'url required' }, { status: 400 })

  // Only allow http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return Response.json({ error: 'invalid url' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return Response.json({ error: `fetch failed: ${res.status}`, paywall: res.status === 403 || res.status === 401 }, { status: 200 })

    const html = await res.text()

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : ''

    // Remove scripts, styles, nav, header, footer, aside, ads
    let cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')

    // Try to find the main article body — look for article/main tags first
    const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i)
      || cleaned.match(/<main[\s\S]*?<\/main>/i)
      || cleaned.match(/<div[^>]*(?:article|story|content|body|text)[^>]*>([\s\S]*?)<\/div>/i)

    const body = articleMatch ? articleMatch[0] : cleaned

    // Strip all remaining HTML tags
    const text = body
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const decoded = decodeHtmlEntities(text)

    // Truncate to ~4000 chars to keep the modal readable
    const truncated = decoded.length > 4000 ? decoded.slice(0, 4000) + '\n\n[Article truncated — see source for full text]' : decoded

    // Detect paywall / login wall
    const isPaywall = decoded.length < 300 ||
      /subscribe|sign in|log in|create.{0,20}account|paywall|premium.{0,30}content/i.test(decoded.slice(0, 500))

    return Response.json({ ok: true, title, text: truncated, paywall: isPaywall, url })
  } catch (err: any) {
    return Response.json({ error: err.message ?? 'fetch failed' }, { status: 200 })
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
}
