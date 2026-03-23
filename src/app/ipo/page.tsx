'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { IPOEvent } from '@/lib/finnhub'
import { trackPageView } from '@/lib/analytics'

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  expected:  { color: '#d97706', bg: '#fef3c7', label: 'EXPECTED' },
  priced:    { color: '#16a34a', bg: '#dcfce7', label: 'PRICED' },
  filed:     { color: '#2563eb', bg: '#dbeafe', label: 'FILED' },
  withdrawn: { color: '#dc2626', bg: '#fee2e2', label: 'WITHDRAWN' },
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

export default function IPOPage() {
  const router = useRouter()
  const [ipos, setIpos] = useState<IPOEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'expected' | 'priced' | 'filed'>('all')

  useEffect(() => { trackPageView('/ipo') }, [])

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

  const byDate: Record<string, IPOEvent[]> = {}
  filtered.forEach(ipo => {
    if (!byDate[ipo.date]) byDate[ipo.date] = []
    byDate[ipo.date].push(ipo)
  })
  const sortedDates = Object.keys(byDate).sort()

  const upcoming = filtered.filter(i => i.date >= todayStr)
  const totalValue = upcoming.reduce((s, i) => s + (i.totalSharesValue ?? 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', color: '#111827', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #e4e4e7', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '16px', background: '#ffffff', flexShrink: 0 }}>
        <button onClick={() => router.push("/app")}
          style={{ background: 'transparent', border: '1px solid #d4d4d8', borderRadius: '6px', color: '#555', fontSize: '12px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#111'; e.currentTarget.style.borderColor = '#a1a1aa' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#d4d4d8' }}
        >← Back</button>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>🚀 IPO Calendar</div>
        {!loading && (
          <div style={{ fontSize: '11px', color: '#6b7280' }}>
            {upcoming.length} upcoming · {formatMarketCap(totalValue)} total deal value
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '2px', marginLeft: 'auto', background: '#f4f4f5', borderRadius: '8px', padding: '3px' }}>
          {(['all', 'expected', 'priced', 'filed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', background: filter === f ? '#ffffff' : 'transparent', color: filter === f ? '#111' : '#6b7280', boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}
            >{f === 'all' ? 'ALL' : STATUS_STYLE[f]?.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {/* Legend */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          {Object.entries(STATUS_STYLE).filter(([k]) => k !== 'withdrawn').map(([, v]) => (
            <div key={v.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: v.color }} />
              <span style={{ fontSize: '11px', color: '#6b7280', letterSpacing: '0.05em' }}>{v.label}</span>
            </div>
          ))}
          <div style={{ fontSize: '10px', color: '#6b7280', marginLeft: 'auto' }}>Next 90 days · Finnhub</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280', fontSize: '14px' }}>Loading IPO data...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280', fontSize: '14px' }}>No IPOs found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {sortedDates.map(date => {
              const dayIpos = byDate[date]
              const isToday = date === todayStr
              const isPast = date < todayStr
              const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
              return (
                <div key={date}>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: isToday ? '#15803d' : isPast ? '#9ca3af' : '#111827', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #e4e4e7' }}>
                    {dateLabel.toUpperCase()}
                    {isToday && <span style={{ marginLeft: '8px', fontSize: '9px', background: '#dcfce7', color: '#15803d', borderRadius: '4px', padding: '1px 6px' }}>TODAY</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {dayIpos.map((ipo, i) => {
                      const st = STATUS_STYLE[ipo.status] ?? STATUS_STYLE.filed
                      const mid = getMidPrice(ipo.price)
                      const estCap = mid && ipo.numberOfShares ? mid * ipo.numberOfShares : (ipo.totalSharesValue ?? 0)
                      return (
                        <div key={i} style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderLeft: `3px solid ${st.color}`, borderRadius: '7px', padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: '16px', alignItems: 'center', opacity: isPast ? 0.5 : 1 }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{ipo.symbol || '—'}</div>
                            <div style={{ fontSize: '11px', color: '#374151', marginTop: '2px' }}>{ipo.name}</div>
                            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{ipo.exchange}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.05em', marginBottom: '2px' }}>PRICE</div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{formatPrice(ipo.price)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.05em', marginBottom: '2px' }}>SHARES</div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{formatShares(ipo.numberOfShares)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.05em', marginBottom: '2px' }}>DEAL SIZE</div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{formatMarketCap(estCap)}</div>
                          </div>
                          <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', color: st.color, background: st.bg, borderRadius: '4px', padding: '3px 8px', whiteSpace: 'nowrap' }}>{st.label}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', marginTop: '20px' }}>IPO data from Finnhub · Updated hourly · Deal sizes are estimates based on price range midpoint</div>
      </div>
    </div>
  )
}
