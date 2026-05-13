'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle,
  TrendingUp, Shield, Target, BarChart2, Zap, RefreshCw, BookOpen,
  Star, AlertCircle, Lightbulb, Award, X, Plus, Trash2, Clock,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TradingPlan {
  id: string
  plan_name: string
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
  created_at: string
}

type DraftPlan = Omit<TradingPlan, 'id' | 'ai_score' | 'ai_feedback' | 'ai_scored_at' | 'created_at'>

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
  'Breakout above resistance', 'Pullback to support', 'Moving average crossover',
  'RSI oversold bounce', 'MACD signal cross', 'Volume surge',
  'Gap and go', 'Earnings catalyst', 'Candlestick reversal pattern', 'Trend continuation setup',
]
const SIZING_METHODS = [
  { value: 'pct', label: '% of Account', desc: 'Risk a fixed % of your account per trade — most common' },
  { value: 'fixed', label: 'Fixed Dollar Amount', desc: 'Same dollar risk on every trade — simple and consistent' },
  { value: 'atr', label: 'ATR-Based', desc: 'Position size adjusts to current volatility — advanced' },
  { value: 'kelly', label: 'Kelly Criterion', desc: 'Size based on your edge and win rate — quantitative' },
]

const EMPTY_DRAFT: DraftPlan = {
  plan_name: '',
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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateShort(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
        style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', background: checked ? '#2d6a4f' : '#2d3748', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
      >
        <span style={{ position: 'absolute', top: '3px', left: checked ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: checked ? '#7ec8a0' : '#4a5568', transition: 'left 0.2s' }} />
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
          <button key={opt} onClick={() => onChange(active ? selected.filter(s => s !== opt) : [...selected, opt])}
            style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', background: active ? '#1a472a' : '#1a1f2e', border: `1px solid ${active ? '#2d6a4f' : '#262626'}`, color: active ? '#7ec8a0' : '#4a5568', transition: 'all 0.15s' }}
          >{opt}</button>
        )
      })}
    </div>
  )
}

function NumberInput({ label, value, onChange, min, max, step, suffix }: { label: string; value: number | null; onChange: (v: number) => void; min: number; max: number; step: number; suffix?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input type="number" value={value ?? ''} onChange={e => onChange(Number(e.target.value))} min={min} max={max} step={step}
          style={{ width: '90px', padding: '7px 10px', borderRadius: '7px', fontFamily: 'inherit', background: '#0f1117', border: '1px solid #2d3748', color: '#e2e8f0', fontSize: '14px', fontWeight: 600, outline: 'none' }}
        />
        {suffix && <span style={{ fontSize: '12px', color: '#4a5568' }}>{suffix}</span>}
      </div>
    </div>
  )
}

