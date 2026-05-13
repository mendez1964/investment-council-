import { createServerSupabaseClient } from '@/lib/supabase'

function verifyOwner(request: Request) {
  const auth = request.headers.get('x-owner-password')
  const correct = process.env.OWNER_PASSWORD ?? 'council2024'
  return auth === correct
}

// GET /api/owner/affiliates — all referral activity
export async function GET(request: Request) {
  if (!verifyOwner(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerSupabaseClient()

  const { data: referrals } = await supabase
    .from('referrals')
    .select('referrer_id, referred_user_id, code, status, reward_type, commission_amount, converted_at, paid_at, created_at')
    .order('created_at', { ascending: false })

  const { data: codes } = await supabase
    .from('referral_codes')
    .select('user_id, code, created_at')

  // Aggregate per referrer
  const referrerMap: Record<string, { code: string; total: number; converted: number; paid: number; pending_credit: number }> = {}

  for (const code of codes ?? []) {
    referrerMap[code.user_id] = { code: code.code, total: 0, converted: 0, paid: 0, pending_credit: 0 }
  }

  for (const r of referrals ?? []) {
    if (!referrerMap[r.referrer_id]) continue
    referrerMap[r.referrer_id].total++
    if (r.status === 'converted') referrerMap[r.referrer_id].converted++
    if (r.status === 'paid')      referrerMap[r.referrer_id].paid++
  }

  // Attach pending credits from profiles
  const referrerIds = Object.keys(referrerMap)
  if (referrerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, referral_credit_months')
      .in('id', referrerIds)
    for (const p of profiles ?? []) {
      if (referrerMap[p.id]) referrerMap[p.id].pending_credit = p.referral_credit_months ?? 0
    }
  }

  // Attach emails via auth admin
  const { data: usersData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailMap: Record<string, string> = {}
  for (const u of usersData?.users ?? []) emailMap[u.id] = u.email ?? ''

  const affiliates = Object.entries(referrerMap).map(([userId, stats]) => ({
    user_id: userId,
    email: emailMap[userId] ?? 'unknown',
    ...stats,
  })).sort((a, b) => b.converted - a.converted)

  // Enrich referrals with emails for both parties
  const enrichedReferrals = (referrals ?? []).map(r => ({
    ...r,
    referrer_email: emailMap[r.referrer_id] ?? 'unknown',
    referred_email: r.referred_user_id ? (emailMap[r.referred_user_id] ?? 'unknown') : null,
  }))

  return Response.json({
    affiliates,
    referrals: enrichedReferrals,
  })
}

// PATCH /api/owner/affiliates — mark a referral as paid
export async function PATCH(request: Request) {
  if (!verifyOwner(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { referral_id } = await request.json()
  if (!referral_id) return Response.json({ error: 'referral_id required' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('referrals')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', referral_id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
