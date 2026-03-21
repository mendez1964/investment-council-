'use client'

import { useState, useEffect } from 'react'

interface FGEntry {
  value: string
  value_classification: string
  timestamp: string
}

// Gauge geometry
const CX = 110, CY = 118, R = 90

// Zone definitions
const ZONES = [
  { start: 0,  end: 25,  color: '#b91c1c', label: 'Extreme Fear' },
  { start: 25, end: 45,  color: '#ea580c', label: 'Fear' },
  { start: 45, end: 55,  color: '#ca8a04', label: 'Neutral' },
  { start: 55, end: 75,  color: '#65a30d', label: 'Greed' },
  { start: 75, end: 100, color: '#16a34a', label: 'Extreme Greed' },
]

const ZONE_CONTEXT = [
  {
    label: 'Extreme Fear',
    range: '0 – 25',
    color: '#b91c1c',
    desc: 'Markets in panic mode. Fear-driven selling often overshoots fundamentals. Historically where long-term value appears — but catching falling knives requires patience and conviction.',
  },
  {
    label: 'Fear',
    range: '26 – 45',
    color: '#ea580c',
    desc: 'Investors are nervous and risk appetite is low. Defensive positioning dominates. Markets tend to underperform short-term but may offer value for longer-horizon views.',
  },
  {
    label: 'Neutral',
    range: '46 – 54',
    color: '#ca8a04',
    desc: 'Balanced sentiment — neither panic nor euphoria. A transitional zone. Watch for momentum to build in either direction as a leading signal.',
  },
  {
    label: 'Greed',
    range: '55 – 74',
    color: '#65a30d',
    desc: 'Risk appetite is elevated and optimism is building. Markets tend to perform well here but begin pricing in good news. Start watching for early signs of complacency.',
  },
  {
    label: 'Extreme Greed',
    range: '75 – 100',
    color: '#16a34a',
    desc: 'Euphoria. Everyone is in. Markets are often stretched vs fundamentals at these levels. Historically a signal to tighten risk management and prepare for mean reversion.',
  },
]

// Map a value (0–100) to a math angle in radians, then to SVG coordinates
// value=0 → 180° (far left), value=50 → 90° (top), value=100 → 0° (far right)
function valToSVG(value: number, r: number): { x: number; y: number } {
  const rad = (180 - value * 1.8) * (Math.PI / 180)
  return {
    x: CX + r * Math.cos(rad),
    y: CY - r * Math.sin(rad),
  }
}

