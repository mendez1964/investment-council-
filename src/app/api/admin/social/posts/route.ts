// List and manage social posts

import { createServerSupabaseClient } from '@/lib/supabase'

function verifyOwner(request: Request): boolean {
  const pw = request.headers.get('x-owner-password')
  return pw === (process.env.OWNER_PASSWORD ?? 'council2024')
}

export async function GET(request: Request) {
  if (!verifyOwner(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // pending | approved | scheduled | posted | failed | all
  const platform = searchParams.get('platform')
  const limit = parseInt(searchParams.get('limit') ?? '50')

  try {
    const supabase = createServerSupabaseClient()

    let query = supabase
      .from('social_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (platform) {
      query = query.eq('platform', platform)
    }

    const { data, error } = await query

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Summary counts
    const { data: counts } = await supabase
      .from('social_posts')
      .select('status')

    const summary = { pending: 0, approved: 0, scheduled: 0, posted: 0, failed: 0 }
    for (const row of counts ?? []) {
      const s = row.status as keyof typeof summary
      if (s in summary) summary[s]++
    }

    return Response.json({ posts: data ?? [], summary })

  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
