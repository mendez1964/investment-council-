import { createServerSupabaseClient } from '@/lib/supabase'
import { getResend, FROM, emailTemplate, optionsToHTML } from '@/lib/email'

function verifyCron(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === (process.env.CRON_SECRET ?? 'ic-cron-2024')
}

export async function POST(request: Request) {
  if (!verifyCron(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createServerSupabaseClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data: subs } = await supabase
      .from('email_subscriptions')
      .select('*')
      .eq('is_active', true)
      .eq('options_trades', true)
      .or(`last_options_sent.is.null,last_options_sent.lt.${today}`)

    if (!subs?.length) return Response.json({ sent: 0 })

    const optRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://investmentcouncil.io'}/api/ai-picks/options`)
    const optData = await optRes.json()
    const picks = optData.picks ?? []

    if (!picks.length) return Response.json({ sent: 0, reason: 'No options picks today' })

    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    let sent = 0

    for (const sub of subs) {
      const body = `
        <h2 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#111;">⚡ Options Trades</h2>
        <p style="margin:0 0 24px;font-size:12px;color:#9ca3af;">${dateStr} · ${picks.length} trades · Entry / Stop / Target</p>
        ${optionsToHTML(picks)}
        <div style="margin-top:20px;text-align:center;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://investmentcouncil.io'}/ai-picks" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:12px;font-weight:600;">View Full Options Report →</a>
        </div>`

      try {
        await getResend().emails.send({
          from: FROM,
          to: sub.email,
          subject: `⚡ Options Trades — ${dateStr}`,
          html: emailTemplate({ subject: `Options Trades — ${dateStr}`, preheader: `Today's AI options trades with entry, stop, and target`, body, unsubscribeToken: sub.unsubscribe_token }),
        })
        await supabase.from('email_subscriptions').update({ last_options_sent: today }).eq('id', sub.id)
        sent++
      } catch {}
    }

    return Response.json({ sent })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
