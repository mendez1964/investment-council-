'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

interface Prefs {
  morning_briefing_stocks: boolean
  morning_briefing_crypto: boolean
  eod_recap_stocks: boolean
  eod_recap_crypto: boolean
  daily_picks: boolean
  options_trades: boolean
  economic_calendar: boolean
  fear_greed_alerts: boolean
}

const DEFAULT_PREFS: Prefs = {
  morning_briefing_stocks: false,
  morning_briefing_crypto: false,
  eod_recap_stocks: false,
  eod_recap_crypto: false,
  daily_picks: false,
  options_trades: false,
  economic_calendar: false,
  fear_greed_alerts: false,
}

const ALERTS = [
  {
    key: 'daily_picks',
    label: 'AI Daily Picks',
    desc: 'Stock and crypto picks with bias, rationale, and entry price',
    time: '8:00 AM ET · Weekdays',
    emoji: '🤖',
  },
  {
    key: 'options_trades',
    label: 'Options Trades',
    desc: '10 options setups with entry premium, stop loss, and take profit',
    time: '8:00 AM ET · Weekdays',
    emoji: '⚡',
  },
  {
    key: 'morning_briefing_stocks',
    label: 'Stock Morning Briefing',
    desc: 'Pre-market overview, futures, key levels, and what to watch',
    time: '7:00 AM ET · Weekdays',
    emoji: '🌅',
  },
  {
    key: 'morning_briefing_crypto',
    label: 'Crypto Morning Briefing',
    desc: 'Overnight BTC/ETH action, funding rates, and Asian session recap',
    time: '7:00 AM ET · Daily',
    emoji: '₿',
  },
  {
    key: 'eod_recap_stocks',
    label: 'Stock End of Day Recap',
    desc: 'Market summary, movers, sector performance, and tomorrow\'s watch list',
    time: '5:00 PM ET · Weekdays',
    emoji: '🌆',
  },
  {
    key: 'eod_recap_crypto',
    label: 'Crypto End of Day Recap',
    desc: 'Daily crypto performance, whale activity, and overnight levels',
    time: '5:00 PM ET · Daily',
    emoji: '🌙',
  },
  {
    key: 'economic_calendar',
    label: 'Economic Calendar Events',
    desc: 'High-impact events scheduled for tomorrow — CPI, FOMC, NFP, GDP',
    time: '6:00 PM ET · Night before',
    emoji: '🏦',
  },
  {
    key: 'fear_greed_alerts',
    label: 'Extreme Fear & Greed Alerts',
    desc: 'Triggered when market sentiment hits extreme levels (≤20 or ≥80)',
    time: 'Triggered · As needed',
    emoji: '😱',
  },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '40px', height: '22px', borderRadius: '11px', cursor: 'pointer',
        background: checked ? '#16a34a' : '#d1d5db',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: '3px',
        left: checked ? '21px' : '3px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

export default function AlertsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { trackPageView('/alerts') }, [])

  async function loadPrefs(e: string) {
    if (!e.includes('@')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/email/subscribe?email=${encodeURIComponent(e)}`)
      const data = await res.json()
      if (data) {
        setPrefs({
          morning_briefing_stocks: data.morning_briefing_stocks ?? false,
          morning_briefing_crypto: data.morning_briefing_crypto ?? false,
          eod_recap_stocks: data.eod_recap_stocks ?? false,
          eod_recap_crypto: data.eod_recap_crypto ?? false,
          daily_picks: data.daily_picks ?? false,
          options_trades: data.options_trades ?? false,
          economic_calendar: data.economic_calendar ?? false,
          fear_greed_alerts: data.fear_greed_alerts ?? false,
        })
      }
    } catch {}
    setLoading(false)
  }

  async function handleSave() {
    if (!email || !email.includes('@')) { setError('Please enter a valid email address'); return }
    const hasOne = Object.values(prefs).some(Boolean)
    if (!hasOne) { setError('Please select at least one alert'); return }
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/email/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, prefs }),
      })
      const data = await res.json()
      if (data.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
      else setError(data.error ?? 'Something went wrong')
    } catch { setError('Failed to save — please try again') }
    setSaving(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', fontFamily: 'inherit', color: '#111' }}>
      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e4e4e7', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => router.push("/app")}
          style={{ background: 'transparent', border: '1px solid #d4d4d8', borderRadius: '6px', color: '#555', fontSize: '12px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.color = '#111'}
          onMouseLeave={e => e.currentTarget.style.color = '#555'}
        >← Back</button>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>🔔 Email Alerts</div>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>Get the market delivered to your inbox</div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px' }}>

        {/* Email input */}
        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '24px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111', marginBottom: '4px' }}>Your Email Address</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '12px' }}>We'll send your selected alerts here. No spam, unsubscribe anytime.</div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onBlur={e => loadPrefs(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '8px',
              border: '1px solid #e4e4e7', fontSize: '14px',
              fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              color: '#111',
            }}
          />
          {loading && <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '6px' }}>Loading your preferences...</div>}
        </div>

        {/* Alert toggles */}
        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>Choose Your Alerts</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Toggle on what you want delivered to your inbox</div>
          </div>
          {ALERTS.map((alert, i) => (
            <div
              key={alert.key}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '16px 20px',
                borderBottom: i < ALERTS.length - 1 ? '1px solid #f9fafb' : 'none',
              }}
            >
              <div style={{ fontSize: '20px', flexShrink: 0 }}>{alert.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111', marginBottom: '2px' }}>{alert.label}</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>{alert.desc}</div>
                <div style={{ fontSize: '10px', color: '#9ca3af' }}>⏰ {alert.time}</div>
              </div>
              <Toggle
                checked={prefs[alert.key as keyof Prefs]}
                onChange={v => setPrefs(prev => ({ ...prev, [alert.key]: v }))}
              />
            </div>
          ))}
        </div>

        {/* Save button */}
        {error && <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '10px', padding: '8px 12px', background: '#fee2e2', borderRadius: '6px' }}>{error}</div>}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '13px', borderRadius: '8px', border: 'none',
            background: saved ? '#16a34a' : '#111', color: '#fff',
            fontSize: '14px', fontWeight: 700, cursor: saving ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'background 0.2s',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saved ? '✓ Preferences Saved' : saving ? 'Saving...' : 'Save Alert Preferences'}
        </button>

        <div style={{ marginTop: '16px', fontSize: '10px', color: '#9ca3af', textAlign: 'center', lineHeight: 1.6 }}>
          Emails sent from alerts@investmentcouncil.io · Unsubscribe anytime from any email · Not financial advice
        </div>
      </div>
    </div>
  )
}
