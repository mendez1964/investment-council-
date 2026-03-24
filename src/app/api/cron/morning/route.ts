// Morning cron — runs at 7:30 AM ET (Mon–Fri) via cron-job.org
// Regenerates daily options picks, then fires all morning emails

function verifyCron(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === (process.env.CRON_SECRET ?? 'ic-cron-2024')
}

// Use localhost for internal calls on Railway — avoids self-referencing via public URL
const INTERNAL = `http://localhost:${process.env.PORT ?? 3000}`

async function callInternal(path: string, method: string, secret: string) {
  const res = await fetch(`${INTERNAL}${path}`, {
    method,
    headers: { 'x-cron-secret': secret, 'Content-Type': 'application/json' },
  })
  return res.json().catch(() => ({ status: res.status }))
}

export async function POST(request: Request) {
  if (!verifyCron(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const secret = request.headers.get('x-cron-secret') ?? 'ic-cron-2024'
  const results: Record<string, any> = {}

  // 1. Regenerate today's options picks with fresh pre-market data
  try {
    const res = await fetch(`${INTERNAL}/api/ai-picks/options?refresh=true`, {
      headers: { 'x-cron-secret': secret },
    })
    const data = await res.json()
    results.options_refresh = { picks: data.picks?.length ?? 0 }
  } catch (e) {
    results.options_refresh = { error: String(e) }
  }

  // 2. Regenerate stock + crypto picks
  try {
    const res = await fetch(`${INTERNAL}/api/ai-picks?refresh=true`, {
      headers: { 'x-cron-secret': secret },
    })
    const data = await res.json()
    results.picks_refresh = { picks: data.picks?.length ?? 0 }
  } catch (e) {
    results.picks_refresh = { error: String(e) }
  }

  // 3. Send daily picks email
  try {
    results.email_picks = await callInternal('/api/email/send/daily-picks', 'POST', secret)
  } catch (e) {
    results.email_picks = { error: String(e) }
  }

  // 4. Send options trades email
  try {
    results.email_options = await callInternal('/api/email/send/options-trades', 'POST', secret)
  } catch (e) {
    results.email_options = { error: String(e) }
  }

  console.log('[cron/morning]', JSON.stringify(results))
  return Response.json({ ok: true, time: new Date().toISOString(), results })
}
