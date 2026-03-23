'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Holding {
  id: string
  ticker: string
  company_name: string | null
  asset_type: 'stock' | 'crypto' | 'etf'
  shares: number
  avg_cost: number
  sector: string | null
  notes: string | null
  added_at: string
  // enriched
  currentPrice: number
  marketValue: number
  costBasis: number
  pnlDollar: number
  pnlPct: number
  dayChangePct: number
  dayChangeDollar: number
  isCrypto: boolean
}

interface PortfolioSummary {
  totalValue: number
  totalCost: number
  totalPnl: number
  totalPnlPct: number
  dayChange: number
  dayChangePct: number
}

interface EditState {
  id: string
  shares: string
  avg_cost: string
  notes: string
  company_name: string
  sector: string
}

interface PortfolioTabProps {
  onSendMessage: (text: string) => void
  onSwitchToChat: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDollar(n: number, decimals = 2): string {
  if (!isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `$${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
  if (abs >= 1) return `$${n.toFixed(decimals)}`
  return `$${n.toFixed(4)}`
}

function fmtPrice(price: number): string {
  if (!price) return '—'
  if (price >= 10_000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (price >= 100) return `$${price.toFixed(2)}`
  if (price >= 1) return `$${price.toFixed(3)}`
  return `$${price.toFixed(5)}`
}

function fmtPct(n: number): string {
  if (!isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

function fmtShares(n: number): string {
  if (n === Math.floor(n)) return n.toLocaleString('en-US')
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 })
}

function gainColor(n: number): string {
  if (n > 0) return '#4ade80'
  if (n < 0) return '#f87171'
  return '#888'
}

function gainBg(n: number): string {
  if (n > 0) return '#1a472a'
  if (n < 0) return '#7f1d1d'
  return '#1a1a1a'
}

function assetColor(type: string): string {
  if (type === 'crypto') return '#fbbf24'
  if (type === 'etf') return '#60a5fa'
  return '#4ade80'
}

function assetBg(type: string): string {
  if (type === 'crypto') return '#1a1200'
  if (type === 'etf') return '#0a1628'
  return '#0f2a1a'
}

function assetBorder(type: string): string {
  if (type === 'crypto') return '#fbbf2433'
  if (type === 'etf') return '#60a5fa33'
  return '#4ade8033'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      background: '#080808',
      border: '1px solid #1a1a1a',
      borderRadius: '10px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      minHeight: '180px',
    }}>
      {[80, 50, 100, 60, 70].map((w, i) => (
        <div
          key={i}
          style={{
            height: i === 0 ? '20px' : '12px',
            width: `${w}%`,
            background: '#111',
            borderRadius: '4px',
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PortfolioTab({ onSendMessage, onSwitchToChat }: PortfolioTabProps) {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  // Add form state
  const [addTicker, setAddTicker] = useState('')
  const [addShares, setAddShares] = useState('')
  const [addAvgCost, setAddAvgCost] = useState('')
  const [addAssetType, setAddAssetType] = useState<'stock' | 'crypto' | 'etf'>('stock')
  const [addSector, setAddSector] = useState('')
  const [addCompanyName, setAddCompanyName] = useState('')
  const [addSubmitting, setAddSubmitting] = useState(false)

  function showStatus(msg: string, duration = 4000) {
    setStatusMsg(msg)
    setTimeout(() => setStatusMsg(null), duration)
  }

  const loadPortfolio = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch('/api/portfolio')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setHoldings(Array.isArray(data.holdings) ? data.holdings : [])
      setSummary(data.summary ?? null)
    } catch (e: any) {
      showStatus(`Error loading portfolio: ${e.message}`)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadPortfolio()
  }, [loadPortfolio])

  // Auto-fetch company name, sector, and current price when ticker is typed
  useEffect(() => {
    if (!addTicker || addTicker.length < 2) return
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/portfolio/lookup?ticker=${addTicker}&type=${addAssetType}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.name && !addCompanyName) setAddCompanyName(data.name)
        if (data.sector && !addSector) setAddSector(data.sector)
        if (data.price && !addAvgCost) setAddAvgCost(String(data.price))
      } catch { /* ignore */ }
    }, 700)
    return () => clearTimeout(timer)
  }, [addTicker, addAssetType])

  async function addHolding() {
    if (!addTicker.trim() || !addShares) {
      showStatus('Ticker and shares are required')
      return
    }
    setAddSubmitting(true)
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: addTicker.trim().toUpperCase(),
          company_name: addCompanyName || null,
          asset_type: addAssetType,
          shares: Number(addShares),
          avg_cost: Number(addAvgCost),
          sector: addSector || null,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showStatus(`${addTicker.toUpperCase()} added to portfolio`)
      setAddTicker('')
      setAddShares('')
      setAddAvgCost('')
      setAddSector('')
      setAddCompanyName('')
      setAddAssetType('stock')
      await loadPortfolio(true)
    } catch (e: any) {
      showStatus(`Error: ${e.message}`)
    } finally {
      setAddSubmitting(false)
    }
  }

  async function removeHolding(id: string, ticker: string) {
    try {
      const res = await fetch(`/api/portfolio/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setConfirmRemove(null)
      showStatus(`${ticker} removed from portfolio`)
      await loadPortfolio(true)
    } catch (e: any) {
      showStatus(`Error: ${e.message}`)
    }
  }

