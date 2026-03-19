'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// ── Toolbar configuration ────────────────────────────────────────────────────

const SCAN_OPTIONS = [
  { label: 'Full Council Scan', prompt: 'Run the full council scan' },
  { label: 'Tudor Jones — Trend Pullback', prompt: 'Run the Tudor Jones scan' },
  { label: 'Livermore — Pivot Points', prompt: 'Run the Livermore scan' },
  { label: 'Buffett — Value with Moat', prompt: 'Run the Buffett scan' },
  { label: 'Lynch — Growth at Price', prompt: 'Run the Lynch scan' },
  { label: 'Graham — Deep Value', prompt: 'Run the Graham scan' },
  { label: 'Grantham — Bubble Warning', prompt: 'Run the Grantham scan' },
  { label: 'Dalio — Macro Aligned', prompt: 'Run the Dalio scan' },
  { label: 'Burry — Contrarian', prompt: 'Run the Burry scan' },
  { label: 'Roubini — Risk Alerts', prompt: 'Run the Roubini scan' },
]

const MARKET_OPTIONS = [
  { label: 'Pre-Market Briefing', prompt: 'Give me a pre-market briefing for today.' },
  { label: 'End of Day Summary', prompt: 'Give me an end-of-day market summary.' },
  { label: 'Current Market Health', prompt: 'What is the current health of the market? Cover trend, breadth, and sentiment.' },
  { label: 'Sector Rotation Today', prompt: 'Which sectors are showing strength and which are showing weakness right now?' },
  { label: 'Macro Environment Check', prompt: 'Give me a macro environment check — rates, inflation, GDP, and what they mean for markets.' },
  { label: 'Fear & Greed Status', prompt: 'What is the current crypto and market fear and greed status?' },
  { label: 'Yield Curve Check', prompt: 'What does the current yield curve look like and what does it signal?' },
  { label: 'Volatility Assessment', prompt: 'Assess current market volatility and what it means for positioning.' },
]

const COUNCIL_OPTIONS = [
  { label: 'Full Council View', prompt: 'Give me the full council view on the current market.' },
  { label: 'Buffett Only', prompt: 'What would Buffett say about the market right now?' },
  { label: 'Dalio Only', prompt: 'What would Dalio say about the market right now?' },
  { label: 'Soros Only', prompt: 'What would Soros say about the market right now?' },
  { label: 'Tudor Jones Only', prompt: 'What would Tudor Jones say about the market right now?' },
  { label: 'Lynch Only', prompt: 'What would Lynch say about the market right now?' },
  { label: 'Livermore Only', prompt: 'What would Livermore say about the market right now?' },
  { label: 'Graham Only', prompt: 'What would Graham say about the market right now?' },
  { label: 'Damodaran Only', prompt: 'What would Damodaran say about the market right now?' },
  { label: 'Burry Only', prompt: 'What would Burry say about the market right now?' },
  { label: 'Roubini Only', prompt: 'What would Roubini say about the market right now?' },
  { label: 'Grantham Only', prompt: 'What would Grantham say about the market right now?' },
]

const TRADE_TOOLS: Array<{ label: string; prompt: string; needsTicker?: boolean }> = [
  { label: 'Analyze a Setup', prompt: 'Analyze this trade setup for ', needsTicker: true },
  { label: 'Position Size Calculator', prompt: 'Help me calculate position size. My account is $', needsTicker: true },
  { label: 'Risk Assessment', prompt: 'Give me a full risk assessment for ', needsTicker: true },
  { label: 'Entry / Stop / Target', prompt: 'Help me define entry, stop, and target for ', needsTicker: true },
  { label: 'Hold or Cut Decision', prompt: 'Help me decide whether to hold or cut my position in ', needsTicker: true },
]

