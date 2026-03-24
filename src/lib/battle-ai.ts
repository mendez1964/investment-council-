import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface BattlePickResult {
  symbol: string        // stock ticker or crypto symbol
  bias: string          // 'bullish' | 'bearish' | 'call' | 'put'
  confidence: number    // 1-10
  rationale: string
  catalyst: string
  target_pct: number    // % move target (e.g., 2.5 = 2.5%)
  stop_pct: number      // % stop loss
}

// Each AI has a distinct personality prompt. Claude currently powers all three.
// To swap in real APIs: replace the body of generateWithChatGPT or generateWithGemini.

const AI_PERSONAS: Record<string, string> = {
  claude: `You are Claude, Anthropic's AI. You use the IC Formula — a rigorous 5-factor quantitative scoring system. You favor technically confirmed setups with clear catalysts. You reject anything without data backing. Disciplined, precise, systematic.`,
  chatgpt: `You are ChatGPT, OpenAI's AI. You combine fundamental analysis with momentum signals. You look for earnings catalysts, analyst sentiment shifts, and macro tailwinds. You lean slightly more bullish than peers, favor growth narratives, and excel at reading market psychology.`,
  gemini: `You are Gemini, Google's AI. You use pattern recognition and multi-timeframe analysis. You excel at sector rotation signals, institutional flow patterns, and identifying where smart money is moving. You're data-driven but also factor in narrative strength.`,
}

const CATEGORY_INSTRUCTIONS: Record<string, string> = {
  stock: `Pick ONE stock (or ETF) from SPY/QQQ/IWM components. Give bullish or bearish bias. Pick the absolute highest conviction play today. Liquid tickers only.`,
  crypto: `Pick ONE cryptocurrency. Give bullish or bearish bias. BTC and ETH must be considered first. No meme coins without genuine catalyst.`,
  option: `Pick ONE 0DTE options trade (expires today). Give call or put. Use only: SPY, QQQ, AAPL, NVDA, TSLA, META, AMZN, MSFT, AMD, GLD. Must have a same-day catalyst.`,
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })
  return res.content[0].type === 'text' ? res.content[0].text : ''
}

// ── PLUG IN REAL APIS HERE WHEN KEYS ARE AVAILABLE ────────────────────────────

async function generateWithChatGPT(category: string, liveData: string): Promise<string> {
  // TODO: Replace with real OpenAI call when OPENAI_API_KEY is set:
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  // const res = await openai.chat.completions.create({ model: 'gpt-4o', ... })
  // For now: Claude plays ChatGPT role
  return callClaude(
    `${AI_PERSONAS.chatgpt}\n\nLIVE MARKET DATA:\n${liveData}`,
    `${CATEGORY_INSTRUCTIONS[category]}\n\nRespond ONLY with raw JSON: {"symbol":"X","bias":"bullish","confidence":8,"rationale":"...","catalyst":"...","target_pct":2.5,"stop_pct":1.5}`
  )
}

async function generateWithGemini(category: string, liveData: string): Promise<string> {
  // TODO: Replace with real Gemini call when GEMINI_API_KEY is set:
  // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  // const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
  // For now: Claude plays Gemini role
  return callClaude(
    `${AI_PERSONAS.gemini}\n\nLIVE MARKET DATA:\n${liveData}`,
    `${CATEGORY_INSTRUCTIONS[category]}\n\nRespond ONLY with raw JSON: {"symbol":"X","bias":"bullish","confidence":8,"rationale":"...","catalyst":"...","target_pct":2.5,"stop_pct":1.5}`
  )
}

async function generateWithClaude(category: string, liveData: string): Promise<string> {
  return callClaude(
    `${AI_PERSONAS.claude}\n\nLIVE MARKET DATA:\n${liveData}`,
    `${CATEGORY_INSTRUCTIONS[category]}\n\nRespond ONLY with raw JSON: {"symbol":"X","bias":"bullish","confidence":8,"rationale":"...","catalyst":"...","target_pct":2.5,"stop_pct":1.5}`
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

function extractJSON(text: string): any {
  const cleaned = text.trim()
  try { return JSON.parse(cleaned) } catch {}
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) { try { return JSON.parse(fence[1].trim()) } catch {} }
  const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1) { try { return JSON.parse(cleaned.slice(start, end + 1)) } catch {} }
  throw new Error(`JSON parse failed: ${cleaned.slice(0, 100)}`)
}

export async function generateBattlePick(
  aiName: 'claude' | 'chatgpt' | 'gemini',
  category: 'stock' | 'crypto' | 'option',
  liveData: string
): Promise<BattlePickResult> {
  let raw: string
  if (aiName === 'chatgpt') raw = await generateWithChatGPT(category, liveData)
  else if (aiName === 'gemini') raw = await generateWithGemini(category, liveData)
  else raw = await generateWithClaude(category, liveData)

  const parsed = extractJSON(raw)
  return {
    symbol: (parsed.symbol ?? '').toString().toUpperCase(),
    bias: parsed.bias ?? 'bullish',
    confidence: Math.min(10, Math.max(1, parseInt(parsed.confidence) || 7)),
    rationale: parsed.rationale ?? '',
    catalyst: parsed.catalyst ?? '',
    target_pct: parseFloat(parsed.target_pct) || 2.0,
    stop_pct: parseFloat(parsed.stop_pct) || 1.5,
  }
}
