'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

interface SignalData {
  direction: 'BULLISH' | 'WEAK_BULLISH' | 'NEUTRAL' | 'WEAK_BEARISH' | 'BEARISH'
  confidence: number
  state: string
  drivers: string[]
  squeeze_setup: boolean
  ticker: string
}

interface DashboardData {
  top10: Array<{
    id: string
    symbol: string
    name: string
    current_price: number
    price_change_percentage_24h: number
    market_cap: number
    total_volume: number
    image: string
  }>
  dominance: {
    btc_dominance: number
    eth_dominance: number
    total_market_cap: number
    active_cryptocurrencies: number
  } | null
  alt_season: {
    index: number
    alts_beating_btc: number
    total_checked: number
    season: string
  } | null
  funding_rates: Array<{
    symbol: string
    rate: number
    annualized: number
  }>
  on_chain: {
    mvrv: { value: number | null; interpretation: string }
    exchange_flow: { value: number | null; interpretation: string }
    hash_rate: { value: number | null; interpretation: string }
    active_addresses: { value: number | null; interpretation: string }
    realized_price: { value: number | null; interpretation: string }
  } | null
  liquidations: {
    long_24h: number
    short_24h: number
    total_24h: number
  } | null
  fetched_at: string
  cached: boolean
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtBig(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function fmtPrice(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (n >= 1) return `$${n.toFixed(2)}`
  return `$${n.toFixed(4)}`
}

// Semicircle gauge component
function GaugeArc({ value, min = 0, max = 100, color, label, sublabel }: {
  value: number; min?: number; max?: number; color: string; label: string; sublabel?: string
}) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const angle = -180 + pct * 180 // -180 to 0 degrees
  const rad = (angle * Math.PI) / 180
  const cx = 120, cy = 110, r = 80
  const nx = cx + r * Math.cos(rad)
  const ny = cy + r * Math.sin(rad)

  return (
    <svg width="240" height="130" viewBox="0 0 240 130">
      {/* Background arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#e5e7eb" strokeWidth="16" strokeLinecap="round"
      />
      {/* Colored arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${nx} ${ny}`}
        fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
      />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="#374151" />
      {/* Value */}
      <text x={cx} y={cy - 18} textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>{value}</text>
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#374151">{label}</text>
      {sublabel && <text x={cx} y={cy + 8} textAnchor="middle" fontSize="9" fill="#9ca3af">{sublabel}</text>}
    </svg>
  )
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', letterSpacing: '0.05em' }}>{title}</div>
      {sub && <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '16px 18px', ...style }}>
      {children}
    </div>
  )
}

const SIGNAL_COLORS: Record<string, string> = {
  BULLISH: '#16a34a',
  WEAK_BULLISH: '#84cc16',
  NEUTRAL: '#6b7280',
  WEAK_BEARISH: '#f59e0b',
  BEARISH: '#dc2626',
}

const STATE_COLORS: Record<string, string> = {
  Accumulation: '#2563eb',
  Distribution: '#f59e0b',
  Expansion: '#16a34a',
  Exhaustion: '#dc2626',
  Neutral: '#6b7280',
}

