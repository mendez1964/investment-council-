import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread') === 'true'
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabase
    .from('alert_history')
    .select('*')
    .order('fired_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.is('read_at', null)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function PATCH(request: Request) {
  // Mark all alerts as read
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('alert_history')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
