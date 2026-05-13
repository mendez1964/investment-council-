'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type CalcId = 'forward-rates' | 'compound-interest' | 'position-size' | 'risk-reward' | 'currency-converter' | 'fibonacci' | 'bond-yield' | 'options-pl'

const CALCULATORS: { id: CalcId; icon: string; label: string; desc: string }[] = [
  { id: 'forward-rates',      icon: '📐', label: 'Forward Rates',       desc: 'FX forward rate & points' },
  { id: 'compound-interest',  icon: '📈', label: 'Compound Interest',   desc: 'Growth over time' },
  { id: 'position-size',      icon: '⚖️', label: 'Position Size',       desc: 'Risk-based sizing' },
  { id: 'risk-reward',        icon: '🎯', label: 'Risk / Reward',       desc: 'R:R & breakeven rate' },
  { id: 'currency-converter', icon: '💵', label: 'Currency Converter',  desc: 'Live FX rates' },
  { id: 'fibonacci',          icon: '📉', label: 'Fibonacci Levels',    desc: 'Retracement & extension' },
  { id: 'bond-yield',         icon: '🏦', label: 'Bond Yield (YTM)',    desc: 'Yield to maturity' },
  { id: 'options-pl',         icon: '🔢', label: 'Options P&L',         desc: 'Profit/loss at expiry' },
]

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number, decimals = 2) {
  if (!isFinite(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// ── shared input component ────────────────────────────────────────────────────
function Field({ label, value, onChange, suffix, type = 'number', placeholder = '0' }: {
  label: string; value: string; onChange: (v: string) => void
  suffix?: string; type?: string; placeholder?: string
}) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
        <input
          type={type} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1, background: '#f9f9f9', border: '1px solid #ddd', borderRadius: suffix ? '7px 0 0 7px' : '7px', padding: '9px 12px', fontSize: '14px', color: '#111', fontFamily: 'inherit', outline: 'none', borderRight: suffix ? 'none' : undefined }}
          onFocus={e => e.currentTarget.style.borderColor = '#2d6a4f'}
          onBlur={e => e.currentTarget.style.borderColor = '#ddd'}
        />
        {suffix && (
          <div style={{ background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '0 7px 7px 0', padding: '9px 12px', fontSize: '13px', color: '#888', whiteSpace: 'nowrap' }}>{suffix}</div>
        )}
      </div>
    </div>
  )
}

function Result({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: highlight ? '#eaf5ef' : '#f9f9f9', border: `1px solid ${highlight ? '#a7d9bc' : '#e5e5e5'}`, borderRadius: '7px', marginBottom: '8px' }}>
      <span style={{ fontSize: '13px', color: '#666' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 700, color: highlight ? '#2d6a4f' : '#111' }}>{value}</span>
    </div>
  )
}

// ── 1. Forward Rates ──────────────────────────────────────────────────────────
function ForwardRates() {
  const [spot, setSpot] = useState('1.1367')
  const [domestic, setDomestic] = useState('5.25')
  const [foreign, setForeign] = useState('4.00')
  const [days, setDays] = useState('90')
  const [pair, setPair] = useState('EUR/USD')

  const s = parseFloat(spot), d = parseFloat(domestic) / 100, f = parseFloat(foreign) / 100, t = parseFloat(days) / 360
  const forwardRate = s * (1 + d * t) / (1 + f * t)
  const fwdPoints = (forwardRate - s) * 10000
  const pctDiff = ((forwardRate - s) / s) * 100

  return (
    <div>
      <Field label="Currency Pair" value={pair} onChange={setPair} type="text" placeholder="EUR/USD" />
      <Field label="Spot Price" value={spot} onChange={setSpot} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Field label="Domestic Rate" value={domestic} onChange={setDomestic} suffix="%" />
        <Field label="Foreign Rate" value={foreign} onChange={setForeign} suffix="%" />
      </div>
      <Field label="Days Forward" value={days} onChange={setDays} suffix="days" />
      <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', marginBottom: '10px' }}>RESULTS</div>
        <Result label="Forward Rate" value={isFinite(forwardRate) ? fmt(forwardRate, 4) : '—'} highlight />
        <Result label="Forward Points" value={isFinite(fwdPoints) ? `${fwdPoints >= 0 ? '+' : ''}${fmt(fwdPoints, 1)} pips` : '—'} />
        <Result label="Premium / Discount" value={isFinite(pctDiff) ? `${pctDiff >= 0 ? '+' : ''}${fmt(pctDiff, 3)}%` : '—'} />
      </div>
    </div>
  )
}

