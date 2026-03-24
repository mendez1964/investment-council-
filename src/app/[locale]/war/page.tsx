'use client'

import { useEffect, useState } from 'react'

// ── AI branding ────────────────────────────────────────────────────────────────

const AI_CONFIG: Record<string, { color: string; icon: string; label: string; bg: string }> = {
  claude:  { color: '#d97706', icon: '⚡', label: 'Claude',  bg: 'rgba(217,119,6,0.08)'  },
  chatgpt: { color: '#16a34a', icon: '🟢', label: 'ChatGPT', bg: 'rgba(22,163,74,0.08)'  },
  gemini:  { color: '#2563eb', icon: '✦',  label: 'Gemini',  bg: 'rgba(37,99,235,0.08)'  },
  grok:    { color: '#7c3aed', icon: '✕',  label: 'Grok',    bg: 'rgba(124,58,237,0.08)' },
}

const GOLD = '#C9A34E'
const DARK_BG = '#0F2A44'

// ── Types ──────────────────────────────────────────────────────────────────────

interface BattlePick {
  id: number
  pick_date: string
  ai_name: string
  category: string
  symbol: string
  bias: string
  entry_price: number | null
  target_price: number | null
  stop_price: number | null
  confidence: number | null
  rationale: string | null
  catalyst: string | null
  outcome: 'win' | 'loss' | 'pending'
  target_hit: boolean | null
  exit_price: number | null
  return_pct: number | null
}

interface LeaderboardEntry {
  ai_name: string
  wins: number
  losses: number
  total: number
  win_rate: number
  current_streak: number
  streak_type: 'W' | 'L'
  best_category: string
  target_hit_rate: number
}

interface DayResult {
  date: string
  ai_stats: { ai_name: string; wins: number; losses: number }[]
  winner: string | null
}

interface WarData {
  today: string
  picks_today: BattlePick[]
  yesterday_winner: string | null
  yesterday_wins: number
  yesterday_total: number
  leaderboard: LeaderboardEntry[]
  recent_days: DayResult[]
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ w, h, style }: { w?: string | number; h?: string | number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: w ?? '100%',
      height: h ?? 18,
      borderRadius: 6,
      background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style,
    }} />
  )
}

// ── Confidence dots ────────────────────────────────────────────────────────────

function ConfidenceDots({ value, color }: { value: number | null; color: string }) {
  if (value == null) return null
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i < value ? color : '#e5e7eb',
        }} />
      ))}
      <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>{value}/10</span>
    </div>
  )
}

// ── Bias badge ────────────────────────────────────────────────────────────────

function BiasBadge({ bias }: { bias: string }) {
  const b = bias.toLowerCase()
  const isBull = b === 'bullish' || b === 'call'
  const isBear = b === 'bearish' || b === 'put'
  const arrow = b === 'call' ? '▲ CALL' : b === 'put' ? '▼ PUT' : isBull ? '▲ BULLISH' : '▼ BEARISH'
  const color = isBull ? '#16a34a' : '#dc2626'
  const bg = isBull ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)'
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
      color, background: bg, borderRadius: 4, padding: '2px 7px',
      border: `1px solid ${color}30`,
    }}>
      {arrow}
    </span>
  )
}

// ── Outcome badge ─────────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome: string }) {
  if (outcome === 'pending') return null
  const win = outcome === 'win'
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
      color: win ? '#16a34a' : '#dc2626',
      background: win ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
      border: `1px solid ${win ? '#16a34a' : '#dc2626'}40`,
      borderRadius: 4, padding: '2px 8px',
    }}>
      {win ? '✓ WIN' : '✗ LOSS'}
    </span>
  )
}

// ── Pick card ─────────────────────────────────────────────────────────────────

