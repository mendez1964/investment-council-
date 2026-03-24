'use client'

import { useState } from 'react'
import { useRouter } from '@/navigation'

export default function ContactPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to send')
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0, letterSpacing: '-0.02em' }}>Contact & Support</h1>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>We typically respond within 24 hours</p>
          </div>
          <button
            onClick={() => router.back()}
            style={{ fontSize: 13, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}
          >
            ← Back
          </button>
        </div>

        {/* Quick links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { icon: '📧', label: 'Email Us', sub: 'support@investmentcouncil.io', href: 'mailto:support@investmentcouncil.io' },
            { icon: '📄', label: 'Terms of Service', sub: 'Usage & billing terms', href: '/terms' },
            { icon: '🔒', label: 'Privacy Policy', sub: 'How we use your data', href: '/privacy' },
          ].map(item => (
            <a
              key={item.label}
              href={item.href}
              style={{
                display: 'block', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
                padding: '16px', textDecoration: 'none', textAlign: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#d1d5db')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.sub}</div>
            </a>
          ))}
        </div>

        {/* Contact form */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '28px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 6px' }}>Send a Message</h2>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 22px' }}>For billing issues, feature requests, bugs, or anything else.</p>

          {sent ? (
            <div style={{ padding: '20px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>Message sent!</div>
              <div style={{ fontSize: 13, color: '#4b5563' }}>We'll get back to you at {email} within 24 hours.</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>NAME</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>EMAIL</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>SUBJECT</label>
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="">Select a topic…</option>
                  <option value="billing">Billing / Subscription</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="api-key">API Key Issue</option>
                  <option value="account">Account Help</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>MESSAGE</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describe your issue or question…"
                  required
                  rows={5}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {error && (
                <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                style={{
                  width: '100%', padding: '13px', fontSize: 14, fontWeight: 700,
                  background: sending ? '#9ca3af' : '#111', color: '#fff',
                  border: 'none', borderRadius: 9, cursor: sending ? 'not-allowed' : 'pointer',
                }}
              >
                {sending ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}
