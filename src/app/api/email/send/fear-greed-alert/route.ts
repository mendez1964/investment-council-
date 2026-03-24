import { createServerSupabaseClient } from '@/lib/supabase'
import { getResend, FROM, emailTemplate } from '@/lib/email'

function verifyCron(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === (process.env.CRON_SECRET ?? 'ic-cron-2024')
}

export async function POST(request: Request) {
  if (!verifyCron(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createServerSupabaseClient()

    // Fetch current fear & greed
    const fgRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.investmentcouncil.io'}/api/fear-greed`)
    const fgData = await fgRes.json()
    const current = fgData?.[0]
    if (!current) return Response.json({ sent: 0, reason: 'No data' })

    const value = parseInt(current.value)
    const isExtreme = value <= 20 || value >= 80
    if (!isExtreme) return Response.json({ sent: 0, reason: `Value ${value} not extreme` })

    const isExtrFear = value <= 20
    const label = value <= 20 ? 'Extreme Fear' : value <= 45 ? 'Fear' : value <= 55 ? 'Neutral' : value <= 75 ? 'Greed' : 'Extreme Greed'
    const color = isExtrFear ? '#dc2626' : '#16a34a'
    const emoji = isExtrFear ? '😱' : '🤑'
    const signal = isExtrFear ? 'Historically a buying opportunity — fear often precedes recovery.' : 'Historically precedes corrections — consider reducing exposure or taking profits.'

    const { data: subs } = await supabase
      .from('email_subscriptions')
      .select('*')
      .eq('is_active', true)
      .eq('fear_greed_alerts', true)

    if (!subs?.length) return Response.json({ sent: 0 })

    let sent = 0
    for (const sub of subs) {
      const body = `
        <h2 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#111;">${emoji} Fear & Greed Alert</h2>
        <p style="margin:0 0 24px;font-size:12px;color:#9ca3af;">Market sentiment has hit an extreme level</p>
        <div style="text-align:center;padding:32px;background:#f9fafb;border-radius:10px;margin-bottom:24px;">
          <div style="font-size:64px;font-weight:900;color:${color};line-height:1;">${value}</div>
          <div style="font-size:16px;font-weight:700;color:${color};margin-top:8px;">${label}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:8px;">${current.value_classification}</div>
        </div>
        <p style="font-size:13px;color:#374151;line-height:1.6;background:#fff;border-left:3px solid ${color};padding:12px 16px;border-radius:0 6px 6px 0;">
          ${signal}
        </p>
        <div style="margin-top:20px;text-align:center;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.investmentcouncil.io'}/fear-greed" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:12px;font-weight:600;">View Full Gauge →</a>
        </div>`

      try {
        await getResend().emails.send({
          from: FROM,
          to: sub.email,
          subject: `${emoji} Fear & Greed Alert — ${label} (${value})`,
          html: emailTemplate({ subject: `Fear & Greed Alert — ${label} (${value})`, preheader: `Market sentiment at extreme level: ${value} (${label})`, body, unsubscribeToken: sub.unsubscribe_token }),
        })
        sent++
      } catch {}
    }

    return Response.json({ sent, value, label })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
