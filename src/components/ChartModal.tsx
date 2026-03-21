'use client'

import { useState, useEffect, useRef } from 'react'

interface ChartModalProps {
  ticker?: string
  isCrypto?: boolean
  onClose: () => void
}

const INTERVALS = [
  { label: '15m', tv: '15' },
  { label: '1H', tv: '60' },
  { label: '4H', tv: '240' },
  { label: '1D', tv: 'D' },
  { label: '1W', tv: 'W' },
]

export default function ChartModal({ ticker: initialTicker = 'SPY', isCrypto: initialCrypto = false, onClose }: ChartModalProps) {
  const [intervalIdx, setIntervalIdx] = useState(3) // default 1D
  const [inputVal, setInputVal] = useState(initialTicker)
  const [ticker, setTicker] = useState(initialTicker)
  const [isCrypto, setIsCrypto] = useState(initialCrypto)
  const containerRef = useRef<HTMLDivElement>(null)

  const tvSymbol = isCrypto ? `COINBASE:${ticker}USD` : ticker
  const interval = INTERVALS[intervalIdx].tv

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: false,
      width: containerRef.current.clientWidth || 1360,
      height: 680,
      symbol: tvSymbol,
      interval,
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: '#0d0d0d',
      gridColor: '#111111',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    })
    containerRef.current.appendChild(script)
  }, [tvSymbol, interval])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = inputVal.trim().toUpperCase()
    if (!val) return
    setTicker(val)
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: '12px',
          padding: '18px 20px', width: '1400px', maxWidth: '98vw',
          boxShadow: '0 24px 80px rgba(0,0,0,0.95)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          {/* Ticker input */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value.toUpperCase())}
              placeholder="Ticker..."
              style={{
                background: '#111', border: '1px solid #2a2a2a', borderRadius: '6px',
                color: '#e5e5e5', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit',
                padding: '5px 10px', width: '90px', outline: 'none', letterSpacing: '0.05em',
              }}
            />
            <button
              type="submit"
              style={{
                background: '#1a472a', border: 'none', borderRadius: '6px',
                color: '#7ec8a0', fontSize: '11px', fontWeight: 600, fontFamily: 'inherit',
                padding: '5px 12px', cursor: 'pointer',
              }}
            >Chart</button>
          </form>

          {/* Stock / Crypto toggle */}
          <div style={{ display: 'flex', gap: '3px' }}>
            {(['Stock', 'Crypto'] as const).map(t => (
              <button
                key={t}
                onClick={() => setIsCrypto(t === 'Crypto')}
                style={{
                  padding: '4px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '10px', fontWeight: 600,
                  background: (t === 'Crypto') === isCrypto ? '#111' : 'transparent',
                  color: (t === 'Crypto') === isCrypto ? '#ccc' : '#333',
                }}
              >{t}</button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Interval tabs */}
          <div style={{ display: 'flex', gap: '3px' }}>
            {INTERVALS.map((iv, i) => (
              <button
                key={iv.label}
                onClick={() => setIntervalIdx(i)}
                style={{
                  padding: '4px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '11px', fontWeight: 600,
                  background: intervalIdx === i ? '#1a472a' : '#111',
                  color: intervalIdx === i ? '#7ec8a0' : '#444',
                }}
              >{iv.label}</button>
            ))}
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        {/* TradingView widget */}
        <div
          className="tradingview-widget-container"
          ref={containerRef}
          style={{ width: '100%', height: '680px', borderRadius: '8px', overflow: 'hidden' }}
        />
      </div>
    </div>
  )
}
