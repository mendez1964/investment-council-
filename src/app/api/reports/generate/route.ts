export const dynamic = 'force-dynamic'

import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

export async function POST(request: Request) {
  const authClient = createServerSupabaseClientAuth()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const { name, description, dataSources } = await request.json()
  if (!name) return Response.json({ error: 'name is required' }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 500 })

  const userMessage = `Report Name: ${name}\nWhat I want: ${description || 'A professional investment report'}\nData sources to include: ${Array.isArray(dataSources) && dataSources.length > 0 ? dataSources.join(', ') : 'general market data'}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: 'You are a professional investment report prompt engineer. Given a user\'s report name, description of what they want, and data sources they want included, generate a structured professional prompt that will produce a high-quality investment report. The prompt should specify exact sections, format, length (under 400 words), and instruct use of live market data where applicable. Return ONLY the prompt text, no explanation, no preamble.',
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return Response.json({ error: `Claude API error: ${err}` }, { status: 500 })
  }

  const data = await res.json()
  const prompt = data.content?.[0]?.text ?? ''

  return Response.json({ prompt })
}
