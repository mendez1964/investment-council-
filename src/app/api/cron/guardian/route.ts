// Guardian cron — runs at 9:00 AM ET daily via cron-job.org
// Triggers the IC Market Guardian news analysis engine

function verifyCron(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === (process.env.CRON_SECRET ?? 'ic-cron-2024')
}

const INTERNAL = `http://localhost:${process.env.PORT ?? 3000}`

async function runGuardian(secret: string) {
  console.log('[cron/guardian] starting market guardian analysis...')
  try {
    const res = await fetch(`${INTERNAL}/api/guardian/analyze`, {
      method: 'POST',
      headers: { 'x-cron-secret': secret, 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    console.log('[cron/guardian] result:', JSON.stringify(data))
  } catch (e) {
    console.error('[cron/guardian] error:', e)
  }
  console.log('[cron/guardian] done:', new Date().toISOString())
}

export async function POST(request: Request) {
  if (!verifyCron(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const secret = request.headers.get('x-cron-secret') ?? 'ic-cron-2024'

  runGuardian(secret).catch(e => console.error('[cron/guardian] fatal:', e))

  return Response.json({ ok: true, status: 'started', time: new Date().toISOString() })
}
