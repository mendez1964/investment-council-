'use client'

import { useState, useRef, useEffect } from 'react'
import PineScriptTab from '@/components/PineScriptTab'
import WatchlistTab from '@/components/WatchlistTab'
import EarningsCalendar from '@/components/EarningsCalendar'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// ── Sidebar data ──────────────────────────────────────────────────────────────

type SidebarItem = { label: string; prompt: string; needsTicker?: boolean; isAnalysis?: 'stock' | 'crypto'; isCalendar?: boolean }
type SidebarSection = { id: string; title: string; items: SidebarItem[] }

const STOCKS_SECTIONS: SidebarSection[] = [
  {
    id: 'analyze',
    title: 'ANALYZE',
    items: [
      { label: 'Analyze a Stock / ETF', prompt: '', isAnalysis: 'stock' },
    ],
  },
  {
    id: 'market',
    title: 'MARKET',
    items: [
      { label: 'Pre-Market Briefing', prompt: `Give me today's pre-market briefing.

IMPORTANT — DATA GATE: First check the live data provided. If SPY, QQQ, DIA, and IWM prices are ALL missing from the feed, do not generate the full briefing. Instead output only: "LIVE FEED UNAVAILABLE — Equity prices did not load. Available: [list what we do have]. Try asking for a specific ticker like SPY or ask again in a few minutes." Then stop.

If we have at least 2 of SPY/QQQ/DIA/IWM prices, proceed with this structure — do NOT give each council member their own section:

## PRE-MARKET BRIEFING — [Today's Date]

**1. MARKET SNAPSHOT**
One table using the live data provided. Columns: Instrument | Price | Change | Status. Include: SPY, QQQ, DIA, IWM, Bitcoin, 2-Year Yield, 10-Year Yield, Fed Funds Rate. For any missing: write "—" and move on. Do not explain each gap — just note at the bottom how many equity prices loaded.

**2. MOVERS & WHAT THEY SIGNAL**
Top gainers, losers, most active — 3-5 bullets maximum. Strip warrants and micro-caps. One sentence per bullet on what the name signals about market health. If movers data is missing, skip this section entirely.

**3. COUNCIL CONSENSUS**
One paragraph only. Synthesize Dalio, Tudor Jones, Livermore, Grantham, Roubini into ONE unified voice — no separate advisor sections. State the consensus in one sentence, then name the one key tension where they disagree.

**4. KEY LEVELS & GAME PLAN**
- 4-5 key price levels to watch today, one line each
- Bias: Bullish / Neutral / Cautious / Bearish + one sentence why
- First 30 minutes: one thing to confirm before committing capital` },
      { label: 'End of Day Summary', prompt: `Give me today's end-of-day market summary.

IMPORTANT — DATA GATE: First check the live data provided. If SPY, QQQ, DIA, and IWM prices are ALL missing from the feed, do not generate the full summary. Instead output only: "LIVE FEED UNAVAILABLE — Equity prices did not load. Available: [list what we do have — yields, Bitcoin, movers, etc.]. Try asking for a specific ticker like SPY or ask again in a few minutes." Then stop.

If we have at least 2 of SPY/QQQ/DIA/IWM prices, proceed with this structure — do NOT give each council member their own section:

## END-OF-DAY SUMMARY — [Today's Date]

**1. MARKET CLOSE SNAPSHOT**
One table. Columns: Instrument | Price | Day Change % | Signal. Include: SPY, QQQ, DIA, IWM, Bitcoin, 10-Year Yield, 2-Year Yield, Fed Funds Rate. Write "—" for anything missing.

**2. SECTOR SCORECARD**
Use the LIVE SECTOR SCORECARD data provided. One table: Sector | ETF | Change % | Direction. Sort by performance — best to worst. Identify the top 2 leading sectors and bottom 2 lagging sectors in one sentence below the table. If sector data is missing from the feed, skip this section.

**3. WHAT TODAY'S MOVERS TELL US**
Top gainers, losers, most active — 3-5 bullets maximum. Strip warrants and micro-caps. What is the market saying through the signal names only? If movers data is missing, skip this section entirely.

**4. COUNCIL CONSENSUS — WHAT TODAY MEANT**
One paragraph only. ONE unified council voice — no separate advisor sections. Did the trend hold or break? Was today signal or noise? One sentence naming where frameworks agree, one sentence naming the key tension.

**5. WHAT CHANGED & SETUP FOR TOMORROW**
- Bullet list: 3-5 things that actually shifted today vs. yesterday — levels broken, narratives confirmed, risks rising/falling
- Market posture going into tomorrow: Bullish / Neutral / Cautious / Bearish + one sentence why
- One thing that turns it bullish tomorrow, one thing that turns it bearish` },
      { label: 'Market Health', prompt: 'What is the current health of the market? Cover trend, breadth, and sentiment.' },
      { label: 'Sector Rotation', prompt: 'Which sectors are showing strength and which are showing weakness right now?' },
      { label: 'Macro Environment', prompt: 'Give me a macro environment check — rates, inflation, GDP, and what they mean for markets.' },
      { label: 'Fear & Greed', prompt: 'What is the current market fear and greed status?' },
      { label: 'Yield Curve', prompt: 'What does the current yield curve look like and what does it signal?' },
      { label: 'Volatility Check', prompt: 'Assess current market volatility and what it means for positioning.' },
    ],
  },
  {
    id: 'scans',
    title: 'RUN A SCAN',
    items: [
      { label: 'Full Council Scan', prompt: 'Run the full council scan' },
      { label: 'Tudor Jones', prompt: 'Run the Tudor Jones scan' },
      { label: 'Livermore', prompt: 'Run the Livermore scan' },
      { label: 'Buffett', prompt: 'Run the Buffett scan' },
      { label: 'Lynch', prompt: 'Run the Lynch scan' },
      { label: 'Graham', prompt: 'Run the Graham scan' },
      { label: 'Grantham', prompt: 'Run the Grantham scan' },
      { label: 'Dalio', prompt: 'Run the Dalio scan' },
      { label: 'Burry', prompt: 'Run the Burry scan' },
      { label: 'Roubini', prompt: 'Run the Roubini scan' },
    ],
  },
  {
    id: 'council',
    title: 'ASK THE COUNCIL',
    items: [
      { label: 'Full Council View', prompt: 'Give me the full council view on the current market.' },
      { label: 'Buffett', prompt: 'What would Buffett say about the market right now?' },
      { label: 'Dalio', prompt: 'What would Dalio say about the market right now?' },
      { label: 'Soros', prompt: 'What would Soros say about the market right now?' },
      { label: 'Tudor Jones', prompt: 'What would Tudor Jones say about the market right now?' },
      { label: 'Lynch', prompt: 'What would Lynch say about the market right now?' },
      { label: 'Livermore', prompt: 'What would Livermore say about the market right now?' },
      { label: 'Graham', prompt: 'What would Graham say about the market right now?' },
      { label: 'Damodaran', prompt: 'What would Damodaran say about the market right now?' },
      { label: 'Burry', prompt: 'What would Burry say about the market right now?' },
      { label: 'Roubini', prompt: 'What would Roubini say about the market right now?' },
      { label: 'Grantham', prompt: 'What would Grantham say about the market right now?' },
    ],
  },
  {
    id: 'tools',
    title: 'TRADE TOOLS',
    items: [
      { label: 'Analyze a Setup', prompt: 'Analyze this trade setup for ', needsTicker: true },
      { label: 'Position Sizing', prompt: 'Help me calculate position size. My account is $', needsTicker: true },
      { label: 'Risk Assessment', prompt: 'Give me a full risk assessment for ', needsTicker: true },
      { label: 'Entry / Stop / Target', prompt: 'Help me define entry, stop, and target for ', needsTicker: true },
      { label: 'Hold or Cut', prompt: 'Help me decide whether to hold or cut my position in ', needsTicker: true },
    ],
  },
  {
    id: 'data',
    title: 'GET DATA',
    items: [
      { label: 'Stock Quote', prompt: 'Get me the current stock quote and fundamentals for ', needsTicker: true },
      { label: 'Insider Transactions', prompt: 'Show me recent insider transactions for ', needsTicker: true },
      { label: '13F Holdings', prompt: 'Show me recent 13F hedge fund holdings for ', needsTicker: true },
      { label: 'SEC Filings', prompt: 'Show me the latest SEC filings for ', needsTicker: true },
      { label: 'Economic Data', prompt: 'Give me the latest economic data — fed rate, CPI, yield curve, unemployment, and GDP.' },
      { label: 'Earnings Calendar', prompt: '', isCalendar: true },
      { label: 'Market Movers', prompt: 'What are the top market movers today — gainers, losers, and most active?' },
    ],
  },
]

