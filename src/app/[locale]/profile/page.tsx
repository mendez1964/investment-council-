'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/navigation'
import { useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  free:   { label: 'Free',   color: '#6b7280', bg: '#f3f4f6' },
  trader: { label: 'Trader', color: '#2563eb', bg: '#eff6ff' },
  pro:    { label: 'Pro',    color: '#7c3aed', bg: '#f5f3ff' },
}

const AI_OPTIONS = [
  { id: 'claude',  label: 'Claude',  sub: 'Anthropic', icon: '⚡', color: '#d97706' },
  { id: 'chatgpt', label: 'ChatGPT', sub: 'OpenAI',    icon: '🟢', color: '#16a34a' },
  { id: 'gemini',  label: 'Gemini',  sub: 'Google',    icon: '✦',  color: '#2563eb' },
  { id: 'grok',    label: 'Grok',    sub: 'xAI',       icon: '✕',  color: '#7c3aed' },
]

const FEED_CATEGORIES = [
  {
    id: 'stock',
    label: 'Stock Market Data',
    icon: '📈',
    desc: 'Quotes, earnings, company profiles, market movers',
    providers: [
      { id: 'finnhub',      label: 'Finnhub',       sub: 'Real-time · 60 calls/min free',      url: 'finnhub.io',            placeholder: 'your-finnhub-key',        color: '#0ea5e9' },
      { id: 'alphavantage', label: 'Alpha Vantage', sub: 'Intraday · 25 calls/day free',        url: 'alphavantage.co',       placeholder: 'your-alphavantage-key',   color: '#16a34a' },
      { id: 'polygon',      label: 'Polygon.io',    sub: 'Institutional-grade · Free tier',     url: 'polygon.io',            placeholder: 'your-polygon-key',        color: '#7c3aed' },
      { id: 'benzinga',     label: 'Benzinga',      sub: 'News + quotes · Paid plans',          url: 'benzinga.com/apis',     placeholder: 'your-benzinga-key',       color: '#f97316' },
    ],
  },
  {
    id: 'crypto',
    label: 'Crypto Data',
    icon: '₿',
    desc: 'On-chain metrics, prices, market cap, volume',
    providers: [
      { id: 'glassnode',      label: 'Glassnode',      sub: 'On-chain metrics · $39/mo standard', url: 'glassnode.com',               placeholder: 'your-glassnode-key',        color: '#f97316' },
      { id: 'coinmarketcap',  label: 'CoinMarketCap',  sub: 'Prices + market cap · Free tier',    url: 'coinmarketcap.com/api',        placeholder: 'your-cmc-key',              color: '#2563eb' },
      { id: 'messari',        label: 'Messari',         sub: 'Research + fundamentals · Paid',     url: 'messari.io/api',               placeholder: 'your-messari-key',          color: '#7c3aed' },
      { id: 'coingecko',      label: 'CoinGecko',       sub: 'Prices + metadata · Free',           url: 'coingecko.com/api',            placeholder: 'your-coingecko-key',        color: '#16a34a' },
    ],
  },
  {
    id: 'options',
    label: 'Options Data',
    icon: '⚡',
    desc: 'Options chains, greeks, unusual flow, IV data',
    providers: [
      { id: 'tradier',           label: 'Tradier',          sub: 'Options chains + greeks · Brokerage', url: 'tradier.com',              placeholder: 'your-tradier-token',        color: '#8b5cf6' },
      { id: 'unusualwhales',     label: 'Unusual Whales',   sub: 'Unusual flow + dark pool · Paid',     url: 'unusualwhales.com',        placeholder: 'your-uw-key',               color: '#dc2626' },
      { id: 'marketchameleon',   label: 'Market Chameleon', sub: 'IV rank + screeners · Paid',          url: 'marketchameleon.com',      placeholder: 'your-mc-key',               color: '#d97706' },
      { id: 'cboe',              label: 'Cboe LiveVol',     sub: 'Professional options data · Paid',    url: 'datashop.cboe.com',        placeholder: 'your-cboe-key',             color: '#0ea5e9' },
    ],
  },
  {
    id: 'macro',
    label: 'Macro & Economic',
    icon: '🏦',
    desc: 'Interest rates, GDP, CPI, employment, global indicators',
    providers: [
      { id: 'fred',               label: 'FRED',              sub: 'Federal Reserve · Free',              url: 'fred.stlouisfed.org/docs/api', placeholder: 'your-fred-key',             color: '#dc2626' },
      { id: 'quandl',             label: 'NASDAQ Data Link',  sub: 'Macro datasets · Free + paid',        url: 'data.nasdaq.com',              placeholder: 'your-quandl-key',           color: '#2563eb' },
      { id: 'tradingeconomics',   label: 'Trading Economics', sub: '200+ countries · Paid plans',         url: 'tradingeconomics.com/api',     placeholder: 'your-te-key',               color: '#16a34a' },
      { id: 'intrinio',           label: 'Intrinio',          sub: 'Financial + macro · Paid plans',      url: 'intrinio.com',                 placeholder: 'your-intrinio-key',         color: '#7c3aed' },
    ],
  },
]

