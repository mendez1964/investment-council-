import { createServerSupabaseClient } from '@/lib/supabase'
import { getResend, FROM, emailTemplate } from '@/lib/email'

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.investmentcouncil.io'

function verifyCron(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === (process.env.CRON_SECRET ?? 'ic-cron-2024')
}

const IMPACT_COLOR: Record<string, { border: string; badge: string; text: string; bg: string }> = {
  high:   { border: '#dc2626', badge: '#ef4444', text: '#dc2626', bg: '#fef2f2' },
  medium: { border: '#d97706', badge: '#f59e0b', text: '#b45309', bg: '#fffbeb' },
  low:    { border: '#6b7280', badge: '#9ca3af', text: '#6b7280', bg: '#f9fafb' },
}

const DIRECTION_ICON: Record<string, string> = {
  positive: '▲',
  negative: '▼',
  neutral:  '●',
}

function alertToHTML(alert: {
  ticker: string
  impact_level: string
  impact_direction: string
  summary: string
  headline: string
  source: string
  price_impact_est: string
  published_at: string | null
  created_at: string
}): string {
  const c = IMPACT_COLOR[alert.impact_level] ?? IMPACT_COLOR.low
  const icon = DIRECTION_ICON[alert.impact_direction] ?? '●'
  const dirColor = alert.impact_direction === 'positive' ? '#16a34a'
    : alert.impact_direction === 'negative' ? '#dc2626' : '#6b7280'
  const timeStr = (() => {
    const src = alert.published_at ?? alert.created_at
    const d = new Date(src)
    const diffH = (Date.now() - d.getTime()) / 3600000
    if (diffH > 48) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    if (diffH >= 1) return `${Math.floor(diffH)}h ago`
    return `${Math.floor(diffH * 60)}m ago`
  })()

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid ${c.border};border-left:4px solid ${c.badge};border-radius:8px;background:${c.bg};overflow:hidden;">
    <tr><td style="padding:14px 16px;">

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr>
          <td>
            <span style="font-size:15px;font-weight:800;color:#111;margin-right:8px;">${alert.ticker}</span>
            <span style="font-size:9px;font-weight:700;color:${c.badge};background:${c.badge}20;border-radius:3px;padding:2px 6px;text-transform:uppercase;margin-right:6px;">${alert.impact_level}</span>
            <span style="font-size:11px;color:${dirColor};font-weight:700;">${icon} ${alert.impact_direction}</span>
          </td>
          <td align="right" style="font-size:9px;color:#9ca3af;">${timeStr}</td>
        </tr>
      </table>

      <div style="font-size:13px;font-weight:600;color:#111;line-height:1.5;margin-bottom:6px;">${alert.summary}</div>

      <div style="font-size:11px;color:#6b7280;font-style:italic;line-height:1.4;margin-bottom:8px;">
        "${alert.headline}"${alert.source ? `<span style="font-style:normal;font-weight:600;color:#374151;margin-left:4px;">— ${alert.source}</span>` : ''}
      </div>

      ${alert.price_impact_est ? `
      <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:4px;padding:8px 10px;">
        <div style="font-size:11px;font-weight:700;color:${dirColor};">AI estimate at time of news: ${alert.price_impact_est}</div>
        <div style="font-size:9px;color:#9ca3af;margin-top:2px;">Verify current price before acting · Not financial advice</div>
      </div>` : ''}

    </td></tr>
  </table>`
}

export async function POST(request: Request) {
  if (!verifyCron(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createServerSupabaseClient()
    const today = new Date().toISOString().slice(0, 10)

    // Get all Pro users who have uncleared Guardian alerts today
    // Join guardian_alerts → profiles (tier = 'pro') → auth.users (email)
    const { data: alerts } = await supabase
      .from('guardian_alerts')
      .select('*, profiles!inner(tier, display_name)')
      .eq('alert_date', today)
      .is('cleared_at', null)
      .eq('profiles.tier', 'pro')

    if (!alerts?.length) return Response.json({ sent: 0, reason: 'no pro alerts today' })

    // Group alerts by user_id
    const byUser: Record<string, { userId: string; displayName: string; items: typeof alerts }> = {}
    for (const a of alerts) {
      const profile = a.profiles as { tier: string; display_name: string | null }
      if (!byUser[a.user_id]) {
        byUser[a.user_id] = { userId: a.user_id, displayName: profile?.display_name ?? 'Investor', items: [] }
      }
      byUser[a.user_id].items.push(a)
    }

    // Get emails for these users from auth.users via service role
    const userIds = Object.keys(byUser)
    const { data: userRows } = await supabase.auth.admin.listUsers()
    const emailMap: Record<string, string> = {}
    for (const u of userRows?.users ?? []) {
      if (userIds.includes(u.id) && u.email) emailMap[u.id] = u.email
    }

    // Get unsubscribe tokens from email_subscriptions
    const emails = Object.values(emailMap)
    const { data: subs } = await supabase
      .from('email_subscriptions')
      .select('email, unsubscribe_token, guardian, is_active')
      .in('email', emails)

    const subMap: Record<string, { token: string; wantsGuardian: boolean; active: boolean }> = {}
    for (const s of subs ?? []) {
      subMap[s.email] = {
        token: s.unsubscribe_token ?? '',
        wantsGuardian: s.guardian !== false, // default opt-in
        active: s.is_active !== false,
      }
    }

    const resend = getResend()
    let sent = 0
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      timeZone: 'America/New_York',
    })

    for (const { userId, displayName, items } of Object.values(byUser)) {
      const email = emailMap[userId]
      if (!email) continue

      const sub = subMap[email]
      if (sub && (!sub.active || sub.wantsGuardian === false)) continue

      // Sort: high → medium → low
      const sorted = [...items].sort((a, b) => {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
        return (order[a.impact_level] ?? 2) - (order[b.impact_level] ?? 2)
      })

      const highCount = sorted.filter(a => a.impact_level === 'high').length
      const subjectPrefix = highCount > 0 ? `🔴 ${highCount} High-Impact Alert${highCount > 1 ? 's' : ''}` : `🛡️ ${sorted.length} Market Alert${sorted.length > 1 ? 's' : ''}`

      const body = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
          <span style="font-size:22px;font-weight:800;color:#111;">🛡️ IC Market Guardian</span>
        </div>
        <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">${dateStr}</p>
        <p style="margin:0 0 24px;font-size:13px;color:#374151;">
          Hi ${displayName}, here ${sorted.length === 1 ? 'is' : 'are'} <strong>${sorted.length} alert${sorted.length > 1 ? 's' : ''}</strong> on your holdings today.
        </p>

        ${sorted.map(alertToHTML).join('')}

        <div style="margin-top:24px;padding:14px 16px;background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;font-size:11px;color:#6b7280;line-height:1.6;">
          <strong style="color:#374151;">Reminder:</strong> IC Market Guardian provides AI-generated summaries based on news headlines at the time of analysis. Always verify current prices and context before making any trading decisions. Not financial advice.
        </div>

        <div style="margin-top:20px;text-align:center;">
          <a href="${BASE}/app" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:11px 28px;border-radius:6px;font-size:13px;font-weight:700;">View All Alerts in App →</a>
        </div>`

      try {
        await resend.emails.send({
          from: FROM,
          to: email,
          subject: `${subjectPrefix} — IC Market Guardian`,
          html: emailTemplate({
            subject: `${subjectPrefix} — IC Market Guardian`,
            preheader: `${sorted.length} market alert${sorted.length > 1 ? 's' : ''} on your portfolio holdings today`,
            body,
            unsubscribeToken: sub?.token ?? '',
          }),
        })
        sent++
      } catch (err) {
        console.error('[guardian-alerts] email error:', email, err)
      }
    }

    console.log(`[guardian-alerts] sent:${sent} date:${today}`)
    return Response.json({ sent, date: today })
  } catch (err) {
    console.error('[guardian-alerts] fatal:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
