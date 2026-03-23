import { createServerSupabaseClient } from '@/lib/supabase'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

export async function GET() {
  try {
    const authClient = createServerSupabaseClientAuth()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, display_name, trial_ends_at')
      .eq('id', user.id)
      .single()

    return Response.json(profile ?? { tier: 'free' })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
