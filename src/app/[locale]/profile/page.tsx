'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/navigation'
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

  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tier = TIER_CONFIG[profile?.tier ?? 'free'] ?? TIER_CONFIG.free

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

        {/* API Keys */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '24px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 6px', letterSpacing: '-0.01em' }}>Your API Keys</h2>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 18px' }}>
            Add your own keys to use your accounts directly. Keys are stored encrypted and never shared.
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

          <div style={{ marginTop: 14, padding: '10px 12px', background: '#f9fafb', borderRadius: 8, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
            🔒 Keys are stored securely in your account. Leave blank to use Investment Council's shared keys.
          </div>
        </div>

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
          onClick={handleSignOut}
          style={{ width: '100%', padding: '12px', fontSize: 13, fontWeight: 600, color: '#dc2626', background: 'none', border: '1px solid #fca5a5', borderRadius: 10, cursor: 'pointer' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
