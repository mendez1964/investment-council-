'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Signal = 'bullish' | 'bearish' | 'neutral'
type ScanDepth = 'quick' | 'standard' | 'deep'

interface PatternDef {
  id: string; name: string; signal: Signal; emoji: string
  description: string; keyPoints: string[]
}

interface ScanResult {
  symbol: string; isCrypto: boolean; close: number; prevClose: number; matchedPatterns: string[]
}

// ── Candle diagram data (0-100 scale, 100 = chart top) ───────────────────────
interface CD { o: number; c: number; h: number; l: number; type: 'bull' | 'bear' | 'neutral' | 'context' }

const DIAGRAMS: Record<string, CD[]> = {
  'hammer':               [{ o:78,c:68,h:80,l:63,type:'context' },{ o:68,c:56,h:70,l:52,type:'context' },{ o:44,c:48,h:50,l:15,type:'bull' }],
  'inverted-hammer':      [{ o:78,c:68,h:80,l:63,type:'context' },{ o:68,c:56,h:70,l:52,type:'context' },{ o:36,c:40,h:68,l:33,type:'bull' }],
  'shooting-star':        [{ o:38,c:48,h:52,l:35,type:'context' },{ o:48,c:60,h:63,l:45,type:'context' },{ o:70,c:66,h:90,l:64,type:'bear' }],
  'hanging-man':          [{ o:38,c:48,h:52,l:35,type:'context' },{ o:48,c:60,h:63,l:45,type:'context' },{ o:70,c:66,h:72,l:48,type:'bear' }],
  'bullish-engulfing':    [{ o:72,c:62,h:75,l:58,type:'context' },{ o:60,c:53,h:62,l:50,type:'bear' },{ o:50,c:65,h:67,l:47,type:'bull' }],
  'bearish-engulfing':    [{ o:40,c:50,h:53,l:37,type:'context' },{ o:52,c:60,h:62,l:49,type:'bull' },{ o:63,c:47,h:65,l:44,type:'bear' }],
  'piercing-line':        [{ o:72,c:60,h:75,l:57,type:'context' },{ o:60,c:45,h:62,l:42,type:'bear' },{ o:38,c:55,h:57,l:35,type:'bull' }],
  'dark-cloud-cover':     [{ o:40,c:55,h:58,l:37,type:'context' },{ o:55,c:70,h:72,l:52,type:'bull' },{ o:78,c:60,h:80,l:57,type:'bear' }],
  'morning-star':         [{ o:78,c:60,h:80,l:57,type:'bear' },{ o:57,c:55,h:59,l:53,type:'neutral' },{ o:55,c:73,h:75,l:53,type:'bull' }],
  'evening-star':         [{ o:42,c:62,h:64,l:40,type:'bull' },{ o:64,c:66,h:70,l:62,type:'neutral' },{ o:64,c:46,h:66,l:44,type:'bear' }],
  'bullish-harami':       [{ o:75,c:52,h:77,l:49,type:'bear' },{ o:55,c:60,h:62,l:53,type:'bull' }],
  'bearish-harami':       [{ o:42,c:72,h:74,l:39,type:'bull' },{ o:68,c:63,h:70,l:61,type:'bear' }],
  'three-white-soldiers': [{ o:60,c:70,h:72,l:57,type:'bull' },{ o:68,c:78,h:80,l:65,type:'bull' },{ o:76,c:87,h:89,l:73,type:'bull' }],
  'three-black-crows':    [{ o:53,c:43,h:55,l:40,type:'bear' },{ o:44,c:34,h:46,l:31,type:'bear' },{ o:35,c:25,h:37,l:22,type:'bear' }],
  'dragonfly-doji':       [{ o:75,c:65,h:78,l:62,type:'context' },{ o:65,c:53,h:67,l:50,type:'context' },{ o:42,c:42,h:44,l:12,type:'neutral' }],
  'gravestone-doji':      [{ o:42,c:52,h:55,l:39,type:'context' },{ o:52,c:64,h:67,l:50,type:'context' },{ o:72,c:72,h:92,l:70,type:'neutral' }],
  'doji':                 [{ o:42,c:52,h:55,l:39,type:'context' },{ o:52,c:62,h:65,l:49,type:'context' },{ o:64,c:64,h:78,l:50,type:'neutral' }],
  'spinning-top':         [{ o:42,c:55,h:58,l:39,type:'context' },{ o:55,c:60,h:74,l:44,type:'neutral' }],
  'tweezer-top':          [{ o:42,c:55,h:58,l:39,type:'context' },{ o:55,c:70,h:82,l:52,type:'bull' },{ o:72,c:58,h:82,l:55,type:'bear' }],
  'tweezer-bottom':            [{ o:72,c:55,h:75,l:52,type:'context' },{ o:55,c:38,h:58,l:22,type:'bear' },{ o:36,c:52,h:55,l:22,type:'bull' }],
  'head-and-shoulders':        [{ o:32,c:44,h:46,l:30,type:'context' },{ o:44,c:40,h:57,l:38,type:'bear' },{ o:40,c:33,h:41,l:31,type:'bear' },{ o:33,c:55,h:57,l:31,type:'bull' },{ o:55,c:49,h:70,l:47,type:'bear' },{ o:49,c:33,h:50,l:31,type:'bear' },{ o:33,c:43,h:56,l:31,type:'bull' },{ o:43,c:38,h:56,l:36,type:'bear' },{ o:38,c:26,h:39,l:24,type:'bear' }],
  'inverse-head-and-shoulders':[{ o:68,c:56,h:70,l:54,type:'context' },{ o:56,c:60,h:62,l:44,type:'bull' },{ o:60,c:67,h:69,l:58,type:'bull' },{ o:67,c:45,h:68,l:30,type:'bear' },{ o:45,c:67,h:69,l:43,type:'bull' },{ o:67,c:60,h:69,l:58,type:'bear' },{ o:60,c:55,h:62,l:44,type:'bear' },{ o:55,c:70,h:72,l:53,type:'bull' },{ o:70,c:78,h:80,l:68,type:'bull' }],
  'double-top':                [{ o:42,c:55,h:57,l:40,type:'context' },{ o:55,c:49,h:68,l:47,type:'bear' },{ o:49,c:40,h:50,l:38,type:'bear' },{ o:40,c:54,h:56,l:38,type:'bull' },{ o:54,c:48,h:67,l:46,type:'bear' },{ o:48,c:34,h:49,l:32,type:'bear' }],
  'double-bottom':             [{ o:65,c:52,h:67,l:50,type:'context' },{ o:52,c:57,h:59,l:33,type:'bull' },{ o:57,c:65,h:67,l:55,type:'bull' },{ o:65,c:52,h:66,l:50,type:'bear' },{ o:52,c:57,h:54,l:34,type:'bull' },{ o:57,c:72,h:74,l:55,type:'bull' }],
}

