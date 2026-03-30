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
    .select('id, tier, display_name, trial_ends_at, last_active_at')
    .in('id', userIds)

  const profileMap: Record<string, { tier: string; display_name: string | null; trial_ends_at: string | null; last_active_at: string | null }> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = { tier: p.tier, display_name: p.display_name, trial_ends_at: p.trial_ends_at ?? null, last_active_at: p.last_active_at ?? null }
  }

  const now = Date.now()

  const users = usersData.users
    .map(u => {
      const trialEndsAt = profileMap[u.id]?.trial_ends_at ?? null
      const onTrial = trialEndsAt != null && new Date(trialEndsAt).getTime() > now
      return {
        id: u.id,
        email: u.email ?? '',
        display_name: profileMap[u.id]?.display_name ?? null,
        tier: profileMap[u.id]?.tier ?? 'free',
        trial_ends_at: trialEndsAt,
        on_trial: onTrial,
        last_active_at: profileMap[u.id]?.last_active_at ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      }
    })
    .sort((a, b) => {
      const aTime = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0
      const bTime = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0
      return bTime - aTime
    })

  return Response.json({ users })
}
