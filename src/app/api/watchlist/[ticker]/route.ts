import { createServerSupabaseClient } from '@/lib/supabase'

export async function DELETE(request: Request, { params }: { params: { ticker: string } }) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('watchlist_stocks')
    .delete()
    .eq('ticker', params.ticker.toUpperCase())

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function PATCH(request: Request, { params }: { params: { ticker: string } }) {
  const supabase = createServerSupabaseClient()
  const body = await request.json()

  const { error } = await supabase
    .from('watchlist_stocks')
    .update(body)
    .eq('ticker', params.ticker.toUpperCase())

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
