import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('watchlist_categories')
    .select('*')
    .order('name')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const body = await request.json()
  const { name, color } = body
  if (!name) return Response.json({ error: 'name required' }, { status: 400 })

  const { data, error } = await supabase
    .from('watchlist_categories')
    .insert({ name, color: color || '#2d6a4f' })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
