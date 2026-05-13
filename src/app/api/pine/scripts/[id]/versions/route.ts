import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: script, error: scriptError } = await supabase
    .from('pine_scripts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (scriptError) return Response.json({ error: 'Script not found' }, { status: 404 })

  const { data: versions, error: versionsError } = await supabase
    .from('script_versions')
    .select('*')
    .eq('script_id', params.id)
    .order('version_number', { ascending: false })

  if (versionsError) return Response.json({ error: versionsError.message }, { status: 500 })

  return Response.json({ script, versions })
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { code, specialist, notes } = await request.json()

  if (!code) return Response.json({ error: 'code is required' }, { status: 400 })

  // Get current highest version number
  const { data: existing } = await supabase
    .from('script_versions')
    .select('version_number')
    .eq('script_id', params.id)
    .order('version_number', { ascending: false })
    .limit(1)

  const nextVersion = existing && existing.length > 0 ? existing[0].version_number + 1 : 1

  const { data: version, error } = await supabase
    .from('script_versions')
    .insert({
      script_id: params.id,
      version_number: nextVersion,
      code,
      specialist: specialist || 'manual',
      notes: notes || null,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Update the script's updated_at timestamp
  await supabase
    .from('pine_scripts')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', params.id)

  return Response.json({ version_number: nextVersion, version_id: version.id })
}
