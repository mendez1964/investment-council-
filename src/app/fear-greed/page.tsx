'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

interface FGEntry {
  value: string
  value_classification: string
  timestamp: string
}

const CX = 160, CY = 168, R = 130

const ZONES = [
  { start: 0,  end: 25,  color: '#b91c1c', label: 'Extreme Fear' },
  { start: 25, end: 45,  color: '#ea580c', label: 'Fear' },
  { start: 45, end: 55,  color: '#ca8a04', label: 'Neutral' },
  { start: 55, end: 75,  color: '#65a30d', label: 'Greed' },
  { start: 75, end: 100, color: '#16a34a', label: 'Extreme Greed' },
]

const ZONE_CONTEXT = [
  { label: 'Extreme Fear', range: '0 – 25', color: '#b91c1c', desc: 'Markets in panic mode. Fear-driven selling often overshoots fundamentals. Historically where long-term value appears — but catching falling knives requires patience and conviction.' },
  { label: 'Fear', range: '26 – 45', color: '#ea580c', desc: 'Investors are nervous and risk appetite is low. Defensive positioning dominates. Markets tend to underperform short-term but may offer value for longer-horizon views.' },
  { label: 'Neutral', range: '46 – 54', color: '#ca8a04', desc: 'Balanced sentiment — neither panic nor euphoria. A transitional zone. Watch for momentum to build in either direction as a leading signal.' },
  { label: 'Greed', range: '55 – 74', color: '#65a30d', desc: 'Risk appetite is elevated and optimism is building. Markets tend to perform well here but begin pricing in good news. Start watching for early signs of complacency.' },
  { label: 'Extreme Greed', range: '75 – 100', color: '#16a34a', desc: 'Euphoria. Everyone is in. Markets are often stretched vs fundamentals at these levels. Historically a signal to tighten risk management and prepare for mean reversion.' },
]

const COMPONENTS = [
  { name: 'Market Momentum', icon: '📈', desc: 'S&P 500 vs its 125-day moving average. When the index trades well above the MA, momentum is bullish and greed builds. When it trades below, fear dominates.' },
  { name: 'Stock Price Strength', icon: '💪', desc: 'Number of NYSE stocks hitting 52-week highs vs lows. A surge in new highs signals greed; a flood of new lows signals fear. One of the most direct breadth signals.' },
  { name: 'Stock Price Breadth', icon: '🌊', desc: 'NYSE advancing vs declining volume (McClellan Volume Summation). Broad participation in rallies = greed. Narrow, selective bounces with heavy declining volume = fear.' },
  { name: 'Put & Call Options', icon: '⚖️', desc: 'The ratio of put options (bets on decline) to call options (bets on rise). A high put/call ratio means investors are hedging heavily — fear. A low ratio means complacency — greed.' },
  { name: 'Junk Bond Demand', icon: '🏦', desc: 'Spread between junk bond yields and investment-grade yields. Narrow spreads = investors chasing yield recklessly = greed. Wide spreads = flight to safety = fear.' },
  { name: 'Market Volatility', icon: '⚡', desc: 'The VIX (CBOE Volatility Index) — Wall Street\'s "fear gauge." VIX above 30 signals fear; below 15 signals complacency. Extreme VIX spikes historically mark capitulation lows.' },
  { name: 'Safe Haven Demand', icon: '🛡️', desc: 'Performance of stocks vs Treasuries over the last 20 trading days. When investors pile into bonds over stocks, fear is driving capital allocation. The reverse signals greed.' },
]

const HISTORICAL_SIGNALS = [
  { level: 'Extreme Fear (0–25)', examples: 'March 2020 (COVID crash), Oct 2022 (rate hike peak), Oct 2008 (financial crisis)', outcome: 'Each marked a significant market bottom within weeks to months. Peak capitulation = long-term entry opportunities.' },
  { level: 'Fear (26–45)', examples: 'May 2022, Dec 2018, Jan 2016', outcome: 'Often a transitional period. Markets can drift lower but rebounds tend to start here. Value hunters begin accumulating.' },
  { level: 'Neutral (46–54)', examples: 'Most of 2015–2016, mid 2023', outcome: 'Range-bound markets. No strong directional signal. Watch for breakout in either direction.' },
  { level: 'Greed (55–74)', examples: 'Most of 2021, late 2019, 2017', outcome: 'Bull market territory. Good performance but risk is rising. Start sizing risk more carefully.' },
  { level: 'Extreme Greed (75–100)', examples: 'Jan 2018, Nov 2021, July 2023', outcome: 'Often precedes corrections. Not a timing tool (can stay extreme for months) but a signal to reduce leverage and tighten stops.' },
]

