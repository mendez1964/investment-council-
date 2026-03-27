import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { getSystemPrompt, getRelevantKnowledge, getRelevantPineKnowledge } from '@/lib/knowledge-base'
import { fetchLiveData } from '@/lib/live-data'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

// Investment Council's own Claude key — used only during 24h grace period
const ic_anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type AIProvider = 'claude' | 'chatgpt' | 'gemini' | 'grok'

const OPENAI_CONFIGS: Record<string, { baseURL?: string; model: string; inputCostPer1M: number; outputCostPer1M: number }> = {
  chatgpt: { model: 'gpt-4o',           inputCostPer1M: 2.50,  outputCostPer1M: 10.00 },
  gemini:  { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-2.0-flash', inputCostPer1M: 0.075, outputCostPer1M: 0.30 },
  grok:    { baseURL: 'https://api.x.ai/v1', model: 'grok-2-latest', inputCostPer1M: 2.00, outputCostPer1M: 10.00 },
}

function streamText(text: string): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text))
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}

export async function POST(request: Request) {
  try {
    const { messages, locale } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
      es: 'IMPORTANT: Respond entirely in Spanish (Español). Keep all ticker symbols (SPY, QQQ, AAPL, BTC, etc.), financial metric abbreviations (P/E, EPS, ROE, ATH, etc.), and numerical data in their standard form — do not translate tickers or metric labels. All prose, headings, analysis, and explanations must be in Spanish.',
      pt: 'IMPORTANT: Respond entirely in Portuguese (Português). Keep all ticker symbols, financial metric abbreviations, and numerical data in their standard form — do not translate tickers or metric labels. All prose, headings, analysis, and explanations must be in Portuguese.',
      fr: 'IMPORTANT: Respond entirely in French (Français). Keep all ticker symbols, financial metric abbreviations, and numerical data in their standard form — do not translate tickers or metric labels. All prose, headings, analysis, and explanations must be in French.',
    }
    const languageInstruction = LANGUAGE_INSTRUCTIONS[locale] ?? ''

    // ── Resolve which AI + key to use ─────────────────────────────────────────
    let aiProvider: AIProvider = 'claude'
    let userApiKey: string | null = null
    let useICKey = false

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
        aiProvider = preferred

        const keyMap: Record<AIProvider, string | null> = {
          claude:  profile?.anthropic_key ?? null,
          chatgpt: profile?.openai_key    ?? null,
          gemini:  profile?.gemini_key    ?? null,
          grok:    profile?.grok_key      ?? null,
        }
        userApiKey = keyMap[preferred]

        // Admin owner and admin-granted employees always use IC key (no expiry)
        const isAdmin = user.email === process.env.ADMIN_EMAIL || user.email === 'mendezdag@gmail.com'
        const isAdminGranted = !profile?.stripe_customer_id && (profile?.tier === 'trader' || profile?.tier === 'pro')

        if (userApiKey) {
          // User has their own key — use it
          useICKey = false
        } else if (isAdmin || isAdminGranted) {
          // Owner or admin-granted employee — use IC key, never expires
          aiProvider = 'claude'
          useICKey = true
        } else {
          // Check 24-hour grace period from signup
          const signupTime = new Date(user.created_at).getTime()
          const gracePeriodEnds = signupTime + 24 * 60 * 60 * 1000
          const inGracePeriod = Date.now() < gracePeriodEnds

          if (inGracePeriod) {
            // Grace period: fall back to IC Claude key
            aiProvider = 'claude'
            useICKey = true
          } else {
            // Trial expired — block and prompt to add own key
            return streamText(
              `**Your 24-hour free trial has ended.**\n\nTo continue using the Investment Council AI chat, add your own API key in **Profile → Your API Keys**.\n\n**Where to get your key:**\n- **Claude** — console.anthropic.com\n- **ChatGPT** — platform.openai.com/api-keys\n- **Gemini** — aistudio.google.com/apikey\n- **Grok** — console.x.ai\n\nYour keys are stored encrypted and never shared. Once added, you get unlimited queries using your own account.`
            )
          }
        }
      } else {
        // Not authenticated
        useICKey = true
      }
    } catch (err) {
      console.error('[auth-check] failed:', (err as Error).message)
      useICKey = true
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Get the latest user message
    const latestUserMessage = messages
      .filter((m: { role: string }) => m.role === 'user')
      .at(-1)?.content || ''

    // Load knowledge base + system prompt in parallel
    const [knowledgeBase, pineKnowledge, systemPrompt] = await Promise.all([
      Promise.resolve(getRelevantKnowledge(latestUserMessage)),
      Promise.resolve(getRelevantPineKnowledge(latestUserMessage)),
      Promise.resolve(getSystemPrompt()),
    ])

    // Current date/time
    const now = new Date()
    const reportDate = now.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    })

    // Fetch live market data
    const needsLiveData = /\b(quote|price|stock|ticker|etf|crypto|btc|eth|sol|market|briefing|analysis|analyze|fundamentals|earnings|sector|movers|scan|report|watchlist|portfolio|nvda|aapl|tsla|spy|qqq|msft|amzn|googl|meta|nflx|option|call|put|strike|expiry|0dte|chain|delta|gamma|theta|implied|fall|drop|rise|surge|crash|rally|target|predict|forecast|outlook|direction|trend|support|resistance|level|short|long|bullish|bearish|buy|sell|trade|hold|move|how far|smci|pltr|crwd|coin|mstr|hood|sofi|rivn|arm)\b/i.test(latestUserMessage)

    let liveData = ''
    try {
      const isScan = /council\s*scan|full\s*scan|run\s*(all|the|council)?\s*scan|(tudor(\s+jones)?|livermore|buffett|lynch|graham|grantham|dalio|burry|roubini)\s+scan/i.test(latestUserMessage)
      const timeoutMs = isScan ? 30000 : 8000
      const timeout = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('live-data timeout')), timeoutMs)
      )
      liveData = await Promise.race([fetchLiveData(latestUserMessage), timeout])
      console.log('[live-data] fetched, length:', liveData.length)
    } catch (err) {
      console.error('[live-data] failed:', (err as Error).message)
    }

    // Inject news context — always for any financial question, not just briefings
    if (needsLiveData) {
      try {
        const { createServerSupabaseClient: getDB } = await import('@/lib/supabase')
        const db = getDB()
        const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString() // 72h window
        // Pull all high/medium news + any news specifically affecting detected tickers
        const { data: newsItems } = await db
          .from('market_news')
          .select('headline, summary, impact_level, impact_direction, affected_tickers, source, price_impact_est')
          .gte('created_at', cutoff)
          .eq('is_price_moving', true)
          .in('impact_level', ['high', 'medium'])
          .order('created_at', { ascending: false })
          .limit(20)
        if (newsItems && newsItems.length > 0) {
          const newsBlock = newsItems.map(n =>
            `[${n.impact_level?.toUpperCase()} / ${n.impact_direction}] ${n.affected_tickers?.join(', ') ?? ''}: ${n.headline} — ${n.summary}${n.price_impact_est ? ` (est. ${n.price_impact_est})` : ''}`
          ).join('\n')
          liveData += `\n\n## MARKET NEWS (last 72h — high/medium impact)\n${newsBlock}`
          console.log(`[news-context] injected ${newsItems.length} items`)
        }
      } catch (err) {
        console.error('[news-context] failed:', (err as Error).message)
      }
    }

    if (needsLiveData && !liveData.trim()) {
      return streamText(
        `**Report blocked — no live market data available**\n\nThe live market data feed returned nothing for this query. To avoid running a report on stale data, this request was not sent to the AI.\n\n**What to try:**\n- Wait a moment and try again\n- Check that the market data feed is connected\n- Try a different ticker or rephrase the query`
      )
    }

    // Build shared content pieces
    const kbParts: string[] = []
    if (knowledgeBase.length > 0) {
      kbParts.push(`# LOADED KNOWLEDGE BASE CONTEXT\nThe following framework files are loaded for this query. Draw from them directly in your analysis:\n${knowledgeBase}`)
    }
    if (pineKnowledge.length > 0) {
      kbParts.push(`# PINE SCRIPT v6 DOCUMENTATION — loaded from local knowledge base\nUse these exact docs to write or review Pine Script. Do not guess syntax — use what is documented here.\n${pineKnowledge}`)
    }

    const liveAndReminder = `REPORT DATE/TIME: ${reportDate}\n\n${liveData}\n\nRemember: Always include the report date (${reportDate}) at the top of any analysis or report. Use exact numbers from live data above. Include risk considerations on trade analysis. End substantive analyses with the disclaimer that this is for educational purposes only and is not financial advice. Do NOT invoke council member perspectives unless the user explicitly asked for them.${languageInstruction ? `\n\n${languageInstruction}` : ''}`

    const encoder = new TextEncoder()

    // ── Claude (Anthropic SDK — supports prompt caching) ─────────────────────
    if (aiProvider === 'claude') {
      const anthropicClient = useICKey
        ? ic_anthropic
        : new Anthropic({ apiKey: userApiKey! })

      const systemBlocks: Anthropic.Messages.TextBlockParam[] = []

      systemBlocks.push({
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      } as Anthropic.Messages.TextBlockParam)

      if (kbParts.length > 0) {
        systemBlocks.push({
          type: 'text',
          text: kbParts.join('\n\n'),
          cache_control: { type: 'ephemeral' },
        } as Anthropic.Messages.TextBlockParam)
      }

      systemBlocks.push({ type: 'text', text: liveAndReminder })

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const anthropicStream = await (anthropicClient.messages.create as any)({
              model: 'claude-sonnet-4-6',
              max_tokens: 4096,
              system: systemBlocks,
              messages: messages.map((m: { role: string; content: string }) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              })),
              stream: true,
            })

            let inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheWriteTokens = 0

            for await (const chunk of anthropicStream) {
              if (chunk.type === 'message_start') {
                const usage = chunk.message.usage as any
                inputTokens     = usage?.input_tokens                   ?? 0
                cacheReadTokens = usage?.cache_read_input_tokens        ?? 0
                cacheWriteTokens = usage?.cache_creation_input_tokens   ?? 0
              } else if (chunk.type === 'message_delta') {
                outputTokens = (chunk.usage as any)?.output_tokens ?? 0
              } else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                controller.enqueue(encoder.encode(chunk.delta.text))
              }
            }

            const cost =
              (inputTokens      / 1_000_000) * 3.00 +
              (cacheWriteTokens / 1_000_000) * 3.75 +
              (cacheReadTokens  / 1_000_000) * 0.30 +
              (outputTokens     / 1_000_000) * 15.00

            console.log(`[claude] in:${inputTokens} cacheWrite:${cacheWriteTokens} cacheRead:${cacheReadTokens} out:${outputTokens} cost:$${cost.toFixed(5)} ic:${useICKey}`)

            const usageMarker = `\x00[USAGE:${JSON.stringify({ inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, cost })}]`
            controller.enqueue(encoder.encode(usageMarker))
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        },
      })

      return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
      })
    }

    // ── ChatGPT / Gemini / Grok (OpenAI-compatible SDK) ──────────────────────
    const config = OPENAI_CONFIGS[aiProvider]
    const openaiClient = new OpenAI({
      apiKey: userApiKey!,
      ...(config.baseURL ? { baseURL: config.baseURL } : {}),
    })

    const systemText = [systemPrompt, ...kbParts, liveAndReminder].join('\n\n')

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const openaiStream = await openaiClient.chat.completions.create({
            model: config.model,
            max_tokens: 4096,
            stream: true,
            stream_options: { include_usage: true },
            messages: [
              { role: 'system', content: systemText },
              ...messages.map((m: { role: string; content: string }) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              })),
            ],
          })

          let inputTokens = 0, outputTokens = 0

          for await (const chunk of openaiStream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) controller.enqueue(encoder.encode(text))
            if (chunk.usage) {
              inputTokens  = chunk.usage.prompt_tokens     ?? 0
              outputTokens = chunk.usage.completion_tokens ?? 0
            }
          }

          const cost =
            (inputTokens  / 1_000_000) * config.inputCostPer1M +
            (outputTokens / 1_000_000) * config.outputCostPer1M

          console.log(`[${aiProvider}] in:${inputTokens} out:${outputTokens} cost:$${cost.toFixed(5)}`)

          const usageMarker = `\x00[USAGE:${JSON.stringify({ inputTokens, outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0, cost })}]`
          controller.enqueue(encoder.encode(usageMarker))
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