export default function CryptoDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [btcSignal, setBtcSignal] = useState<SignalData | null>(null)

  useEffect(() => { trackPageView('/crypto-dashboard') }, [])

  useEffect(() => {
    fetch('/api/crypto/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/signals?ticker=BTC&type=crypto')
      .then(r => r.json())
      .then(d => { if (d.signal) setBtcSignal(d.signal) })
      .catch(() => {})
  }, [])

  const altSeason = data?.alt_season
  const altColor = !altSeason ? '#9ca3af'
    : altSeason.index >= 75 ? '#16a34a'
    : altSeason.index >= 55 ? '#84cc16'
    : altSeason.index <= 25 ? '#f97316'
    : altSeason.index <= 45 ? '#f59e0b'
    : '#6b7280'

  const btcDom = data?.dominance?.btc_dominance ?? 0
  const btcDomColor = btcDom >= 55 ? '#f97316' : btcDom >= 48 ? '#6b7280' : '#16a34a'

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', color: '#111', fontFamily: 'inherit' }}>
      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #e4e4e7', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '16px', background: '#fff' }}>
        <button
          onClick={() => router.push("/app")}
          style={{ background: 'transparent', border: '1px solid #d4d4d8', borderRadius: '6px', color: '#555', fontSize: '12px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.color = '#111'}
          onMouseLeave={e => e.currentTarget.style.color = '#555'}
        >← Back</button>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>₿ Crypto Dashboard</div>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>Live market intelligence · Updated every 5 min</div>
        {data?.dominance && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontSize: '11px', color: '#6b7280' }}>
            <span>Total Market Cap: <strong style={{ color: '#111' }}>{fmtBig(data.dominance.total_market_cap)}</strong></span>
            <span>{data.dominance.active_cryptocurrencies?.toLocaleString()} assets</span>
          </div>
        )}
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af', fontSize: '14px' }}>
            Loading crypto intelligence...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Command Center — Signal Engine output */}
            {btcSignal && (() => {
              const sigColor = SIGNAL_COLORS[btcSignal.direction] ?? '#6b7280'
              const stateColor = STATE_COLORS[btcSignal.state] ?? '#6b7280'
              return (
                <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px 24px', color: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', marginBottom: '4px' }}>MARKET COMMAND CENTER</div>
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>Intelligence layer — what the data means right now</div>
                    </div>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px' }}>STATE</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: stateColor, background: `${stateColor}22`, borderRadius: '6px', padding: '3px 10px' }}>
                          {btcSignal.state}
                        </div>
                      </div>
                      {btcSignal.squeeze_setup && (
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', background: '#f59e0b22', borderRadius: '6px', padding: '4px 12px', border: '1px solid #f59e0b44' }}>
                          SQUEEZE SETUP
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Signal verdict */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: sigColor, letterSpacing: '-0.02em' }}>
                      BTC: {btcSignal.direction.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                      {btcSignal.confidence}% confidence
                    </div>
                  </div>

                  {/* Drivers */}
                  {btcSignal.drivers.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '2px' }}>SIGNAL DRIVERS</div>
                      {btcSignal.drivers.slice(0, 4).map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: sigColor, marginTop: '5px', flexShrink: 0 }} />
                          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>{d}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Row 1: Dominance + Alt Season + Market Signal */}
            <div>
              <SectionHeader title="MARKET STRUCTURE" sub="Dominance, cycle positioning, and sentiment" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>

                {/* BTC Dominance */}
                <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '4px' }}>BTC DOMINANCE</div>
                  <GaugeArc value={Math.round(btcDom)} color={btcDomColor} label={`${fmt(btcDom, 1)}%`} sublabel="of total market cap" />
                  <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#9ca3af' }}>ETH DOM</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#6366f1' }}>{fmt(data?.dominance?.eth_dominance ?? 0, 1)}%</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#9ca3af' }}>SIGNAL</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: btcDomColor }}>
                        {btcDom >= 55 ? 'BTC Season' : btcDom >= 48 ? 'Neutral' : 'Alt Friendly'}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Alt Season Index */}
                <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '4px' }}>ALT SEASON INDEX</div>
                  {altSeason ? (
                    <>
                      <GaugeArc value={altSeason.index} color={altColor} label={altSeason.season} sublabel="vs Bitcoin (90 days)" />
                      <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', color: '#9ca3af' }}>ALTS BEATING BTC</div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: altColor }}>{altSeason.alts_beating_btc}/{altSeason.total_checked}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', color: '#9ca3af' }}>ZONE</div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: altColor }}>{altSeason.index >= 75 ? '🔥 Hot' : altSeason.index <= 25 ? '🟠 BTC Rules' : '⚖️ Mixed'}</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#9ca3af', padding: '20px' }}>Unavailable</div>
                  )}
                </Card>

                {/* On-Chain Snapshot */}
                <Card>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '12px' }}>ON-CHAIN SNAPSHOT</div>
                  {data?.on_chain ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { label: 'MVRV Ratio', val: data.on_chain.mvrv.value, suffix: '', note: data.on_chain.mvrv.interpretation, warn: (v: number) => v > 3.5 ? '#dc2626' : v < 1 ? '#16a34a' : '#374151' },
                        { label: 'Realized Price', val: data.on_chain.realized_price.value, suffix: '', note: data.on_chain.realized_price.interpretation, warn: () => '#374151', isPrice: true },
                        { label: 'Hash Rate', val: data.on_chain.hash_rate.value, suffix: ' EH/s', note: data.on_chain.hash_rate.interpretation, warn: () => '#16a34a' },
                        { label: 'Active Addresses', val: data.on_chain.active_addresses.value, suffix: '', note: '', warn: () => '#374151', isCount: true },
                        { label: 'Exchange Flow', val: data.on_chain.exchange_flow.value, suffix: ' BTC', note: data.on_chain.exchange_flow.interpretation, warn: (v: number) => v > 0 ? '#dc2626' : '#16a34a' },
                      ].map(m => (
                        <div key={m.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ fontSize: '10px', color: '#6b7280', minWidth: '100px' }}>{m.label}</div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: m.val != null ? m.warn(m.val) : '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>
                            {m.val != null
                              ? (m as any).isPrice ? fmtPrice(m.val)
                              : (m as any).isCount ? m.val.toLocaleString() + m.suffix
                              : `${fmt(m.val, 2)}${m.suffix}`
                              : '—'}
                          </div>
                          {m.note && <div style={{ fontSize: '9px', color: '#9ca3af', textAlign: 'right', flex: 1 }}>{m.note}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>On-chain data unavailable</div>
                  )}
                </Card>
              </div>
            </div>

            {/* Row 2: Funding Rates + Liquidations */}
            <div>
              <SectionHeader title="DERIVATIVES MARKET" sub="Funding rates and liquidations — real leverage signals" />
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>

                {/* Funding Rates */}
                <Card>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '12px' }}>
                    PERPETUAL FUNDING RATES <span style={{ fontWeight: 400, color: '#d1d5db' }}>· Binance · Every 8h</span>
                  </div>
                  {data?.funding_rates && data.funding_rates.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {data.funding_rates.slice(0, 12).map(f => {
                        const isPositive = f.rate >= 0
                        const isHigh = Math.abs(f.rate) > 0.05
                        const color = isHigh ? (isPositive ? '#dc2626' : '#2563eb') : (isPositive ? '#f59e0b' : '#6366f1')
                        const bg = isHigh ? (isPositive ? '#fee2e2' : '#dbeafe') : '#f9fafb'
                        return (
                          <div key={f.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: bg, borderRadius: '6px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>{f.symbol}</div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                                {isPositive ? '+' : ''}{f.rate.toFixed(4)}%
                              </div>
                              <div style={{ fontSize: '9px', color: '#9ca3af' }}>{fmt(f.annualized, 1)}% ann.</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Funding rate data unavailable</div>
                  )}
                  <div style={{ marginTop: '10px', fontSize: '9px', color: '#9ca3af' }}>
                    🔴 High positive = overleveraged longs (sell signal) · 🔵 High negative = overleveraged shorts (buy signal)
                  </div>
                </Card>

                {/* Liquidations */}
                <Card>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '12px' }}>LIQUIDATIONS (24H)</div>
                  {data?.liquidations && data.liquidations.total_24h > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '9px', color: '#9ca3af', marginBottom: '3px' }}>TOTAL</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#111' }}>{fmtBig(data.liquidations.total_24h)}</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div style={{ background: '#fee2e2', borderRadius: '6px', padding: '8px 10px' }}>
                          <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: 700, marginBottom: '2px' }}>LONGS WIPED</div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626' }}>{fmtBig(data.liquidations.long_24h)}</div>
                        </div>
                        <div style={{ background: '#dbeafe', borderRadius: '6px', padding: '8px 10px' }}>
                          <div style={{ fontSize: '9px', color: '#2563eb', fontWeight: 700, marginBottom: '2px' }}>SHORTS WIPED</div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#2563eb' }}>{fmtBig(data.liquidations.short_24h)}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '9px', color: '#9ca3af', lineHeight: 1.5 }}>
                        More longs wiped = price dumped · More shorts wiped = price pumped
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Live liquidation data requires Coinglass API key</div>
                      <div style={{ fontSize: '9px', color: '#d1d5db', lineHeight: 1.5 }}>
                        Add COINGLASS_API_KEY to Railway env vars to enable live liquidation tracking
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>

            {/* Row 3: Top 10 */}
            <div>
              <SectionHeader title="TOP 10 BY MARKET CAP" sub="Live prices · 24h performance" />
              <Card style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                      {['#', 'Asset', 'Price', '24h Change', 'Market Cap', 'Volume 24h'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: h === '#' || h === 'Asset' ? 'left' : 'right', fontSize: '9px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.07em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.top10 ?? []).map((coin, i) => {
                      const change = coin.price_change_percentage_24h ?? 0
                      const changeColor = change >= 0 ? '#16a34a' : '#dc2626'
                      return (
                        <tr key={coin.id} style={{ borderBottom: '1px solid #fafafa' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '10px 16px', fontSize: '11px', color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {coin.image && <img src={coin.image} alt={coin.symbol} width={20} height={20} style={{ borderRadius: '50%' }} />}
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#111' }}>{coin.symbol?.toUpperCase()}</div>
                                <div style={{ fontSize: '9px', color: '#9ca3af' }}>{coin.name}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#111', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtPrice(coin.current_price)}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: changeColor, background: change >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: '4px', padding: '2px 7px', fontVariantNumeric: 'tabular-nums' }}>
                              {change >= 0 ? '+' : ''}{fmt(change, 2)}%
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtBig(coin.market_cap)}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtBig(coin.total_volume)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Card>
            </div>

            {/* Footer */}
            <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', paddingBottom: '8px' }}>
              Sources: CoinGecko · Binance Futures · CoinMetrics · Alternative.me · Prices may be delayed up to 5 min
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
