'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { trackPageView, trackFeature } from '@/lib/analytics'

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

interface OptionsPick {
  id: number
  pick_date: string
  underlying: string
  option_type: 'call' | 'put'
  strike: number | null
  expiry: string | null
  entry_premium: number | null
  stop_loss_pct: number
  take_profit_pct: number
  confidence: number
  rationale: string
  catalyst: string
  sector?: string
  underlying_entry_price: number | null
  exit_underlying_price: number | null
  outcome: 'win' | 'loss' | 'pending'
  evaluated_at: string | null
}

interface OptionsStats {
  wins: number
  losses: number
  total: number
  win_rate: number
  call_wins: number
  call_total: number
  put_wins: number
  put_total: number
  streak_type: 'win' | 'loss' | null
  streak_count: number
  recent: Array<{ outcome: string; option_type: string }>
  by_date: Array<{ date: string; wins: number; losses: number; total: number; win_rate: number; call_wins: number; call_total: number; put_wins: number; put_total: number }>
}

interface APIResponse {
  picks: Pick[]
  stats: Stats
  market_context: string
  generated_at: string
  is_cached: boolean
}

interface OptionsAPIResponse {
  picks: OptionsPick[]
  stats: OptionsStats | null
  is_cached: boolean
  generated_at: string
  daily_date: string | null
  weekly_date: string | null
}

function getPickDuration(pick: OptionsPick): 'daily' | 'weekly' {
  if (!pick.expiry || !pick.pick_date) return 'weekly'
  const days = Math.round(
    (new Date(pick.expiry + 'T12:00:00').getTime() - new Date(pick.pick_date + 'T12:00:00').getTime()) / 86400000
  )
  return days <= 10 ? 'daily' : 'weekly'
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
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

      <ConfidenceDots value={pick.confidence} color={accentColor} />

      <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.45, fontStyle: 'italic', flex: 1 }}>
        &quot;{pick.rationale}&quot;
      </div>

      {pick.catalyst && (
        <div style={{ fontSize: '9px', color: '#6b7280', lineHeight: 1.4 }}>
          ⚡ {pick.catalyst}
        </div>
      )}

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

