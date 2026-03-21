'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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

interface APIResponse {
  picks: Pick[]
  stats: Stats
  market_context: string
  generated_at: string
  is_cached: boolean
}

function ConfidenceDots({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: i < value ? color : '#e5e7eb',
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

  const accentColor = isBull ? '#16a34a' : '#dc2626'
  const accentBg = isBull ? '#dcfce7' : '#fee2e2'
  const accentBorder = isBull ? '#bbf7d0' : '#fecaca'

  const outcomeColor = isWin ? '#16a34a' : isLoss ? '#dc2626' : '#555'
  const outcomeBg = isWin ? '#dcfce7' : isLoss ? '#fee2e2' : '#f4f4f5'

  const retPct = pick.direction_return_pct
  const retDisplay = retPct != null
    ? `${retPct >= 0 ? '+' : ''}${retPct.toFixed(2)}%`
    : ''

  return (
    <div style={{
      background: '#ffffff',
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
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', letterSpacing: '0.02em', lineHeight: 1 }}>
          {pick.symbol}
        </div>
        {(pick.sector) && (
          <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px', letterSpacing: '0.04em' }}>
            {pick.sector}
          </div>
        )}
      </div>

      {/* Confidence dots */}
      <ConfidenceDots value={pick.confidence} color={accentColor} />

      {/* Rationale */}
      <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.45, fontStyle: 'italic', flex: 1 }}>
        &quot;{pick.rationale}&quot;
      </div>

      {/* Catalyst */}
      {pick.catalyst && (
        <div style={{ fontSize: '9px', color: '#6b7280', lineHeight: 1.4 }}>
          ⚡ {pick.catalyst}
        </div>
      )}

      {/* Price info */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
        {pick.entry_price != null && (
          <div style={{ fontSize: '10px', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: '#9ca3af' }}>Entry </span>
            <span style={{ color: '#374151', fontWeight: 600 }}>
              {pick.type === 'crypto' && pick.entry_price > 1000
                ? `$${pick.entry_price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                : `$${pick.entry_price.toFixed(pick.entry_price < 1 ? 4 : 2)}`}
            </span>
          </div>
        )}
        {pick.exit_price != null ? (
          <div style={{ fontSize: '10px', color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>
            → <span style={{ color: outcomeColor, fontWeight: 600 }}>
              {pick.type === 'crypto' && pick.exit_price > 1000
                ? `$${pick.exit_price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                : `$${pick.exit_price.toFixed(pick.exit_price < 1 ? 4 : 2)}`}
            </span>
          </div>
        ) : isPending && pick.entry_price != null ? (
          <div style={{ fontSize: '9px', color: '#9ca3af', fontStyle: 'italic' }}>eval in 24h</div>
        ) : null}
      </div>
    </div>
  )
}

function StatBar({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  if (loading || !stats) {
    return (
      <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
          {loading ? 'Generating picks...' : 'Building track record — check back after picks are evaluated'}
        </div>
      </div>
    )
  }

  const { wins, losses, total, win_rate, avg_win, avg_loss, streak_type, streak_count, best, recent, stock_wins, stock_losses, crypto_wins, crypto_losses } = stats

  if (total === 0) {
    return (
      <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', letterSpacing: '0.04em' }}>
          TRACK RECORD BUILDING — picks are evaluated after 24 hours
        </div>
      </div>
    )
  }

  const stockTotal = stock_wins + stock_losses
  const cryptoTotal = crypto_wins + crypto_losses

  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e4e4e7',
      borderRadius: '10px', padding: '14px 16px', marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', gap: '0', alignItems: 'stretch', flexWrap: 'wrap' }}>

        {/* Record */}
        <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px' }}>
          <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>RECORD</div>
          <div style={{ fontSize: '18px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            <span style={{ color: '#16a34a' }}>{wins}W</span>
            <span style={{ color: '#d1d5db', fontSize: '14px', margin: '0 4px' }}>–</span>
            <span style={{ color: '#dc2626' }}>{losses}L</span>
          </div>
          <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '3px' }}>{total} evaluated</div>
        </div>

        {/* Win rate */}
        <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px', minWidth: '100px' }}>
          <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>WIN RATE</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: win_rate >= 55 ? '#16a34a' : win_rate >= 45 ? '#fbbf24' : '#dc2626', lineHeight: 1 }}>
            {win_rate.toFixed(1)}%
          </div>
          <div style={{ marginTop: '5px', background: '#f0f0f0', borderRadius: '3px', height: '4px', width: '80px' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: win_rate >= 55 ? '#16a34a' : win_rate >= 45 ? '#fbbf24' : '#dc2626', width: `${Math.min(win_rate, 100)}%`, transition: 'width 0.5s' }} />
          </div>
        </div>

        {/* Avg returns */}
        <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px' }}>
          <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>AVG RETURN</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', lineHeight: 1.4 }}>+{avg_win.toFixed(2)}% win</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', lineHeight: 1.4 }}>-{avg_loss.toFixed(2)}% loss</div>
        </div>

        {/* Streak */}
        {streak_type && streak_count > 0 && (
          <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px' }}>
            <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>STREAK</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: streak_type === 'win' ? '#16a34a' : '#dc2626', lineHeight: 1 }}>
              {streak_type === 'win' ? '🔥' : '❄️'} {streak_count}{streak_type === 'win' ? 'W' : 'L'}
            </div>
          </div>
        )}

        {/* Best pick */}
        {best && (
          <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px' }}>
            <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>BEST CALL</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{best.symbol}</div>
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>+{best.return_pct?.toFixed(2)}%</div>
          </div>
        )}

        {/* Stocks vs Crypto */}
        <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px' }}>
          <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>BY TYPE</div>
          <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.6 }}>
            Stocks: <span style={{ color: '#16a34a', fontWeight: 600 }}>{stockTotal > 0 ? ((stock_wins / stockTotal) * 100).toFixed(0) : '—'}%</span>
          </div>
          <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.6 }}>
            Crypto: <span style={{ color: '#d97706', fontWeight: 600 }}>{cryptoTotal > 0 ? ((crypto_wins / cryptoTotal) * 100).toFixed(0) : '—'}%</span>
          </div>
        </div>

        {/* Recent dots */}
        {recent.length > 0 && (
          <div style={{ flex: 1, minWidth: '80px' }}>
            <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '6px' }}>LAST {recent.length}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
              {recent.map((r, i) => (
                <div
                  key={i}
                  title={r.return_pct != null ? `${r.return_pct >= 0 ? '+' : ''}${r.return_pct.toFixed(2)}%` : ''}
                  style={{
                    width: '10px', height: '10px', borderRadius: '2px',
                    background: r.outcome === 'win' ? '#16a34a' : r.outcome === 'loss' ? '#dc2626' : '#d1d5db',
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

export default function AIPicksPage() {
  const router = useRouter()
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load picks')
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
    <div style={{ minHeight: '100vh', background: '#f4f4f5', color: '#111827', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #e4e4e7', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '16px', background: '#ffffff', flexShrink: 0 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'transparent', border: '1px solid #d4d4d8', borderRadius: '6px', color: '#555', fontSize: '12px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.color = '#111827'}
          onMouseLeave={e => e.currentTarget.style.color = '#555'}
        >← Back</button>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>🤖 AI Daily Picks</div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{pickDate}</div>
        <div style={{ fontSize: '10px', color: '#d1d5db' }}>·</div>
        <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.03em' }}>
          Next picks: <span style={{ color: '#6b7280' }}>{nextPickDate}</span>
        </div>
        {data?.is_cached && (
          <div style={{ fontSize: '9px', color: '#9ca3af', background: '#f4f4f5', borderRadius: '4px', padding: '2px 7px', letterSpacing: '0.05em', border: '1px solid #e4e4e7' }}>
            CACHED
          </div>
        )}
        <button
          onClick={() => load(true)}
          disabled={generating || loading}
          style={{
            background: generating || loading ? '#f4f4f5' : '#dcfce7',
            border: 'none', borderRadius: '6px',
            padding: '4px 12px', color: generating || loading ? '#d1d5db' : '#16a34a',
            fontSize: '11px', fontWeight: 600, cursor: generating || loading ? 'default' : 'pointer',
            fontFamily: 'inherit', letterSpacing: '0.04em',
          }}
        >
          {generating ? '⟳ Generating...' : '↻ Refresh'}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px 32px', display: 'flex', flexDirection: 'column' }}>
        {/* Market context */}
        {data?.market_context && (
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px', fontStyle: 'italic', lineHeight: 1.5, flexShrink: 0 }}>
            📡 {data.market_context}
          </div>
        )}

        {/* Stats bar */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '6px' }}>AI TRACK RECORD</div>
          <StatBar stats={data?.stats ?? null} loading={loading} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexShrink: 0 }}>
          {([
            { key: 'stocks', label: '📈 Stocks', activeColor: '#15803d', activeBg: '#dcfce7', count: stocks.length },
            { key: 'crypto', label: '₿ Crypto', activeColor: '#d97706', activeBg: '#fef3c7', count: cryptos.length },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '7px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '12px', fontWeight: 700, letterSpacing: '0.03em',
                background: tab === t.key ? t.activeBg : '#f4f4f5',
                color: tab === t.key ? t.activeColor : '#6b7280',
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
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                🤖 Analyzing market data and generating picks...
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                This may take 15–20 seconds on first load
              </div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#dc2626', fontSize: '13px' }}>
              {error}
            </div>
          ) : picks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '13px' }}>
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

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center', marginTop: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.03em' }}>
            📌 <span style={{ color: '#9ca3af' }}>WIN/LOSS</span> — bullish pick wins if price rises from entry after 24h; bearish wins if price falls
          </div>
          <div style={{ fontSize: '9px', color: '#9ca3af' }}>·</div>
          <div style={{ fontSize: '9px', color: '#9ca3af' }}>Stocks M–F only · Crypto daily · Not financial advice</div>
        </div>
      </div>
    </div>
  )
}
