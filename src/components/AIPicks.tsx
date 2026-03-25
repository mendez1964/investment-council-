'use client'

import { useState, useEffect, useCallback } from 'react'

interface Pick {
  id: number
  pick_date: string
  symbol: string
  type: 'stock' | 'crypto'
  bias: 'bullish' | 'bearish'
  entry_price: number | null
  confidence: number
  rationale: string
  catalyst: string
  sector?: string
  outcome: 'win' | 'loss' | 'pending'
  price_change_pct: number | null
  direction_return_pct: number | null
  exit_price: number | null
  evaluated_at: string | null
}

interface Stats {
  wins: number
  losses: number
  total: number
  win_rate: number
  avg_win: number
  avg_loss: number
  streak_type: 'win' | 'loss' | null
  streak_count: number
  stock_wins: number
  stock_losses: number
  crypto_wins: number
  crypto_losses: number
  best: { symbol: string; return_pct: number } | null
  worst: { symbol: string; return_pct: number } | null
  recent: Array<{ outcome: string; return_pct: number | null }>
}

interface HistoryDay {
  date: string
  picks: Pick[]
  wins: number
  losses: number
  total: number
  win_rate: number | null
}

interface APIResponse {
  picks: Pick[]
  stats: Stats
  market_context: string
  generated_at: string
  is_cached: boolean
  history: HistoryDay[]
}

function ConfidenceDots({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: i < value ? color : '#1f1f1f',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  )
}

