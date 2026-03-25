'use client'

import { useState, useEffect, useCallback } from 'react'

interface Category {
  id: string
  name: string
  color: string
  sort_order: number
}

interface WatchlistStock {
  id: string
  ticker: string
  company_name: string | null
  category_id: string | null
  specialists: string[]
  setup_score: number
  last_alert_at: string | null
  last_alert_text: string | null
  added_at: string
  watchlist_categories: Category | null
}

interface Quote {
  ticker: string
  price: number
  change: number
  changePct: number
  prevClose: number
  isCrypto?: boolean
}

interface Alert {
  id: string
  ticker: string
  framework: string
  alert_type: string
  price: number
  setup_description: string
  signal_explanation: string
  confluence_count: number
  fired_at: string
  read_at: string | null
}

interface WatchlistTabProps {
  onSendMessage: (text: string) => void
  onSwitchToChat: () => void
}

// Market overview tickers always shown at top
const MARKET_OVERVIEW = ['SPY', 'QQQ', 'IWM', 'VIX']
const CRYPTO_OVERVIEW = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP']

const CRYPTO_TICKERS = new Set([
  'BTC','ETH','SOL','DOGE','XRP','ADA','AVAX','LINK','DOT','MATIC','LTC','BCH',
  'UNI','ATOM','FIL','NEAR','ARB','OP','INJ','SUI','APT','TIA','SEI','JUP',
  'HBAR','ALGO','XLM','TRX','VET','XMR','TON','SHIB','PEPE','WIF','BONK',
  'RENDER','GRT','IMX','LDO','AAVE','CRV','MKR','FET','FLOKI','BNB',
])

function pctColor(pct: number | null | undefined) {
  if (!pct) return '#888'
  return pct >= 0 ? '#2d6a4f' : '#c0392b'
}

function formatPct(pct: number | null | undefined) {
  if (pct == null) return '—'
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
}

