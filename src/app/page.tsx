'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const userMessage = input.trim()
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
          <div style={{ fontSize: '11px', color: '#555', marginTop: '1px' }}>
            10 frameworks · Private intelligence
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
                {msg.role === 'assistant' && msg.content && !isLoading && (
                  <button
                    onClick={() => printMessage(msg.content)}
                    title="Print this response"
                    style={{
                      marginTop: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#1a2e1f',
                      border: '1px solid #2d6a4f',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      color: '#6ab187',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#2d6a4f'
                      ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#1a2e1f'
                      ;(e.currentTarget as HTMLButtonElement).style.color = '#6ab187'
                    }}
                  >
                    🖨︎ Print
                  </button>
                )}
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
