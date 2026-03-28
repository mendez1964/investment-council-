import { createServerSupabaseClient } from '@/lib/supabase'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I, O, 0, 1

function generateCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const supabase = createServerSupabaseClient()

  const { data: existing } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('user_id', userId)
    .single()

  if (existing?.code) return existing.code

  for (let i = 0; i < 10; i++) {
    const code = generateCode()
    const { error } = await supabase
      .from('referral_codes')
      .insert({ user_id: userId, code })
    if (!error) return code
  }

  throw new Error('Failed to generate unique referral code')
}

export async function getReferrerByCode(code: string): Promise<string | null> {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('referral_codes')
    .select('user_id')
    .eq('code', code.toUpperCase())
    .single()
  return data?.user_id ?? null
}

export async function getReferralStats(userId: string) {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('referrals')
    .select('status')
    .eq('referrer_id', userId)

  const all = data ?? []
  return {
    total:     all.length,
    pending:   all.filter(r => r.status === 'pending').length,
    converted: all.filter(r => r.status === 'converted' || r.status === 'paid').length,
  }
}
