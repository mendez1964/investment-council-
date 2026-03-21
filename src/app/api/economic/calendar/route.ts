export const revalidate = 3600

export async function GET() {
  try {
    // Fetch this week + next week from ForexFactory (free, no key needed)
    const [thisWeek, nextWeek] = await Promise.allSettled([
      fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', { next: { revalidate: 3600 } }),
      fetch('https://nfs.faireconomy.media/ff_calendar_nextweek.json', { next: { revalidate: 3600 } }),
    ])

    const results: any[] = []

    for (const r of [thisWeek, nextWeek]) {
      if (r.status === 'fulfilled' && r.value.ok) {
        const data = await r.value.json()
        if (Array.isArray(data)) results.push(...data)
      }
    }

    // Filter to USD events only, sort by date
    const usdEvents = results
      .filter(e => e.country === 'USD')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(e => ({
        event: e.title,
        country: 'US',
        date: e.date.split('T')[0],
        time: e.date,
        impact: (e.impact ?? '').toLowerCase(),
        actual: e.actual || null,
        previous: e.previous || null,
        estimate: e.forecast || null,
        unit: '',
      }))

    return Response.json(usdEvents)
  } catch {
    return Response.json([])
  }
}
