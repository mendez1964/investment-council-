// Run in Supabase SQL editor:
// CREATE TABLE user_reports (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
//   name TEXT NOT NULL,
//   description TEXT,
//   prompt TEXT NOT NULL,
//   category TEXT DEFAULT 'Custom',
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users manage own reports" ON user_reports FOR ALL USING (auth.uid() = user_id);
// CREATE INDEX ON user_reports(user_id);

export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

export async function GET() {
  const authClient = createServerSupabaseClientAuth()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('user_reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const authClient = createServerSupabaseClientAuth()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  const { name, description, prompt, category } = body

  if (!name || !prompt) {
    return Response.json({ error: 'name and prompt are required' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('user_reports')
    .insert({
      user_id: user.id,
      name,
      description: description || null,
      prompt,
      category: category || 'Custom',
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(request: Request) {
  const authClient = createServerSupabaseClientAuth()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('user_reports')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