// ── 2. Compound Interest ──────────────────────────────────────────────────────
function CompoundInterest() {
  const [principal, setPrincipal] = useState('10000')
  const [rate, setRate] = useState('8')
  const [years, setYears] = useState('10')
  const [monthly, setMonthly] = useState('500')
  const [freq, setFreq] = useState('12')

  const P = parseFloat(principal) || 0
  const r = (parseFloat(rate) || 0) / 100
  const n = parseFloat(freq) || 12
  const t = parseFloat(years) || 0
  const pmt = parseFloat(monthly) || 0

  const lump = P * Math.pow(1 + r / n, n * t)
  const contribFV = pmt * ((Math.pow(1 + r / n, n * t) - 1) / (r / n))
  const total = lump + contribFV
  const totalContrib = P + pmt * 12 * t
  const interest = total - totalContrib

  return (
    <div>
      <Field label="Initial Investment" value={principal} onChange={setPrincipal} suffix="$" />
      <Field label="Annual Return Rate" value={rate} onChange={setRate} suffix="%" />
      <Field label="Time Period" value={years} onChange={setYears} suffix="years" />
      <Field label="Monthly Contribution" value={monthly} onChange={setMonthly} suffix="$" />
      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>Compounding</label>
        <select value={freq} onChange={e => setFreq(e.target.value)} style={{ width: '100%', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '7px', padding: '9px 12px', fontSize: '14px', color: '#111', fontFamily: 'inherit', outline: 'none' }}>
          <option value="1">Annually</option>
          <option value="4">Quarterly</option>
          <option value="12">Monthly</option>
          <option value="365">Daily</option>
        </select>
      </div>
      <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', marginBottom: '10px' }}>RESULTS</div>
        <Result label="Future Value" value={`$${fmt(total)}`} highlight />
        <Result label="Total Contributed" value={`$${fmt(totalContrib)}`} />
        <Result label="Total Interest Earned" value={`$${fmt(interest)}`} />
        <Result label="Return on Investment" value={totalContrib > 0 ? `${fmt((interest / totalContrib) * 100)}%` : '—'} />
      </div>
    </div>
  )
}

// ── 3. Position Size ──────────────────────────────────────────────────────────
function PositionSize() {
  const [account, setAccount] = useState('50000')
  const [riskPct, setRiskPct] = useState('1')
  const [entry, setEntry] = useState('150')
  const [stop, setStop] = useState('145')
  const [price, setPrice] = useState('150')

  const acc = parseFloat(account) || 0
  const rp = parseFloat(riskPct) || 0
  const ent = parseFloat(entry) || 0
  const stp = parseFloat(stop) || 0
  const pr = parseFloat(price) || 0

  const riskAmount = acc * (rp / 100)
  const riskPerShare = Math.abs(ent - stp)
  const riskBasedShares = riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0
  const maxSharesByAccount = pr > 0 ? Math.floor(acc / pr) : 0
  const shares = Math.min(riskBasedShares, maxSharesByAccount)
  const positionValue = shares * pr
  const pctOfAccount = acc > 0 ? (positionValue / acc) * 100 : 0

  return (
    <div>
      <Field label="Account Size" value={account} onChange={setAccount} suffix="$" />
      <Field label="Risk Per Trade" value={riskPct} onChange={setRiskPct} suffix="%" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Field label="Entry Price" value={entry} onChange={setEntry} suffix="$" />
        <Field label="Stop Loss" value={stop} onChange={setStop} suffix="$" />
      </div>
      <Field label="Current Price" value={price} onChange={setPrice} suffix="$" />
      <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', marginBottom: '10px' }}>RESULTS</div>
        <Result label="Shares to Buy" value={shares > 0 ? shares.toLocaleString() : '—'} highlight />
        <Result label="Dollar Risk" value={`$${fmt(riskAmount)}`} />
        <Result label="Risk Per Share" value={`$${fmt(riskPerShare, 3)}`} />
        <Result label="Position Value" value={`$${fmt(positionValue)}`} />
        <Result label="% of Account" value={`${fmt(pctOfAccount)}%`} />
      </div>
    </div>
  )
}

