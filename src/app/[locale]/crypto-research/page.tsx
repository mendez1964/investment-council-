'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

// Curated coin list — CoinGecko ID, symbol, display name
const COINS = [
  { id: 'bitcoin',              symbol: 'BTC',    name: 'Bitcoin' },
  { id: 'ethereum',             symbol: 'ETH',    name: 'Ethereum' },
  { id: 'solana',               symbol: 'SOL',    name: 'Solana' },
  { id: 'ripple',               symbol: 'XRP',    name: 'XRP' },
  { id: 'cardano',              symbol: 'ADA',    name: 'Cardano' },
  { id: 'binancecoin',          symbol: 'BNB',    name: 'BNB' },
  { id: 'dogecoin',             symbol: 'DOGE',   name: 'Dogecoin' },
  { id: 'avalanche-2',          symbol: 'AVAX',   name: 'Avalanche' },
  { id: 'polkadot',             symbol: 'DOT',    name: 'Polkadot' },
  { id: 'chainlink',            symbol: 'LINK',   name: 'Chainlink' },
  { id: 'matic-network',        symbol: 'MATIC',  name: 'Polygon' },
  { id: 'litecoin',             symbol: 'LTC',    name: 'Litecoin' },
  { id: 'uniswap',              symbol: 'UNI',    name: 'Uniswap' },
  { id: 'cosmos',               symbol: 'ATOM',   name: 'Cosmos' },
  { id: 'arbitrum',             symbol: 'ARB',    name: 'Arbitrum' },
  { id: 'optimism',             symbol: 'OP',     name: 'Optimism' },
  { id: 'near',                 symbol: 'NEAR',   name: 'NEAR Protocol' },
  { id: 'filecoin',             symbol: 'FIL',    name: 'Filecoin' },
  { id: 'aptos',                symbol: 'APT',    name: 'Aptos' },
  { id: 'sui',                  symbol: 'SUI',    name: 'Sui' },
  { id: 'injective-protocol',   symbol: 'INJ',    name: 'Injective' },
  { id: 'celestia',             symbol: 'TIA',    name: 'Celestia' },
  { id: 'hedera-hashgraph',     symbol: 'HBAR',   name: 'Hedera' },
  { id: 'algorand',             symbol: 'ALGO',   name: 'Algorand' },
  { id: 'stellar',              symbol: 'XLM',    name: 'Stellar' },
  { id: 'tron',                 symbol: 'TRX',    name: 'Tron' },
  { id: 'vechain',              symbol: 'VET',    name: 'VeChain' },
  { id: 'the-open-network',     symbol: 'TON',    name: 'Toncoin' },
  { id: 'shiba-inu',            symbol: 'SHIB',   name: 'Shiba Inu' },
  { id: 'pepe',                 symbol: 'PEPE',   name: 'Pepe' },
  { id: 'dogwifcoin',           symbol: 'WIF',    name: 'dogwifhat' },
  { id: 'bonk',                 symbol: 'BONK',   name: 'Bonk' },
  { id: 'fetch-ai',             symbol: 'FET',    name: 'Fetch.ai' },
  { id: 'render-token',         symbol: 'RENDER', name: 'Render' },
  { id: 'the-graph',            symbol: 'GRT',    name: 'The Graph' },
  { id: 'immutable-x',          symbol: 'IMX',    name: 'Immutable X' },
  { id: 'lido-dao',             symbol: 'LDO',    name: 'Lido DAO' },
  { id: 'aave',                 symbol: 'AAVE',   name: 'Aave' },
  { id: 'curve-dao-token',      symbol: 'CRV',    name: 'Curve' },
  { id: 'maker',                symbol: 'MKR',    name: 'Maker' },
]

