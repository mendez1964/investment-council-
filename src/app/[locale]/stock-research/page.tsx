'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

const STOCKS = [
  // Tech
  { symbol: 'AAPL',  name: 'Apple' },
  { symbol: 'NVDA',  name: 'NVIDIA' },
  { symbol: 'MSFT',  name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'META',  name: 'Meta' },
  { symbol: 'AMZN',  name: 'Amazon' },
  { symbol: 'TSLA',  name: 'Tesla' },
  { symbol: 'NFLX',  name: 'Netflix' },
  { symbol: 'AMD',   name: 'AMD' },
  { symbol: 'INTC',  name: 'Intel' },
  { symbol: 'ORCL',  name: 'Oracle' },
  { symbol: 'CRM',   name: 'Salesforce' },
  { symbol: 'ADBE',  name: 'Adobe' },
  { symbol: 'AVGO',  name: 'Broadcom' },
  // Finance
  { symbol: 'JPM',   name: 'JPMorgan' },
  { symbol: 'BAC',   name: 'Bank of America' },
  { symbol: 'GS',    name: 'Goldman Sachs' },
  { symbol: 'V',     name: 'Visa' },
  { symbol: 'MA',    name: 'Mastercard' },
  // Healthcare
  { symbol: 'JNJ',   name: 'Johnson & Johnson' },
  { symbol: 'UNH',   name: 'UnitedHealth' },
  { symbol: 'PFE',   name: 'Pfizer' },
  { symbol: 'ABBV',  name: 'AbbVie' },
  { symbol: 'LLY',   name: 'Eli Lilly' },
  // Energy
  { symbol: 'XOM',   name: 'ExxonMobil' },
  { symbol: 'CVX',   name: 'Chevron' },
  // Consumer
  { symbol: 'WMT',   name: 'Walmart' },
  { symbol: 'COST',  name: 'Costco' },
  { symbol: 'MCD',   name: 'McDonald\'s' },
  { symbol: 'NKE',   name: 'Nike' },
  { symbol: 'SBUX',  name: 'Starbucks' },
  // Industrial
  { symbol: 'BA',    name: 'Boeing' },
  { symbol: 'CAT',   name: 'Caterpillar' },
  { symbol: 'GE',    name: 'GE Aerospace' },
  // ETFs
  { symbol: 'SPY',   name: 'S&P 500 ETF' },
  { symbol: 'QQQ',   name: 'Nasdaq 100 ETF' },
  { symbol: 'IWM',   name: 'Russell 2000 ETF' },
]

interface StockData {
  ticker: string
  name: string
  sector: string | null
  exchange: string | null
  logo: string | null
  price: number
  change: number
  changePct: number
  high: number
  low: number
  open: number
  prevClose: number
  marketCap: number | null
  pe: number | null
  high52w: number | null
  low52w: number | null
  shortInterestPct: number | null
  dividendYield: number | null
  rsi14: number | null
  macdHistogram: number | null
  aboveSma20: boolean | null
  aboveSma50: boolean | null
  aboveSma200: boolean | null
  sma20: number | null
  sma50: number | null
  sma200: number | null
  volVsAvg: number | null
  signal: {
    direction: string
    confidence: number
    state: string
    drivers: string[]
    squeeze_setup: boolean
    score: number
  } | null
  news: Array<{
    headline: string
    summary: string
    impact_level: string
    impact_direction: string
    source: string
    created_at: string
  }>
}

const SIGNAL_COLORS: Record<string, string> = {
  BULLISH: '#16a34a', WEAK_BULLISH: '#84cc16',
  NEUTRAL: '#6b7280', WEAK_BEARISH: '#f59e0b', BEARISH: '#dc2626',
}
const STATE_COLORS: Record<string, string> = {
  Accumulation: '#2563eb', Distribution: '#f59e0b',
  Expansion: '#16a34a', Exhaustion: '#dc2626', Neutral: '#6b7280',
}

