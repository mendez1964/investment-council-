'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

// ── Types ──────────────────────────────────────────────────────────────────────

interface CouncilPick {
  id: number
  pick_date: string
  symbol?: string
  type?: string
  bias?: 'bullish' | 'bearish'
  entry_price?: number | null
  confidence: number
  rationale: string
  catalyst?: string
  outcome: 'win' | 'loss' | 'pending'
  // option fields
  underlying?: string
  option_type?: 'call' | 'put'
  underlying_entry_price?: number | null
}

interface UserPick {
  id: number
  pick_date: string
  stock_symbol: string | null
  stock_bias: 'bullish' | 'bearish' | null
  stock_entry_price: number | null
  stock_outcome: 'win' | 'loss' | 'pending'
  crypto_symbol: string | null
  crypto_bias: 'bullish' | 'bearish' | null
  crypto_entry_price: number | null
  crypto_outcome: 'win' | 'loss' | 'pending'
  option_underlying: string | null
  option_type: 'call' | 'put' | null
  option_outcome: 'win' | 'loss' | 'pending'
}

interface Stats {
  wins: number
  losses: number
  win_rate: number | null
  streak: number
  streak_type: 'win' | 'loss' | null
}

interface BattleData {
  council: {
    stock: CouncilPick | null
    crypto: CouncilPick | null
    option: CouncilPick | null
  }
  user_today: UserPick | null
  council_stats: Stats
  user_stats: Stats | null
  today: string
  history: {
    stock_picks: CouncilPick[]
    option_picks: CouncilPick[]
    user_picks: UserPick[]
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseIcScore(rationale: string | null | undefined): number | null {
  if (!rationale) return null
  const m = rationale.match(/^\[IC:(\d+)\]/)
  return m ? parseInt(m[1]) : null
}

function stripIcPrefix(rationale: string | null | undefined): string {
  if (!rationale) return ''
  return rationale.replace(/^\[IC:\d+\]\s*/, '')
}

function icColor(score: number | null): string {
  if (score == null) return '#9ca3af'
  if (score >= 85) return '#16a34a'
  if (score >= 75) return '#d97706'
  return '#6b7280'
}

function fmtPrice(price: number | null | undefined, isCrypto = false): string {
  if (price == null) return '—'
  if (isCrypto && price > 1000) {
    return '$' + price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }
  return '$' + price.toFixed(price < 1 ? 4 : 2)
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Skeleton({ width = '100%', height = '16px', style = {} }: { width?: string; height?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      width, height,
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      borderRadius: '4px',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }} />
  )
}

function OutcomeBadge({ outcome }: { outcome: 'win' | 'loss' | 'pending' }) {
  const map = {
    win: { label: '✓ WIN', color: '#16a34a', bg: '#dcfce7' },
    loss: { label: '✗ LOSS', color: '#dc2626', bg: '#fee2e2' },
    pending: { label: 'OPEN', color: '#6b7280', bg: '#f4f4f5' },
  }
  const s = map[outcome]
  return (
    <span style={{
      fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em',
      color: s.color, background: s.bg,
      borderRadius: '4px', padding: '2px 6px',
    }}>
      {s.label}
    </span>
  )
}

function CouncilCard({
  title,
  pick,
  loading,
}: {
  title: string
  pick: CouncilPick | null
  loading: boolean
}) {
  const isOption = title.includes('OPTION')
  const isCrypto = title.includes('CRYPTO')

  const symbol = isOption ? pick?.underlying : pick?.symbol
  const bias = isOption ? pick?.option_type : pick?.bias
  const entryPrice = isOption ? pick?.underlying_entry_price : pick?.entry_price

  let biasLabel = ''
  let biasColor = '#16a34a'
  let biasBg = '#dcfce7'
  if (bias === 'bullish' || bias === 'call') {
    biasLabel = bias === 'call' ? '▲ CALL' : '▲ BULLISH'
    biasColor = bias === 'call' ? '#2563eb' : '#16a34a'
    biasBg = bias === 'call' ? '#dbeafe' : '#dcfce7'
  } else if (bias === 'bearish' || bias === 'put') {
    biasLabel = bias === 'put' ? '▼ PUT' : '▼ BEARISH'
    biasColor = bias === 'put' ? '#7c3aed' : '#dc2626'
    biasBg = bias === 'put' ? '#ede9fe' : '#fee2e2'
  }

  const icScore = parseIcScore(pick?.rationale)
  const rationaleText = stripIcPrefix(pick?.rationale)

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderTop: '3px solid #C9A34E',
      borderRadius: '10px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      minHeight: '220px',
    }}>
      <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.1em', color: '#C9A34E', textTransform: 'uppercase' }}>
        {title}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <Skeleton height="28px" width="80px" />
          <Skeleton height="12px" width="70px" />
          <Skeleton height="40px" />
          <Skeleton height="12px" width="90%" />
        </div>
      ) : !pick ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: '#9ca3af', fontSize: '12px', textAlign: 'center', gap: '6px',
        }}>
          <div style={{ fontSize: '24px' }}>🕐</div>
          <div style={{ fontWeight: 600 }}>Picks generate at 7:30 AM ET</div>
          <div style={{ fontSize: '11px', color: '#d1d5db' }}>Check back this morning</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
            {bias && (
              <span style={{
                fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em',
                color: biasColor, background: biasBg,
                borderRadius: '4px', padding: '2px 7px',
              }}>
                {biasLabel}
              </span>
            )}
            {pick.outcome !== 'pending' && <OutcomeBadge outcome={pick.outcome} />}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#111827', letterSpacing: '0.02em', lineHeight: 1 }}>
              {symbol ?? '—'}
            </div>
            {icScore != null && (
              <div style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em',
                color: icColor(icScore), background: '#f4f4f5',
                borderRadius: '4px', padding: '2px 6px', whiteSpace: 'nowrap',
              }}>
                IC {icScore}
              </div>
            )}
          </div>

          {rationaleText && (
            <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.5, fontStyle: 'italic', flex: 1 }}>
              &quot;{rationaleText}&quot;
            </div>
          )}

          {pick.catalyst && (
            <div style={{ fontSize: '10px', color: '#6b7280' }}>
              ⚡ {pick.catalyst}
            </div>
          )}

          {entryPrice != null && (
            <div style={{ fontSize: '11px', color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: '#9ca3af' }}>Entry </span>
              <span style={{ fontWeight: 600 }}>{fmtPrice(entryPrice, isCrypto)}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, stats, loading }: { label: string; stats: Stats | null; loading: boolean }) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      padding: '20px',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
        {label}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton height="32px" width="100px" />
          <Skeleton height="14px" width="80px" />
          <Skeleton height="12px" width="60px" />
        </div>
      ) : !stats ? (
        <div style={{ color: '#9ca3af', fontSize: '13px' }}>
          No data yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
            {stats.wins}–{stats.losses}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            Win Rate:{' '}
            <span style={{
              fontWeight: 700,
              color: stats.win_rate == null ? '#9ca3af' : stats.win_rate >= 60 ? '#16a34a' : stats.win_rate >= 50 ? '#d97706' : '#dc2626',
            }}>
              {stats.win_rate != null ? `${stats.win_rate}%` : '—'}
            </span>
          </div>
          {stats.streak > 0 && stats.streak_type && (
            <div style={{ fontSize: '11px', color: stats.streak_type === 'win' ? '#16a34a' : '#dc2626' }}>
              {stats.streak_type === 'win' ? '🔥' : '❄️'} {stats.streak}-{stats.streak_type === 'win' ? 'win' : 'loss'} streak
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function BattlePage() {
  const router = useRouter()
  const [data, setData] = useState<BattleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  // Form state
  const [stockSymbol, setStockSymbol] = useState('')
  const [stockBias, setStockBias] = useState<'bullish' | 'bearish'>('bullish')
  const [cryptoSymbol, setCryptoSymbol] = useState('')
  const [cryptoBias, setCryptoBias] = useState<'bullish' | 'bearish'>('bullish')
  const [optionUnderlying, setOptionUnderlying] = useState('')
  const [optionType, setOptionType] = useState<'call' | 'put'>('call')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: sessionData }) => {
      const s = sessionData.session
      setUser(s?.user ?? null)
      setToken(s?.access_token ?? null)
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    if (authLoading) return
    fetchData()
  }, [authLoading, token])

  async function fetchData() {
    setLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/battle', { headers })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !token) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/battle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          stock_symbol: stockSymbol.trim().toUpperCase() || null,
          stock_bias: stockSymbol.trim() ? stockBias : null,
          crypto_symbol: cryptoSymbol.trim().toUpperCase() || null,
          crypto_bias: cryptoSymbol.trim() ? cryptoBias : null,
          option_underlying: optionUnderlying.trim().toUpperCase() || null,
          option_type: optionUnderlying.trim() ? optionType : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setSubmitError(err.error ?? 'Something went wrong')
      } else {
        await fetchData()
      }
    } catch {
      setSubmitError('Network error — please try again')
    }
    setSubmitting(false)
  }

  // Build history rows (last 10 days)
  const historyDates = (() => {
    const dates: string[] = []
    for (let i = 0; i < 10; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d.toLocaleDateString('en-CA'))
    }
    return dates
  })()

  const stockByDate = new Map<string, CouncilPick>()
  const optionByDate = new Map<string, CouncilPick>()
  const cryptoByDate = new Map<string, CouncilPick>()
  const userByDate = new Map<string, UserPick>()

  if (data) {
    for (const p of data.history.stock_picks) {
      if (p.type === 'stock' && !stockByDate.has(p.pick_date)) stockByDate.set(p.pick_date, p)
      if (p.type === 'crypto' && !cryptoByDate.has(p.pick_date)) cryptoByDate.set(p.pick_date, p)
    }
    for (const p of data.history.option_picks) {
      if (!optionByDate.has(p.pick_date)) optionByDate.set(p.pick_date, p)
    }
    for (const p of data.history.user_picks) {
      userByDate.set(p.pick_date, p)
    }
  }

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .bias-btn { transition: opacity 0.15s; cursor: pointer; }
        .bias-btn:hover { opacity: 0.85; }
        .submit-btn:hover { opacity: 0.9; }
        .back-btn:hover { opacity: 0.7; }
        @media (max-width: 700px) {
          .council-grid { grid-template-columns: 1fr !important; }
          .leaderboard-row { flex-direction: column !important; }
          .history-table-wrap { overflow-x: auto; }
        }
      `}</style>

      <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '0 0 60px' }}>

        {/* Nav bar */}
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <button
            className="back-btn"
            onClick={() => router.push('/app')}
            style={{
              background: 'transparent', border: '1px solid #e5e7eb',
              borderRadius: '6px', padding: '5px 12px',
              fontSize: '12px', fontWeight: 600, color: '#6b7280',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ← Back to Council
          </button>
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>
            Investment Council
          </div>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏛️</div>
            <h1 style={{
              fontSize: '28px', fontWeight: 900, color: '#111827',
              margin: '0 0 8px', letterSpacing: '-0.02em',
            }}>
              Challenge the Council
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
              Pit your picks against The Council&apos;s highest-conviction daily calls.<br />
              One stock · One crypto · One option · 24-hour verdict.
            </p>
          </div>

          {/* Today's Council Picks */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
              color: '#9ca3af', marginBottom: '12px', textTransform: 'uppercase',
            }}>
              Today&apos;s Council Picks
            </div>
            <div
              className="council-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
              }}
            >
              <CouncilCard title="COUNCIL STOCK PICK" pick={data?.council.stock ?? null} loading={loading} />
              <CouncilCard title="COUNCIL CRYPTO PICK" pick={data?.council.crypto ?? null} loading={loading} />
              <CouncilCard title="COUNCIL OPTION PICK" pick={data?.council.option ?? null} loading={loading} />
            </div>
          </div>

          {/* Leaderboard */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
              color: '#9ca3af', marginBottom: '12px', textTransform: 'uppercase',
            }}>
              Head-to-Head Leaderboard
            </div>
            <div className="leaderboard-row" style={{ display: 'flex', gap: '16px' }}>
              <StatCard
                label="🏛️ The Council"
                stats={data?.council_stats ?? null}
                loading={loading}
              />
              <StatCard
                label="👤 You"
                stats={data?.user_stats ?? null}
                loading={loading || authLoading}
              />
            </div>
          </div>

          {/* Your Pick Today */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
              color: '#9ca3af', marginBottom: '12px', textTransform: 'uppercase',
            }}>
              Your Pick Today
            </div>

            <div style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              padding: '24px',
            }}>
              {authLoading || loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Skeleton height="14px" width="200px" />
                  <Skeleton height="40px" />
                  <Skeleton height="40px" />
                </div>
              ) : !user ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                    Sign in to challenge the council with your own picks
                  </div>
                  <button
                    onClick={() => router.push('/login')}
                    style={{
                      background: '#C9A34E', color: '#ffffff',
                      border: 'none', borderRadius: '8px',
                      padding: '10px 24px', fontSize: '14px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Sign In to Challenge
                  </button>
                </div>
              ) : data?.user_today ? (
                // Already submitted
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', marginBottom: '16px' }}>
                    ✓ Picks locked in for today
                  </div>
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    {data.user_today.stock_symbol && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#9ca3af' }}>
                          STOCK
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                          {data.user_today.stock_symbol}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '9px', fontWeight: 700,
                            color: data.user_today.stock_bias === 'bullish' ? '#16a34a' : '#dc2626',
                            background: data.user_today.stock_bias === 'bullish' ? '#dcfce7' : '#fee2e2',
                            borderRadius: '4px', padding: '2px 6px',
                          }}>
                            {data.user_today.stock_bias === 'bullish' ? '▲ BULLISH' : '▼ BEARISH'}
                          </span>
                          <OutcomeBadge outcome={data.user_today.stock_outcome} />
                        </div>
                        {data.user_today.stock_entry_price != null && (
                          <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                            Entry {fmtPrice(data.user_today.stock_entry_price)}
                          </div>
                        )}
                      </div>
                    )}
                    {data.user_today.crypto_symbol && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#9ca3af' }}>
                          CRYPTO
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                          {data.user_today.crypto_symbol}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '9px', fontWeight: 700,
                            color: data.user_today.crypto_bias === 'bullish' ? '#16a34a' : '#dc2626',
                            background: data.user_today.crypto_bias === 'bullish' ? '#dcfce7' : '#fee2e2',
                            borderRadius: '4px', padding: '2px 6px',
                          }}>
                            {data.user_today.crypto_bias === 'bullish' ? '▲ BULLISH' : '▼ BEARISH'}
                          </span>
                          <OutcomeBadge outcome={data.user_today.crypto_outcome} />
                        </div>
                        {data.user_today.crypto_entry_price != null && (
                          <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                            Entry {fmtPrice(data.user_today.crypto_entry_price, true)}
                          </div>
                        )}
                      </div>
                    )}
                    {data.user_today.option_underlying && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#9ca3af' }}>
                          OPTION
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                          {data.user_today.option_underlying}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '9px', fontWeight: 700,
                            color: data.user_today.option_type === 'call' ? '#2563eb' : '#7c3aed',
                            background: data.user_today.option_type === 'call' ? '#dbeafe' : '#ede9fe',
                            borderRadius: '4px', padding: '2px 6px',
                          }}>
                            {data.user_today.option_type === 'call' ? '▲ CALL' : '▼ PUT'}
                          </span>
                          <OutcomeBadge outcome={data.user_today.option_outcome} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Submission form
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>

                    {/* Stock row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ width: '100px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#374151' }}>
                        STOCK
                      </div>
                      <input
                        value={stockSymbol}
                        onChange={e => setStockSymbol(e.target.value.toUpperCase())}
                        placeholder="e.g. NVDA"
                        maxLength={10}
                        style={{
                          padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px',
                          fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                          width: '110px', letterSpacing: '0.04em', color: '#111827',
                          outline: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="bias-btn"
                          onClick={() => setStockBias('bullish')}
                          style={{
                            padding: '7px 14px', borderRadius: '6px', border: 'none',
                            fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            background: stockBias === 'bullish' ? '#dcfce7' : '#f4f4f5',
                            color: stockBias === 'bullish' ? '#16a34a' : '#9ca3af',
                          }}
                        >
                          ▲ BULLISH
                        </button>
                        <button
                          type="button"
                          className="bias-btn"
                          onClick={() => setStockBias('bearish')}
                          style={{
                            padding: '7px 14px', borderRadius: '6px', border: 'none',
                            fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            background: stockBias === 'bearish' ? '#fee2e2' : '#f4f4f5',
                            color: stockBias === 'bearish' ? '#dc2626' : '#9ca3af',
                          }}
                        >
                          ▼ BEARISH
                        </button>
                      </div>
                    </div>

                    {/* Crypto row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ width: '100px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#374151' }}>
                        CRYPTO
                      </div>
                      <input
                        value={cryptoSymbol}
                        onChange={e => setCryptoSymbol(e.target.value.toUpperCase())}
                        placeholder="e.g. BTC"
                        maxLength={10}
                        style={{
                          padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px',
                          fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                          width: '110px', letterSpacing: '0.04em', color: '#111827',
                          outline: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="bias-btn"
                          onClick={() => setCryptoBias('bullish')}
                          style={{
                            padding: '7px 14px', borderRadius: '6px', border: 'none',
                            fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            background: cryptoBias === 'bullish' ? '#dcfce7' : '#f4f4f5',
                            color: cryptoBias === 'bullish' ? '#16a34a' : '#9ca3af',
                          }}
                        >
                          ▲ BULLISH
                        </button>
                        <button
                          type="button"
                          className="bias-btn"
                          onClick={() => setCryptoBias('bearish')}
                          style={{
                            padding: '7px 14px', borderRadius: '6px', border: 'none',
                            fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            background: cryptoBias === 'bearish' ? '#fee2e2' : '#f4f4f5',
                            color: cryptoBias === 'bearish' ? '#dc2626' : '#9ca3af',
                          }}
                        >
                          ▼ BEARISH
                        </button>
                      </div>
                    </div>

                    {/* Option row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ width: '100px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#374151' }}>
                        OPTION
                      </div>
                      <input
                        value={optionUnderlying}
                        onChange={e => setOptionUnderlying(e.target.value.toUpperCase())}
                        placeholder="e.g. SPY"
                        maxLength={10}
                        style={{
                          padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px',
                          fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                          width: '110px', letterSpacing: '0.04em', color: '#111827',
                          outline: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="bias-btn"
                          onClick={() => setOptionType('call')}
                          style={{
                            padding: '7px 14px', borderRadius: '6px', border: 'none',
                            fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            background: optionType === 'call' ? '#dbeafe' : '#f4f4f5',
                            color: optionType === 'call' ? '#2563eb' : '#9ca3af',
                          }}
                        >
                          ▲ CALL
                        </button>
                        <button
                          type="button"
                          className="bias-btn"
                          onClick={() => setOptionType('put')}
                          style={{
                            padding: '7px 14px', borderRadius: '6px', border: 'none',
                            fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            background: optionType === 'put' ? '#ede9fe' : '#f4f4f5',
                            color: optionType === 'put' ? '#7c3aed' : '#9ca3af',
                          }}
                        >
                          ▼ PUT
                        </button>
                      </div>
                    </div>
                  </div>

                  {submitError && (
                    <div style={{
                      background: '#fee2e2', color: '#dc2626', borderRadius: '6px',
                      padding: '8px 12px', fontSize: '12px', marginBottom: '12px',
                    }}>
                      {submitError}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <button
                      type="submit"
                      className="submit-btn"
                      disabled={submitting}
                      style={{
                        background: submitting ? '#d1d5db' : '#C9A34E',
                        color: '#ffffff', border: 'none',
                        borderRadius: '8px', padding: '11px 28px',
                        fontSize: '14px', fontWeight: 700,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', letterSpacing: '0.02em',
                      }}
                    >
                      {submitting ? 'Locking in...' : '🔒 Lock In My Picks'}
                    </button>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                      Picks are locked once submitted · You don&apos;t need to fill all three
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* History table */}
          <div>
            <div style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
              color: '#9ca3af', marginBottom: '12px', textTransform: 'uppercase',
            }}>
              Last 10 Days
            </div>
            <div
              className="history-table-wrap"
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['Date', 'Council Stock', 'Council Crypto', 'Council Option', 'Your Stock', 'Your Crypto', 'Your Option'].map(h => (
                      <th key={h} style={{
                        padding: '10px 12px', textAlign: 'left',
                        fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
                        color: '#6b7280', textTransform: 'uppercase', whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} style={{ padding: '10px 12px' }}>
                            <Skeleton height="12px" width="60px" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    historyDates.map(date => {
                      const cStock = stockByDate.get(date)
                      const cCrypto = cryptoByDate.get(date)
                      const cOption = optionByDate.get(date)
                      const uPick = userByDate.get(date)

                      return (
                        <tr key={date} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '10px 12px', fontSize: '12px', color: '#374151', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {fmtDate(date)}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {cStock ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>{cStock.symbol}</span>
                                <OutcomeBadge outcome={cStock.outcome} />
                              </div>
                            ) : <span style={{ color: '#d1d5db', fontSize: '11px' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {cCrypto ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>{cCrypto.symbol}</span>
                                <OutcomeBadge outcome={cCrypto.outcome} />
                              </div>
                            ) : <span style={{ color: '#d1d5db', fontSize: '11px' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {cOption ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>{cOption.underlying}</span>
                                <OutcomeBadge outcome={cOption.outcome} />
                              </div>
                            ) : <span style={{ color: '#d1d5db', fontSize: '11px' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {uPick?.stock_symbol ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>{uPick.stock_symbol}</span>
                                <OutcomeBadge outcome={uPick.stock_outcome} />
                              </div>
                            ) : <span style={{ color: '#d1d5db', fontSize: '11px' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {uPick?.crypto_symbol ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>{uPick.crypto_symbol}</span>
                                <OutcomeBadge outcome={uPick.crypto_outcome} />
                              </div>
                            ) : <span style={{ color: '#d1d5db', fontSize: '11px' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {uPick?.option_underlying ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>{uPick.option_underlying}</span>
                                <OutcomeBadge outcome={uPick.option_outcome} />
                              </div>
                            ) : <span style={{ color: '#d1d5db', fontSize: '11px' }}>—</span>}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
