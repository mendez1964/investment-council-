'use client'

import { useState, useEffect } from 'react'

interface EarningsEvent {
  symbol: string
  date: string
  hour: string
  epsEstimate: number | null
  revenueEstimate: number | null
  quarter: number
  year: number
}

interface Props {
  onClose: () => void
}

export default function EarningsCalendar({ onClose }: Props) {
  const [events, setEvents] = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/earnings')
      .then(r => r.json())
      .then(data => { setEvents(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Build map of date → events
  const eventsByDate: Record<string, EarningsEvent[]> = {}
  events.forEach(e => {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = []
    eventsByDate[e.date].push(e)
  })

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Calendar grid — first day of month and how many days
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = new Date().toISOString().split('T')[0]

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1))
    setSelectedDate(null)
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1))
    setSelectedDate(null)
  }

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : []

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111', border: '1px solid #222',
          borderRadius: '12px', padding: '24px',
          width: '680px', maxWidth: '95vw',
          maxHeight: '90vh', overflow: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e5e5e5', flex: 1 }}>
            📅 Earnings Calendar
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{ fontSize: '10px', color: '#888', marginRight: '8px' }}>
              {loading ? 'Loading...' : `${events.length} reports`}
            </div>
            <span style={{ fontSize: '11px', color: '#888' }}>
              <span style={{ background: '#1a3a5c', color: '#60a5fa', borderRadius: '3px', padding: '1px 5px', fontSize: '10px' }}>BMO</span>
              {' '}Before Open {'  '}
              <span style={{ background: '#3b1a1a', color: '#f87171', borderRadius: '3px', padding: '1px 5px', fontSize: '10px' }}>AMC</span>
              {' '}After Close
            </span>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', padding: '0 4px', marginLeft: '8px', lineHeight: 1 }}
            >×</button>
          </div>
        </div>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
          <button onClick={prevMonth} style={{ background: '#111', border: '1px solid #222', borderRadius: '6px', color: '#888', fontSize: '16px', cursor: 'pointer', padding: '4px 10px', fontFamily: 'inherit' }}>‹</button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#ccc' }}>{monthName}</div>
          <button onClick={nextMonth} style={{ background: '#111', border: '1px solid #222', borderRadius: '6px', color: '#888', fontSize: '16px', cursor: 'pointer', padding: '4px 10px', fontFamily: 'inherit' }}>›</button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#555', padding: '4px 0', letterSpacing: '0.05em' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />
            const ds = dateStr(day)
            const dayEvents = eventsByDate[ds] ?? []
            const isToday = ds === todayStr
            const isSelected = ds === selectedDate
            const isWeekend = (i % 7 === 0 || i % 7 === 6)

            return (
              <div
                key={i}
                onClick={() => setSelectedDate(isSelected ? null : ds)}
                style={{
                  minHeight: '72px',
                  background: isSelected ? '#0f2920' : isToday ? '#111' : '#080808',
                  border: isSelected ? '1px solid #2d6a4f' : isToday ? '1px solid #1f1f1f' : '1px solid #111',
                  borderRadius: '6px',
                  padding: '5px 6px',
                  cursor: dayEvents.length > 0 ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (dayEvents.length > 0) (e.currentTarget as HTMLDivElement).style.background = isSelected ? '#0f2920' : '#0f0f0f' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? '#0f2920' : isToday ? '#111' : '#080808' }}
              >
                <div style={{
                  fontSize: '11px', fontWeight: isToday ? 700 : 400,
                  color: isToday ? '#7ec8a0' : isWeekend ? '#555' : '#999',
                  marginBottom: '3px',
                }}>
                  {day}
                </div>
                {dayEvents.slice(0, 4).map((e, ei) => {
                  const isBMO = e.hour === 'bmo'
                  const isAMC = e.hour === 'amc'
                  return (
                    <div key={ei} style={{
                      fontSize: '9px', fontWeight: 700,
                      background: isBMO ? '#1a3a5c' : isAMC ? '#3b1a1a' : '#1a1a1a',
                      color: isBMO ? '#60a5fa' : isAMC ? '#f87171' : '#888',
                      borderRadius: '3px', padding: '1px 4px',
                      marginBottom: '2px', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      letterSpacing: '0.03em',
                    }}>
                      {e.symbol}
                    </div>
                  )
                })}
                {dayEvents.length > 4 && (
                  <div style={{ fontSize: '9px', color: '#666' }}>+{dayEvents.length - 4} more</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Selected day detail */}
        {selectedDate && selectedEvents.length > 0 && (
          <div style={{ marginTop: '16px', background: '#141414', border: '1px solid #222', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#7ec8a0', marginBottom: '10px' }}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {' — '}{selectedEvents.length} report{selectedEvents.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
              {selectedEvents.map((e, i) => {
                const isBMO = e.hour === 'bmo'
                const isAMC = e.hour === 'amc'
                return (
                  <div key={i} style={{
                    background: isBMO ? '#0d1e2e' : isAMC ? '#1e0d0d' : '#111',
                    border: `1px solid ${isBMO ? '#1a3a5c' : isAMC ? '#3b1a1a' : '#1a1a1a'}`,
                    borderRadius: '6px', padding: '8px 10px',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5e5e5' }}>{e.symbol}</div>
                    <div style={{ fontSize: '10px', color: isBMO ? '#60a5fa' : isAMC ? '#f87171' : '#888', marginTop: '2px' }}>
                      {isBMO ? 'Before Market Open' : isAMC ? 'After Market Close' : e.hour?.toUpperCase() ?? '—'}
                    </div>
                    {e.epsEstimate != null && (
                      <div style={{ fontSize: '10px', color: '#777', marginTop: '4px' }}>
                        EPS est: <span style={{ color: '#aaa' }}>${e.epsEstimate.toFixed(2)}</span>
                      </div>
                    )}
                    {e.revenueEstimate != null && (
                      <div style={{ fontSize: '10px', color: '#777' }}>
                        Rev est: <span style={{ color: '#aaa' }}>${(e.revenueEstimate / 1e9).toFixed(2)}B</span>
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>Q{e.quarter} {e.year}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#777', fontSize: '13px' }}>
            Loading earnings data...
          </div>
        )}
      </div>
    </div>
  )
}
