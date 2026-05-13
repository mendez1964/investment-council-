import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

export const dynamic = 'force-dynamic'

// GET — fetch today's uncleared alerts for the logged-in user
export async function GET() {
  const supabase = createServerSupabaseClientAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ alerts: [], unread: 0 })

  const { data: alerts } = await supabase
    .from('guardian_alerts')
    .select('*')
    .eq('user_id', user.id)
    .is('cleared_at', null)
    .order('impact_level', { ascending: true }) // high sorts before medium/low alphabetically — we sort in UI
    .order('created_at', { ascending: false })
    .limit(50)

  const sorted = (alerts ?? []).sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return (order[a.impact_level as keyof typeof order] ?? 2) - (order[b.impact_level as keyof typeof order] ?? 2)
  })

  return Response.json({ alerts: sorted, unread: sorted.length })
}

// PATCH — clear one alert (by id) or all alerts (clear_all: true)
export async function PATCH(request: Request) {
  const supabase = createServerSupabaseClientAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const now = new Date().toISOString()

  if (body.clear_all) {
    await supabase.from('guardian_alerts')
      .update({ cleared_at: now })
      .eq('user_id', user.id)
      .is('cleared_at', null)
  } else if (body.id) {
    await supabase.from('guardian_alerts')
      .update({ cleared_at: now })
      .eq('id', body.id)
      .eq('user_id', user.id)
  }

  return Response.json({ ok: true })
}
