'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

const IMPACT_STYLE: Record<string, { color: string; bg: string; dot: string }> = {
  high:   { color: '#f87171', bg: '#2e0505', dot: '#f87171' },
  medium: { color: '#fbbf24', bg: '#2d1f00', dot: '#fbbf24' },
  low:    { color: '#666',    bg: '#1a1a1a', dot: '#555' },
}

const KEY_EVENTS = ['fomc', 'federal reserve', 'cpi', 'nonfarm', 'gdp', 'unemployment', 'pce', 'ppi', 'retail sales', 'ism', 'fed funds', 'interest rate']

function isKeyEvent(name: string): boolean {
  return KEY_EVENTS.some(k => name.toLowerCase().includes(k))
}

function formatTime(time: string): string {
  if (!time) return 'TBA'
  const parts = time.split(':')
  if (parts.length >= 2) {
    const h = parseInt(parts[0])
    const m = parts[1]
    return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`
  }
  return time
}

function outcomeColor(actual: string | null, estimate: string | null): string {
  if (!actual || !estimate) return '#777'
  const a = parseFloat(actual), e = parseFloat(estimate)
  if (isNaN(a) || isNaN(e)) return '#777'
  return a >= e ? '#4ade80' : '#f87171'
}

export default function EconomicCalendarPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EconEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [impactFilter, setImpactFilter] = useState<'high' | 'medium' | 'all'>('high')
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  useEffect(() => {
    fetch('/api/economic/calendar')
      .then(r => r.json())
      .then((d: EconEvent[]) => {
        setEvents(Array.isArray(d) ? d : [])
        const dates = Array.from(new Set((Array.isArray(d) ? d : []).map((e: EconEvent) => (e.time ?? e.date ?? '').split('T')[0]))).sort() as string[]
        const toExpand = new Set<string>()
        let count = 0
        for (const date of dates) {
          if (date >= todayStr && count < 3) { toExpand.add(date); count++ }
        }
        if (toExpand.size === 0 && dates.length > 0) toExpand.add(dates[0])
        setExpandedDates(toExpand)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = events.filter(e => {
    if (impactFilter === 'high') return e.impact === 'high'
    if (impactFilter === 'medium') return e.impact === 'high' || e.impact === 'medium'
    return true
  })

  const byDate: Record<string, EconEvent[]> = {}
  filtered.forEach(e => {
    const key = (e.time ?? e.date ?? '').split('T')[0]
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(e)
  })
  const sortedDates = Object.keys(byDate).sort()

  const upcomingHigh = events.filter(e => e.impact === 'high' && (e.time ?? e.date ?? '').split('T')[0] >= todayStr).length
  const thisWeekEnd = new Date(now); thisWeekEnd.setDate(now.getDate() + (7 - now.getDay()))
  const thisWeekStr = `${thisWeekEnd.getFullYear()}-${String(thisWeekEnd.getMonth() + 1).padStart(2, '0')}-${String(thisWeekEnd.getDate()).padStart(2, '0')}`
  const thisWeekHigh = events.filter(e => e.impact === 'high' && (e.time ?? e.date ?? '').split('T')[0] >= todayStr && (e.time ?? e.date ?? '').split('T')[0] <= thisWeekStr).length

  function toggleDate(date: string) {
    setExpandedDates(prev => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'inherit' }}>

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '16px', background: '#0f0f0f', flexShrink: 0 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#888', fontSize: '12px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ccc'}
          onMouseLeave={e => e.currentTarget.style.color = '#888'}
        >← Back</button>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>🏦 Economic Calendar</div>
        <div style={{ fontSize: '11px', color: '#777' }}>US Events · ForexFactory · Times in ET</div>

        {/* Impact filter */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {([
            { id: 'high',   label: '🔴 High' },
            { id: 'medium', label: '🟡 + Medium' },
            { id: 'all',    label: 'All' },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setImpactFilter(f.id)}
              style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 600, background: impactFilter === f.id ? '#222' : 'transparent', color: impactFilter === f.id ? '#e5e5e5' : '#777' }}
            >{f.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 32px' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
          {[
            { label: 'High Impact Upcoming', value: upcomingHigh, color: '#f87171' },
            { label: 'High Impact This Week', value: thisWeekHigh, color: '#fbbf24' },
            { label: 'Total Events Loaded', value: events.length, color: '#7ec8a0' },
          ].map(s => (
            <div key={s.label} style={{ background: '#141414', border: '1px solid #222', borderRadius: '10px', padding: '16px 20px' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', color: '#777', fontWeight: 700, letterSpacing: '0.08em' }}>LEGEND:</div>
          {[{ color: '#4ade80', label: 'Beat Estimate' }, { color: '#f87171', label: 'Missed Estimate' }, { color: '#888', label: 'Pending' }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#888' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: l.color }} />
              {l.label}
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#777' }}>
            <span style={{ borderLeft: '3px solid #2d6a4f', paddingLeft: '6px' }}>Key market-moving events</span>
          </div>
        </div>

        {/* Events */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#777', fontSize: '14px' }}>Loading economic data...</div>
        ) : sortedDates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#777', fontSize: '14px' }}>No events found for this filter</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {sortedDates.map(date => {
              const dayEvents = byDate[date]
              const isToday = date === todayStr
              const isPast = date < todayStr
              const isExpanded = expandedDates.has(date)
              const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              const highCount = dayEvents.filter(e => e.impact === 'high').length
              const medCount = dayEvents.filter(e => e.impact === 'medium').length

              return (
                <div key={date}>
                  {/* Date header */}
                  <div
                    onClick={() => toggleDate(date)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 16px', borderRadius: '8px',
                      background: isToday ? '#0e1f14' : '#161616',
                      border: `1px solid ${isToday ? '#2d6a4f' : '#222'}`,
                      cursor: 'pointer', marginBottom: isExpanded ? '4px' : '0',
                      opacity: isPast && !isToday ? 0.65 : 1,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: isToday ? '#7ec8a0' : isPast ? '#777' : '#d0d0d0' }}>
                        {dateLabel}
                        {isToday && <span style={{ marginLeft: '10px', fontSize: '10px', background: '#1a472a', color: '#7ec8a0', borderRadius: '4px', padding: '2px 8px', fontWeight: 700 }}>TODAY</span>}
                        {isPast && !isToday && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#555' }}>PAST</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {highCount > 0 && <span style={{ fontSize: '10px', color: '#f87171', background: '#2e0505', borderRadius: '4px', padding: '2px 8px', fontWeight: 700 }}>{highCount} HIGH</span>}
                      {medCount > 0 && <span style={{ fontSize: '10px', color: '#fbbf24', background: '#2d1f00', borderRadius: '4px', padding: '2px 8px', fontWeight: 600 }}>{medCount} MED</span>}
                      <span style={{ fontSize: '11px', color: '#666' }}>{dayEvents.length} events</span>
                      <span style={{ fontSize: '12px', color: '#666', width: '16px', textAlign: 'center' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Event rows */}
                  {isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '8px' }}>
                      {dayEvents.map((ev, i) => {
                        const imp = IMPACT_STYLE[ev.impact] ?? IMPACT_STYLE.low
                        const isKey = isKeyEvent(ev.event)
                        const actColor = outcomeColor(ev.actual, ev.estimate)
                        const timeStr = ev.time ? formatTime(ev.time.split('T')[1] ?? ev.time) : 'TBA'

                        return (
                          <div
                            key={i}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '80px 1fr 90px 90px 90px 90px',
                              gap: '0', alignItems: 'center',
                              padding: '10px 16px',
                              background: isKey ? '#0e1a12' : '#141414',
                              borderRadius: '6px',
                              borderLeft: `3px solid ${isKey ? '#2d6a4f' : '#222'}`,
                            }}
                          >
                            {/* Time */}
                            <div style={{ fontSize: '11px', color: '#777', fontVariantNumeric: 'tabular-nums' }}>{timeStr} ET</div>

                            {/* Event name */}
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: isKey ? 700 : 400, color: isKey ? '#e5e5e5' : '#b0b0b0' }}>{ev.event}</span>
                            </div>

                            {/* Impact badge */}
                            <div>
                              <span style={{ fontSize: '9px', fontWeight: 800, color: imp.color, background: imp.bg, borderRadius: '4px', padding: '2px 7px', letterSpacing: '0.05em' }}>
                                {(ev.impact ?? '').toUpperCase()}
                              </span>
                            </div>

                            {/* Previous */}
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '9px', color: '#666', marginBottom: '2px', letterSpacing: '0.05em' }}>PREV</div>
                              <div style={{ fontSize: '12px', color: '#999', fontVariantNumeric: 'tabular-nums' }}>
                                {ev.previous != null ? `${ev.previous}${ev.unit ?? ''}` : '—'}
                              </div>
                            </div>

                            {/* Estimate */}
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '9px', color: '#666', marginBottom: '2px', letterSpacing: '0.05em' }}>EST</div>
                              <div style={{ fontSize: '12px', color: '#bbb', fontVariantNumeric: 'tabular-nums' }}>
                                {ev.estimate != null ? `${ev.estimate}${ev.unit ?? ''}` : '—'}
                              </div>
                            </div>

                            {/* Actual */}
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '9px', color: '#666', marginBottom: '2px', letterSpacing: '0.05em' }}>ACTUAL</div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: actColor, fontVariantNumeric: 'tabular-nums' }}>
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

        <div style={{ marginTop: '40px', padding: '16px', borderTop: '1px solid #1a1a1a', fontSize: '11px', color: '#555', textAlign: 'center' }}>
          Source: ForexFactory · US USD events · Updated hourly · All times Eastern
        </div>
      </div>
    </div>
  )
}
