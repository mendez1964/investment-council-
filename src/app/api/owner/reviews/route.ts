import { createServerSupabaseClient } from '@/lib/supabase'

function verifyOwner(request: Request) {
  const auth = request.headers.get('x-owner-password')
  const correct = process.env.OWNER_PASSWORD ?? 'council2024'
  return auth === correct
}

export async function GET(request: Request) {
  if (!verifyOwner(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerSupabaseClient()
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })

  const all = reviews ?? []
  const avg = all.length > 0
    ? (all.reduce((s, r) => s + r.rating, 0) / all.length).toFixed(1)
    : null

  const yesRate = (field: string) => {
    const answered = all.filter(r => r[field])
    const yes = answered.filter(r => r[field] === 'Yes').length
    return answered.length > 0 ? Math.round((yes / answered.length) * 100) : null
  }

  return Response.json({
    reviews: all,
    summary: {
      total: all.length,
      avg_rating: avg,
      picks_helpful_yes:   yesRate('picks_helpful'),
      ai_trustworthy_yes:  yesRate('ai_trustworthy'),
      easy_to_use_yes:     yesRate('easy_to_use'),
      saves_time_yes:      yesRate('saves_time'),
      would_use_daily_yes: yesRate('would_use_daily'),
      would_recommend_yes: yesRate('would_recommend'),
    },
  })
}