function PickCard({ pick, color }: { pick: BattlePick; color: string }) {
  const catLabel = { stock: 'STOCK', crypto: 'CRYPTO', option: 'OPTION' }[pick.category] ?? pick.category.toUpperCase()
  const catColor = { stock: '#6366f1', crypto: '#f59e0b', option: '#ec4899' }[pick.category] ?? '#6b7280'

  const targetPct = pick.entry_price && pick.target_price
    ? (((pick.target_price - pick.entry_price) / pick.entry_price) * 100).toFixed(1)
    : null
  const stopPct = pick.entry_price && pick.stop_price
    ? (((pick.entry_price - pick.stop_price) / pick.entry_price) * 100).toFixed(1)
    : null

  // Parse CAS score from Grok rationale [CAS:84] or IC score [IC:84]
  const scoreMatch = pick.rationale?.match(/^\[(CAS|IC):(\d+)\]/)
  const scoreLabel = scoreMatch?.[1] ?? null
  const scoreValue = scoreMatch ? parseInt(scoreMatch[2]) : null
  const rationaleText = scoreMatch ? pick.rationale.replace(/^\[(CAS|IC):\d+\]\s*/, '') : pick.rationale
  const scoreColor = scoreValue == null ? '#9ca3af' : scoreValue >= 85 ? '#16a34a' : scoreValue >= 78 ? '#d97706' : '#6b7280'

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${color}25`,
      borderLeft: `3px solid ${catColor}`,
      borderRadius: 10,
      padding: '14px 16px',
      marginBottom: 10,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: catColor,
            background: `${catColor}14`, borderRadius: 3, padding: '1px 6px',
          }}>
            {catLabel}
          </span>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>
            {pick.symbol}
          </span>
          <BiasBadge bias={pick.bias} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {scoreValue != null && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
              color: scoreColor, background: scoreValue >= 85 ? '#dcfce7' : scoreValue >= 78 ? '#fef3c7' : '#f4f4f5',
              borderRadius: 4, padding: '2px 6px',
            }}>
              {scoreLabel} {scoreValue}
            </span>
          )}
          <OutcomeBadge outcome={pick.outcome} />
        </div>
      </div>

      {/* Confidence */}
      <div style={{ marginBottom: 8 }}>
        <ConfidenceDots value={pick.confidence} color={color} />
      </div>

      {/* Rationale */}
      {rationaleText && (
        <p style={{ fontSize: 12, color: '#4b5563', fontStyle: 'italic', margin: '0 0 6px', lineHeight: 1.5 }}>
          "{rationaleText}"
        </p>
      )}

      {/* Catalyst */}
      {pick.catalyst && (
        <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 8px' }}>
          <span style={{ fontWeight: 600, color: '#374151' }}>Catalyst:</span> {pick.catalyst}
        </p>
      )}

      {/* Price levels */}
      {(pick.entry_price || targetPct || stopPct) && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
          {pick.entry_price && (
            <span style={{ fontSize: 11, color: '#374151' }}>
              Entry: <strong>${pick.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </span>
          )}
          {targetPct && (
            <span style={{ fontSize: 11, color: '#16a34a' }}>
              Target: <strong>↑{targetPct}%</strong>
            </span>
          )}
          {stopPct && (
            <span style={{ fontSize: 11, color: '#dc2626' }}>
              Stop: <strong>↓{stopPct}%</strong>
            </span>
          )}
          {pick.outcome !== 'pending' && pick.return_pct != null && (
            <span style={{ fontSize: 11, color: pick.return_pct >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
              Return: {pick.return_pct >= 0 ? '+' : ''}{pick.return_pct.toFixed(2)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── AI Column ─────────────────────────────────────────────────────────────────

function AIColumn({ aiName, picks, loading }: { aiName: string; picks: BattlePick[]; loading: boolean }) {
  const cfg = AI_CONFIG[aiName]

  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: cfg.bg,
      border: `1px solid ${cfg.color}25`,
      borderRadius: 14,
      padding: 20,
    }}>
      {/* AI Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
        paddingBottom: 14, borderBottom: `2px solid ${cfg.color}30`,
      }}>
        <span style={{ fontSize: 24 }}>{cfg.icon}</span>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: cfg.color, letterSpacing: '-0.01em' }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
            {aiName === 'claude' ? 'Anthropic' : aiName === 'chatgpt' ? 'OpenAI' : aiName === 'gemini' ? 'Google DeepMind' : 'xAI'}
          </div>
        </div>
      </div>

      {/* Picks */}
      {loading ? (
        <>
          <Skeleton h={90} style={{ marginBottom: 10, borderRadius: 10 }} />
          <Skeleton h={90} style={{ marginBottom: 10, borderRadius: 10 }} />
          <Skeleton h={90} style={{ borderRadius: 10 }} />
        </>
      ) : picks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: '#9ca3af', fontSize: 13 }}>
          No picks yet today.<br />Generating at 7:30 AM ET.
        </div>
      ) : (
        ['stock', 'crypto', 'option'].map(cat => {
          const pick = picks.find(p => p.category === cat)
          return pick ? <PickCard key={cat} pick={pick} color={cfg.color} /> : null
        })
      )}
    </div>
  )
}

// ── Leaderboard card ──────────────────────────────────────────────────────────

function LeaderboardCard({ entry }: { entry: LeaderboardEntry }) {
  const cfg = AI_CONFIG[entry.ai_name]
  const streak = entry.current_streak > 0
    ? `${entry.streak_type === 'W' ? '🔥' : '❄️'} ${entry.current_streak}${entry.streak_type}`
    : '—'

  return (
    <div style={{
      flex: 1, minWidth: 240,
      background: '#fff',
      border: `1px solid ${cfg.color}30`,
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      {/* Color bar */}
      <div style={{ height: 4, background: cfg.color }} />

      <div style={{ padding: '20px 22px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 22 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: cfg.color }}>{cfg.label}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>All-time record</div>
          </div>
        </div>

        {/* W-L big numbers */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>{entry.wins}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Wins</div>
          </div>
          <div style={{ fontSize: 30, color: '#e5e7eb', alignSelf: 'center' }}>—</div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>{entry.losses}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Losses</div>
          </div>
        </div>

        {/* Win rate bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#6b7280' }}>Win Rate</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{entry.win_rate}%</span>
          </div>
          <div style={{ height: 8, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${entry.win_rate}%`, height: '100%', background: cfg.color, borderRadius: 99, transition: 'width 0.6s ease' }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <div style={{
            background: '#f9fafb', borderRadius: 8, padding: '6px 12px',
            fontSize: 12, color: '#374151',
          }}>
            <span style={{ color: '#9ca3af', marginRight: 4 }}>Streak:</span>
            <strong>{streak}</strong>
          </div>
          <div style={{
            background: '#f9fafb', borderRadius: 8, padding: '6px 12px',
            fontSize: 12, color: '#374151',
          }}>
            <span style={{ color: '#9ca3af', marginRight: 4 }}>Best at:</span>
            <strong style={{ textTransform: 'uppercase' }}>{entry.best_category}</strong>
          </div>
          <div style={{
            background: '#f9fafb', borderRadius: 8, padding: '6px 12px',
            fontSize: 12, color: '#374151',
          }}>
            <span style={{ color: '#9ca3af', marginRight: 4 }}>Target hit:</span>
            <strong>{entry.target_hit_rate}%</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Last 7 days table ─────────────────────────────────────────────────────────