  function startEdit(h: Holding) {
    setEditState({
      id: h.id,
      shares: String(h.shares),
      avg_cost: String(h.avg_cost),
      notes: h.notes || '',
      company_name: h.company_name || '',
      sector: h.sector || '',
    })
  }

  async function saveEdit() {
    if (!editState) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/portfolio/${editState.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shares: Number(editState.shares),
          avg_cost: Number(editState.avg_cost),
          notes: editState.notes || null,
          company_name: editState.company_name || null,
          sector: editState.sector || null,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEditState(null)
      showStatus('Position updated')
      await loadPortfolio(true)
    } catch (e: any) {
      showStatus(`Error: ${e.message}`)
    } finally {
      setEditSaving(false)
    }
  }

  function analyzeHolding(h: Holding) {
    const pnlDesc = h.pnlPct >= 0
      ? `up ${h.pnlPct.toFixed(1)}% (${fmtDollar(h.pnlDollar)})`
      : `down ${Math.abs(h.pnlPct).toFixed(1)}% (${fmtDollar(h.pnlDollar)})`
    onSendMessage(
      `Analyze ${h.ticker} in my portfolio. I hold ${fmtShares(h.shares)} shares at an avg cost of ${fmtDollar(h.avg_cost)}, currently ${pnlDesc}. Current price: ${fmtPrice(h.currentPrice)}. ` +
      `Give me a full council analysis: should I hold, add, trim, or exit this position? Use all relevant frameworks.`
    )
    onSwitchToChat()
  }

  // ── Allocation by asset type ──────────────────────────────────────────────
  const totalValue = summary?.totalValue ?? 0
  const allocationByType = (['stock', 'etf', 'crypto'] as const).map(type => {
    const typeHoldings = holdings.filter(h => h.asset_type === type)
    const value = typeHoldings.reduce((s, h) => s + h.marketValue, 0)
    const pct = totalValue > 0 ? (value / totalValue) * 100 : 0
    return { type, value, pct, count: typeHoldings.length }
  }).filter(a => a.count > 0)

  // ── Sorted holdings: best gainers first ──────────────────────────────────
  const sortedHoldings = [...holdings].sort((a, b) => b.marketValue - a.marketValue)

