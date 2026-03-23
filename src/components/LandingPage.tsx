'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const NAVY = '#0F2A44'
const GOLD = '#C9A34E'
const GOLD_LIGHT = '#f5e6c8'
const GREY_BG = '#f8f9fb'
const TEXT = '#1f2937'
const TEXT_MUTED = '#6b7280'
const BORDER = '#e5e7eb'

export default function LandingPage() {
  const router = useRouter()
  const [annual, setAnnual] = useState(false)

  const traderPrice = annual ? '24.99' : '29.99'
  const proPrice = annual ? '41.66' : '49.99'
  const traderAnnual = '299.88'
  const proAnnual = '499.92'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Investment Council',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    description: 'AI-powered investment research platform with 18 frameworks for stocks, crypto, and options analysis. No hype, no agenda.',
    url: 'https://www.investmentcouncil.io',
    offers: [
      { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free' },
      { '@type': 'Offer', price: '29.99', priceCurrency: 'USD', name: 'Trader' },
      { '@type': 'Offer', price: '49.99', priceCurrency: 'USD', name: 'Pro' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: TEXT, overflowX: 'hidden' }}>

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
            <div style={{ display: 'flex', gap: '24px' }}>
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
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => router.push('/app')} style={{
                background: 'transparent', border: `1px solid ${BORDER}`,
                borderRadius: '8px', padding: '8px 18px',
                color: NAVY, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.background = '#f0f4f8' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = 'transparent' }}
              >Log in</button>
              <button onClick={() => router.push('/app')} style={{
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
        <section style={{
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
              color: '#fff', lineHeight: 1.1, marginBottom: '20px',
              letterSpacing: '-0.02em',
            }}>
              Your Personal AI Analyst.<br />
              <span style={{ color: GOLD }}>No Hype. No Bias.</span>
            </h1>

            <p style={{
              fontSize: '18px', color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.7, marginBottom: '36px', maxWidth: '600px', margin: '0 auto 36px',
            }}>
              Free AI stock and crypto research dashboard with on-demand analysis, pre-market briefings,
              AI daily picks, and 18 unbiased investment frameworks — all in one place.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/app')} style={{
                background: GOLD, border: 'none', borderRadius: '10px',
                padding: '14px 32px', color: '#fff', fontSize: '16px',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 20px rgba(201,163,78,0.4)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#b8913d'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.transform = 'translateY(0)' }}
              >Start Free — 7 Days Full Access</button>
              <button onClick={() => router.push('/app')} style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '10px', padding: '14px 32px',
                color: '#fff', fontSize: '16px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.55)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'}
              >See Live Demo →</button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginTop: '16px' }}>
              No credit card required for free tier · Cancel anytime
            </p>
          </div>

          {/* App mockup */}
          <div style={{ maxWidth: '900px', margin: '64px auto 0', position: 'relative' }}>
            <div style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px', overflow: 'hidden',
              boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            }}>
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
              <div style={{ display: 'flex', height: '320px' }}>
                <div style={{ width: '180px', background: '#070707', borderRight: '1px solid #111', padding: '12px 8px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                    <div style={{ flex: 1, background: '#1a472a', borderRadius: '5px', padding: '5px', textAlign: 'center', fontSize: '10px', color: '#7ec8a0', fontWeight: 700 }}>STOCKS</div>
                    <div style={{ flex: 1, background: '#111', borderRadius: '5px', padding: '5px', textAlign: 'center', fontSize: '10px', color: '#333', fontWeight: 700 }}>CRYPTO</div>
                  </div>
                  {[
                    { section: 'MARKET', items: ['Pre-Market Briefing', 'End of Day Summary', 'Market Health', 'Fear & Greed'] },
                    { section: 'GET DATA', items: ['AI Daily Picks', 'Chart a Ticker', 'Email Alerts'] },
                  ].map(({ section, items }) => (
                    <div key={section}>
                      <div style={{ fontSize: '8px', color: '#2e2e2e', fontWeight: 700, letterSpacing: '0.1em', padding: '8px 6px 4px' }}>{section}</div>
                      {items.map(item => (
                        <div key={item} style={{ fontSize: '11px', color: item === 'AI Daily Picks' ? '#7ec8a0' : '#444', padding: '3px 8px', fontWeight: item === 'AI Daily Picks' ? 600 : 400 }}>{item}</div>
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, background: '#0a0a0a', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                  {[
                    { role: 'ai', text: <><span style={{ color: '#7ec8a0', fontWeight: 600 }}>SPY +0.4% · QQQ +0.6% · DIA +0.2%</span><br />Futures pointing higher after Fed minutes. Key resistance at 524.<br /><span style={{ color: GOLD }}>Watch: CPI 8:30am · NVDA earnings aftermarket</span></> },
                    { role: 'user', text: 'What is the sector rotation signal right now?' },
                    { role: 'ai', text: <><span style={{ color: '#fff', fontWeight: 600 }}>Rotating into Technology & Healthcare</span><br />Energy outflows accelerating. Risk-on dominant. Overweight QQQ, underweight XLE...</> },
                  ].map(({ role, text }, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', justifyContent: role === 'user' ? 'flex-end' : 'flex-start' }}>
                      {role === 'ai' && <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #1a472a, #2d6a4f)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>⚡</div>}
                      <div style={{ background: role === 'ai' ? '#111' : '#1a1a1a', borderRadius: '8px', padding: '10px 14px', maxWidth: '75%' }}>
                        <div style={{ fontSize: '10px', color: '#666', lineHeight: 1.6 }}>{text}</div>
                      </div>
                      {role === 'user' && <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1f1f1f', flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS BAR ── */}
        <section style={{ background: NAVY, padding: '24px 32px', display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap' }}>
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
        <section id="features" style={{ padding: '80px 32px', background: '#fff' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <h2 style={{ fontSize: '36px', fontWeight: 800, color: NAVY, marginBottom: '12px' }}>
                Everything a Serious Trader Needs
              </h2>
              <p style={{ fontSize: '16px', color: TEXT_MUTED, maxWidth: '560px', margin: '0 auto' }}>
                From pre-market briefings to on-chain crypto analysis — one platform, no tab switching, no noise.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              {[
                { icon: '⚡', title: 'On-Demand AI Council Chat', desc: '18 investment frameworks ready to analyze any stock, crypto, or market condition. Ask anything — get structured, unbiased analysis in seconds.', tag: 'All Plans', tagBg: '#dcfce7', tagColor: '#16a34a' },
                { icon: '🌅', title: 'Pre-Market Briefing & EOD Summary', desc: 'Start every trading day with a full market snapshot — futures, key levels, macro risks, and what to watch. End the day with a full recap.', tag: 'All Plans', tagBg: '#dcfce7', tagColor: '#16a34a' },
                { icon: '🤖', title: 'AI Daily Picks', desc: 'Stocks and crypto picks generated fresh each morning with entry price, bias, catalyst, and rationale. Track record builds over time.', tag: 'Trader & Pro', tagBg: '#e8eef5', tagColor: NAVY },
                { icon: '📊', title: 'Crypto Dashboard', desc: 'BTC dominance gauge, altcoin season index, funding rates, on-chain health metrics, and top 10 prices — all in one live view.', tag: 'Trader & Pro', tagBg: '#e8eef5', tagColor: NAVY },
                { icon: '🎯', title: 'Options Picks with Entry/Stop/Target', desc: 'Daily options trade ideas with full risk management — entry premium, stop loss %, take profit %, and complete rationale.', tag: 'Pro Only', tagBg: GOLD_LIGHT, tagColor: '#92680a' },
                { icon: '🔔', title: 'Email Alerts', desc: 'Morning briefings, EOD recaps, AI picks, options trades, and fear & greed extremes delivered to your inbox automatically.', tag: 'Trader & Pro', tagBg: '#e8eef5', tagColor: NAVY },
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

        {/* ── HOW IT WORKS ── */}
        <section style={{ padding: '80px 32px', background: GREY_BG }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: NAVY, marginBottom: '12px' }}>How It Works</h2>
            <p style={{ fontSize: '16px', color: TEXT_MUTED, marginBottom: '56px' }}>From zero to full market analysis in under 30 seconds.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '40px' }}>
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
        <section id="pricing" style={{ padding: '80px 32px', background: '#fff' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', alignItems: 'start' }}>

              {/* Free */}
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '32px 24px', textAlign: 'left' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: TEXT_MUTED, letterSpacing: '0.08em', marginBottom: '8px' }}>FREE</div>
                <div style={{ fontSize: '40px', fontWeight: 800, color: NAVY, marginBottom: '4px' }}>$0</div>
                <div style={{ fontSize: '13px', color: TEXT_MUTED, marginBottom: '24px' }}>Forever free</div>
                <button onClick={() => router.push('/app')} style={{ width: '100%', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '10px', color: NAVY, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '24px' }}>
                  Get Started Free
                </button>
                {['5 council queries per day', 'Pre-Market Briefing', 'End of Day Summary', 'Portfolio tracker', 'Watchlist'].map(f => (
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
                <button onClick={() => router.push('/app')} style={{ width: '100%', background: NAVY, border: 'none', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '24px' }}>
                  Start Free Trial
                </button>
                {['Unlimited council queries', 'All 18 investment frameworks', 'Full stocks & crypto analysis', 'AI daily picks — stocks & crypto', 'Sector rotation, macro, volatility', 'Charts, calendars & screeners', 'Email alerts — 7 types', 'Portfolio & watchlist', 'PDF export & print'].map(f => (
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
                <button onClick={() => router.push('/app')} style={{ width: '100%', background: GOLD, border: 'none', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '24px' }}>
                  Start Free Trial
                </button>
                {['Everything in Trader', 'AI options picks daily', 'Entry premium, stop & target', 'Options email alerts', 'Priority report generation', 'Early access to new features'].map(f => (
                  <div key={f} style={{ display: 'flex', gap: '8px', fontSize: '14px', color: TEXT, marginBottom: '10px' }}>
                    <span style={{ color: GOLD, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ── VS COMPETITORS ── */}
        <section id="vs-competitors" style={{ padding: '80px 32px', background: GREY_BG }}>
          <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: NAVY, marginBottom: '12px' }}>Why Investment Council?</h2>
            <p style={{ fontSize: '16px', color: TEXT_MUTED, marginBottom: '48px' }}>
              The only platform combining stocks, crypto, and options AI analysis in one place — free to start.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                    <th style={{ padding: '12px 16px', color: TEXT_MUTED, fontWeight: 600 }}>Feature</th>
                    {['Investment Council', 'TradingView', 'Seeking Alpha', 'ChatGPT'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', fontWeight: 700, color: h === 'Investment Council' ? NAVY : TEXT_MUTED, background: h === 'Investment Council' ? '#eef2f7' : 'transparent' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['AI-generated analysis on demand', '✓', '✗', '✗', 'Partial'],
                    ['Stocks + Crypto in one platform', '✓', 'Partial', '✗', '✓'],
                    ['Pre-market & EOD briefings', '✓', '✗', 'Partial', '✗'],
                    ['Options picks with entry/stop/target', '✓', '✗', '✗', '✗'],
                    ['On-chain crypto metrics', '✓', '✗', '✗', '✗'],
                    ['Altcoin season indicator', '✓', '✗', '✗', '✗'],
                    ['Automated email alerts', '✓', 'Paid', 'Paid', '✗'],
                    ['Free tier available', '✓', 'Limited', 'Limited', '✓'],
                    ['No hype — no bias', '✓', 'Community', 'Varies', 'Varies'],
                  ].map(([feature, ...vals], i) => (
                    <tr key={feature} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? '#fff' : 'transparent' }}>
                      <td style={{ padding: '12px 16px', color: TEXT, fontWeight: 500 }}>{feature}</td>
                      {vals.map((v, j) => (
                        <td key={j} style={{ padding: '12px 16px', background: j === 0 ? '#eef2f7' : 'transparent', fontWeight: j === 0 ? 700 : 400, color: v === '✓' ? '#16a34a' : v === '✗' ? '#dc2626' : TEXT_MUTED }}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a5c 100%)`, padding: '80px 32px', textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', marginBottom: '16px', lineHeight: 1.2 }}>Ready to Trade Smarter?</h2>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.65)', marginBottom: '36px', lineHeight: 1.7 }}>
              Join traders using Investment Council for daily briefings, AI picks, and unbiased market analysis. Start free — no credit card needed.
            </p>
            <button onClick={() => router.push('/app')} style={{ background: GOLD, border: 'none', borderRadius: '10px', padding: '16px 40px', color: '#fff', fontSize: '17px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 24px rgba(201,163,78,0.4)' }}
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
                  {['Features', 'Pricing', 'Crypto Dashboard', 'AI Daily Picks', 'Email Alerts'].map(l => (
                    <a key={l} href="#" style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', marginBottom: '8px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                    >{l}</a>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', marginBottom: '14px' }}>COMPARE</div>
                  {['vs TradingView', 'vs Seeking Alpha', 'vs ChatGPT', 'vs Glassnode'].map(l => (
                    <a key={l} href="#" style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', marginBottom: '8px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                    >{l}</a>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>© 2026 Investment Council · investmentcouncil.io</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', maxWidth: '560px', textAlign: 'right', lineHeight: 1.5 }}>
                For educational and informational purposes only. Not financial advice. Past performance is not indicative of future results.
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
