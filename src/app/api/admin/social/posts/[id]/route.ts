// Update or delete a single social post

import { createServerSupabaseClient } from '@/lib/supabase'

function verifyOwner(request: Request): boolean {
  const pw = request.headers.get('x-owner-password')
  return pw === (process.env.OWNER_PASSWORD ?? 'council2024')
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!verifyOwner(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const supabase = createServerSupabaseClient()

    // Only allow updating safe fields
    const allowed = ['post_text', 'status', 'scheduled_at', 'hashtags']
    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    if (Object.keys(update).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('social_posts')
      .update(update)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ok: true, post: data })

  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!verifyOwner(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from('social_posts')
      .delete()
      .eq('id', params.id)

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ok: true })

  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
