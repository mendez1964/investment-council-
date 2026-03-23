import Anthropic from '@anthropic-ai/sdk'
import { getSystemPrompt, getRelevantKnowledge, getRelevantPineKnowledge } from '@/lib/knowledge-base'
import { fetchLiveData } from '@/lib/live-data'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const FREE_DAILY_LIMIT = 5

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
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    // ── Tier & query-count enforcement ────────────────────────────────────────
    try {
      const authClient = createServerSupabaseClientAuth()
      const { data: { user } } = await authClient.auth.getUser()

      if (user) {
        const db = createServerSupabaseClient()
        const { data: profile } = await db
          .from('profiles')
          .select('tier, query_count_today, query_reset_date')
          .eq('id', user.id)
          .single()

        if (profile) {
          const today = new Date().toISOString().split('T')[0]
          const isNewDay = profile.query_reset_date !== today

          // Reset count if it's a new day
          if (isNewDay) {
            await db.from('profiles').update({
              query_count_today: 0,
              query_reset_date: today,
            }).eq('id', user.id)
            profile.query_count_today = 0
          }

          // Enforce free tier limit
          if (profile.tier === 'free' && profile.query_count_today >= FREE_DAILY_LIMIT) {
            return streamText(
              `**Daily limit reached**\n\nFree accounts are limited to ${FREE_DAILY_LIMIT} queries per day. You've used all ${FREE_DAILY_LIMIT} today.\n\n**Upgrade to Trader ($29.99/mo)** for unlimited queries, all frameworks, AI daily picks, and email alerts.\n\nYour limit resets at midnight.`
            )
          }

          // Increment query count
          await db.from('profiles').update({
            query_count_today: (profile.query_count_today ?? 0) + 1,
            query_reset_date: today,
          }).eq('id', user.id)
        }
      }
    } catch (err) {
      // Don't block the request if tier check fails
      console.error('[tier-check] failed:', (err as Error).message)
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Get the latest user message
    const latestUserMessage = messages
      .filter((m: { role: string }) => m.role === 'user')
      .at(-1)?.content || ''

    // Load relevant knowledge base content and live market data in parallel
    const [knowledgeBase, pineKnowledge, systemPrompt] = await Promise.all([
      Promise.resolve(getRelevantKnowledge(latestUserMessage)),
      Promise.resolve(getRelevantPineKnowledge(latestUserMessage)),
      Promise.resolve(getSystemPrompt()),
    ])

    // Current date/time stamped on every request
    const now = new Date()
    const reportDate = now.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    })

    // Detect queries that REQUIRE live market data to be useful
    const needsLiveData = /\b(quote|price|stock|ticker|etf|crypto|btc|eth|sol|market|briefing|analysis|analyze|fundamentals|earnings|sector|movers|scan|report|watchlist|portfolio|nvda|aapl|tsla|spy|qqq|msft|amzn|googl|meta|nflx)\b/i.test(latestUserMessage)

    let liveData = ''
    try {
      // Scans fetch 10+ stock overviews — allow up to 30s; regular queries get 8s
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

    // Block the API call if live data is needed but unavailable — saves cost
    if (needsLiveData && !liveData.trim()) {
      const msg = `**Report blocked — no live market data available**\n\nThe live market data feed returned nothing for this query. To avoid running a report on stale data, this request was not sent to the AI.\n\n**What to try:**\n- Wait a moment and try again\n- Check that the market data feed is connected\n- Try a different ticker or rephrase the query`
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(msg))
          controller.close()
        },
      })
      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    }

    // Build system prompt as an array of blocks with cache_control markers.
    // Anthropic caches everything UP TO AND INCLUDING a block marked cache_control.
    // Strategy:
    //   Block 1 — base system prompt       → cached (never changes)
    //   Block 2 — knowledge base files     → cached (same content for similar questions)
    //   Block 3 — live data + reminder     → NOT cached (changes every request)
    const systemBlocks: Anthropic.Messages.TextBlockParam[] = []

    // Block 1: base system prompt — always the same, always cache it
    systemBlocks.push({
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' },
    } as Anthropic.Messages.TextBlockParam)

    // Block 2: knowledge base — cache when present (big files, expensive to re-send)
    const kbParts: string[] = []
    if (knowledgeBase.length > 0) {
      kbParts.push(`# LOADED KNOWLEDGE BASE CONTEXT\nThe following framework files are loaded for this query. Draw from them directly in your analysis:\n${knowledgeBase}`)
    }
    if (pineKnowledge.length > 0) {
      kbParts.push(`# PINE SCRIPT v6 DOCUMENTATION — loaded from local knowledge base\nUse these exact docs to write or review Pine Script. Do not guess syntax — use what is documented here.\n${pineKnowledge}`)
    }
    if (kbParts.length > 0) {
      systemBlocks.push({
        type: 'text',
        text: kbParts.join('\n\n'),
        cache_control: { type: 'ephemeral' },
      } as Anthropic.Messages.TextBlockParam)
    }

    // Block 3: live data + closing reminder — NOT cached (fresh every request)
    const liveAndReminder = `REPORT DATE/TIME: ${reportDate}\n\n${liveData}\n\nRemember: Always include the report date (${reportDate}) at the top of any analysis or report. Use exact numbers from live data above. Include risk considerations on trade analysis. End substantive analyses with the disclaimer that this is for educational purposes only and is not financial advice. Do NOT invoke council member perspectives unless the user explicitly asked for them.`
    systemBlocks.push({
      type: 'text',
      text: liveAndReminder,
    })

    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = await (client.messages.create as any)({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: systemBlocks,
            messages: messages.map((m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
            stream: true,
          })

          let inputTokens = 0
          let outputTokens = 0
          let cacheReadTokens = 0
          let cacheWriteTokens = 0

          for await (const chunk of anthropicStream) {
            if (chunk.type === 'message_start') {
              const usage = chunk.message.usage as any
              inputTokens = usage?.input_tokens ?? 0
              cacheReadTokens = usage?.cache_read_input_tokens ?? 0
              cacheWriteTokens = usage?.cache_creation_input_tokens ?? 0
            } else if (chunk.type === 'message_delta') {
              outputTokens = (chunk.usage as any)?.output_tokens ?? 0
            } else if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }

          // Sonnet 4.6 pricing:
          //   Input (regular):  $3.00 / 1M
          //   Cache write:      $3.75 / 1M  (25% premium to store)
          //   Cache read:       $0.30 / 1M  (90% discount vs regular)
          //   Output:          $15.00 / 1M
          const cost =
            (inputTokens / 1_000_000) * 3.00 +
            (cacheWriteTokens / 1_000_000) * 3.75 +
            (cacheReadTokens / 1_000_000) * 0.30 +
            (outputTokens / 1_000_000) * 15.00

          console.log(`[usage] in:${inputTokens} cacheWrite:${cacheWriteTokens} cacheRead:${cacheReadTokens} out:${outputTokens} cost:$${cost.toFixed(5)}`)

          // Send usage as a hidden marker so the frontend can track cost
          const usageMarker = `\x00[USAGE:${JSON.stringify({ inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, cost })}]`
          controller.enqueue(encoder.encode(usageMarker))
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