function OptionsPickCard({ pick }: { pick: OptionsPick }) {
  const duration = getPickDuration(pick)
  const isCall = pick.option_type === 'call'
  const isWin = pick.outcome === 'win'
  const isLoss = pick.outcome === 'loss'
  const isPending = pick.outcome === 'pending'

  const accentColor = isCall ? '#2563eb' : '#9333ea'
  const accentBg = isCall ? '#dbeafe' : '#f3e8ff'
  const accentBorder = isCall ? '#bfdbfe' : '#e9d5ff'

  const outcomeColor = isWin ? '#16a34a' : isLoss ? '#dc2626' : '#555'
  const outcomeBg = isWin ? '#dcfce7' : isLoss ? '#fee2e2' : '#f4f4f5'

  const expiryLabel = pick.expiry
    ? new Date(pick.expiry + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  const stopPrice = pick.entry_premium && pick.stop_loss_pct
    ? (pick.entry_premium * (1 - pick.stop_loss_pct / 100)).toFixed(2)
    : null
  const targetPrice = pick.entry_premium && pick.take_profit_pct
    ? (pick.entry_premium * (1 + pick.take_profit_pct / 100)).toFixed(2)
    : null

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
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <div style={{
            fontSize: '9px', fontWeight: 800, letterSpacing: '0.08em',
            color: accentColor, background: accentBg,
            borderRadius: '4px', padding: '2px 6px',
          }}>
            {isCall ? '▲ CALL' : '▼ PUT'}
          </div>
          <div style={{
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em',
            color: duration === 'daily' ? '#0369a1' : '#7c3aed',
            background: duration === 'daily' ? '#e0f2fe' : '#ede9fe',
            borderRadius: '4px', padding: '2px 5px',
          }}>
            {duration === 'daily' ? 'DAILY' : 'WEEKLY'}
          </div>
        </div>
        {!isPending && (
          <div style={{
            fontSize: '9px', fontWeight: 700,
            color: outcomeColor, background: outcomeBg,
            borderRadius: '4px', padding: '2px 6px',
          }}>
            {isWin ? '✓ WIN' : '✗ LOSS'}
          </div>
        )}
        {isPending && (
          <div style={{ fontSize: '9px', color: '#9ca3af', background: '#f4f4f5', borderRadius: '4px', padding: '2px 6px' }}>
            OPEN
          </div>
        )}
      </div>

      {/* Underlying + strike */}
      <div>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', letterSpacing: '0.02em', lineHeight: 1 }}>
          {pick.underlying}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
          {pick.strike != null && (
            <span style={{ fontSize: '11px', fontWeight: 700, color: accentColor }}>${pick.strike} {isCall ? 'C' : 'P'}</span>
          )}
          {expiryLabel && (
            <span style={{ fontSize: '10px', color: '#6b7280' }}>exp {expiryLabel}</span>
          )}
        </div>
      </div>

      {/* Confidence */}
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

      {/* Trade levels */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: '4px', marginTop: '4px',
        background: '#f9fafb', borderRadius: '6px', padding: '6px 8px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '8px', color: '#9ca3af', letterSpacing: '0.05em', marginBottom: '2px' }}>ENTRY</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
            {pick.entry_premium != null ? `$${pick.entry_premium.toFixed(2)}` : '—'}
          </div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '8px', color: '#9ca3af', letterSpacing: '0.05em', marginBottom: '2px' }}>STOP</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
            {stopPrice ? `$${stopPrice}` : '—'}
          </div>
          <div style={{ fontSize: '8px', color: '#dc2626' }}>-{pick.stop_loss_pct}%</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '8px', color: '#9ca3af', letterSpacing: '0.05em', marginBottom: '2px' }}>TARGET</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
            {targetPrice ? `$${targetPrice}` : '—'}
          </div>
          <div style={{ fontSize: '8px', color: '#16a34a' }}>+{pick.take_profit_pct}%</div>
        </div>
      </div>

      {/* Underlying price */}
      {pick.underlying_entry_price != null && (
        <div style={{ fontSize: '9px', color: '#9ca3af', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {pick.underlying} @ ${pick.underlying_entry_price.toFixed(2)}
        </div>
      )}
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
        <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px' }}>
          <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>RECORD</div>
          <div style={{ fontSize: '18px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            <span style={{ color: '#16a34a' }}>{wins}W</span>
            <span style={{ color: '#d1d5db', fontSize: '14px', margin: '0 4px' }}>–</span>
            <span style={{ color: '#dc2626' }}>{losses}L</span>
          </div>
          <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '3px' }}>{total} evaluated</div>
        </div>
        <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px', minWidth: '100px' }}>
          <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>WIN RATE</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: win_rate >= 55 ? '#16a34a' : win_rate >= 45 ? '#fbbf24' : '#dc2626', lineHeight: 1 }}>
            {win_rate.toFixed(1)}%
          </div>
          <div style={{ marginTop: '5px', background: '#f0f0f0', borderRadius: '3px', height: '4px', width: '80px' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: win_rate >= 55 ? '#16a34a' : win_rate >= 45 ? '#fbbf24' : '#dc2626', width: `${Math.min(win_rate, 100)}%`, transition: 'width 0.5s' }} />
          </div>
        </div>
        <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px' }}>
          <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>AVG RETURN</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', lineHeight: 1.4 }}>+{avg_win.toFixed(2)}% win</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', lineHeight: 1.4 }}>-{avg_loss.toFixed(2)}% loss</div>
        </div>
        {streak_type && streak_count > 0 && (
          <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px' }}>
            <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>STREAK</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: streak_type === 'win' ? '#16a34a' : '#dc2626', lineHeight: 1 }}>
              {streak_type === 'win' ? '🔥' : '❄️'} {streak_count}{streak_type === 'win' ? 'W' : 'L'}
            </div>
          </div>
        )}
        {best && (
          <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px' }}>
            <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>BEST CALL</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{best.symbol}</div>
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>+{best.return_pct?.toFixed(2)}%</div>
          </div>
        )}
        <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px' }}>
          <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>BY TYPE</div>
          <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.6 }}>
            Stocks: <span style={{ color: '#16a34a', fontWeight: 600 }}>{stockTotal > 0 ? ((stock_wins / stockTotal) * 100).toFixed(0) : '—'}%</span>
          </div>
          <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.6 }}>
            Crypto: <span style={{ color: '#d97706', fontWeight: 600 }}>{cryptoTotal > 0 ? ((crypto_wins / cryptoTotal) * 100).toFixed(0) : '—'}%</span>
          </div>
        </div>
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

