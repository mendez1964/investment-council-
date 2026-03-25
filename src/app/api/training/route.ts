import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

// IC's own key — used only during 24h grace period and for owner/admin
const ic_anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type AIProvider = 'claude' | 'chatgpt' | 'gemini' | 'grok'

const OPENAI_CONFIGS: Record<string, { baseURL?: string; model: string }> = {
  chatgpt: { model: 'gpt-4o' },
  gemini:  { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-2.0-flash' },
  grok:    { baseURL: 'https://api.x.ai/v1', model: 'grok-2-latest' },
}

interface ResolvedClient {
  provider: AIProvider
  anthropic: Anthropic | null
  openai: OpenAI | null
  model: string
  blocked: boolean
  blockMessage?: string
}

async function resolveClient(): Promise<ResolvedClient> {
  try {
    const authClient = createServerSupabaseClientAuth()
    const { data: { user } } = await authClient.auth.getUser()

    if (user) {
      const db = createServerSupabaseClient()
      const { data: profile } = await db
        .from('profiles')
        .select('preferred_ai, anthropic_key, openai_key, gemini_key, grok_key, tier, stripe_customer_id')
        .eq('id', user.id)
        .single()

      const preferred = ((profile?.preferred_ai ?? 'claude') as AIProvider)

      const keyMap: Record<AIProvider, string | null> = {
        claude:  profile?.anthropic_key ?? null,
        chatgpt: profile?.openai_key    ?? null,
        gemini:  profile?.gemini_key    ?? null,
        grok:    profile?.grok_key      ?? null,
      }
      const userApiKey = keyMap[preferred]

      const isAdmin = user.email === process.env.ADMIN_EMAIL || user.email === 'mendezdag@gmail.com'
      const isAdminGranted = !profile?.stripe_customer_id && (profile?.tier === 'trader' || profile?.tier === 'pro')

      if (userApiKey) {
        if (preferred === 'claude') {
          return { provider: 'claude', anthropic: new Anthropic({ apiKey: userApiKey }), openai: null, model: 'claude-sonnet-4-6', blocked: false }
        }
        const cfg = OPENAI_CONFIGS[preferred]
        return { provider: preferred, anthropic: null, openai: new OpenAI({ apiKey: userApiKey, baseURL: cfg.baseURL }), model: cfg.model, blocked: false }
      }

      if (isAdmin || isAdminGranted) {
        return { provider: 'claude', anthropic: ic_anthropic, openai: null, model: 'claude-sonnet-4-6', blocked: false }
      }

      const inGracePeriod = Date.now() < new Date(user.created_at).getTime() + 24 * 60 * 60 * 1000
      if (inGracePeriod) {
        return { provider: 'claude', anthropic: ic_anthropic, openai: null, model: 'claude-sonnet-4-6', blocked: false }
      }

      return {
        provider: 'claude', anthropic: null, openai: null, model: '', blocked: true,
        blockMessage: 'Your 24-hour free trial has ended. Add your API key in Profile → Your API Keys to continue using Training.',
      }
    }
  } catch {}

  // Unauthenticated — use IC key
  return { provider: 'claude', anthropic: ic_anthropic, openai: null, model: 'claude-sonnet-4-6', blocked: false }
}

async function callAI(client: ResolvedClient, system: string, userMessage: string, maxTokens = 1200): Promise<string> {
  if (client.anthropic) {
    const res = await client.anthropic.messages.create({
      model: client.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    })
    return res.content[0].type === 'text' ? res.content[0].text : ''
  }
  if (client.openai) {
    const res = await client.openai.chat.completions.create({
      model: client.model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
    })
    return res.choices[0]?.message?.content ?? ''
  }
  return ''
}

async function callAIChat(
  client: ResolvedClient,
  system: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string,
  maxTokens = 1024,
): Promise<string> {
  if (client.anthropic) {
    const res = await client.anthropic.messages.create({
      model: client.model,
      max_tokens: maxTokens,
      system,
      messages: [
        ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: userMessage },
      ],
    })
    return res.content[0].type === 'text' ? res.content[0].text : ''
  }
  if (client.openai) {
    const res = await client.openai.chat.completions.create({
      model: client.model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: userMessage },
      ],
    })
    return res.choices[0]?.message?.content ?? ''
  }
  return ''
}