function PickCard({ pick }: { pick: Pick }) {
  const isBull = pick.bias === 'bullish'
  const isWin = pick.outcome === 'win'
  const isLoss = pick.outcome === 'loss'
  const isPending = pick.outcome === 'pending'

  const accentColor = isBull ? '#4ade80' : '#f87171'
  const accentBg = isBull ? '#052e16' : '#2e0505'
  const accentBorder = isBull ? '#14532d' : '#7f1d1d'

  const outcomeColor = isWin ? '#4ade80' : isLoss ? '#f87171' : '#555'
  const outcomeBg = isWin ? '#052e16' : isLoss ? '#2e0505' : '#111'

  const retPct = pick.direction_return_pct
  const retDisplay = retPct != null
    ? `${retPct >= 0 ? '+' : ''}${retPct.toFixed(2)}%`
    : ''

  return (
    <div style={{
      background: '#0a0a0a',
      border: `1px solid ${accentBorder}`,
      borderTop: `3px solid ${accentColor}`,
      borderRadius: '8px',
      padding: '10px 11px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      position: 'relative',
      minHeight: '148px',
    }}>
      {/* Bias badge + outcome */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          fontSize: '9px', fontWeight: 800, letterSpacing: '0.08em',
          color: accentColor, background: accentBg,
          borderRadius: '4px', padding: '2px 6px',
        }}>
          {isBull ? '▲ BULLISH' : '▼ BEARISH'}
        </div>
        {!isPending && (
          <div style={{
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em',
            color: outcomeColor, background: outcomeBg,
            borderRadius: '4px', padding: '2px 6px',
          }}>
            {isWin ? '✓ WIN' : '✗ LOSS'} {retDisplay}
          </div>
        )}
      </div>

      {/* Symbol + sector */}
      <div>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#e5e5e5', letterSpacing: '0.02em', lineHeight: 1 }}>
          {pick.symbol}
        </div>
        {(pick.sector) && (
          <div style={{ fontSize: '9px', color: '#333', marginTop: '2px', letterSpacing: '0.04em' }}>
            {pick.sector}
          </div>
        )}
      </div>

      {/* Confidence dots */}
      <ConfidenceDots value={pick.confidence} color={accentColor} />

      {/* Rationale */}
      <div style={{ fontSize: '10px', color: '#888', lineHeight: 1.45, fontStyle: 'italic', flex: 1 }}>
        "{pick.rationale}"
      </div>

      {/* Catalyst */}
      {pick.catalyst && (
        <div style={{ fontSize: '9px', color: '#555', lineHeight: 1.4 }}>
          ⚡ {pick.catalyst}
        </div>
      )}

      {/* Price info */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
        {pick.entry_price != null && (
          <div style={{ fontSize: '10px', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: '#333' }}>Entry </span>
            <span style={{ color: '#666', fontWeight: 600 }}>
              {pick.type === 'crypto' && pick.entry_price > 1000
                ? `$${pick.entry_price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                : `$${pick.entry_price.toFixed(pick.entry_price < 1 ? 4 : 2)}`}
            </span>
          </div>
        )}
        {pick.exit_price != null ? (
          <div style={{ fontSize: '10px', color: '#333', fontVariantNumeric: 'tabular-nums' }}>
            → <span style={{ color: outcomeColor, fontWeight: 600 }}>
              {pick.type === 'crypto' && pick.exit_price > 1000
                ? `$${pick.exit_price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                : `$${pick.exit_price.toFixed(pick.exit_price < 1 ? 4 : 2)}`}
            </span>
          </div>
        ) : isPending && pick.entry_price != null ? (
          <div style={{ fontSize: '9px', color: '#2a2a2a', fontStyle: 'italic' }}>eval in 24h</div>
        ) : null}
      </div>
    </div>
  )
}

function StatBar({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  if (loading || !stats) {
    return (
      <div style={{ background: '#080808', border: '1px solid #111', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#333', textAlign: 'center' }}>
          {loading ? 'Generating picks...' : 'Building track record — check back after picks are evaluated'}
        </div>
      </div>
    )
  }

  const { wins, losses, total, win_rate, avg_win, avg_loss, streak_type, streak_count, best, worst, recent, stock_wins, stock_losses, crypto_wins, crypto_losses } = stats

  if (total === 0) {
    return (
      <div style={{ background: '#080808', border: '1px solid #111', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#333', textAlign: 'center', letterSpacing: '0.04em' }}>
          TRACK RECORD BUILDING — picks are evaluated after 24 hours
        </div>
      </div>
    )
  }

  const stockTotal = stock_wins + stock_losses
  const cryptoTotal = crypto_wins + crypto_losses

  return (
    <div style={{
      background: '#080808', border: '1px solid #141414',
      borderRadius: '10px', padding: '14px 16px', marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', gap: '0', alignItems: 'stretch', flexWrap: 'wrap' }}>

        {/* Record */}
        <div style={{ paddingRight: '16px', borderRight: '1px solid #141414', marginRight: '16px' }}>
          <div style={{ fontSize: '9px', color: '#333', letterSpacing: '0.07em', marginBottom: '4px' }}>RECORD</div>
          <div style={{ fontSize: '18px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            <span style={{ color: '#4ade80' }}>{wins}W</span>
            <span style={{ color: '#333', fontSize: '14px', margin: '0 4px' }}>–</span>
            <span style={{ color: '#f87171' }}>{losses}L</span>
          </div>
          <div style={{ fontSize: '9px', color: '#2a2a2a', marginTop: '3px' }}>{total} evaluated</div>
        </div>

        {/* Win rate */}
        <div style={{ paddingRight: '16px', borderRight: '1px solid #141414', marginRight: '16px', minWidth: '100px' }}>
          <div style={{ fontSize: '9px', color: '#333', letterSpacing: '0.07em', marginBottom: '4px' }}>WIN RATE</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: win_rate >= 55 ? '#4ade80' : win_rate >= 45 ? '#fbbf24' : '#f87171', lineHeight: 1 }}>
            {win_rate.toFixed(1)}%
          </div>
          <div style={{ marginTop: '5px', background: '#111', borderRadius: '3px', height: '4px', width: '80px' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: win_rate >= 55 ? '#4ade80' : win_rate >= 45 ? '#fbbf24' : '#f87171', width: `${Math.min(win_rate, 100)}%`, transition: 'width 0.5s' }} />
          </div>
        </div>

        {/* Avg returns */}
        <div style={{ paddingRight: '16px', borderRight: '1px solid #141414', marginRight: '16px' }}>
          <div style={{ fontSize: '9px', color: '#333', letterSpacing: '0.07em', marginBottom: '4px' }}>AVG RETURN</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80', lineHeight: 1.4 }}>+{avg_win.toFixed(2)}% win</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', lineHeight: 1.4 }}>-{avg_loss.toFixed(2)}% loss</div>
        </div>

        {/* Streak */}
        {streak_type && streak_count > 0 && (
          <div style={{ paddingRight: '16px', borderRight: '1px solid #141414', marginRight: '16px' }}>
            <div style={{ fontSize: '9px', color: '#333', letterSpacing: '0.07em', marginBottom: '4px' }}>STREAK</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: streak_type === 'win' ? '#4ade80' : '#f87171', lineHeight: 1 }}>
              {streak_type === 'win' ? '🔥' : '❄️'} {streak_count}{streak_type === 'win' ? 'W' : 'L'}
            </div>
          </div>
        )}

        {/* Best pick */}
        {best && (
          <div style={{ paddingRight: '16px', borderRight: '1px solid #141414', marginRight: '16px' }}>
            <div style={{ fontSize: '9px', color: '#333', letterSpacing: '0.07em', marginBottom: '4px' }}>BEST CALL</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#e5e5e5', lineHeight: 1 }}>{best.symbol}</div>
            <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700 }}>+{best.return_pct?.toFixed(2)}%</div>
          </div>
        )}

        {/* Stocks vs Crypto */}
        <div style={{ paddingRight: '16px', borderRight: '1px solid #141414', marginRight: '16px' }}>
          <div style={{ fontSize: '9px', color: '#333', letterSpacing: '0.07em', marginBottom: '4px' }}>BY TYPE</div>
          <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.6 }}>
            Stocks: <span style={{ color: '#7ec8a0', fontWeight: 600 }}>{stockTotal > 0 ? ((stock_wins / stockTotal) * 100).toFixed(0) : '—'}%</span>
          </div>
          <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.6 }}>
            Crypto: <span style={{ color: '#fbbf24', fontWeight: 600 }}>{cryptoTotal > 0 ? ((crypto_wins / cryptoTotal) * 100).toFixed(0) : '—'}%</span>
          </div>
        </div>

        {/* Recent dots */}
        {recent.length > 0 && (
          <div style={{ flex: 1, minWidth: '80px' }}>
            <div style={{ fontSize: '9px', color: '#333', letterSpacing: '0.07em', marginBottom: '6px' }}>LAST {recent.length}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
              {recent.map((r, i) => (
                <div
                  key={i}
                  title={r.return_pct != null ? `${r.return_pct >= 0 ? '+' : ''}${r.return_pct.toFixed(2)}%` : ''}
                  style={{
                    width: '10px', height: '10px', borderRadius: '2px',
                    background: r.outcome === 'win' ? '#166534' : r.outcome === 'loss' ? '#7f1d1d' : '#222',
                    cursor: 'default',
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AIPicks({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<APIResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [tab, setTab] = useState<'stocks' | 'crypto'>('stocks')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (refresh = false) => {
    if (refresh) setGenerating(true)
    else setLoading(true)
    setError(null)
    try {
      const url = refresh ? '/api/ai-picks?refresh=true' : '/api/ai-picks'
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setData(d)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load picks')
    } finally {
      setLoading(false)
      setGenerating(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const stocks = data?.picks.filter(p => p.type === 'stock') ?? []
  const cryptos = data?.picks.filter(p => p.type === 'crypto') ?? []
  const picks = tab === 'stocks' ? stocks : cryptos

  const pickDate = data?.picks[0]?.pick_date
    ? new Date(data.picks[0].pick_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextPickDate = tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d0d0d', border: '1px solid #1f1f1f',
          borderRadius: '12px', padding: '22px 24px',
          width: '900px', maxWidth: '97vw', maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.9)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexShrink: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e5e5e5', flex: 1 }}>
            🤖 AI Daily Picks
          </div>
          {data?.is_cached && (
            <div style={{ fontSize: '9px', color: '#1f1f1f', background: '#111', borderRadius: '4px', padding: '2px 7px', letterSpacing: '0.05em' }}>
              CACHED
            </div>
          )}
          <button
            onClick={() => load(true)}
            disabled={generating || loading}
            style={{
              background: generating || loading ? '#111' : '#1a472a',
              border: 'none', borderRadius: '6px',
              padding: '4px 12px', color: generating || loading ? '#333' : '#7ec8a0',
              fontSize: '11px', fontWeight: 600, cursor: generating || loading ? 'default' : 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.04em',
            }}
          >
            {generating ? '⟳ Generating...' : '↻ Refresh'}
          </button>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        {/* Date + next picks line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexShrink: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#e5e5e5' }}>{pickDate}</div>
          <div style={{ fontSize: '10px', color: '#2a2a2a' }}>·</div>
          <div style={{ fontSize: '10px', color: '#2a2a2a', letterSpacing: '0.03em' }}>
            Next picks: <span style={{ color: '#444' }}>{nextPickDate}</span>
          </div>
        </div>

        {/* Market context */}
        {data?.market_context && (
          <div style={{ fontSize: '11px', color: '#555', marginBottom: '12px', fontStyle: 'italic', lineHeight: 1.5, flexShrink: 0 }}>
            📡 {data.market_context}
          </div>
        )}

        {/* Stats bar */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: '9px', color: '#2a2a2a', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '6px' }}>AI TRACK RECORD</div>
          <StatBar stats={data?.stats ?? null} loading={loading} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexShrink: 0 }}>
          {([
            { key: 'stocks', label: '📈 Stocks', color: '#7ec8a0', bg: '#1a472a', count: stocks.length },
            { key: 'crypto', label: '₿ Crypto', color: '#fbbf24', bg: '#451a03', count: cryptos.length },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '7px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '12px', fontWeight: 700, letterSpacing: '0.03em',
                background: tab === t.key ? t.bg : '#111',
                color: tab === t.key ? t.color : '#444',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{ marginLeft: '6px', fontSize: '10px', opacity: 0.7 }}>({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Picks grid */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px' }}>
              <div style={{ fontSize: '13px', color: '#444' }}>
                🤖 Analyzing market data and generating picks...
              </div>
              <div style={{ fontSize: '11px', color: '#2a2a2a' }}>
                This may take 15–20 seconds on first load
              </div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#f87171', fontSize: '13px' }}>
              {error}
            </div>
          ) : picks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#444', fontSize: '13px' }}>
              No picks available — click Refresh to generate
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))',
              gap: '8px',
            }}>
              {picks.map(pick => (
                <PickCard key={pick.id} pick={pick} />
              ))}
            </div>
          )}
        </div>

        {/* Past picks history */}
        {(data?.history ?? []).length > 0 && (
          <div style={{ flexShrink: 0, marginTop: '20px', borderTop: '1px solid #111', paddingTop: '16px' }}>
            <div style={{ fontSize: '9px', color: '#2a2a2a', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '10px' }}>PAST PICKS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(data?.history ?? []).map(day => {
                const dayStocks = day.picks.filter(p => p.type === 'stock')
                const dayCrypto = day.picks.filter(p => p.type === 'crypto')
                const dayPicks = tab === 'stocks' ? dayStocks : dayCrypto
                const dateLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                return (
                  <div key={day.date}>
                    {/* Day header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>{dateLabel}</div>
                      {day.total > 0 && (
                        <>
                          <div style={{ fontSize: '10px', color: '#2a2a2a' }}>·</div>
                          <div style={{ fontSize: '10px', color: '#444' }}>
                            <span style={{ color: '#4ade80' }}>{day.wins}W</span>
                            <span style={{ color: '#333', margin: '0 3px' }}>–</span>
                            <span style={{ color: '#f87171' }}>{day.losses}L</span>
                            {day.win_rate !== null && (
                              <span style={{ color: day.win_rate >= 55 ? '#4ade80' : day.win_rate >= 45 ? '#fbbf24' : '#f87171', marginLeft: '6px', fontWeight: 700 }}>
                                {day.win_rate}%
                              </span>
                            )}
                          </div>
                        </>
                      )}
                      {day.total === 0 && (
                        <div style={{ fontSize: '10px', color: '#2a2a2a' }}>evaluating in 24h</div>
                      )}
                    </div>
                    {dayPicks.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))', gap: '6px' }}>
                        {dayPicks.map(pick => <PickCard key={pick.id} pick={pick} />)}
                      </div>
                    ) : (
                      <div style={{ fontSize: '10px', color: '#2a2a2a', fontStyle: 'italic' }}>No {tab} picks for this day</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center', marginTop: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '9px', color: '#222', letterSpacing: '0.03em' }}>
            📌 <span style={{ color: '#333' }}>WIN/LOSS</span> — bullish pick wins if price rises from entry after 24h; bearish wins if price falls
          </div>
          <div style={{ fontSize: '9px', color: '#1a1a1a' }}>·</div>
          <div style={{ fontSize: '9px', color: '#1a1a1a' }}>Stocks M–F only · Crypto daily · Not financial advice</div>
        </div>
      </div>
    </div>
  )
}