const DATA_OPTIONS: Array<{ label: string; prompt: string; needsTicker?: boolean }> = [
  { label: 'Stock Quote', prompt: 'Get me the current stock quote and fundamentals for ', needsTicker: true },
  { label: 'Insider Transactions', prompt: 'Show me recent insider transactions for ', needsTicker: true },
  { label: 'Hedge Fund Holdings (13F)', prompt: 'Show me recent 13F hedge fund holdings for ', needsTicker: true },
  { label: 'Latest SEC Filings', prompt: 'Show me the latest SEC filings for ', needsTicker: true },
  { label: 'Economic Data', prompt: 'Give me the latest economic data — fed rate, CPI, yield curve, unemployment, and GDP.' },
  { label: 'Crypto Prices', prompt: 'Give me current crypto prices, fear and greed index, and BTC dominance.' },
  { label: 'Market Movers Today', prompt: 'What are the top market movers today — gainers, losers, and most active?' },
]

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [tickerPopup, setTickerPopup] = useState<{ promptPrefix: string; placeholder: string } | null>(null)
  const [tickerInput, setTickerInput] = useState('')
  const tickerInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  function handleToolbarSelect(prompt: string, needsTicker?: boolean, placeholder?: string) {
    if (needsTicker) {
      setTickerPopup({ promptPrefix: prompt, placeholder: placeholder || 'Enter ticker or description...' })
      setTickerInput('')
      setTimeout(() => tickerInputRef.current?.focus(), 50)
    } else {
      setInput(prompt)
      setTimeout(() => {
        sendMessageWithText(prompt)
      }, 50)
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

  async function sendMessageWithText(text: string) {
    const userMessage = text.trim()
    if (!userMessage || isLoading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!response.ok) throw new Error('API error')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          assistantMessage += chunk
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
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '860px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #1f1f1f',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, #1a472a, #2d6a4f)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          flexShrink: 0,
        }}>
          ⚡
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#e5e5e5', letterSpacing: '-0.01em' }}>
            Investment Council
          </div>
          <div style={{ fontSize: '11px', color: '#556', marginTop: '1px' }}>
            10 frameworks · Live market data
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: messages.length === 0 ? '0' : '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {messages.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            gap: '32px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#e5e5e5', letterSpacing: '-0.02em', marginBottom: '8px' }}>
                Good morning, Dag.
              </div>
              <div style={{ fontSize: '14px', color: '#555', lineHeight: 1.6 }}>
                Your Investment Council is ready. Ten frameworks. No agenda.
              </div>
            </div>

            {/* Starter prompts */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              width: '100%',
              maxWidth: '600px',
            }}>
              {[
                { label: 'Pre-market briefing', prompt: 'Give me a pre-market briefing for today.' },
                { label: 'Analyze a stock', prompt: 'Analyze NVDA using all ten frameworks.' },
                { label: 'Review a trade setup', prompt: 'I\'m looking at a bull flag on SPY on the 15-minute chart. Entry at current price, stop below the flag low. What do you think?' },
                { label: 'Risk check', prompt: 'What are the biggest macro risks in the market right now?' },
              ].map(({ label, prompt }) => (
                <button
                  key={label}
                  onClick={() => { setInput(prompt); textareaRef.current?.focus() }}
                  style={{
                    background: '#111',
                    border: '1px solid #1f1f1f',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    color: '#888',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    lineHeight: 1.4,
                    transition: 'all 0.15s',
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
            <div key={i} style={{
              display: 'flex',
              gap: '14px',
              alignItems: 'flex-start',
            }}>
              {/* Avatar */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: msg.role === 'user' ? '#1f1f1f' : 'linear-gradient(135deg, #1a472a, #2d6a4f)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                flexShrink: 0,
                marginTop: '2px',
              }}>
                {msg.role === 'user' ? '👤' : '⚡'}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                {/* Print button — top of every assistant message */}
                {msg.role === 'assistant' && msg.content && (
                  <div style={{ marginBottom: '8px' }}>
                    <button
                      onClick={() => printMessage(msg.content)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#2d6a4f',
                        border: 'none',
                        borderRadius: '5px',
                        padding: '4px 12px',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        letterSpacing: '0.02em',
                      }}
                    >
                      🖨︎ Print
                    </button>
                  </div>
                )}
                <div style={{
                  fontSize: '14px',
                  lineHeight: 1.75,
                  color: msg.role === 'user' ? '#bbb' : '#d4d4d4',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
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

      {/* Input area */}
      <div style={{
        padding: '16px 24px 24px',
        borderTop: messages.length > 0 ? '1px solid #1f1f1f' : 'none',
      }}>

        {/* ── Ticker popup ───────────────────────────────────────── */}
        {tickerPopup && (
          <div style={{
            marginBottom: '10px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            background: '#0d1f16',
            border: '1px solid #2d6a4f',
            borderRadius: '8px',
            padding: '8px 12px',
          }}>
            <span style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap' }}>
              {tickerPopup.promptPrefix.length > 40
                ? tickerPopup.promptPrefix.substring(0, 40) + '...'
                : tickerPopup.promptPrefix}
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
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e5e5e5',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={submitTickerPopup}
              style={{
                background: '#2d6a4f',
                border: 'none',
                borderRadius: '5px',
                padding: '4px 10px',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >Go</button>
            <button
              onClick={() => setTickerPopup(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#555',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '0 4px',
              }}
            >×</button>
          </div>
        )}

        {/* ── Toolbar ────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          marginBottom: '10px',
          alignItems: 'center',
        }}>
          {/* Quick buttons */}
          {[
            { label: 'Pre Market', prompt: 'Give me a pre-market briefing for today.' },
            { label: 'Full Scan', prompt: 'Run the full council scan', isScan: true },
            { label: 'Market Health', prompt: 'What is the current health of the market? Cover trend, breadth, sentiment, and any warning signs.' },
          ].map(({ label, prompt }) => (
            <button
              key={label}
              onClick={() => handleToolbarSelect(prompt)}
              disabled={isLoading}
              style={{
                background: '#111',
                border: '1px solid #262626',
                borderRadius: '6px',
                padding: '5px 10px',
                color: '#888',
                fontSize: '11px',
                fontWeight: 600,
                cursor: isLoading ? 'default' : 'pointer',
                letterSpacing: '0.02em',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!isLoading) {
                  (e.target as HTMLButtonElement).style.borderColor = '#2d6a4f'
                  ;(e.target as HTMLButtonElement).style.color = '#ccc'
                }
              }}
              onMouseLeave={e => {
                (e.target as HTMLButtonElement).style.borderColor = '#262626'
                ;(e.target as HTMLButtonElement).style.color = '#888'
              }}
            >{label}</button>
          ))}

          {/* Divider */}
          <div style={{ width: '1px', height: '20px', background: '#1f1f1f', margin: '0 2px' }} />

          {/* Dropdowns */}
          {[
            { label: 'Run Scan ▾', options: SCAN_OPTIONS },
            { label: 'Market Analysis ▾', options: MARKET_OPTIONS },
            { label: 'Ask the Council ▾', options: COUNCIL_OPTIONS },
            { label: 'Trade Tools ▾', options: TRADE_TOOLS },
            { label: 'Get Data ▾', options: DATA_OPTIONS },
          ].map(({ label, options }) => (
            <select
              key={label}
              disabled={isLoading}
              onChange={e => {
                const selected = options.find(o => o.label === e.target.value) as typeof options[0] & { needsTicker?: boolean }
                if (selected) {
                  handleToolbarSelect(selected.prompt, selected.needsTicker, selected.label)
                }
                e.target.value = ''
              }}
              defaultValue=""
              style={{
                background: '#111',
                border: '1px solid #262626',
                borderRadius: '6px',
                padding: '5px 8px',
                color: '#888',
                fontSize: '11px',
                fontWeight: 600,
                cursor: isLoading ? 'default' : 'pointer',
                outline: 'none',
                fontFamily: 'inherit',
                letterSpacing: '0.02em',
              }}
            >
              <option value="" disabled>{label}</option>
              {options.map(opt => (
                <option key={opt.label} value={opt.label}>{opt.label}</option>
              ))}
            </select>
          ))}
        </div>

        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-end',
          background: '#111',
          border: '1px solid #262626',
          borderRadius: '12px',
          padding: '10px 14px',
          transition: 'border-color 0.15s',
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
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e5e5e5',
              fontSize: '14px',
              lineHeight: 1.6,
              resize: 'none',
              fontFamily: 'inherit',
              overflowY: 'hidden',
              maxHeight: '200px',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: !input.trim() || isLoading ? '#1a1a1a' : '#2d6a4f',
              color: !input.trim() || isLoading ? '#333' : '#fff',
              cursor: !input.trim() || isLoading ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            {isLoading ? '•••' : '↑'}
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#333', textAlign: 'center', marginTop: '8px' }}>
          Enter to send · Shift+Enter for new line · For educational purposes only
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