const CRYPTO_SECTIONS: SidebarSection[] = [
  {
    id: 'analyzecrypto',
    title: 'ANALYZE',
    items: [
      { label: 'Analyze a Crypto', prompt: '', isAnalysis: 'crypto' },
    ],
  },
  {
    id: 'analysis',
    title: 'ANALYSIS',
    items: [
      { label: 'Full Crypto Council', prompt: 'Give me the full crypto council view right now. What do Saylor, PlanB, Raoul Pal, Hayes, Vitalik, Cathie Wood, Andreas, and Hoskinson all say about the current crypto market?' },
      { label: 'Bitcoin Deep Dive', prompt: 'Give me a full Bitcoin analysis right now using all relevant frameworks — Saylor, PlanB, Andreas, Raoul Pal, and Hayes.' },
      { label: 'Ethereum & DeFi', prompt: 'Give me a full Ethereum and DeFi analysis from Vitalik, Raoul Pal, and Cathie Wood perspectives. Include Layer 2 ecosystem health and DeFi TVL context.' },
      { label: 'Cycle Position', prompt: 'Where are we in the Bitcoin halving cycle right now? Use PlanB Stock-to-Flow, MVRV context, halving timing, and Raoul Pal macro framework to assess current cycle position.' },
      { label: 'On-Chain Health', prompt: 'Give me a full on-chain health check for Bitcoin right now using the PlanB and Andreas frameworks. Cover MVRV, realized price, exchange reserves, long-term holders, hash rate, and what it all means.' },
      { label: 'Derivatives Positioning', prompt: 'What does current Bitcoin derivatives positioning look like? Apply Arthur Hayes framework — check funding rates, open interest, leverage risk, and liquidation level analysis.' },
      { label: 'Macro Crypto View', prompt: 'What is the current macro environment saying about crypto? Apply Raoul Pal everything code — check global M2, DXY, ISM PMI, yen carry trade. Is macro favorable or unfavorable for crypto right now?' },
      { label: 'Altcoin Season Check', prompt: 'Is altcoin season here, ending, or not started? Check BTC dominance, ETH/BTC ratio, funding rates, and apply Arthur Hayes altcoin season mechanics framework.' },
      { label: 'Institutional Flow', prompt: 'What does institutional Bitcoin adoption look like right now? Apply Saylor framework — check ETF flow trends, exchange outflows, corporate treasury activity, and what it signals.' },
    ],
  },
  {
    id: 'cryptoscans',
    title: 'RUN A SCAN',
    items: [
      { label: 'Bitcoin Cycle Scan', prompt: 'Run a Bitcoin cycle scan. Apply PlanB framework — assess MVRV ratio position, distance from Stock-to-Flow model, days since last halving, realized price distance, and what phase of the cycle we are in.' },
      { label: 'Macro Crypto Scan', prompt: 'Run a macro crypto scan using Raoul Pal framework. Assess global M2 trend, DXY direction, ISM PMI cycle position, Fed liquidity conditions, and yen carry trade status. Is the macro environment favorable or unfavorable for crypto?' },
      { label: 'Derivatives Scan', prompt: 'Run a derivatives positioning scan using Arthur Hayes framework. Check Bitcoin and Ethereum funding rates, open interest trend, leverage risk, basis in futures markets. Are markets overleveraged long, overleveraged short, or neutral?' },
      { label: 'On-Chain Scan', prompt: 'Run an on-chain health scan for Bitcoin. Check active address growth, new address growth, long-term holder accumulation vs distribution, miner selling pressure, exchange reserve trend. Is the network growing, stable, or contracting?' },
      { label: 'Altcoin Season Scan', prompt: 'Run an altcoin season scan. Check BTC dominance trend, ETH/BTC ratio, altcoin season index, funding rates across altcoins, and apply Hayes altcoin season mechanics. Where are we in the rotation?' },
      { label: 'DeFi Ecosystem Scan', prompt: 'Run a DeFi ecosystem scan using Vitalik framework. Check total DeFi TVL trend, Layer 2 transaction volume, Ethereum gas fees as demand indicator, top protocol revenue and sustainability. What is the DeFi ecosystem health?' },
    ],
  },
  {
    id: 'specialists',
    title: 'SPECIALISTS',
    items: [
      { label: 'Michael Saylor', prompt: 'Apply the Michael Saylor Bitcoin framework to current market conditions. What is Saylor saying about institutional adoption, ETF flows, and Bitcoin as a treasury asset right now?' },
      { label: 'PlanB', prompt: 'Apply PlanB Stock-to-Flow framework to Bitcoin right now. Where are we relative to the S2F model, halving cycle, and MVRV ratio?' },
      { label: 'Raoul Pal', prompt: 'Apply Raoul Pal macro crypto framework right now. What is global M2 saying, where is DXY, and what does the everything code suggest for crypto?' },
      { label: 'Arthur Hayes', prompt: 'Apply Arthur Hayes derivatives and macro framework to Bitcoin right now. What do funding rates, open interest, yen carry trade, and dollar liquidity suggest?' },
      { label: 'Vitalik Buterin', prompt: 'Apply Vitalik Buterin Ethereum framework right now. What is Ethereum roadmap progress, Layer 2 adoption, DeFi TVL, and ETH staking ratio saying?' },
      { label: 'Cathie Wood', prompt: 'Apply Cathie Wood ARK Invest framework to crypto right now. Where are we on the S-curve, what is developer adoption showing, and what is the total addressable market analysis?' },
      { label: 'Andreas Antonopoulos', prompt: 'Apply Andreas Antonopoulos Bitcoin fundamentals framework right now. What is hash rate saying, what is the self-custody situation, and what are the key regulatory risks?' },
      { label: 'Charles Hoskinson', prompt: 'Apply Charles Hoskinson Cardano framework. What is the current state of the Cardano ecosystem, ADA development progress, and how does it compare to competing platforms?' },
    ],
  },
  {
    id: 'cryptodata',
    title: 'GET DATA',
    items: [
      { label: 'Crypto Prices', prompt: 'Give me current crypto prices, fear and greed index, and BTC dominance.' },
      { label: 'Fear & Greed Index', prompt: 'What is the current crypto Fear and Greed Index and what does it mean for market sentiment?' },
    ],
  },
]

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'pine' | 'watchlist'>('chat')
  const [unreadAlerts, setUnreadAlerts] = useState(0)
  const [activePineScript, setActivePineScript] = useState<{ name: string; code: string } | null>(null)
  const pineCodeInjected = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [tickerPopup, setTickerPopup] = useState<{ promptPrefix: string; placeholder: string } | null>(null)
  const [tickerInput, setTickerInput] = useState('')
  const tickerInputRef = useRef<HTMLInputElement>(null)
  const [showEarningsCalendar, setShowEarningsCalendar] = useState(false)
  const [analysisPopup, setAnalysisPopup] = useState<'stock' | 'crypto' | null>(null)
  const [analysisSymbol, setAnalysisSymbol] = useState('')
  const [councilChimeIn, setCouncilChimeIn] = useState(false)
  const analysisInputRef = useRef<HTMLInputElement>(null)

  // Sidebar state
  const [sidebarMode, setSidebarMode] = useState<'stocks' | 'crypto'>('stocks')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['analyze', 'market']))

  // Pine Script code coming back from chat → editor
  const [pendingPineCode, setPendingPineCode] = useState<string | null>(null)

  // Cost tracking
  const [sessionCost, setSessionCost] = useState(0)
  const [sessionTokens, setSessionTokens] = useState({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })
  const [totalCost, setTotalCost] = useState(0)

  // Load cumulative cost from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('ic_total_cost')
    if (stored) setTotalCost(parseFloat(stored) || 0)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll unread alert count every 60 seconds
  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch('/api/alerts?unread=true&limit=100')
        if (res.ok) {
          const data = await res.json()
          setUnreadAlerts(Array.isArray(data) ? data.length : 0)
        }
      } catch {}
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 60000)
    return () => clearInterval(interval)
  }, [])

  function switchSidebarMode(mode: 'stocks' | 'crypto') {
    setSidebarMode(mode)
    const sections = mode === 'stocks' ? STOCKS_SECTIONS : CRYPTO_SECTIONS
    setExpandedSections(new Set([sections[0].id, sections[1]?.id].filter(Boolean) as string[]))
  }

  function toggleSection(id: string) {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function newChat() {
    setMessages([])
    setInput('')
    setActivePineScript(null)
    setAnalysisPopup(null)
    setTickerPopup(null)
    pineCodeInjected.current = false
  }

  function buildAnalysisPrompt(symbol: string, type: 'stock' | 'crypto', withCouncil: boolean): string {
    const s = symbol.toUpperCase()
    if (type === 'stock') {
      const base = `Give me a professional analysis of ${s}. No investment council frameworks — just what a professional trader or analyst needs to know.

1. PRICE & MARKET DATA
Current price, day change %, volume vs average, market cap, 52-week high/low. Use the live data provided.

2. FUNDAMENTALS
P/E ratio, EPS, revenue growth (YoY), gross margin, profit margin, debt/equity ratio, free cash flow. Flag anything that stands out — good or bad.

3. VALUATION
Is ${s} cheap, fair, or expensive vs its sector and its own historical average? Give a direct answer.

4. TECHNICAL PICTURE
Trend direction (above or below 200-day MA?), key support and resistance levels, momentum reading (RSI direction, MACD). Where is price in relation to its range?

5. RECENT CATALYSTS
Latest earnings result, any major news, insider buying or selling activity, analyst rating changes.

6. KEY RISKS
Top 3 risks that could hurt this stock in the next 3-6 months. Be specific.

7. BOTTOM LINE
One direct paragraph: what is the state of this stock right now? Is it worth attention or not?

Be direct and factual. Use numbers. No fluff.`
      if (!withCouncil) return base
      return base + `\n\n---\n\n## COUNCIL VIEW\nNow have the Investment Council weigh in on ${s} — one synthesized paragraph applying the most relevant frameworks. Which council members have the strongest opinion here and why?`
    } else {
      const base = `Give me a professional crypto analysis of ${s}. No council frameworks — just what a pro crypto trader needs to know.

1. PRICE & MARKET DATA
Current price, 24h change %, volume, market cap, BTC dominance context. Use the live data provided.

2. ON-CHAIN METRICS
MVRV ratio, exchange net flows (accumulation or distribution?), active addresses, hash rate (if BTC). Use any on-chain data available.

3. TECHNICAL PICTURE
Trend direction, key support and resistance, momentum. Where is price relative to its recent range?

4. RECENT CATALYSTS
Key news, protocol updates, regulatory developments, whale activity.

5. KEY RISKS
Top 3 risks that could hurt ${s} in the near term. Be specific.

6. BOTTOM LINE
One direct paragraph: what is the state of ${s} right now?

Be direct and factual. Use numbers.`
      if (!withCouncil) return base
      return base + `\n\n---\n\n## COUNCIL VIEW\nNow have the Crypto Council weigh in on ${s} — one synthesized paragraph from the most relevant specialists (Saylor, PlanB, Hayes, Raoul Pal, Vitalik as applicable).`
    }
  }

  function submitAnalysisPopup() {
    if (!analysisPopup || !analysisSymbol.trim()) return
    const prompt = buildAnalysisPrompt(analysisSymbol.trim(), analysisPopup, councilChimeIn)
    setAnalysisPopup(null)
    setAnalysisSymbol('')
    setActiveTab('chat')
    setTimeout(() => sendMessageWithText(prompt), 50)
  }

  async function sendMessage() {
    await sendMessageWithText(input)
  }

  function printMessage(content: string) {
    const win = window.open('', '_blank', 'width=800,height=600')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Investment Council — Research Output</title>
          <style>
            body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.8; }
            h1 { font-size: 13px; font-weight: normal; color: #888; border-bottom: 1px solid #ddd; padding-bottom: 12px; margin-bottom: 24px; letter-spacing: 0.05em; text-transform: uppercase; }
            pre { white-space: pre-wrap; word-break: break-word; font-family: Georgia, serif; font-size: 15px; margin: 0; }
            footer { margin-top: 40px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <h1>Investment Council &mdash; ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h1>
          <pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          <footer>For educational purposes only. Not financial advice.</footer>
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    win.print()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  function handleToolbarSelect(prompt: string, needsTicker?: boolean, placeholder?: string, isAnalysis?: 'stock' | 'crypto', isCalendar?: boolean) {
    if (isCalendar) {
      setShowEarningsCalendar(true)
      return
    }
    if (isAnalysis) {
      setAnalysisPopup(isAnalysis)
      setAnalysisSymbol('')
      setCouncilChimeIn(false)
      setTimeout(() => analysisInputRef.current?.focus(), 50)
    } else if (needsTicker) {
      setTickerPopup({ promptPrefix: prompt, placeholder: placeholder || 'Enter ticker or description...' })
      setTickerInput('')
      setTimeout(() => tickerInputRef.current?.focus(), 50)
    } else {
      setInput(prompt)
      setTimeout(() => sendMessageWithText(prompt), 50)
    }
  }

  function submitTickerPopup() {
    if (!tickerPopup || !tickerInput.trim()) return
    const fullPrompt = tickerPopup.promptPrefix + tickerInput.trim()
    setTickerPopup(null)
    setTickerInput('')
    setInput(fullPrompt)
    setTimeout(() => sendMessageWithText(fullPrompt), 50)
  }

  async function sendMessageWithText(text: string, onComplete?: (response: string) => void) {
    let userMessage = text.trim()
    if (!userMessage || isLoading) return

    if (activePineScript && !pineCodeInjected.current) {
      userMessage = `[Pine Script Editor — Current Script: "${activePineScript.name}"]\n\`\`\`pinescript\n${activePineScript.code}\n\`\`\`\n\nIMPORTANT: If you provide an improved or modified version of this script, you MUST return the COMPLETE script in a single \`\`\`pinescript code block — every line, no truncation, no ellipsis, no "rest of code unchanged" shortcuts. The editor will auto-load whatever is inside that code block.\n\n${userMessage}`
      pineCodeInjected.current = true
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    let assistantMessage = ''
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      if (!response.ok) throw new Error('API error')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })

          // Check for hidden usage marker (may arrive split across chunks)
          assistantMessage += chunk
          const usageIdx = assistantMessage.indexOf('\x00[USAGE:')
          if (usageIdx !== -1) {
            const endIdx = assistantMessage.indexOf(']', usageIdx)
            if (endIdx !== -1) {
              const markerJson = assistantMessage.slice(usageIdx + 8, endIdx)
              assistantMessage = assistantMessage.slice(0, usageIdx)
              try {
                const { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, cost } = JSON.parse(markerJson)
                setSessionCost(prev => prev + cost)
                setSessionTokens(prev => ({
                  input: prev.input + inputTokens,
                  output: prev.output + outputTokens,
                  cacheRead: prev.cacheRead + (cacheReadTokens ?? 0),
                  cacheWrite: prev.cacheWrite + (cacheWriteTokens ?? 0),
                }))
                if (cacheReadTokens > 0) {
                  console.log(`[cache] HIT — ${cacheReadTokens.toLocaleString()} tokens read from cache`)
                } else if (cacheWriteTokens > 0) {
                  console.log(`[cache] WRITE — ${cacheWriteTokens.toLocaleString()} tokens stored`)
                }
                setTotalCost(prev => {
                  const next = prev + cost
                  localStorage.setItem('ic_total_cost', next.toFixed(6))
                  return next
                })
              } catch {}
            }
          }

          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: assistantMessage }
            return updated
          })
        }
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Error connecting to the Investment Council. Please try again.' },
      ])
    } finally {
      setIsLoading(false)
      if (onComplete && assistantMessage) onComplete(assistantMessage)

      // If response contains a Pine Script code block, push it to the editor automatically
      if (assistantMessage) {
        const match = assistantMessage.match(/```(?:pinescript|pine)\n([\s\S]*?)```/)
        if (match) {
          setPendingPineCode(match[1].trim())
        }
      }
    }
  }

  const currentSections = sidebarMode === 'stocks' ? STOCKS_SECTIONS : CRYPTO_SECTIONS
  const accentColor = sidebarMode === 'stocks' ? '#2d6a4f' : '#b45309'
  const accentBg = sidebarMode === 'stocks' ? '#1a472a' : '#451a03'
  const accentText = sidebarMode === 'stocks' ? '#7ec8a0' : '#fbbf24'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {showEarningsCalendar && <EarningsCalendar onClose={() => setShowEarningsCalendar(false)} />}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid #1f1f1f',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '6px',
          background: 'linear-gradient(135deg, #1a472a, #2d6a4f)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', flexShrink: 0,
        }}>⚡</div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#e5e5e5', letterSpacing: '-0.01em' }}>
            Investment Council
          </div>
          <div style={{ fontSize: '10px', color: '#444', marginTop: '1px' }}>
            18 frameworks · Live market data
          </div>
        </div>

        {/* New Chat button */}
        {messages.length > 0 && (
          <button
            onClick={newChat}
            title="Start a new chat"
            style={{
              marginLeft: '12px',
              background: 'transparent',
              border: '1px solid #1f1f1f',
              borderRadius: '6px',
              padding: '4px 10px',
              color: '#444',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.04em',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#333' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#444'; e.currentTarget.style.borderColor = '#1f1f1f' }}
          >
            + New Chat
          </button>
        )}

        {/* Cost counters */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div
            title={`This session · Input: ${sessionTokens.input.toLocaleString()} · Output: ${sessionTokens.output.toLocaleString()} · Cache read: ${sessionTokens.cacheRead.toLocaleString()} · Cache write: ${sessionTokens.cacheWrite.toLocaleString()}`}
            style={{
              fontSize: '11px',
              color: '#444',
              background: '#0d0d0d',
              border: '1px solid #1a1a1a',
              borderRadius: '6px',
              padding: '4px 10px',
              fontVariantNumeric: 'tabular-nums',
              cursor: 'default',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Session:{' '}
            <span style={{ color: sessionCost > 0.50 ? '#f87171' : sessionCost > 0.10 ? '#fbbf24' : '#7ec8a0', fontWeight: 600 }}>
              ${sessionCost.toFixed(4)}
            </span>
          </div>

          <div
            title="All-time cumulative cost stored on this device. Click to reset."
            onClick={() => {
              if (confirm('Reset the all-time cost counter to $0.00?')) {
                localStorage.setItem('ic_total_cost', '0')
                setTotalCost(0)
              }
            }}
            style={{
              fontSize: '11px',
              color: '#444',
              background: '#0d0d0d',
              border: `1px solid ${totalCost > 20 ? '#7f1d1d' : totalCost > 5 ? '#451a03' : '#1a1a1a'}`,
              borderRadius: '6px',
              padding: '4px 10px',
              fontVariantNumeric: 'tabular-nums',
              cursor: 'pointer',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            All-time:{' '}
            <span style={{ color: totalCost > 20 ? '#f87171' : totalCost > 5 ? '#fbbf24' : '#6b7280', fontWeight: 600 }}>
              ${totalCost.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
          {([
            { id: 'chat', label: '💬 Council Chat' },
            { id: 'pine', label: '📈 Pine Script' },
            { id: 'watchlist', label: '👁 Watchlist' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === 'watchlist') setUnreadAlerts(0)
              }}
              style={{
                position: 'relative',
                background: activeTab === tab.id ? '#1a472a' : 'transparent',
                border: `1px solid ${activeTab === tab.id ? '#2d6a4f' : '#262626'}`,
                borderRadius: '6px',
                padding: '4px 12px',
                color: activeTab === tab.id ? '#7ec8a0' : '#555',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.02em',
                fontFamily: 'inherit',
              }}
            >
              {tab.label}
              {tab.id === 'watchlist' && unreadAlerts > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: '#e53e3e', color: '#fff', fontSize: '10px',
                  fontWeight: 700, borderRadius: '10px', padding: '1px 5px',
                  lineHeight: '1.4', minWidth: '16px', textAlign: 'center',
                }}>
                  {unreadAlerts > 99 ? '99+' : unreadAlerts}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body: sidebar + main ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Left Sidebar ────────────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <div style={{
            width: sidebarCollapsed ? '36px' : '210px',
            minWidth: sidebarCollapsed ? '36px' : '210px',
            borderRight: '1px solid #1a1a1a',
            background: '#080808',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.2s, min-width 0.2s',
            overflow: 'hidden',
            flexShrink: 0,
          }}>

            {/* Collapse toggle */}
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid #1a1a1a',
                color: '#333',
                cursor: 'pointer',
                padding: '10px',
                fontSize: '14px',
                textAlign: 'right',
                flexShrink: 0,
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-end',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#666')}
              onMouseLeave={e => (e.currentTarget.style.color = '#333')}
            >
              {sidebarCollapsed ? '›' : '‹'}
            </button>

            {!sidebarCollapsed && (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

                {/* Mode selector */}
                <div style={{
                  display: 'flex',
                  margin: '10px 10px 6px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid #1f1f1f',
                  flexShrink: 0,
                }}>
                  {(['stocks', 'crypto'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => switchSidebarMode(mode)}
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        background: sidebarMode === mode ? (mode === 'stocks' ? '#1a472a' : '#451a03') : 'transparent',
                        border: 'none',
                        color: sidebarMode === mode ? (mode === 'stocks' ? '#7ec8a0' : '#fbbf24') : '#444',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                        textTransform: 'uppercase',
                      }}
                    >
                      {mode === 'stocks' ? 'Stocks' : 'Crypto'}
                    </button>
                  ))}
                </div>

                {/* Sections */}
                {currentSections.map(section => (
                  <div key={section.id} style={{ flexShrink: 0 }}>

                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        borderTop: '1px solid #111',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        color: expandedSections.has(section.id) ? accentText : '#444',
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                      onMouseLeave={e => (e.currentTarget.style.color = expandedSections.has(section.id) ? accentText : '#444')}
                    >
                      <span>{section.title}</span>
                      <span style={{ fontSize: '10px', opacity: 0.6 }}>
                        {expandedSections.has(section.id) ? '▾' : '▸'}
                      </span>
                    </button>

                    {/* Section items */}
                    {expandedSections.has(section.id) && (
                      <div style={{ paddingBottom: '4px' }}>
                        {section.items.map(item => (
                          <button
                            key={item.label}
                            onClick={() => {
                              handleToolbarSelect(item.prompt, item.needsTicker, item.label, item.isAnalysis, item.isCalendar)
                              if (activeTab !== 'chat') setActiveTab('chat')
                            }}
                            disabled={isLoading}
                            style={{
                              width: '100%',
                              background: 'transparent',
                              border: 'none',
                              padding: '5px 14px 5px 16px',
                              color: '#555',
                              fontSize: '12px',
                              cursor: isLoading ? 'default' : 'pointer',
                              textAlign: 'left',
                              fontFamily: 'inherit',
                              lineHeight: 1.4,
                              transition: 'color 0.1s, background 0.1s',
                              borderLeft: `2px solid transparent`,
                            }}
                            onMouseEnter={e => {
                              if (!isLoading) {
                                e.currentTarget.style.color = '#ccc'
                                e.currentTarget.style.background = '#111'
                                e.currentTarget.style.borderLeftColor = accentColor
                              }
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color = '#555'
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.borderLeftColor = 'transparent'
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div style={{ flex: 1 }} />
              </div>
            )}

            {/* Collapsed: vertical mode indicator */}
            {sidebarCollapsed && (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '16px',
                gap: '12px',
              }}>
                <div
                  onClick={() => { switchSidebarMode('stocks'); setSidebarCollapsed(false) }}
                  title="Stocks & Equities"
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: sidebarMode === 'stocks' ? '#7ec8a0' : '#2a2a2a',
                    cursor: 'pointer',
                    writingMode: 'vertical-rl',
                    textTransform: 'uppercase',
                  }}
                >
                  STOCKS
                </div>
                <div style={{ width: '1px', height: '16px', background: '#1a1a1a' }} />
                <div
                  onClick={() => { switchSidebarMode('crypto'); setSidebarCollapsed(false) }}
                  title="Crypto"
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: sidebarMode === 'crypto' ? '#fbbf24' : '#2a2a2a',
                    cursor: 'pointer',
                    writingMode: 'vertical-rl',
                    textTransform: 'uppercase',
                  }}
                >
                  CRYPTO
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Main Content ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Pine Script Tab — always mounted so editor state survives tab switches */}
          <div style={{ flex: 1, overflow: 'hidden', display: activeTab === 'pine' ? 'flex' : 'none', flexDirection: 'column' }}>
              <PineScriptTab
                onSendMessage={sendMessageWithText}
                onSwitchToChat={() => setActiveTab('chat')}
                onScriptChange={(name, code) => {
                  setActivePineScript({ name, code })
                  pineCodeInjected.current = false
                }}
                isLoading={isLoading}
                pendingImprovedCode={pendingPineCode}
                onPendingCodeConsumed={() => setPendingPineCode(null)}
              />
            </div>

          {/* Watchlist Tab — always mounted so watchlist state survives tab switches */}
          <div style={{ flex: 1, overflow: 'hidden', display: activeTab === 'watchlist' ? 'flex' : 'none', flexDirection: 'column' }}>
              <WatchlistTab
                onSendMessage={sendMessageWithText}
                onSwitchToChat={() => setActiveTab('chat')}
              />
            </div>

          {/* ── Chat Messages ──────────────────────────────────────────── */}
          <div style={{
            display: activeTab === 'chat' ? 'flex' : 'none',
            flex: 1,
            overflowY: 'auto',
            padding: messages.length === 0 ? '0' : '24px',
            flexDirection: 'column',
            gap: '24px',
          }}>
            {messages.length === 0 ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '48px 24px', gap: '32px',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#e5e5e5', letterSpacing: '-0.02em', marginBottom: '8px' }}>
                    Good morning, Dag.
                  </div>
                  <div style={{ fontSize: '14px', color: '#555', lineHeight: 1.6 }}>
                    Your Investment Council is ready. Eighteen frameworks. No agenda.
                  </div>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: '10px', width: '100%', maxWidth: '560px',
                }}>
                  {[
                    { label: 'Pre-market briefing', prompt: 'Give me a pre-market briefing for today.' },
                    { label: 'Analyze a stock', prompt: 'Analyze NVDA using all ten frameworks.' },
                    { label: 'Crypto council view', prompt: 'Give me the full crypto council view right now.' },
                    { label: 'Risk check', prompt: 'What are the biggest macro risks in the market right now?' },
                  ].map(({ label, prompt }) => (
                    <button
                      key={label}
                      onClick={() => { setInput(prompt); textareaRef.current?.focus() }}
                      style={{
                        background: '#111', border: '1px solid #1f1f1f',
                        borderRadius: '8px', padding: '12px 14px',
                        color: '#888', fontSize: '13px', cursor: 'pointer',
                        textAlign: 'left', lineHeight: 1.4, transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.target as HTMLButtonElement).style.borderColor = '#2d6a4f'
                        ;(e.target as HTMLButtonElement).style.color = '#aaa'
                      }}
                      onMouseLeave={e => {
                        (e.target as HTMLButtonElement).style.borderColor = '#1f1f1f'
                        ;(e.target as HTMLButtonElement).style.color = '#888'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: msg.role === 'user' ? '#1f1f1f' : 'linear-gradient(135deg, #1a472a, #2d6a4f)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', flexShrink: 0, marginTop: '2px',
                  }}>
                    {msg.role === 'user' ? '👤' : '⚡'}
                  </div>

                  <div style={{ flex: 1 }}>
                    {msg.role === 'assistant' && msg.content && (
                      <div style={{ marginBottom: '8px' }}>
                        <button
                          onClick={() => printMessage(msg.content)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            background: '#2d6a4f', border: 'none', borderRadius: '5px',
                            padding: '4px 12px', color: '#fff', fontSize: '12px',
                            fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em',
                          }}
                        >
                          🖨︎ Print
                        </button>
                      </div>
                    )}
                    <div style={{
                      fontSize: '14px', lineHeight: 1.75,
                      color: msg.role === 'user' ? '#bbb' : '#d4d4d4',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {msg.content}
                      {isLoading && i === messages.length - 1 && msg.role === 'assistant' && msg.content === '' && (
                        <span style={{ display: 'inline-block', width: '8px', height: '14px', background: '#2d6a4f', borderRadius: '2px', animation: 'blink 1s step-end infinite' }} />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Chat Input ─────────────────────────────────────────────── */}
          <div style={{
            padding: '16px 24px 24px',
            borderTop: messages.length > 0 ? '1px solid #1f1f1f' : 'none',
            display: activeTab === 'chat' ? undefined : 'none',
          }}>

            {/* Active Pine Script banner */}
            {activePineScript && !pineCodeInjected.current && (
              <div style={{
                marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center',
                background: '#0a1a10', border: '1px solid #1a472a',
                borderRadius: '8px', padding: '7px 12px',
              }}>
                <span style={{ fontSize: '12px', color: '#7ec8a0', fontWeight: 600 }}>
                  📈 {activePineScript.name} is loaded in the editor
                </span>
                <span style={{ fontSize: '11px', color: '#444' }}>— your next message will include it automatically</span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => setActivePineScript(null)}
                  style={{ background: 'transparent', border: 'none', color: '#444', fontSize: '14px', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                >×</button>
              </div>
            )}

            {/* Analysis popup */}
            {analysisPopup && (
              <div style={{
                marginBottom: '10px',
                background: '#0d1f16', border: '1px solid #2d6a4f',
                borderRadius: '10px', padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: '10px',
              }}>
                <div style={{ fontSize: '12px', color: '#7ec8a0', fontWeight: 600 }}>
                  {analysisPopup === 'stock' ? '📈 Analyze a Stock or ETF' : '₿ Analyze a Crypto'}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    ref={analysisInputRef}
                    value={analysisSymbol}
                    onChange={e => setAnalysisSymbol(e.target.value.toUpperCase())}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitAnalysisPopup()
                      if (e.key === 'Escape') setAnalysisPopup(null)
                    }}
                    placeholder={analysisPopup === 'stock' ? 'e.g. AAPL, NVDA, SPY...' : 'e.g. BTC, ETH, SOL...'}
                    style={{
                      flex: 1, background: '#0a0a0a', border: '1px solid #1f1f1f',
                      borderRadius: '6px', padding: '7px 10px',
                      color: '#e5e5e5', fontSize: '14px', fontFamily: 'inherit',
                      outline: 'none', letterSpacing: '0.05em',
                    }}
                  />
                  <button
                    onClick={submitAnalysisPopup}
                    style={{ background: '#2d6a4f', border: 'none', borderRadius: '6px', padding: '7px 14px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Analyze
                  </button>
                  <button
                    onClick={() => setAnalysisPopup(null)}
                    style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '18px', cursor: 'pointer', padding: '0 4px' }}
                  >×</button>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={councilChimeIn}
                    onChange={e => setCouncilChimeIn(e.target.checked)}
                    style={{ accentColor: '#2d6a4f', width: '14px', height: '14px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#555' }}>Have Council chime in after the analysis</span>
                </label>
              </div>
            )}

            {/* Ticker popup */}
            {tickerPopup && (
              <div style={{
                marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center',
                background: '#0d1f16', border: '1px solid #2d6a4f',
                borderRadius: '8px', padding: '8px 12px',
              }}>
                <span style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap' }}>
                  {tickerPopup.promptPrefix.length > 40 ? tickerPopup.promptPrefix.substring(0, 40) + '...' : tickerPopup.promptPrefix}
                </span>
                <input
                  ref={tickerInputRef}
                  value={tickerInput}
                  onChange={e => setTickerInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitTickerPopup()
                    if (e.key === 'Escape') setTickerPopup(null)
                  }}
                  placeholder={tickerPopup.placeholder}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    outline: 'none', color: '#e5e5e5', fontSize: '13px', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={submitTickerPopup}
                  style={{ background: '#2d6a4f', border: 'none', borderRadius: '5px', padding: '4px 10px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
                >Go</button>
                <button
                  onClick={() => setTickerPopup(null)}
                  style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '16px', cursor: 'pointer', padding: '0 4px' }}
                >×</button>
              </div>
            )}

            {/* Chat input box */}
            <div style={{
              display: 'flex', gap: '10px', alignItems: 'flex-end',
              background: '#111', border: '1px solid #262626',
              borderRadius: '12px', padding: '10px 14px', transition: 'border-color 0.15s',
            }}
              onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#2d6a4f' }}
              onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#262626' }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask the Council anything..."
                rows={1}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#e5e5e5', fontSize: '14px', lineHeight: 1.6,
                  resize: 'none', fontFamily: 'inherit', overflowY: 'hidden', maxHeight: '200px',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                  background: !input.trim() || isLoading ? '#1a1a1a' : '#2d6a4f',
                  color: !input.trim() || isLoading ? '#333' : '#fff',
                  cursor: !input.trim() || isLoading ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', flexShrink: 0, transition: 'all 0.15s',
                }}
              >
                {isLoading ? '•••' : '↑'}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#333', textAlign: 'center', marginTop: '8px' }}>
              Enter to send · Shift+Enter for new line · For educational purposes only
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1f1f1f; border-radius: 2px; }
      `}</style>
    </div>
  )
}
