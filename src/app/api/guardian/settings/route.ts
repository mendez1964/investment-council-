import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

export const dynamic = 'force-dynamic'

// GET — fetch all guardian settings for the logged-in user
export async function GET() {
  const supabase = createServerSupabaseClientAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ settings: [] })

  const { data } = await supabase
    .from('guardian_settings')
    .select('ticker, mode')
    .eq('user_id', user.id)

  return Response.json({ settings: data ?? [] })
}

// POST — upsert mode for a ticker ('smart' | 'everything')
export async function POST(request: Request) {
  const supabase = createServerSupabaseClientAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { ticker, mode } = await request.json()
  if (!ticker || !['smart', 'everything'].includes(mode)) {
    return Response.json({ error: 'Invalid params' }, { status: 400 })
  }

  await supabase.from('guardian_settings').upsert(
    { user_id: user.id, ticker: ticker.toUpperCase(), mode, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,ticker' }
  )

  return Response.json({ ok: true })
}