function OptionsStatBar({ stats, loading }: { stats: OptionsStats | null; loading: boolean }) {
  if (loading || !stats) {
    return (
      <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
          {loading ? 'Generating options trades...' : 'Building options track record'}
        </div>
      </div>
    )
  }

  const { wins, losses, total, win_rate, call_wins, call_total, put_wins, put_total, streak_type, streak_count, recent } = stats

  if (total === 0) {
    return (
      <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
          OPTIONS TRACK RECORD BUILDING — evaluated at expiry
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', gap: '0', alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px' }}>
          <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>RECORD</div>
          <div style={{ fontSize: '18px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            <span style={{ color: '#16a34a' }}>{wins}W</span>
            <span style={{ color: '#d1d5db', fontSize: '14px', margin: '0 4px' }}>–</span>
            <span style={{ color: '#dc2626' }}>{losses}L</span>
          </div>
          <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '3px' }}>{total} evaluated</div>
        </div>
        <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px', minWidth: '100px' }}>
          <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>WIN RATE</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: win_rate >= 55 ? '#16a34a' : win_rate >= 45 ? '#fbbf24' : '#dc2626', lineHeight: 1 }}>
            {win_rate.toFixed(1)}%
          </div>
          <div style={{ marginTop: '5px', background: '#f0f0f0', borderRadius: '3px', height: '4px', width: '80px' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: win_rate >= 55 ? '#16a34a' : win_rate >= 45 ? '#fbbf24' : '#dc2626', width: `${Math.min(win_rate, 100)}%` }} />
          </div>
        </div>
        <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px' }}>
          <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>BY TYPE</div>
          <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.6 }}>
            Calls: <span style={{ color: '#2563eb', fontWeight: 600 }}>{call_total > 0 ? ((call_wins / call_total) * 100).toFixed(0) : '—'}%</span>
          </div>
          <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.6 }}>
            Puts: <span style={{ color: '#9333ea', fontWeight: 600 }}>{put_total > 0 ? ((put_wins / put_total) * 100).toFixed(0) : '—'}%</span>
          </div>
        </div>
        {streak_type && streak_count > 0 && (
          <div style={{ paddingRight: '16px', borderRight: '1px solid #e4e4e7', marginRight: '16px' }}>
            <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>STREAK</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: streak_type === 'win' ? '#16a34a' : '#dc2626', lineHeight: 1 }}>
              {streak_type === 'win' ? '🔥' : '❄️'} {streak_count}{streak_type === 'win' ? 'W' : 'L'}
            </div>
          </div>
        )}
        {recent.length > 0 && (
          <div style={{ flex: 1, minWidth: '80px' }}>
            <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '6px' }}>LAST {recent.length}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
              {recent.map((r, i) => (
                <div
                  key={i}
                  title={r.option_type}
                  style={{
                    width: '10px', height: '10px', borderRadius: '2px',
                    background: r.outcome === 'win' ? '#16a34a' : r.outcome === 'loss' ? '#dc2626' : r.option_type === 'call' ? '#bfdbfe' : '#e9d5ff',
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

function OptionsStatsModal({ stats, onClose }: { stats: OptionsStats; onClose: () => void }) {
  const callWinPct = stats.call_total > 0 ? (stats.call_wins / stats.call_total) * 100 : null
  const putWinPct = stats.put_total > 0 ? (stats.put_wins / stats.put_total) * 100 : null

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '12px', padding: '28px', maxWidth: '560px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>⚡ Options AI Performance</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{stats.total} trades evaluated at expiry (ITM/OTM)</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '20px', color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {stats.total === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '13px' }}>
            No evaluated trades yet — check back after first expiry
          </div>
        ) : (
          <>
            {/* Top stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {/* Win Rate */}
              <div style={{ background: '#f9fafb', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '6px' }}>WIN RATE</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: stats.win_rate >= 55 ? '#16a34a' : stats.win_rate >= 45 ? '#d97706' : '#dc2626', lineHeight: 1 }}>
                  {stats.win_rate.toFixed(1)}%
                </div>
                <div style={{ marginTop: '8px', background: '#e4e4e7', borderRadius: '3px', height: '5px' }}>
                  <div style={{ height: '100%', borderRadius: '3px', background: stats.win_rate >= 55 ? '#16a34a' : stats.win_rate >= 45 ? '#d97706' : '#dc2626', width: `${Math.min(stats.win_rate, 100)}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
              {/* Record */}
              <div style={{ background: '#f9fafb', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '6px' }}>RECORD</div>
                <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>
                  <span style={{ color: '#16a34a' }}>{stats.wins}W</span>
                  <span style={{ color: '#d1d5db', margin: '0 4px', fontSize: '16px' }}>–</span>
                  <span style={{ color: '#dc2626' }}>{stats.losses}L</span>
                </div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '5px' }}>{stats.total} total</div>
              </div>
              {/* Streak */}
              <div style={{ background: '#f9fafb', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '6px' }}>STREAK</div>
                {stats.streak_type && stats.streak_count > 0 ? (
                  <>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: stats.streak_type === 'win' ? '#16a34a' : '#dc2626', lineHeight: 1 }}>
                      {stats.streak_type === 'win' ? '🔥' : '❄️'} {stats.streak_count}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '5px' }}>{stats.streak_type === 'win' ? 'win' : 'loss'} streak</div>
                  </>
                ) : (
                  <div style={{ fontSize: '13px', color: '#d1d5db', marginTop: '8px' }}>—</div>
                )}
              </div>
            </div>

            {/* Calls vs Puts */}
            <div style={{ background: '#f9fafb', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '14px', marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '12px' }}>BY OPTION TYPE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Calls */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb' }}>▲ CALLS</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>{callWinPct != null ? `${callWinPct.toFixed(1)}%` : '—'}</span>
                  </div>
                  <div style={{ background: '#e4e4e7', borderRadius: '3px', height: '6px' }}>
                    <div style={{ height: '100%', borderRadius: '3px', background: '#2563eb', width: `${callWinPct ?? 0}%` }} />
                  </div>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '3px' }}>{stats.call_wins}W – {stats.call_total - stats.call_wins}L of {stats.call_total}</div>
                </div>
                {/* Puts */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#9333ea' }}>▼ PUTS</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>{putWinPct != null ? `${putWinPct.toFixed(1)}%` : '—'}</span>
                  </div>
                  <div style={{ background: '#e4e4e7', borderRadius: '3px', height: '6px' }}>
                    <div style={{ height: '100%', borderRadius: '3px', background: '#9333ea', width: `${putWinPct ?? 0}%` }} />
                  </div>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '3px' }}>{stats.put_wins}W – {stats.put_total - stats.put_wins}L of {stats.put_total}</div>
                </div>
              </div>
            </div>

            {/* Recent performance dots */}
            {stats.recent.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '8px' }}>LAST {stats.recent.length} TRADES</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {stats.recent.map((r, i) => (
                    <div
                      key={i}
                      title={`${r.option_type} — ${r.outcome}`}
                      style={{ width: '14px', height: '14px', borderRadius: '3px', background: r.outcome === 'win' ? '#16a34a' : r.outcome === 'loss' ? '#dc2626' : r.option_type === 'call' ? '#bfdbfe' : '#e9d5ff' }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: '10px', color: '#d1d5db', marginTop: '5px' }}>Green = win · Red = loss · Blue = call pending · Purple = put pending</div>
              </div>
            )}

            {/* By date table */}
            {stats.by_date.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '8px' }}>ROLLING HISTORY BY DATE</div>
                <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e4e4e7' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: '10px', letterSpacing: '0.05em' }}>DATE</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', color: '#16a34a', fontWeight: 600, fontSize: '10px', letterSpacing: '0.05em' }}>W</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', color: '#dc2626', fontWeight: 600, fontSize: '10px', letterSpacing: '0.05em' }}>L</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', color: '#6b7280', fontWeight: 600, fontSize: '10px', letterSpacing: '0.05em' }}>WIN%</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', color: '#2563eb', fontWeight: 600, fontSize: '10px', letterSpacing: '0.05em' }}>CALLS</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', color: '#9333ea', fontWeight: 600, fontSize: '10px', letterSpacing: '0.05em' }}>PUTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.by_date.map((d, i) => {
                        const dateLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                        const callPct = d.call_total > 0 ? ((d.call_wins / d.call_total) * 100).toFixed(0) + '%' : '—'
                        const putPct = d.put_total > 0 ? ((d.put_wins / d.put_total) * 100).toFixed(0) + '%' : '—'
                        return (
                          <tr key={d.date} style={{ borderBottom: i < stats.by_date.length - 1 ? '1px solid #f0f0f0' : 'none', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                            <td style={{ padding: '9px 12px', color: '#374151', fontWeight: 600 }}>{dateLabel}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{d.wins}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>{d.losses}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                              <span style={{ fontWeight: 700, color: d.win_rate >= 55 ? '#16a34a' : d.win_rate >= 45 ? '#d97706' : '#dc2626' }}>
                                {d.win_rate.toFixed(0)}%
                              </span>
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'center', color: '#2563eb', fontSize: '11px' }}>{callPct}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'center', color: '#9333ea', fontSize: '11px' }}>{putPct}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function AIPicksPage() {
  const router = useRouter()
  const [data, setData] = useState<APIResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [optionsData, setOptionsData] = useState<OptionsAPIResponse | null>(null)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [tab, setTab] = useState<'stocks' | 'crypto' | 'options'>('stocks')
  const [error, setError] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [showOptionsStats, setShowOptionsStats] = useState(false)

  useEffect(() => { trackPageView('/ai-picks') }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-picks')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setData(d)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load picks')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true)
    setOptionsError(null)
    try {
      const res = await fetch('/api/ai-picks/options')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setOptionsData(d)
    } catch (e: unknown) {
      setOptionsError(e instanceof Error ? e.message : 'Failed to load options')
    } finally {
      setOptionsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (tab === 'options' && !optionsData && !optionsLoading) {
      loadOptions()
    }
  }, [tab, optionsData, optionsLoading, loadOptions])

  const stocks = data?.picks.filter(p => p.type === 'stock') ?? []
  const cryptos = data?.picks.filter(p => p.type === 'crypto') ?? []

  const pickDate = data?.picks[0]?.pick_date
    ? new Date(data.picks[0].pick_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextPickDate = tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', color: '#111827', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>
      {showOptionsStats && optionsData?.stats && optionsData.stats.by_date && (
        <OptionsStatsModal stats={optionsData.stats} onClose={() => setShowOptionsStats(false)} />
      )}
      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #e4e4e7', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '16px', background: '#ffffff', flexShrink: 0 }}>
        <button
          onClick={() => router.push("/app")}
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
          <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '6px' }}>
            {tab === 'options' ? 'OPTIONS TRACK RECORD' : 'AI TRACK RECORD'}
          </div>
          {tab === 'options'
            ? <OptionsStatBar stats={optionsData?.stats ?? null} loading={optionsLoading} />
            : <StatBar stats={data?.stats ?? null} loading={loading} />
          }
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexShrink: 0, alignItems: 'center' }}>
          {([
            { key: 'stocks', label: '📈 Stocks', activeColor: '#15803d', activeBg: '#dcfce7', count: stocks.length },
            { key: 'crypto', label: '₿ Crypto', activeColor: '#d97706', activeBg: '#fef3c7', count: cryptos.length },
            { key: 'options', label: '⚡ Options', activeColor: '#2563eb', activeBg: '#dbeafe', count: optionsData?.picks.length ?? 0 },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); trackFeature(`${t.key}_tab`) }}
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
          {tab === 'options' && optionsData?.stats && (optionsData.stats.total ?? 0) > 0 && (
            <button
              onClick={() => setShowOptionsStats(true)}
              style={{
                marginLeft: 'auto', padding: '7px 14px', borderRadius: '7px',
                border: '1px solid #bfdbfe', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '12px', fontWeight: 700,
                background: '#eff6ff', color: '#2563eb',
              }}
            >
              📊 AI Stats
            </button>
          )}
        </div>

        {/* Picks grid */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'options' ? (
            optionsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px' }}>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>⚡ Analyzing market conditions and generating options trades...</div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>This may take 15–20 seconds on first load</div>
              </div>
            ) : optionsError ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#dc2626', fontSize: '13px' }}>{optionsError}</div>
            ) : !optionsData?.picks.length ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '13px' }}>
                No options trades available — check back Monday
              </div>
            ) : (() => {
              const dailyPicks = optionsData.picks.filter(p => getPickDuration(p) === 'daily')
              const weeklyPicks = optionsData.picks.filter(p => getPickDuration(p) === 'weekly')
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {dailyPicks.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', borderRadius: '5px', padding: '3px 8px', letterSpacing: '0.06em' }}>DAILY</span>
                        {optionsData.daily_date && (
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>{fmtDate(optionsData.daily_date)}</span>
                        )}
                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>· expires this Friday</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                        {dailyPicks.map(pick => <OptionsPickCard key={pick.id} pick={pick} />)}
                      </div>
                    </div>
                  )}
                  {weeklyPicks.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', background: '#ede9fe', borderRadius: '5px', padding: '3px 8px', letterSpacing: '0.06em' }}>WEEKLY</span>
                        {optionsData.weekly_date && (
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>issued {fmtDate(optionsData.weekly_date)}</span>
                        )}
                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>· expires ~3 weeks out</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                        {weeklyPicks.map(pick => <OptionsPickCard key={pick.id} pick={pick} />)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()
          ) : (
            loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px' }}>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>🤖 Analyzing market data and generating picks...</div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>This may take 15–20 seconds on first load</div>
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#dc2626', fontSize: '13px' }}>{error}</div>
            ) : (tab === 'stocks' ? stocks : cryptos).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '13px' }}>
                No picks available — check back tomorrow
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))', gap: '8px' }}>
                {(tab === 'stocks' ? stocks : cryptos).map(pick => (
                  <PickCard key={pick.id} pick={pick} />
                ))}
              </div>
            )
          )}
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center', marginTop: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
          {tab === 'options' ? (
            <div style={{ fontSize: '9px', color: '#9ca3af' }}>
              ⚡ Options evaluated ITM/OTM at expiry · Entry/Stop/Target based on premium · Not financial advice
            </div>
          ) : (
            <>
              <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.03em' }}>
                📌 <span style={{ color: '#9ca3af' }}>WIN/LOSS</span> — bullish pick wins if price rises from entry after 24h; bearish wins if price falls
              </div>
              <div style={{ fontSize: '9px', color: '#9ca3af' }}>·</div>
              <div style={{ fontSize: '9px', color: '#9ca3af' }}>Stocks M–F only · Crypto daily · Not financial advice</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