interface Profile {
  email: string
  display_name: string | null
  tier: string
  locale: string
  preferred_ai: string | null
  openai_key: string | null
  gemini_key: string | null
  grok_key: string | null
  anthropic_key: string | null
  trial_ends_at: string | null
  created_at: string | null
  stock_feed_provider: string | null
  stock_feed_key: string | null
  crypto_feed_provider: string | null
  crypto_feed_key: string | null
  options_feed_provider: string | null
  options_feed_key: string | null
  macro_feed_provider: string | null
  macro_feed_key: string | null
}

function MaskedInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 44px 10px 12px', fontSize: 13,
          border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none',
          fontFamily: 'monospace', background: '#fafafa', color: '#111',
          boxSizing: 'border-box',
        }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9ca3af' }}
      >
        {show ? '🙈' : '👁'}
      </button>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const feedRequestSuccess = searchParams?.get('feed_request') === 'success'
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [preferredAI, setPreferredAI] = useState('claude')
  const [openaiKey, setOpenaiKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [grokKey, setGrokKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')

  // Data feeds — provider selection + key per category
  const [stockProvider, setStockProvider] = useState('')
  const [stockKey, setStockKey] = useState('')
  const [cryptoProvider, setCryptoProvider] = useState('')
  const [cryptoKey, setCryptoKey] = useState('')
  const [optionsProvider, setOptionsProvider] = useState('')
  const [optionsKey, setOptionsKey] = useState('')
  const [macroProvider, setMacroProvider] = useState('')
  const [macroKey, setMacroKey] = useState('')

  // Custom feed request form
  const [reqOpen, setReqOpen] = useState(false)
  const [reqProvider, setReqProvider] = useState('')
  const [reqUrl, setReqUrl] = useState('')
  const [reqDetails, setReqDetails] = useState('')
  const [reqSubmitting, setReqSubmitting] = useState(false)
  const [reqError, setReqError] = useState('')

  // Referral
  const [refCode, setRefCode] = useState<string | null>(null)
  const [refStats, setRefStats] = useState<{ total: number; pending: number; converted: number } | null>(null)
  const [refCopied, setRefCopied] = useState(false)

  useEffect(() => {
    fetch('/api/referral')
      .then(r => r.json())
      .then(data => {
        if (data.code) setRefCode(data.code)
        if (data.stats) setRefStats(data.stats)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.push('/login'); return }
        setProfile(data)
        setDisplayName(data.display_name ?? '')
        setPreferredAI(data.preferred_ai ?? 'claude')
        setOpenaiKey(data.openai_key ?? '')
        setGeminiKey(data.gemini_key ?? '')
        setGrokKey(data.grok_key ?? '')
        setAnthropicKey(data.anthropic_key ?? '')
        setStockProvider(data.stock_feed_provider ?? '')
        setStockKey(data.stock_feed_key ?? '')
        setCryptoProvider(data.crypto_feed_provider ?? '')
        setCryptoKey(data.crypto_feed_key ?? '')
        setOptionsProvider(data.options_feed_provider ?? '')
        setOptionsKey(data.options_feed_key ?? '')
        setMacroProvider(data.macro_feed_provider ?? '')
        setMacroKey(data.macro_feed_key ?? '')
        setLoading(false)
      })
      .catch(() => { setError('Failed to load profile'); setLoading(false) })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName || null,
          preferred_ai: preferredAI,
          openai_key: openaiKey || null,
          gemini_key: geminiKey || null,
          grok_key: grokKey || null,
          anthropic_key: anthropicKey || null,
          stock_feed_provider: stockProvider || null,
          stock_feed_key: stockKey || null,
          crypto_feed_provider: cryptoProvider || null,
          crypto_feed_key: cryptoKey || null,
          options_feed_provider: optionsProvider || null,
          options_feed_key: optionsKey || null,
          macro_feed_provider: macroProvider || null,
          macro_feed_key: macroKey || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleFeedRequest = async () => {
    if (!reqProvider.trim() || !reqUrl.trim() || !reqDetails.trim()) {
      setReqError('Please fill in all fields')
      return
    }
    setReqError('')
    setReqSubmitting(true)
    try {
      const res = await fetch('/api/stripe/feed-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: reqProvider, url: reqUrl, details: reqDetails }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setReqError(data.error ?? 'Something went wrong')
      }
    } catch {
      setReqError('Failed to submit — please try again')
    }
    setReqSubmitting(false)
  }

  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tier = TIER_CONFIG[profile?.tier ?? 'free'] ?? TIER_CONFIG.free

  // 24-hour grace period countdown
  const signupTime = profile?.created_at ? new Date(profile.created_at).getTime() : null
  const gracePeriodEnds = signupTime ? signupTime + 24 * 60 * 60 * 1000 : null
  const now = Date.now()
  const inGracePeriod = gracePeriodEnds ? now < gracePeriodEnds : false
  const graceHoursLeft = gracePeriodEnds ? Math.max(0, Math.ceil((gracePeriodEnds - now) / 3_600_000)) : 0
  const hasAnyKey = !!(anthropicKey || openaiKey || geminiKey || grokKey)
  const trialExpired = !inGracePeriod && !hasAnyKey

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: '#9ca3af' }}>Loading profile…</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0, letterSpacing: '-0.02em' }}>My Profile</h1>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>{profile?.email}</p>
          </div>
          <button
            onClick={() => router.push('/app')}
            style={{ fontSize: 13, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}
          >
            ← Back to App
          </button>
        </div>

        {/* Feed request success banner */}
        {feedRequestSuccess && (
          <div style={{ marginBottom: 20, padding: '14px 16px', background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>✓ Request Received — Payment Confirmed</div>
            <div style={{ fontSize: 12, color: '#5b21b6', lineHeight: 1.5 }}>
              We'll integrate your requested data feed within 2–3 business days. We'll email you when it's ready.
            </div>
          </div>
        )}

        {/* Plan badge */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: tier.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20 }}>{'free' === profile?.tier ? '🆓' : profile?.tier === 'trader' ? '📈' : '👑'}</span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>
                <span style={{ color: tier.color, background: tier.bg, padding: '2px 10px', borderRadius: 20, fontSize: 13, fontWeight: 700, marginRight: 8 }}>{tier.label}</span>
                Plan
              </div>
              {profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date() && (
                <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 2 }}>
                  Trial ends {new Date(profile.trial_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              )}
            </div>
          </div>
          {profile?.tier === 'free' && (
            <button
              onClick={() => router.push('/app')}
              style={{ fontSize: 12, fontWeight: 700, background: '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}
            >
              Upgrade →
            </button>
          )}
          {(profile?.tier === 'trader' || profile?.tier === 'pro') && (
            <button
              onClick={async () => {
                const res = await fetch('/api/stripe/portal', { method: 'POST' })
                const data = await res.json()
                if (data.url) window.location.href = data.url
                else setError(data.error ?? 'Could not open billing portal')
              }}
              style={{ fontSize: 12, fontWeight: 700, background: 'transparent', color: tier.color, border: `1px solid ${tier.color}`, borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}
            >
              Manage Plan
            </button>
          )}
        </div>

        {/* Account info */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 18px', letterSpacing: '-0.01em' }}>Account</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>DISPLAY NAME</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>EMAIL</label>
            <div style={{ padding: '10px 12px', fontSize: 13, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, color: '#6b7280' }}>
              {profile?.email}
            </div>
          </div>
        </div>

        {/* Preferred AI */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 6px', letterSpacing: '-0.01em' }}>Preferred AI</h2>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>Used as your default AI in the chat assistant.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {AI_OPTIONS.map(ai => {
              const active = preferredAI === ai.id
              return (
                <button
                  key={ai.id}
                  onClick={() => setPreferredAI(ai.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                    border: `2px solid ${active ? ai.color : '#e5e7eb'}`,
                    borderRadius: 10, background: active ? `${ai.color}10` : '#fafafa',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{ai.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? ai.color : '#374151' }}>{ai.label}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{ai.sub}</div>
                  </div>
                  {active && <span style={{ marginLeft: 'auto', fontSize: 16, color: ai.color }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Trial / key status banner */}
        {trialExpired && (
          <div style={{ marginBottom: 20, padding: '14px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>⚠️ Your free trial has ended</div>
            <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.5 }}>
              Add your own API key below to continue using the AI chat. Your keys are stored encrypted and never shared.
            </div>
          </div>
        )}
        {inGracePeriod && !hasAnyKey && (
          <div style={{ marginBottom: 20, padding: '14px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#b45309', marginBottom: 4 }}>⏱ {graceHoursLeft}h left on your free trial</div>
            <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>
              You're using Investment Council's shared Claude key. Add your own API key before your trial ends to keep unlimited access.
            </div>
          </div>
        )}
        {hasAnyKey && (
          <div style={{ marginBottom: 20, padding: '14px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>✓ Unlimited access active</div>
            <div style={{ fontSize: 12, color: '#14532d', lineHeight: 1.5 }}>
              You're using your own API key — unlimited queries, charged to your account.
            </div>
          </div>
        )}

        {/* API Keys */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '24px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 6px', letterSpacing: '-0.01em' }}>Your API Keys</h2>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 18px' }}>
            Add your own key for unlimited queries. Used directly with your chosen AI — Investment Council never sees your usage.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Anthropic (Claude)', key: 'anthropic_key', value: anthropicKey, setter: setAnthropicKey, placeholder: 'sk-ant-...', color: '#d97706' },
              { label: 'OpenAI (ChatGPT)', key: 'openai_key', value: openaiKey, setter: setOpenaiKey, placeholder: 'sk-...', color: '#16a34a' },
              { label: 'Google (Gemini)', key: 'gemini_key', value: geminiKey, setter: setGeminiKey, placeholder: 'AIza...', color: '#2563eb' },
              { label: 'xAI (Grok)', key: 'grok_key', value: grokKey, setter: setGrokKey, placeholder: 'xai-...', color: '#7c3aed' },
            ].map(field => (
              <div key={field.key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: field.color, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                  {field.label}
                </label>
                <MaskedInput value={field.value} onChange={field.setter} placeholder={field.placeholder} />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, padding: '10px 12px', background: '#f9fafb', borderRadius: 8, fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
            🔒 Keys are encrypted and stored securely. They never leave your account.<br />
            Get your key: <b>Claude</b> — console.anthropic.com &nbsp;·&nbsp; <b>ChatGPT</b> — platform.openai.com/api-keys &nbsp;·&nbsp; <b>Gemini</b> — aistudio.google.com/apikey &nbsp;·&nbsp; <b>Grok</b> — console.x.ai
          </div>
        </div>

        {/* Data Feeds */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '24px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Data Feeds</h2>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 8px' }}>
            Select your preferred provider for each data category and enter your API key. Leave blank to use our shared keys (may be rate-limited or delayed).
          </p>
          <div style={{ marginBottom: 18, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 11, color: '#92400e' }}>
            ⚠️ Shared keys are free tier — may have 15-min delays and rate limits. Your own key removes all restrictions.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { cat: FEED_CATEGORIES[0], provider: stockProvider,   setProvider: setStockProvider,   key: stockKey,   setKey: setStockKey },
              { cat: FEED_CATEGORIES[1], provider: cryptoProvider,  setProvider: setCryptoProvider,  key: cryptoKey,  setKey: setCryptoKey },
              { cat: FEED_CATEGORIES[2], provider: optionsProvider, setProvider: setOptionsProvider, key: optionsKey, setKey: setOptionsKey },
              { cat: FEED_CATEGORIES[3], provider: macroProvider,   setProvider: setMacroProvider,   key: macroKey,   setKey: setMacroKey },
            ].map(({ cat, provider, setProvider, key, setKey }) => {
              const selected = cat.providers.find(p => p.id === provider)
              return (
                <div key={cat.id} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}>{cat.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{cat.label}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{cat.desc}</div>
                    </div>
                  </div>

                  {/* Provider dropdown */}
                  <select
                    value={provider}
                    onChange={e => { setProvider(e.target.value); setKey('') }}
                    style={{
                      width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid #e5e7eb',
                      borderRadius: 8, outline: 'none', background: '#fafafa', color: '#111',
                      marginBottom: 10, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <option value=''>— Use Investment Council shared key —</option>
                    {cat.providers.map(p => (
                      <option key={p.id} value={p.id}>{p.label} · {p.sub}</option>
                    ))}
                  </select>

                  {/* Key input — shown only when provider selected */}
                  {selected && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: selected.color }}>{selected.label} API Key</span>
                        <a
                          href={`https://${selected.url}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          style={{ fontSize: 10, color: '#2563eb', textDecoration: 'none' }}
                        >
                          Get key → {selected.url}
                        </a>
                      </div>
                      <MaskedInput value={key} onChange={setKey} placeholder={selected.placeholder} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Custom feed request */}
          <div style={{ marginTop: 4 }}>
            {!reqOpen ? (
              <button
                onClick={() => setReqOpen(true)}
                style={{
                  width: '100%', padding: '11px', fontSize: 12, fontWeight: 700,
                  background: 'transparent', color: '#7c3aed',
                  border: '1.5px dashed #c4b5fd', borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'inherit', marginTop: 4,
                }}
              >
                + Request a Custom Integration — $49.99 one-time
              </button>
            ) : (
              <div style={{ marginTop: 4, padding: '16px', background: '#faf5ff', border: '1.5px solid #c4b5fd', borderRadius: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>Request Custom Data Feed Integration</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 14, lineHeight: 1.5 }}>
                  Don't see your preferred provider? We'll integrate it for a one-time $49.99 setup fee. Typically completed within 2–3 business days.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Provider Name *</label>
                    <input
                      value={reqProvider}
                      onChange={e => setReqProvider(e.target.value)}
                      placeholder="e.g. Bloomberg, Refinitiv, Interactive Brokers"
                      style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Provider Website *</label>
                    <input
                      value={reqUrl}
                      onChange={e => setReqUrl(e.target.value)}
                      placeholder="e.g. bloomberg.com/professional"
                      style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>What data do you need from this provider? *</label>
                    <textarea
                      value={reqDetails}
                      onChange={e => setReqDetails(e.target.value)}
                      placeholder="e.g. Real-time options flow, Level 2 data, custom earnings estimates..."
                      rows={3}
                      style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>

                {reqError && <div style={{ marginTop: 10, fontSize: 11, color: '#dc2626' }}>{reqError}</div>}

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={handleFeedRequest}
                    disabled={reqSubmitting}
                    style={{
                      flex: 1, padding: '11px', fontSize: 13, fontWeight: 700,
                      background: '#7c3aed', color: '#fff', border: 'none',
                      borderRadius: 8, cursor: reqSubmitting ? 'default' : 'pointer',
                      opacity: reqSubmitting ? 0.7 : 1, fontFamily: 'inherit',
                    }}
                  >
                    {reqSubmitting ? 'Redirecting…' : 'Submit & Pay $49.99 →'}
                  </button>
                  <button
                    onClick={() => { setReqOpen(false); setReqError('') }}
                    style={{ padding: '11px 16px', fontSize: 13, background: 'none', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, padding: '10px 12px', background: '#f9fafb', borderRadius: 8, fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
            🔒 Keys are encrypted and stored securely. Leave blank to use Investment Council's shared keys.
          </div>
        </div>

        {/* Refer a Friend */}
        {refCode && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '24px', marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Refer a Friend</h2>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>
              Share your link. When someone subscribes, they get <b>1 free month</b> — and so do you.
            </p>

            {/* Referral link */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{
                flex: 1, padding: '10px 12px', fontSize: 13, background: '#f9fafb',
                border: '1px solid #e5e7eb', borderRadius: 8, color: '#374151',
                fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                investmentcouncil.io?ref={refCode}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://www.investmentcouncil.io?ref=${refCode}`)
                  setRefCopied(true)
                  setTimeout(() => setRefCopied(false), 2000)
                }}
                style={{
                  padding: '10px 16px', fontSize: 12, fontWeight: 700,
                  background: refCopied ? '#16a34a' : '#111', color: '#fff',
                  border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'background 0.15s',
                }}
              >
                {refCopied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>

            {/* Stats */}
            {refStats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { label: 'Links Clicked',  value: refStats.total,     color: '#6b7280' },
                  { label: 'Subscribed',     value: refStats.converted, color: '#16a34a' },
                  { label: 'Pending',        value: refStats.pending,   color: '#f59e0b' },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center', padding: '12px 8px', background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 14, padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 12, color: '#15803d', lineHeight: 1.6 }}>
              Your referral code: <b style={{ fontFamily: 'monospace', letterSpacing: '0.08em' }}>{refCode}</b> — share it anywhere. Credits apply automatically on your next billing cycle.
            </div>
          </div>
        )}

        {/* Error / success */}
        {error && <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>{error}</div>}
        {saved && <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 13, color: '#16a34a' }}>✓ Profile saved successfully</div>}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '14px', fontSize: 15, fontWeight: 700,
            background: saving ? '#9ca3af' : '#111', color: '#fff',
            border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.01em', marginBottom: 12,
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        <button
          onClick={() => router.push('/contact')}
          style={{ width: '100%', padding: '12px', fontSize: 13, fontWeight: 600, color: '#2563eb', background: 'none', border: '1px solid #bfdbfe', borderRadius: 10, cursor: 'pointer', marginBottom: 8 }}
        >
          Contact Support
        </button>

        <button
          onClick={handleSignOut}
          style={{ width: '100%', padding: '12px', fontSize: 13, fontWeight: 600, color: '#dc2626', background: 'none', border: '1px solid #fca5a5', borderRadius: 10, cursor: 'pointer' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