function PlanCard({ title, icon: Icon, color, children }: { title: string; icon: React.ElementType; color: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid #1e2130', background: '#080a0f' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
        <Icon size={13} style={{ color }} />
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{title}</span>
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
  const [plans, setPlans] = useState<TradingPlan[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftPlan>({ ...EMPTY_DRAFT })
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState<'view' | 'wizard'>('view')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')

  const selectedPlan = plans.find(p => p.id === selectedId) ?? plans[0] ?? null

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/trading-plan')
      const { plans: p } = await res.json()
      const list: TradingPlan[] = p ?? []
      setPlans(list)
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => { loadPlans() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load AI feedback when selected plan changes
  useEffect(() => {
    if (selectedPlan?.ai_feedback) {
      try { setAiFeedback(JSON.parse(selectedPlan.ai_feedback)) } catch { setAiFeedback(null) }
    } else {
      setAiFeedback(null)
    }
    setShowFeedback(false)
  }, [selectedPlan?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function startNewPlan(basePlan?: TradingPlan) {
    setDraft(basePlan ? {
      plan_name: '',
      trading_style: basePlan.trading_style,
      markets: basePlan.markets,
      timeframes: basePlan.timeframes,
      risk_per_trade_pct: basePlan.risk_per_trade_pct,
      max_daily_loss_pct: basePlan.max_daily_loss_pct,
      max_open_positions: basePlan.max_open_positions,
      max_position_size_pct: basePlan.max_position_size_pct,
      entry_criteria: basePlan.entry_criteria,
      entry_triggers: basePlan.entry_triggers,
      profit_target_pct: basePlan.profit_target_pct,
      stop_loss_pct: basePlan.stop_loss_pct,
      uses_trailing_stop: basePlan.uses_trailing_stop,
      exit_criteria: basePlan.exit_criteria,
      position_sizing_method: basePlan.position_sizing_method,
      preferred_sectors: basePlan.preferred_sectors,
      avoid_conditions: basePlan.avoid_conditions,
    } : { ...EMPTY_DRAFT })
    setStep(1)
    setMode('wizard')
  }

  async function savePlan() {
    setSaving(true)
    try {
      const res = await fetch('/api/trading-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, plan_name: nameInput.trim() }),
      })
      const { plan } = await res.json()
      if (plan) {
        setPlans(prev => [plan, ...prev])
        setSelectedId(plan.id)
        setMode('view')
        setNameInput('')
      }
    } finally {
      setSaving(false)
    }
  }

  async function analyzePlan(id: string) {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/trading-plan/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const { feedback } = await res.json()
      if (feedback) {
        setAiFeedback(feedback)
        setShowFeedback(true)
        // Refresh plans to get stored score
        const res2 = await fetch('/api/trading-plan')
        const { plans: p } = await res2.json()
        setPlans(p ?? [])
      }
    } finally {
      setAnalyzing(false)
    }
  }

  async function deletePlan(id: string) {
    await fetch('/api/trading-plan', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setPlans(prev => prev.filter(p => p.id !== id))
    if (selectedId === id) {
      const remaining = plans.filter(p => p.id !== id)
      setSelectedId(remaining[0]?.id ?? null)
    }
    setDeleteConfirm(null)
  }

  function update<K extends keyof DraftPlan>(key: K, value: DraftPlan[K]) {
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
  if (plans.length === 0 && mode === 'view') {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#0d2010', border: '1px solid #1a472a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <ClipboardList size={28} style={{ color: '#7ec8a0' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0', marginBottom: '12px' }}>You don't have a Trading Plan yet</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, marginBottom: '8px' }}>
            A trading plan is the single most important document a trader can have. It defines your rules before emotion gets involved.
          </p>
          <p style={{ fontSize: '13px', color: '#4a5568', lineHeight: 1.6, marginBottom: '28px' }}>
            Traders with written plans are statistically more consistent, less emotional, and recover from losses faster. Takes 5 minutes — Claude will score it and find any weaknesses.
          </p>
          <button onClick={() => startNewPlan()}
            style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: '#2d6a4f', color: '#7ec8a0', fontSize: '14px', fontWeight: 700 }}
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
                <div onClick={() => done && setStep(s.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '20px', background: done ? '#1a472a' : active ? '#0d2010' : '#0f0f0f', border: `1px solid ${done ? '#2d6a4f' : active ? '#2d6a4f' : '#1e2130'}`, color: done ? '#7ec8a0' : active ? '#7ec8a0' : '#3a4055', fontSize: '11px', fontWeight: 600, cursor: done ? 'pointer' : 'default' }}
                >
                  {done ? <CheckCircle2 size={12} /> : <Icon size={12} />}
                  {s.label}
                </div>
                {i < STEPS.length - 1 && <ChevronRight size={12} style={{ color: '#1e2130', flexShrink: 0 }} />}
              </div>
            )
          })}
        </div>

        <div style={{ maxWidth: '560px' }}>

          {/* Step 1: Style */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>What's your trading style?</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.5 }}>Be honest. Most traders fail by choosing a style that doesn't fit their schedule or personality.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {STYLES.map(s => {
                  const active = draft.trading_style === s.value
                  return (
                    <button key={s.value} onClick={() => update('trading_style', s.value as TradingPlan['trading_style'])}
                      style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '10px', background: active ? '#0d2010' : '#0f0f0f', border: `1px solid ${active ? '#2d6a4f' : '#1e2130'}`, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s' }}
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
              <Tip text="Match your timeframes to your style. Day traders use 1m–15m. Swing traders use 1h–1d. Position traders use 1d–1w." />
            </div>
          )}

          {/* Step 2: Risk */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>Risk rules</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.5 }}>Every professional trader has hard risk limits they never break. This is the most important section.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <NumberInput label="RISK PER TRADE" value={draft.risk_per_trade_pct} onChange={v => update('risk_per_trade_pct', v)} min={0.1} max={20} step={0.25} suffix="% of account" />
                <NumberInput label="MAX DAILY LOSS" value={draft.max_daily_loss_pct} onChange={v => update('max_daily_loss_pct', v)} min={0.5} max={30} step={0.5} suffix="% of account" />
                <NumberInput label="MAX OPEN POSITIONS" value={draft.max_open_positions} onChange={v => update('max_open_positions', v)} min={1} max={50} step={1} suffix="positions" />
                <NumberInput label="MAX POSITION SIZE" value={draft.max_position_size_pct} onChange={v => update('max_position_size_pct', v)} min={1} max={100} step={1} suffix="% of account" />
              </div>
              {draft.risk_per_trade_pct && draft.max_daily_loss_pct && (() => {
                const n = Math.floor(draft.max_daily_loss_pct / draft.risk_per_trade_pct)
                const ok = n >= 2
                return (
                  <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', borderRadius: '8px', background: ok ? '#0d2010' : '#1a0a00', border: `1px solid ${ok ? '#1a472a' : '#7c2d12'}` }}>
                    {ok ? <CheckCircle2 size={14} style={{ color: '#7ec8a0', flexShrink: 0, marginTop: '1px' }} /> : <AlertTriangle size={14} style={{ color: '#f97316', flexShrink: 0, marginTop: '1px' }} />}
                    <span style={{ fontSize: '12px', color: ok ? '#7ec8a0' : '#f97316', lineHeight: 1.5 }}>
                      {ok ? `At ${draft.risk_per_trade_pct}% per trade, you'd hit your daily max after ${n} consecutive losers — a reasonable buffer.`
                           : `Warning: you'd hit your daily max on the first or second loss. Increase your daily limit or reduce per-trade risk.`}
                    </span>
                  </div>
                )
              })()}
              <Tip text="Professionals typically risk 0.5–2% per trade. The daily max should be 2–3x your per-trade risk, giving room for a losing streak." />
            </div>
          )}

          {/* Step 3: Entries */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>Entry criteria</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.5 }}>Vague entries lead to emotional decisions. Define exactly what must be true before entering.</p>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '8px' }}>ENTRY TRIGGERS (select all that apply)</label>
                <MultiSelect options={ENTRY_TRIGGERS} selected={draft.entry_triggers} onChange={v => update('entry_triggers', v)} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '8px' }}>YOUR ENTRY CRITERIA (in your own words)</label>
                <textarea value={draft.entry_criteria} onChange={e => update('entry_criteria', e.target.value)}
                  placeholder="e.g. I only enter on a confirmed breakout above resistance with volume 1.5x the 20-day average. I wait for a 15m close above the level before entering."
                  rows={5} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontFamily: 'inherit', background: '#0a0a0a', border: '1px solid #2d3748', color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const }}
                />
              </div>
              <Tip text="The more specific your criteria, the fewer low-quality trades you'll take. 'Stocks going up' is not an entry criteria." />
            </div>
          )}

          {/* Step 4: Exits */}
          {step === 4 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>Exit rules</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.5 }}>Exits determine how much you make. Most traders define entries but wing exits — that's where profits leak.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <NumberInput label="PROFIT TARGET" value={draft.profit_target_pct} onChange={v => update('profit_target_pct', v)} min={0.5} max={100} step={0.5} suffix="% gain" />
                <NumberInput label="STOP LOSS" value={draft.stop_loss_pct} onChange={v => update('stop_loss_pct', v)} min={0.25} max={50} step={0.25} suffix="% loss" />
              </div>
              {draft.profit_target_pct && draft.stop_loss_pct && (
                <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#080a0f', border: '1px solid #1e2130', marginBottom: '20px' }}>
                  <span style={{ fontSize: '12px', color: '#4a5568' }}>Risk/Reward Ratio: </span>
                  <span style={{ fontSize: '15px', fontWeight: 700, marginLeft: '6px', color: (draft.profit_target_pct / draft.stop_loss_pct) >= 2 ? '#7ec8a0' : (draft.profit_target_pct / draft.stop_loss_pct) >= 1.5 ? '#fbbf24' : '#ef4444' }}>
                    1 : {(draft.profit_target_pct / draft.stop_loss_pct).toFixed(2)}
                  </span>
                  {(draft.profit_target_pct / draft.stop_loss_pct) < 1.5 && <span style={{ fontSize: '12px', color: '#f97316', marginLeft: '10px' }}>— Below 1.5:1 is a tough edge to maintain</span>}
                  {(draft.profit_target_pct / draft.stop_loss_pct) >= 2 && <span style={{ fontSize: '12px', color: '#7ec8a0', marginLeft: '10px' }}>— Solid. You only need to be right ~34% of the time.</span>}
                </div>
              )}
              <Toggle label="Use trailing stop to lock in profits" checked={draft.uses_trailing_stop} onChange={v => update('uses_trailing_stop', v)} />
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '8px' }}>EXIT CRITERIA (in your own words)</label>
                <textarea value={draft.exit_criteria} onChange={e => update('exit_criteria', e.target.value)}
                  placeholder="e.g. I take 50% at 2R and let the rest run with a trailing stop. I exit immediately if the stock closes below the entry candle's low."
                  rows={4} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontFamily: 'inherit', background: '#0a0a0a', border: '1px solid #2d3748', color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const }}
                />
              </div>
              <Tip text="Aim for a minimum 2:1 risk/reward. At 2:1, you only need to be right 34% of the time to be profitable." />
            </div>
          )}

          {/* Step 5: Sizing */}
          {step === 5 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>Position sizing method</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.5 }}>Position sizing turns your risk rules into actual share counts. It's separate from your entry signal.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {SIZING_METHODS.map(m => {
                  const active = draft.position_sizing_method === m.value
                  return (
                    <button key={m.value} onClick={() => update('position_sizing_method', m.value as TradingPlan['position_sizing_method'])}
                      style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '10px', background: active ? '#0d2010' : '#0f0f0f', border: `1px solid ${active ? '#2d6a4f' : '#1e2130'}`, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s' }}
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
              <Tip text="For most traders, % of account is the right starting point. Formula: Position Size = (Account × Risk%) ÷ (Entry − Stop Price)." />
            </div>
          )}

          {/* Step 6: Focus + Name */}
          {step === 6 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>Focus & filters</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.5 }}>Knowing when NOT to trade is as important as knowing when to trade.</p>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '10px' }}>PREFERRED SECTORS (optional)</label>
                <MultiSelect options={SECTOR_OPTIONS} selected={draft.preferred_sectors} onChange={v => update('preferred_sectors', v)} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '8px' }}>CONDITIONS TO AVOID</label>
                <textarea value={draft.avoid_conditions} onChange={e => update('avoid_conditions', e.target.value)}
                  placeholder="e.g. I don't trade the first 30 min after open. I step aside when VIX is above 30. I avoid earnings plays in unfamiliar names."
                  rows={4} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontFamily: 'inherit', background: '#0a0a0a', border: '1px solid #2d3748', color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const }}
                />
              </div>
              {/* Plan name */}
              <div style={{ borderTop: '1px solid #1e2130', paddingTop: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '8px' }}>NAME THIS VERSION (optional)</label>
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder={`e.g. "Q2 2026 Swing Plan" or leave blank for today's date`}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontFamily: 'inherit', background: '#0a0a0a', border: '1px solid #2d3748', color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const }}
                />
                <p style={{ fontSize: '11.5px', color: '#4a5568', marginTop: '6px', lineHeight: 1.5 }}>
                  Each save creates a new dated version — your full history is always preserved. You can look back and see how your plan has evolved.
                </p>
              </div>
              <Tip text="Defining what you avoid removes low-quality setups before emotion gets involved. 'I only trade when I have edge' is a complete filter." />
            </div>
          )}

        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '28px', maxWidth: '560px' }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', border: '1px solid #2d3748', background: 'transparent', color: '#a0aec0', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}
          {plans.length > 0 && step === 1 && (
            <button onClick={() => setMode('view')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', border: '1px solid #2d3748', background: 'transparent', color: '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <X size={14} /> Cancel
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 6 ? (
            <button onClick={() => setStep(s => s + 1)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#2d6a4f', color: '#7ec8a0', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={savePlan} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#2d6a4f', color: '#7ec8a0', fontSize: '13px', fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}
            >
              <CheckCircle2 size={14} /> {saving ? 'Saving…' : 'Save Plan'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Plan view with history sidebar ──────────────────────────────────────────
  const styleInfo = STYLES.find(s => s.value === selectedPlan?.trading_style)

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

      {/* History sidebar */}
      <div style={{ width: '180px', minWidth: '180px', borderRight: '1px solid #1e2130', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #1e2130', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={12} style={{ color: '#4a5568' }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>History</span>
          </div>
          <button
            onClick={() => startNewPlan(selectedPlan ?? undefined)}
            title="Save new version"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '5px', border: '1px solid #2d6a4f', background: 'transparent', color: '#7ec8a0', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <Plus size={11} /> New
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {plans.map((p, i) => {
            const isActive = p.id === (selectedId ?? plans[0]?.id)
            return (
              <div key={p.id}
                onClick={() => setSelectedId(p.id)}
                style={{ padding: '10px 12px', borderBottom: '1px solid #0f1117', cursor: 'pointer', background: isActive ? '#0d2010' : 'transparent', borderLeft: `2px solid ${isActive ? '#2d6a4f' : 'transparent'}`, transition: 'all 0.12s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: isActive ? '#7ec8a0' : '#4a5568' }}>
                    {i === 0 ? '● CURRENT' : formatDateShort(p.created_at)}
                  </span>
                  {p.ai_score !== null && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: scoreColor(p.ai_score) }}>{p.ai_score}</span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: isActive ? '#a0aec0' : '#3a4055', lineHeight: 1.3 }}>
                  {p.plan_name || formatDate(p.created_at)}
                </div>
                <div style={{ fontSize: '11px', color: '#3a4055', marginTop: '2px' }}>
                  {STYLES.find(s => s.value === p.trading_style)?.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Plan detail */}
      {selectedPlan && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <ClipboardList size={16} style={{ color: '#7ec8a0' }} />
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                  {selectedPlan.plan_name || formatDate(selectedPlan.created_at)}
                </h2>
                {selectedPlan.ai_score !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', background: '#080a0f', border: `1px solid ${scoreColor(selectedPlan.ai_score)}44` }}>
                    <Award size={11} style={{ color: scoreColor(selectedPlan.ai_score) }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: scoreColor(selectedPlan.ai_score) }}>{selectedPlan.ai_score}/100</span>
                  </div>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#4a5568' }}>
                {styleInfo?.icon} {styleInfo?.label} · {selectedPlan.markets.join(', ')} · Saved {formatDate(selectedPlan.created_at)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setDeleteConfirm(selectedPlan.id) }}
                title="Delete this version"
                style={{ padding: '7px 10px', borderRadius: '7px', border: '1px solid #2d1515', background: 'transparent', color: '#6b3a3a', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Trash2 size={12} />
              </button>
              <button
                onClick={() => startNewPlan(selectedPlan)}
                style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #2d3748', background: 'transparent', color: '#a0aec0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Edit / New Version
              </button>
              <button
                onClick={() => analyzePlan(selectedPlan.id)}
                disabled={analyzing}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '7px', border: 'none', background: analyzing ? '#1a2a1f' : '#2d6a4f', color: '#7ec8a0', fontSize: '12px', fontWeight: 700, cursor: analyzing ? 'default' : 'pointer', fontFamily: 'inherit' }}
              >
                {analyzing ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={12} />}
                {analyzing ? 'Analyzing…' : selectedPlan.ai_score !== null ? 'Re-score' : 'Score Plan'}
              </button>
            </div>
          </div>

          {/* Delete confirm */}
          {deleteConfirm === selectedPlan.id && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#1a0a00', border: '1px solid #7c2d12', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: '#fdba74' }}>Delete this version? This cannot be undone.</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setDeleteConfirm(null)} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #2d3748', background: 'transparent', color: '#a0aec0', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={() => deletePlan(selectedPlan.id)} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#7c2d12', color: '#fdba74', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
              </div>
            </div>
          )}

          {/* Plan cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <PlanCard title="Risk Rules" icon={Shield} color="#ef4444">
              <PlanRow label="Risk per trade" value={`${selectedPlan.risk_per_trade_pct}%`} />
              <PlanRow label="Max daily loss" value={`${selectedPlan.max_daily_loss_pct}%`} />
              <PlanRow label="Max open positions" value={String(selectedPlan.max_open_positions)} />
              <PlanRow label="Max position size" value={`${selectedPlan.max_position_size_pct}%`} />
            </PlanCard>

            <PlanCard title="Entry Criteria" icon={Zap} color="#60a5fa">
              {selectedPlan.entry_triggers?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                  {selectedPlan.entry_triggers.map(t => (
                    <span key={t} style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', background: '#0a1628', border: '1px solid #1e3a5f', color: '#93c5fd' }}>{t}</span>
                  ))}
                </div>
              )}
              {selectedPlan.entry_criteria
                ? <p style={{ fontSize: '12px', color: '#a0aec0', lineHeight: 1.6, margin: 0 }}>{selectedPlan.entry_criteria}</p>
                : <span style={{ fontSize: '12px', color: '#3a4055', fontStyle: 'italic' }}>Not defined</span>
              }
            </PlanCard>

            <PlanCard title="Exit Rules" icon={Target} color="#7ec8a0">
              {selectedPlan.profit_target_pct && <PlanRow label="Profit target" value={`+${selectedPlan.profit_target_pct}%`} />}
              {selectedPlan.stop_loss_pct && <PlanRow label="Stop loss" value={`-${selectedPlan.stop_loss_pct}%`} />}
              {selectedPlan.profit_target_pct && selectedPlan.stop_loss_pct && (
                <PlanRow label="R:R ratio" value={`1 : ${(selectedPlan.profit_target_pct / selectedPlan.stop_loss_pct).toFixed(2)}`} highlight />
              )}
              <PlanRow label="Trailing stop" value={selectedPlan.uses_trailing_stop ? 'Yes' : 'No'} />
              {selectedPlan.exit_criteria && <p style={{ fontSize: '12px', color: '#a0aec0', lineHeight: 1.6, margin: '8px 0 0' }}>{selectedPlan.exit_criteria}</p>}
            </PlanCard>

            <PlanCard title="Position Sizing" icon={BarChart2} color="#fbbf24">
              <PlanRow label="Method" value={SIZING_METHODS.find(m => m.value === selectedPlan.position_sizing_method)?.label ?? ''} />
              <p style={{ fontSize: '11.5px', color: '#6b7280', lineHeight: 1.5, margin: '6px 0 0' }}>
                {SIZING_METHODS.find(m => m.value === selectedPlan.position_sizing_method)?.desc}
              </p>
            </PlanCard>

            {((selectedPlan.preferred_sectors?.length ?? 0) > 0 || selectedPlan.avoid_conditions) && (
              <PlanCard title="Focus & Filters" icon={BookOpen} color="#a78bfa">
                {selectedPlan.preferred_sectors?.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>PREFERRED SECTORS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {selectedPlan.preferred_sectors.map(s => (
                        <span key={s} style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', background: '#13101f', border: '1px solid #2e1f6a', color: '#a78bfa' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedPlan.avoid_conditions && <p style={{ fontSize: '12px', color: '#a0aec0', lineHeight: 1.6, margin: 0 }}>{selectedPlan.avoid_conditions}</p>}
              </PlanCard>
            )}
          </div>

          {/* AI Feedback */}
          {aiFeedback && (
            <div style={{ marginTop: '8px' }}>
              <button onClick={() => setShowFeedback(v => !v)}
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
                      {aiFeedback.risk_reward_ratio && <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}><span style={{ color: '#4a5568' }}>R:R Assessment: </span>{aiFeedback.risk_reward_ratio}</div>}
                      {aiFeedback.style_fit && <div style={{ fontSize: '12px', color: '#6b7280' }}><span style={{ color: '#4a5568' }}>Style Fit: </span>{aiFeedback.style_fit}</div>}
                    </div>
                  )}
                  {onSendMessage && (
                    <button
                      onClick={() => onSendMessage(`Based on my trading plan (${styleInfo?.label}, ${selectedPlan.markets.join('/')} markets, ${selectedPlan.risk_per_trade_pct}% risk per trade, ${selectedPlan.stop_loss_pct ? selectedPlan.stop_loss_pct + '% stop' : 'no defined stop'}), what are the most important improvements I should make, and what historical market environments would have challenged this plan the most?`)}
                      style={{ marginTop: '12px', padding: '8px 14px', borderRadius: '7px', border: '1px solid #1e3a5f', background: '#0a1628', color: '#93c5fd', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <BookOpen size={12} /> Discuss this plan with the Council →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
