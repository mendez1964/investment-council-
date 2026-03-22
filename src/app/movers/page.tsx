'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

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

  useEffect(() => { trackPageView('/movers') }, [])

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

  const tabs: { key: typeof tab; label: string; color: string; activeBg: string }[] = [
    { key: 'gainers', label: '▲ Top Gainers', color: '#16a34a', activeBg: '#dcfce7' },
    { key: 'losers',  label: '▼ Top Losers',  color: '#dc2626', activeBg: '#fee2e2' },
    { key: 'active',  label: '⚡ Most Active', color: '#d97706', activeBg: '#fef3c7' },
  ]

  const activeTab = tabs.find(t => t.key === tab)!

  function pct(s: string) { return s?.replace('%', '') ?? '' }
  function isPos(s: string) { return !s?.startsWith('-') }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', color: '#111827', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #e4e4e7', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '16px', background: '#ffffff', flexShrink: 0 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'transparent', border: '1px solid #d4d4d8', borderRadius: '6px', color: '#555', fontSize: '12px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#111'; e.currentTarget.style.borderColor = '#a1a1aa' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#d4d4d8' }}
        >← Back</button>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>📊 Market Movers</div>
        {lastUpdated && <div style={{ fontSize: '11px', color: '#6b7280' }}>Updated {lastUpdated}</div>}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px 32px', display: 'flex', flexDirection: 'column' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, letterSpacing: '0.03em', background: tab === t.key ? t.activeBg : '#f4f4f5', color: tab === t.key ? t.color : '#6b7280', transition: 'all 0.15s' }}
            >{t.label}</button>
          ))}
        </div>

        {/* Count selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Show:</span>
          {COUNTS.map(n => (
            <button key={n} onClick={() => { setCount(n); setCustomCount('') }}
              style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 600, background: count === n && !customCount ? activeTab.activeBg : '#f4f4f5', color: count === n && !customCount ? activeTab.color : '#6b7280' }}
            >Top {n}</button>
          ))}
          <input value={customCount} onChange={e => setCustomCount(e.target.value.replace(/\D/g, ''))} placeholder="Custom"
            style={{ width: '70px', background: '#ffffff', border: `1px solid ${customCount ? activeTab.color : '#d4d4d8'}`, borderRadius: '6px', padding: '4px 10px', color: '#111', fontSize: '12px', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }}
          />
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Showing {Math.min(effectiveCount, total)} of {total}</span>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280', fontSize: '14px' }}>Loading market data...</div>
          ) : rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280', fontSize: '14px' }}>No data available — market may be closed</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px' }}>
              {rows.map((m, i) => {
                const pos = tab === 'gainers' || (tab === 'active' && isPos(m.change_percentage))
                const neg = tab === 'losers' || (tab === 'active' && !isPos(m.change_percentage))
                const pctVal = pct(m.change_percentage)
                const cardColor = pos ? '#16a34a' : neg ? '#dc2626' : '#d97706'
                const cardBg = pos ? '#f0fdf4' : neg ? '#fef2f2' : '#fffbeb'
                const cardBorder = pos ? '#bbf7d0' : neg ? '#fecaca' : '#fde68a'
                return (
                  <div key={i} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '8px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', letterSpacing: '0.02em' }}>{m.ticker}</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: cardColor }}>
                        {pos && !m.change_percentage?.startsWith('+') ? '+' : ''}{pctVal}%
                      </div>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>${parseFloat(m.price).toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      {m.change_amount && (
                        <span style={{ color: cardColor }}>
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
        <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', marginTop: '16px' }}>Data: Alpha Vantage · Refreshes on open · Market hours only</div>
      </div>
    </div>
  )
}
