'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

const ADMIN_EMAIL = 'mendezdag@gmail.com'

const AI_CONFIG: Record<string, { color: string; icon: string; label: string; sub: string; bg: string }> = {
  claude:  { color: '#d97706', icon: '⚡', label: 'Claude',  sub: 'Anthropic',     bg: 'rgba(217,119,6,0.06)'   },
  chatgpt: { color: '#16a34a', icon: '🟢', label: 'ChatGPT', sub: 'OpenAI',        bg: 'rgba(22,163,74,0.06)'   },
  gemini:  { color: '#2563eb', icon: '✦',  label: 'Gemini',  sub: 'Google',        bg: 'rgba(37,99,235,0.06)'   },
  grok:    { color: '#7c3aed', icon: '✕',  label: 'Grok',    sub: 'xAI',           bg: 'rgba(124,58,237,0.06)'  },
}

const GOLD = '#C9A34E'
const DARK_BG = '#0F2A44'
const AIs = ['claude', 'chatgpt', 'gemini', 'grok'] as const
type AIName = typeof AIs[number]
type TabId = 'overview' | AIName | 'stats'

interface BattlePick {
  id: number; pick_date: string; ai_name: string; category: string
  symbol: string; bias: string; entry_price: number | null
  target_price: number | null; stop_price: number | null
  confidence: number | null; rationale: string | null; catalyst: string | null
  outcome: 'win' | 'loss' | 'pending'; target_hit: boolean | null
  exit_price: number | null; return_pct: number | null
}
interface LeaderboardEntry {
  ai_name: string; wins: number; losses: number; total: number
  win_rate: number; current_streak: number; streak_type: 'W' | 'L'
  best_category: string; target_hit_rate: number
}
interface DayResult {
  date: string; ai_stats: { ai_name: string; wins: number; losses: number }[]; winner: string | null
}
interface WarData {
  today: string; picks_today: BattlePick[]; yesterday_winner: string | null
  yesterday_wins: number; yesterday_total: number
  leaderboard: LeaderboardEntry[]; recent_days: DayResult[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseScore(rationale: string | null) {
  const m = rationale?.match(/^\[(CAS|CS|WIN|IC):([\d.]+)\]/)
  if (!m) return { label: null, value: null, displayLabel: null, text: rationale }
  const label = m[1], value = parseFloat(m[2])
  const norm = (label === 'CS' || label === 'WIN') ? value * 10 : value
  const color = norm >= 85 ? '#16a34a' : norm >= 70 ? '#d97706' : '#6b7280'
  const bg = norm >= 85 ? '#dcfce7' : norm >= 70 ? '#fef3c7' : '#f4f4f5'
  const text = (rationale ?? '').replace(/^\[(CAS|CS|WIN|IC):[\d.]+\]\s*/, '')
  // Never show "WIN" as a display label — it looks like an outcome result
  const displayLabel = label === 'WIN' ? 'WIN SCORE' : label
  return { label, displayLabel, value, norm, color, bg, text }
}

function Skeleton({ h, style }: { h?: number; style?: React.CSSProperties }) {
  return <div style={{ width: '100%', height: h ?? 18, borderRadius: 6, background: 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', ...style }} />
}

function BiasBadge({ bias }: { bias: string }) {
  const b = bias.toLowerCase()
  const bull = b === 'bullish' || b === 'call'
  const label = b === 'call' ? '▲ CALL' : b === 'put' ? '▼ PUT' : bull ? '▲ BULLISH' : '▼ BEARISH'
  const c = bull ? '#16a34a' : '#dc2626'
  return <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: c, background: `${c}18`, borderRadius: 4, padding: '2px 7px', border: `1px solid ${c}30` }}>{label}</span>
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  if (outcome === 'pending') return null
  const win = outcome === 'win'
  const c = win ? '#16a34a' : '#dc2626'
  return <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: c, background: `${c}18`, border: `1px solid ${c}40`, borderRadius: 4, padding: '2px 8px' }}>{win ? '✓ WIN' : '✗ LOSS'}</span>
}

function ConfidenceDots({ value, color }: { value: number | null; color: string }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: 10 }, (_, i) => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < value ? color : '#e5e7eb' }} />)}
      <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>{value}/10</span>
    </div>
  )
}

// ── Pick modal ─────────────────────────────────────────────────────────────────