const TOTAL_MODULES = 8

interface TrainingModule {
  title: string
  emoji: string
  content: string
  quiz: {
    question: string
    options: string[]
    answer: 'A' | 'B' | 'C' | 'D'
    explanation: string
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const supabase = createServerSupabaseClient()

    if (searchParams.get('action') === 'popular') {
      const { data } = await supabase
        .from('training_plans_cache')
        .select('topic_display, level, use_count, updated_at')
        .order('use_count', { ascending: false })
        .limit(8)
      return Response.json(data ?? [])
    }

    const sessionId = searchParams.get('sessionId')
    if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 })

    const { data, error } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error || !data) return Response.json({ error: 'Session not found' }, { status: 404 })
    return Response.json(data)
  } catch (err) {
    console.error('[training GET] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    // Resolve which AI + key to use (same logic as /api/chat)
    const aiClient = await resolveClient()
    if (aiClient.blocked) {
      return Response.json({ error: aiClient.blockMessage }, { status: 403 })
    }

    if (action === 'generate')        return handleGenerate(body, aiClient)
    if (action === 'generate_module') return handleGenerateModule(body, aiClient)
    if (action === 'update')          return handleUpdate(body)
    if (action === 'chat')            return handleChat(body, aiClient)
    if (action === 'get_terms')       return handleGetTerms(body, aiClient)

    return Response.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[training POST] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── Generate: check cache or produce module 1 only ──────────────────────────
async function handleGenerate(body: { topic: string; level: string }, aiClient: ResolvedClient) {
  const { topic, level } = body
  const topicNormalized = topic.trim().toLowerCase().replace(/\s+/g, ' ')
  const supabase = createServerSupabaseClient()

  try {
    const { data: cached } = await supabase
      .from('training_plans_cache')
      .select('*')
      .eq('topic_normalized', topicNormalized)
      .eq('level', level)
      .single()

    if (cached?.modules?.length >= TOTAL_MODULES) {
      supabase
        .from('training_plans_cache')
        .update({ use_count: (cached.use_count ?? 1) + 1, updated_at: new Date().toISOString() })
        .eq('id', cached.id)
        .then(() => {})

      const { data: session, error: sessionErr } = await supabase
        .from('training_sessions')
        .insert({ topic: cached.topic_display, level, modules: cached.modules, current_module: 0, completed_modules: [], chat_history: [] })
        .select()
        .single()

      if (sessionErr) {
        return Response.json({ id: null, topic: cached.topic_display, level, modules: cached.modules, current_module: 0, completed_modules: [], chat_history: [], fromCache: true })
      }
      return Response.json({ ...session, fromCache: true, enrolledCount: (cached.use_count ?? 1) + 1 })
    }
  } catch {
    // Cache miss — fall through
  }

  const module1 = await generateSingleModule(topic, level, 1, [], aiClient)
  if (!module1) return Response.json({ error: 'Failed to generate module' }, { status: 500 })

  const modules = [module1]
  try {
    const { data, error } = await supabase
      .from('training_sessions')
      .insert({ topic: topic.trim(), level, modules, current_module: 0, completed_modules: [], chat_history: [] })
      .select()
      .single()

    if (error) return Response.json({ id: null, topic, level, modules, current_module: 0, completed_modules: [], chat_history: [], fromCache: false })
    return Response.json({ ...data, fromCache: false })
  } catch {
    return Response.json({ id: null, topic, level, modules, current_module: 0, completed_modules: [], chat_history: [], fromCache: false })
  }
}

// ── Generate a single subsequent module ─────────────────────────────────────
async function handleGenerateModule(body: {
  topic: string; level: string; moduleNumber: number; previousTitles: string[]; sessionId?: string
}, aiClient: ResolvedClient) {
  const { topic, level, moduleNumber, previousTitles } = body
  if (moduleNumber < 1 || moduleNumber > TOTAL_MODULES) return Response.json({ error: 'Invalid module number' }, { status: 400 })
  const module = await generateSingleModule(topic, level, moduleNumber, previousTitles, aiClient)
  if (!module) return Response.json({ error: 'Failed to generate module' }, { status: 500 })
  return Response.json({ module })
}

// ── Core single-module generator ─────────────────────────────────────────────
async function generateSingleModule(
  topic: string, level: string, moduleNumber: number,
  previousTitles: string[], aiClient: ResolvedClient,
): Promise<TrainingModule | null> {
  const prevContext = previousTitles.length > 0
    ? `Previously covered modules: ${previousTitles.join(', ')}. Build on these — don't repeat topics.`
    : 'This is the introduction module — start with fundamentals.'

  const system = `You are an expert financial educator. Return ONLY a raw JSON object — no markdown fences, no explanation. The object must have exactly: { "title": string, "emoji": string, "content": string, "quiz": { "question": string, "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A"|"B"|"C"|"D", "explanation": string } }. Content must be 3 paragraphs separated by \\n\\n, each 2-3 sentences, using **bold** for key terms.`
  const userMessage = `Create module ${moduleNumber} of ${TOTAL_MODULES} for a ${level}-level course on: ${topic}. ${prevContext} Make it practical and specific to financial markets.`

  try {
    const rawText = await callAI(aiClient, system, userMessage, 1200)
    const cleaned = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    return JSON.parse(cleaned) as TrainingModule
  } catch (err) {
    console.error(`[training/generate_module] Error generating module ${moduleNumber}:`, err)
    return null
  }
}

// ── Update session (progress + optional new modules) ────────────────────────
async function handleUpdate(body: {
  sessionId: string; currentModule: number; completedModules: number[]
  chatHistory: Array<{ role: string; content: string }>; modules?: TrainingModule[]
  saveToCache?: { topic: string; level: string; topicNormalized: string }
}) {
  const { sessionId, currentModule, completedModules, chatHistory, modules, saveToCache } = body
  if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const updatePayload: Record<string, unknown> = {
      current_module: currentModule, completed_modules: completedModules,
      chat_history: chatHistory, updated_at: new Date().toISOString(),
    }
    if (modules !== undefined) updatePayload.modules = modules

    const { data, error } = await supabase
      .from('training_sessions').update(updatePayload).eq('id', sessionId).select().single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    if (saveToCache && modules && modules.length >= TOTAL_MODULES) {
      supabase.from('training_plans_cache').upsert({
        topic_normalized: saveToCache.topicNormalized, level: saveToCache.level,
        topic_display: saveToCache.topic, modules, use_count: 1, updated_at: new Date().toISOString(),
      }, { onConflict: 'topic_normalized,level' }).then(() => {})
    }

    return Response.json(data)
  } catch (err) {
    console.error('[training/update] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── Key terms glossary ───────────────────────────────────────────────────────
async function handleGetTerms(body: { content: string; level: string }, aiClient: ResolvedClient) {
  const { content, level } = body
  const system = `You are a financial educator helping a ${level}-level student. Extract industry-specific and technical terms from the provided lesson text and define each one in plain English. Return ONLY a raw JSON array — no markdown fences: [{ "term": string, "definition": string }]. Include 6-10 terms. Each definition must be 1-2 sentences, completely jargon-free, written as if explaining to someone with no finance background.`
  const rawText = await callAI(aiClient, system, `Extract and define the key industry terms from this lesson:\n\n${content}`, 1024)
  const cleaned = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  try {
    return Response.json({ terms: JSON.parse(cleaned) })
  } catch {
    return Response.json({ terms: [] })
  }
}

// ── Chat with tutor ──────────────────────────────────────────────────────────
async function handleChat(body: {
  sessionId: string; message: string; moduleTitle: string
  moduleContent: string; topic: string; level: string
  chatHistory: Array<{ role: string; content: string }>
}, aiClient: ResolvedClient) {
  const { message, moduleTitle, moduleContent, topic, level, chatHistory } = body
  const system = `You are an expert financial tutor. The student is studying '${moduleTitle}' in a course about '${topic}'. Their level is '${level}'. The lesson content: ${moduleContent.slice(0, 1000)}. Answer clearly in 3-5 sentences, using examples relevant to their level. If they ask something off-topic, briefly answer then connect it back to the lesson. Do NOT end with 'Ready to continue your lesson?' — just answer naturally.`
  const reply = await callAIChat(aiClient, system, chatHistory.slice(-10), message, 1024)
  return Response.json({ reply })
}