function fmtPrice(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtBig(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function StockResearchPage() {
  const router = useRouter()
  const [selectedTicker, setSelectedTicker] = useState('AAPL')
  const [customTicker, setCustomTicker] = useState('')
  const [data, setData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { trackPageView('/stock-research') }, [])

  useEffect(() => {
    setLoading(true)
    setData(null)
    fetch(`/api/stock/research?ticker=${selectedTicker}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedTicker])

  const filteredStocks = search.trim()
    ? STOCKS.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.symbol.toLowerCase().includes(search.toLowerCase())
      )
    : STOCKS

  const sigColor = data?.signal ? (SIGNAL_COLORS[data.signal.direction] ?? '#6b7280') : '#6b7280'
  const stateColor = data?.signal ? (STATE_COLORS[data.signal.state] ?? '#6b7280') : '#6b7280'

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault()
    const t = customTicker.trim().toUpperCase()
    if (t) { setSelectedTicker(t); setCustomTicker('') }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', color: '#111', fontFamily: 'inherit' }}>

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #e4e4e7', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '16px', background: '#fff' }}>
        <button
          onClick={() => router.push('/app')}
          style={{ background: 'transparent', border: '1px solid #d4d4d8', borderRadius: '6px', color: '#555', fontSize: '12px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Back
        </button>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>Stock Research</div>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>Per-stock intelligence · Signal + fundamentals + news</div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Stock selector */}
        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '16px 20px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '12px' }}>SELECT STOCK</div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search curated list */}
            <input
              type="text"
              placeholder="Search list..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: '1px solid #e4e4e7', borderRadius: '6px', padding: '7px 12px',
                fontSize: '13px', fontFamily: 'inherit', outline: 'none', width: '140px',
                color: '#111', background: '#fafafa',
              }}
            />
            {/* Dropdown */}
            <select
              value={STOCKS.find(s => s.symbol === selectedTicker) ? selectedTicker : ''}
              onChange={e => { setSelectedTicker(e.target.value); setSearch('') }}
              style={{
                border: '1px solid #e4e4e7', borderRadius: '6px', padding: '7px 12px',
                fontSize: '13px', fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
                color: '#111', background: '#fff', minWidth: '200px',
              }}
            >
              {filteredStocks.map(s => (
                <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>
              ))}
            </select>
            {/* Any ticker input */}
            <form onSubmit={handleCustomSubmit} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="Any ticker..."
                value={customTicker}
                onChange={e => setCustomTicker(e.target.value.toUpperCase())}
                style={{
                  border: '1px solid #e4e4e7', borderRadius: '6px', padding: '7px 12px',
                  fontSize: '13px', fontFamily: 'inherit', outline: 'none', width: '110px',
                  color: '#111', background: '#fafafa', textTransform: 'uppercase',
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#111', color: '#fff', border: 'none', borderRadius: '6px',
                  padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Go
              </button>
            </form>
            {/* Quick-select top 8 */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {STOCKS.slice(0, 8).map(s => (
                <button
                  key={s.symbol}
                  onClick={() => { setSelectedTicker(s.symbol); setSearch('') }}
                  style={{
                    border: `1px solid ${selectedTicker === s.symbol ? '#111' : '#e4e4e7'}`,
                    borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    background: selectedTicker === s.symbol ? '#111' : '#fff',
                    color: selectedTicker === s.symbol ? '#fff' : '#374151',
                  }}
                >
                  {s.symbol}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af', fontSize: '14px' }}>
            Loading {selectedTicker} data...
          </div>
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#dc2626', fontSize: '14px' }}>
            Could not load data for {selectedTicker}. Check the ticker and try again.
          </div>
        ) : (
          <>
            {/* Stock header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {data.logo && (
                <img
                  src={data.logo}
                  alt={data.ticker}
                  width={40} height={40}
                  style={{ borderRadius: '8px', border: '1px solid #e4e4e7', objectFit: 'contain', background: '#fff', padding: '2px' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#111' }}>{data.name}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {data.ticker}
                  {data.sector && <> · {data.sector}</>}
                  {data.exchange && <> · {data.exchange}</>}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#111', fontVariantNumeric: 'tabular-nums' }}>{fmtPrice(data.price)}</div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: data.changePct >= 0 ? '#16a34a' : '#dc2626' }}>
                    {data.change >= 0 ? '+' : ''}{fmtPrice(data.change)} ({data.changePct >= 0 ? '+' : ''}{data.changePct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Signal card */}
            {data.signal && (
              <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px 24px', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', marginBottom: '4px' }}>SIGNAL ENGINE</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>What the data says about {data.name} right now</div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px' }}>STATE</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: stateColor, background: `${stateColor}22`, borderRadius: '6px', padding: '3px 10px' }}>
                        {data.signal.state}
                      </div>
                    </div>
                    {data.signal.squeeze_setup && (
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', background: '#f59e0b22', borderRadius: '6px', padding: '4px 12px', border: '1px solid #f59e0b44' }}>
                        SQUEEZE SETUP
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: sigColor, letterSpacing: '-0.02em' }}>
                    {data.ticker}: {data.signal.direction.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>{data.signal.confidence}% confidence</div>
                </div>
                {data.signal.drivers.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '2px' }}>SIGNAL DRIVERS</div>
                    {data.signal.drivers.slice(0, 5).map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: sigColor, marginTop: '5px', flexShrink: 0 }} />
                        <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>{d}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stats grid — price + fundamentals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { label: 'Market Cap',      value: data.marketCap ? fmtBig(data.marketCap) : '—' },
                { label: 'P/E Ratio',       value: data.pe ? data.pe.toFixed(1) : '—' },
                { label: 'Day Range',       value: `${fmtPrice(data.low)} – ${fmtPrice(data.high)}` },
                { label: '52-Week Range',   value: data.high52w && data.low52w ? `${fmtPrice(data.low52w)} – ${fmtPrice(data.high52w)}` : '—' },
                { label: 'Short Interest',  value: data.shortInterestPct ? `${data.shortInterestPct.toFixed(1)}%` : '—' },
                { label: 'Dividend Yield',  value: data.dividendYield ? `${data.dividendYield.toFixed(2)}%` : '—' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '14px 18px' }}>
                  <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '6px' }}>{s.label.toUpperCase()}</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Technicals */}
            {(data.rsi14 != null || data.sma20 != null) && (
              <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '16px 20px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '14px' }}>TECHNICALS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {/* RSI */}
                  {data.rsi14 != null && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 700, marginBottom: '4px' }}>RSI (14)</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: data.rsi14 > 70 ? '#dc2626' : data.rsi14 < 30 ? '#16a34a' : '#111' }}>
                        {data.rsi14.toFixed(1)}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                        {data.rsi14 > 70 ? 'Overbought' : data.rsi14 < 30 ? 'Oversold' : 'Neutral'}
                      </div>
                    </div>
                  )}
                  {/* MACD */}
                  {data.macdHistogram != null && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 700, marginBottom: '4px' }}>MACD Histogram</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: data.macdHistogram > 0 ? '#16a34a' : '#dc2626' }}>
                        {data.macdHistogram > 0 ? '+' : ''}{data.macdHistogram.toFixed(3)}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                        {data.macdHistogram > 0 ? 'Bullish momentum' : 'Bearish momentum'}
                      </div>
                    </div>
                  )}
                  {/* Volume */}
                  {data.volVsAvg != null && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 700, marginBottom: '4px' }}>Volume vs Avg</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: data.volVsAvg > 1.5 ? '#7c3aed' : '#111' }}>
                        {data.volVsAvg.toFixed(2)}x
                      </div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                        {data.volVsAvg > 2 ? 'Very high volume' : data.volVsAvg > 1.2 ? 'Above average' : 'Normal volume'}
                      </div>
                    </div>
                  )}
                  {/* MAs */}
                  <div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 700, marginBottom: '6px' }}>MOVING AVERAGES</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {[
                        { label: 'SMA 20',  above: data.aboveSma20,  val: data.sma20  },
                        { label: 'SMA 50',  above: data.aboveSma50,  val: data.sma50  },
                        { label: 'SMA 200', above: data.aboveSma200, val: data.sma200 },
                      ].map(ma => (
                        ma.val != null && (
                          <div key={ma.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>{ma.label}</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: ma.above ? '#16a34a' : '#dc2626' }}>
                              {fmtPrice(ma.val)} {ma.above ? '▲' : '▼'}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* News */}
            {data.news.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '16px 20px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '12px' }}>
                  {data.ticker} NEWS · Last 72h
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data.news.map((n, i) => {
                    const impactColor = n.impact_level === 'high' ? '#dc2626' : n.impact_level === 'medium' ? '#f59e0b' : '#6b7280'
                    const dirColor = n.impact_direction === 'positive' ? '#16a34a' : n.impact_direction === 'negative' ? '#dc2626' : '#6b7280'
                    return (
                      <div key={i} style={{ borderBottom: i < data.news.length - 1 ? '1px solid #f4f4f5' : 'none', paddingBottom: i < data.news.length - 1 ? '12px' : '0' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 700, color: impactColor, background: `${impactColor}18`, borderRadius: '4px', padding: '2px 6px' }}>
                            {n.impact_level?.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '9px', fontWeight: 700, color: dirColor }}>{n.impact_direction?.toUpperCase()}</span>
                          <span style={{ fontSize: '9px', color: '#9ca3af', marginLeft: 'auto' }}>{timeAgo(n.created_at)} · {n.source}</span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111', marginBottom: '3px', lineHeight: 1.4 }}>{n.headline}</div>
                        {n.summary && <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.5 }}>{n.summary.slice(0, 180)}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Ask the Council */}
            <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', marginBottom: '4px' }}>Ask the Council about {data.name}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Get a full framework analysis with live data pre-loaded for {data.ticker}</div>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem('ic_pending_report', `Give me a full council analysis of ${data.ticker}`)
                  localStorage.setItem('ic_pending_report_name', `Council Analysis: ${data.ticker}`)
                  router.push('/app')
                }}
                style={{
                  background: '#111', color: '#fff', border: 'none', borderRadius: '8px',
                  padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                Open Council
              </button>
            </div>

            <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', paddingBottom: '8px' }}>
              Sources: Finnhub · Tradier · FINRA · Data may be delayed up to 5 min
            </div>
          </>
        )}
      </div>
    </div>
  )
}
