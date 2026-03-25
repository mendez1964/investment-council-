'use client'

import { useState, useEffect, useCallback } from 'react'

interface GuardianAlert {
  id: string
  ticker: string
  asset_type: string
  headline: string
  source: string
  article_url: string | null
  published_at: string | null
  impact_level: 'high' | 'medium' | 'low'
  impact_direction: 'positive' | 'negative' | 'neutral'
  summary: string
  price_impact_est: string
  created_at: string
}

const IMPACT_COLOR = {
  high:   { bg: '#1a0505', border: '#7f1d1d', badge: '#ef4444', text: '#fca5a5' },
  medium: { bg: '#1a1100', border: '#78350f', badge: '#f59e0b', text: '#fcd34d' },
  low:    { bg: '#0a0a0a', border: '#1f1f1f', badge: '#6b7280', text: '#9ca3af' },
}

const DIRECTION_ICON = {
  positive: '▲',
  negative: '▼',
  neutral:  '●',
}

const DIRECTION_COLOR = {
  positive: '#4ade80',
  negative: '#f87171',
  neutral:  '#6b7280',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatNewsTime(iso: string | null, fallback: string) {
  const src = iso ?? fallback
  const date = new Date(src)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours > 48) {
    return { label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), stale: true }
  }
  return { label: timeAgo(src), stale: diffHours > 24 }
}

