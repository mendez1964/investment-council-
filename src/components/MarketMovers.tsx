'use client'

import { useState, useEffect } from 'react'

interface Mover {
  ticker: string
  price: string
  change_amount: string
  change_percentage: string
  volume: string
}

interface MoversData {
  top_gainers?: Mover[]
  top_losers?: Mover[]
  most_actively_traded?: Mover[]
}

const COUNTS = [10, 25, 50]

export default function MarketMovers({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<MoversData>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'gainers' | 'losers' | 'active'>('gainers')
  const [count, setCount] = useState(10)
  const [customCount, setCustomCount] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/movers')
      .then(r => r.json())
      .then(d => {
        setData(d)
        setLoading(false)
        setLastUpdated(new Date().toLocaleTimeString())
      })
      .catch(() => setLoading(false))
  }, [])

  const allRows: Record<typeof tab, Mover[]> = {
    gainers: data.top_gainers ?? [],
    losers: data.top_losers ?? [],
    active: data.most_actively_traded ?? [],
  }

  const effectiveCount = customCount ? parseInt(customCount) || count : count
  const rows = allRows[tab].slice(0, effectiveCount)
  const total = allRows[tab].length

  const tabs: { key: typeof tab; label: string; color: string; bg: string }[] = [
    { key: 'gainers', label: '▲ Top Gainers', color: '#4ade80', bg: '#052e16' },
    { key: 'losers',  label: '▼ Top Losers',  color: '#f87171', bg: '#2e0505' },
    { key: 'active',  label: '⚡ Most Active', color: '#fbbf24', bg: '#1c1500' },
  ]

  const activeTab = tabs.find(t => t.key === tab)!

  function pct(s: string) {
    return s?.replace('%', '') ?? ''
  }
  function isPos(s: string) {
    return !s?.startsWith('-')
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '24px', width: '780px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '10px', flexShrink: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e5e5e5', flex: 1 }}>📊 Market Movers</div>
          {lastUpdated && <div style={{ fontSize: '10px', color: '#666' }}>Updated {lastUpdated}</div>}
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexShrink: 0 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '12px', fontWeight: 700, letterSpacing: '0.03em',
                background: tab === t.key ? t.bg : '#161616',
                color: tab === t.key ? t.color : '#666',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Count selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: '#777' }}>Show:</span>
          {COUNTS.map(n => (
            <button
              key={n}
              onClick={() => { setCount(n); setCustomCount('') }}
              style={{
                padding: '3px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '11px', fontWeight: 600,
                background: count === n && !customCount ? activeTab.bg : '#161616',
                color: count === n && !customCount ? activeTab.color : '#666',
              }}
            >
              Top {n}
            </button>
          ))}
          <input
            value={customCount}
            onChange={e => setCustomCount(e.target.value.replace(/\D/g, ''))}
            placeholder="Custom"
            style={{
              width: '60px', background: '#111', border: `1px solid ${customCount ? activeTab.color : '#222'}`,
              borderRadius: '5px', padding: '3px 8px', color: '#e5e5e5', fontSize: '11px',
              fontFamily: 'inherit', outline: 'none', textAlign: 'center',
            }}
          />
          <span style={{ fontSize: '11px', color: '#666', marginLeft: '4px' }}>
            Showing {Math.min(effectiveCount, total)} of {total} available
          </span>
        </div>

        {/* Grid */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#777', fontSize: '13px' }}>Loading market data...</div>
          ) : rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#777', fontSize: '13px' }}>No data available — market may be closed</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
              {rows.map((m, i) => {
                const pos = tab === 'gainers' || (tab === 'active' && isPos(m.change_percentage))
                const neg = tab === 'losers' || (tab === 'active' && !isPos(m.change_percentage))
                const pctVal = pct(m.change_percentage)
                const cardColor = pos ? '#4ade80' : neg ? '#f87171' : '#fbbf24'
                const cardBg = pos ? '#021a0a' : neg ? '#1a0202' : '#0d0a00'
                const cardBorder = pos ? '#0a3a1a' : neg ? '#3a0a0a' : '#2a2000'

                return (
                  <div key={i} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5e5e5', letterSpacing: '0.02em' }}>{m.ticker}</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: cardColor }}>
                        {pos && !m.change_percentage?.startsWith('+') ? '+' : ''}{pctVal}%
                      </div>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#ccc', marginBottom: '4px' }}>
                      ${parseFloat(m.price).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#777' }}>
                      {m.change_amount && (
                        <span style={{ color: pos ? '#4ade80' : neg ? '#f87171' : '#888' }}>
                          {pos && !m.change_amount?.startsWith('+') ? '+' : ''}{parseFloat(m.change_amount).toFixed(2)}{'  '}
                        </span>
                      )}
                      Vol: {parseInt(m.volume).toLocaleString()}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ fontSize: '10px', color: '#555', textAlign: 'center', marginTop: '12px', flexShrink: 0 }}>
          Data: Alpha Vantage · Refreshes on open · Market hours only
        </div>
      </div>
    </div>
  )
}
