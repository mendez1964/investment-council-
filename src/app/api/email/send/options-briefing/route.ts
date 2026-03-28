import { createServerSupabaseClient } from '@/lib/supabase'
import { getResend, FROM, emailTemplate } from '@/lib/email'
import Anthropic from '@anthropic-ai/sdk'

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.investmentcouncil.io'

function verifyCron(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === (process.env.CRON_SECRET ?? 'ic-cron-2024')
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 120

export async function POST(request: Request) {
  if (!verifyCron(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createServerSupabaseClient()
    const today = new Date().toISOString().slice(0, 10)

    // Pro subscribers only who have options_briefing enabled
    const { data: subs } = await supabase
      .from('email_subscriptions')
      .select('*')
      .eq('is_active', true)
      .eq('options_briefing', true)
      .or(`last_options_briefing_sent.is.null,last_options_briefing_sent.lt.${today}`)

    if (!subs?.length) return Response.json({ sent: 0 })

    // Fetch VIX + options picks in parallel
    const [vixRes, optRes] = await Promise.allSettled([
      fetch(`${BASE}/api/market/quotes?symbols=VIX`),
      fetch(`${BASE}/api/ai-picks/options`),
    ])

    const vixData = vixRes.status === 'fulfilled' ? await vixRes.value.json().catch(() => ({})) : {}
    const optData = optRes.status === 'fulfilled' ? await optRes.value.json().catch(() => ({})) : {}
    const options = optData.picks ?? []
    const vix = vixData?.quotes?.VIX?.c ?? vixData?.price ?? null

    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      timeZone: 'America/New_York',
    })

    // Generate briefing with Claude
    const prompt = `You are a professional options trading analyst. Generate a concise options morning briefing for ${dateStr}.

Available data:
- VIX: ${vix ?? 'unavailable'}
- Today's options picks: ${options.length > 0 ? JSON.stringify(options.slice(0, 5)) : 'not available'}

Write a crisp options morning briefing with this exact structure:

## OPTIONS MORNING BRIEF — ${dateStr}

**1. VOLATILITY ENVIRONMENT**
VIX level: [value or unavailable]. Context: is IV elevated, compressed, or neutral? What does this mean for premium buyers vs sellers today?

**2. BEST STRATEGY TYPE TODAY**
Based on the current vol environment, what options strategies have the edge today? (e.g. credit spreads in high IV, debit spreads in low IV, straddles around catalysts). One direct sentence per strategy with why.

**3. KEY RISK EVENTS THIS WEEK**
Any major earnings, Fed speakers, or economic data this week that options traders need to know before positioning. 3-5 bullets.

**4. OPTIONS MARKET CONDITIONS**
- Put/Call ratio context (elevated, neutral, or low?)
- Any notable skew shifts or unusual activity to be aware of
- 0DTE conditions: is today's environment favorable or unfavorable for intraday options plays?

**5. TRADING REMINDERS**
2-3 short rules-based reminders for options traders today (position sizing, IV crush risk near earnings, etc.)

Keep it under 350 words. Direct, data-first, no fluff.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const briefingText = message.content[0].type === 'text' ? message.content[0].text : 'Briefing unavailable.'

    // Convert markdown to simple HTML
    const briefingHtml = briefingText
      .replace(/## (.+)/g, '<h2 style="margin:24px 0 8px;font-size:16px;font-weight:800;color:#111;">$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)/gm, '<li style="margin:4px 0;color:#374151;">$1</li>')
      .replace(/(<li.*<\/li>\n?)+/g, '<ul style="margin:8px 0;padding-left:20px;">$&</ul>')
      .replace(/\n\n/g, '<br/>')

    const resend = getResend()
    let sent = 0

    for (const sub of subs) {
      const body = `
        <h2 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#111;">📊 Options Morning Brief</h2>
        <p style="margin:0 0 24px;font-size:12px;color:#9ca3af;">${dateStr} · VIX ${vix ?? '—'} · Pro Members</p>
        <div style="font-size:14px;line-height:1.7;color:#374151;">${briefingHtml}</div>
        <div style="margin-top:24px;text-align:center;">
          <a href="${BASE}/app" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:12px;font-weight:600;">Open Platform →</a>
        </div>`

      try {
        await resend.emails.send({
          from: FROM,
          to: sub.email,
          subject: `📊 Options Morning Brief — ${dateStr}`,
          html: emailTemplate({ subject: `Options Morning Brief — ${dateStr}`, preheader: `VIX ${vix ?? '—'} · Vol environment, strategy type, and risk events`, body, unsubscribeToken: sub.unsubscribe_token }),
        })
        await supabase.from('email_subscriptions').update({ last_options_briefing_sent: today }).eq('id', sub.id)
        sent++
      } catch (e) {
        console.error('[options-briefing] send error:', e)
      }
    }

    return Response.json({ sent })
  } catch (e) {
    console.error('[options-briefing] error:', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
