import { createServerSupabaseClient } from '@/lib/supabase'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'
import { getResend, FROM, BASE_URL } from '@/lib/email'
import { getOrCreateReferralCode } from '@/lib/referral'

export const dynamic = 'force-dynamic'

function ambassadorEmail(recipientEmail: string, refCode: string | null, unsubToken: string): string {
  const refLink = refCode ? `${BASE_URL}?ref=${refCode}` : `${BASE_URL}`
  const profileLink = `${BASE_URL}/app`
  const unsubLink = `${BASE_URL}/api/email/unsubscribe?token=${unsubToken}`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr><td style="background:#111;border-radius:10px 10px 0 0;padding:24px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#fff;font-size:16px;font-weight:700;letter-spacing:0.02em;">Investment Council</td>
            <td align="right" style="color:#9ca3af;font-size:11px;">Ambassador Program</td>
          </tr>
        </table>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#fff;padding:32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">

        <p style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111;letter-spacing:-0.02em;">Thank you for your review 🙏</p>
        <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
          We genuinely read every response — your feedback helps us build a better platform for traders.
        </p>

        <!-- Divider -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr><td style="border-top:1px solid #f0f0f0;"></td></tr>
        </table>

        <!-- Ambassador intro -->
        <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#f59e0b;letter-spacing:0.1em;">INVESTMENT COUNCIL AMBASSADOR PROGRAM</p>
        <p style="margin:0 0 12px;font-size:20px;font-weight:900;color:#111;letter-spacing:-0.02em;">Earn free months. Help traders find better tools.</p>
        <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
          We're building our ambassador community — traders who believe in what we're building and want to share it with others.
          It's simple: when someone subscribes using your link, <strong>you both get one month free</strong>.
        </p>

        <!-- How it works -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;">
          <tr><td style="padding:20px;">
            <p style="margin:0 0 16px;font-size:12px;font-weight:800;color:#111;letter-spacing:0.06em;">HOW IT WORKS</p>
            ${[
              ['1', '#2563eb', 'Share your unique link', 'Post it, message it, add it to your bio — anywhere traders hang out.'],
              ['2', '#7c3aed', 'They get a free month', 'Anyone who signs up with your link gets 30 extra days free automatically.'],
              ['3', '#16a34a', 'You earn a free month', 'Every time someone subscribes, you get a free month credited to your account.'],
            ].map(([num, color, title, desc]) => `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
              <tr>
                <td style="width:32px;vertical-align:top;padding-top:2px;">
                  <div style="width:24px;height:24px;background:${color};border-radius:50%;text-align:center;line-height:24px;font-size:11px;font-weight:800;color:#fff;">${num}</div>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#111;">${title}</p>
                  <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">${desc}</p>
                </td>
              </tr>
            </table>`).join('')}
          </td></tr>
        </table>

        ${refCode ? `
        <!-- Referral link box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
          <tr><td style="padding:20px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#92400e;letter-spacing:0.06em;">YOUR REFERRAL LINK</p>
            <p style="margin:0 0 12px;font-size:13px;font-family:monospace;font-weight:700;color:#111;background:#fff;border:1px solid #fcd34d;border-radius:6px;padding:8px 12px;">${refLink}</p>
            <p style="margin:0;font-size:11px;color:#92400e;">Your code: <strong style="letter-spacing:0.1em;">${refCode}</strong> — share it anywhere, it never expires.</p>
          </td></tr>
        </table>
        ` : `
        <!-- No code — send to profile -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
          <tr><td style="padding:20px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;">Get your referral link</p>
            <p style="margin:0;font-size:12px;color:#78350f;line-height:1.5;">Log in and visit your Profile page to find your unique referral link.</p>
          </td></tr>
        </table>
        `}

        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td align="center">
              <a href="${profileLink}" style="display:inline-block;padding:14px 32px;background:#111;color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:-0.01em;">
                ${refCode ? 'Start Sharing →' : 'Get My Referral Link →'}
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;text-align:center;">
          No limits. No minimums. Every referral that subscribes earns you a free month — they stack up.
        </p>

      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#fafafa;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 10px 10px;padding:20px 32px;">
        <p style="margin:0 0 8px;font-size:11px;color:#6b7280;">
          <a href="${unsubLink}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
        </p>
        <p style="margin:0;font-size:10px;color:#9ca3af;line-height:1.5;">
          Investment Council · investmentcouncil.io · For informational purposes only. Not financial advice.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { rating, picks_helpful, ai_trustworthy, easy_to_use, saves_time,
            would_use_daily, top_feature, improve, would_recommend, email } = body

    if (!rating || rating < 1 || rating > 5) {
      return Response.json({ error: 'Rating required (1-5)' }, { status: 400 })
    }

    // Get user if logged in (optional)
    let userId: string | null = null
    let userEmail: string | null = null
    try {
      const authClient = createServerSupabaseClientAuth()
      const { data: { user } } = await authClient.auth.getUser()
      if (user) { userId = user.id; userEmail = user.email ?? null }
    } catch {}

    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('reviews').insert({
      user_id: userId,
      email: email?.trim() || null,
      rating,
      picks_helpful,
      ai_trustworthy,
      easy_to_use,
      saves_time,
      would_use_daily,
      top_feature,
      improve: improve?.trim() || null,
      would_recommend,
    })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Send ambassador email if we have an address
    const sendTo = email?.trim() || userEmail
    if (sendTo) {
      try {
        // Get referral code if user is logged in
        let refCode: string | null = null
        if (userId) {
          refCode = await getOrCreateReferralCode(userId)
        }

        const unsubToken = Buffer.from(`${sendTo}-review-unsub`).toString('base64')
        const resend = getResend()
        await resend.emails.send({
          from: FROM,
          to: sendTo,
          subject: 'Thank you for your review — join our Ambassador Program',
          html: ambassadorEmail(sendTo, refCode, unsubToken),
        })
      } catch (emailErr) {
        // Don't fail the review submission if email fails
        console.error('[review] ambassador email failed:', emailErr)
      }
    }

    return Response.json({ ok: true })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
