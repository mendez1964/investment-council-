import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { getSystemPrompt, getRelevantKnowledge, getRelevantPineKnowledge } from '@/lib/knowledge-base'
import { fetchLiveData } from '@/lib/live-data'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'
import { logApiUsage } from '@/lib/analytics'

// Investment Council's own Claude key — used only during 24h grace period
const ic_anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type AIProvider = 'claude' | 'chatgpt' | 'gemini' | 'grok'

const OPENAI_CONFIGS: Record<string, { baseURL?: string; model: string; inputCostPer1M: number; outputCostPer1M: number }> = {
  chatgpt: { model: 'gpt-4o',           inputCostPer1M: 2.50,  outputCostPer1M: 10.00 },
  gemini:  { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-2.0-flash', inputCostPer1M: 0.075, outputCostPer1M: 0.30 },
  grok:    { baseURL: 'https://api.x.ai/v1', model: 'grok-3', inputCostPer1M: 3.00, outputCostPer1M: 15.00 },
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

    // ── Fetch all context in parallel ────────────────────────────────────────
    const db = createServerSupabaseClient()
    const today = new Date().toISOString().split('T')[0]
    const msg = latestUserMessage.toLowerCase()

    const isScan = /council\s*scan|full\s*scan|run\s*(all|the|council)?\s*scan|(tudor(\s+jones)?|livermore|buffett|lynch|graham|grantham|dalio|burry|roubini)\s+scan/i.test(latestUserMessage)
    const timeoutMs = isScan ? 30000 : 8000

    // Intent flags
    const wantsOptions   = /option|0dte|odte|call|put|strike|expir|contract|premium|greeks?|delta|gamma|theta/i.test(msg)
    const wantsPicks     = /pick|recommend|trade idea|best stock|best crypto|what.*buy|what.*trade|top pick|today.*pick|pick.*today/i.test(msg)
    const wantsBattle    = /war|battle|ai vs|which ai|best ai|battle room/i.test(msg)
    const wantsAlerts    = /alert|guardian|risk|protect|warn|danger/i.test(msg)
    const wantsATSignals = /agentic.?trader|at signal|crypto signal|\b(btc|eth|sol|crypto)\b/i.test(msg)

    const [liveDataRaw, internalData, newsData] = await Promise.all([
      // 1. Live external market data (Finnhub, CoinGecko, FRED, etc.)
      Promise.race([
        fetchLiveData(latestUserMessage),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
      ]).catch((err) => { console.error('[live-data] failed:', err.message); return '' }),

      // 2. Internal IC data from Supabase
      (async () => {
        const sections: string[] = []
        const tasks: Promise<void>[] = []

        if (wantsOptions) {
          tasks.push(
            Promise.resolve(
              db.from('ai_options_picks')
                .select('underlying, option_type, strike, expiry, entry_premium, confidence, rationale, catalyst, outcome')
                .eq('pick_date', today)
                .order('confidence', { ascending: false })
            ).then(({ data }: any) => {
              if (!data?.length) return
              const daily  = data.filter((p: any) => p.expiry === today)
              const weekly = data.filter((p: any) => p.expiry !== today)
              if (daily.length) {
                sections.push(`IC 0DTE OPTIONS PICKS — Today (${today}):\n` +
                  daily.map((p: any) =>
                    `  ${p.underlying} ${p.option_type.toUpperCase()} $${p.strike} exp:${p.expiry} | conf:${p.confidence}/10 | entry:$${p.entry_premium ?? '—'}\n  Rationale: ${p.rationale}\n  Catalyst: ${p.catalyst}`
                  ).join('\n'))
              }
              if (weekly.length) {
                sections.push(`IC WEEKLY OPTIONS PICKS:\n` +
                  weekly.map((p: any) =>
                    `  ${p.underlying} ${p.option_type.toUpperCase()} $${p.strike} exp:${p.expiry} | conf:${p.confidence}/10 | entry:$${p.entry_premium ?? '—'}\n  Rationale: ${p.rationale}`
                  ).join('\n'))
              }
            }).catch(() => {})
          )
        }

        if (wantsPicks || /best trade|trade today|stock.*today|today.*stock/i.test(msg)) {
          tasks.push(
            Promise.resolve(
              db.from('ai_picks')
                .select('symbol, type, bias, confidence, rationale, catalyst, pick_date, entry_price')
                .eq('pick_date', today)
                .order('confidence', { ascending: false })
                .limit(10)
            ).then(({ data }: any) => {
              if (!data?.length) return
              const stocks = data.filter((p: any) => p.type === 'stock')
              const crypto = data.filter((p: any) => p.type === 'crypto')
              if (stocks.length) {
                sections.push(`IC STOCK PICKS — Today (${today}):\n` +
                  stocks.map((p: any) =>
                    `  ${p.symbol} — ${p.bias.toUpperCase()} | conf:${p.confidence}/10${p.entry_price ? ` | entry:$${p.entry_price}` : ''}\n  ${p.rationale}\n  Catalyst: ${p.catalyst}`
                  ).join('\n'))
              }
              if (crypto.length) {
                sections.push(`IC CRYPTO PICKS — Today (${today}):\n` +
                  crypto.map((p: any) =>
                    `  ${p.symbol} — ${p.bias.toUpperCase()} | conf:${p.confidence}/10${p.entry_price ? ` | entry:$${p.entry_price}` : ''}\n  ${p.rationale}\n  Catalyst: ${p.catalyst}`
                  ).join('\n'))
              }
            }).catch(() => {})
          )
        }

        if (wantsBattle) {
          tasks.push(
            Promise.resolve(
              db.from('battle_picks')
                .select('*')
                .eq('pick_date', today)
                .order('created_at', { ascending: false })
                .limit(12)
            ).then(({ data }: any) => {
              if (!data?.length) return
              sections.push(`WAR ROOM — Today's AI Battle Picks (${today}):\n` +
                data.map((p: any) =>
                  `  ${(p.ai_name ?? '').toUpperCase()} → ${p.symbol} ${p.bias?.toUpperCase() ?? ''} | conf:${p.confidence}/10 | ${(p.rationale ?? '').slice(0, 200)}`
                ).join('\n'))
            }).catch(() => {})
          )
        }

        if (wantsAlerts) {
          const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          tasks.push(
            Promise.resolve(
              db.from('guardian_alerts')
                .select('ticker, alert_type, message, severity, created_at')
                .gte('created_at', cutoff24h)
                .order('created_at', { ascending: false })
                .limit(10)
            ).then(({ data }: any) => {
              if (!data?.length) return
              sections.push(`GUARDIAN ALERTS — Last 24h:\n` +
                data.map((p: any) =>
                  `  [${(p.severity ?? '').toUpperCase()}] ${p.ticker}: ${p.message}`
                ).join('\n'))
            }).catch(() => {})
          )
        }

        if (wantsATSignals) {
          tasks.push(
            Promise.resolve(
              db.from('at_signals')
                .select('symbol, signal, confidence, price, rationale, created_at')
                .order('created_at', { ascending: false })
                .limit(10)
            ).then(({ data }: any) => {
              if (!data?.length) return
              sections.push(`AGENTIC TRADER SIGNALS — Latest:\n` +
                data.map((p: any) =>
                  `  ${p.symbol}: ${p.signal} | conf:${p.confidence}%${p.price ? ` | $${p.price}` : ''} | ${(p.rationale ?? '').slice(0, 120)}`
                ).join('\n'))
            }).catch(() => {})
          )
        }

        await Promise.all(tasks)
        if (!sections.length) return ''
        return `\n\n# IC INTERNAL DATA — from your Investment Council database\n${sections.join('\n\n')}`
      })(),

      // 3. Market news from Supabase (always inject)
      (async () => {
        try {
          const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
          const { data: newsItems } = await db
            .from('market_news')
            .select('headline, summary, impact_level, impact_direction, affected_tickers, price_impact_est')
            .gte('created_at', cutoff)
            .eq('is_price_moving', true)
            .in('impact_level', ['high', 'medium'])
            .order('created_at', { ascending: false })
            .limit(20)
          if (!newsItems?.length) return ''
          const block = newsItems.map((n: any) =>
            `[${n.impact_level?.toUpperCase()} / ${n.impact_direction}] ${n.affected_tickers?.join(', ') ?? ''}: ${n.headline} — ${n.summary}${n.price_impact_est ? ` (est. ${n.price_impact_est})` : ''}`
          ).join('\n')
          console.log(`[news-context] injected ${newsItems.length} items`)
          return `\n\n## MARKET NEWS (last 72h — high/medium impact)\n${block}`
        } catch { return '' }
      })(),
    ])

    console.log('[live-data] fetched, length:', liveDataRaw.length)

    let liveData = liveDataRaw + internalData + newsData

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

            logApiUsage(createServerSupabaseClient(), {
              apiName: 'claude',
              endpoint: '/api/chat',
              tokensInput: inputTokens,
              tokensOutput: outputTokens,
              costUsd: cost,
              success: true,
              metadata: { ic_key: useICKey, cache_read: cacheReadTokens, cache_write: cacheWriteTokens },
            })
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

          logApiUsage(createServerSupabaseClient(), {
            apiName: aiProvider,
            endpoint: '/api/chat',
            tokensInput: inputTokens,
            tokensOutput: outputTokens,
            costUsd: cost,
            success: true,
          })
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
