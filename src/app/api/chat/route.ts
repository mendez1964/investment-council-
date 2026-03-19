import Anthropic from '@anthropic-ai/sdk'
import { getSystemPrompt, getRelevantKnowledge } from '@/lib/knowledge-base'
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
    const [knowledgeBase, systemPrompt] = await Promise.all([
      Promise.resolve(getRelevantKnowledge(latestUserMessage)),
      Promise.resolve(getSystemPrompt()),
    ])

    let liveData = ''
    try {
      // Scans fetch 10+ stock overviews — allow up to 30s; regular queries get 8s
      const isScan = /council\s*scan|full\s*scan|run\s*(all|the|council)?\s*scan|(tudor|livermore|buffett|lynch|graham|grantham|dalio|burry|roubini)\s*scan/i.test(latestUserMessage)
      const timeoutMs = isScan ? 30000 : 8000
      const timeout = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('live-data timeout')), timeoutMs)
      )
      liveData = await Promise.race([fetchLiveData(latestUserMessage), timeout])
      console.log('[live-data] fetched, length:', liveData.length)
    } catch (err) {
      console.error('[live-data] failed:', (err as Error).message)
    }

    const fullSystemPrompt = `${systemPrompt}

${knowledgeBase.length > 0 ? `\n\n# LOADED KNOWLEDGE BASE CONTEXT\nThe following framework files are loaded for this query. Draw from them directly in your analysis:\n${knowledgeBase}` : ''}
${liveData}

Remember: Always identify which framework you are drawing from. Always include risk considerations. Always end substantive analyses with the disclaimer that this is for educational purposes only and is not financial advice.`

    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: fullSystemPrompt,
            messages: messages.map((m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
            stream: true,
          })

          for await (const chunk of anthropicStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const text = chunk.delta.text
              controller.enqueue(encoder.encode(text))
            }
          }
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
