import { createServerSupabaseClient } from '@/lib/supabase'
import { getResend, FROM, emailTemplate, picksToHTML } from '@/lib/email'

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.investmentcouncil.io'

function verifyCron(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === (process.env.CRON_SECRET ?? 'ic-cron-2024')
}

export async function POST(request: Request) {
  if (!verifyCron(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createServerSupabaseClient()
    const today = new Date().toISOString().slice(0, 10)

    // Subscribers who want morning briefing (stocks or crypto)
    const { data: subs } = await supabase
      .from('email_subscriptions')
      .select('*')
      .eq('is_active', true)
      .or('morning_briefing_stocks.eq.true,morning_briefing_crypto.eq.true')

    if (!subs?.length) return Response.json({ sent: 0 })

    // Fetch today's picks + fear & greed in parallel
    const [picksRes, fgRes] = await Promise.allSettled([
      fetch(`${BASE}/api/ai-picks`),
      fetch(`${BASE}/api/fear-greed`),
    ])

    const picksData = picksRes.status === 'fulfilled' ? await picksRes.value.json().catch(() => ({})) : {}
    const fgData   = fgRes.status   === 'fulfilled' ? await fgRes.value.json().catch(() => [])   : []

    const stocks = (picksData.picks ?? []).filter((p: any) => p.type === 'stock').slice(0, 3)
    const crypto = (picksData.picks ?? []).filter((p: any) => p.type === 'crypto').slice(0, 3)
    const fg = fgData?.[0]
    const fgValue = fg ? parseInt(fg.value) : null
    const fgLabel = fgValue == null ? null
      : fgValue <= 20 ? 'Extreme Fear'
      : fgValue <= 45 ? 'Fear'
      : fgValue <= 55 ? 'Neutral'
      : fgValue <= 75 ? 'Greed'
      : 'Extreme Greed'
    const fgColor = fgValue == null ? '#6b7280'
      : fgValue <= 45 ? '#dc2626'
      : fgValue <= 55 ? '#d97706'
      : '#16a34a'

    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      timeZone: 'America/New_York',
    })
    const timeStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
      timeZone: 'America/New_York',
    })

    const resend = getResend()
    let sent = 0

    for (const sub of subs) {
      const wantsStocks = sub.morning_briefing_stocks
      const wantsCrypto = sub.morning_briefing_crypto

      const stockSection = wantsStocks && stocks.length ? `
        <h3 style="margin:0 0 10px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.08em;text-transform:uppercase;">📈 Top Stock Picks Today</h3>
        ${picksToHTML(stocks)}` : ''

      const cryptoSection = wantsCrypto && crypto.length ? `
        <h3 style="margin:${wantsStocks ? '20px' : '0'} 0 10px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.08em;text-transform:uppercase;">₿ Top Crypto Picks Today</h3>
        ${picksToHTML(crypto)}` : ''

      const fgSection = fgValue != null ? `
        <div style="display:flex;align-items:center;gap:16px;background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
          <div style="text-align:center;min-width:52px;">
            <div style="font-size:28px;font-weight:900;color:${fgColor};line-height:1;">${fgValue}</div>
            <div style="font-size:9px;color:${fgColor};font-weight:700;letter-spacing:0.04em;">${fgLabel}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:600;color:#374151;">Fear & Greed Index</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${fgValue <= 20 ? 'Historically a buying opportunity.' : fgValue >= 80 ? 'Historically precedes corrections.' : 'Moderate sentiment — stay the course.'}</div>
          </div>
        </div>` : ''

      const statsSection = picksData.stats?.total > 0 ? `
        <div style="display:flex;gap:16px;background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
          <div>
            <div style="font-size:9px;color:#9ca3af;letter-spacing:0.07em;margin-bottom:2px;">TRACK RECORD</div>
            <div style="font-size:20px;font-weight:800;color:#111;"><span style="color:#16a34a">${picksData.stats.wins}W</span> <span style="color:#9ca3af">–</span> <span style="color:#dc2626">${picksData.stats.losses}L</span></div>
          </div>
          <div style="border-left:1px solid #e4e4e7;padding-left:16px;">
            <div style="font-size:9px;color:#9ca3af;letter-spacing:0.07em;margin-bottom:2px;">WIN RATE</div>
            <div style="font-size:20px;font-weight:800;color:${picksData.stats.win_rate >= 55 ? '#16a34a' : '#d97706'}">${picksData.stats.win_rate.toFixed(1)}%</div>
          </div>
        </div>` : ''

      const body = `
        <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111;">🌅 Morning Briefing</h2>
        <p style="margin:0 0 24px;font-size:12px;color:#9ca3af;">${dateStr} · ${timeStr}</p>

        ${fgSection}
        ${statsSection}
        ${stockSection}
        ${cryptoSection}

        <div style="margin-top:24px;text-align:center;">
          <a href="${BASE}/app" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:11px 28px;border-radius:6px;font-size:13px;font-weight:700;">Open Full Briefing in App →</a>
        </div>`

      try {
        await resend.emails.send({
          from: FROM,
          to: sub.email,
          subject: `🌅 Morning Briefing — ${dateStr}`,
          html: emailTemplate({
            subject: `Morning Briefing — ${dateStr}`,
            preheader: `Your morning market snapshot — ${stocks.length + crypto.length} AI picks ready`,
            body,
            unsubscribeToken: sub.unsubscribe_token,
          }),
        })
        sent++
      } catch (err) {
        console.error('[morning-briefing] email error:', err)
      }
    }

    console.log(`[morning-briefing] sent:${sent} date:${today}`)
    return Response.json({ sent, date: today })
  } catch (err) {
    console.error('[morning-briefing] fatal:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