// SVG arc path for a zone from startVal to endVal on the gauge semicircle
// sweep=1 = clockwise in SVG screen coords = goes through the top of the arc
function arcPath(startVal: number, endVal: number, r: number): string {
  const s = valToSVG(startVal, r)
  const e = valToSVG(endVal, r)
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

function getZoneFor(v: number) {
  return ZONE_CONTEXT.find(z => {
    const [lo, hi] = z.range.split(' – ').map(Number)
    return v >= lo && v <= hi
  }) ?? ZONE_CONTEXT[2]
}

export default function FearGreedGauge({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<FGEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/fear-greed')
      .then(r => r.json())
      .then(d => { setEntries(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const current = entries[0]
  const value = current ? parseInt(current.value) : 50
  const currentZone = getZoneFor(value)
  const zoneColor = currentZone.color

  // Needle: shorter than arc radius so it doesn't touch the colored segments
  const needleTip = valToSVG(value, R - 16)
  const needleBase1 = valToSVG(value + 4, 12) // slight spread at base
  const needleBase2 = valToSVG(value - 4, 12)

  // 30-day sparkline — API returns newest first, reverse for chart
  const historical = [...entries].reverse()
  const sparkVals = historical.map(e => parseInt(e.value))
  const chartW = 380
  const chartH = 54
  const toX = (i: number) => sparkVals.length > 1 ? (i / (sparkVals.length - 1)) * chartW : 0
  const toY = (v: number) => chartH - (v / 100) * chartH
  const polyPoints = sparkVals.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')

  // Tick marks on the gauge arc at 0, 25, 50, 75, 100
  const ticks = [0, 25, 50, 75, 100]

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: '12px',
          padding: '24px', width: '500px', maxWidth: '95vw', maxHeight: '90vh',
          overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e5e5e5', flex: 1 }}>📊 Fear & Greed Index</div>
          <div style={{ fontSize: '10px', color: '#2a2a2a', marginRight: '12px' }}>Alternative.me · Crypto · Updates daily</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#444', fontSize: '13px' }}>Loading...</div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#444', fontSize: '13px' }}>Data unavailable</div>
        ) : (
          <>
            {/* ── Gauge SVG ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <svg viewBox="0 0 220 132" width="380" height="228" style={{ overflow: 'visible' }}>

                {/* Background arc (dim track) */}
                <path
                  d={arcPath(0, 100, R)}
                  fill="none" stroke="#1a1a1a" strokeWidth="20" strokeLinecap="butt"
                />

                {/* Colored zone arcs */}
                {ZONES.map(z => {
                  const isPast    = value > z.end
                  const isCurrent = value >= z.start && value <= z.end
                  return (
                    <path
                      key={z.label}
                      d={arcPath(z.start, z.end, R)}
                      fill="none"
                      stroke={z.color}
                      strokeWidth="20"
                      strokeLinecap="butt"
                      opacity={isPast ? 0.85 : isCurrent ? 1 : 0.1}
                    />
                  )
                })}

                {/* Tick marks at zone boundaries */}
                {ticks.map(t => {
                  const inner = valToSVG(t, R - 24)
                  const outer = valToSVG(t, R + 2)
                  return (
                    <line
                      key={t}
                      x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
                      x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
                      stroke="#0d0d0d" strokeWidth="2"
                    />
                  )
                })}

                {/* Needle (triangle shape) */}
                <polygon
                  points={`${needleTip.x.toFixed(2)},${needleTip.y.toFixed(2)} ${needleBase1.x.toFixed(2)},${needleBase1.y.toFixed(2)} ${needleBase2.x.toFixed(2)},${needleBase2.y.toFixed(2)}`}
                  fill="#e5e5e5"
                  opacity="0.95"
                />
                <circle cx={CX} cy={CY} r="5" fill="#e5e5e5" />

                {/* Current value — large, centered in gauge mouth */}
                <text x={CX} y={CY - 24} textAnchor="middle" fill={zoneColor} fontSize="36" fontWeight="bold" fontFamily="monospace">{value}</text>
                <text x={CX} y={CY - 7}  textAnchor="middle" fill={zoneColor} fontSize="10" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.06em">{currentZone.label.toUpperCase()}</text>

                {/* Side labels */}
                <text x="14" y="126" textAnchor="middle" fill="#333" fontSize="7.5" fontFamily="sans-serif">Extreme</text>
                <text x="14" y="133" textAnchor="middle" fill="#333" fontSize="7.5" fontFamily="sans-serif">Fear</text>
                <text x="207" y="126" textAnchor="middle" fill="#333" fontSize="7.5" fontFamily="sans-serif">Extreme</text>
                <text x="207" y="133" textAnchor="middle" fill="#333" fontSize="7.5" fontFamily="sans-serif">Greed</text>
              </svg>
            </div>

            {/* ── 30-day sparkline ───────────────────────────────────────── */}
            {sparkVals.length > 1 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', color: '#2a2a2a', marginBottom: '6px', textAlign: 'center', letterSpacing: '0.07em' }}>30-DAY HISTORY</div>
                <svg viewBox={`0 0 ${chartW} ${chartH + 8}`} width="100%" height="62" style={{ display: 'block' }}>
                  {/* Zone bands (subtle) */}
                  <rect x="0" y={toY(100)} width={chartW} height={toY(75) - toY(100)} fill="#16a34a" opacity="0.06" />
                  <rect x="0" y={toY(75)}  width={chartW} height={toY(55) - toY(75)}  fill="#65a30d" opacity="0.05" />
                  <rect x="0" y={toY(45)}  width={chartW} height={toY(25) - toY(45)}  fill="#ea580c" opacity="0.05" />
                  <rect x="0" y={toY(25)}  width={chartW} height={toY(0)  - toY(25)}  fill="#b91c1c" opacity="0.06" />

                  {/* Reference lines */}
                  <line x1="0" y1={toY(75)} x2={chartW} y2={toY(75)} stroke="#16a34a" strokeWidth="0.5" strokeDasharray="5 5" opacity="0.35" />
                  <line x1="0" y1={toY(25)} x2={chartW} y2={toY(25)} stroke="#b91c1c" strokeWidth="0.5" strokeDasharray="5 5" opacity="0.35" />

                  {/* Sparkline */}
                  <polyline points={polyPoints} fill="none" stroke={zoneColor} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />

                  {/* Today's dot */}
                  <circle
                    cx={toX(sparkVals.length - 1).toFixed(1)}
                    cy={toY(sparkVals[sparkVals.length - 1]).toFixed(1)}
                    r="3.5" fill={zoneColor}
                  />
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#222', marginTop: '2px', padding: '0 2px' }}>
                  <span>
                    {historical[0]
                      ? new Date(parseInt(historical[0].timestamp) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '30 days ago'}
                  </span>
                  <span>Today</span>
                </div>
              </div>
            )}

            {/* ── Current zone explanation ───────────────────────────────── */}
            <div style={{
              background: '#080808', border: `1px solid ${zoneColor}30`,
              borderRadius: '8px', padding: '12px 14px', marginBottom: '16px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: zoneColor, marginBottom: '6px', letterSpacing: '0.05em' }}>
                {currentZone.label.toUpperCase()} — {currentZone.range}
              </div>
              <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.65 }}>{currentZone.desc}</div>
            </div>

            {/* ── Zone legend ────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {ZONE_CONTEXT.map(z => {
                const isActive = z.label === currentZone.label
                return (
                  <div
                    key={z.label}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '5px 8px', borderRadius: '5px',
                      background: isActive ? '#111' : 'transparent',
                    }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: z.color, flexShrink: 0, opacity: isActive ? 1 : 0.5 }} />
                    <div style={{ fontSize: '10px', color: '#2a2a2a', width: '56px', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{z.range}</div>
                    <div style={{ fontSize: '11px', color: isActive ? z.color : '#444', fontWeight: isActive ? 700 : 400 }}>{z.label}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