function valToSVG(value: number, r: number): { x: number; y: number } {
  const rad = (180 - value * 1.8) * (Math.PI / 180)
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) }
}

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

export default function FearGreedPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<FGEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [dataMode, setDataMode] = useState<'crypto' | 'stock'>('crypto')

  useEffect(() => { trackPageView('/fear-greed') }, [])

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

  const needleTip = valToSVG(value, R - 22)
  const needleBase1 = valToSVG(value + 3, 16)
  const needleBase2 = valToSVG(value - 3, 16)

  const historical = [...entries].reverse()
  const sparkVals = historical.map(e => parseInt(e.value))
  const chartW = 700
  const chartH = 80
  const toX = (i: number) => sparkVals.length > 1 ? (i / (sparkVals.length - 1)) * chartW : 0
  const toY = (v: number) => chartH - (v / 100) * chartH
  const polyPoints = sparkVals.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
  const ticks = [0, 25, 50, 75, 100]

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', color: '#111827', fontFamily: 'inherit' }}>

      {/* ── Top bar ── */}
      <div style={{ borderBottom: '1px solid #e4e4e7', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '16px', background: '#ffffff' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'transparent', border: '1px solid #d4d4d8', borderRadius: '6px', color: '#555', fontSize: '12px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}
          onMouseEnter={e => e.currentTarget.style.color = '#111827'}
          onMouseLeave={e => e.currentTarget.style.color = '#555'}
        >
          ← Back
        </button>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>😨 Fear &amp; Greed Index</div>
        <div style={{ fontSize: '11px', color: '#6b7280', marginLeft: '4px' }}>Alternative.me · Updates daily</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', background: '#f4f4f5', borderRadius: '8px', padding: '3px' }}>
          {(['crypto', 'stock'] as const).map(m => (
            <button key={m} onClick={() => setDataMode(m)}
              style={{ padding: '4px 12px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 600, background: dataMode === m ? '#ffffff' : 'transparent', color: dataMode === m ? '#111827' : '#6b7280', boxShadow: dataMode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >{m === 'crypto' ? 'Crypto' : 'Stocks'}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '120px', color: '#6b7280', fontSize: '14px' }}>Loading...</div>
      ) : (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 32px' }}>

          {/* ── Two-column top section ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: '40px', marginBottom: '48px', alignItems: 'start' }}>

            {/* Left: Gauge */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <svg viewBox="0 0 320 196" width="480" height="294" style={{ overflow: 'visible' }}>
                  <path d={arcPath(0, 100, R)} fill="none" stroke="#e5e7eb" strokeWidth="28" strokeLinecap="butt" />
                  {ZONES.map(z => {
                    const isPast = value > z.end
                    const isCurrent = value >= z.start && value <= z.end
                    return (
                      <path key={z.label} d={arcPath(z.start, z.end, R)} fill="none" stroke={z.color} strokeWidth="28" strokeLinecap="butt" opacity={isPast ? 0.85 : isCurrent ? 1 : 0.1} />
                    )
                  })}
                  {ticks.map(t => {
                    const inner = valToSVG(t, R - 32)
                    const outer = valToSVG(t, R + 4)
                    return <line key={t} x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)} x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)} stroke="#f4f4f5" strokeWidth="2.5" />
                  })}
                  <polygon points={`${needleTip.x.toFixed(2)},${needleTip.y.toFixed(2)} ${needleBase1.x.toFixed(2)},${needleBase1.y.toFixed(2)} ${needleBase2.x.toFixed(2)},${needleBase2.y.toFixed(2)}`} fill="#1f2937" opacity="0.95" />
                  <circle cx={CX} cy={CY} r="7" fill="#1f2937" />
                  <text x={CX} y={CY - 36} textAnchor="middle" fill={zoneColor} fontSize="52" fontWeight="bold" fontFamily="monospace">{value}</text>
                  <text x={CX} y={CY - 12} textAnchor="middle" fill={zoneColor} fontSize="13" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.06em">{currentZone.label.toUpperCase()}</text>
                  <text x="20" y="183" textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="sans-serif">Extreme</text>
                  <text x="20" y="192" textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="sans-serif">Fear</text>
                  <text x="300" y="183" textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="sans-serif">Extreme</text>
                  <text x="300" y="192" textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="sans-serif">Greed</text>
                </svg>
              </div>

              {/* Zone legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {ZONE_CONTEXT.map(z => {
                  const isActive = z.label === currentZone.label
                  return (
                    <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '7px 12px', borderRadius: '7px', background: isActive ? '#f9fafb' : 'transparent', border: isActive ? `1px solid ${z.color}30` : '1px solid transparent' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: z.color, flexShrink: 0, opacity: isActive ? 1 : 0.4 }} />
                      <div style={{ fontSize: '11px', color: '#6b7280', width: '64px', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{z.range}</div>
                      <div style={{ fontSize: '12px', color: isActive ? z.color : '#9ca3af', fontWeight: isActive ? 700 : 400 }}>{z.label}</div>
                      {isActive && <div style={{ fontSize: '10px', color: '#9ca3af', marginLeft: 'auto' }}>← NOW</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: Current reading + sparkline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Current interpretation */}
              <div style={{ background: '#ffffff', border: `1px solid ${zoneColor}35`, borderRadius: '10px', padding: '20px 22px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: zoneColor, marginBottom: '10px', letterSpacing: '0.08em' }}>
                  CURRENT READING — {currentZone.label.toUpperCase()} ({value})
                </div>
                <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7 }}>{currentZone.desc}</div>
              </div>

              {/* Last updated */}
              {current && (
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                  Last updated: {new Date(parseInt(current.timestamp) * 1000).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              )}

              {/* 60-day sparkline */}
              {sparkVals.length > 1 && (
                <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '16px 18px' }}>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '10px', letterSpacing: '0.08em', fontWeight: 700 }}>60-DAY HISTORY</div>
                  <svg viewBox={`0 0 ${chartW} ${chartH + 10}`} width="100%" height="90" style={{ display: 'block' }}>
                    <rect x="0" y={toY(100)} width={chartW} height={toY(75) - toY(100)} fill="#16a34a" opacity="0.06" />
                    <rect x="0" y={toY(75)}  width={chartW} height={toY(55) - toY(75)}  fill="#65a30d" opacity="0.05" />
                    <rect x="0" y={toY(45)}  width={chartW} height={toY(25) - toY(45)}  fill="#ea580c" opacity="0.05" />
                    <rect x="0" y={toY(25)}  width={chartW} height={toY(0)  - toY(25)}  fill="#b91c1c" opacity="0.06" />
                    <line x1="0" y1={toY(75)} x2={chartW} y2={toY(75)} stroke="#16a34a" strokeWidth="0.6" strokeDasharray="6 6" opacity="0.3" />
                    <line x1="0" y1={toY(50)} x2={chartW} y2={toY(50)} stroke="#ca8a04" strokeWidth="0.6" strokeDasharray="6 6" opacity="0.25" />
                    <line x1="0" y1={toY(25)} x2={chartW} y2={toY(25)} stroke="#b91c1c" strokeWidth="0.6" strokeDasharray="6 6" opacity="0.3" />
                    <polyline points={polyPoints} fill="none" stroke={zoneColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                    <circle cx={toX(sparkVals.length - 1).toFixed(1)} cy={toY(sparkVals[sparkVals.length - 1]).toFixed(1)} r="4" fill={zoneColor} />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
                    <span>{historical[0] ? new Date(parseInt(historical[0].timestamp) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '60 days ago'}</span>
                    <span>Today</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 7 Components ── */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#6b7280', letterSpacing: '0.12em', marginBottom: '16px', textTransform: 'uppercase' }}>The 7 Components (CNN Methodology)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {COMPONENTS.map(c => (
                <div key={c.name} style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '9px', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{c.icon}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>{c.name}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.6 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Historical Signals ── */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#6b7280', letterSpacing: '0.12em', marginBottom: '16px', textTransform: 'uppercase' }}>Historical Context — What These Levels Have Meant</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {HISTORICAL_SIGNALS.map((h, i) => {
                const zone = ZONE_CONTEXT[i]
                return (
                  <div key={h.level} style={{ display: 'grid', gridTemplateColumns: '200px 260px 1fr', gap: '16px', padding: '14px 16px', borderRadius: '8px', background: h.level.includes(currentZone.label.split(' ')[0]) && h.level.includes(currentZone.label.split(' ').slice(-1)[0]) ? '#f9fafb' : 'transparent', alignItems: 'start' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: zone.color }}>{h.level}</div>
                    <div style={{ fontSize: '11px', color: '#374151', lineHeight: 1.5 }}>{h.examples}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>{h.outcome}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ marginTop: '48px', padding: '16px', borderTop: '1px solid #e4e4e7', fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
            Data source: Alternative.me Crypto Fear &amp; Greed API · Updates daily · For informational purposes only
          </div>
        </div>
      )}
    </div>
  )
}
