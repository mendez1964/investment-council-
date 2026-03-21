'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Article {
  id: number
  headline: string
  summary: string
  source: string
  url: string
  datetime: number
  ticker?: string
  category?: string
}

const SOURCE_COLORS: Record<string, string> = {
  'Reuters': '#f97316', 'Bloomberg': '#60a5fa', 'CNBC': '#fbbf24',
  'CNBC Markets': '#fbbf24', 'CNBC Crypto': '#f59e0b',
  'WSJ': '#e5e5e5', 'MarketWatch': '#4ade80', 'Seeking Alpha': '#a78bfa',
  'Yahoo Finance': '#818cf8', 'The Wall Street Journal': '#e5e5e5',
  "Barron's": '#34d399', 'Financial Times': '#fb923c',
}

const CATEGORIES = [
  { id: 'general', label: '📈 Market',  color: '#7ec8a0' },
  { id: 'crypto',  label: '₿ Crypto',   color: '#fbbf24' },
  { id: 'forex',   label: '💱 Forex',   color: '#60a5fa' },
  { id: 'merger',  label: '🤝 M&A',     color: '#a78bfa' },
]

function sourceColor(source: string) { return SOURCE_COLORS[source] ?? '#555' }

function timeAgo(unix: number): string {
  const diff = Math.floor(Date.now() / 1000) - unix
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NewsPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('general')
  const [activeTicker, setActiveTicker] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setArticles([])
    setActiveTicker(null)
    fetch(`/api/news?category=${category}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setArticles(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setArticles([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [category])

  const tickers = Array.from(new Set(articles.map(a => a.ticker).filter(Boolean))) as string[]

  const filtered = articles.filter(a => {
    if (activeTicker && a.ticker !== activeTicker) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return a.headline.toLowerCase().includes(q) || (a.summary ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const breaking = filtered.filter(a => Date.now() / 1000 - a.datetime < 1800)
  const rest = filtered.filter(a => Date.now() / 1000 - a.datetime >= 1800)

  const activeCat = CATEGORIES.find(c => c.id === category)!

  return (
    <div style={{ minHeight: '100vh', background: '#060606', color: '#e5e5e5', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #111', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '16px', background: '#080808', flexShrink: 0 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'transparent', border: '1px solid #1f1f1f', borderRadius: '6px', color: '#666', fontSize: '12px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ccc'}
          onMouseLeave={e => e.currentTarget.style.color = '#666'}
        >← Back</button>

        <div style={{ fontSize: '16px', fontWeight: 700 }}>📰 Market News</div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)}
              style={{
                padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '12px', fontWeight: 600,
                background: category === c.id ? '#141414' : 'transparent',
                color: category === c.id ? c.color : '#444',
              }}
            >{c.label}</button>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search headlines..."
            style={{
              background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: '7px',
              color: '#e5e5e5', fontSize: '12px', fontFamily: 'inherit',
              padding: '6px 14px 6px 32px', width: '220px', outline: 'none',
            }}
          />
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', opacity: 0.4 }}>🔍</span>
        </div>

        {!loading && (
          <div style={{ fontSize: '11px', color: '#2a2a2a' }}>{filtered.length} stories</div>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar: source + ticker filters */}
        <div style={{ width: '200px', minWidth: '200px', borderRight: '1px solid #0f0f0f', background: '#080808', overflowY: 'auto', padding: '20px 12px' }}>

          {/* Ticker chips */}
          {tickers.length > 0 && (
            <>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#2a2a2a', letterSpacing: '0.1em', marginBottom: '8px', paddingLeft: '4px' }}>TICKERS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '20px' }}>
                <button
                  onClick={() => setActiveTicker(null)}
                  style={{ padding: '5px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700, textAlign: 'left', background: activeTicker === null ? '#1a472a' : 'transparent', color: activeTicker === null ? '#7ec8a0' : '#555' }}
                >ALL</button>
                {tickers.map(t => (
                  <button key={t} onClick={() => setActiveTicker(activeTicker === t ? null : t)}
                    style={{ padding: '5px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700, textAlign: 'left', background: activeTicker === t ? '#111' : 'transparent', color: activeTicker === t ? '#e5e5e5' : '#555' }}
                  >{t}</button>
                ))}
              </div>
            </>
          )}

          {/* Source legend */}
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#2a2a2a', letterSpacing: '0.1em', marginBottom: '8px', paddingLeft: '4px' }}>SOURCES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Object.entries(SOURCE_COLORS).slice(0, 8).map(([src, color]) => (
              <div key={src} style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#3a3a3a' }}>{src}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main feed */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#444', fontSize: '14px' }}>Loading {activeCat.label} news...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#444', fontSize: '14px' }}>No stories found</div>
          ) : (
            <>
              {/* Breaking news */}
              {breaking.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#f87171', letterSpacing: '0.12em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#f87171', animation: 'blink 1s step-end infinite' }} />
                    BREAKING — LAST 30 MINUTES
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {breaking.map((a, i) => <ArticleCard key={a.id ?? i} article={a} isBreaking />)}
                  </div>
                </div>
              )}

              {/* Rest of articles */}
              {rest.length > 0 && (
                <div>
                  {breaking.length > 0 && (
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#2a2a2a', letterSpacing: '0.12em', marginBottom: '12px' }}>EARLIER TODAY</div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {rest.map((a, i) => <ArticleCard key={a.id ?? i} article={a} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ArticleCard({ article, isBreaking }: { article: Article; isBreaking?: boolean }) {
  return (
    <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <div
        style={{
          padding: '14px 16px', background: '#0a0a0a', borderRadius: '8px',
          borderLeft: isBreaking ? '3px solid #f87171' : '3px solid #111',
          cursor: 'pointer', transition: 'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#101010')}
        onMouseLeave={e => (e.currentTarget.style.background = '#0a0a0a')}
      >
        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
          {isBreaking && (
            <span style={{ fontSize: '8px', fontWeight: 800, color: '#f87171', background: '#2e0505', borderRadius: '3px', padding: '2px 6px', letterSpacing: '0.07em' }}>BREAKING</span>
          )}
          {article.ticker && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#7ec8a0', background: '#052e16', borderRadius: '3px', padding: '2px 6px' }}>{article.ticker}</span>
          )}
          <span style={{ fontSize: '11px', fontWeight: 600, color: sourceColor(article.source) }}>{article.source}</span>
          <span style={{ fontSize: '11px', color: '#2a2a2a', marginLeft: 'auto' }}>{timeAgo(article.datetime)}</span>
        </div>

        {/* Headline */}
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#d4d4d4', lineHeight: 1.5, marginBottom: article.summary ? '6px' : 0 }}>
          {article.headline}
        </div>

        {/* Summary */}
        {article.summary && (
          <div style={{ fontSize: '12px', color: '#4a4a4a', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {article.summary}
          </div>
        )}
      </div>
    </a>
  )
}
