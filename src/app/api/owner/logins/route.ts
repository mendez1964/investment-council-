import { createServerSupabaseClient } from '@/lib/supabase'

function verifyOwner(request: Request) {
  const auth = request.headers.get('x-owner-password')
  const correct = process.env.OWNER_PASSWORD ?? 'council2024'
  return auth === correct
}

// GET /api/owner/logins — all users sorted by most recent login
export async function GET(request: Request) {
  if (!verifyOwner(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerSupabaseClient()

  const { data: usersData, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const userIds = usersData.users.map(u => u.id)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, tier, display_name')
    .in('id', userIds)

  const profileMap: Record<string, { tier: string; display_name: string | null }> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = { tier: p.tier, display_name: p.display_name }
  }

  const users = usersData.users
    .map(u => ({
      id: u.id,
      email: u.email ?? '',
      display_name: profileMap[u.id]?.display_name ?? null,
      tier: profileMap[u.id]?.tier ?? 'free',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }))
    .sort((a, b) => {
      const aTime = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0
      const bTime = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0
      return bTime - aTime
    })

  return Response.json({ users })
}
