import { createServerSupabaseClient } from '@/lib/supabase'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const authClient = createServerSupabaseClientAuth()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, display_name, trial_ends_at, locale, preferred_ai, openai_key, gemini_key, grok_key, anthropic_key')
      .eq('id', user.id)
      .single()

    return Response.json({
      email: user.email,
      ...( profile ?? { tier: 'free' }),
    })
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
    const allowed = ['locale', 'display_name', 'preferred_ai', 'openai_key', 'gemini_key', 'grok_key', 'anthropic_key']
    const update: Record<string, any> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    if (update.locale) {
      const validLocales = ['en', 'es', 'pt', 'fr']
      if (!validLocales.includes(update.locale)) {
        return Response.json({ error: 'Invalid locale' }, { status: 400 })
      }
    }

    if (update.preferred_ai) {
      const validAIs = ['claude', 'chatgpt', 'gemini', 'grok']
      if (!validAIs.includes(update.preferred_ai)) {
        return Response.json({ error: 'Invalid preferred_ai' }, { status: 400 })
      }
    }

    if (Object.keys(update).length === 0) {
      return Response.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    await supabase.from('profiles').update(update).eq('id', user.id)

    return Response.json({ ok: true })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
