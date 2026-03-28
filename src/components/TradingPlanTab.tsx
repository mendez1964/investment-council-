'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle,
  TrendingUp, Shield, Target, BarChart2, Zap, RefreshCw, BookOpen,
  Star, AlertCircle, Lightbulb, Award, X,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TradingPlan {
  id?: string
  trading_style: 'day' | 'swing' | 'position' | 'long-term'
  markets: string[]
  timeframes: string[]
  risk_per_trade_pct: number
  max_daily_loss_pct: number
  max_open_positions: number
  max_position_size_pct: number
  entry_criteria: string
  entry_triggers: string[]
  profit_target_pct: number | null
  stop_loss_pct: number | null
  uses_trailing_stop: boolean
  exit_criteria: string
  position_sizing_method: 'fixed' | 'pct' | 'atr' | 'kelly'
  preferred_sectors: string[]
  avoid_conditions: string
  ai_score: number | null
  ai_feedback: string | null
  ai_scored_at: string | null
}

interface AIFeedback {
  score: number
  grade: string
  summary: string
  strengths: string[]
  weaknesses: string[]
  contradictions: string[]
  improvements: string[]
  risk_reward_ratio: string
  style_fit: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STYLES = [
  { value: 'day', label: 'Day Trading', desc: 'All positions closed same day', icon: '⚡' },
  { value: 'swing', label: 'Swing Trading', desc: '2–10 day holds', icon: '📈' },
  { value: 'position', label: 'Position Trading', desc: 'Weeks to months', icon: '🏗' },
  { value: 'long-term', label: 'Long-Term Investing', desc: 'Months to years', icon: '🌱' },
]

const MARKETS_OPTIONS = ['Stocks', 'ETFs', 'Options', 'Crypto', 'Forex', 'Futures']
const TIMEFRAME_OPTIONS = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1mo']
const SECTOR_OPTIONS = ['Technology', 'Healthcare', 'Energy', 'Financials', 'Consumer', 'Industrials', 'Materials', 'Utilities', 'Real Estate', 'Communication']
const ENTRY_TRIGGERS = [
  'Breakout above resistance',
  'Pullback to support',
  'Moving average crossover',
  'RSI oversold bounce',
  'MACD signal cross',
  'Volume surge',
  'Gap and go',
  'Earnings catalyst',
  'Candlestick reversal pattern',
  'Trend continuation setup',
]

const SIZING_METHODS = [
  { value: 'pct', label: '% of Account', desc: 'Risk a fixed % of your account per trade — most common' },
  { value: 'fixed', label: 'Fixed Dollar Amount', desc: 'Same dollar risk on every trade — simple and consistent' },
  { value: 'atr', label: 'ATR-Based', desc: 'Position size adjusts to current volatility — advanced' },
  { value: 'kelly', label: 'Kelly Criterion', desc: 'Size based on your edge and win rate — quantitative' },
]

const EMPTY_PLAN: Omit<TradingPlan, 'id' | 'ai_score' | 'ai_feedback' | 'ai_scored_at'> = {
  trading_style: 'swing',
  markets: ['Stocks'],
  timeframes: ['1d'],
  risk_per_trade_pct: 1,
  max_daily_loss_pct: 3,
  max_open_positions: 5,
  max_position_size_pct: 10,
  entry_criteria: '',
  entry_triggers: [],
  profit_target_pct: null,
  stop_loss_pct: null,
  uses_trailing_stop: false,
  exit_criteria: '',
  position_sizing_method: 'pct',
  preferred_sectors: [],
  avoid_conditions: '',
}

// ── Score color helpers ───────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return '#7ec8a0'
  if (score >= 60) return '#fbbf24'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

function gradeColor(grade: string) {
  if (grade === 'A') return '#7ec8a0'
  if (grade === 'B') return '#a3e635'
  if (grade === 'C') return '#fbbf24'
  if (grade === 'D') return '#f97316'
  return '#ef4444'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Tip({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: '8px', background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '8px', padding: '10px 12px', marginTop: '8px' }}>
      <Lightbulb size={13} style={{ color: '#60a5fa', flexShrink: 0, marginTop: '1px' }} />
      <span style={{ fontSize: '11.5px', color: '#93c5fd', lineHeight: 1.5 }}>{text}</span>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
      <span style={{ fontSize: '13px', color: '#a0aec0' }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
          background: checked ? '#2d6a4f' : '#2d3748', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: '3px', left: checked ? '21px' : '3px',
          width: '16px', height: '16px', borderRadius: '50%',
          background: checked ? '#7ec8a0' : '#4a5568', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

function MultiSelect({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {options.map(opt => {
        const active = selected.includes(opt)
        return (
          <button
            key={opt}
            onClick={() => onChange(active ? selected.filter(s => s !== opt) : [...selected, opt])}
            style={{
              padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
              background: active ? '#1a472a' : '#1a1f2e',
              border: `1px solid ${active ? '#2d6a4f' : '#262626'}`,
              color: active ? '#7ec8a0' : '#4a5568',
              transition: 'all 0.15s',
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function NumberInput({ label, value, onChange, min, max, step, suffix }: {
  label: string; value: number | null; onChange: (v: number) => void
  min: number; max: number; step: number; suffix?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="number"
          value={value ?? ''}
          onChange={e => onChange(Number(e.target.value))}
          min={min} max={max} step={step}
          style={{
            width: '90px', padding: '7px 10px', borderRadius: '7px', fontFamily: 'inherit',
            background: '#0f1117', border: '1px solid #2d3748', color: '#e2e8f0',
            fontSize: '14px', fontWeight: 600, outline: 'none',
          }}
        />
        {suffix && <span style={{ fontSize: '12px', color: '#4a5568' }}>{suffix}</span>}
      </div>
    </div>
  )
}

// ── Steps ─────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Style', icon: TrendingUp },
  { id: 2, label: 'Risk', icon: Shield },
  { id: 3, label: 'Entries', icon: Zap },
  { id: 4, label: 'Exits', icon: Target },
  { id: 5, label: 'Sizing', icon: BarChart2 },
  { id: 6, label: 'Focus', icon: BookOpen },
]

// ── Main Component ────────────────────────────────────────────────────────────

export default function TradingPlanTab({ onSendMessage }: { onSendMessage?: (msg: string) => void }) {
  const [plan, setPlan] = useState<TradingPlan | null>(null)
  const [draft, setDraft] = useState<typeof EMPTY_PLAN>({ ...EMPTY_PLAN })
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState<'view' | 'wizard'>('view')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiFeedback, setAIFeedback] = useState<AIFeedback | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  const loadPlan = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/trading-plan')
      const { plan: p } = await res.json()
      setPlan(p)
      if (p) {
        setDraft({
          trading_style: p.trading_style,
          markets: p.markets,
          timeframes: p.timeframes,
          risk_per_trade_pct: p.risk_per_trade_pct,
          max_daily_loss_pct: p.max_daily_loss_pct,
          max_open_positions: p.max_open_positions,
          max_position_size_pct: p.max_position_size_pct,
          entry_criteria: p.entry_criteria,
          entry_triggers: p.entry_triggers,
          profit_target_pct: p.profit_target_pct,
          stop_loss_pct: p.stop_loss_pct,
          uses_trailing_stop: p.uses_trailing_stop,
          exit_criteria: p.exit_criteria,
          position_sizing_method: p.position_sizing_method,
          preferred_sectors: p.preferred_sectors,
          avoid_conditions: p.avoid_conditions,
        })
        if (p.ai_feedback) {
          try { setAIFeedback(JSON.parse(p.ai_feedback)) } catch {}
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPlan() }, [loadPlan])

  async function savePlan() {
    setSaving(true)
    try {
      const res = await fetch('/api/trading-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const { plan: p } = await res.json()
      setPlan(p)
      setAIFeedback(null)
      setMode('view')
    } finally {
      setSaving(false)
    }
  }

  async function analyzePlan() {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/trading-plan/analyze', { method: 'POST' })
      const { feedback } = await res.json()
      if (feedback) {
        setAIFeedback(feedback)
        setShowFeedback(true)
        // Refresh plan to get stored score
        const res2 = await fetch('/api/trading-plan')
        const { plan: p } = await res2.json()
        setPlan(p)
      }
    } finally {
      setAnalyzing(false)
    }
  }

  function update<K extends keyof typeof EMPTY_PLAN>(key: K, value: typeof EMPTY_PLAN[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568' }}>
        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!plan && mode === 'view') {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#0d2010', border: '1px solid #1a472a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <ClipboardList size={28} style={{ color: '#7ec8a0' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0', marginBottom: '12px' }}>
            You don't have a Trading Plan yet
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, marginBottom: '8px' }}>
            A trading plan is the single most important document a trader can have. It defines your rules before emotion gets involved.
          </p>
          <p style={{ fontSize: '13px', color: '#4a5568', lineHeight: 1.6, marginBottom: '28px' }}>
            Traders with written plans are statistically more consistent, less emotional, and recover from losses faster. It takes 5 minutes to build — Claude will score it and identify any weaknesses.
          </p>
          <button
            onClick={() => { setStep(1); setMode('wizard') }}
            style={{
              padding: '12px 28px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: '#2d6a4f', color: '#7ec8a0', fontSize: '14px', fontWeight: 700, letterSpacing: '0.03em',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#3a7a5f'}
            onMouseLeave={e => e.currentTarget.style.background = '#2d6a4f'}
          >
            Build My Trading Plan
          </button>
        </div>
      </div>
    )
  }

  // ── Wizard ───────────────────────────────────────────────────────────────────
  if (mode === 'wizard') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '24px' }}>
        {/* Step progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '28px', overflowX: 'auto', paddingBottom: '4px' }}>
          {STEPS.map((s, i) => {
            const done = step > s.id
            const active = step === s.id
            const Icon = s.icon
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <div
                  onClick={() => done && setStep(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '5px 10px', borderRadius: '20px',
                    background: done ? '#1a472a' : active ? '#0d2010' : '#0f0f0f',
                    border: `1px solid ${done ? '#2d6a4f' : active ? '#2d6a4f' : '#1e2130'}`,
                    color: done ? '#7ec8a0' : active ? '#7ec8a0' : '#3a4055',
                    fontSize: '11px', fontWeight: 600, cursor: done ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                  }}
                >
                  {done ? <CheckCircle2 size={12} /> : <Icon size={12} />}
                  {s.label}
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight size={12} style={{ color: '#1e2130', flexShrink: 0 }} />
                )}
              </div>
            )
          })}
        </div>

        <div style={{ maxWidth: '560px' }}>

          {/* Step 1: Style */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>What's your trading style?</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.5 }}>
                Be honest. Most traders fail by choosing a style that doesn't fit their schedule or personality. Day trading requires full-time attention. Long-term investing is for patient capital.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {STYLES.map(s => {
                  const active = draft.trading_style === s.value
                  return (
                    <button
                      key={s.value}
                      onClick={() => update('trading_style', s.value as TradingPlan['trading_style'])}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '10px',
                        background: active ? '#0d2010' : '#0f0f0f',
                        border: `1px solid ${active ? '#2d6a4f' : '#1e2130'}`,
                        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '22px' }}>{s.icon}</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: active ? '#7ec8a0' : '#e2e8f0' }}>{s.label}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{s.desc}</div>
                      </div>
                      {active && <CheckCircle2 size={16} style={{ color: '#7ec8a0', marginLeft: 'auto', flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '10px' }}>MARKETS YOU TRADE</label>
                <MultiSelect options={MARKETS_OPTIONS} selected={draft.markets} onChange={v => update('markets', v)} />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '10px' }}>TIMEFRAMES YOU USE</label>
                <MultiSelect options={TIMEFRAME_OPTIONS} selected={draft.timeframes} onChange={v => update('timeframes', v)} />
              </div>
              <Tip text="Match your timeframes to your style. Day traders use 1m–15m. Swing traders use 1h–1d. Position traders use 1d–1w. Mismatched timeframes are a common source of noise and bad trades." />
            </div>
          )}

          {/* Step 2: Risk */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>Risk rules</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.5 }}>
                This is the most important section. Every professional trader has hard risk limits they never break. If you skip this, you don't have a trading plan — you have a gambling habit.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <NumberInput
                  label="RISK PER TRADE"
                  value={draft.risk_per_trade_pct}
                  onChange={v => update('risk_per_trade_pct', v)}
                  min={0.1} max={20} step={0.25} suffix="% of account"
                />
                <NumberInput
                  label="MAX DAILY LOSS"
                  value={draft.max_daily_loss_pct}
                  onChange={v => update('max_daily_loss_pct', v)}
                  min={0.5} max={30} step={0.5} suffix="% of account"
                />
                <NumberInput
                  label="MAX OPEN POSITIONS"
                  value={draft.max_open_positions}
                  onChange={v => update('max_open_positions', v)}
                  min={1} max={50} step={1} suffix="positions"
                />
                <NumberInput
                  label="MAX POSITION SIZE"
                  value={draft.max_position_size_pct}
                  onChange={v => update('max_position_size_pct', v)}
                  min={1} max={100} step={1} suffix="% of account"
                />
              </div>
              {/* Consistency check */}
              {draft.risk_per_trade_pct && draft.max_daily_loss_pct && (
                (() => {
                  const tradesUntilMax = Math.floor(draft.max_daily_loss_pct / draft.risk_per_trade_pct)
                  const isConsistent = tradesUntilMax >= 2
                  return (
                    <div style={{
                      display: 'flex', gap: '8px', padding: '10px 12px', borderRadius: '8px',
                      background: isConsistent ? '#0d2010' : '#1a0a00',
                      border: `1px solid ${isConsistent ? '#1a472a' : '#7c2d12'}`,
                    }}>
                      {isConsistent
                        ? <CheckCircle2 size={14} style={{ color: '#7ec8a0', flexShrink: 0, marginTop: '1px' }} />
                        : <AlertTriangle size={14} style={{ color: '#f97316', flexShrink: 0, marginTop: '1px' }} />
                      }
                      <span style={{ fontSize: '12px', color: isConsistent ? '#7ec8a0' : '#f97316', lineHeight: 1.5 }}>
                        {isConsistent
                          ? `At ${draft.risk_per_trade_pct}% per trade, you'd hit your daily max after ${tradesUntilMax} consecutive losers. That's a reasonable buffer.`
                          : `Warning: at ${draft.risk_per_trade_pct}% per trade, you'd hit your daily max on the first or second loss. Consider increasing your daily limit or reducing per-trade risk.`
                        }
                      </span>
                    </div>
                  )
                })()
              )}
              <Tip text="Professional traders typically risk 0.5–2% per trade. The daily max should be 2–3x your per-trade risk, giving you room for a losing streak without wiping the day." />
            </div>
          )}

          {/* Step 3: Entries */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>Entry criteria</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.5 }}>
                Vague entries lead to emotional decisions. Your plan should define exactly what needs to be true before you enter a trade.
              </p>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '8px' }}>ENTRY TRIGGERS (select all that apply)</label>
                <MultiSelect options={ENTRY_TRIGGERS} selected={draft.entry_triggers} onChange={v => update('entry_triggers', v)} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '8px' }}>YOUR ENTRY CRITERIA (in your own words)</label>
                <textarea
                  value={draft.entry_criteria}
                  onChange={e => update('entry_criteria', e.target.value)}
                  placeholder="e.g. I only enter on a confirmed breakout above resistance with volume 1.5x the 20-day average. I wait for a 15m close above the level before entering."
                  rows={5}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px', fontFamily: 'inherit',
                    background: '#0a0a0a', border: '1px solid #2d3748', color: '#e2e8f0',
                    fontSize: '13px', lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>
              <Tip text="The more specific your entry criteria, the fewer low-quality trades you'll take. 'Stocks going up' is not an entry criteria. 'Breakout above 52-week high on volume 2x average, above rising 50 MA' is." />
            </div>
          )}

          {/* Step 4: Exits */}
          {step === 4 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>Exit rules</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.5 }}>
                Entries tell you where to get in. Exits determine how much you make. Most traders define entries but wing exits — that's where profits leak.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <NumberInput
                  label="PROFIT TARGET"
                  value={draft.profit_target_pct}
                  onChange={v => update('profit_target_pct', v)}
                  min={0.5} max={100} step={0.5} suffix="% gain"
                />
                <NumberInput
                  label="STOP LOSS"
                  value={draft.stop_loss_pct}
                  onChange={v => update('stop_loss_pct', v)}
                  min={0.25} max={50} step={0.25} suffix="% loss"
                />
              </div>

              {/* R:R display */}
              {draft.profit_target_pct && draft.stop_loss_pct && (
                <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#080a0f', border: '1px solid #1e2130', marginBottom: '20px' }}>
                  <span style={{ fontSize: '12px', color: '#4a5568' }}>Risk/Reward Ratio: </span>
                  <span style={{
                    fontSize: '15px', fontWeight: 700, marginLeft: '6px',
                    color: (draft.profit_target_pct / draft.stop_loss_pct) >= 2 ? '#7ec8a0' : (draft.profit_target_pct / draft.stop_loss_pct) >= 1.5 ? '#fbbf24' : '#ef4444',
                  }}>
                    1 : {(draft.profit_target_pct / draft.stop_loss_pct).toFixed(2)}
                  </span>
                  {(draft.profit_target_pct / draft.stop_loss_pct) < 1.5 && (
                    <span style={{ fontSize: '12px', color: '#f97316', marginLeft: '10px' }}>— Below 1.5:1 is a tough edge to maintain</span>
                  )}
                  {(draft.profit_target_pct / draft.stop_loss_pct) >= 2 && (
                    <span style={{ fontSize: '12px', color: '#7ec8a0', marginLeft: '10px' }}>— Solid. You only need to be right ~34% of the time.</span>
                  )}
                </div>
              )}

              <Toggle
                label="Use trailing stop to lock in profits"
                checked={draft.uses_trailing_stop}
                onChange={v => update('uses_trailing_stop', v)}
              />

              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '8px' }}>EXIT CRITERIA (in your own words)</label>
                <textarea
                  value={draft.exit_criteria}
                  onChange={e => update('exit_criteria', e.target.value)}
                  placeholder="e.g. I take 50% of the position at 2R and let the rest run with a trailing stop. I exit immediately if the stock closes below the entry candle's low. I never hold through earnings unless specifically playing them."
                  rows={4}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px', fontFamily: 'inherit',
                    background: '#0a0a0a', border: '1px solid #2d3748', color: '#e2e8f0',
                    fontSize: '13px', lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>
              <Tip text="Aim for a minimum 2:1 risk/reward. At 2:1, you only need to be right 34% of the time to be profitable. At 1:1, you need to win 51%+ every time — very hard to sustain." />
            </div>
          )}

          {/* Step 5: Sizing */}
          {step === 5 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>Position sizing method</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.5 }}>
                Position sizing is how you turn your risk rules into actual share counts. It determines how much you buy — separate from your entry signal.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {SIZING_METHODS.map(m => {
                  const active = draft.position_sizing_method === m.value
                  return (
                    <button
                      key={m.value}
                      onClick={() => update('position_sizing_method', m.value as TradingPlan['position_sizing_method'])}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '10px',
                        background: active ? '#0d2010' : '#0f0f0f',
                        border: `1px solid ${active ? '#2d6a4f' : '#1e2130'}`,
                        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: active ? '#7ec8a0' : '#e2e8f0' }}>{m.label}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{m.desc}</div>
                      </div>
                      {active && <CheckCircle2 size={16} style={{ color: '#7ec8a0', flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
              <Tip text="For most traders, % of account is the right starting point. Formula: Position Size = (Account × Risk%) ÷ (Entry Price − Stop Price). This automatically sizes down as your account shrinks and up as it grows." />
            </div>
          )}

          {/* Step 6: Focus */}
          {step === 6 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>Focus & filters</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.5 }}>
                What sectors or conditions do you focus on? What market environments do you avoid? Knowing when NOT to trade is as important as knowing when to trade.
              </p>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '10px' }}>PREFERRED SECTORS (optional)</label>
                <MultiSelect options={SECTOR_OPTIONS} selected={draft.preferred_sectors} onChange={v => update('preferred_sectors', v)} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '8px' }}>CONDITIONS TO AVOID</label>
                <textarea
                  value={draft.avoid_conditions}
                  onChange={e => update('avoid_conditions', e.target.value)}
                  placeholder="e.g. I don't trade the first 30 minutes after market open. I step aside when VIX is above 30. I don't trade the day before major economic reports. I avoid earnings plays in names I don't know well."
                  rows={4}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px', fontFamily: 'inherit',
                    background: '#0a0a0a', border: '1px solid #2d3748', color: '#e2e8f0',
                    fontSize: '13px', lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>
              <Tip text="The best traders are highly selective. Defining what you avoid removes low-quality setups from your decision set before emotion gets involved. 'I only trade when I have edge' is a complete trading filter." />
            </div>
          )}

        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '28px', maxWidth: '560px' }}>
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', border: '1px solid #2d3748', background: 'transparent', color: '#a0aec0', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}
          {plan && step === 1 && (
            <button
              onClick={() => setMode('view')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', border: '1px solid #2d3748', background: 'transparent', color: '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <X size={14} /> Cancel
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 6 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#2d6a4f', color: '#7ec8a0', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={savePlan}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#2d6a4f', color: '#7ec8a0', fontSize: '13px', fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}
            >
              <CheckCircle2 size={14} /> {saving ? 'Saving…' : 'Save My Plan'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Plan view ────────────────────────────────────────────────────────────────
  const styleInfo = STYLES.find(s => s.value === plan?.trading_style)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <ClipboardList size={18} style={{ color: '#7ec8a0' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>My Trading Plan</h2>
            {plan?.ai_score !== null && plan?.ai_score !== undefined && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '3px 10px', borderRadius: '20px',
                background: '#080a0f', border: `1px solid ${scoreColor(plan.ai_score)}44`,
              }}>
                <Award size={11} style={{ color: scoreColor(plan.ai_score) }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: scoreColor(plan.ai_score) }}>{plan.ai_score}/100</span>
              </div>
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#4a5568' }}>
            {styleInfo?.icon} {styleInfo?.label} · {plan?.markets.join(', ')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setStep(1); setMode('wizard') }}
            style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #2d3748', background: 'transparent', color: '#a0aec0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Edit Plan
          </button>
          <button
            onClick={analyzePlan}
            disabled={analyzing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '7px', border: 'none',
              background: analyzing ? '#1a2a1f' : '#2d6a4f',
              color: '#7ec8a0', fontSize: '12px', fontWeight: 700, cursor: analyzing ? 'default' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {analyzing ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={12} />}
            {analyzing ? 'Analyzing…' : plan?.ai_score !== null ? 'Re-score Plan' : 'Score My Plan'}
          </button>
        </div>
      </div>

      {/* Plan grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '20px' }}>

        {/* Risk Rules */}
        <PlanCard title="Risk Rules" icon={Shield} color="#ef4444">
          <PlanRow label="Risk per trade" value={`${plan?.risk_per_trade_pct}%`} />
          <PlanRow label="Max daily loss" value={`${plan?.max_daily_loss_pct}%`} />
          <PlanRow label="Max open positions" value={String(plan?.max_open_positions)} />
          <PlanRow label="Max position size" value={`${plan?.max_position_size_pct}%`} />
        </PlanCard>

        {/* Entry Rules */}
        <PlanCard title="Entry Criteria" icon={Zap} color="#60a5fa">
          {plan?.entry_triggers && plan.entry_triggers.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
              {plan.entry_triggers.map(t => (
                <span key={t} style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', background: '#0a1628', border: '1px solid #1e3a5f', color: '#93c5fd' }}>{t}</span>
              ))}
            </div>
          )}
          {plan?.entry_criteria && (
            <p style={{ fontSize: '12px', color: '#a0aec0', lineHeight: 1.6, margin: 0 }}>{plan.entry_criteria}</p>
          )}
          {!plan?.entry_criteria && (!plan?.entry_triggers || plan.entry_triggers.length === 0) && (
            <span style={{ fontSize: '12px', color: '#3a4055', fontStyle: 'italic' }}>Not defined — edit plan to add</span>
          )}
        </PlanCard>

        {/* Exit Rules */}
        <PlanCard title="Exit Rules" icon={Target} color="#7ec8a0">
          {plan?.profit_target_pct && <PlanRow label="Profit target" value={`+${plan.profit_target_pct}%`} />}
          {plan?.stop_loss_pct && <PlanRow label="Stop loss" value={`-${plan.stop_loss_pct}%`} />}
          {plan?.profit_target_pct && plan?.stop_loss_pct && (
            <PlanRow label="R:R ratio" value={`1 : ${(plan.profit_target_pct / plan.stop_loss_pct).toFixed(2)}`} highlight />
          )}
          <PlanRow label="Trailing stop" value={plan?.uses_trailing_stop ? 'Yes' : 'No'} />
          {plan?.exit_criteria && (
            <p style={{ fontSize: '12px', color: '#a0aec0', lineHeight: 1.6, margin: '8px 0 0' }}>{plan.exit_criteria}</p>
          )}
        </PlanCard>

        {/* Position Sizing */}
        <PlanCard title="Position Sizing" icon={BarChart2} color="#fbbf24">
          <PlanRow label="Method" value={SIZING_METHODS.find(m => m.value === plan?.position_sizing_method)?.label ?? ''} />
          <p style={{ fontSize: '11.5px', color: '#6b7280', lineHeight: 1.5, margin: '6px 0 0' }}>
            {SIZING_METHODS.find(m => m.value === plan?.position_sizing_method)?.desc}
          </p>
        </PlanCard>

        {/* Focus */}
        {((plan?.preferred_sectors?.length ?? 0) > 0 || plan?.avoid_conditions) && (
          <PlanCard title="Focus & Filters" icon={BookOpen} color="#a78bfa">
            {plan?.preferred_sectors && plan.preferred_sectors.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>PREFERRED SECTORS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {plan.preferred_sectors.map(s => (
                    <span key={s} style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', background: '#13101f', border: '1px solid #2e1f6a', color: '#a78bfa' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            {plan?.avoid_conditions && (
              <p style={{ fontSize: '12px', color: '#a0aec0', lineHeight: 1.6, margin: 0 }}>{plan.avoid_conditions}</p>
            )}
          </PlanCard>
        )}

      </div>

      {/* AI Feedback */}
      {aiFeedback && (
        <div style={{ marginTop: '8px' }}>
          <button
            onClick={() => setShowFeedback(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #1e2130', background: '#080a0f', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
          >
            <Award size={14} style={{ color: scoreColor(aiFeedback.score), flexShrink: 0 }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', flex: 1 }}>AI Plan Analysis</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: gradeColor(aiFeedback.grade) }}>{aiFeedback.grade}</span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: scoreColor(aiFeedback.score) }}>{aiFeedback.score}</span>
            <ChevronRight size={14} style={{ color: '#4a5568', transform: showFeedback ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {showFeedback && (
            <div style={{ padding: '16px', borderRadius: '10px', border: '1px solid #1e2130', background: '#080a0f', marginTop: '8px' }}>
              <p style={{ fontSize: '13px', color: '#a0aec0', lineHeight: 1.6, marginBottom: '16px' }}>{aiFeedback.summary}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {aiFeedback.strengths?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#7ec8a0', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.08em' }}>STRENGTHS</div>
                    {aiFeedback.strengths.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                        <CheckCircle2 size={12} style={{ color: '#7ec8a0', flexShrink: 0, marginTop: '1px' }} />
                        <span style={{ fontSize: '12px', color: '#a0aec0', lineHeight: 1.5 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
                {aiFeedback.weaknesses?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.08em' }}>WEAKNESSES</div>
                    {aiFeedback.weaknesses.map((w, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                        <AlertCircle size={12} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
                        <span style={{ fontSize: '12px', color: '#a0aec0', lineHeight: 1.5 }}>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {aiFeedback.contradictions?.length > 0 && (
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#1a0a00', border: '1px solid #7c2d12', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#f97316', fontWeight: 700, marginBottom: '6px', letterSpacing: '0.08em' }}>CONTRADICTIONS DETECTED</div>
                  {aiFeedback.contradictions.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                      <AlertTriangle size={12} style={{ color: '#f97316', flexShrink: 0, marginTop: '1px' }} />
                      <span style={{ fontSize: '12px', color: '#fdba74', lineHeight: 1.5 }}>{c}</span>
                    </div>
                  ))}
                </div>
              )}

              {aiFeedback.improvements?.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.08em' }}>IMPROVEMENTS</div>
                  {aiFeedback.improvements.map((imp, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <Star size={12} style={{ color: '#60a5fa', flexShrink: 0, marginTop: '1px' }} />
                      <span style={{ fontSize: '12px', color: '#a0aec0', lineHeight: 1.5 }}>{imp}</span>
                    </div>
                  ))}
                </div>
              )}

              {(aiFeedback.risk_reward_ratio || aiFeedback.style_fit) && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1e2130' }}>
                  {aiFeedback.risk_reward_ratio && (
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                      <span style={{ color: '#4a5568' }}>R:R Assessment: </span>{aiFeedback.risk_reward_ratio}
                    </div>
                  )}
                  {aiFeedback.style_fit && (
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      <span style={{ color: '#4a5568' }}>Style Fit: </span>{aiFeedback.style_fit}
                    </div>
                  )}
                </div>
              )}

              {onSendMessage && (
                <button
                  onClick={() => onSendMessage(`Based on my trading plan (${styleInfo?.label}, ${plan?.markets.join('/')} markets, ${plan?.risk_per_trade_pct}% risk per trade, ${plan?.stop_loss_pct ? plan.stop_loss_pct + '% stop' : 'no defined stop'}), what are the most important improvements I should make, and what historical market environments would have challenged this plan the most?`)}
                  style={{ marginTop: '12px', padding: '8px 14px', borderRadius: '7px', border: '1px solid #1e3a5f', background: '#0a1628', color: '#93c5fd', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <BookOpen size={12} /> Discuss this plan with the Council →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function PlanCard({ title, icon: Icon, color, children }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode
}) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid #1e2130', background: '#080a0f' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
        <Icon size={13} style={{ color }} />
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function PlanRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #0f1117' }}>
      <span style={{ fontSize: '12px', color: '#4a5568' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: highlight ? 700 : 500, color: highlight ? '#7ec8a0' : '#a0aec0' }}>{value}</span>
    </div>
  )
}