  // ── Shared input style ───────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: '#1c1c1c',
    border: '1px solid #3a3a3a',
    borderRadius: '6px',
    padding: '7px 10px',
    color: '#f0f0f0',
    fontSize: '12px',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box' as const,
  }

  const btn = (bg: string, color = '#ccc'): React.CSSProperties => ({
    background: bg,
    border: '1px solid transparent',
    borderRadius: '6px',
    padding: '5px 10px',
    color,
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
  })

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0a', overflow: 'hidden' }}>

      {/* ── Summary Header ─────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #1a1a1a',
        background: '#070707',
        display: 'flex',
        gap: '0',
        alignItems: 'stretch',
        flexWrap: 'wrap',
      }}>
        {/* Total Value */}
        <div style={{ paddingRight: '28px', borderRight: '1px solid #1a1a1a', marginRight: '28px' }}>
          <div style={{ fontSize: '10px', color: '#444', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>PORTFOLIO VALUE</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#e5e5e5', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {loading ? '—' : fmtDollar(totalValue)}
          </div>
        </div>

        {/* Total P&L */}
        <div style={{ paddingRight: '28px', borderRight: '1px solid #1a1a1a', marginRight: '28px' }}>
          <div style={{ fontSize: '10px', color: '#444', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>TOTAL P&L</div>
          {loading ? (
            <div style={{ fontSize: '18px', color: '#333' }}>—</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: gainColor(summary?.totalPnl ?? 0), letterSpacing: '-0.01em' }}>
                {summary && summary.totalPnl >= 0 ? '+' : ''}{fmtDollar(summary?.totalPnl ?? 0)}
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#fff',
                background: gainBg(summary?.totalPnlPct ?? 0),
                borderRadius: '4px',
                padding: '2px 7px',
              }}>
                {fmtPct(summary?.totalPnlPct ?? 0)}
              </span>
            </div>
          )}
        </div>

        {/* Day Change */}
        <div style={{ paddingRight: '28px', borderRight: '1px solid #1a1a1a', marginRight: '28px' }}>
          <div style={{ fontSize: '10px', color: '#444', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>TODAY</div>
          {loading ? (
            <div style={{ fontSize: '18px', color: '#333' }}>—</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: gainColor(summary?.dayChange ?? 0), letterSpacing: '-0.01em' }}>
                {summary && summary.dayChange >= 0 ? '+' : ''}{fmtDollar(summary?.dayChange ?? 0)}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: gainColor(summary?.dayChangePct ?? 0) }}>
                {fmtPct(summary?.dayChangePct ?? 0)}
              </span>
            </div>
          )}
        </div>

        {/* Cost Basis */}
        <div style={{ paddingRight: '28px' }}>
          <div style={{ fontSize: '10px', color: '#444', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>COST BASIS</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#888', letterSpacing: '-0.01em' }}>
            {loading ? '—' : fmtDollar(summary?.totalCost ?? 0)}
          </div>
        </div>

        {/* Spacer + refresh */}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {refreshing && <span style={{ fontSize: '10px', color: '#333' }}>refreshing...</span>}
          <button
            onClick={() => loadPortfolio()}
            style={btn('#111')}
          >
            ↻ Refresh
          </button>
          <div style={{ fontSize: '10px', color: '#2a2a2a' }}>{holdings.length} positions</div>
        </div>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Allocation bars ─────────────────────────────────────────── */}
        {!loading && holdings.length > 0 && (
          <div style={{
            background: '#080808',
            border: '1px solid #1a1a1a',
            borderRadius: '10px',
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: '10px', color: '#444', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '12px' }}>
              ALLOCATION BY ASSET TYPE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allocationByType.map(({ type, value, pct }) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '48px', fontSize: '10px', color: assetColor(type), fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {type}
                  </div>
                  <div style={{ flex: 1, height: '8px', background: '#111', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.max(pct, 0.5)}%`,
                      background: assetColor(type),
                      borderRadius: '4px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{ width: '44px', fontSize: '11px', color: '#888', textAlign: 'right', fontWeight: 600 }}>
                    {pct.toFixed(1)}%
                  </div>
                  <div style={{ width: '80px', fontSize: '11px', color: '#555', textAlign: 'right' }}>
                    {fmtDollar(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Holdings grid ────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : holdings.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            color: '#333',
            gap: '12px',
          }}>
            <div style={{ fontSize: '32px' }}>📊</div>
            <div style={{ fontSize: '15px', color: '#444', fontWeight: 600 }}>No holdings yet.</div>
            <div style={{ fontSize: '13px', color: '#333' }}>Add your first position below.</div>
            <div style={{ fontSize: '22px', marginTop: '8px' }}>↓</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
            {sortedHoldings.map(h => {
              const isEditing = editState?.id === h.id
              const topBorderColor = h.pnlPct >= 0 ? '#4ade80' : '#f87171'

              return (
                <div
                  key={h.id}
                  style={{
                    background: '#080808',
                    border: '1px solid #1a1a1a',
                    borderTop: `2px solid ${topBorderColor}`,
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    position: 'relative',
                  }}
                >
                  {/* Ticker row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '17px', fontWeight: 700, color: '#e5e5e5', letterSpacing: '-0.01em' }}>
                          {h.ticker}
                        </span>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          color: assetColor(h.asset_type),
                          background: assetBg(h.asset_type),
                          border: `1px solid ${assetBorder(h.asset_type)}`,
                          borderRadius: '4px',
                          padding: '1px 5px',
                          letterSpacing: '0.06em',
                        }}>
                          {h.asset_type.toUpperCase()}
                        </span>
                      </div>
                      {h.company_name && (
                        <div style={{ fontSize: '11px', color: '#555', marginTop: '2px', lineHeight: 1.3 }}>
                          {h.company_name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price + day change */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#d4d4d4' }}>
                      {h.currentPrice > 0 ? fmtPrice(h.currentPrice) : <span style={{ color: '#333' }}>—</span>}
                    </span>
                    {h.currentPrice > 0 && (
                      <span style={{ fontSize: '11px', fontWeight: 600, color: gainColor(h.dayChangePct) }}>
                        {fmtPct(h.dayChangePct)} today
                      </span>
                    )}
                  </div>

                  {/* Market value */}
                  <div>
                    <div style={{ fontSize: '10px', color: '#444', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '2px' }}>
                      MARKET VALUE
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#e5e5e5', letterSpacing: '-0.01em' }}>
                      {h.currentPrice > 0 ? fmtDollar(h.marketValue) : <span style={{ color: '#444' }}>—</span>}
                    </div>
                  </div>

                  {/* P&L */}
                  {h.currentPrice > 0 && (
                    <div style={{
                      background: gainBg(h.pnlDollar) + '88',
                      border: `1px solid ${h.pnlDollar >= 0 ? '#1a472a' : '#7f1d1d'}`,
                      borderRadius: '6px',
                      padding: '6px 8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span style={{ fontSize: '10px', color: '#555', fontWeight: 700, letterSpacing: '0.06em' }}>P&L</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: gainColor(h.pnlDollar) }}>
                          {h.pnlDollar >= 0 ? '+' : ''}{fmtDollar(h.pnlDollar)}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: gainColor(h.pnlPct) }}>
                          {fmtPct(h.pnlPct)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Cost basis details */}
                  <div style={{ fontSize: '11px', color: '#444', lineHeight: 1.6 }}>
                    <span style={{ color: '#555' }}>{fmtShares(h.shares)} {h.asset_type === 'crypto' ? 'units' : 'shares'}</span>
                    <span style={{ color: '#2a2a2a' }}> @ </span>
                    <span style={{ color: '#555' }}>{fmtDollar(h.avg_cost)}</span>
                    <span style={{ color: '#2a2a2a' }}> avg</span>
                    <br />
                    <span style={{ color: '#3a3a3a' }}>Cost basis: </span>
                    <span style={{ color: '#444' }}>{fmtDollar(h.costBasis)}</span>
                  </div>

                  {/* Sector */}
                  {h.sector && (
                    <div style={{ fontSize: '10px', color: '#4a4a4a', fontStyle: 'italic' }}>
                      {h.sector}
                    </div>
                  )}

                  {/* ── Edit mode ── */}
                  {isEditing && editState && (
                    <div style={{
                      background: '#0a0a0a',
                      border: '1px solid #2d6a4f',
                      borderRadius: '8px',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}>
                      <div style={{ fontSize: '10px', color: '#7ec8a0', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '2px' }}>
                        EDIT POSITION
                      </div>
                      <input
                        value={editState.company_name}
                        onChange={e => setEditState({ ...editState, company_name: e.target.value })}
                        placeholder="Company name"
                        style={{ ...inputStyle, fontSize: '11px' }}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          value={editState.shares}
                          onChange={e => setEditState({ ...editState, shares: e.target.value })}
                          placeholder="Shares"
                          type="number"
                          min="0"
                          step="any"
                          style={{ ...inputStyle, fontSize: '11px', width: '50%' }}
                        />
                        <input
                          value={editState.avg_cost}
                          onChange={e => setEditState({ ...editState, avg_cost: e.target.value })}
                          placeholder="Avg Cost"
                          type="number"
                          min="0"
                          step="any"
                          style={{ ...inputStyle, fontSize: '11px', width: '50%' }}
                        />
                      </div>
                      <input
                        value={editState.sector}
                        onChange={e => setEditState({ ...editState, sector: e.target.value })}
                        placeholder="Sector (optional)"
                        style={{ ...inputStyle, fontSize: '11px' }}
                      />
                      <textarea
                        value={editState.notes}
                        onChange={e => setEditState({ ...editState, notes: e.target.value })}
                        placeholder="Notes (optional)"
                        rows={2}
                        style={{ ...inputStyle, fontSize: '11px', resize: 'none' }}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={saveEdit}
                          disabled={editSaving}
                          style={{ ...btn('#2d6a4f', '#fff'), flex: 1, opacity: editSaving ? 0.6 : 1 }}
                        >
                          {editSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditState(null)}
                          style={btn('#1a1a1a', '#888')}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Actions row ── */}
                  {!isEditing && (
                    <div style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
                      <button
                        onClick={() => analyzeHolding(h)}
                        style={{ ...btn('#1a472a', '#7ec8a0'), flex: 1, textAlign: 'center' as const, fontSize: '10px' }}
                      >
                        ⚡ Analyze
                      </button>
                      <button
                        onClick={() => startEdit(h)}
                        title="Edit position"
                        style={{
                          background: '#111',
                          border: '1px solid #222',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          color: '#555',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        ✎
                      </button>
                      {confirmRemove === h.id ? (
                        <>
                          <button
                            onClick={() => removeHolding(h.id, h.ticker)}
                            style={{ ...btn('#7f1d1d', '#f87171'), fontSize: '10px' }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmRemove(null)}
                            style={btn('#111', '#555')}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmRemove(h.id)}
                          title="Remove holding"
                          style={{
                            background: '#111',
                            border: '1px solid #222',
                            borderRadius: '6px',
                            padding: '5px 8px',
                            color: '#555',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Add Holding form ─────────────────────────────────────────── */}
        <div style={{
          background: '#0e0e0e',
          border: '1px solid #2a2a2a',
          borderRadius: '10px',
          padding: '16px',
        }}>
          <div style={{ fontSize: '10px', color: '#444', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '12px' }}>
            ADD POSITION
          </div>

          {/* Row 1: Ticker, Type, Shares, Avg Cost */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 90px 90px 100px', gap: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#555', fontWeight: 600 }}>TICKER *</label>
              <input
                value={addTicker}
                onChange={e => setAddTicker(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') addHolding() }}
                placeholder="AAPL"
                style={{ ...inputStyle, fontWeight: 700, cursor: 'text' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#555', fontWeight: 600 }}>TYPE *</label>
              <select
                value={addAssetType}
                onChange={e => setAddAssetType(e.target.value as 'stock' | 'crypto' | 'etf')}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="stock">Stock</option>
                <option value="crypto">Crypto</option>
                <option value="etf">ETF</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#555', fontWeight: 600 }}>SHARES *</label>
              <input
                value={addShares}
                onChange={e => setAddShares(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addHolding() }}
                placeholder="# of shares"
                type="text"
                inputMode="decimal"
                style={{ ...inputStyle, cursor: 'text' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#555', fontWeight: 600 }}>AVG COST</label>
              <input
                value={addAvgCost}
                onChange={e => setAddAvgCost(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addHolding() }}
                placeholder="auto-fills"
                type="text"
                inputMode="decimal"
                style={{ ...inputStyle, cursor: 'text' }}
              />
            </div>
          </div>

          {/* Row 2: Company, Sector, Button */}
          <div style={{ display: 'grid', gridTemplateColumns: '150px 120px 1fr', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#555', fontWeight: 600 }}>COMPANY (opt.)</label>
              <input
                value={addCompanyName}
                onChange={e => setAddCompanyName(e.target.value)}
                placeholder="Apple Inc."
                style={{ ...inputStyle, cursor: 'text' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#555', fontWeight: 600 }}>SECTOR (opt.)</label>
              <input
                value={addSector}
                onChange={e => setAddSector(e.target.value)}
                placeholder="Technology"
                style={{ ...inputStyle, cursor: 'text' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={addHolding}
                disabled={addSubmitting || !addTicker.trim() || !addShares}
                style={{
                  ...btn('#2d6a4f', '#fff'),
                  padding: '7px 18px',
                  fontSize: '12px',
                  opacity: (addSubmitting || !addTicker.trim() || !addShares) ? 0.35 : 1,
                  cursor: (!addTicker.trim() || !addShares) ? 'not-allowed' : 'pointer',
                }}
              >
                {addSubmitting ? 'Adding...' : '+ Add to Portfolio'}
              </button>
            </div>
          </div>

          {/* Status message */}
          {statusMsg && (
            <div style={{
              marginTop: '10px',
              fontSize: '12px',
              fontWeight: 600,
              color: statusMsg.toLowerCase().startsWith('error') ? '#f87171' : '#7ec8a0',
            }}>
              {statusMsg}
            </div>
          )}
        </div>

      </div>{/* end scrollable body */}
    </div>
  )
}
