import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { event_type, page, feature, metadata, session_id, user_id, duration_ms } = body

    if (!event_type) return Response.json({ ok: false }, { status: 400 })

    const supabase = createServerSupabaseClient()

    await Promise.all([
      supabase.from('analytics_events').insert({
        event_type,
        page: page ?? null,
        feature: feature ?? null,
        metadata: metadata ?? null,
        session_id: session_id ?? null,
        user_id: user_id ?? null,
        duration_ms: duration_ms ?? null,
      }),
      user_id
        ? supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', user_id)
        : Promise.resolve(),
    ])

    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 500 })
  }
}
