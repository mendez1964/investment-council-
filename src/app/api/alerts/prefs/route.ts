import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()

  return Response.json(data ?? null)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, phone, channels } = body

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const emailLower = email.toLowerCase()

    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('email', emailLower)
      .single()

    const payload = {
      email: emailLower,
      phone: phone ?? null,
      channels: channels ?? {},
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      await supabase.from('notification_preferences').update(payload).eq('email', emailLower)
    } else {
      await supabase.from('notification_preferences').insert({ ...payload, is_active: true })
    }

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
