'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

export default function MoversPage() {
  const router = useRouter()
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

  function pct(s: string) { return s?.replace('%', '') ?? '' }
  function isPos(s: string) { return !s?.startsWith('-') }

  return (
    <div style={{ minHeight: '100vh', background: '#060606', color: '#e5e5e5', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #111', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '16px', background: '#080808', flexShrink: 0 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'transparent', border: '1px solid #1f1f1f', borderRadius: '6px', color: '#666', fontSize: '12px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ccc'}
          onMouseLeave={e => e.currentTarget.style.color = '#666'}
        >← Back</button>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>📊 Market Movers</div>
        {lastUpdated && <div style={{ fontSize: '11px', color: '#333' }}>Updated {lastUpdated}</div>}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px 32px', display: 'flex', flexDirection: 'column' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, letterSpacing: '0.03em', background: tab === t.key ? t.bg : '#111', color: tab === t.key ? t.color : '#444', transition: 'all 0.15s' }}
            >{t.label}</button>
          ))}
        </div>

        {/* Count selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <span style={{ fontSize: '12px', color: '#444' }}>Show:</span>
          {COUNTS.map(n => (
            <button key={n} onClick={() => { setCount(n); setCustomCount('') }}
              style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 600, background: count === n && !customCount ? activeTab.bg : '#111', color: count === n && !customCount ? activeTab.color : '#444' }}
            >Top {n}</button>
          ))}
          <input value={customCount} onChange={e => setCustomCount(e.target.value.replace(/\D/g, ''))} placeholder="Custom"
            style={{ width: '70px', background: '#111', border: `1px solid ${customCount ? activeTab.color : '#222'}`, borderRadius: '6px', padding: '4px 10px', color: '#e5e5e5', fontSize: '12px', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }}
          />
          <span style={{ fontSize: '11px', color: '#333' }}>Showing {Math.min(effectiveCount, total)} of {total}</span>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#444', fontSize: '14px' }}>Loading market data...</div>
          ) : rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#444', fontSize: '14px' }}>No data available — market may be closed</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px' }}>
              {rows.map((m, i) => {
                const pos = tab === 'gainers' || (tab === 'active' && isPos(m.change_percentage))
                const neg = tab === 'losers' || (tab === 'active' && !isPos(m.change_percentage))
                const pctVal = pct(m.change_percentage)
                const cardColor = pos ? '#4ade80' : neg ? '#f87171' : '#fbbf24'
                const cardBg = pos ? '#021a0a' : neg ? '#1a0202' : '#0d0a00'
                const cardBorder = pos ? '#0a3a1a' : neg ? '#3a0a0a' : '#2a2000'
                return (
                  <div key={i} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '8px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#e5e5e5', letterSpacing: '0.02em' }}>{m.ticker}</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: cardColor }}>
                        {pos && !m.change_percentage?.startsWith('+') ? '+' : ''}{pctVal}%
                      </div>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#ccc', marginBottom: '4px' }}>${parseFloat(m.price).toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#444' }}>
                      {m.change_amount && (
                        <span style={{ color: pos ? '#166534' : neg ? '#991b1b' : '#555' }}>
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
        <div style={{ fontSize: '10px', color: '#222', textAlign: 'center', marginTop: '16px' }}>Data: Alpha Vantage · Refreshes on open · Market hours only</div>
      </div>
    </div>
  )
}
