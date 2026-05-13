import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST() {
  try {
    const supabase = createServerSupabaseClient()

    const sql = `
      CREATE TABLE IF NOT EXISTS training_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        topic text NOT NULL,
        level text NOT NULL,
        modules jsonb NOT NULL DEFAULT '[]',
        current_module int NOT NULL DEFAULT 0,
        completed_modules int[] NOT NULL DEFAULT '{}',
        chat_history jsonb NOT NULL DEFAULT '[]',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('[training/setup] RPC error:', error)
      // Try direct query approach
      const { error: error2 } = await (supabase as any).from('training_sessions').select('id').limit(1)
      if (error2 && error2.code === '42P01') {
        // Table doesn't exist and we can't create it via RPC — return the SQL for manual creation
        return Response.json({
          success: false,
          manualSql: sql.trim(),
          error: 'Cannot create table automatically. Please run the SQL manually in Supabase dashboard.',
        })
      }
      // Table might already exist
      return Response.json({ success: true, note: 'Table may already exist' })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('[training/setup] error:', err)
    return Response.json({
      success: false,
      error: String(err),
      manualSql: `
CREATE TABLE IF NOT EXISTS training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  level text NOT NULL,
  modules jsonb NOT NULL DEFAULT '[]',
  current_module int NOT NULL DEFAULT 0,
  completed_modules int[] NOT NULL DEFAULT '{}',
  chat_history jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);`.trim(),
    })
  }
}