function RecentDaysTable({ days }: { days: DayResult[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em' }}>DATE</th>
            {(['claude', 'chatgpt', 'gemini', 'grok'] as const).map(ai => (
              <th key={ai} style={{ padding: '12px 16px', textAlign: 'center', color: AI_CONFIG[ai].color, fontWeight: 700, fontSize: 12 }}>
                {AI_CONFIG[ai].icon} {AI_CONFIG[ai].label}
              </th>
            ))}
            <th style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em' }}>🏆 WINNER</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day, i) => {
            const d = new Date(day.date + 'T12:00:00')
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            const isToday = i === days.length - 1
            return (
              <tr key={day.date} style={{ borderBottom: '1px solid #f3f4f6', background: isToday ? '#fffbeb' : 'transparent' }}>
                <td style={{ padding: '11px 16px', color: '#374151', fontWeight: isToday ? 700 : 400 }}>
                  {label}{isToday && <span style={{ fontSize: 10, color: GOLD, marginLeft: 6, fontWeight: 700 }}>TODAY</span>}
                </td>
                {(['claude', 'chatgpt', 'gemini', 'grok'] as const).map(ai => {
                  const stat = day.ai_stats.find(s => s.ai_name === ai)
                  const total = (stat?.wins ?? 0) + (stat?.losses ?? 0)
                  return (
                    <td key={ai} style={{ padding: '11px 16px', textAlign: 'center' }}>
                      {total === 0 ? (
                        <span style={{ color: '#d1d5db' }}>—</span>
                      ) : (
                        <span style={{ color: (stat?.wins ?? 0) > (stat?.losses ?? 0) ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                          {stat?.wins ?? 0}W-{stat?.losses ?? 0}L
                        </span>
                      )}
                    </td>
                  )
                })}
                <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                  {day.winner ? (
                    <span style={{ color: AI_CONFIG[day.winner].color, fontWeight: 700 }}>
                      {AI_CONFIG[day.winner].icon} {AI_CONFIG[day.winner].label}
                    </span>
                  ) : (
                    <span style={{ color: '#d1d5db' }}>—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function WarPage() {
  const [data, setData] = useState<WarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/war')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load battle data.'); setLoading(false) })
  }, [])

  const picksByAI = (aiName: string): BattlePick[] =>
    (data?.picks_today ?? []).filter(p => p.ai_name === aiName)

  const hasYesterdayWinner = !loading && !!data?.yesterday_winner

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
        @media (max-width: 768px) {
          .battle-grid { flex-direction: column !important; }
          .leaderboard-grid { flex-direction: column !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: DARK_BG, padding: '48px 24px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ fontSize: 13, color: GOLD, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 12 }}>
            ⚔️ WAR OF THE AIs
          </div>
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, color: '#fff',
            margin: '0 0 12px', lineHeight: 1.1, letterSpacing: '-0.03em',
          }}>
            Claude vs ChatGPT vs Gemini vs Grok
          </h1>
          <p style={{ fontSize: 17, color: '#94a3b8', margin: '0 0 20px' }}>
            Daily picks. Live scores. One winner.
          </p>
          <a
            href="/app"
            style={{
              display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              color: GOLD, border: `1px solid ${GOLD}50`, borderRadius: 20,
              padding: '5px 16px', textDecoration: 'none', opacity: 0.9,
            }}
          >
            POWERED BY INVESTMENT COUNCIL
          </a>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px 60px' }}>

        {/* Error state */}
        {error && (
          <div style={{ textAlign: 'center', padding: 40, color: '#dc2626', fontSize: 14 }}>{error}</div>
        )}

        {/* ── Today's Battle ── */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: 0 }}>Today's Battle</h2>
            {data?.today && (
              <span style={{ fontSize: 13, color: '#9ca3af' }}>
                {new Date(data.today + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>

          <div className="battle-grid" style={{ display: 'flex', gap: 16 }}>
            {(['claude', 'chatgpt', 'gemini', 'grok'] as const).map(ai => (
              <AIColumn
                key={ai}
                aiName={ai}
                picks={picksByAI(ai)}
                loading={loading}
              />
            ))}
          </div>
        </section>

        {/* ── Yesterday's Winner banner ── */}
        <section style={{ marginBottom: 48 }}>
          <div style={{
            background: hasYesterdayWinner ? `linear-gradient(135deg, ${GOLD}18, ${GOLD}08)` : '#f9fafb',
            border: `1px solid ${hasYesterdayWinner ? GOLD + '40' : '#e5e7eb'}`,
            borderRadius: 14,
            padding: '22px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
          }}>
            <span style={{ fontSize: 32 }}>🏆</span>
            <div>
              {loading ? (
                <>
                  <Skeleton w={180} h={16} style={{ marginBottom: 6 }} />
                  <Skeleton w={120} h={12} />
                </>
              ) : hasYesterdayWinner ? (
                <>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#111' }}>
                    Yesterday's Winner:&nbsp;
                    <span style={{ color: AI_CONFIG[data!.yesterday_winner!].color }}>
                      {AI_CONFIG[data!.yesterday_winner!].icon} {AI_CONFIG[data!.yesterday_winner!].label}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
                    {data!.yesterday_wins} of {data!.yesterday_total} picks correct
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 15, color: '#9ca3af', fontWeight: 500 }}>
                  No resolved picks from yesterday yet — check back after 7:30 AM ET.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── All-Time Leaderboard ── */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: '0 0 20px' }}>All-Time Leaderboard</h2>
          <div className="leaderboard-grid" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {loading ? (
              ['claude', 'chatgpt', 'gemini', 'grok'].map(ai => (
                <div key={ai} style={{ flex: 1, minWidth: 240 }}>
                  <Skeleton h={220} style={{ borderRadius: 14 }} />
                </div>
              ))
            ) : (
              (data?.leaderboard ?? []).map(entry => (
                <LeaderboardCard key={entry.ai_name} entry={entry} />
              ))
            )}
          </div>
        </section>

        {/* ── Last 7 Days ── */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: '0 0 20px' }}>Last 7 Days</h2>
          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            {loading ? (
              <div style={{ padding: 24 }}>
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} h={40} style={{ marginBottom: 8, borderRadius: 6 }} />)}
              </div>
            ) : (
              <RecentDaysTable days={data?.recent_days ?? []} />
            )}
          </div>
        </section>

        {/* ── Footer note ── */}
        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>
          Picks generated daily at 7:30 AM ET. Outcomes evaluated after 24 hours.
          Each AI uses its own live API — Claude (Anthropic), ChatGPT (OpenAI), Gemini (Google), Grok (xAI).
        </p>
      </div>
    </div>
  )
}
