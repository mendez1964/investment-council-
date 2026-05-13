// EOD cron — runs at 4:30 PM ET (Mon–Fri) via cron-job.org
// Fires end-of-day recap emails after market close

function verifyCron(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === (process.env.CRON_SECRET ?? 'ic-cron-2024')
}

const INTERNAL = `http://localhost:${process.env.PORT ?? 3000}`

async function callInternal(path: string, method: string, secret: string) {
  const res = await fetch(`${INTERNAL}${path}`, {
    method,
    headers: { 'x-cron-secret': secret, 'Content-Type': 'application/json' },
  })
  return res.json().catch(() => ({ status: res.status }))
}

async function runJobs(secret: string) {
  console.log('[cron/eod] starting jobs...')

  try {
    const res = await callInternal('/api/email/send/eod-recap', 'POST', secret)
    console.log('[cron/eod] email_eod:', JSON.stringify(res))
  } catch (e) { console.error('[cron/eod] email_eod error:', e) }

  console.log('[cron/eod] all jobs done:', new Date().toISOString())
}

export async function POST(request: Request) {
  if (!verifyCron(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const secret = request.headers.get('x-cron-secret') ?? 'ic-cron-2024'

  runJobs(secret).catch(e => console.error('[cron/eod] fatal:', e))

  return Response.json({ ok: true, status: 'started', time: new Date().toISOString() })
}
