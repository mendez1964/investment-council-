import Anthropic from '@anthropic-ai/sdk'
import { getSystemPrompt, getRelevantKnowledge, getRelevantPineKnowledge } from '@/lib/knowledge-base'
import { fetchLiveData } from '@/lib/live-data'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

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
    const liveAndReminder = `${liveData}\n\nRemember: Use exact numbers from live data above. Include risk considerations on trade analysis. End substantive analyses with the disclaimer that this is for educational purposes only and is not financial advice. Do NOT invoke council member perspectives unless the user explicitly asked for them.`
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
