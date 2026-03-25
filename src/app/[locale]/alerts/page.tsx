'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

type Channel = 'email' | 'sms' | 'push'

interface AlertChannels {
  email: boolean
  sms: boolean
  push: boolean
}

type ChannelPrefs = Record<string, AlertChannels>

const DEFAULT_CHANNELS: AlertChannels = { email: false, sms: false, push: false }

const ALERTS = [
  {
    key: 'guardian',
    label: 'IC Market Guardian',
    desc: 'AI monitors your holdings and alerts you to price-moving news',
    time: 'Triggered · As needed',
    emoji: '🛡️',
    tier: 'trader' as const,
  },
  {
    key: 'fear_greed_alerts',
    label: 'Fear & Greed Alerts',
    desc: 'Market sentiment hits extreme levels (≤20 or ≥80)',
    time: 'Triggered · As needed',
    emoji: '😱',
    tier: 'free' as const,
  },
  {
    key: 'daily_picks',
    label: 'AI Daily Picks',
    desc: 'Stock and crypto picks with bias, rationale, and entry price',
    time: '8:00 AM ET · Weekdays',
    emoji: '🤖',
    tier: 'trader' as const,
  },
  {
    key: 'options_trades',
    label: 'Options Trades',
    desc: '10 options setups with entry premium, stop loss, and target',
    time: '8:00 AM ET · Weekdays',
    emoji: '⚡',
    tier: 'pro' as const,
  },
  {
    key: 'morning_briefing_stocks',
    label: 'Stock Morning Briefing',
    desc: 'Pre-market overview, futures, key levels, and what to watch',
    time: '7:30 AM ET · Weekdays',
    emoji: '🌅',
    tier: 'trader' as const,
  },
  {
    key: 'morning_briefing_crypto',
    label: 'Crypto Morning Briefing',
    desc: 'Overnight BTC/ETH action, funding rates, and Asian session recap',
    time: '7:30 AM ET · Weekdays',
    emoji: '₿',
    tier: 'trader' as const,
  },
  {
    key: 'eod_recap_stocks',
    label: 'Stock End of Day Recap',
    desc: 'Market summary, movers, sector performance, and picks results',
    time: '4:30 PM ET · Weekdays',
    emoji: '🌆',
    tier: 'trader' as const,
  },
  {
    key: 'eod_recap_crypto',
    label: 'Crypto End of Day Recap',
    desc: 'Daily crypto performance, whale activity, and overnight levels',
    time: '8:00 PM ET · Daily',
    emoji: '🌙',
    tier: 'trader' as const,
  },
  {
    key: 'economic_calendar',
    label: 'Economic Calendar',
    desc: 'High-impact events tomorrow — CPI, FOMC, NFP, GDP',
    time: '6:00 PM ET · Night before',
    emoji: '🏦',
    tier: 'trader' as const,
  },
]

const CHANNEL_CONFIG: { key: Channel; label: string; icon: string; color: string; bg: string }[] = [
  { key: 'email', label: 'Email', icon: '📧', color: '#2563eb', bg: '#eff6ff' },
  { key: 'sms',   label: 'SMS',   icon: '💬', color: '#16a34a', bg: '#f0fdf4' },
  { key: 'push',  label: 'Push',  icon: '🔔', color: '#d97706', bg: '#fffbeb' },
]

function ChannelButton({
  channel, active, locked, onClick,
}: { channel: typeof CHANNEL_CONFIG[0]; active: boolean; locked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={() => { if (!locked) onClick() }}
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '4px 10px', borderRadius: '20px', border: '1px solid',
        fontSize: '11px', fontWeight: 600, cursor: locked ? 'default' : 'pointer',
        transition: 'all 0.15s', fontFamily: 'inherit',
        background: active ? channel.bg : '#f9fafb',
        borderColor: active ? channel.color : '#e4e4e7',
        color: active ? channel.color : '#9ca3af',
        opacity: locked ? 0.4 : 1,
      }}
    >
      <span style={{ fontSize: '12px' }}>{channel.icon}</span>
      {channel.label}
    </button>
  )
}

