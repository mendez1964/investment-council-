'use client'

import { useState } from 'react'
import { useRouter } from '@/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  const supabase = createBrowserSupabaseClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setNeedsConfirmation(false)
    setLoading(true)

    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed') || error.code === 'email_not_confirmed') {
            setNeedsConfirmation(true)
            setError('Your email address has not been confirmed yet. Please check your inbox and click the confirmation link.')
          } else {
            setError(error.message)
          }
          return
        }
        router.push('/app')
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split('@')[0] },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) { setError(error.message); return }
        setMessage('Account created! Check your inbox for a confirmation link, then log in here.')
        setTab('login')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResendConfirmation() {
    if (!email) { setError('Enter your email address above first.'); return }
    setResendLoading(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResendLoading(false)
    if (error) setError(error.message)
    else setMessage('Confirmation email resent — check your inbox.')
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email address first.'); return }
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    if (error) setError(error.message)
    else setMessage('Password reset email sent.')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#0d1117',
    border: '1px solid #1e2130',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#e2e8f0',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
            Investment Council
          </div>
          <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '4px' }}>
            AI-powered investment research
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#0f1117',
          border: '1px solid #1e2130',
          borderRadius: '12px',
          padding: '28px',
        }}>
          {/* Tab toggle */}
          <div style={{
            display: 'flex',
            background: '#080a0f',
            border: '1px solid #1e2130',
            borderRadius: '8px',
            marginBottom: '24px',
            overflow: 'hidden',
          }}>
            {(['login', 'signup'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setMessage('') }}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: tab === t ? '#1a2744' : 'transparent',
                  border: 'none',
                  color: tab === t ? '#7ec8a0' : '#4a5568',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {tab === 'signup' && (
              <div>
                <label style={{ fontSize: '11px', color: '#4a5568', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: '11px', color: '#4a5568', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#4a5568', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{ fontSize: '13px', color: '#f87171', background: '#1a0a0a', border: '1px solid #3a1010', borderRadius: '6px', padding: '10px 12px' }}>
                {error}
              </div>
            )}

            {message && (
              <div style={{ fontSize: '13px', color: '#7ec8a0', background: '#0a1a10', border: '1px solid #1a3a20', borderRadius: '6px', padding: '10px 12px' }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#1a2744' : '#2d6a4f',
                border: 'none',
                borderRadius: '8px',
                padding: '11px',
                color: loading ? '#4a5568' : '#7ec8a0',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: loading ? 'default' : 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                marginTop: '4px',
              }}
            >
              {loading ? 'Please wait…' : tab === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>

          {needsConfirmation && (
            <button
              onClick={handleResendConfirmation}
              disabled={resendLoading}
              style={{
                background: 'none',
                border: '1px solid #1e2130',
                borderRadius: '6px',
                color: resendLoading ? '#4a5568' : '#7ec8a0',
                fontSize: '12px',
                cursor: resendLoading ? 'default' : 'pointer',
                fontFamily: 'inherit',
                marginTop: '10px',
                padding: '8px 12px',
                display: 'block',
                width: '100%',
                textAlign: 'center',
              }}
            >
              {resendLoading ? 'Sending…' : 'Resend confirmation email'}
            </button>
          )}

          {tab === 'login' && (
            <button
              onClick={handleForgotPassword}
              style={{
                background: 'none',
                border: 'none',
                color: '#4a5568',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginTop: '14px',
                display: 'block',
                width: '100%',
                textAlign: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#7ec8a0'}
              onMouseLeave={e => e.currentTarget.style.color = '#4a5568'}
            >
              Forgot password?
            </button>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#2d3748' }}>
          © Investment Council · For educational purposes only
        </div>
      </div>
    </div>
  )
}
