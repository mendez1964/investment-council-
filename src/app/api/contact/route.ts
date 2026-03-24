import { getResend } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json()

    if (!name || !email || !subject || !message) {
      return Response.json({ error: 'All fields required' }, { status: 400 })
    }

    if (!email.includes('@')) {
      return Response.json({ error: 'Invalid email' }, { status: 400 })
    }

    const subjectLabels: Record<string, string> = {
      billing: 'Billing / Subscription',
      bug: 'Bug Report',
      feature: 'Feature Request',
      'api-key': 'API Key Issue',
      account: 'Account Help',
      other: 'Other',
    }

    const resend = getResend()
    await resend.emails.send({
      from: 'Investment Council <alerts@investmentcouncil.io>',
      to: 'support@investmentcouncil.io',
      replyTo: email,
      subject: `[Support] ${subjectLabels[subject] ?? subject} — ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="margin:0 0 16px;font-size:18px;color:#111;">New Support Message</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;width:100px;">Name</td><td style="padding:8px 0;font-size:13px;color:#111;font-weight:600;">${name}</td></tr>
            <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;">Email</td><td style="padding:8px 0;font-size:13px;color:#2563eb;"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;">Subject</td><td style="padding:8px 0;font-size:13px;color:#111;">${subjectLabels[subject] ?? subject}</td></tr>
          </table>
          <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;padding:16px;">
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
          <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">Sent from investmentcouncil.io contact form</p>
        </div>
      `,
    })

    return Response.json({ ok: true })
  } catch (err: any) {
    console.error('[contact]', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
