import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
    if (!sessionId) {
      return Response.json({ error: 'sessionId required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error || !data) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

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

    if (action === 'generate') {
      return handleGenerate(body)
    } else if (action === 'generate_module') {
      return handleGenerateModule(body)
    } else if (action === 'update') {
      return handleUpdate(body)
    } else if (action === 'chat') {
      return handleChat(body)
    } else if (action === 'get_terms') {
      return handleGetTerms(body)
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[training POST] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── Generate: check cache or produce module 1 only ──────────────────────────
async function handleGenerate(body: { topic: string; level: string }) {
  const { topic, level } = body
  const topicNormalized = topic.trim().toLowerCase().replace(/\s+/g, ' ')
  const supabase = createServerSupabaseClient()

  // Check cache — if a full plan exists, serve it all at once
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

  // No cache — generate module 1 only (fast)
  const module1 = await generateSingleModule(topic, level, 1, [])
  if (!module1) {
    return Response.json({ error: 'Failed to generate module' }, { status: 500 })
  }

  const modules = [module1]

  // Create session
  try {
    const { data, error } = await supabase
      .from('training_sessions')
      .insert({ topic: topic.trim(), level, modules, current_module: 0, completed_modules: [], chat_history: [] })
      .select()
      .single()

    if (error) {
      return Response.json({ id: null, topic, level, modules, current_module: 0, completed_modules: [], chat_history: [], fromCache: false })
    }
    return Response.json({ ...data, fromCache: false })
  } catch {
    return Response.json({ id: null, topic, level, modules, current_module: 0, completed_modules: [], chat_history: [], fromCache: false })
  }
}

// ── Generate a single subsequent module ─────────────────────────────────────
async function handleGenerateModule(body: {
  topic: string
  level: string
  moduleNumber: number
  previousTitles: string[]
  sessionId?: string
}) {
  const { topic, level, moduleNumber, previousTitles, sessionId } = body

  if (moduleNumber < 1 || moduleNumber > TOTAL_MODULES) {
    return Response.json({ error: 'Invalid module number' }, { status: 400 })
  }

  const module = await generateSingleModule(topic, level, moduleNumber, previousTitles)
  if (!module) {
    return Response.json({ error: 'Failed to generate module' }, { status: 500 })
  }

  // If all modules are now done (caller tells us), save to cache
  if (moduleNumber === TOTAL_MODULES && sessionId) {
    // Caller will handle cache save via update action
  }

  return Response.json({ module })
}

// ── Core single-module generator ─────────────────────────────────────────────
async function generateSingleModule(
  topic: string,
  level: string,
  moduleNumber: number,
  previousTitles: string[]
): Promise<TrainingModule | null> {
  const prevContext = previousTitles.length > 0
    ? `Previously covered modules: ${previousTitles.join(', ')}. Build on these — don't repeat topics.`
    : 'This is the introduction module — start with fundamentals.'

  const systemPrompt = `You are an expert financial educator. Return ONLY a raw JSON object — no markdown fences, no explanation. The object must have exactly: { "title": string, "emoji": string, "content": string, "quiz": { "question": string, "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A"|"B"|"C"|"D", "explanation": string } }. Content must be 3 paragraphs separated by \\n\\n, each 2-3 sentences, using **bold** for key terms.`

  const userMessage = `Create module ${moduleNumber} of ${TOTAL_MODULES} for a ${level}-level course on: ${topic}. ${prevContext} Make it practical and specific to financial markets.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

    return JSON.parse(cleaned) as TrainingModule
  } catch (err) {
    console.error(`[training/generate_module] Error generating module ${moduleNumber}:`, err)
    return null
  }
}

// ── Update session (progress + optional new modules) ────────────────────────
async function handleUpdate(body: {
  sessionId: string
  currentModule: number
  completedModules: number[]
  chatHistory: Array<{ role: string; content: string }>
  modules?: TrainingModule[]
  saveToCache?: { topic: string; level: string; topicNormalized: string }
}) {
  const { sessionId, currentModule, completedModules, chatHistory, modules, saveToCache } = body

  if (!sessionId) {
    return Response.json({ error: 'sessionId required' }, { status: 400 })
  }

  try {
    const supabase = createServerSupabaseClient()

    const updatePayload: Record<string, unknown> = {
      current_module: currentModule,
      completed_modules: completedModules,
      chat_history: chatHistory,
      updated_at: new Date().toISOString(),
    }
    if (modules !== undefined) {
      updatePayload.modules = modules
    }

    const { data, error } = await supabase
      .from('training_sessions')
      .update(updatePayload)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('[training/update] Supabase error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Save full plan to cache when all modules are done
    if (saveToCache && modules && modules.length >= TOTAL_MODULES) {
      supabase
        .from('training_plans_cache')
        .upsert({
          topic_normalized: saveToCache.topicNormalized,
          level: saveToCache.level,
          topic_display: saveToCache.topic,
          modules,
          use_count: 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'topic_normalized,level' })
        .then(() => {})
    }

    return Response.json(data)
  } catch (err) {
    console.error('[training/update] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── Key terms glossary ───────────────────────────────────────────────────────
async function handleGetTerms(body: { content: string; level: string }) {
  const { content, level } = body

  const systemPrompt = `You are a financial educator helping a ${level}-level student. Extract industry-specific and technical terms from the provided lesson text and define each one in plain English. Return ONLY a raw JSON array — no markdown fences: [{ "term": string, "definition": string }]. Include 6-10 terms. Each definition must be 1-2 sentences, completely jargon-free, written as if explaining to someone with no finance background.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: `Extract and define the key industry terms from this lesson:\n\n${content}` }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

  try {
    const terms = JSON.parse(cleaned)
    return Response.json({ terms })
  } catch {
    return Response.json({ terms: [] })
  }
}

// ── Chat with tutor ──────────────────────────────────────────────────────────
async function handleChat(body: {
  sessionId: string
  message: string
  moduleTitle: string
  moduleContent: string
  topic: string
  level: string
  chatHistory: Array<{ role: string; content: string }>
}) {
  const { message, moduleTitle, moduleContent, topic, level, chatHistory } = body

  const systemPrompt = `You are an expert financial tutor. The student is studying '${moduleTitle}' in a course about '${topic}'. Their level is '${level}'. The lesson content: ${moduleContent.slice(0, 1000)}. Answer clearly in 3-5 sentences, using examples relevant to their level. If they ask something off-topic, briefly answer then connect it back to the lesson. Do NOT end with 'Ready to continue your lesson?' — just answer naturally.`

  const recentHistory = chatHistory.slice(-10)
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...recentHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: message },
  ]

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  const reply = response.content[0].type === 'text' ? response.content[0].text : ''
  return Response.json({ reply })
}