// ── 4. Risk / Reward ──────────────────────────────────────────────────────────
function RiskReward() {
  const [entry, setEntry] = useState('100')
  const [target, setTarget] = useState('115')
  const [stop, setStop] = useState('93')
  const [winRate, setWinRate] = useState('50')

  const ent = parseFloat(entry) || 0
  const tgt = parseFloat(target) || 0
  const stp = parseFloat(stop) || 0
  const wr = parseFloat(winRate) / 100

  const reward = Math.abs(tgt - ent)
  const risk = Math.abs(ent - stp)
  const rr = risk > 0 ? reward / risk : 0
  const breakeven = rr > 0 ? 1 / (1 + rr) : 0
  const expectancy = wr * reward - (1 - wr) * risk

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <Field label="Entry" value={entry} onChange={setEntry} suffix="$" />
        <Field label="Target" value={target} onChange={setTarget} suffix="$" />
        <Field label="Stop Loss" value={stop} onChange={setStop} suffix="$" />
      </div>
      <Field label="Your Win Rate" value={winRate} onChange={setWinRate} suffix="%" />
      <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', marginBottom: '10px' }}>RESULTS</div>
        <Result label="Risk / Reward Ratio" value={isFinite(rr) ? `1 : ${fmt(rr)}` : '—'} highlight />
        <Result label="Breakeven Win Rate" value={isFinite(breakeven) ? `${fmt(breakeven * 100)}%` : '—'} />
        <Result label="Expected Value (per $1 risk)" value={isFinite(expectancy) ? `${expectancy >= 0 ? '+' : ''}$${fmt(expectancy / (risk || 1), 3)}` : '—'} />
        <Result label="Upside" value={isFinite(reward) ? `$${fmt(reward)} (${fmt((reward / ent) * 100)}%)` : '—'} />
        <Result label="Downside" value={isFinite(risk) ? `$${fmt(risk)} (${fmt((risk / ent) * 100)}%)` : '—'} />
      </div>
    </div>
  )
}