function formatPrice(price: number | null | undefined, isCrypto = false) {
  if (!price) return '—'
  if (price >= 10000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (price >= 100) return `$${price.toFixed(2)}`
  if (price >= 1) return `$${price.toFixed(3)}`
  return `$${price.toFixed(5)}`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function frameworkColor(framework: string) {
  const colors: Record<string, string> = {
    'Tudor Jones': '#3498db',
    'Livermore': '#e67e22',
    'Buffett': '#2d6a4f',
    'Lynch': '#27ae60',
    'Graham': '#1a6b3c',
    'Grantham': '#8e44ad',
    'Dalio': '#2980b9',
    'Burry': '#c0392b',
    'Roubini': '#e74c3c',
    'Technical': '#95a5a6',
  }
  return colors[framework] || '#555'
}

function scoreColor(score: number) {
  if (score >= 7) return '#2d6a4f'
  if (score >= 4) return '#e67e22'
  return '#555'
}

export default function WatchlistTab({ onSendMessage, onSwitchToChat }: WatchlistTabProps) {
  const [stocks, setStocks] = useState<WatchlistStock[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [addInput, setAddInput] = useState('')
  const [bulkInput, setBulkInput] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [guardianTickers, setGuardianTickers] = useState<Set<string>>(new Set())

  function showStatus(msg: string) {
    setStatusMsg(msg)
    setTimeout(() => setStatusMsg(null), 4000)
  }

  const loadData = useCallback(async () => {
    try {
      const [stocksRes, catsRes, alertsRes] = await Promise.all([
        fetch('/api/watchlist', { cache: 'no-store' }),
        fetch('/api/watchlist/categories', { cache: 'no-store' }).catch(() => null),
        fetch('/api/alerts?limit=30', { cache: 'no-store' }),
      ])
      const stocksData = await stocksRes.json()
      const catsData = catsRes ? await catsRes.json() : []
      const alertsData = await alertsRes.json()
      setStocks(Array.isArray(stocksData) ? stocksData : [])
      setCategories(Array.isArray(catsData) ? catsData : [])
      setAlerts(Array.isArray(alertsData) ? alertsData : [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const loadQuotes = useCallback(async (stockList: WatchlistStock[]) => {
    setLoadingQuotes(true)
    const allTickers = Array.from(new Set([...MARKET_OVERVIEW, ...CRYPTO_OVERVIEW, ...stockList.map(s => s.ticker)]))
    try {
      const res = await fetch(`/api/watchlist/quotes?tickers=${allTickers.join(',')}`, { cache: 'no-store' })
      const data = await res.json()
      setQuotes(data)
    } catch { /* ignore */ }
    setLoadingQuotes(false)
  }, [])

  useEffect(() => {
    // Silently auto-assign any existing crypto tickers to the Crypto category, then load
    fetch('/api/watchlist/auto-categorize', { method: 'POST' })
      .catch(() => {})
      .finally(() => loadData())
    loadQuotes([]) // load market overview + crypto immediately

    // Fetch Guardian alerts to badge affected watchlist stocks
    fetch('/api/guardian', { cache: 'no-store' }).then(r => r.json()).then(d => {
      const tickers = new Set<string>((d.alerts ?? []).map((a: any) => a.ticker as string))
      setGuardianTickers(tickers)
    }).catch(() => {})

    // Reload data whenever the user comes back to this browser tab
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        loadData()
        fetch('/api/guardian', { cache: 'no-store' }).then(r => r.json()).then(d => {
          setGuardianTickers(new Set((d.alerts ?? []).map((a: any) => a.ticker as string)))
        }).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [loadData, loadQuotes])

  useEffect(() => {
    if (stocks.length > 0) loadQuotes(stocks)
  }, [stocks, loadQuotes])

  async function addStock(ticker: string) {
    const clean = ticker.trim().toUpperCase()
    if (!clean) return
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: clean }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showStatus(`✅ ${clean} added to watchlist`)
      setAddInput('')
      await loadData()
    } catch (e: any) {
      showStatus(`❌ ${e.message}`)
    }
  }

  async function bulkImport() {
    const tickers = bulkInput.split(/[,\s\n]+/).map(t => t.trim().toUpperCase()).filter(t => t.length > 0)
    let added = 0
    for (const ticker of tickers) {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      })
      const data = await res.json()
      if (!data.error) added++
    }
    showStatus(`✅ Added ${added} of ${tickers.length} stocks`)
    setBulkInput('')
    setShowBulk(false)
    await loadData()
  }

  async function removeStock(ticker: string) {
    await fetch(`/api/watchlist/${ticker}`, { method: 'DELETE' })
    setConfirmRemove(null)
    showStatus(`Removed ${ticker}`)
    await loadData()
  }

  async function updateCategory(ticker: string, categoryId: string | null) {
    await fetch(`/api/watchlist/${ticker}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: categoryId }),
    })
    await loadData()
  }

  async function markAlertsRead() {
    await fetch('/api/alerts', { method: 'PATCH' })
    setAlerts(prev => prev.map(a => ({ ...a, read_at: new Date().toISOString() })))
  }

  async function clearAllAlerts() {
    await fetch('/api/alerts', { method: 'PATCH' })
    setAlerts([])
    setShowAlerts(false)
  }

  function analyzeStock(ticker: string) {
    onSendMessage(`Give me a full council analysis of ${ticker} right now. Use all ten frameworks. Include current price data, technical levels, and what each specialist recommends.`)
    onSwitchToChat()
  }

  const filteredStocks = selectedCategory === 'all'
    ? stocks
    : stocks.filter(s => s.category_id === selectedCategory)

  const unreadCount = alerts.filter(a => !a.read_at).length

  // Sort by setup score descending
  const sortedStocks = [...filteredStocks].sort((a, b) => (b.setup_score || 0) - (a.setup_score || 0))

  const btn = (bg: string, color = '#ccc'): React.CSSProperties => ({
    background: bg, border: '1px solid transparent', borderRadius: '6px',
    padding: '5px 10px', color, fontSize: '11px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0a', overflow: 'hidden' }}>

      {/* ── Market Overview Row ── */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #1a1a1a', background: '#070707', display: 'flex', gap: '0', alignItems: 'stretch', flexDirection: 'column' }}>
        {/* Stocks row */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', paddingBottom: '6px' }}>
          <span style={{ fontSize: '10px', color: '#333', fontWeight: 700, letterSpacing: '0.08em', minWidth: '48px' }}>MARKET</span>
          {MARKET_OVERVIEW.map(ticker => {
            const q = quotes[ticker]
            return (
              <div key={ticker} style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                <span style={{ fontSize: '12px', color: '#888', fontWeight: 700 }}>{ticker}</span>
                {q ? (
                  <>
                    <span style={{ fontSize: '13px', color: '#d4d4d4', fontWeight: 600 }}>
                      {ticker === 'VIX' ? q.price?.toFixed(2) : `$${q.price?.toFixed(2)}`}
                    </span>
                    <span style={{ fontSize: '11px', color: pctColor(q.changePct), fontWeight: 600 }}>
                      {formatPct(q.changePct)}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '11px', color: '#333' }}>—</span>
                )}
              </div>
            )
          })}
          <div style={{ flex: 1 }} />
          {loadingQuotes && <span style={{ fontSize: '10px', color: '#333' }}>refreshing...</span>}
          <button onClick={() => loadQuotes(stocks)} style={btn('#111')}>↻ Refresh</button>
          <button
            onClick={() => { setShowAlerts(!showAlerts); if (!showAlerts) markAlertsRead() }}
            style={{ ...btn(showAlerts ? '#1a2a1a' : '#111', unreadCount > 0 ? '#e74c3c' : '#888'), position: 'relative' }}
          >
            🔔 Alerts {unreadCount > 0 && <span style={{ background: '#e74c3c', color: '#fff', borderRadius: '10px', padding: '1px 5px', fontSize: '10px', marginLeft: '4px' }}>{unreadCount}</span>}
          </button>
        </div>
        {/* Crypto row — click any coin to add/jump */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid #111' }}>
          <span style={{ fontSize: '10px', color: '#333', fontWeight: 700, letterSpacing: '0.08em', minWidth: '48px' }}>CRYPTO</span>
          {CRYPTO_OVERVIEW.map(ticker => {
            const q = quotes[ticker]
            const isOnWatchlist = stocks.some(s => s.ticker === ticker)
            return (
              <button
                key={ticker}
                onClick={() => {
                  if (isOnWatchlist) {
                    // Jump to crypto category
                    const cryptoCat = categories.find(c => c.name === 'Crypto')
                    if (cryptoCat) setSelectedCategory(cryptoCat.id)
                  } else {
                    addStock(ticker)
                  }
                }}
                title={isOnWatchlist ? `${ticker} is on your watchlist — click to view Crypto category` : `Add ${ticker} to watchlist`}
                style={{
                  display: 'flex', gap: '6px', alignItems: 'baseline',
                  background: isOnWatchlist ? '#1a1a0a' : 'transparent',
                  border: `1px solid ${isOnWatchlist ? '#f7931a44' : 'transparent'}`,
                  borderRadius: '6px', padding: '3px 8px',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: '12px', color: isOnWatchlist ? '#f7931a' : '#888', fontWeight: 700 }}>{ticker}</span>
                {q ? (
                  <>
                    <span style={{ fontSize: '13px', color: '#d4d4d4', fontWeight: 600 }}>
                      {formatPrice(q.price, true)}
                    </span>
                    <span style={{ fontSize: '11px', color: pctColor(q.changePct), fontWeight: 600 }}>
                      {formatPct(q.changePct)}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '11px', color: '#444' }}>+ Add</span>
                )}
              </button>
            )
          })}
          <span style={{ fontSize: '10px', color: '#2a2a2a', marginLeft: '4px' }}>click to add · tracked coins glow orange</span>
        </div>
      </div>

      {/* ── Alert Panel ── */}
      {showAlerts && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a', background: '#080808', maxHeight: '280px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: '#555', fontWeight: 700, letterSpacing: '0.06em' }}>
              RECENT ALERTS — {alerts.length === 0 ? 'none yet' : `${alerts.length} alerts`}
            </div>
            {alerts.length > 0 && (
              <button onClick={clearAllAlerts} style={{ ...btn('#1a0a0a', '#555'), fontSize: '10px', border: '1px solid #2a1a1a' }}>
                Clear All
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <div style={{ color: '#333', fontSize: '12px' }}>No alerts yet. The watcher will fire alerts here when setups are detected on your watchlist.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  style={{
                    background: alert.read_at ? '#0d0d0d' : '#0d1a10',
                    border: `1px solid ${alert.read_at ? '#1a1a1a' : '#1a3a20'}`,
                    borderRadius: '8px',
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ background: frameworkColor(alert.framework), color: '#fff', borderRadius: '4px', padding: '2px 7px', fontSize: '10px', fontWeight: 700 }}>
                      {alert.framework}
                    </span>
                    <span style={{ fontSize: '13px', color: '#e5e5e5', fontWeight: 700 }}>{alert.ticker}</span>
                    {alert.price && <span style={{ fontSize: '12px', color: '#888' }}>${alert.price.toFixed(2)}</span>}
                    {alert.confluence_count > 1 && (
                      <span style={{ background: '#e67e22', color: '#fff', borderRadius: '4px', padding: '2px 7px', fontSize: '10px', fontWeight: 700 }}>
                        CONFLUENCE ×{alert.confluence_count}
                      </span>
                    )}
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: '10px', color: '#444' }}>{timeAgo(alert.fired_at)}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '3px' }}>{alert.setup_description}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>{alert.signal_explanation}</div>
                  <button
                    onClick={() => analyzeStock(alert.ticker)}
                    style={{ ...btn('#1a472a', '#7ec8a0'), marginTop: '6px', fontSize: '10px' }}
                  >⚡ Full Council Analysis</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Add Stock ── */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={addInput}
          onChange={e => setAddInput(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === 'Enter') addStock(addInput) }}
          placeholder="Add ticker — MSFT or BTC, HBAR, SOL..."
          style={{ background: '#111', border: '1px solid #262626', borderRadius: '6px', padding: '5px 10px', color: '#e5e5e5', fontSize: '13px', width: '160px', outline: 'none', fontFamily: 'inherit', fontWeight: 600 }}
        />
        <button onClick={() => addStock(addInput)} disabled={!addInput.trim()} style={{ ...btn('#2d6a4f', '#fff'), opacity: addInput.trim() ? 1 : 0.4 }}>+ Add</button>
        <button onClick={() => setShowBulk(!showBulk)} style={btn('#111')}>Bulk Import ▾</button>
        {statusMsg && <span style={{ fontSize: '12px', color: statusMsg.startsWith('✅') ? '#2d6a4f' : '#c0392b', fontWeight: 600 }}>{statusMsg}</span>}
      </div>

      {/* ── Bulk Import ── */}
      {showBulk && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #1a1a1a', background: '#080808', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <textarea
            value={bulkInput}
            onChange={e => setBulkInput(e.target.value)}
            placeholder="Paste tickers separated by commas or spaces: AAPL, NVDA, TSLA, META, MSFT"
            rows={2}
            style={{ flex: 1, background: '#111', border: '1px solid #262626', borderRadius: '6px', padding: '8px', color: '#e5e5e5', fontSize: '13px', outline: 'none', fontFamily: 'inherit', resize: 'none' }}
          />
          <button onClick={bulkImport} disabled={!bulkInput.trim()} style={{ ...btn('#2d6a4f', '#fff'), opacity: bulkInput.trim() ? 1 : 0.4 }}>Import All</button>
          <button onClick={() => setShowBulk(false)} style={btn('#2a1010', '#ff8080')}>✕</button>
        </div>
      )}

      {/* ── Category Tabs ── */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '6px', alignItems: 'center', overflowX: 'auto' }}>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{ ...btn(selectedCategory === 'all' ? '#1a1a1a' : 'transparent', selectedCategory === 'all' ? '#e5e5e5' : '#555'), border: `1px solid ${selectedCategory === 'all' ? '#333' : 'transparent'}` }}
        >All ({stocks.length})</button>
        {categories.map(cat => {
          const count = stocks.filter(s => s.category_id === cat.id).length
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{ ...btn(selectedCategory === cat.id ? cat.color + '22' : 'transparent', selectedCategory === cat.id ? cat.color : '#555'), border: `1px solid ${selectedCategory === cat.id ? cat.color : 'transparent'}` }}
            >
              {cat.name} ({count})
            </button>
          )
        })}
      </div>

      {/* ── Guardian Badge ── */}
      <div style={{ padding: '6px 16px', background: '#070707', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px' }}>🛡️</span>
        <span style={{ fontSize: '10px', color: '#2a2a2a', fontWeight: 600, letterSpacing: '0.04em' }}>PROTECTED BY IC MARKET GUARDIAN</span>
        <span style={{ fontSize: '10px', color: '#1a1a1a' }}>· AI monitors your holdings 24/7 for price-moving news</span>
      </div>

      {/* ── Stock Grid ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {loading ? (
          <div style={{ color: '#444', fontSize: '13px' }}>Loading watchlist...</div>
        ) : sortedStocks.length === 0 ? (
          <div style={{ color: '#333', fontSize: '13px', textAlign: 'center', paddingTop: '40px' }}>
            No stocks in this category. Add a ticker above to get started.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {sortedStocks.map(stock => {
              const q = quotes[stock.ticker]
              const score = stock.setup_score || 0
              const cat = stock.watchlist_categories

              return (
                <div
                  key={stock.ticker}
                  style={{
                    background: '#0d0d0d',
                    border: `1px solid ${score >= 7 ? '#1a3a20' : '#1a1a1a'}`,
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {/* Ticker + Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: CRYPTO_TICKERS.has(stock.ticker) ? '#f7931a' : '#e5e5e5', letterSpacing: '-0.01em' }}>{stock.ticker}</span>
                    {guardianTickers.has(stock.ticker) && (
                      <span
                        title="IC Market Guardian: active alert on this holding"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          fontSize: '9px', fontWeight: 700,
                          color: '#C9A34E', background: '#1a1200',
                          border: '1px solid #C9A34E44',
                          borderRadius: '4px', padding: '1px 5px',
                          letterSpacing: '0.04em',
                        }}
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#C9A34E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        ALERT
                      </span>
                    )}
                    {CRYPTO_TICKERS.has(stock.ticker) && (
                      <span style={{ fontSize: '10px', color: '#f7931a', background: '#1a1000', border: '1px solid #f7931a33', borderRadius: '4px', padding: '1px 5px', fontWeight: 700 }}>CRYPTO</span>
                    )}
                    {q ? (
                      <>
                        <span style={{ fontSize: '14px', color: '#d4d4d4', fontWeight: 600 }}>{formatPrice(q.price, q.isCrypto)}</span>
                        <span style={{ fontSize: '12px', color: pctColor(q.changePct), fontWeight: 600 }}>{formatPct(q.changePct)}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#333' }}>loading...</span>
                    )}
                    <div style={{ flex: 1 }} />
                    {/* Setup score */}
                    <div style={{
                      background: scoreColor(score) + '22',
                      border: `1px solid ${scoreColor(score)}`,
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: scoreColor(score),
                    }}>
                      {score}/10
                    </div>
                  </div>

                  {/* Company name */}
                  {stock.company_name && (
                    <div style={{ fontSize: '11px', color: '#444' }}>{stock.company_name}</div>
                  )}

                  {/* Category + specialist badges */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {cat && (
                      <span style={{ background: cat.color + '22', color: cat.color, border: `1px solid ${cat.color}44`, borderRadius: '4px', padding: '2px 7px', fontSize: '10px', fontWeight: 600 }}>
                        {cat.name}
                      </span>
                    )}
                  </div>

                  {/* Last alert */}
                  {stock.last_alert_text && (
                    <div style={{ background: '#080808', border: '1px solid #1a2a1a', borderRadius: '6px', padding: '8px', fontSize: '11px', color: '#7ec8a0' }}>
                      <span style={{ color: '#444', display: 'block', marginBottom: '2px', fontSize: '10px' }}>
                        Last alert {stock.last_alert_at ? timeAgo(stock.last_alert_at) : ''}
                      </span>
                      {stock.last_alert_text.length > 80 ? stock.last_alert_text.slice(0, 80) + '...' : stock.last_alert_text}
                    </div>
                  )}

                  {/* Category selector */}
                  <select
                    value={stock.category_id || ''}
                    onChange={e => updateCategory(stock.ticker, e.target.value || null)}
                    style={{ background: '#111', border: '1px solid #222', borderRadius: '5px', padding: '4px 6px', color: '#666', fontSize: '10px', outline: 'none', fontFamily: 'inherit' }}
                  >
                    <option value="">No category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                    <button onClick={() => analyzeStock(stock.ticker)} style={{ ...btn('#1a472a', '#7ec8a0'), flex: 1, textAlign: 'center' }}>
                      ⚡ Analyze
                    </button>
                    {confirmRemove === stock.ticker ? (
                      <>
                        <button onClick={() => removeStock(stock.ticker)} style={btn('#c0392b', '#fff')}>Confirm Remove</button>
                        <button onClick={() => setConfirmRemove(null)} style={btn('#111')}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmRemove(stock.ticker)} style={btn('#1a1a1a', '#555')}>✕</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
