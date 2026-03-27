// Social publisher cron — runs every 30 minutes
// Finds scheduled posts that are due and publishes them

const INTERNAL = `http://localhost:${process.env.PORT ?? 3000}`

function verifyCron(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === (process.env.CRON_SECRET ?? 'ic-cron-2024')
}

export async function POST(request: Request) {
  if (!verifyCron(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ownerPw = process.env.OWNER_PASSWORD ?? 'council2024'

  try {
    // Get all scheduled posts that are due
    const postsRes = await fetch(`${INTERNAL}/api/admin/social/posts?status=scheduled&limit=20`, {
      headers: { 'x-owner-password': ownerPw },
    })
    const { posts } = await postsRes.json()

    const now = new Date()
    const due = (posts ?? []).filter((p: { scheduled_at: string }) =>
      p.scheduled_at && new Date(p.scheduled_at) <= now
    )

    if (due.length === 0) {
      console.log('[cron/social] no posts due')
      return Response.json({ ok: true, published: 0 })
    }

    console.log(`[cron/social] publishing ${due.length} posts`)

    const results: Array<{ id: string; platform: string; ok: boolean; error?: string }> = []

    for (const post of due) {
      try {
        const res = await fetch(`${INTERNAL}/api/admin/social/publish/${post.id}`, {
          method: 'POST',
          headers: { 'x-owner-password': ownerPw },
        })
        const data = await res.json()
        results.push({ id: post.id, platform: post.platform, ok: res.ok, error: data.error })
      } catch (err) {
        results.push({ id: post.id, platform: post.platform, ok: false, error: String(err) })
      }
    }

    const succeeded = results.filter(r => r.ok).length
    const failed = results.filter(r => !r.ok).length

    console.log(`[cron/social] done — ${succeeded} posted, ${failed} failed`)

    return Response.json({ ok: true, published: succeeded, failed, results })

  } catch (err) {
    console.error('[cron/social]', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
