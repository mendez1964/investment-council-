import { createServerSupabaseClient } from '@/lib/supabase'
import { getResend, FROM, emailTemplate } from '@/lib/email'

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

    // Subscribers who want EOD recap (stocks or crypto)
    const { data: subs } = await supabase
      .from('email_subscriptions')
      .select('*')
      .eq('is_active', true)
      .or('eod_recap_stocks.eq.true,eod_recap_crypto.eq.true')

    if (!subs?.length) return Response.json({ sent: 0 })

    // Fetch today's picks + fear & greed in parallel
    const [picksRes, fgRes] = await Promise.allSettled([
      fetch(`${BASE}/api/ai-picks`),
      fetch(`${BASE}/api/fear-greed`),
    ])

    const picksData = picksRes.status === 'fulfilled' ? await picksRes.value.json().catch(() => ({})) : {}
    const fgData   = fgRes.status   === 'fulfilled' ? await fgRes.value.json().catch(() => [])   : []

    const allPicks: any[] = picksData.picks ?? []
    const stocks = allPicks.filter(p => p.type === 'stock')
    const crypto = allPicks.filter(p => p.type === 'crypto')

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

    // Build a performance summary for picks that have been evaluated
    const buildPicksRecap = (picks: any[], label: string): string => {
      if (!picks.length) return ''
      const wins   = picks.filter(p => p.outcome === 'win').length
      const losses = picks.filter(p => p.outcome === 'loss').length
      const pending = picks.filter(p => !p.outcome || p.outcome === 'pending').length

      const rows = picks.map(p => {
        const isBull = p.bias === 'bullish'
        const outcome = p.outcome
        const outcomeColor = outcome === 'win' ? '#16a34a' : outcome === 'loss' ? '#dc2626' : '#d97706'
        const outcomeBadge = outcome === 'win' ? '✓ WIN' : outcome === 'loss' ? '✕ LOSS' : '⏳ PENDING'
        return `
          <tr>
            <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#111;border-bottom:1px solid #f3f4f6;">${p.symbol}</td>
            <td style="padding:8px 12px;font-size:11px;color:${isBull ? '#16a34a' : '#dc2626'};border-bottom:1px solid #f3f4f6;">${isBull ? '▲ Bull' : '▼ Bear'}</td>
            <td style="padding:8px 12px;font-size:11px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${p.entry_price != null ? '$' + Number(p.entry_price).toFixed(2) : '—'}</td>
            <td style="padding:8px 12px;font-size:11px;font-weight:700;color:${outcomeColor};border-bottom:1px solid #f3f4f6;" align="right">${outcomeBadge}</td>
          </tr>`
      }).join('')

      return `
        <h3 style="margin:0 0 10px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.08em;text-transform:uppercase;">${label}</h3>
        ${wins + losses > 0 ? `
        <div style="display:flex;gap:12px;margin-bottom:12px;">
          <div style="background:#dcfce7;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;color:#16a34a;">${wins}W</div>
          <div style="background:#fee2e2;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;color:#dc2626;">${losses}L</div>
          ${pending > 0 ? `<div style="background:#fef3c7;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;color:#d97706;">${pending} Pending</div>` : ''}
        </div>` : ''}
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;margin-bottom:24px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;font-size:10px;color:#9ca3af;font-weight:600;text-align:left;letter-spacing:0.05em;">SYMBOL</th>
              <th style="padding:8px 12px;font-size:10px;color:#9ca3af;font-weight:600;text-align:left;letter-spacing:0.05em;">BIAS</th>
              <th style="padding:8px 12px;font-size:10px;color:#9ca3af;font-weight:600;text-align:left;letter-spacing:0.05em;">ENTRY</th>
              <th style="padding:8px 12px;font-size:10px;color:#9ca3af;font-weight:600;text-align:right;letter-spacing:0.05em;">RESULT</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`
    }

    const statsSection = picksData.stats?.total > 0 ? `
      <div style="display:flex;gap:16px;background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
        <div>
          <div style="font-size:9px;color:#9ca3af;letter-spacing:0.07em;margin-bottom:2px;">ALL-TIME RECORD</div>
          <div style="font-size:20px;font-weight:800;color:#111;"><span style="color:#16a34a">${picksData.stats.wins}W</span> <span style="color:#9ca3af">–</span> <span style="color:#dc2626">${picksData.stats.losses}L</span></div>
        </div>
        <div style="border-left:1px solid #e4e4e7;padding-left:16px;">
          <div style="font-size:9px;color:#9ca3af;letter-spacing:0.07em;margin-bottom:2px;">WIN RATE</div>
          <div style="font-size:20px;font-weight:800;color:${picksData.stats.win_rate >= 55 ? '#16a34a' : '#d97706'}">${picksData.stats.win_rate.toFixed(1)}%</div>
        </div>
      </div>` : ''

    const fgSection = fgValue != null ? `
      <div style="display:flex;align-items:center;gap:16px;background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
        <div style="text-align:center;min-width:52px;">
          <div style="font-size:28px;font-weight:900;color:${fgColor};line-height:1;">${fgValue}</div>
          <div style="font-size:9px;color:${fgColor};font-weight:700;letter-spacing:0.04em;">${fgLabel}</div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:600;color:#374151;">Market Closes With: ${fgLabel}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px;">Fear & Greed Index at ${fgValue} — ${fgValue <= 45 ? 'watch for opportunity setups.' : fgValue >= 75 ? 'consider risk management.' : 'balanced market conditions.'}</div>
        </div>
      </div>` : ''

    const resend = getResend()
    let sent = 0

    for (const sub of subs) {
      const stockSection = sub.eod_recap_stocks ? buildPicksRecap(stocks, '📈 Stock Picks — Today\'s Results') : ''
      const cryptoSection = sub.eod_recap_crypto ? buildPicksRecap(crypto, '₿ Crypto Picks — Today\'s Results') : ''

      const body = `
        <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111;">🌆 End of Day Recap</h2>
        <p style="margin:0 0 24px;font-size:12px;color:#9ca3af;">${dateStr} · Market Close</p>

        ${fgSection}
        ${statsSection}
        ${stockSection}
        ${cryptoSection}

        <div style="margin-top:24px;text-align:center;">
          <a href="${BASE}/app" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:11px 28px;border-radius:6px;font-size:13px;font-weight:700;">View Full Analysis in App →</a>
        </div>`

      try {
        await resend.emails.send({
          from: FROM,
          to: sub.email,
          subject: `🌆 EOD Recap — ${dateStr}`,
          html: emailTemplate({
            subject: `EOD Recap — ${dateStr}`,
            preheader: `Today's market close recap and AI picks results`,
            body,
            unsubscribeToken: sub.unsubscribe_token,
          }),
        })
        sent++
      } catch (err) {
        console.error('[eod-recap] email error:', err)
      }
    }

    console.log(`[eod-recap] sent:${sent} date:${today}`)
    return Response.json({ sent, date: today })
  } catch (err) {
    console.error('[eod-recap] fatal:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
