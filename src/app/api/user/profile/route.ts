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
      .select('tier, display_name, trial_ends_at, locale')
      .eq('id', user.id)
      .single()

    return Response.json(profile ?? { tier: 'free' })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const authClient = createServerSupabaseClientAuth()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const { locale } = body
    const validLocales = ['en', 'es', 'pt', 'fr']
    if (!locale || !validLocales.includes(locale)) {
      return Response.json({ error: 'Invalid locale' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    await supabase
      .from('profiles')
      .update({ locale })
      .eq('id', user.id)

    return Response.json({ ok: true })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
