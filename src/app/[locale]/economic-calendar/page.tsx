'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

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
  high:   { color: '#dc2626', bg: '#fee2e2' },
  medium: { color: '#d97706', bg: '#fef3c7' },
  low:    { color: '#6b7280', bg: '#f3f4f6' },
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
  if (!actual || !estimate) return '#6b7280'
  const a = parseFloat(actual), e = parseFloat(estimate)
  if (isNaN(a) || isNaN(e)) return '#6b7280'
  return a >= e ? '#16a34a' : '#dc2626'
}

export default function EconomicCalendarPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EconEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [impactFilter, setImpactFilter] = useState<'high' | 'medium' | 'all'>('high')
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  useEffect(() => { trackPageView('/economic-calendar') }, [])

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
    <div style={{ minHeight: '100vh', background: '#f4f4f5', color: '#111', fontFamily: 'inherit' }}>

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #e4e4e7', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '16px', background: '#ffffff' }}>
        <button
          onClick={() => router.push("/app")}
          style={{ background: 'transparent', border: '1px solid #d4d4d8', borderRadius: '6px', color: '#555', fontSize: '12px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#111'; e.currentTarget.style.borderColor = '#a1a1aa' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#d4d4d8' }}
        >← Back</button>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#111' }}>🏦 Economic Calendar</div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>US Events · ForexFactory · Times in ET</div>

        {/* Impact filter */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', background: '#f4f4f5', borderRadius: '8px', padding: '3px' }}>
          {([
            { id: 'high',   label: '🔴 High' },
            { id: 'medium', label: '🟡 + Medium' },
            { id: 'all',    label: 'All' },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setImpactFilter(f.id)}
              style={{
                padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '11px', fontWeight: 600,
                background: impactFilter === f.id ? '#ffffff' : 'transparent',
                color: impactFilter === f.id ? '#111' : '#6b7280',
                boxShadow: impactFilter === f.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >{f.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 32px' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
          {[
            { label: 'High Impact Upcoming', value: upcomingHigh, color: '#dc2626', bg: '#fff', border: '#fecaca' },
            { label: 'High Impact This Week', value: thisWeekHigh, color: '#d97706', bg: '#fff', border: '#fde68a' },
            { label: 'Total Events Loaded',  value: events.length, color: '#16a34a', bg: '#fff', border: '#bbf7d0' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '10px', padding: '16px 20px' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', alignItems: 'center', background: '#fff', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '10px 16px' }}>
          <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em' }}>LEGEND:</div>
          {[{ color: '#16a34a', label: 'Beat Estimate' }, { color: '#dc2626', label: 'Missed Estimate' }, { color: '#9ca3af', label: 'Pending' }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#374151' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: l.color }} />
              {l.label}
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#6b7280' }}>
            <span style={{ borderLeft: '3px solid #16a34a', paddingLeft: '6px' }}>Key market-moving events</span>
          </div>
        </div>

        {/* Events */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280', fontSize: '14px' }}>Loading economic data...</div>
        ) : sortedDates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280', fontSize: '14px' }}>No events found for this filter</div>
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
                      background: isToday ? '#f0fdf4' : '#ffffff',
                      border: `1px solid ${isToday ? '#86efac' : '#e4e4e7'}`,
                      cursor: 'pointer', marginBottom: isExpanded ? '2px' : '0',
                      opacity: isPast && !isToday ? 0.6 : 1,
                    }}
                    onMouseEnter={e => { if (!isToday) (e.currentTarget as HTMLDivElement).style.background = '#fafafa' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isToday ? '#f0fdf4' : '#ffffff' }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: isToday ? '#15803d' : isPast ? '#9ca3af' : '#111' }}>
                        {dateLabel}
                        {isToday && <span style={{ marginLeft: '10px', fontSize: '10px', background: '#dcfce7', color: '#15803d', borderRadius: '4px', padding: '2px 8px', fontWeight: 700 }}>TODAY</span>}
                        {isPast && !isToday && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#9ca3af' }}>PAST</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {highCount > 0 && <span style={{ fontSize: '10px', color: '#dc2626', background: '#fee2e2', borderRadius: '4px', padding: '2px 8px', fontWeight: 700 }}>{highCount} HIGH</span>}
                      {medCount > 0 && <span style={{ fontSize: '10px', color: '#d97706', background: '#fef3c7', borderRadius: '4px', padding: '2px 8px', fontWeight: 600 }}>{medCount} MED</span>}
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>{dayEvents.length} events</span>
                      <span style={{ fontSize: '12px', color: '#9ca3af', width: '16px', textAlign: 'center' }}>{isExpanded ? '▲' : '▼'}</span>
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
                              background: isKey ? '#f0fdf4' : '#ffffff',
                              borderRadius: '6px',
                              borderLeft: `3px solid ${isKey ? '#16a34a' : '#e4e4e7'}`,
                              border: `1px solid ${isKey ? '#bbf7d0' : '#f0f0f0'}`,
                              borderLeftWidth: '3px',
                            }}
                          >
                            <div style={{ fontSize: '11px', color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{timeStr} ET</div>
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: isKey ? 700 : 400, color: isKey ? '#111' : '#374151' }}>{ev.event}</span>
                            </div>
                            <div>
                              <span style={{ fontSize: '9px', fontWeight: 800, color: imp.color, background: imp.bg, borderRadius: '4px', padding: '2px 7px', letterSpacing: '0.05em' }}>
                                {(ev.impact ?? '').toUpperCase()}
                              </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '9px', color: '#9ca3af', marginBottom: '2px', letterSpacing: '0.05em' }}>PREV</div>
                              <div style={{ fontSize: '12px', color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
                                {ev.previous != null ? `${ev.previous}${ev.unit ?? ''}` : '—'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '9px', color: '#9ca3af', marginBottom: '2px', letterSpacing: '0.05em' }}>EST</div>
                              <div style={{ fontSize: '12px', color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
                                {ev.estimate != null ? `${ev.estimate}${ev.unit ?? ''}` : '—'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '9px', color: '#9ca3af', marginBottom: '2px', letterSpacing: '0.05em' }}>ACTUAL</div>
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

        <div style={{ marginTop: '40px', padding: '16px', borderTop: '1px solid #e4e4e7', fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
          Source: ForexFactory · US USD events · Updated hourly · All times Eastern
        </div>
      </div>
    </div>
  )
}