function PickModal({ pick, color, onClose }: { pick: BattlePick; color: string; onClose: () => void }) {
  const score = parseScore(pick.rationale)
  const catColor = { stock: '#6366f1', crypto: '#f59e0b', option: '#ec4899' }[pick.category] ?? '#6b7280'
  const targetPct = pick.entry_price && pick.target_price ? (((pick.target_price - pick.entry_price) / pick.entry_price) * 100).toFixed(1) : null
  const stopPct = pick.entry_price && pick.stop_price ? (((pick.entry_price - pick.stop_price) / pick.entry_price) * 100).toFixed(1) : null

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: catColor, background: `${catColor}14`, borderRadius: 3, padding: '2px 6px' }}>{pick.category.toUpperCase()}</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#111', letterSpacing: '-0.02em' }}>{pick.symbol}</span>
            <BiasBadge bias={pick.bias} />
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>✕</button>
        </div>

        {/* Score + Confidence */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {score.displayLabel && <span style={{ fontSize: 12, fontWeight: 700, color: score.color, background: score.bg, borderRadius: 4, padding: '3px 8px' }}>{score.displayLabel} {score.value}</span>}
          <ConfidenceDots value={pick.confidence} color={color} />
          <OutcomeBadge outcome={pick.outcome} />
        </div>

        {/* Full rationale */}
        {score.text && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 6 }}>ANALYSIS</div>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>"{score.text}"</p>
          </div>
        )}

        {/* Catalyst */}
        {pick.catalyst && (
          <div style={{ marginBottom: 16, background: '#f9fafb', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>CATALYST</div>
            <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>{pick.catalyst}</p>
          </div>
        )}

        {/* Price levels */}
        {(pick.entry_price || targetPct || stopPct) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            {pick.entry_price && <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 3 }}>ENTRY</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>${pick.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>limit order</div>
            </div>}
            {stopPct && pick.stop_price && <div style={{ background: 'rgba(220,38,38,0.06)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#dc2626', marginBottom: 3 }}>STOP LOSS</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>${pick.stop_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div style={{ fontSize: 9, color: '#dc2626', marginTop: 2 }}>-{stopPct}% · exit here</div>
            </div>}
            {targetPct && pick.target_price && <div style={{ background: 'rgba(22,163,74,0.06)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#16a34a', marginBottom: 3 }}>TARGET</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>${pick.target_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div style={{ fontSize: 9, color: '#16a34a', marginTop: 2 }}>+{targetPct}% · take profit</div>
            </div>}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ fontSize: 9, color: '#9ca3af', lineHeight: 1.5, padding: '6px 8px', background: '#fafafa', borderRadius: 4, border: '1px solid #f0f0f0', marginBottom: 10 }}>
          <strong style={{ color: '#6b7280' }}>Educational purposes only.</strong> These are AI-generated picks used to compare how different AI models perform. This is not financial advice and is not intended as a recommendation to trade. Always do your own research and consult a licensed financial advisor before making any investment decisions.
        </div>

        {/* HOW TO TRADE THIS */}
        {pick.entry_price && (
          <div style={{ fontSize: 9, color: '#374151', lineHeight: 1.7, padding: '8px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4, fontSize: '9px', letterSpacing: '0.05em' }}>HOW TO TRADE THIS</div>
            {pick.category === 'stock' && <>
              <div>1. Open <strong>{pick.symbol}</strong> in your broker's stock search</div>
              <div>2. This is a <strong>{pick.bias.toUpperCase()}</strong> trade — {pick.bias === 'bullish' ? 'you are buying, expecting the price to rise' : 'you are shorting or buying a put, expecting the price to fall'}</div>
              <div>3. Place a <strong>limit {pick.bias === 'bullish' ? 'buy' : 'sell short'} at ${pick.entry_price.toFixed(2)}</strong> — never use a market order</div>
              {pick.stop_price && <div>4. Set your <strong>stop loss at ${pick.stop_price.toFixed(2)}</strong> — exit immediately if price hits this level</div>}
              {pick.target_price && <div>5. Set your <strong>take profit at ${pick.target_price.toFixed(2)}</strong> — close the trade when it reaches this level</div>}
            </>}
            {pick.category === 'crypto' && <>
              <div>1. Open <strong>{pick.symbol}</strong> on your crypto exchange (Coinbase, Kraken, etc.)</div>
              <div>2. This is a <strong>{pick.bias.toUpperCase()}</strong> trade — {pick.bias === 'bullish' ? 'buy, expecting price to rise' : 'sell or short, expecting price to fall'}</div>
              <div>3. Place a <strong>limit {pick.bias === 'bullish' ? 'buy' : 'sell'} at ${pick.entry_price.toFixed(2)}</strong></div>
              {pick.stop_price && <div>4. Set your <strong>stop loss at ${pick.stop_price.toFixed(2)}</strong> — exit if it drops here</div>}
              {pick.target_price && <div>5. <strong>Take profit at ${pick.target_price.toFixed(2)}</strong> — this is the AI's target</div>}
              <div style={{ color: '#6b7280', marginTop: 2 }}>Crypto trades are evaluated over 24 hours</div>
            </>}
            {pick.category === 'option' && <>
              <div>1. Open <strong>{pick.symbol}</strong> options in your broker</div>
              <div>2. This is a <strong>{pick.bias.toUpperCase()}</strong> — buy a {pick.bias === 'call' ? 'CALL (betting price goes up)' : 'PUT (betting price goes down)'}</div>
              <div>3. The underlying was at <strong>${pick.entry_price.toFixed(2)}</strong> when this pick was made — choose an ATM strike near that price</div>
              <div>4. Use a <strong>limit order</strong> — never market order on options</div>
              {pick.stop_price && <div>5. Exit the option if the underlying hits <strong>${pick.stop_price.toFixed(2)}</strong> (stop level)</div>}
              {pick.target_price && <div>6. Take profit if the underlying reaches <strong>${pick.target_price.toFixed(2)}</strong> (target level)</div>}
              <div style={{ color: '#dc2626', fontWeight: 700, marginTop: 2 }}>⚠ 0DTE options: close all contracts by 3:45 PM ET — they expire worthless at market close</div>
            </>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Pick card (compact, click to expand) ──────────────────────────────────────

function PickCard({ pick, color, onClick }: { pick: BattlePick; color: string; onClick: () => void }) {
  const score = parseScore(pick.rationale)
  const catColor = { stock: '#6366f1', crypto: '#f59e0b', option: '#ec4899' }[pick.category] ?? '#6b7280'

  return (
    <div onClick={onClick} style={{ background: '#fff', border: `1px solid ${color}20`, borderLeft: `3px solid ${catColor}`, borderRadius: 10, padding: '14px 16px', marginBottom: 10, cursor: 'pointer', transition: 'box-shadow 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: catColor, background: `${catColor}14`, borderRadius: 3, padding: '1px 6px' }}>{pick.category.toUpperCase()}</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>{pick.symbol}</span>
          <BiasBadge bias={pick.bias} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {score.displayLabel && <span style={{ fontSize: 10, fontWeight: 700, color: score.color, background: score.bg, borderRadius: 4, padding: '2px 6px' }}>{score.displayLabel} {score.value}</span>}
          <OutcomeBadge outcome={pick.outcome} />
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <ConfidenceDots value={pick.confidence} color={color} />
      </div>

      {/* Truncated rationale — 2 lines */}
      {score.text && (
        <p style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', margin: '0 0 4px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          "{score.text}"
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span style={{ fontSize: 9, color: '#9ca3af' }}>Educational only · Not financial advice</span>
        <span style={{ fontSize: 11, color: color, fontWeight: 600 }}>Click to expand ↗</span>
      </div>
    </div>
  )
}

// ── Overview tab — compact grid ────────────────────────────────────────────────

function OverviewTab({ picks, loading, onSelectAI }: { picks: BattlePick[]; loading: boolean; onSelectAI: (ai: AIName) => void }) {
  const catColor = { stock: '#6366f1', crypto: '#f59e0b', option: '#ec4899' }

  return (
    <div>
      {/* 4-col header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {AIs.map(ai => {
          const cfg = AI_CONFIG[ai]
          const aiPicks = picks.filter(p => p.ai_name === ai)
          return (
            <div key={ai} onClick={() => onSelectAI(ai)} style={{ background: cfg.bg, border: `1px solid ${cfg.color}25`, borderRadius: 12, padding: '16px 18px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 4px 16px ${cfg.color}30`)}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: cfg.color }}>{cfg.label}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>{cfg.sub}</div>
                </div>
              </div>

              {loading ? (
                <>
                  <Skeleton h={14} style={{ marginBottom: 6 }} />
                  <Skeleton h={14} style={{ marginBottom: 6 }} />
                  <Skeleton h={14} />
                </>
              ) : aiPicks.length === 0 ? (
                <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>No picks yet</div>
              ) : (
                ['stock', 'crypto', 'option'].map(cat => {
                  const pick = aiPicks.find(p => p.category === cat)
                  if (!pick) return null
                  const cc = catColor[cat as keyof typeof catColor] ?? '#6b7280'
                  return (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: cc, background: `${cc}14`, borderRadius: 3, padding: '1px 5px', letterSpacing: '0.06em' }}>{cat.toUpperCase()}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>{pick.symbol}</span>
                      <span style={{ fontSize: 10, color: (pick.bias === 'bullish' || pick.bias === 'call') ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                        {pick.bias === 'call' ? '▲' : pick.bias === 'put' ? '▼' : pick.bias === 'bullish' ? '▲' : '▼'}
                      </span>
                      {pick.confidence && <span style={{ fontSize: 10, color: '#9ca3af' }}>{pick.confidence}/10</span>}
                    </div>
                  )
                })
              )}

              <div style={{ marginTop: 10, fontSize: 11, color: cfg.color, fontWeight: 600 }}>View full picks →</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── AI detail tab ──────────────────────────────────────────────────────────────

function AITab({ aiName, picks, loading }: { aiName: AIName; picks: BattlePick[]; loading: boolean }) {
  const cfg = AI_CONFIG[aiName]
  const [modal, setModal] = useState<BattlePick | null>(null)

  return (
    <div>
      {modal && <PickModal pick={modal} color={cfg.color} onClose={() => setModal(null)} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '18px 22px', background: cfg.bg, border: `1px solid ${cfg.color}25`, borderRadius: 14 }}>
        <span style={{ fontSize: 32 }}>{cfg.icon}</span>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: cfg.color }}>{cfg.label}</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{cfg.sub} · Today's 3 picks · Click any card to expand</div>
        </div>
      </div>

      {loading ? (
        ['stock', 'crypto', 'option'].map(cat => <Skeleton key={cat} h={120} style={{ marginBottom: 12, borderRadius: 10 }} />)
      ) : picks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 14 }}>
          No picks yet today. Generating at 7:30 AM ET.
        </div>
      ) : (
        ['stock', 'crypto', 'option'].map(cat => {
          const pick = picks.find(p => p.category === cat)
          return pick ? <PickCard key={cat} pick={pick} color={cfg.color} onClick={() => setModal(pick)} /> : null
        })
      )}
    </div>
  )
}

// ── Stats tab ──────────────────────────────────────────────────────────────────

function StatsTab({ leaderboard, recentDays, loading }: { leaderboard: LeaderboardEntry[]; recentDays: DayResult[]; loading: boolean }) {
  return (
    <div>
      {/* Leaderboard cards */}
      <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 16px' }}>All-Time Leaderboard</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 40 }}>
        {loading ? AIs.map(ai => <Skeleton key={ai} h={200} style={{ borderRadius: 14 }} />) : leaderboard.map(entry => {
          const cfg = AI_CONFIG[entry.ai_name]
          const streak = entry.current_streak > 0 ? `${entry.streak_type === 'W' ? '🔥' : '❄️'} ${entry.current_streak}${entry.streak_type}` : '—'
          return (
            <div key={entry.ai_name} style={{ background: '#fff', border: `1px solid ${cfg.color}30`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ height: 4, background: cfg.color }} />
              <div style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                  <div style={{ fontSize: 16, fontWeight: 800, color: cfg.color }}>{cfg.label}</div>
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                  <div><div style={{ fontSize: 30, fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>{entry.wins}</div><div style={{ fontSize: 10, color: '#9ca3af' }}>Wins</div></div>
                  <div style={{ fontSize: 24, color: '#e5e7eb', alignSelf: 'center' }}>—</div>
                  <div><div style={{ fontSize: 30, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>{entry.losses}</div><div style={{ fontSize: 10, color: '#9ca3af' }}>Losses</div></div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>Win Rate</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{entry.win_rate}%</span>
                  </div>
                  <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${entry.win_rate}%`, height: '100%', background: cfg.color, borderRadius: 99 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
                  <span style={{ background: '#f9fafb', borderRadius: 6, padding: '4px 8px', color: '#374151' }}><span style={{ color: '#9ca3af' }}>Streak: </span><strong>{streak}</strong></span>
                  <span style={{ background: '#f9fafb', borderRadius: 6, padding: '4px 8px', color: '#374151' }}><span style={{ color: '#9ca3af' }}>Best: </span><strong style={{ textTransform: 'uppercase' }}>{entry.best_category}</strong></span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Last 7 days table */}
      <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 16px' }}>Last 7 Days</h3>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em' }}>DATE</th>
                {AIs.map(ai => <th key={ai} style={{ padding: '12px 16px', textAlign: 'center', color: AI_CONFIG[ai].color, fontWeight: 700, fontSize: 12 }}>{AI_CONFIG[ai].icon} {AI_CONFIG[ai].label}</th>)}
                <th style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontWeight: 600, fontSize: 11 }}>🏆 WINNER</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : recentDays).map((day, i) => {
                const label = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const isToday = i === recentDays.length - 1
                return (
                  <tr key={day.date} style={{ borderBottom: '1px solid #f3f4f6', background: isToday ? '#fffbeb' : 'transparent' }}>
                    <td style={{ padding: '11px 16px', color: '#374151', fontWeight: isToday ? 700 : 400 }}>
                      {label}{isToday && <span style={{ fontSize: 10, color: GOLD, marginLeft: 6, fontWeight: 700 }}>TODAY</span>}
                    </td>
                    {AIs.map(ai => {
                      const stat = day.ai_stats.find(s => s.ai_name === ai)
                      const total = (stat?.wins ?? 0) + (stat?.losses ?? 0)
                      return (
                        <td key={ai} style={{ padding: '11px 16px', textAlign: 'center' }}>
                          {total === 0 ? <span style={{ color: '#d1d5db' }}>—</span> : (
                            <span style={{ color: (stat?.wins ?? 0) > (stat?.losses ?? 0) ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                              {stat?.wins ?? 0}W-{stat?.losses ?? 0}L
                            </span>
                          )}
                        </td>
                      )
                    })}
                    <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                      {day.winner ? <span style={{ color: AI_CONFIG[day.winner].color, fontWeight: 700 }}>{AI_CONFIG[day.winner].icon} {AI_CONFIG[day.winner].label}</span> : <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function WarPage() {
  const [data, setData] = useState<WarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState<TabId>('overview')

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsAdmin(data.user?.email === ADMIN_EMAIL)
    })
  }, [])

  const loadData = () => {
    setLoading(true)
    fetch('/api/war')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load battle data.'); setLoading(false) })
  }

  useEffect(() => { loadData() }, [])

  const handleGenerate = async (refresh = false) => {
    setGenerating(true)
    setGenMsg('Calling all AIs… this takes ~30 seconds')
    try {
      const res = await fetch(`/api/war/generate${refresh ? '?refresh=true' : ''}`, {
        method: 'POST',
        headers: { 'x-cron-secret': 'ic-cron-2024' },
      })
      const json = await res.json()
      if (!res.ok) {
        setGenMsg(`Error ${res.status}: ${json.error ?? 'unknown'}`)
      } else if (json.skipped) {
        setGenMsg('Picks already generated for today. Use Refresh Picks to regenerate.')
      } else {
        setGenMsg(`Generated ${json.generated}/12 picks for ${json.date} — loading…`)
        setTimeout(loadData, 1500)
      }
    } catch (e: any) {
      setGenMsg(`Failed: ${e?.message ?? 'network error'}`)
    } finally {
      setGenerating(false)
    }
  }

  const picksByAI = (ai: string) => (data?.picks_today ?? []).filter(p => p.ai_name === ai)
  const hasPicks = (data?.picks_today ?? []).length > 0

  const tabs: { id: TabId; label: string; icon?: string }[] = [
    { id: 'overview', label: 'Overview', icon: '⚔️' },
    ...AIs.map(ai => ({ id: ai as TabId, label: AI_CONFIG[ai].label, icon: AI_CONFIG[ai].icon })),
    { id: 'stats', label: 'Stats', icon: '🏆' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @media(max-width:640px){ .overview-grid{grid-template-columns:repeat(2,1fr)!important} }
      `}</style>

      {/* Header */}
      <div style={{ background: DARK_BG, padding: '14px 24px 0', textAlign: 'center' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'left', marginBottom: 20 }}>
            <a href="/app" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none', border: '1px solid #2d3748', borderRadius: 6, padding: '5px 12px', fontWeight: 600 }}>← Back</a>
          </div>
          <div style={{ fontSize: 12, color: GOLD, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 10 }}>⚔️ WAR OF THE AIs</div>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 900, color: '#fff', margin: '0 0 8px', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            Claude vs ChatGPT vs Gemini vs Grok
          </h1>
          <p style={{ fontSize: 15, color: '#94a3b8', margin: '0 0 24px' }}>Daily picks. Live scores. One winner.</p>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 2, justifyContent: 'center', borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
            {tabs.map(t => {
              const active = tab === t.id
              const aiColor = AIs.includes(t.id as AIName) ? AI_CONFIG[t.id as AIName].color : GOLD
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '10px 16px', fontSize: 13, fontWeight: active ? 700 : 500,
                  color: active ? (AIs.includes(t.id as AIName) ? AI_CONFIG[t.id as AIName].color : GOLD) : '#94a3b8',
                  borderBottom: active ? `2px solid ${aiColor}` : '2px solid transparent',
                  marginBottom: -1, transition: 'color 0.15s',
                  whiteSpace: 'nowrap',
                }}>
                  {t.icon} {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 60px' }}>
        {error && <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>{error}</div>}

        {/* Admin controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          {data?.today && (
            <span style={{ fontSize: 13, color: '#9ca3af' }}>
              {new Date(data.today + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {isAdmin && !loading && (
              <>
                {!hasPicks && (
                  <button onClick={() => handleGenerate(false)} disabled={generating} style={{ fontSize: 12, fontWeight: 700, background: DARK_BG, color: GOLD, border: `1px solid ${GOLD}50`, borderRadius: 6, padding: '7px 16px', cursor: 'pointer', opacity: generating ? 0.6 : 1 }}>
                    {generating ? 'Generating…' : '⚔️ Generate Today\'s Picks'}
                  </button>
                )}
                {hasPicks && (
                  <button onClick={() => handleGenerate(true)} disabled={generating} style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', opacity: generating ? 0.6 : 1 }}>
                    {generating ? 'Refreshing…' : '↻ Refresh Picks'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {genMsg && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, padding: '8px 12px', background: '#f3f4f6', borderRadius: 6 }}>{genMsg}</div>}

        {/* Yesterday banner — only on overview/stats */}
        {(tab === 'overview' || tab === 'stats') && (
          <div style={{ background: data?.yesterday_winner ? `linear-gradient(135deg,${GOLD}18,${GOLD}08)` : '#f9fafb', border: `1px solid ${data?.yesterday_winner ? GOLD + '40' : '#e5e7eb'}`, borderRadius: 12, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <span style={{ fontSize: 28 }}>🏆</span>
            {loading ? <Skeleton h={16} style={{ width: 200 }} /> : data?.yesterday_winner ? (
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#111' }}>
                  Yesterday's Winner: <span style={{ color: AI_CONFIG[data.yesterday_winner].color }}>{AI_CONFIG[data.yesterday_winner].icon} {AI_CONFIG[data.yesterday_winner].label}</span>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{data.yesterday_wins} of {data.yesterday_total} picks correct</div>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: '#9ca3af' }}>No resolved picks from yesterday yet — check back after 7:30 AM ET.</div>
            )}
          </div>
        )}

        {/* Tab content */}
        {tab === 'overview' && (
          <OverviewTab
            picks={data?.picks_today ?? []}
            loading={loading}
            onSelectAI={(ai) => setTab(ai)}
          />
        )}
        {AIs.map(ai => tab === ai && (
          <AITab key={ai} aiName={ai} picks={picksByAI(ai)} loading={loading} />
        ))}
        {tab === 'stats' && (
          <StatsTab leaderboard={data?.leaderboard ?? []} recentDays={data?.recent_days ?? []} loading={loading} />
        )}
      </div>
    </div>
  )
}
