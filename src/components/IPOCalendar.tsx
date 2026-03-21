'use client'

import { useState, useEffect } from 'react'
import type { IPOEvent } from '@/lib/finnhub'

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  expected:  { color: '#fbbf24', bg: '#2d1f00', label: 'EXPECTED' },
  priced:    { color: '#4ade80', bg: '#052e16', label: 'PRICED' },
  filed:     { color: '#60a5fa', bg: '#0d1e3b', label: 'FILED' },
  withdrawn: { color: '#f87171', bg: '#2e0505', label: 'WITHDRAWN' },
}

function formatPrice(price: string): string {
  if (!price) return '—'
  if (price.includes('-')) {
    const [lo, hi] = price.split('-').map(p => parseFloat(p.trim()))
    if (!isNaN(lo) && !isNaN(hi)) return `$${lo.toFixed(2)} – $${hi.toFixed(2)}`
  }
  const n = parseFloat(price)
  return isNaN(n) ? price : `$${n.toFixed(2)}`
}

function formatMarketCap(val: number): string {
  if (!val) return '—'
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`
  return `$${val.toLocaleString()}`
}

function formatShares(n: number): string {
  if (!n) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return n.toLocaleString()
}

function getMidPrice(price: string): number | null {
  if (!price) return null
  if (price.includes('-')) {
    const [lo, hi] = price.split('-').map(p => parseFloat(p.trim()))
    if (!isNaN(lo) && !isNaN(hi)) return (lo + hi) / 2
  }
  const n = parseFloat(price)
  return isNaN(n) ? null : n
}

export default function IPOCalendar({ onClose }: { onClose: () => void }) {
  const [ipos, setIpos] = useState<IPOEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'expected' | 'priced' | 'filed'>('all')

  useEffect(() => {
    fetch('/api/ipo')
      .then(r => r.json())
      .then(d => { setIpos(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const filtered = ipos.filter(ipo => {
    if (ipo.status === 'withdrawn') return false
    if (filter !== 'all' && ipo.status !== filter) return false
    return true
  })

  // Group by date
  const byDate: Record<string, IPOEvent[]> = {}
  filtered.forEach(ipo => {
    if (!byDate[ipo.date]) byDate[ipo.date] = []
    byDate[ipo.date].push(ipo)
  })
  const sortedDates = Object.keys(byDate).sort()

  const upcoming = filtered.filter(i => i.date >= todayStr)
  const totalValue = upcoming.reduce((s, i) => s + (i.totalSharesValue ?? 0), 0)

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: '12px',
          padding: '24px', width: '780px', maxWidth: '96vw', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.85)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e5e5e5', flex: 1 }}>🚀 IPO Calendar</div>
          {!loading && (
            <div style={{ fontSize: '10px', color: '#333', marginRight: '12px' }}>
              {upcoming.length} upcoming · {formatMarketCap(totalValue)} total deal value
            </div>
          )}
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexShrink: 0 }}>
          {(['all', 'expected', 'priced', 'filed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
                background: filter === f ? '#1a1a1a' : 'transparent',
                color: filter === f
                  ? (f === 'all' ? '#e5e5e5' : (STATUS_STYLE[f]?.color ?? '#e5e5e5'))
                  : '#333',
                transition: 'all 0.15s',
              }}
            >
              {f === 'all' ? 'ALL' : STATUS_STYLE[f]?.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', flexShrink: 0 }}>
          {Object.entries(STATUS_STYLE).filter(([k]) => k !== 'withdrawn').map(([, v]) => (
            <div key={v.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: v.color }} />
              <span style={{ fontSize: '9px', color: '#333', letterSpacing: '0.05em' }}>{v.label}</span>
            </div>
          ))}
          <div style={{ fontSize: '9px', color: '#222', marginLeft: 'auto' }}>Next 90 days · Finnhub</div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#444', fontSize: '13px' }}>Loading IPO data...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#444', fontSize: '13px' }}>No IPOs found</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {sortedDates.map(date => {
                const dayIpos = byDate[date]
                const isToday = date === todayStr
                const isPast = date < todayStr
                const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric',
                })
                return (
                  <div key={date}>
                    {/* Date header */}
                    <div style={{
                      fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
                      color: isToday ? '#7ec8a0' : isPast ? '#222' : '#555',
                      marginBottom: '8px', paddingBottom: '6px',
                      borderBottom: '1px solid #111',
                    }}>
                      {dateLabel.toUpperCase()}
                      {isToday && <span style={{ marginLeft: '8px', fontSize: '9px', background: '#1a472a', color: '#7ec8a0', borderRadius: '4px', padding: '1px 6px' }}>TODAY</span>}
                    </div>

                    {/* IPO cards for this date */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {dayIpos.map((ipo, i) => {
                        const st = STATUS_STYLE[ipo.status] ?? STATUS_STYLE.filed
                        const mid = getMidPrice(ipo.price)
                        const estCap = mid && ipo.numberOfShares ? mid * ipo.numberOfShares : (ipo.totalSharesValue ?? 0)
                        return (
                          <div
                            key={i}
                            style={{
                              background: '#080808', border: `1px solid #151515`,
                              borderLeft: `3px solid ${st.color}`,
                              borderRadius: '7px', padding: '10px 14px',
                              display: 'grid',
                              gridTemplateColumns: '1fr auto auto auto auto',
                              gap: '12px', alignItems: 'center',
                              opacity: isPast ? 0.5 : 1,
                            }}
                          >
                            {/* Name + symbol */}
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5e5e5' }}>
                                {ipo.symbol || '—'}
                              </div>
                              <div style={{ fontSize: '10px', color: '#555', marginTop: '1px' }}>{ipo.name}</div>
                              <div style={{ fontSize: '9px', color: '#2a2a2a', marginTop: '2px' }}>{ipo.exchange}</div>
                            </div>

                            {/* Price range */}
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '9px', color: '#2a2a2a', letterSpacing: '0.05em', marginBottom: '2px' }}>PRICE</div>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: '#888', fontVariantNumeric: 'tabular-nums' }}>
                                {formatPrice(ipo.price)}
                              </div>
                            </div>

                            {/* Shares */}
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '9px', color: '#2a2a2a', letterSpacing: '0.05em', marginBottom: '2px' }}>SHARES</div>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: '#666' }}>
                                {formatShares(ipo.numberOfShares)}
                              </div>
                            </div>

                            {/* Est. deal size */}
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '9px', color: '#2a2a2a', letterSpacing: '0.05em', marginBottom: '2px' }}>DEAL SIZE</div>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: '#666' }}>
                                {formatMarketCap(estCap)}
                              </div>
                            </div>

                            {/* Status badge */}
                            <div style={{
                              fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em',
                              color: st.color, background: st.bg,
                              borderRadius: '4px', padding: '3px 8px', whiteSpace: 'nowrap',
                            }}>
                              {st.label}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ fontSize: '9px', color: '#1a1a1a', textAlign: 'center', marginTop: '12px', flexShrink: 0 }}>
          IPO data from Finnhub · Updated hourly · Deal sizes are estimates based on price range midpoint
        </div>
      </div>
    </div>
  )
}
