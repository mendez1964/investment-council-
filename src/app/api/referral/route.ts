import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'
import { getOrCreateReferralCode, getReferralStats } from '@/lib/referral'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const authClient = createServerSupabaseClientAuth()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const [code, stats] = await Promise.all([
      getOrCreateReferralCode(user.id),
      getReferralStats(user.id),
    ])

    return Response.json({ code, stats })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
