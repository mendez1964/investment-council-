'use client'

import { useState, useEffect } from 'react'

interface Article {
  id: number
  headline: string
  summary: string
  source: string
  url: string
  datetime: number
  image?: string
  ticker?: string
  category?: string
}

const SOURCE_COLORS: Record<string, string> = {
  'Reuters': '#f97316', 'Bloomberg': '#60a5fa', 'CNBC': '#fbbf24',
  'WSJ': '#e5e5e5', 'MarketWatch': '#4ade80', 'Seeking Alpha': '#a78bfa',
  'Yahoo Finance': '#818cf8', 'The Wall Street Journal': '#e5e5e5',
  'Barron\'s': '#34d399', 'Financial Times': '#fb923c',
}

function sourceColor(source: string): string {
  return SOURCE_COLORS[source] ?? '#555'
}

function timeAgo(unix: number): string {
  const diff = Math.floor(Date.now() / 1000) - unix
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const CATEGORIES = [
  { id: 'general', label: 'Market' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'forex', label: 'Forex' },
  { id: 'merger', label: 'M&A' },
]

export default function NewsFeed({ onClose, watchlistTickers = [] }: { onClose: () => void; watchlistTickers?: string[] }) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('general')
  const [activeTicker, setActiveTicker] = useState<string | null>(null)
  const [mode, setMode] = useState<'market' | 'watchlist'>('market')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setArticles([])
    const url = mode === 'watchlist' && watchlistTickers.length > 0
      ? `/api/news?tickers=${watchlistTickers.slice(0, 8).join(',')}`
      : `/api/news?category=${category}`
    fetch(url)
      .then(r => r.json())
      .then(data => { if (!cancelled) setArticles(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setArticles([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, mode])

  const filtered = activeTicker
    ? articles.filter(a => a.ticker === activeTicker)
    : articles

  const tickers = Array.from(new Set(articles.map(a => a.ticker).filter(Boolean))) as string[]

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111', border: '1px solid #222', borderRadius: '12px',
          padding: '22px 24px', width: '820px', maxWidth: '97vw', maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.9)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e5e5e5', flex: 1 }}>📰 Market News</div>
          {!loading && (
            <div style={{ fontSize: '10px', color: '#777', marginRight: '12px' }}>{filtered.length} stories</div>
          )}
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexShrink: 0 }}>
          <button
            onClick={() => { setMode('market'); setActiveTicker(null) }}
            style={{
              padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '11px', fontWeight: 600,
              background: mode === 'market' ? '#222' : 'transparent',
              color: mode === 'market' ? '#e5e5e5' : '#777',
            }}
          >Market News</button>
          {watchlistTickers.length > 0 && (
            <button
              onClick={() => { setMode('watchlist'); setActiveTicker(null) }}
              style={{
                padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '11px', fontWeight: 600,
                background: mode === 'watchlist' ? '#1a472a' : 'transparent',
                color: mode === 'watchlist' ? '#7ec8a0' : '#777',
              }}
            >My Watchlist ({watchlistTickers.length})</button>
          )}
        </div>

        {/* Category tabs (market mode only) */}
        {mode === 'market' && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexShrink: 0 }}>
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                style={{
                  padding: '4px 12px', borderRadius: '5px', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '11px', fontWeight: 500,
                  background: category === c.id ? '#222' : 'transparent',
                  color: category === c.id ? '#ccc' : '#777',
                }}
              >{c.label}</button>
            ))}
          </div>
        )}

        {/* Ticker filter chips (watchlist mode) */}
        {mode === 'watchlist' && tickers.length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px', flexShrink: 0 }}>
            <button
              onClick={() => setActiveTicker(null)}
              style={{
                padding: '3px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '10px', fontWeight: 700,
                background: activeTicker === null ? '#1a472a' : '#111',
                color: activeTicker === null ? '#7ec8a0' : '#444',
              }}
            >ALL</button>
            {tickers.map(t => (
              <button
                key={t}
                onClick={() => setActiveTicker(activeTicker === t ? null : t)}
                style={{
                  padding: '3px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '10px', fontWeight: 700,
                  background: activeTicker === t ? '#1a1a1a' : 'transparent',
                  color: activeTicker === t ? '#e5e5e5' : '#777',
                }}
              >{t}</button>
            ))}
          </div>
        )}

        {/* Articles */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#777', fontSize: '13px' }}>Loading news...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#777', fontSize: '13px' }}>No stories found</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {filtered.map((article, i) => {
                const isBreaking = Date.now() / 1000 - article.datetime < 1800
                return (
                  <a
                    key={article.id ?? i}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{
                      padding: '11px 14px',
                      background: '#141414',
                      borderRadius: '7px',
                      borderLeft: isBreaking ? '3px solid #f87171' : '3px solid transparent',
                      transition: 'background 0.1s',
                      cursor: 'pointer',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#141414')}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            {isBreaking && (
                              <span style={{ fontSize: '8px', fontWeight: 800, color: '#f87171', background: '#2e0505', borderRadius: '3px', padding: '1px 5px', letterSpacing: '0.07em' }}>BREAKING</span>
                            )}
                            {article.ticker && (
                              <span style={{ fontSize: '9px', fontWeight: 700, color: '#7ec8a0', background: '#052e16', borderRadius: '3px', padding: '1px 5px' }}>{article.ticker}</span>
                            )}
                            <span style={{ fontSize: '9px', fontWeight: 600, color: sourceColor(article.source) }}>{article.source}</span>
                            <span style={{ fontSize: '9px', color: '#666', marginLeft: 'auto' }}>{timeAgo(article.datetime)}</span>
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#d4d4d4', lineHeight: 1.45, marginBottom: '3px' }}>
                            {article.headline}
                          </div>
                          {article.summary && (
                            <div style={{ fontSize: '10px', color: '#888', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {article.summary}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