interface CoinData {
  id: string
  symbol: string
  name: string
  image: string
  price: number
  change24h: number
  change7d: number | null
  marketCap: number
  volume24h: number
  high24h: number
  low24h: number
  circulatingSupply: number
  ath: number
  athDate: string
  fundingRate: number | null
  fearGreed: { value: number; classification: string } | null
  signal: {
    direction: string
    confidence: number
    state: string
    drivers: string[]
    squeeze_setup: boolean
  }
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
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(8)}`
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

export default function CryptoResearchPage() {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState('bitcoin')
  const [data, setData] = useState<CoinData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { trackPageView('/crypto-research') }, [])

  useEffect(() => {
    setLoading(true)
    setData(null)
    fetch(`/api/crypto/coin?id=${selectedId}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedId])

  const filteredCoins = search.trim()
    ? COINS.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.symbol.toLowerCase().includes(search.toLowerCase())
      )
    : COINS

  const sigColor = data ? (SIGNAL_COLORS[data.signal.direction] ?? '#6b7280') : '#6b7280'
  const stateColor = data ? (STATE_COLORS[data.signal.state] ?? '#6b7280') : '#6b7280'
  const selectedCoin = COINS.find(c => c.id === selectedId)!

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
        <div style={{ fontSize: '16px', fontWeight: 700 }}>Crypto Research</div>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>Per-coin intelligence · Signal + data + news</div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Coin selector */}
        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '16px 20px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '12px' }}>SELECT COIN</div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search input */}
            <input
              type="text"
              placeholder="Search coin..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: '1px solid #e4e4e7', borderRadius: '6px', padding: '7px 12px',
                fontSize: '13px', fontFamily: 'inherit', outline: 'none', width: '160px',
                color: '#111', background: '#fafafa',
              }}
            />
            {/* Dropdown */}
            <select
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setSearch('') }}
              style={{
                border: '1px solid #e4e4e7', borderRadius: '6px', padding: '7px 12px',
                fontSize: '13px', fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
                color: '#111', background: '#fff', minWidth: '200px',
              }}
            >
              {filteredCoins.map(c => (
                <option key={c.id} value={c.id}>{c.symbol} — {c.name}</option>
              ))}
            </select>
            {/* Quick-select row for top 8 */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {COINS.slice(0, 8).map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedId(c.id); setSearch('') }}
                  style={{
                    border: `1px solid ${selectedId === c.id ? '#111' : '#e4e4e7'}`,
                    borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    background: selectedId === c.id ? '#111' : '#fff',
                    color: selectedId === c.id ? '#fff' : '#374151',
                  }}
                >
                  {c.symbol}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af', fontSize: '14px' }}>
            Loading {selectedCoin.name} data...
          </div>
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#dc2626', fontSize: '14px' }}>
            Could not load data for {selectedCoin.name}. Try again in a moment.
          </div>
        ) : (
          <>
            {/* Coin header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {data.image && <img src={data.image} alt={data.symbol} width={40} height={40} style={{ borderRadius: '50%' }} />}
              <div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#111' }}>{data.name}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>{data.symbol}</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#111', fontVariantNumeric: 'tabular-nums' }}>{fmtPrice(data.price)}</div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: data.change24h >= 0 ? '#16a34a' : '#dc2626' }}>
                    {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}% 24h
                  </span>
                  {data.change7d != null && (
                    <span style={{ fontSize: '13px', fontWeight: 700, color: data.change7d >= 0 ? '#16a34a' : '#dc2626' }}>
                      {data.change7d >= 0 ? '+' : ''}{data.change7d.toFixed(2)}% 7d
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Signal card */}
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
                  {data.symbol}: {data.signal.direction.replace('_', ' ')}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>{data.signal.confidence}% confidence</div>
              </div>
              {data.signal.drivers.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '2px' }}>SIGNAL DRIVERS</div>
                  {data.signal.drivers.slice(0, 4).map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: sigColor, marginTop: '5px', flexShrink: 0 }} />
                      <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>{d}</div>
                    </div>
                  ))}
                </div>
              )}
              {data.symbol === 'BTC' ? null : (
                <div style={{ marginTop: '14px', fontSize: '10px', color: '#475569', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                  Signal confidence is lower for altcoins — MVRV and exchange flow data require a paid on-chain data provider. Signal is driven by funding rate and market sentiment.
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { label: 'Market Cap', value: fmtBig(data.marketCap) },
                { label: '24h Volume', value: fmtBig(data.volume24h) },
                { label: '24h Range', value: `${fmtPrice(data.low24h)} – ${fmtPrice(data.high24h)}` },
                { label: 'Circulating Supply', value: data.circulatingSupply ? `${(data.circulatingSupply / 1e6).toFixed(2)}M ${data.symbol}` : '—' },
                { label: 'All-Time High', value: fmtPrice(data.ath) },
                { label: 'Fear & Greed', value: data.fearGreed ? `${data.fearGreed.value}/100 — ${data.fearGreed.classification}` : '—' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '14px 18px' }}>
                  <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '6px' }}>{s.label.toUpperCase()}</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Funding rate */}
            {data.fundingRate != null && (
              <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '16px 20px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '12px' }}>
                  PERPETUAL FUNDING RATE · Binance · Every 8h
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: data.fundingRate < 0 ? '#2563eb' : data.fundingRate > 0.05 ? '#dc2626' : '#f59e0b' }}>
                      {data.fundingRate >= 0 ? '+' : ''}{data.fundingRate.toFixed(4)}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                      {(data.fundingRate * 3 * 365).toFixed(1)}% annualized
                    </div>
                  </div>
                  <div style={{ flex: 1, fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
                    {data.fundingRate < -0.03
                      ? 'Shorts paying heavily — high squeeze risk. Smart money is betting against this and losing.'
                      : data.fundingRate < 0
                      ? 'Negative funding — shorts are paying longs. Squeeze conditions building.'
                      : data.fundingRate > 0.1
                      ? 'Extremely high positive funding — longs dangerously overleveraged. Correction risk elevated.'
                      : data.fundingRate > 0.05
                      ? 'High positive funding — overleveraged longs. Watch for long liquidation cascade.'
                      : data.fundingRate > 0.01
                      ? 'Slightly positive funding — longs paying shorts. Mild caution, market leaning long.'
                      : 'Funding near zero — balanced market, no strong leveraged directional bias.'}
                  </div>
                </div>
              </div>
            )}

            {/* News */}
            {data.news.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '16px 20px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '12px' }}>
                  {data.symbol} NEWS · Last 72h
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

            {/* Council button */}
            <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', marginBottom: '4px' }}>Ask the Council about {data.name}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Get a full framework analysis with live data pre-loaded for {data.symbol}</div>
              </div>
              <button
                onClick={() => router.push(`/app?q=Give+me+a+full+council+analysis+of+${data.symbol}`)}
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
              Sources: CoinGecko · Binance Futures · CoinMetrics (BTC) · Alternative.me · Data may be delayed up to 5 min
            </div>
          </>
        )}
      </div>
    </div>
  )
}
