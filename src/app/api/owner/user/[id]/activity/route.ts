// GET /api/owner/user/[id]/activity
// Returns per-user activity: recent events, page breakdown, feature breakdown

import { createServerSupabaseClient } from '@/lib/supabase'

function verifyOwner(request: Request) {
  const auth = request.headers.get('x-owner-password')
  const correct = process.env.OWNER_PASSWORD ?? 'council2024'
  return auth === correct
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!verifyOwner(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = params.id
  const supabase = createServerSupabaseClient()

  const [profileResult, eventsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, tier, trial_ends_at, last_active_at, created_at')
      .eq('id', userId)
      .single(),
    supabase
      .from('analytics_events')
      .select('event_type, page, feature, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const profile = profileResult.data
  const events = eventsResult.data ?? []

  // Page breakdown — count views per page
  const pageCounts: Record<string, number> = {}
  for (const e of events) {
    if (e.event_type === 'page_view' && e.page) {
      pageCounts[e.page] = (pageCounts[e.page] ?? 0) + 1
    }
  }
  const pageBreakdown = Object.entries(pageCounts)
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  // Feature breakdown
  const featureCounts: Record<string, number> = {}
  for (const e of events) {
    if (e.event_type === 'feature_used' && e.feature) {
      featureCounts[e.feature] = (featureCounts[e.feature] ?? 0) + 1
    }
  }
  const featureBreakdown = Object.entries(featureCounts)
    .map(([feature, count]) => ({ feature, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const firstSeen = events.length > 0 ? events[events.length - 1].created_at : null
  const lastSeen  = events.length > 0 ? events[0].created_at : null

  return Response.json({
    profile,
    recentEvents: events.slice(0, 50),
    pageBreakdown,
    featureBreakdown,
    totalEvents: events.length,
    firstSeen,
    lastSeen,
  })
}
