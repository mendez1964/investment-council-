import { createServerSupabaseClient } from '@/lib/supabase'
import { getResend, FROM, emailTemplate, picksToHTML } from '@/lib/email'

function verifyCron(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === (process.env.CRON_SECRET ?? 'ic-cron-2024')
}

export async function POST(request: Request) {
  if (!verifyCron(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createServerSupabaseClient()
    const today = new Date().toISOString().slice(0, 10)

    // Get subscribers who want daily picks
    const { data: subs } = await supabase
      .from('email_subscriptions')
      .select('*')
      .eq('is_active', true)
      .eq('daily_picks', true)
      .or(`last_picks_sent.is.null,last_picks_sent.lt.${today}`)

    if (!subs?.length) return Response.json({ sent: 0 })

    // Fetch today's picks
    const picksRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://investmentcouncil.io'}/api/ai-picks`)
    const picksData = await picksRes.json()
    const stocks = (picksData.picks ?? []).filter((p: any) => p.type === 'stock')
    const crypto = (picksData.picks ?? []).filter((p: any) => p.type === 'crypto')

    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

    let sent = 0
    for (const sub of subs) {
      const body = `
        <h2 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#111;">🤖 AI Daily Picks</h2>
        <p style="margin:0 0 24px;font-size:12px;color:#9ca3af;">${dateStr}</p>
        ${picksData.stats?.total > 0 ? `
        <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;padding:12px 16px;margin-bottom:24px;display:flex;gap:24px;">
          <div><div style="font-size:9px;color:#9ca3af;letter-spacing:0.07em;">TRACK RECORD</div><div style="font-size:18px;font-weight:800;color:#111;"><span style="color:#16a34a">${picksData.stats.wins}W</span> – <span style="color:#dc2626">${picksData.stats.losses}L</span></div></div>
          <div><div style="font-size:9px;color:#9ca3af;letter-spacing:0.07em;">WIN RATE</div><div style="font-size:18px;font-weight:800;color:${picksData.stats.win_rate >= 55 ? '#16a34a' : '#d97706'}">${picksData.stats.win_rate.toFixed(1)}%</div></div>
        </div>` : ''}
        ${stocks.length ? `<h3 style="margin:0 0 12px;font-size:12px;font-weight:700;color:#9ca3af;letter-spacing:0.08em;">📈 STOCKS</h3>${picksToHTML(stocks)}` : ''}
        ${crypto.length ? `<h3 style="margin:0 0 12px;font-size:12px;font-weight:700;color:#9ca3af;letter-spacing:0.08em;margin-top:20px;">₿ CRYPTO</h3>${picksToHTML(crypto)}` : ''}
        <div style="margin-top:20px;text-align:center;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://investmentcouncil.io'}/ai-picks" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:12px;font-weight:600;">View Full Report →</a>
        </div>`

      try {
        await getResend().emails.send({
          from: FROM,
          to: sub.email,
          subject: `🤖 AI Picks — ${dateStr}`,
          html: emailTemplate({ subject: `AI Picks — ${dateStr}`, preheader: `Today's AI-generated stock and crypto picks`, body, unsubscribeToken: sub.unsubscribe_token }),
        })
        await supabase.from('email_subscriptions').update({ last_picks_sent: today }).eq('id', sub.id)
        sent++
      } catch {}
    }

    return Response.json({ sent })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
