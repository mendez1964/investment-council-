// Owner Guardian cron — runs every 30 min via cron-job.org
// Only analyzes holdings for the OWNER_USER_ID account
// Set OWNER_USER_ID in Railway env vars (your Supabase user ID)

function verifyCron(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === (process.env.CRON_SECRET ?? 'ic-cron-2024')
}

const INTERNAL = `http://localhost:${process.env.PORT ?? 3000}`

export async function POST(request: Request) {
  if (!verifyCron(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ownerUserId = process.env.OWNER_USER_ID
  if (!ownerUserId) return Response.json({ error: 'OWNER_USER_ID not set' }, { status: 500 })

  const secret = request.headers.get('x-cron-secret') ?? 'ic-cron-2024'

  try {
    const res = await fetch(`${INTERNAL}/api/guardian/analyze`, {
      method: 'POST',
      headers: { 'x-cron-secret': secret, 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_user_id: ownerUserId }),
    })
    const data = await res.json()
    console.log('[cron/guardian-owner] result:', JSON.stringify(data))
    return Response.json({ ok: true, ...data })
  } catch (e: any) {
    console.error('[cron/guardian-owner] error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
