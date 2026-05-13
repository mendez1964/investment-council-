'use client'

import { useState, useEffect } from 'react'

interface EconEvent {
  event: string
  country: string
  date: string
  time: string
  impact: string
  actual: string | null
  previous: string | null
  estimate: string | null
  unit: string
}

const IMPACT_STYLE: Record<string, { color: string; bg: string }> = {
  high:   { color: '#f87171', bg: '#2e0505' },
  medium: { color: '#fbbf24', bg: '#2d1f00' },
  low:    { color: '#555',    bg: '#111' },
}

const KEY_EVENTS = ['fomc', 'federal reserve', 'cpi', 'nonfarm', 'gdp', 'unemployment', 'pce', 'ppi', 'retail sales', 'ism', 'fed funds']

function isKeyEvent(name: string): boolean {
  const lower = name.toLowerCase()
  return KEY_EVENTS.some(k => lower.includes(k))
}

function formatTime(time: string): string {
  if (!time) return '—'
  // time might be "08:30:00" or already formatted
  const parts = time.split(':')
  if (parts.length >= 2) {
    const h = parseInt(parts[0])
    const m = parts[1]
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${m} ${ampm}`
  }
  return time
}

function outcomeStyle(actual: string | null, estimate: string | null): string {
  if (!actual || !estimate) return '#888'
  const a = parseFloat(actual), e = parseFloat(estimate)
  if (isNaN(a) || isNaN(e)) return '#888'
  return a >= e ? '#4ade80' : '#f87171'
}

export default function EconomicCalendar({ onClose }: { onClose: () => void }) {
  const [events, setEvents] = useState<EconEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [impactFilter, setImpactFilter] = useState<'all' | 'high' | 'medium'>('high')
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/economic/calendar')
      .then(r => r.json())
      .then(d => {
        setEvents(Array.isArray(d) ? d : [])
        setLoading(false)
        // Auto-expand first date with events
        const dates = Array.from(new Set((Array.isArray(d) ? d : []).map((e: EconEvent) => (e.time ?? e.date ?? '').split('T')[0])))
        if (dates.length > 0) setExpandedDate(dates[0] as string)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = events.filter(e => {
    if (impactFilter === 'high') return e.impact === 'high'
    if (impactFilter === 'medium') return e.impact === 'high' || e.impact === 'medium'
    return true
  })

  // Group by date
  const byDate: Record<string, EconEvent[]> = {}
  filtered.forEach(e => {
    const dateKey = (e.time ?? e.date ?? '').split('T')[0]
    if (!byDate[dateKey]) byDate[dateKey] = []
    byDate[dateKey].push(e)
  })
  const sortedDates = Object.keys(byDate).sort()

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111', border: '1px solid #222', borderRadius: '12px',
          padding: '22px 24px', width: '780px', maxWidth: '97vw', maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.9)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e5e5e5', flex: 1 }}>🏦 Economic Calendar</div>
          <div style={{ fontSize: '10px', color: '#666', marginRight: '12px' }}>US Events · Next 60 Days</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        {/* Impact filter */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexShrink: 0, alignItems: 'center' }}>
          {([
            { id: 'high', label: '🔴 High Impact' },
            { id: 'medium', label: '🟡 + Medium' },
            { id: 'all', label: 'All Events' },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setImpactFilter(f.id)}
              style={{
                padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '11px', fontWeight: 600,
                background: impactFilter === f.id ? '#222' : 'transparent',
                color: impactFilter === f.id ? '#e5e5e5' : '#666',
              }}
            >{f.label}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', fontSize: '9px', color: '#777' }}>
            <span><span style={{ color: '#4ade80' }}>■</span> Beat</span>
            <span><span style={{ color: '#f87171' }}>■</span> Miss</span>
            <span><span style={{ color: '#aaa' }}>■</span> Pending</span>
          </div>
        </div>

        {/* Events list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#444', fontSize: '13px' }}>Loading economic data...</div>
          ) : sortedDates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#444', fontSize: '13px' }}>No events found</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sortedDates.map(date => {
                const dayEvents = byDate[date]
                const isToday = date === todayStr
                const isPast = date < todayStr
                const isExpanded = expandedDate === date || isToday
                const dateLabel = date
                  ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                  : date

                const highCount = dayEvents.filter(e => e.impact === 'high').length

                return (
                  <div key={date}>
                    {/* Date header — clickable to expand */}
                    <div
                      onClick={() => setExpandedDate(isExpanded ? null : date)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 10px', borderRadius: '6px',
                        background: isToday ? '#0e1f14' : '#161616',
                        border: `1px solid ${isToday ? '#2d6a4f' : '#222'}`,
                        cursor: 'pointer', marginBottom: '2px',
                        opacity: isPast ? 0.6 : 1,
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: isToday ? '#7ec8a0' : isPast ? '#666' : '#c0c0c0', flex: 1 }}>
                        {dateLabel.toUpperCase()}
                        {isToday && <span style={{ marginLeft: '8px', fontSize: '9px', background: '#1a472a', color: '#7ec8a0', borderRadius: '4px', padding: '1px 6px' }}>TODAY</span>}
                      </div>
                      {highCount > 0 && (
                        <span style={{ fontSize: '9px', color: '#f87171', background: '#2e0505', borderRadius: '4px', padding: '2px 6px', fontWeight: 700 }}>
                          {highCount} HIGH
                        </span>
                      )}
                      <span style={{ fontSize: '9px', color: '#666' }}>{dayEvents.length} events</span>
                      <span style={{ fontSize: '12px', color: '#555' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    {/* Event rows */}
                    {isExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '8px', marginLeft: '8px' }}>
                        {dayEvents.map((ev, i) => {
                          const imp = IMPACT_STYLE[ev.impact] ?? IMPACT_STYLE.low
                          const isKey = isKeyEvent(ev.event)
                          const actColor = outcomeStyle(ev.actual, ev.estimate)
                          const timeStr = ev.time ? formatTime(ev.time.split('T')[1] ?? ev.time) : '—'

                          return (
                            <div
                              key={i}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '52px 1fr 80px 80px 80px 70px',
                                gap: '8px', alignItems: 'center',
                                padding: '8px 12px',
                                background: isKey ? '#0e1a12' : '#141414',
                                borderRadius: '6px',
                                borderLeft: isKey ? '3px solid #2d6a4f' : '3px solid #222',
                              }}
                            >
                              {/* Time */}
                              <div style={{ fontSize: '10px', color: '#777', fontVariantNumeric: 'tabular-nums' }}>{timeStr} ET</div>

                              {/* Event name */}
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: isKey ? 700 : 500, color: isKey ? '#e5e5e5' : '#b0b0b0' }}>{ev.event}</div>
                              </div>

                              {/* Impact */}
                              <div style={{ fontSize: '9px', fontWeight: 700, color: imp.color, background: imp.bg, borderRadius: '4px', padding: '2px 6px', textAlign: 'center', letterSpacing: '0.05em' }}>
                                {(ev.impact ?? '').toUpperCase()}
                              </div>

                              {/* Previous */}
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '8px', color: '#555', marginBottom: '1px' }}>PREV</div>
                                <div style={{ fontSize: '11px', color: '#888', fontVariantNumeric: 'tabular-nums' }}>
                                  {ev.previous != null ? `${ev.previous}${ev.unit ?? ''}` : '—'}
                                </div>
                              </div>

                              {/* Estimate */}
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '8px', color: '#555', marginBottom: '1px' }}>EST</div>
                                <div style={{ fontSize: '11px', color: '#aaa', fontVariantNumeric: 'tabular-nums' }}>
                                  {ev.estimate != null ? `${ev.estimate}${ev.unit ?? ''}` : '—'}
                                </div>
                              </div>

                              {/* Actual */}
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '8px', color: '#555', marginBottom: '1px' }}>ACTUAL</div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: actColor, fontVariantNumeric: 'tabular-nums' }}>
                                  {ev.actual != null ? `${ev.actual}${ev.unit ?? ''}` : '—'}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ fontSize: '9px', color: '#555', textAlign: 'center', marginTop: '10px', flexShrink: 0 }}>
          Finnhub · US events · Updated hourly · Times in ET
        </div>
      </div>
    </div>
  )
}
