export const dynamic = 'force-dynamic'

import OpenAI from 'openai'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'https://spark-api.adzoneai.io'
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    ?? 'qwen3.5:35b-fast'
const ollamaClient = new OpenAI({ baseURL: `${OLLAMA_BASE_URL}/v1`, apiKey: 'ollama' })

export async function POST(request: Request) {
  const authClient = createServerSupabaseClientAuth()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const { name, description, dataSources } = await request.json()
  if (!name) return Response.json({ error: 'name is required' }, { status: 400 })

  const userMessage = `Report Name: ${name}\nWhat I want: ${description || 'A professional investment report'}\nData sources to include: ${Array.isArray(dataSources) && dataSources.length > 0 ? dataSources.join(', ') : 'general market data'}`

  const res = await ollamaClient.chat.completions.create({
    model: OLLAMA_MODEL,
    max_tokens: 800,
    messages: [
      { role: 'system', content: 'You are a professional investment report prompt engineer. Given a user\'s report name, description of what they want, and data sources they want included, generate a structured professional prompt that will produce a high-quality investment report. The prompt should specify exact sections, format, length (under 400 words), and instruct use of live market data where applicable. Return ONLY the prompt text, no explanation, no preamble.' },
      { role: 'user', content: userMessage },
    ],
  })

  const prompt = res.choices[0]?.message?.content ?? ''

  return Response.json({ prompt })
}
