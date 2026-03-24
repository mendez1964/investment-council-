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

async function runJobs(secret: string) {
  console.log('[cron/morning] starting jobs...')

  try {
    const res = await fetch(`${INTERNAL}/api/ai-picks/options?refresh=true`, { headers: { 'x-cron-secret': secret } })
    console.log('[cron/morning] options_refresh:', res.status)
  } catch (e) { console.error('[cron/morning] options_refresh error:', e) }

  try {
    const res = await fetch(`${INTERNAL}/api/ai-picks?refresh=true`, { headers: { 'x-cron-secret': secret } })
    console.log('[cron/morning] picks_refresh:', res.status)
  } catch (e) { console.error('[cron/morning] picks_refresh error:', e) }

  try {
    const res = await callInternal('/api/email/send/morning-briefing', 'POST', secret)
    console.log('[cron/morning] email_briefing:', JSON.stringify(res))
  } catch (e) { console.error('[cron/morning] email_briefing error:', e) }

  try {
    const res = await callInternal('/api/email/send/daily-picks', 'POST', secret)
    console.log('[cron/morning] email_picks:', JSON.stringify(res))
  } catch (e) { console.error('[cron/morning] email_picks error:', e) }

  try {
    const res = await callInternal('/api/email/send/options-trades', 'POST', secret)
    console.log('[cron/morning] email_options:', JSON.stringify(res))
  } catch (e) { console.error('[cron/morning] email_options error:', e) }

  try {
    const res = await callInternal('/api/war/generate', 'POST', secret)
    console.log('[cron/morning] war_generate:', JSON.stringify(res))
  } catch (e) { console.error('[cron/morning] war_generate error:', e) }

  console.log('[cron/morning] all jobs done:', new Date().toISOString())
}

export async function POST(request: Request) {
  if (!verifyCron(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const secret = request.headers.get('x-cron-secret') ?? 'ic-cron-2024'

  // Respond immediately — Railway keeps the process alive so jobs finish in background
  runJobs(secret).catch(e => console.error('[cron/morning] fatal:', e))

  return Response.json({ ok: true, status: 'started', time: new Date().toISOString() })
}
