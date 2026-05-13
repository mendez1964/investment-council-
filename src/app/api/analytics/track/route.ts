import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { event_type, page, feature, metadata, session_id, duration_ms } = body

    if (!event_type) return Response.json({ ok: false }, { status: 400 })

    const supabase = createServerSupabaseClient()
    await supabase.from('analytics_events').insert({
      event_type,
      page: page ?? null,
      feature: feature ?? null,
      metadata: metadata ?? null,
      session_id: session_id ?? null,
      duration_ms: duration_ms ?? null,
    })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 500 })
  }
}