const STROKE_C: Record<CD['type'], string> = { bull:'#16a34a', bear:'#dc2626', neutral:'#374151', context:'#9ca3af' }
const FILL_C:   Record<CD['type'], string> = { bull:'#16a34a', bear:'#dc2626', neutral:'#374151', context:'#d1d5db' }

function CandleDiagram({ patternId }: { patternId: string }) {
  const candles = DIAGRAMS[patternId]
  if (!candles?.length) return null
  const W = 230, H = 150, PAD = 16
  const n = candles.length
  const step = (W - PAD * 2) / n
  const cw = Math.min(step * 0.48, 26)
  const toY = (v: number) => PAD + ((100 - v) / 100) * (H - PAD * 2)

  // For tweezer patterns, draw a dashed line at the matching level
  const isTweezerTop    = patternId === 'tweezer-top'    && n >= 2
  const isTweezerBottom = patternId === 'tweezer-bottom' && n >= 2
  const tweakerY = isTweezerTop
    ? toY(Math.max(...candles.slice(-2).map(c => c.h)))
    : isTweezerBottom
    ? toY(Math.min(...candles.slice(-2).map(c => c.l)))
    : null

  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', marginBottom: '8px' }}>PATTERN DIAGRAM</div>
      <svg width={W} height={H} style={{ background: '#f8fafc', borderRadius: '12px', display: 'block' }}>
        {tweakerY !== null && (
          <line x1={PAD} y1={tweakerY} x2={W - PAD} y2={tweakerY}
            stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" />
        )}
        {candles.map((c, i) => {
          const x = PAD + step * i + step / 2
          const stroke = STROKE_C[c.type], fill = FILL_C[c.type]
          const yHigh = toY(c.h), yLow = toY(c.l)
          const yTop = toY(Math.max(c.o, c.c)), yBot = toY(Math.min(c.o, c.c))
          const bodyH = Math.max(yBot - yTop, 2)
          return (
            <g key={i}>
              <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={stroke} strokeWidth={1.5} />
              <rect x={x - cw / 2} y={yTop} width={cw} height={bodyH} fill={fill} rx={2} />
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11px', color: '#888' }}>
        <span><span style={{ color: '#16a34a', fontWeight: 700 }}>▬</span> Bullish</span>
        <span><span style={{ color: '#dc2626', fontWeight: 700 }}>▬</span> Bearish</span>
        <span><span style={{ color: '#9ca3af', fontWeight: 700 }}>▬</span> Context</span>
      </div>
    </div>
  )
}

// ── Pattern definitions ───────────────────────────────────────────────────────
const PATTERNS: PatternDef[] = [
  { id:'hammer',               name:'Hammer',               signal:'bullish', emoji:'🔨',
    description:'A hammer forms at the bottom of a downtrend when prices fall sharply but recover to close near the open. The long lower shadow shows buyers stepped in hard to reject lower prices — a sign selling pressure may be exhausted.',
    keyPoints:['Small body at the top of the trading range','Lower shadow at least 2× the body length','Little or no upper shadow','More reliable after a sustained downtrend'] },
  { id:'inverted-hammer',      name:'Inverted Hammer',      signal:'bullish', emoji:'🔄',
    description:'The inverted hammer appears at the bottom of a downtrend. Buyers attempted to push prices higher but were initially rejected — however, the attempt itself signals a possible shift in momentum from sellers to buyers.',
    keyPoints:['Small body near the bottom of the trading range','Upper shadow at least 2× the body length','Little or no lower shadow','Requires bullish confirmation from the next candle'] },
  { id:'bullish-engulfing',    name:'Bullish Engulfing',    signal:'bullish', emoji:'💚',
    description:'A two-candle pattern where a bearish candle is completely engulfed by the next bullish candle. Strong buyers overwhelmed sellers and took full control — one of the most reliable reversal patterns.',
    keyPoints:['First candle is bearish','Second candle is bullish and larger','Second body fully covers the first body','Higher volume on the second candle strengthens the signal'] },
  { id:'piercing-line',        name:'Piercing Line',        signal:'bullish', emoji:'⚡',
    description:'After a downtrend, the second candle gaps down at open but rallies to close above the midpoint of the first bearish candle. Shows strong buying pressure emerging against the prevailing trend.',
    keyPoints:['First candle is a strong bearish candle','Second opens below the first\'s low','Second closes above the midpoint of the first body','Signals a potential end to the downtrend'] },
  { id:'morning-star',         name:'Morning Star',         signal:'bullish', emoji:'⭐',
    description:'A three-candle bullish reversal. After a bearish candle, a small "star" shows indecision, then a strong bullish candle confirms the reversal. Like the morning star appearing before sunrise — a new day begins.',
    keyPoints:['First: large bearish candle','Second: small-bodied star (gap down preferred)','Third: large bullish candle closing into first body','One of the strongest 3-candle reversal signals'] },
  { id:'bullish-harami',       name:'Bullish Harami',       signal:'bullish', emoji:'🤱',
    description:'"Harami" means pregnant in Japanese — a small bullish candle is contained inside the prior large bearish candle. Signals a possible slowdown of selling pressure and potential reversal.',
    keyPoints:['First: large bearish candle','Second: small bullish body inside the first','Second body is less than 50% of the first','Weaker signal than engulfing — confirm before acting'] },
  { id:'three-white-soldiers', name:'Three White Soldiers', signal:'bullish', emoji:'🪖',
    description:'Three consecutive long bullish candles, each opening within the prior body and closing higher. Shows sustained, determined buying over three sessions — one of the strongest reversal/continuation signals.',
    keyPoints:['Three consecutive bullish candles','Each opens within the prior body','Each closes progressively higher','Small upper shadows indicate bulls are fully in control'] },
  { id:'dragonfly-doji',       name:'Dragonfly Doji',       signal:'bullish', emoji:'🐉',
    description:'Open, high, and close are at nearly the same level with a long lower shadow. Sellers pushed prices down sharply but buyers drove them all the way back — strong rejection of lower prices.',
    keyPoints:['Open, high, and close at nearly the same level','Long lower shadow shows strong buying support','Little or no upper shadow','Most powerful at support levels or after a downtrend'] },
  { id:'tweezer-bottom',       name:'Tweezer Bottom',       signal:'bullish', emoji:'🔩',
    description:'Two consecutive candles with matching lows after a downtrend. Sellers failed twice to push below the same level — the matching low is a strong support zone signaling a potential reversal upward.',
    keyPoints:['Two candles with nearly identical lows','First candle bearish, second bullish','Appears at the bottom of a downtrend','The matching low becomes the key support level'] },
  { id:'shooting-star',        name:'Shooting Star',        signal:'bearish', emoji:'🌠',
    description:'At the top of an uptrend, prices rally high but fall back, leaving a long upper shadow. Buyers lost control to sellers during the session — a warning that the rally may be running out of momentum.',
    keyPoints:['Small body near the bottom of the range','Upper shadow at least 2× the body length','Little or no lower shadow','Most significant after a prolonged uptrend'] },
  { id:'hanging-man',          name:'Hanging Man',          signal:'bearish', emoji:'💀',
    description:'Looks identical to a hammer but forms at the top of an uptrend. Despite the recovery, the sharp intraday drop signals weakening buyer control and potential distribution by smart money.',
    keyPoints:['Small body at the top of the range','Lower shadow at least 2× the body length','Forms at the peak of an uptrend — not a downtrend','Requires bearish confirmation on the next session'] },
  { id:'bearish-engulfing',    name:'Bearish Engulfing',    signal:'bearish', emoji:'🔴',
    description:'A bullish candle is completely engulfed by the following larger bearish candle. Sellers overwhelmed buyers with force at the top of an uptrend — a high-conviction reversal signal.',
    keyPoints:['First candle is bullish','Second candle is bearish and larger','Second body fully covers the first body','Higher volume on the second candle strengthens the signal'] },
  { id:'dark-cloud-cover',     name:'Dark Cloud Cover',     signal:'bearish', emoji:'☁️',
    description:'After an uptrend, the second candle gaps up then sells off to close below the midpoint of the first — like a dark cloud blocking the sun. Sellers are taking control from buyers.',
    keyPoints:['First candle: strong bullish candle','Second opens above the first\'s high','Second closes below the midpoint of the first body','Signals a potential top and trend reversal'] },
  { id:'evening-star',         name:'Evening Star',         signal:'bearish', emoji:'🌆',
    description:'The bearish counterpart to the morning star. Three candles: bullish, small star at the top showing indecision, then a bearish candle confirming the reversal. The sun sets — so does the uptrend.',
    keyPoints:['First: large bullish candle','Second: small-bodied star at the top','Third: large bearish candle closing into first body','One of the strongest 3-candle bearish signals'] },
  { id:'bearish-harami',       name:'Bearish Harami',       signal:'bearish', emoji:'⚠️',
    description:'A small bearish candle is contained within the prior large bullish candle. Shows a slowdown of buying momentum and possible reversal. Needs confirmation before acting.',
    keyPoints:['First: large bullish candle','Second: small bearish body inside the first','Second body less than 50% the size of the first','Look for a bearish close next session before acting'] },
  { id:'three-black-crows',    name:'Three Black Crows',    signal:'bearish', emoji:'🪶',
    description:'Three consecutive long bearish candles, each opening within the prior body and closing lower. Shows sustained, determined selling over three sessions — a powerful reversal signal after an uptrend.',
    keyPoints:['Three consecutive bearish candles','Each opens within the prior body','Each closes progressively lower','Small lower shadows indicate persistent, controlled selling'] },
  { id:'gravestone-doji',      name:'Gravestone Doji',      signal:'bearish', emoji:'🪦',
    description:'Open, low, and close at nearly the same level with a long upper shadow. Buyers rallied prices up but sellers completely rejected the advance — a powerful warning at market tops.',
    keyPoints:['Open, low, and close at nearly the same level','Long upper shadow shows strong selling at highs','Little or no lower shadow','Most powerful at resistance levels after an uptrend'] },
  { id:'tweezer-top',          name:'Tweezer Top',          signal:'bearish', emoji:'📌',
    description:'Two consecutive candles with matching highs after an uptrend. Buyers twice failed to break above the same level — a clear resistance zone signaling potential reversal downward.',
    keyPoints:['Two candles with nearly identical highs','First candle bullish, second bearish','Appears at the top of an uptrend','The matching high becomes the key resistance level'] },
  { id:'doji',                 name:'Doji',                 signal:'neutral', emoji:'✚',
    description:'Open and close are at virtually the same price, creating a cross. Perfect indecision — neither buyers nor sellers won the session. Meaning depends on the trend it appears in.',
    keyPoints:['Open and close at virtually the same price','Shadows vary in length','Signals market indecision and a possible turning point','Neutral alone — powerful after a strong trend'] },
  { id:'spinning-top',         name:'Spinning Top',         signal:'neutral', emoji:'🌀',
    description:'A small body with both upper and lower shadows larger than the body. Like a doji, signals indecision — neither bulls nor bears dominated the session. More meaningful after a strong move.',
    keyPoints:['Small real body (bullish or bearish)','Both shadows extend beyond the body','Signals temporary balance between buyers and sellers','More significant after a strong trend'] },
  // ── CHART PATTERNS ──────────────────────────────────────────────────────────
  { id:'head-and-shoulders', name:'Head & Shoulders', signal:'bearish', emoji:'👤',
    description:'One of the most reliable reversal patterns. Three peaks form — a left shoulder, a higher head, and a right shoulder at roughly the same level as the left. When price breaks the neckline (the support connecting the two troughs), the trend reversal is confirmed.',
    keyPoints:['Three peaks: left shoulder, head (highest), right shoulder','Shoulders are at approximately the same height','Two troughs form the neckline — a key support level','Break below the neckline confirms the bearish reversal'] },
  { id:'inverse-head-and-shoulders', name:'Inverse H&S', signal:'bullish', emoji:'🙃',
    description:'The bullish mirror image of the Head & Shoulders. Three troughs form — a left shoulder, a deeper head, and a right shoulder. When price breaks above the neckline (resistance connecting the two peaks), a bullish reversal is confirmed.',
    keyPoints:['Three troughs: left shoulder, head (deepest), right shoulder','Shoulders bottom out at approximately the same level','Two peaks form the neckline — a key resistance level','Break above the neckline confirms the bullish reversal'] },
  { id:'double-top', name:'Double Top', signal:'bearish', emoji:'🏔️',
    description:'Price reaches a high, pulls back, then rallies to nearly the same high again but fails to break above it. The two failed attempts at the same level confirm strong resistance. When price breaks below the trough between the peaks, a reversal is confirmed.',
    keyPoints:['Two peaks at nearly identical price levels','A trough (pullback) between the two peaks','Second peak fails to break significantly above the first','Break below the trough confirms the bearish reversal — the "neckline"'] },
  { id:'double-bottom', name:'Double Bottom', signal:'bullish', emoji:'🏞️',
    description:'Price falls to a low, bounces, then falls back to nearly the same low but holds support. The two failed attempts to break lower confirm strong support. When price breaks above the peak between the troughs, a bullish reversal is confirmed.',
    keyPoints:['Two troughs at nearly identical price levels','A peak (bounce) between the two troughs','Second trough holds above or near the first — support confirmed','Break above the peak confirms the bullish reversal — the "neckline"'] },
]

const SIGNAL_COLOR: Record<Signal, string> = { bullish:'#16a34a', bearish:'#dc2626', neutral:'#6b7280' }
const SIGNAL_BG:    Record<Signal, string> = { bullish:'#f0fdf4', bearish:'#fef2f2', neutral:'#f9fafb' }
function patternColor(p: PatternDef) { return chartPatternIds.has(p.id) ? '#7c3aed' : SIGNAL_COLOR[p.signal] }
function patternBg(p: PatternDef)    { return chartPatternIds.has(p.id) ? '#f5f3ff' : SIGNAL_BG[p.signal] }
const chartPatternIds = new Set(['head-and-shoulders','inverse-head-and-shoulders','double-top','double-bottom'])

const DEPTH_CONFIG: Record<ScanDepth, { label: string; stocks: number; crypto: number; time: string }> = {
  quick:    { label:'Quick',    stocks:25,  crypto:12, time:'~10s' },
  standard: { label:'Standard', stocks:75,  crypto:20, time:'~20s' },
  deep:     { label:'Deep',     stocks:150, crypto:30, time:'~45s' },
}

function fmtPrice(n: number) {
  return n >= 1000 ? n.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }) : n >= 1 ? n.toFixed(2) : n.toFixed(4)
}
function fmtChange(close: number, prev: number) {
  if (!prev) return '—'
  const p = ((close - prev) / prev) * 100
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`
}
function changeColor(close: number, prev: number) { return close >= prev ? '#16a34a' : '#dc2626' }

export default function PatternsPage() {
  const router = useRouter()
  const [focusedId, setFocusedId]     = useState('hammer')
  const [checkedIds, setCheckedIds]   = useState<Set<string>>(new Set(['hammer']))
  const [scanType, setScanType]       = useState<'stocks' | 'crypto' | 'both'>('stocks')
  const [scanDepth, setScanDepth]     = useState<ScanDepth>('quick')
  const [scanning, setScanning]       = useState(false)
  const [results, setResults]         = useState<ScanResult[] | null>(null)
  const [scannedCount, setScannedCount] = useState(0)
  const [scanError, setScanError]     = useState('')
  const [checkSymbol, setCheckSymbol] = useState('')
  const [checkType, setCheckType]     = useState<'stock' | 'crypto'>('stock')
  const [checking, setChecking]       = useState(false)
  const [checkResult, setCheckResult] = useState<{ found: boolean; close?: number; prevClose?: number } | null>(null)

  const selected = PATTERNS.find(p => p.id === focusedId) ?? PATTERNS[0]
  const bullish = PATTERNS.filter(p => p.signal === 'bullish' && !chartPatternIds.has(p.id))
  const bearish = PATTERNS.filter(p => p.signal === 'bearish' && !chartPatternIds.has(p.id))
  const neutral = PATTERNS.filter(p => p.signal === 'neutral' && !chartPatternIds.has(p.id))
  const chartPatterns = PATTERNS.filter(p => chartPatternIds.has(p.id))

  function togglePattern(id: string) {
    setFocusedId(id)
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectGroup(ids: string[]) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      const allChecked = ids.every(id => next.has(id))
      ids.forEach(id => allChecked ? next.delete(id) : next.add(id))
      return next
    })
  }

  async function handleScan() {
    if (!checkedIds.size) return
    setScanning(true); setResults(null); setScanError('')
    try {
      const res = await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan', patterns: Array.from(checkedIds), scanType, depth: scanDepth }),
      })
      const data = await res.json()
      if (data.error) { setScanError(data.error); return }
      setResults(data.matches ?? []); setScannedCount(data.scanned ?? 0)
    } catch { setScanError('Scan failed. Check your connection and try again.') }
    finally { setScanning(false) }
  }

  async function handleCheck() {
    if (!checkSymbol.trim()) return
    setChecking(true); setCheckResult(null)
    try {
      const res = await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action:'check', pattern:focusedId, symbol:checkSymbol.trim().toUpperCase(), isCrypto:checkType==='crypto' }),
      })
      const data = await res.json()
      setCheckResult({ found: data.found, close: data.close, prevClose: data.prevClose })
    } catch { setCheckResult({ found: false }) }
    finally { setChecking(false) }
  }

  function PatternItem({ p }: { p: PatternDef }) {
    const focused  = p.id === focusedId
    const checked  = checkedIds.has(p.id)
    return (
      <button onClick={() => { togglePattern(p.id); setResults(null); setCheckResult(null) }}
        style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', padding:'7px 12px',
          background: focused ? SIGNAL_BG[p.signal] : 'transparent', border:'none',
          borderLeft: focused ? `3px solid ${SIGNAL_COLOR[p.signal]}` : '3px solid transparent',
          cursor:'pointer', textAlign:'left', fontSize:'13px',
          color: focused ? '#111' : '#555', fontWeight: focused ? 600 : 400 }}>
        {/* Checkbox */}
        <span style={{ width:'16px', height:'16px', borderRadius:'4px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
          background: checked ? SIGNAL_COLOR[p.signal] : '#fff',
          border: `1.5px solid ${checked ? SIGNAL_COLOR[p.signal] : '#d1d5db'}` }}>
          {checked && <span style={{ color:'#fff', fontSize:'10px', lineHeight:1 }}>✓</span>}
        </span>
        <span style={{ fontSize:'13px' }}>{p.emoji}</span>
        <span>{p.name}</span>
      </button>
    )
  }

  function GroupHeader({ label, color, ids }: { label: string; color: string; ids: string[] }) {
    const allChecked = ids.every(id => checkedIds.has(id))
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px 4px' }}>
        <span style={{ fontSize:'10px', fontWeight:700, color, letterSpacing:'0.08em' }}>{label}</span>
        <button onClick={() => selectGroup(ids)}
          style={{ fontSize:'10px', color, background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:'2px 4px' }}>
          {allChecked ? 'Deselect all' : 'Select all'}
        </button>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#fff', fontFamily:'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'16px', padding:'14px 20px', borderBottom:'1px solid #e5e7eb', flexShrink:0 }}>
        <button onClick={() => router.back()}
          style={{ background:'none', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'6px 12px', cursor:'pointer', fontSize:'13px', color:'#555' }}>
          ← Back
        </button>
        <div>
          <h1 style={{ margin:0, fontSize:'18px', fontWeight:700, color:'#111' }}>📊 Candlestick Patterns</h1>
          <p style={{ margin:0, fontSize:'12px', color:'#888' }}>Pattern library & real-time scanner — stocks and crypto</p>
        </div>
      </div>

      {/* Body */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* Left sidebar */}
        <div style={{ width:'220px', flexShrink:0, borderRight:'1px solid #e5e7eb', overflowY:'auto', background:'#fafafa', display:'flex', flexDirection:'column' }}>
          {/* Selected count + clear */}
          <div style={{ padding:'10px 12px 8px', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:'11px', color:'#555' }}>
              <strong style={{ color:'#111' }}>{checkedIds.size}</strong> selected
            </span>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setCheckedIds(new Set(PATTERNS.map(p => p.id)))}
                style={{ fontSize:'10px', color:'#1d4ed8', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>All</button>
              <button onClick={() => setCheckedIds(new Set())}
                style={{ fontSize:'10px', color:'#6b7280', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Clear</button>
            </div>
          </div>
          <GroupHeader label={`BULLISH (${bullish.length})`} color="#16a34a" ids={bullish.map(p => p.id)} />
          {bullish.map(p => <PatternItem key={p.id} p={p} />)}
          <GroupHeader label={`BEARISH (${bearish.length})`} color="#dc2626" ids={bearish.map(p => p.id)} />
          {bearish.map(p => <PatternItem key={p.id} p={p} />)}
          <GroupHeader label={`NEUTRAL (${neutral.length})`} color="#6b7280" ids={neutral.map(p => p.id)} />
          {neutral.map(p => <PatternItem key={p.id} p={p} />)}
          <GroupHeader label={`CHART PATTERNS (${chartPatterns.length})`} color="#7c3aed" ids={chartPatterns.map(p => p.id)} />
          {chartPatterns.map(p => <PatternItem key={p.id} p={p} />)}
          <div style={{ height:'20px' }} />
        </div>

        {/* Right content */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>

          {/* Pattern info + diagram side by side */}
          <div style={{ display:'flex', gap:'28px', alignItems:'flex-start', marginBottom:'28px' }}>
            {/* Left: name / description / key points */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
                <span style={{ fontSize:'28px' }}>{selected.emoji}</span>
                <div>
                  <h2 style={{ margin:0, fontSize:'20px', fontWeight:700, color:'#111' }}>{selected.name}</h2>
                  <span style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.06em',
                    color: patternColor(selected), background: patternBg(selected),
                    border:`1px solid ${patternColor(selected)}33`, borderRadius:'4px', padding:'2px 8px' }}>
                    {chartPatternIds.has(selected.id) ? 'CHART PATTERN' : selected.signal.toUpperCase() + (selected.signal !== 'neutral' ? ' REVERSAL' : ' SIGNAL')}
                  </span>
                </div>
              </div>
              <p style={{ margin:'0 0 16px', fontSize:'14px', color:'#333', lineHeight:1.65 }}>
                {selected.description}
              </p>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#aaa', letterSpacing:'0.08em', marginBottom:'8px' }}>KEY POINTS</div>
              {selected.keyPoints.map((pt, i) => (
                <div key={i} style={{ display:'flex', gap:'8px', marginBottom:'6px', fontSize:'13px', color:'#444' }}>
                  <span style={{ color:patternColor(selected), fontWeight:700, flexShrink:0 }}>•</span>
                  <span>{pt}</span>
                </div>
              ))}
            </div>
            {/* Right: SVG diagram */}
            <div style={{ flexShrink:0 }}>
              <CandleDiagram patternId={focusedId} />
            </div>
          </div>

          {/* Scanner */}
          <div style={{ borderTop:'1px solid #e5e7eb', paddingTop:'24px', marginBottom:'28px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#aaa', letterSpacing:'0.08em', marginBottom:'14px' }}>SCAN FOR THIS PATTERN</div>

            {/* Market type */}
            <div style={{ display:'flex', gap:'8px', marginBottom:'10px', flexWrap:'wrap' }}>
              {(['stocks','crypto','both'] as const).map(t => (
                <button key={t} onClick={() => setScanType(t)}
                  style={{ padding:'7px 16px', borderRadius:'8px', fontSize:'13px', fontWeight:500, cursor:'pointer', border:'1px solid',
                    background: scanType === t ? '#111' : '#fff',
                    color: scanType === t ? '#fff' : '#555',
                    borderColor: scanType === t ? '#111' : '#d1d5db' }}>
                  {t === 'stocks' ? '📈 Stocks' : t === 'crypto' ? '🪙 Crypto' : '🔀 Both'}
                </button>
              ))}
            </div>

            {/* Scan depth */}
            <div style={{ display:'flex', gap:'8px', marginBottom:'14px', flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:'12px', color:'#888', marginRight:'4px' }}>Depth:</span>
              {(['quick','standard','deep'] as const).map(d => {
                const cfg = DEPTH_CONFIG[d]
                const total = scanType === 'stocks' ? cfg.stocks : scanType === 'crypto' ? cfg.crypto : cfg.stocks + cfg.crypto
                return (
                  <button key={d} onClick={() => setScanDepth(d)}
                    style={{ padding:'6px 14px', borderRadius:'8px', fontSize:'12px', cursor:'pointer', border:'1px solid',
                      background: scanDepth === d ? '#1d4ed8' : '#fff',
                      color: scanDepth === d ? '#fff' : '#555',
                      borderColor: scanDepth === d ? '#1d4ed8' : '#d1d5db' }}>
                    {cfg.label} <span style={{ opacity:0.75 }}>({total} symbols · {cfg.time})</span>
                  </button>
                )
              })}

              <button onClick={handleScan} disabled={scanning || !checkedIds.size}
                style={{ marginLeft:'8px', padding:'7px 22px', borderRadius:'8px', fontSize:'13px', fontWeight:600,
                  cursor: scanning || !checkedIds.size ? 'not-allowed' : 'pointer', border:'none',
                  background: scanning || !checkedIds.size ? '#d1d5db' : '#111', color:'#fff' }}>
                {scanning ? 'Scanning…' : `🔍 Scan ${checkedIds.size} Pattern${checkedIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>

            {scanning && (
              <div style={{ fontSize:'13px', color:'#6b7280', padding:'8px 0' }}>
                Fetching candles and detecting patterns. {scanDepth === 'deep' ? 'Deep scan may take up to 45 seconds…' : 'This may take a moment…'}
              </div>
            )}
            {scanError && (
              <div style={{ padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:'8px', fontSize:'13px', color:'#dc2626' }}>
                {scanError}
              </div>
            )}
            {results !== null && !scanning && (
              <div>
                <div style={{ fontSize:'12px', color:'#6b7280', marginBottom:'12px' }}>
                  {results.length === 0
                    ? `No matches found across ${scannedCount} symbols scanned.`
                    : `${results.length} match${results.length !== 1 ? 'es' : ''} found across ${scannedCount} symbols`}
                </div>
                {results.length > 0 && (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:'10px' }}>
                    {results.map(r => (
                      <div key={r.symbol} style={{ padding:'12px 14px', borderRadius:'10px', border:'1px solid #e5e7eb', background:'#fff' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
                          <span style={{ fontSize:'14px', fontWeight:700, color:'#111' }}>{r.symbol}</span>
                          <span style={{ fontSize:'10px', color:'#888', background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:'4px', padding:'1px 5px' }}>
                            {r.isCrypto ? 'CRYPTO' : 'STOCK'}
                          </span>
                        </div>
                        <div style={{ fontSize:'15px', fontWeight:600, color:'#111' }}>${fmtPrice(r.close)}</div>
                        <div style={{ fontSize:'12px', color:changeColor(r.close, r.prevClose) }}>{fmtChange(r.close, r.prevClose)}</div>
                        <div style={{ marginTop:'8px', display:'flex', flexWrap:'wrap', gap:'4px' }}>
                          {r.matchedPatterns.map(pid => {
                            const pat = PATTERNS.find(p => p.id === pid)
                            if (!pat) return null
                            return (
                              <span key={pid} style={{ fontSize:'10px', fontWeight:600, padding:'2px 6px', borderRadius:'4px',
                                color: SIGNAL_COLOR[pat.signal], background: SIGNAL_BG[pat.signal],
                                border:`1px solid ${SIGNAL_COLOR[pat.signal]}33` }}>
                                {pat.emoji} {pat.name}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Check a specific symbol */}
          <div style={{ borderTop:'1px solid #e5e7eb', paddingTop:'24px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#aaa', letterSpacing:'0.08em', marginBottom:'14px' }}>CHECK A SPECIFIC SYMBOL</div>
            <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
              <input value={checkSymbol} onChange={e => setCheckSymbol(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleCheck()} placeholder="e.g. AAPL or BTC"
                style={{ padding:'8px 12px', borderRadius:'8px', border:'1px solid #d1d5db', fontSize:'13px', width:'160px', outline:'none', color:'#111' }} />
              {(['stock','crypto'] as const).map(t => (
                <button key={t} onClick={() => setCheckType(t)}
                  style={{ padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'1px solid',
                    background: checkType === t ? '#111' : '#fff',
                    color: checkType === t ? '#fff' : '#555',
                    borderColor: checkType === t ? '#111' : '#d1d5db' }}>
                  {t === 'stock' ? 'Stock' : 'Crypto'}
                </button>
              ))}
              <button onClick={handleCheck} disabled={checking || !checkSymbol.trim()}
                style={{ padding:'7px 18px', borderRadius:'8px', fontSize:'13px', fontWeight:600,
                  cursor: checking || !checkSymbol.trim() ? 'not-allowed' : 'pointer',
                  border:'none', background: checking || !checkSymbol.trim() ? '#d1d5db' : '#111', color:'#fff' }}>
                {checking ? 'Checking…' : 'Check'}
              </button>
            </div>
            {checkResult && (
              <div style={{ marginTop:'12px', padding:'12px 16px', borderRadius:'10px', display:'inline-flex', alignItems:'center', gap:'10px',
                border:`1px solid ${checkResult.found ? SIGNAL_COLOR[selected.signal] + '55' : '#e5e7eb'}`,
                background: checkResult.found ? SIGNAL_BG[selected.signal] : '#f9fafb' }}>
                <span style={{ fontSize:'20px' }}>{checkResult.found ? selected.emoji : '—'}</span>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:700, color: checkResult.found ? SIGNAL_COLOR[selected.signal] : '#6b7280' }}>
                    {checkResult.found ? `${selected.name} detected on ${checkSymbol}` : `No ${selected.name} on ${checkSymbol} right now`}
                  </div>
                  {checkResult.found && checkResult.close && (
                    <div style={{ fontSize:'12px', color:'#555' }}>
                      Last close: ${fmtPrice(checkResult.close)}
                      {checkResult.prevClose && (
                        <span style={{ marginLeft:'8px', color:changeColor(checkResult.close, checkResult.prevClose) }}>
                          {fmtChange(checkResult.close, checkResult.prevClose)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ height:'40px' }} />
        </div>
      </div>
    </div>
  )
}
