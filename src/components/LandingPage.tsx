'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/navigation'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const NAVY = '#0F2A44'
const GOLD = '#C9A34E'
const GOLD_LIGHT = '#f5e6c8'
const GREY_BG = '#f8f9fb'
const TEXT = '#1f2937'
const TEXT_MUTED = '#6b7280'
const BORDER = '#e5e7eb'

const mobileCSS = `
@media (max-width: 768px) {
  .landing-nav-links {
    display: none !important;
  }
  nav {
    padding: 0 16px !important;
  }
  .landing-hero-section {
    padding: 60px 16px 48px !important;
  }
  .landing-hero-section h1 {
    font-size: 32px !important;
  }
  .landing-hero-buttons {
    flex-direction: column !important;
    align-items: stretch !important;
    width: 100% !important;
    max-width: 320px;
    margin: 0 auto;
  }
  .landing-hero-buttons button {
    width: 100% !important;
  }
  .landing-mockup {
    height: 260px !important;
    overflow: hidden !important;
  }
  .landing-stats-bar {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 24px !important;
    justify-items: center !important;
  }
  .landing-section {
    padding: 48px 16px !important;
  }
  .landing-section .features-grid {
    grid-template-columns: 1fr !important;
  }
  .landing-section .pricing-grid {
    grid-template-columns: 1fr !important;
  }
  .guardian-layout {
    grid-template-columns: 1fr !important;
  }
  .landing-section .howitworks-grid {
    grid-template-columns: 1fr !important;
  }
  .competitor-table-wrapper {
    overflow-x: auto !important;
  }
}
`

