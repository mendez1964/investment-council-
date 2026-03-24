import { Resend } from 'resend'

// Lazy init so build doesn't fail without the key
export function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export const FROM = 'Investment Council <alerts@investmentcouncil.io>'
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.investmentcouncil.io'

// Base HTML email template
export function emailTemplate(opts: {
  subject: string
  preheader: string
  body: string
  unsubscribeToken: string
}): string {
  const { body, unsubscribeToken } = opts
  const unsubUrl = `${BASE_URL}/api/email/unsubscribe?token=${unsubscribeToken}`
  const settingsUrl = `${BASE_URL}/alerts`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${opts.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr><td style="background:#111;border-radius:10px 10px 0 0;padding:24px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#fff;font-size:16px;font-weight:700;letter-spacing:0.02em;">Investment Council</td>
            <td align="right" style="color:#9ca3af;font-size:11px;">${new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</td>
          </tr>
        </table>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#ffffff;padding:32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
        ${body}
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#fafafa;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 10px 10px;padding:20px 32px;">
        <p style="margin:0 0 8px;font-size:11px;color:#6b7280;">
          <a href="${settingsUrl}" style="color:#374151;text-decoration:underline;">Manage alerts</a>
          &nbsp;·&nbsp;
          <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
        </p>
        <p style="margin:0;font-size:10px;color:#9ca3af;line-height:1.5;">
          For educational and informational purposes only. Not financial advice. Past performance is not indicative of future results. Investment Council · investmentcouncil.io
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// Format picks into HTML rows
export function picksToHTML(picks: any[]): string {
  if (!picks.length) return '<p style="color:#9ca3af;font-size:13px;">No picks available today.</p>'
  return picks.map(p => {
    const isBull = p.bias === 'bullish'
    const color = isBull ? '#16a34a' : '#dc2626'
    const bg = isBull ? '#dcfce7' : '#fee2e2'
    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;border:1px solid #e4e4e7;border-left:3px solid ${color};border-radius:6px;overflow:hidden;">
      <tr>
        <td style="padding:12px 14px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:16px;font-weight:800;color:#111;">${p.symbol}</td>
              <td align="right">
                <span style="font-size:9px;font-weight:800;color:${color};background:${bg};border-radius:4px;padding:2px 8px;">${isBull ? '▲ BULLISH' : '▼ BEARISH'}</span>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:6px;font-size:11px;color:#555;font-style:italic;">"${p.rationale}"</td>
            </tr>
            <tr>
              <td style="padding-top:4px;font-size:10px;color:#6b7280;">⚡ ${p.catalyst}</td>
              <td align="right" style="font-size:10px;color:#9ca3af;">${p.entry_price != null ? 'Entry $' + p.entry_price.toFixed(2) : ''}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
  }).join('')
}

export function optionsToHTML(picks: any[]): string {
  if (!picks.length) return '<p style="color:#9ca3af;font-size:13px;">No options trades today.</p>'
  return picks.map(p => {
    const isCall = p.option_type === 'call'
    const color = isCall ? '#2563eb' : '#9333ea'
    const bg = isCall ? '#dbeafe' : '#f3e8ff'
    const expiry = p.expiry ? new Date(p.expiry + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''
    const stop = p.entry_premium && p.stop_loss_pct ? (p.entry_premium * (1 - p.stop_loss_pct/100)).toFixed(2) : null
    const target = p.entry_premium && p.take_profit_pct ? (p.entry_premium * (1 + p.take_profit_pct/100)).toFixed(2) : null
    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;border:1px solid #e4e4e7;border-left:3px solid ${color};border-radius:6px;">
      <tr><td style="padding:12px 14px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:16px;font-weight:800;color:#111;">${p.underlying}</td>
            <td align="right"><span style="font-size:9px;font-weight:800;color:${color};background:${bg};border-radius:4px;padding:2px 8px;">${isCall ? '▲ CALL' : '▼ PUT'}</span></td>
          </tr>
          <tr><td colspan="2" style="padding-top:4px;font-size:11px;color:#374151;font-weight:700;">${p.strike ? '$'+p.strike : ''} ${isCall?'C':'P'} · exp ${expiry}</td></tr>
          <tr><td colspan="2" style="padding-top:6px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="background:#f9fafb;border-radius:4px;padding:6px;font-size:11px;">
                  <div style="color:#9ca3af;font-size:8px;margin-bottom:2px;">ENTRY</div>
                  <div style="font-weight:700;color:#374151;">${p.entry_premium ? '$'+p.entry_premium.toFixed(2) : '—'}</div>
                </td>
                <td width="8"></td>
                <td align="center" style="background:#fee2e2;border-radius:4px;padding:6px;font-size:11px;">
                  <div style="color:#dc2626;font-size:8px;margin-bottom:2px;">STOP</div>
                  <div style="font-weight:700;color:#dc2626;">${stop ? '$'+stop : '—'}</div>
                </td>
                <td width="8"></td>
                <td align="center" style="background:#dcfce7;border-radius:4px;padding:6px;font-size:11px;">
                  <div style="color:#16a34a;font-size:8px;margin-bottom:2px;">TARGET</div>
                  <div style="font-weight:700;color:#16a34a;">${target ? '$'+target : '—'}</div>
                </td>
              </tr>
            </table>
          </td></tr>
          <tr><td colspan="2" style="padding-top:6px;font-size:10px;color:#555;font-style:italic;">"${p.rationale}"</td></tr>
        </table>
      </td></tr>
    </table>`
  }).join('')
}
