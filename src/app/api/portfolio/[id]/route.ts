// PATCH  — update holding (shares, avg_cost, notes)
// DELETE — remove holding

import { createServerSupabaseClient } from '@/lib/supabase'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { shares, avg_cost, notes, company_name, sector } = body

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (shares !== undefined) updates.shares = Number(shares)
    if (avg_cost !== undefined) updates.avg_cost = Number(avg_cost)
    if (notes !== undefined) updates.notes = notes
    if (company_name !== undefined) updates.company_name = company_name
    if (sector !== undefined) updates.sector = sector

    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('portfolio_holdings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from('portfolio_holdings')
      .delete()
      .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
