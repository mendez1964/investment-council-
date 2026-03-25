// Evening cron — runs at 8:00 PM ET (00:00 UTC) daily, 7 days a week
// Generates crypto picks at the start of the crypto daily candle

function verifyCron(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === (process.env.CRON_SECRET ?? 'ic-cron-2024')
}

const INTERNAL = `http://localhost:${process.env.PORT ?? 3000}`

async function runJobs(secret: string) {
  console.log('[cron/evening] starting EOD evaluation + crypto refresh...')

  // Step 1: Trigger stock pick evaluation (market is now closed, 9h cutoff will catch today's picks)
  try {
    const res = await fetch(`${INTERNAL}/api/ai-picks?type=stocks`, {
      headers: { 'x-cron-secret': secret },
    })
    console.log('[cron/evening] stock_evaluate:', res.status)
  } catch (e) { console.error('[cron/evening] stock_evaluate error:', e) }

  // Step 2: Refresh + evaluate crypto picks for the new daily candle
  try {
    const res = await fetch(`${INTERNAL}/api/ai-picks?refresh=true&type=crypto`, {
      headers: { 'x-cron-secret': secret },
    })
    console.log('[cron/evening] crypto_refresh:', res.status)
  } catch (e) { console.error('[cron/evening] crypto_refresh error:', e) }

  console.log('[cron/evening] done:', new Date().toISOString())
}

export async function POST(request: Request) {
  if (!verifyCron(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const secret = request.headers.get('x-cron-secret') ?? 'ic-cron-2024'

  runJobs(secret).catch(e => console.error('[cron/evening] fatal:', e))

  return Response.json({ ok: true, status: 'started', time: new Date().toISOString() })
}