function ArticleModal({ alert, onClose }: { alert: GuardianAlert; onClose: () => void }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'paywall' | 'error'>('loading')
  const [articleText, setArticleText] = useState('')
  const [articleTitle, setArticleTitle] = useState('')
  const c = IMPACT_COLOR[alert.impact_level]
  const dirColor = DIRECTION_COLOR[alert.impact_direction]
  const dirIcon = DIRECTION_ICON[alert.impact_direction]

  useEffect(() => {
    if (!alert.article_url) {
      setStatus('error')
      return
    }
    fetch(`/api/news/fetch-article?url=${encodeURIComponent(alert.article_url)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error && !d.text) { setStatus('error'); return }
        if (d.paywall) { setStatus('paywall'); return }
        setArticleTitle(d.title || alert.headline)
        setArticleText(d.text || '')
        setStatus('ok')
      })
      .catch(() => setStatus('error'))
  }, [alert.article_url, alert.headline])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '660px',
          maxHeight: '88vh',
          background: '#0d0d0d',
          border: `1px solid #1f1f1f`,
          borderTop: `3px solid ${c.badge}`,
          borderRadius: '14px',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.95)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#e5e5e5' }}>{alert.ticker}</span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: c.badge, background: `${c.badge}20`, borderRadius: '3px', padding: '1px 5px' }}>
                  {alert.impact_level.toUpperCase()}
                </span>
                <span style={{ fontSize: '11px', color: dirColor, fontWeight: 700 }}>{dirIcon} {alert.impact_direction}</span>
                {alert.source && <span style={{ fontSize: '10px', color: '#444', fontWeight: 600 }}>{alert.source}</span>}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5e5e5', lineHeight: 1.5, marginBottom: '4px' }}>
                {alert.summary}
              </div>
              <div style={{ fontSize: '10px', color: '#444', fontStyle: 'italic', lineHeight: 1.4 }}>
                "{alert.headline}"
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', fontSize: '16px', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', lineHeight: 1, flexShrink: 0 }}
            >✕</button>
          </div>
        </div>

        {/* Article body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          {status === 'loading' && (
            <div style={{ textAlign: 'center', paddingTop: '40px', color: '#333', fontSize: '13px' }}>
              Loading article…
            </div>
          )}

          {status === 'ok' && (
            <>
              {articleTitle && articleTitle !== alert.headline && (
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#e5e5e5', lineHeight: 1.4, marginBottom: '16px' }}>
                  {articleTitle}
                </div>
              )}
              <div style={{ fontSize: '13px', color: '#aaa', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                {articleText}
              </div>
            </>
          )}

          {status === 'paywall' && (
            <div style={{ textAlign: 'center', paddingTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '28px' }}>🔒</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#e5e5e5' }}>Paywall — subscription required</div>
              <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.6, maxWidth: '300px' }}>
                This article is behind a paywall on {alert.source || 'the source site'}. The AI summary above is based on the full article text.
              </div>
            </div>
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'center', paddingTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '28px' }}>📰</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#e5e5e5' }}>Article unavailable</div>
              <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.6, maxWidth: '300px' }}>
                Could not load the article content. The AI summary above captures the key impact on your holding.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid #111', flexShrink: 0 }}>
          <div style={{ fontSize: '9px', color: '#2a2a2a', lineHeight: 1.5 }}>
            AI estimate at time of news: {alert.price_impact_est || '—'} · Verify current price before acting · Not financial advice
          </div>
        </div>
      </div>
    </div>
  )
}

function AlertCard({ alert, onClear }: { alert: GuardianAlert; onClear: (id: string) => void }) {
  const [hovered, setHovered] = useState(false)
  const [showArticle, setShowArticle] = useState(false)
  const c = IMPACT_COLOR[alert.impact_level]
  const dirColor = DIRECTION_COLOR[alert.impact_direction]
  const dirIcon = DIRECTION_ICON[alert.impact_direction]
  const newsTime = formatNewsTime(alert.published_at, alert.created_at)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? (c.bg === '#0a0a0a' ? '#111' : c.bg) : c.bg,
        border: `1px solid ${hovered ? c.badge : c.border}`,
        borderLeft: `3px solid ${c.badge}`,
        borderRadius: '8px', padding: hovered ? '14px 16px' : '12px 14px',
        marginBottom: '8px',
        opacity: newsTime.stale && !hovered ? 0.65 : 1,
        transition: 'all 0.2s ease',
        transform: hovered ? 'scale(1.015)' : 'scale(1)',
        boxShadow: hovered ? `0 4px 20px ${c.badge}30` : 'none',
        cursor: 'default',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: hovered ? '14px' : '12px', fontWeight: 800, color: '#e5e5e5', letterSpacing: '0.05em', transition: 'font-size 0.2s' }}>{alert.ticker}</span>
          <span style={{
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
            color: c.badge, background: `${c.badge}20`,
            borderRadius: '3px', padding: '1px 5px',
          }}>{alert.impact_level.toUpperCase()}</span>
          <span style={{ fontSize: '11px', color: dirColor, fontWeight: 700 }}>
            {dirIcon} {alert.impact_direction}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '9px', color: newsTime.stale ? '#ef4444' : '#666',
            fontWeight: newsTime.stale ? 700 : 400,
          }}>
            {newsTime.stale ? '⚠ ' : ''}News: {newsTime.label}
          </span>
          <button
            onClick={() => onClear(alert.id)}
            style={{ background: 'none', border: 'none', color: '#444', fontSize: '14px', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
          >✕</button>
        </div>
      </div>

      {/* AI Summary */}
      <div style={{ fontSize: hovered ? '13px' : '12px', color: '#e5e5e5', fontWeight: 600, marginBottom: '6px', lineHeight: 1.5, transition: 'font-size 0.2s' }}>
        {alert.summary}
      </div>

      {/* Headline — always readable, bigger on hover */}
      <div style={{ fontSize: hovered ? '11px' : '10px', color: hovered ? '#777' : '#555', lineHeight: 1.5, fontStyle: 'italic', marginBottom: '4px', transition: 'all 0.2s' }}>
        "{alert.headline}"
        {alert.source && <span style={{ color: hovered ? '#555' : '#333', marginLeft: '4px', fontStyle: 'normal', fontWeight: 600 }}>— {alert.source}</span>}
      </div>

      {/* Read article button — only shown when URL is available */}
      {alert.article_url && (
        <div style={{ marginBottom: '6px' }}>
          <button
            onClick={e => { e.stopPropagation(); setShowArticle(true) }}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: '10px', fontWeight: 600,
              color: hovered ? '#C9A34E' : '#555',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'color 0.2s',
            }}
          >
            📰 Read full article
          </button>
        </div>
      )}

      {showArticle && <ArticleModal alert={alert} onClose={() => setShowArticle(false)} />}

      {/* Price impact estimate — with strong disclaimer */}
      {alert.price_impact_est && (
        <div style={{ background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: '4px', padding: hovered ? '7px 10px' : '5px 8px', transition: 'padding 0.2s' }}>
          <div style={{ fontSize: hovered ? '11px' : '10px', color: dirColor, fontWeight: 700, transition: 'font-size 0.2s' }}>
            AI estimate at time of news: {alert.price_impact_est}
          </div>
          <div style={{ fontSize: hovered ? '10px' : '9px', color: hovered ? '#444' : '#333', marginTop: '2px', transition: 'all 0.2s' }}>
            Verify current price before acting · Not financial advice
          </div>
        </div>
      )}
    </div>
  )
}

