import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token) {
    return new Response('Invalid unsubscribe link', { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('email_subscriptions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('unsubscribe_token', token)

  if (error) {
    return new Response('Could not process unsubscribe request', { status: 500 })
  }

  return new Response(`<!DOCTYPE html>
<html><head><title>Unsubscribed</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#374151;">
  <div style="font-size:32px;margin-bottom:16px;">✓</div>
  <h2 style="margin:0 0 8px;color:#111;">Unsubscribed</h2>
  <p style="color:#6b7280;font-size:14px;">You've been removed from all Investment Council alerts.</p>
  <p style="margin-top:24px;"><a href="https://www.investmentcouncil.io/alerts" style="color:#2563eb;font-size:13px;">Manage preferences</a></p>
</body></html>`, { headers: { 'Content-Type': 'text/html' } })
}