// ── 5. Currency Converter ────────────────────────────────────────────────────
function CurrencyConverter() {
  const [amount, setAmount] = useState('1000')
  const [from, setFrom] = useState('USD')
  const [to, setTo] = useState('EUR')
  const [rate, setRate] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState<{ from: string; to: string; rate: number } | null>(null)

  async function fetchRate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/market?type=fx&from=${from}&to=${to}`)
      const d = await res.json()
      if (d.rate) {
        setRate(String(d.rate))
        setFetched({ from, to, rate: d.rate })
      }
    } catch {
      // fall through
    } finally {
      setLoading(false)
    }
  }

  const r = parseFloat(rate) || 0
  const a = parseFloat(amount) || 0
  const converted = a * r
  const inverse = r > 0 ? 1 / r : 0

  const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'MXN', 'BRL', 'INR', 'HKD', 'SGD', 'NOK', 'SEK']

  return (
    <div>
      <Field label="Amount" value={amount} onChange={setAmount} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>From</label>
          <select value={from} onChange={e => setFrom(e.target.value)} style={{ width: '100%', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '7px', padding: '9px 12px', fontSize: '14px', color: '#111', fontFamily: 'inherit', outline: 'none' }}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>To</label>
          <select value={to} onChange={e => setTo(e.target.value)} style={{ width: '100%', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '7px', padding: '9px 12px', fontSize: '14px', color: '#111', fontFamily: 'inherit', outline: 'none' }}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <Field label="Exchange Rate (or fetch live)" value={rate} onChange={setRate} placeholder="e.g. 0.9234" />
      <button onClick={fetchRate} disabled={loading} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: loading ? '#e5e5e5' : '#2d6a4f', color: loading ? '#aaa' : '#fff', fontSize: '13px', fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', marginBottom: '4px' }}>
        {loading ? 'Fetching...' : '↻ Get Live Rate'}
      </button>
      {fetched && <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'center', marginBottom: '14px' }}>Live: 1 {fetched.from} = {fmt(fetched.rate, 4)} {fetched.to}</div>}
      {r > 0 && (
        <div style={{ marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', marginBottom: '10px' }}>RESULTS</div>
          <Result label={`${amount} ${from}`} value={`${fmt(converted, 4)} ${to}`} highlight />
          <Result label={`1 ${from}`} value={`${fmt(r, 4)} ${to}`} />
          <Result label={`1 ${to}`} value={`${fmt(inverse, 4)} ${from}`} />
        </div>
      )}
    </div>
  )
}

// ── 6. Fibonacci ──────────────────────────────────────────────────────────────
function Fibonacci() {
  const [high, setHigh] = useState('200')
  const [low, setLow] = useState('150')
  const [trend, setTrend] = useState<'down' | 'up'>('down')

  const h = parseFloat(high) || 0
  const l = parseFloat(low) || 0
  const diff = h - l

  const RETRACE = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
  const EXTEND  = [1.272, 1.414, 1.618, 2.0, 2.618]

  function retraceLevel(pct: number) {
    return trend === 'down' ? h - diff * pct : l + diff * pct
  }
  function extendLevel(pct: number) {
    return trend === 'down' ? l - diff * (pct - 1) : h + diff * (pct - 1)
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Field label="Swing High" value={high} onChange={setHigh} suffix="$" />
        <Field label="Swing Low" value={low} onChange={setLow} suffix="$" />
      </div>
      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>Trend Direction</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['down', 'up'] as const).map(t => (
            <button key={t} onClick={() => setTrend(t)} style={{ flex: 1, padding: '8px', borderRadius: '7px', border: `1px solid ${trend === t ? '#2d6a4f' : '#ddd'}`, background: trend === t ? '#eaf5ef' : '#fff', color: trend === t ? '#2d6a4f' : '#666', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t === 'down' ? '▼ Downtrend' : '▲ Uptrend'}
            </button>
          ))}
        </div>
      </div>
      {diff > 0 && (
        <div style={{ marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', marginBottom: '10px' }}>RETRACEMENT LEVELS</div>
          {RETRACE.map(pct => (
            <Result key={pct} label={`${(pct * 100).toFixed(1)}%`} value={`$${fmt(retraceLevel(pct), 3)}`} highlight={pct === 0.618 || pct === 0.5 || pct === 0.382} />
          ))}
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', marginBottom: '10px', marginTop: '16px' }}>EXTENSION LEVELS</div>
          {EXTEND.map(pct => (
            <Result key={pct} label={`${(pct * 100).toFixed(1)}%`} value={`$${fmt(extendLevel(pct), 3)}`} highlight={pct === 1.618} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 7. Bond Yield (YTM) ───────────────────────────────────────────────────────
function BondYield() {
  const [face, setFace] = useState('1000')
  const [coupon, setCoupon] = useState('5')
  const [price, setPrice] = useState('950')
  const [years, setYears] = useState('10')
  const [freq, setFreq] = useState('2')

  const F = parseFloat(face) || 0
  const c = parseFloat(coupon) / 100
  const P = parseFloat(price) || 0
  const n = parseFloat(years) || 0
  const m = parseFloat(freq) || 2

  const couponPayment = (F * c) / m
  const periods = n * m
  // YTM approximation
  const ytmApprox = periods > 0 && P > 0 ? (couponPayment + (F - P) / periods) / ((F + P) / 2) * m : 0
  const currentYield = P > 0 ? (F * c) / P : 0
  const totalCoupons = couponPayment * periods
  const totalReturn = totalCoupons + F - P

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Field label="Face Value" value={face} onChange={setFace} suffix="$" />
        <Field label="Market Price" value={price} onChange={setPrice} suffix="$" />
      </div>
      <Field label="Annual Coupon Rate" value={coupon} onChange={setCoupon} suffix="%" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Field label="Years to Maturity" value={years} onChange={setYears} suffix="yrs" />
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>Payments/Year</label>
          <select value={freq} onChange={e => setFreq(e.target.value)} style={{ width: '100%', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '7px', padding: '9px 12px', fontSize: '14px', color: '#111', fontFamily: 'inherit', outline: 'none' }}>
            <option value="1">Annual</option>
            <option value="2">Semi-Annual</option>
            <option value="4">Quarterly</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', marginBottom: '10px' }}>RESULTS</div>
        <Result label="Yield to Maturity (approx)" value={isFinite(ytmApprox) && ytmApprox > 0 ? `${fmt(ytmApprox * 100, 3)}%` : '—'} highlight />
        <Result label="Current Yield" value={isFinite(currentYield) ? `${fmt(currentYield * 100, 3)}%` : '—'} />
        <Result label="Coupon Payment" value={`$${fmt(couponPayment)} / period`} />
        <Result label="Total Coupons" value={`$${fmt(totalCoupons)}`} />
        <Result label="Total Return" value={`$${fmt(totalReturn)}`} />
        <Result label="Premium / Discount" value={P < F ? `Discount ($${fmt(F - P)})` : P > F ? `Premium ($${fmt(P - F)})` : 'At Par'} />
      </div>
    </div>
  )
}

// ── 8. Options P&L ────────────────────────────────────────────────────────────
function OptionsPL() {
  const [type, setType] = useState<'call' | 'put'>('call')
  const [position, setPosition] = useState<'long' | 'short'>('long')
  const [strike, setStrike] = useState('150')
  const [premium, setPremium] = useState('5')
  const [contracts, setContracts] = useState('1')
  const [expiry, setExpiry] = useState('160')

  const K = parseFloat(strike) || 0
  const prem = parseFloat(premium) || 0
  const qty = (parseFloat(contracts) || 1) * 100
  const S = parseFloat(expiry) || 0

  let intrinsic = 0
  if (type === 'call') intrinsic = Math.max(0, S - K)
  else intrinsic = Math.max(0, K - S)

  const rawPL = (intrinsic - prem) * qty
  const pl = position === 'long' ? rawPL : -rawPL
  const maxLoss = position === 'long' ? prem * qty : undefined
  const breakEven = type === 'call'
    ? (position === 'long' ? K + prem : K + prem)
    : (position === 'long' ? K - prem : K - prem)

  const PRICES = Array.from({ length: 11 }, (_, i) => K * (0.8 + i * 0.04))

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {(['call', 'put'] as const).map(t => (
          <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: '8px', borderRadius: '7px', border: `1px solid ${type === t ? '#2d6a4f' : '#ddd'}`, background: type === t ? '#eaf5ef' : '#fff', color: type === t ? '#2d6a4f' : '#666', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t === 'call' ? '📈 Call' : '📉 Put'}
          </button>
        ))}
        {(['long', 'short'] as const).map(p => (
          <button key={p} onClick={() => setPosition(p)} style={{ flex: 1, padding: '8px', borderRadius: '7px', border: `1px solid ${position === p ? '#555' : '#ddd'}`, background: position === p ? '#f5f5f5' : '#fff', color: position === p ? '#111' : '#666', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {p === 'long' ? 'Buy' : 'Sell'}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <Field label="Strike" value={strike} onChange={setStrike} suffix="$" />
        <Field label="Premium" value={premium} onChange={setPremium} suffix="$" />
        <Field label="Contracts" value={contracts} onChange={setContracts} />
      </div>
      <Field label="Price at Expiry" value={expiry} onChange={setExpiry} suffix="$" />
      <div style={{ marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', marginBottom: '10px' }}>RESULTS</div>
        <div style={{ padding: '12px 14px', background: pl >= 0 ? '#eaf5ef' : '#fff0f0', border: `1px solid ${pl >= 0 ? '#a7d9bc' : '#ffaaaa'}`, borderRadius: '7px', marginBottom: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>P&L at Expiry</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: pl >= 0 ? '#2d6a4f' : '#cc4444' }}>{pl >= 0 ? '+' : ''}${fmt(Math.abs(pl))} {pl >= 0 ? '✓' : '✗'}</div>
        </div>
        <Result label="Break-Even Price" value={`$${fmt(breakEven, 2)}`} />
        <Result label="Intrinsic Value" value={`$${fmt(intrinsic, 2)}`} />
        {maxLoss !== undefined && <Result label="Max Loss (per contract)" value={`$${fmt(prem * 100)}`} />}
        <div style={{ marginTop: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', marginBottom: '8px' }}>P&L AT VARIOUS PRICES</div>
          {PRICES.map(sp => {
            let intr = type === 'call' ? Math.max(0, sp - K) : Math.max(0, K - sp)
            let rowPL = position === 'long' ? (intr - prem) * qty : -(intr - prem) * qty
            return (
              <div key={sp} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', borderRadius: '5px', marginBottom: '2px', background: Math.abs(sp - S) < 0.01 ? '#f0f0f0' : 'transparent' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>${fmt(sp, 2)}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: rowPL >= 0 ? '#2d6a4f' : '#cc4444' }}>{rowPL >= 0 ? '+' : ''}${fmt(rowPL)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const CALC_COMPONENTS: Record<CalcId, () => JSX.Element> = {
  'forward-rates':      ForwardRates,
  'compound-interest':  CompoundInterest,
  'position-size':      PositionSize,
  'risk-reward':        RiskReward,
  'currency-converter': CurrencyConverter,
  'fibonacci':          Fibonacci,
  'bond-yield':         BondYield,
  'options-pl':         OptionsPL,
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CalculatorsPage() {
  const router = useRouter()
  const [active, setActive] = useState<CalcId>('forward-rates')

  const ActiveCalc = CALC_COMPONENTS[active]
  const activeMeta = CALCULATORS.find(c => c.id === active)!

  return (
    <div style={{ minHeight: '100vh', background: '#060606', color: '#e5e5e5', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #111', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '16px', background: '#080808', flexShrink: 0 }}>
        <button onClick={() => router.push('/app')}
          style={{ background: 'transparent', border: '1px solid #1f1f1f', borderRadius: '6px', color: '#666', fontSize: '12px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ccc'}
          onMouseLeave={e => e.currentTarget.style.color = '#666'}
        >← Back</button>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>🧮 Financial Calculators</div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left nav */}
        <div style={{ width: '210px', minWidth: '210px', borderRight: '1px solid #111', background: '#080808', overflowY: 'auto', padding: '16px 10px' }}>
          {CALCULATORS.map(c => (
            <button key={c.id} onClick={() => setActive(c.id)}
              style={{ width: '100%', padding: '10px 12px', marginBottom: '3px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', background: active === c.id ? '#141414' : 'transparent', transition: 'all 0.12s' }}
              onMouseEnter={e => { if (active !== c.id) e.currentTarget.style.background = '#0d0d0d' }}
              onMouseLeave={e => { if (active !== c.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: active === c.id ? '#e5e5e5' : '#666' }}>{c.icon} {c.label}</div>
              <div style={{ fontSize: '10px', color: active === c.id ? '#555' : '#333', marginTop: '2px' }}>{c.desc}</div>
            </button>
          ))}
        </div>

        {/* Calculator panel */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '32px 24px', background: '#ffffff' }}>
          <div style={{ width: '100%', maxWidth: '480px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111', margin: '0 0 4px', letterSpacing: '-0.01em' }}>{activeMeta.icon} {activeMeta.label}</h1>
              <div style={{ fontSize: '13px', color: '#aaa' }}>{activeMeta.desc}</div>
            </div>
            <ActiveCalc />
          </div>
        </div>
      </div>
    </div>
  )
}