export default function GuardianPanel() {
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<GuardianAlert[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<Record<string, 'smart' | 'everything'>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/guardian')
      if (!res.ok) return
      const d = await res.json()
      setAlerts(d.alerts ?? [])
      setUnread(d.unread ?? 0)
    } catch {}
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/guardian/settings')
      if (!res.ok) return
      const d = await res.json()
      const map: Record<string, 'smart' | 'everything'> = {}
      for (const s of d.settings ?? []) map[s.ticker] = s.mode
      setSettings(map)
    } catch {}
  }, [])

  useEffect(() => {
    load()
    loadSettings()
    // Refresh every 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [load, loadSettings])

  const clearAlert = async (id: string) => {
    setAlerts(prev => {
      const remaining = prev.filter(a => a.id !== id)
      window.dispatchEvent(new CustomEvent('guardian-alerts-changed', { detail: { tickers: remaining.map(a => a.ticker) } }))
      return remaining
    })
    setUnread(prev => Math.max(0, prev - 1))
    await fetch('/api/guardian', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  }

  const clearAll = async () => {
    setAlerts([])
    setUnread(0)
    window.dispatchEvent(new CustomEvent('guardian-alerts-changed', { detail: { tickers: [] } }))
    await fetch('/api/guardian', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clear_all: true }) })
  }

  const toggleMode = async (ticker: string) => {
    const current = settings[ticker] ?? 'smart'
    const next = current === 'smart' ? 'everything' : 'smart'
    setSettings(prev => ({ ...prev, [ticker]: next }))
    await fetch('/api/guardian/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, mode: next }),
    })
  }

  // Get unique tickers that have alerts
  const tickers = Array.from(new Set(alerts.map(a => a.ticker)))

  return (
    <>
      {/* Bell icon button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative',
          background: 'none', border: 'none',
          cursor: 'pointer', padding: '4px 6px',
          display: 'flex', alignItems: 'center',
        }}
        title="IC Market Guardian"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={unread > 0 ? '#C9A34E' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '0', right: '0',
            background: '#ef4444', color: '#fff',
            fontSize: '9px', fontWeight: 800,
            borderRadius: '50%', width: '14px', height: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Slide-in panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 900 }}
          />

          {/* Panel */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: '340px', maxWidth: '95vw',
            background: '#0d0d0d', borderLeft: '1px solid #1f1f1f',
            zIndex: 1000, display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 40px rgba(0,0,0,0.8)',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 18px 12px',
              borderBottom: '1px solid #111',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#C9A34E', letterSpacing: '0.05em' }}>
                    🛡️ IC MARKET GUARDIAN
                  </span>
                  {unread > 0 && (
                    <span style={{ fontSize: '9px', background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', borderRadius: '3px', padding: '1px 5px', fontWeight: 700 }}>
                      {unread} ACTIVE
                    </span>
                  )}
                </div>
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '18px', cursor: 'pointer', padding: '0 2px' }}>✕</button>
              </div>
              <div style={{ fontSize: '10px', color: '#333', letterSpacing: '0.03em' }}>
                Watches your portfolio while you live your life
              </div>

              {alerts.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{
                    marginTop: '10px', width: '100%',
                    background: '#111', border: '1px solid #1f1f1f',
                    borderRadius: '6px', padding: '6px',
                    color: '#555', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer', letterSpacing: '0.03em',
                  }}
                >
                  Clear All Alerts
                </button>
              )}
            </div>

            {/* Alert list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: '#333', fontSize: '12px', paddingTop: '40px' }}>Loading…</div>
              ) : alerts.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: '60px' }}>
                  <div style={{ fontSize: '28px', marginBottom: '12px' }}>🛡️</div>
                  <div style={{ fontSize: '13px', color: '#444', fontWeight: 600 }}>All clear</div>
                  <div style={{ fontSize: '11px', color: '#2a2a2a', marginTop: '6px', lineHeight: 1.5 }}>
                    No price-moving news on your holdings today
                  </div>
                </div>
              ) : (
                <>
                  {alerts.map(alert => (
                    <AlertCard key={alert.id} alert={alert} onClear={clearAlert} />
                  ))}
                </>
              )}
            </div>

            {/* Settings footer — per-ticker mode */}
            {tickers.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #111', flexShrink: 0 }}>
                <div style={{ fontSize: '9px', color: '#2a2a2a', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '8px' }}>
                  ALERT MODE PER TICKER
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {tickers.map(ticker => {
                    const mode = settings[ticker] ?? 'smart'
                    return (
                      <div key={ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: '#666', fontWeight: 600 }}>{ticker}</span>
                        <button
                          onClick={() => toggleMode(ticker)}
                          style={{
                            fontSize: '10px', fontWeight: 700,
                            background: mode === 'everything' ? '#1a1a00' : '#111',
                            color: mode === 'everything' ? '#fbbf24' : '#555',
                            border: `1px solid ${mode === 'everything' ? '#78350f' : '#1f1f1f'}`,
                            borderRadius: '4px', padding: '2px 8px', cursor: 'pointer',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {mode === 'everything' ? '★ EVERYTHING' : 'SMART'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ padding: '8px 16px 12px', borderTop: '1px solid #0a0a0a', flexShrink: 0 }}>
              <div style={{ fontSize: '9px', color: '#1a1a1a', lineHeight: 1.5 }}>
                Smart = price-moving news only · Everything = all news for that ticker
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