export default function AlertsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [channels, setChannels] = useState<ChannelPrefs>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userTier, setUserTier] = useState<'free' | 'trader' | 'pro'>('free')

  useEffect(() => {
    trackPageView('/alerts')
    fetch('/api/user/profile').then(r => r.json()).then(d => {
      if (d?.tier) setUserTier(d.tier)
      if (d?.email) {
        setEmail(d.email)
        loadPrefs(d.email)
      }
    }).catch(() => {})
  }, [])

  function isLocked(alertTier: 'free' | 'trader' | 'pro') {
    if (alertTier === 'free') return false
    if (alertTier === 'trader') return userTier === 'free'
    if (alertTier === 'pro') return userTier !== 'pro'
    return false
  }

  async function loadPrefs(e: string) {
    if (!e.includes('@')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/alerts/prefs?email=${encodeURIComponent(e)}`)
      const data = await res.json()
      if (data) {
        if (data.phone) setPhone(data.phone)
        setChannels(data.channels ?? {})
      }
    } catch {}
    setLoading(false)
  }

  function toggleChannel(alertKey: string, channel: Channel) {
    setChannels(prev => {
      const current = prev[alertKey] ?? { ...DEFAULT_CHANNELS }
      return { ...prev, [alertKey]: { ...current, [channel]: !current[channel] } }
    })
  }

  function getChannel(alertKey: string, channel: Channel): boolean {
    return channels[alertKey]?.[channel] ?? false
  }

  const needsPhone = ALERTS.some(a => getChannel(a.key, 'sms'))

  async function handleSave() {
    if (!email || !email.includes('@')) { setError('Please enter a valid email address'); return }
    if (needsPhone && !phone) { setError('Please enter your phone number for SMS alerts'); return }
    const hasOne = ALERTS.some(a => CHANNEL_CONFIG.some(c => getChannel(a.key, c.key)))
    if (!hasOne) { setError('Please select at least one alert'); return }
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/alerts/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, channels }),
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
          onClick={() => router.push('/app')}
          style={{ background: 'transparent', border: '1px solid #d4d4d8', borderRadius: '6px', color: '#555', fontSize: '12px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.color = '#111'}
          onMouseLeave={e => e.currentTarget.style.color = '#555'}
        >← Back</button>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>🔔 Alerts & Notifications</div>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>Choose what to get and how to receive it</div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Contact info */}
        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '20px 24px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111', marginBottom: '14px' }}>Where to reach you</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '6px' }}>📧 Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={e => loadPrefs(e.target.value)}
                placeholder="you@example.com"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #e4e4e7', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#111' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '6px' }}>
                💬 Phone number
                {needsPhone && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*required for SMS</span>}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', border: `1px solid ${needsPhone && !phone ? '#fca5a5' : '#e4e4e7'}`, fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#111' }}
              />
            </div>
          </div>
          {loading && <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '8px' }}>Loading your preferences...</div>}
        </div>

        {/* Channel legend */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {CHANNEL_CONFIG.map(c => (
            <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6b7280' }}>
              <span>{c.icon}</span><span>{c.label}</span>
            </div>
          ))}
          <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '4px' }}>— tap to enable per alert</span>
        </div>

        {/* Alerts list */}
        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>Choose Your Alerts</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Select which alerts you want and how to receive them</div>
          </div>

          {ALERTS.map((alert, i) => {
            const locked = isLocked(alert.tier)
            const anyActive = CHANNEL_CONFIG.some(c => getChannel(alert.key, c.key))
            return (
              <div
                key={alert.key}
                style={{
                  padding: '14px 20px',
                  borderBottom: i < ALERTS.length - 1 ? '1px solid #f9fafb' : 'none',
                  opacity: locked ? 0.45 : 1,
                  background: anyActive ? '#fafafa' : '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>{alert.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>{alert.label}</span>
                      {alert.tier === 'pro' && <span style={{ fontSize: '9px', fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '1px 6px', borderRadius: 4 }}>PRO</span>}
                      {alert.tier === 'trader' && userTier === 'free' && <span style={{ fontSize: '9px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '1px 6px', borderRadius: 4 }}>TRADER+</span>}
                      {locked && <span style={{ fontSize: '11px' }}>🔒</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>{alert.desc}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {CHANNEL_CONFIG.map(ch => (
                        <ChannelButton
                          key={ch.key}
                          channel={ch}
                          active={getChannel(alert.key, ch.key)}
                          locked={locked}
                          onClick={() => toggleChannel(alert.key, ch.key)}
                        />
                      ))}
                      <span style={{ fontSize: '10px', color: '#c4c4c4', marginLeft: '2px' }}>⏰ {alert.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Save */}
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
          {saved ? '✓ Preferences Saved' : saving ? 'Saving...' : 'Save Notification Preferences'}
        </button>

        <div style={{ marginTop: '16px', fontSize: '10px', color: '#9ca3af', textAlign: 'center', lineHeight: 1.6 }}>
          Email from alerts@investmentcouncil.io · SMS via Twilio · Standard messaging rates may apply · Not financial advice
        </div>
      </div>
    </div>
  )
}
