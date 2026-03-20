import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('pine_scripts')
    .select('id, name, description, created_at, updated_at')
    .order('updated_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { name, code, description } = await request.json()

  if (!name || !code) {
    return Response.json({ error: 'name and code are required' }, { status: 400 })
  }

  // Create the script record
  const { data: script, error: scriptError } = await supabase
    .from('pine_scripts')
    .insert({ name, description: description || '' })
    .select()
    .single()

  if (scriptError) return Response.json({ error: scriptError.message }, { status: 500 })

  // Save version 1
  const { data: version, error: versionError } = await supabase
    .from('script_versions')
    .insert({ script_id: script.id, version_number: 1, code, specialist: 'original' })
    .select()
    .single()

  if (versionError) return Response.json({ error: versionError.message }, { status: 500 })

  return Response.json({ script_id: script.id, version_id: version.id, version_number: 1 })
}
