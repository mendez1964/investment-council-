import { createServerSupabaseClient } from '@/lib/supabase'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { rating, picks_helpful, ai_trustworthy, easy_to_use, saves_time,
            would_use_daily, top_feature, improve, would_recommend, email } = body

    if (!rating || rating < 1 || rating > 5) {
      return Response.json({ error: 'Rating required (1-5)' }, { status: 400 })
    }

    // Get user if logged in (optional)
    let userId: string | null = null
    try {
      const authClient = createServerSupabaseClientAuth()
      const { data: { user } } = await authClient.auth.getUser()
      if (user) userId = user.id
    } catch {}

    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('reviews').insert({
      user_id: userId,
      email: email?.trim() || null,
      rating,
      picks_helpful,
      ai_trustworthy,
      easy_to_use,
      saves_time,
      would_use_daily,
      top_feature,
      improve: improve?.trim() || null,
      would_recommend,
    })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
