import { createServerSupabaseClient } from '@/lib/supabase'

function verifyOwner(request: Request) {
  const auth = request.headers.get('x-owner-password')
  const correct = process.env.OWNER_PASSWORD ?? 'council2024'
  return auth === correct
}

// GET /api/owner/users?email=foo@bar.com — search user by email
export async function GET(request: Request) {
  if (!verifyOwner(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')?.trim().toLowerCase()
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })

  const supabase = createServerSupabaseClient()

  // Look up auth user by email via admin API
  const { data: usersData, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const authUser = usersData.users.find(u => u.email?.toLowerCase() === email)
  if (!authUser) return Response.json({ error: 'User not found' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, stripe_customer_id, display_name, created_at')
    .eq('id', authUser.id)
    .single()

  return Response.json({
    id: authUser.id,
    email: authUser.email,
    created_at: authUser.created_at,
    tier: profile?.tier ?? 'free',
    stripe_customer_id: profile?.stripe_customer_id ?? null,
    display_name: profile?.display_name ?? null,
    admin_granted: !profile?.stripe_customer_id && (profile?.tier === 'trader' || profile?.tier === 'pro'),
  })
}

// PATCH /api/owner/users — grant a user a tier
export async function PATCH(request: Request) {
  if (!verifyOwner(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { user_id, tier } = await request.json()
  if (!user_id || !['free', 'trader', 'pro'].includes(tier)) {
    return Response.json({ error: 'user_id and valid tier required' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  // Upsert profile — clear stripe_customer_id so this is identifiable as admin-granted
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user_id, tier, stripe_customer_id: null }, { onConflict: 'id' })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true, user_id, tier })
}

// DELETE /api/owner/users — permanently delete a user account
export async function DELETE(request: Request) {
  if (!verifyOwner(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { user_id } = await request.json()
  if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 })

  const supabase = createServerSupabaseClient()

  // Delete from auth (cascades to profiles via foreign key)
  const { error } = await supabase.auth.admin.deleteUser(user_id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