const slides = [
  {
    label: 'Pre-Market Briefing',
    content: (
      <div style={{ background: '#0a0a0a', height: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#C9A34E', letterSpacing: '0.08em', marginBottom: '4px' }}>
          PRE-MARKET BRIEFING — Mon, Mar 23, 2026
        </div>
        <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #1a1a1a' }}>
          {[
            { sym: 'SPY', price: '$524.80', chg: '+0.4%', pos: true },
            { sym: 'QQQ', price: '$448.20', chg: '+0.6%', pos: true },
            { sym: 'BTC', price: '$84,200', chg: '+1.2%', pos: true },
            { sym: '10Y Yield', price: '4.38%', chg: '-0.02', pos: false },
            { sym: 'VIX', price: '18.4', chg: '-2.1%', pos: false },
          ].map(({ sym, price, chg, pos }, i) => (
            <div key={sym} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 10px', background: i % 2 === 0 ? '#111' : '#0d0d0d',
              fontSize: '11px',
            }}>
              <span style={{ color: '#aaa', fontWeight: 600, minWidth: '70px' }}>{sym}</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{price}</span>
              <span style={{ color: pos ? '#4ade80' : '#f87171', fontWeight: 700, minWidth: '44px', textAlign: 'right' }}>{chg}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.6 }}>
          Key levels: Watch 524.80 resistance · Sector bias: Tech leading
        </div>
        <div style={{ fontSize: '10px', color: '#C9A34E', marginTop: 'auto' }}>Generated in ~4 seconds</div>
      </div>
    ),
  },
  {
    label: 'AI Daily Stock Picks',
    content: (
      <div style={{ background: '#0a0a0a', height: '100%', padding: '16px', overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { sym: 'NVDA', price: '$175.64', bias: 'BULLISH', dir: '▲', conf: 8, borderColor: '#22c55e', badgeColor: '#22c55e', dotColor: '#22c55e', desc: 'AI infrastructure leadership driving semiconductor demand', entry: '$171.20' },
            { sym: 'AAPL', price: '$251.49', bias: 'BEARISH', dir: '▼', conf: 6, borderColor: '#ef4444', badgeColor: '#ef4444', dotColor: '#ef4444', desc: 'Hardware cycle headwinds amid macro pressure', entry: '$253.00' },
            { sym: 'SPY', price: '$524.80', bias: 'BULLISH', dir: '▲', conf: 7, borderColor: '#22c55e', badgeColor: '#22c55e', dotColor: '#22c55e', desc: 'Broad market momentum with tech leadership', entry: '$521.40' },
            { sym: 'META', price: '$604.06', bias: 'BULLISH', dir: '▲', conf: 9, borderColor: '#22c55e', badgeColor: '#22c55e', dotColor: '#22c55e', desc: 'Consumer ad spend recovering, margins expanding', entry: '$598.50' },
          ].map(({ sym, price, bias, dir, conf, borderColor, badgeColor, dotColor, desc, entry }) => (
            <div key={sym} style={{ background: '#111', borderRadius: '8px', borderTop: `2px solid ${borderColor}`, padding: '10px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>{sym}</div>
                  <div style={{ fontSize: '10px', color: badgeColor, fontWeight: 700 }}>{dir} {bias}</div>
                </div>
                <span style={{ fontSize: '8px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.12)', borderRadius: '3px', padding: '2px 5px' }}>OPEN</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{price}</div>
              <div style={{ display: 'flex', gap: '2px', marginBottom: '5px' }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} style={{ width: '8px', height: '4px', borderRadius: '1px', background: i < conf ? dotColor : '#222' }} />
                ))}
                <span style={{ fontSize: '8px', color: '#555', marginLeft: '3px' }}>{conf}/10</span>
              </div>
              <div style={{ fontSize: '9px', color: '#666', lineHeight: 1.4, marginBottom: '4px' }}>{desc}</div>
              <div style={{ fontSize: '8px', color: '#444' }}>Entry {entry}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: 'Options Picks (Daily & Weekly)',
    content: (
      <div style={{ background: '#0a0a0a', height: '100%', padding: '16px', overflowY: 'auto' }}>
        <div style={{ fontSize: '10px', color: '#888', marginBottom: '10px', textAlign: 'center', background: '#111', borderRadius: '6px', padding: '5px' }}>
          8W – 4L · 66.7% win rate · Calls: 72% · Puts: 58%
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: 'QQQ $592 C', type: 'CALL', dir: '▲', freq: 'DAILY', freqColor: '#38bdf8', borderColor: '#3b82f6', entry: '$4.80', stop: '$2.88 (-40%)', target: '$8.88 (+85%)', exp: 'Apr 4', conf: 8 },
            { label: 'NVDA $270 C', type: 'CALL', dir: '▲', freq: 'WEEKLY', freqColor: '#a78bfa', borderColor: '#3b82f6', entry: '$6.50', stop: '$3.90 (-40%)', target: '$13.00 (+100%)', exp: 'Apr 17', conf: 7 },
            { label: 'TLT $87 P', type: 'PUT', dir: '▼', freq: 'WEEKLY', freqColor: '#a78bfa', borderColor: '#7c3aed', entry: '$2.60', stop: '$1.56 (-40%)', target: '$4.68 (+80%)', exp: 'Apr 17', conf: 6 },
          ].map(({ label, type, dir, freq, freqColor, borderColor, entry, stop, target, exp, conf }) => (
            <div key={label} style={{ flex: 1, background: '#111', borderRadius: '8px', borderTop: `2px solid ${borderColor}`, padding: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#fff', marginBottom: '5px' }}>{label}</div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                <span style={{ fontSize: '8px', fontWeight: 700, color: borderColor, background: 'rgba(59,130,246,0.12)', borderRadius: '3px', padding: '1px 5px' }}>{dir} {type}</span>
                <span style={{ fontSize: '8px', fontWeight: 700, color: freqColor, background: 'rgba(168,85,247,0.12)', borderRadius: '3px', padding: '1px 5px' }}>{freq}</span>
              </div>
              <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '2px' }}>Entry: <span style={{ color: '#fff', fontWeight: 600 }}>{entry}</span></div>
              <div style={{ fontSize: '9px', color: '#f87171', marginBottom: '2px' }}>Stop: {stop}</div>
              <div style={{ fontSize: '9px', color: '#4ade80', marginBottom: '4px' }}>Target: {target}</div>
              <div style={{ fontSize: '8px', color: '#555' }}>Exp {exp}</div>
              <div style={{ display: 'flex', gap: '2px', marginTop: '6px' }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} style={{ width: '7px', height: '3px', borderRadius: '1px', background: i < conf ? '#3b82f6' : '#1a1a1a' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: 'Crypto Dashboard',
    content: (
      <div style={{ background: '#0a0a0a', height: '100%', padding: '16px', display: 'flex', gap: '16px' }}>
        {/* Left: dominance */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#888', letterSpacing: '0.1em', marginBottom: '6px' }}>BTC DOMINANCE</div>
            <div style={{ background: '#1a1a1a', borderRadius: '4px', height: '10px', overflow: 'hidden', marginBottom: '4px' }}>
              <div style={{ width: '62.4%', height: '100%', background: '#f7931a', borderRadius: '4px' }} />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#f7931a' }}>62.4%</div>
          </div>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#888', letterSpacing: '0.1em', marginBottom: '6px' }}>ALT SEASON INDEX</div>
            <div style={{ background: '#1a1a1a', borderRadius: '4px', height: '10px', overflow: 'hidden', marginBottom: '4px' }}>
              <div style={{ width: '28%', height: '100%', background: '#f7931a', borderRadius: '4px' }} />
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaa' }}>28 — <span style={{ color: '#f7931a' }}>Bitcoin Season</span></div>
          </div>
        </div>
        {/* Right: prices */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#888', letterSpacing: '0.1em', marginBottom: '8px' }}>TOP CRYPTOS</div>
          {[
            { sym: 'BTC', price: '$84,200', chg: '+1.2%', color: '#f7931a', pos: true },
            { sym: 'ETH', price: '$1,847', chg: '-0.4%', color: '#627eea', pos: false },
            { sym: 'BNB', price: '$612', chg: '+0.8%', color: '#f0b90b', pos: true },
            { sym: 'SOL', price: '$142', chg: '+2.1%', color: '#9945ff', pos: true },
            { sym: 'XRP', price: '$0.498', chg: '-1.2%', color: '#346aa9', pos: false },
          ].map(({ sym, price, chg, color, pos }) => (
            <div key={sym} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#aaa', minWidth: '28px' }}>{sym}</span>
              <span style={{ fontSize: '10px', color: '#fff', fontWeight: 600, flex: 1 }}>{price}</span>
              <span style={{ fontSize: '10px', color: pos ? '#4ade80' : '#f87171', fontWeight: 600 }}>{chg}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: 'Council Chat',
    content: (
      <div style={{ background: '#0a0a0a', height: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
        {/* User bubble */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <div style={{ background: '#1a1a1a', borderRadius: '10px 10px 2px 10px', padding: '8px 12px', maxWidth: '70%' }}>
            <div style={{ fontSize: '10px', color: '#ccc' }}>What does the yield curve say about recession risk right now?</div>
          </div>
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#1f1f1f', flexShrink: 0 }} />
        </div>
        {/* AI bubble */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #1a472a, #2d6a4f)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>⚡</div>
          <div style={{ background: '#111', borderRadius: '2px 10px 10px 10px', padding: '10px 12px', flex: 1 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Yield Curve — Partially Inverted</div>
            <div style={{ fontSize: '10px', color: '#C9A34E', marginBottom: '6px' }}>2Y: 4.59% · 10Y: 4.38% · Spread: -0.21%</div>
            <div style={{ fontSize: '10px', color: '#aaa', lineHeight: 1.6, marginBottom: '6px' }}>
              The 2Y-10Y has been inverted for 18 months — historically a recession signal — but the Fed's 'higher for longer' stance has extended the window. Watch for dis-inversion as a more immediate risk-on signal than the inversion itself.
            </div>
            <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>Bias: Cautious — not panicking yet</div>
          </div>
        </div>
      </div>
    ),
  },
]

export default function LandingPage() {
  const router = useRouter()
  const [annual, setAnnual] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)
  const [fading, setFading] = useState(false)

  const traderPrice = annual ? '24.99' : '29.99'
  const proPrice = annual ? '41.66' : '49.99'
  const traderAnnual = '299.88'
  const proAnnual = '499.92'

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setActiveSlide(prev => (prev + 1) % slides.length)
        setFading(false)
      }, 300)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const goToSlide = (idx: number) => {
    if (idx === activeSlide) return
    setFading(true)
    setTimeout(() => {
      setActiveSlide(idx)
      setFading(false)
    }, 300)
  }

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: TEXT, overflowX: 'hidden', background: '#fff' }}>
      <style>{mobileCSS}</style>

        {/* ── NAV ── */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${BORDER}`,
          padding: '0 32px', height: '64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <img src="/logo-preview.svg" alt="Investment Council" style={{ height: '40px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div className="landing-nav-links" style={{ display: 'flex', gap: '24px' }}>
              {[
                { label: 'Features', href: '#features' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'vs Competitors', href: '#vs-competitors' },
              ].map(({ label, href }) => (
                <a key={label} href={href} style={{
                  color: TEXT_MUTED, textDecoration: 'none', fontSize: '14px', fontWeight: 500,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = NAVY)}
                onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}
                >{label}</a>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LanguageSwitcher />
              <button onClick={() => router.push('/login')} style={{
                background: 'transparent', border: `1px solid ${BORDER}`,
                borderRadius: '8px', padding: '8px 18px',
                color: NAVY, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.background = '#f0f4f8' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = 'transparent' }}
              >Log in</button>
              <button onClick={() => router.push('/login')} style={{
                background: GOLD, border: 'none', borderRadius: '8px', padding: '8px 20px',
                color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#b8913d'}
              onMouseLeave={e => e.currentTarget.style.background = GOLD}
              >Start Free Trial</button>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="landing-hero-section" style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a5c 60%, #0d2035 100%)`,
          padding: '100px 32px 80px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.04,
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }} />

          <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(201,163,78,0.15)', border: '1px solid rgba(201,163,78,0.3)',
              borderRadius: '20px', padding: '6px 16px', marginBottom: '28px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: GOLD, display: 'inline-block' }} />
              <span style={{ color: GOLD, fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em' }}>
                18 Frameworks · Live Market Data · No Agenda
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800,
              color: '#fff', lineHeight: 1.1, marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}>
              The AI Stock Analysis Tool<br />
              <span style={{ color: GOLD }}>Built for Retail Traders.</span>
            </h1>
            <p style={{
              fontSize: '16px', fontWeight: 600, color: GOLD,
              letterSpacing: '0.04em', marginBottom: '20px',
              textTransform: 'uppercase',
            }}>
              Institutional-grade analysis for everyday investors
            </p>

            <p style={{
              fontSize: '18px', color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.7, marginBottom: '36px', maxWidth: '620px', margin: '0 auto 36px',
            }}>
              Daily AI stock picks, AI trading signals, crypto market analysis, and options picks with entry, stop &amp; target —
              plus pre-market briefings and 18 investment frameworks. Free to start, no credit card required.
            </p>

            <div className="landing-hero-buttons" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/login')} style={{
                background: GOLD, border: 'none', borderRadius: '10px',
                padding: '14px 32px', color: '#fff', fontSize: '16px',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 20px rgba(201,163,78,0.4)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#b8913d'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.transform = 'translateY(0)' }}
              >Start Free — 7 Days Full Access</button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginTop: '16px' }}>
              No credit card required for free tier · Cancel anytime
            </p>
          </div>

          {/* ── SLIDESHOW MOCKUP ── */}
          <div className="landing-mockup" style={{ maxWidth: '900px', margin: '64px auto 0', position: 'relative' }}>
            <div style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px', overflow: 'hidden',
              boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            }}>
              {/* Browser chrome */}
              <div style={{
                background: 'rgba(0,0,0,0.3)', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['#ff5f57','#ffbd2e','#28c840'].map(c => (
                    <div key={c} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c }} />
                  ))}
                </div>
                <div style={{
                  flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: '6px',
                  padding: '4px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginLeft: '8px',
                }}>www.investmentcouncil.io/app</div>
              </div>

              {/* Slide content */}
              <div style={{
                height: '320px',
                opacity: fading ? 0 : 1,
                transition: 'opacity 0.3s ease',
              }}>
                {slides[activeSlide].content}
              </div>

              {/* Slide label + dots */}
              <div style={{
                background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: '10px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  {slides[activeSlide].label}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToSlide(i)}
                      style={{
                        width: i === activeSlide ? '20px' : '6px',
                        height: '6px',
                        borderRadius: '3px',
                        background: i === activeSlide ? GOLD : 'rgba(255,255,255,0.25)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.3s ease',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS BAR ── */}
        <section className="landing-stats-bar" style={{ background: NAVY, padding: '24px 32px', display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap' }}>
          {[
            { num: '18', label: 'Investment Frameworks' },
            { num: '2', label: 'Markets: Stocks & Crypto' },
            { num: '8', label: 'Email Alert Types' },
            { num: '~5s', label: 'Report Generation' },
            { num: '100%', label: 'Unbiased — No Agenda' },
          ].map(({ num, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '26px', fontWeight: 800, color: GOLD }}>{num}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="landing-section" style={{ padding: '80px 32px', background: '#fff' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <h2 style={{ fontSize: '36px', fontWeight: 800, color: NAVY, marginBottom: '12px' }}>
                Everything a Serious Trader Needs
              </h2>
              <p style={{ fontSize: '16px', color: TEXT_MUTED, maxWidth: '560px', margin: '0 auto' }}>
                From pre-market briefings to on-chain crypto analysis — one platform, no tab switching, no noise.
              </p>
            </div>
            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              {[
                { icon: '⚡', title: 'On-Demand AI Council Chat', desc: '18 investment frameworks ready to analyze any stock, crypto, or market condition. Ask anything — get structured, unbiased analysis in seconds.', tag: 'All Plans', tagBg: '#dcfce7', tagColor: '#16a34a' },
                { icon: '🌅', title: 'Pre-Market Briefing & EOD Summary', desc: 'Start every trading day with a full market snapshot — futures, key levels, macro risks, and what to watch. End the day with a full recap. Free tier gets a limited snapshot preview.', tag: 'Full on Trader & Pro', tagBg: '#e8eef5', tagColor: NAVY },
                { icon: '🤖', title: 'AI Daily Picks', desc: 'Stocks and crypto picks generated fresh each morning with entry price, bias, catalyst, and rationale. Track record builds over time.', tag: 'Trader & Pro', tagBg: '#e8eef5', tagColor: NAVY },
                { icon: '📊', title: 'Crypto Dashboard', desc: 'BTC dominance gauge, altcoin season index, funding rates, on-chain health metrics, and top 10 prices — all in one live view.', tag: 'Trader & Pro', tagBg: '#e8eef5', tagColor: NAVY },
                { icon: '🎯', title: 'Options Picks with Entry/Stop/Target', desc: 'Daily options trade ideas with full risk management — entry premium, stop loss %, take profit %, and complete rationale.', tag: 'Pro Only', tagBg: GOLD_LIGHT, tagColor: '#92680a' },
                { icon: '🛡️', title: 'IC Market Guardian', desc: 'AI scans all market news daily and alerts you only when something price-moving hits your holdings. In-app alerts + email delivery for Pro members.', tag: 'Pro Only', tagBg: GOLD_LIGHT, tagColor: '#92680a' },
                { icon: '🔔', title: 'Email & SMS Alerts', desc: 'Morning briefings, EOD recaps, AI picks, options trades, fear & greed extremes, and Guardian news alerts delivered to your inbox or phone.', tag: 'Trader & Pro', tagBg: '#e8eef5', tagColor: NAVY },
                { icon: '🌍', title: 'Macro & Sector Intelligence', desc: 'Yield curve analysis, sector rotation signals, market health checks, volatility readings, and macro environment breakdowns.', tag: 'All Plans', tagBg: '#dcfce7', tagColor: '#16a34a' },
                { icon: '📈', title: 'Charts, Screeners & Calendars', desc: 'Interactive charts, candlestick pattern scanner, earnings calendar, IPO calendar, economic events, and market movers.', tag: 'Trader & Pro', tagBg: '#e8eef5', tagColor: NAVY },
                { icon: '🧮', title: 'Trade Tools & Calculators', desc: 'Position sizing, risk assessment, entry/stop/target calculator, hold-or-cut analysis, and portfolio & watchlist tracking.', tag: 'All Plans', tagBg: '#dcfce7', tagColor: '#16a34a' },
              ].map(({ icon, title, desc, tag, tagBg, tagColor }) => (
                <div key={title}
                  style={{ border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '24px', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.boxShadow = '0 4px 24px rgba(201,163,78,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '12px' }}>{icon}</div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>{title}</h3>
                  <p style={{ fontSize: '14px', color: TEXT_MUTED, lineHeight: 1.6, margin: '0 0 12px' }}>{desc}</p>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: tagColor, background: tagBg, borderRadius: '4px', padding: '3px 8px' }}>{tag}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── IC MARKET GUARDIAN SPOTLIGHT ── */}
        <section style={{ padding: '80px 32px', background: NAVY, overflow: 'hidden', position: 'relative' }}>
          {/* Background pulse rings */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', opacity: 0.04 }}>
            {[200,340,480].map(r => (
              <div key={r} style={{ position: 'absolute', width: r, height: r, borderRadius: '50%', border: '1px solid #C9A34E', transform: 'translate(-50%,-50%)', top: '50%', left: '50%' }} />
            ))}
          </div>

          <div className="guardian-layout" style={{ maxWidth: '1040px', margin: '0 auto', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '64px', alignItems: 'center' }}>

            {/* Left — logo + sample alert card */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', flexShrink: 0 }}>

              {/* Logo + label */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <img src="/guardian.png" alt="IC Market Guardian" style={{ display: 'block', width: '400px', height: 'auto' }} />
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#C9A34E', letterSpacing: '0.22em', textAlign: 'center', opacity: 0.7 }}>POWERED BY IC MARKET GUARDIAN</div>
              </div>

              {/* Sample alert card — realistic mockup */}
              <div style={{
                width: '100%',
                background: '#1a0505',
                border: '1px solid #7f1d1d',
                borderLeft: '3px solid #ef4444',
                borderRadius: '10px',
                padding: '14px 15px',
                boxShadow: '0 8px 32px rgba(239,68,68,0.15)',
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#e5e5e5', letterSpacing: '0.04em' }}>NVDA</span>
                    <span style={{ fontSize: '8px', fontWeight: 700, color: '#ef4444', background: '#ef444420', borderRadius: '3px', padding: '1px 5px', letterSpacing: '0.08em' }}>HIGH</span>
                    <span style={{ fontSize: '10px', color: '#f87171', fontWeight: 700 }}>▼ negative</span>
                  </div>
                  <span style={{ fontSize: '8px', color: '#555' }}>2h ago</span>
                </div>
                {/* Summary */}
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#e5e5e5', lineHeight: 1.5, marginBottom: '6px' }}>
                  Fed signals higher-for-longer; chip stocks face margin compression.
                </div>
                {/* Headline */}
                <div style={{ fontSize: '10px', color: '#555', fontStyle: 'italic', lineHeight: 1.4, marginBottom: '8px' }}>
                  "Fed minutes reveal hawkish stance, markets reprice rate cuts"
                  <span style={{ fontStyle: 'normal', fontWeight: 600, color: '#444', marginLeft: '4px' }}>— Reuters</span>
                </div>
                {/* Price estimate box */}
                <div style={{ background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: '4px', padding: '6px 9px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#f87171' }}>AI estimate at time of news: -3 to -5%</div>
                  <div style={{ fontSize: '8px', color: '#333', marginTop: '2px' }}>Verify current price before acting · Not financial advice</div>
                </div>
              </div>

              <div style={{ fontSize: '10px', color: '#374151', textAlign: 'center', fontStyle: 'italic', opacity: 0.5 }}>
                Sample alert — Pro members only
              </div>
            </div>

            {/* Copy */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#C9A34E', letterSpacing: '0.15em', marginBottom: '12px' }}>NEW FEATURE</div>
              <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#fff', margin: '0 0 16px', lineHeight: 1.2 }}>
                Watches your portfolio<br />while you live your life.
              </h2>
              <p style={{ fontSize: '16px', color: '#9ca3af', lineHeight: 1.7, margin: '0 0 32px' }}>
                Every morning, IC Market Guardian scans thousands of headlines and uses AI to find only the ones that could move <em>your specific holdings</em> — not generic market noise. You get a plain-English impact summary, estimated price move, and severity level. Nothing irrelevant ever reaches you.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '36px' }}>
                {[
                  { icon: '🎯', title: 'Pinpoint Accuracy', desc: 'Only alerts that directly or indirectly affect your holdings. Smart mode filters out noise automatically.' },
                  { icon: '📱', title: 'Any Device', desc: 'In-app bell icon, email digest, SMS to your phone. Same intelligence, right format for each screen.' },
                  { icon: '⚙️', title: 'Per-Holding Control', desc: 'Set Smart mode (price-moving only) or Everything mode per ticker. Mix and match to your preference.' },
                ].map(f => (
                  <div key={f.title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,163,78,0.2)', borderRadius: '10px', padding: '18px' }}>
                    <div style={{ fontSize: '20px', marginBottom: '8px' }}>{f.icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5e5e5', marginBottom: '6px' }}>{f.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.6 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '11px', color: '#4b5563', fontStyle: 'italic' }}>
                  "If I had $10,000 in the market and was on vacation — would I trust this to tell me if something important happened?"
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="landing-section" style={{ padding: '80px 32px', background: GREY_BG }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: NAVY, marginBottom: '12px' }}>How It Works</h2>
            <p style={{ fontSize: '16px', color: TEXT_MUTED, marginBottom: '56px' }}>From zero to full market analysis in under 30 seconds.</p>
            <div className="howitworks-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '40px' }}>
              {[
                { step: '01', title: 'Pick a Framework or Ask Anything', desc: 'Choose from 18 pre-built frameworks or type any market question. Pre-market briefing, sector rotation, crypto dashboard, options ideas — all ready.' },
                { step: '02', title: 'Get Instant Structured Analysis', desc: 'The AI council generates a full structured report in seconds. No fluff, no hype — clean analysis with data, reasoning, and key levels.' },
                { step: '03', title: 'Act With Confidence', desc: 'Use the analysis to inform your trades. Save as PDF, set up email alerts, or ask follow-up questions to go deeper on any idea.' },
              ].map(({ step, title, desc }) => (
                <div key={step}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: NAVY, color: GOLD, fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>{step}</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: NAVY, marginBottom: '10px' }}>{title}</h3>
                  <p style={{ fontSize: '14px', color: TEXT_MUTED, lineHeight: 1.7 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" className="landing-section" style={{ padding: '80px 32px', background: '#fff' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: NAVY, marginBottom: '12px' }}>Simple, Transparent Pricing</h2>
            <p style={{ fontSize: '16px', color: TEXT_MUTED, marginBottom: '32px' }}>Start with 7 days full Pro access — no credit card required for Free tier.</p>

            {/* Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '48px' }}>
              <span style={{ fontSize: '14px', color: annual ? TEXT_MUTED : NAVY, fontWeight: annual ? 400 : 600 }}>Monthly</span>
              <div onClick={() => setAnnual(!annual)} style={{ width: '48px', height: '26px', borderRadius: '13px', background: annual ? NAVY : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: '3px', left: annual ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <span style={{ fontSize: '14px', color: annual ? NAVY : TEXT_MUTED, fontWeight: annual ? 600 : 400 }}>
                Annual <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', marginLeft: '4px' }}>2 months free</span>
              </span>
            </div>

            <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', alignItems: 'start' }}>

              {/* Free */}
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '32px 24px', textAlign: 'left' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: TEXT_MUTED, letterSpacing: '0.08em', marginBottom: '8px' }}>FREE</div>
                <div style={{ fontSize: '40px', fontWeight: 800, color: NAVY, marginBottom: '4px' }}>$0</div>
                <div style={{ fontSize: '13px', color: TEXT_MUTED, marginBottom: '24px' }}>Forever free</div>
                <button onClick={() => router.push('/login')} style={{ width: '100%', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '10px', color: NAVY, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '24px' }}>
                  Get Started Free
                </button>
                {['5 council queries per day', 'Pre-Market snapshot (limited preview)', 'EOD snapshot (limited preview)', 'Portfolio tracker', 'Watchlist'].map(f => (
                  <div key={f} style={{ display: 'flex', gap: '8px', fontSize: '14px', color: TEXT, marginBottom: '10px' }}>
                    <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>

              {/* Trader */}
              <div style={{ border: `2px solid ${NAVY}`, borderRadius: '16px', padding: '32px 24px', textAlign: 'left', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: NAVY, color: '#fff', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '4px 14px', whiteSpace: 'nowrap' }}>MOST POPULAR</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: NAVY, letterSpacing: '0.08em', marginBottom: '8px' }}>TRADER</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '40px', fontWeight: 800, color: NAVY }}>${traderPrice}</span>
                  <span style={{ fontSize: '14px', color: TEXT_MUTED }}>/mo</span>
                </div>
                {annual && <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600, marginBottom: '4px' }}>Billed ${traderAnnual}/yr · save $60</div>}
                <div style={{ fontSize: '13px', color: TEXT_MUTED, marginBottom: '24px' }}>7-day free trial</div>
                <button onClick={() => router.push('/login')} style={{ width: '100%', background: NAVY, border: 'none', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '24px' }}>
                  Start Free Trial
                </button>
                {['Unlimited council queries', 'All 18 investment frameworks', 'Full stocks & crypto analysis', 'Full pre-market briefing daily', 'Full end-of-day recap daily', 'AI daily picks — stocks & crypto', 'Sector rotation, macro, volatility', 'Charts, calendars & screeners', 'Email alerts — 7 types', 'Portfolio & watchlist', 'PDF export & print'].map(f => (
                  <div key={f} style={{ display: 'flex', gap: '8px', fontSize: '14px', color: TEXT, marginBottom: '10px' }}>
                    <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>

              {/* Pro */}
              <div style={{ border: `2px solid ${GOLD}`, borderRadius: '16px', padding: '32px 24px', textAlign: 'left', position: 'relative', background: '#fffdf7' }}>
                <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: GOLD, color: '#fff', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '4px 14px', whiteSpace: 'nowrap' }}>OPTIONS TRADER</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#92680a', letterSpacing: '0.08em', marginBottom: '8px' }}>PRO</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '40px', fontWeight: 800, color: NAVY }}>${proPrice}</span>
                  <span style={{ fontSize: '14px', color: TEXT_MUTED }}>/mo</span>
                </div>
                {annual && <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600, marginBottom: '4px' }}>Billed ${proAnnual}/yr · save $100</div>}
                <div style={{ fontSize: '13px', color: TEXT_MUTED, marginBottom: '24px' }}>7-day free trial</div>
                <button onClick={() => router.push('/login')} style={{ width: '100%', background: GOLD, border: 'none', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '24px' }}>
                  Start Free Trial
                </button>
                {['Everything in Trader', 'AI options picks daily', 'Entry premium, stop & target', 'Options email alerts', '🛡️ IC Market Guardian alerts', 'Guardian email delivery', 'Priority report generation', 'Early access to new features'].map(f => (
                  <div key={f} style={{ display: 'flex', gap: '8px', fontSize: '14px', color: TEXT, marginBottom: '10px' }}>
                    <span style={{ color: GOLD, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ── VS COMPETITORS ── */}
        <section id="vs-competitors" className="landing-section" style={{ padding: '80px 32px', background: GREY_BG }}>
          <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: NAVY, marginBottom: '12px' }}>Why Investment Council?</h2>
            <p style={{ fontSize: '16px', color: TEXT_MUTED, marginBottom: '48px' }}>
              The only platform combining stocks, crypto, and options AI analysis in one place — free to start.
            </p>
            <div className="competitor-table-wrapper" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                    <th style={{ padding: '12px 16px', color: TEXT_MUTED, fontWeight: 600 }}>Feature</th>
                    {['Investment Council', 'Motley Fool', 'Seeking Alpha', 'Trade Ideas'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', fontWeight: 700, color: h === 'Investment Council' ? NAVY : TEXT_MUTED, background: h === 'Investment Council' ? '#eef2f7' : 'transparent' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['AI daily picks — stocks, crypto, options', '✓', '✗', '✗', 'Partial'],
                    ['Pre-market & EOD briefings', '✓', '✗', 'Partial', '✗'],
                    ['Options picks with entry/stop/target', '✓', '✗', '✗', '✗'],
                    ['Crypto coverage + on-chain metrics', '✓', '✗', '✗', '✗'],
                    ['Automated email alerts', '✓', 'Partial', 'Paid', '✓'],
                    ['Research frameworks (Buffett, Dalio…)', '✓', '✗', '✗', '✗'],
                    ['War of the AIs leaderboard', '✓', '✗', '✗', '✗'],
                    ['Free tier available', '✓', '✗', 'Limited', '✗'],
                    ['Monthly price', '$29.99', '$99–$199/yr', '$19.99/mo', '$118/mo'],
                  ].map(([feature, ...vals], i) => (
                    <tr key={feature} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? '#fff' : 'transparent' }}>
                      <td style={{ padding: '12px 16px', color: TEXT, fontWeight: 500 }}>{feature}</td>
                      {vals.map((v, j) => (
                        <td key={j} style={{ padding: '12px 16px', background: j === 0 ? '#eef2f7' : 'transparent', fontWeight: j === 0 ? 700 : 400, color: v === '✓' ? '#16a34a' : v === '✗' ? '#dc2626' : v?.startsWith('$') ? (j === 0 ? '#16a34a' : '#dc2626') : TEXT_MUTED }}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="landing-section" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a5c 100%)`, padding: '80px 32px', textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', marginBottom: '16px', lineHeight: 1.2 }}>Ready to Trade Smarter?</h2>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.65)', marginBottom: '36px', lineHeight: 1.7 }}>
              Join traders using Investment Council for daily briefings, AI picks, and unbiased market analysis. Start free — no credit card needed.
            </p>
            <button onClick={() => router.push('/login')} style={{ background: GOLD, border: 'none', borderRadius: '10px', padding: '16px 40px', color: '#fff', fontSize: '17px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 24px rgba(201,163,78,0.4)' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#b8913d'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.transform = 'translateY(0)' }}
            >Start Your Free Trial →</button>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginTop: '14px' }}>7 days full Pro access · No credit card required</p>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ background: '#06060a', padding: '48px 32px 32px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px', marginBottom: '40px' }}>
              <div style={{ maxWidth: '280px' }}>
                <img src="/logo-preview.svg" alt="Investment Council" style={{ height: '32px', marginBottom: '12px', filter: 'brightness(0.55)' }} />
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                  AI-powered investment research for retail traders. No hype. No agenda. Just analysis.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', marginBottom: '14px' }}>PRODUCT</div>
                  {['Features', 'Pricing', 'AI Daily Picks', 'War of the AIs', 'Email Alerts'].map(l => (
                    <a key={l} href="#" style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', marginBottom: '8px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                    >{l}</a>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', marginBottom: '14px' }}>COMPARE</div>
                  {['vs Motley Fool', 'vs Seeking Alpha', 'vs Trade Ideas', 'vs Tickeron'].map(l => (
                    <a key={l} href="#" style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', marginBottom: '8px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                    >{l}</a>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', marginBottom: '14px' }}>LEARN</div>
                  {[
                    { label: 'Blog', href: '/blog' },
                    { label: 'About', href: '/about' },
                    { label: 'AI Stock Analysis', href: '/blog/ai-stock-analysis-how-it-works' },
                    { label: 'AI Crypto Analysis', href: '/blog/ai-crypto-analysis-complete-guide' },
                    { label: 'AI Trading Signals', href: '/blog/ai-trading-signals-explained' },
                  ].map(l => (
                    <a key={l.label} href={l.href} style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', marginBottom: '8px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                    >{l.label}</a>
                  ))}
                </div>
              </div>
            </div>
            {/* Trustpilot Review Collector */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
              <div className="trustpilot-widget" data-locale="en-US" data-template-id="56278e9abfbbba0bdcd568bc" data-businessunit-id="69c5b4cb7b137baf756afbd9" data-style-height="52px" data-style-width="100%" data-token="e3f70c30-f798-4ff1-b39c-45432236b50b">
                <a href="https://www.trustpilot.com/review/investmentcouncil.io" target="_blank" rel="noopener">Trustpilot</a>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>© 2026 Investment Council</span>
                {[
                  { label: 'Terms', href: '/terms' },
                  { label: 'Privacy', href: '/privacy' },
                  { label: 'Contact', href: '/contact' },
                  { label: 'Sitemap', href: '/sitemap-page' },
                ].map(l => (
                  <a key={l.label} href={l.href} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                  >{l.label}</a>
                ))}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', maxWidth: '480px', textAlign: 'right', lineHeight: 1.5 }}>
                For educational and informational purposes only. Not financial advice. Past performance is not indicative of future results.
              </div>
            </div>
          </div>
        </footer>

      </div>
  )
}
