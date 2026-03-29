'use client'

import { useRouter } from 'next/navigation'

const NAVY = '#0F2A44'
const GOLD = '#C9A34E'

const SECTIONS = [
  {
    title: 'Main Pages',
    links: [
      { label: 'Home', href: '/', desc: 'AI-powered investment research platform' },
      { label: 'About', href: '/about', desc: 'Our mission, values, and educational approach' },
      { label: 'Login / Sign Up', href: '/login', desc: 'Create a free account or sign in' },
      { label: 'Contact', href: '/contact', desc: 'Get in touch with our team' },
    ],
  },
  {
    title: 'Platform Features',
    links: [
      { label: 'Council Chat', href: '/app', desc: 'AI investment analysis with 18 expert frameworks' },
      { label: 'AI Daily Picks', href: '/app', desc: 'Stocks, crypto, and options picks generated each morning' },
      { label: 'War of the AIs', href: '/battle', desc: 'Daily AI model competition — Claude vs GPT vs Gemini vs Grok' },
      { label: 'BTC Dashboard', href: '/crypto-dashboard', desc: 'BTC dominance, on-chain metrics, altcoin season, funding rates, market command center' },
      { label: 'Market Movers', href: '/movers', desc: 'Top gainers, losers, and volume leaders' },
      { label: 'Economic Calendar', href: '/economic-calendar', desc: 'Upcoming Fed events, earnings, and macro releases' },
      { label: 'Fear & Greed Index', href: '/fear-greed', desc: 'Real-time market sentiment indicator' },
      { label: 'IPO Calendar', href: '/ipo', desc: 'Upcoming IPOs and recent listings' },
      { label: 'Market News', href: '/news', desc: 'Live financial news feed' },
      { label: 'Chart Patterns', href: '/patterns', desc: 'Technical pattern scanner across stocks and crypto' },
      { label: 'Training Library', href: '/training', desc: 'Learn trading concepts, strategies, and frameworks' },
      { label: 'Portfolio Tracker', href: '/app', desc: 'Track your positions and performance' },
      { label: 'Watchlist', href: '/app', desc: 'Monitor your favorite stocks and crypto' },
    ],
  },
  {
    title: 'Educational Blog',
    links: [
      { label: 'Blog', href: '/blog', desc: 'All articles and guides' },
      { label: 'AI Stock Analysis — How It Works', href: '/blog/ai-stock-analysis-how-it-works', desc: 'A deep dive into AI-powered stock analysis' },
      { label: 'AI Crypto Analysis Complete Guide', href: '/blog/ai-crypto-analysis-complete-guide', desc: 'How AI analyzes crypto markets' },
      { label: 'AI Trading Signals Explained', href: '/blog/ai-trading-signals-explained', desc: 'What trading signals are and how to use them' },
      { label: 'Investment Council Frameworks Guide', href: '/blog/investment-council-frameworks-guide', desc: 'The 18 investor frameworks explained' },
      { label: 'Options Trading Beginner\'s Guide', href: '/blog/options-trading-beginners-guide', desc: 'Start here for options education' },
      { label: 'Pre-Market Briefing Guide', href: '/blog/pre-market-briefing-guide', desc: 'How to use pre-market data to prepare for the trading day' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/terms', desc: 'Platform rules, subscriptions, and liability' },
      { label: 'Privacy Policy', href: '/privacy', desc: 'How we collect, use, and protect your data' },
    ],
  },
]

export default function SitemapPage() {
  const router = useRouter()

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f8f9fa', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => router.push('/')}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: '#fff' }}>IC</div>
          <span style={{ fontWeight: 700, fontSize: '16px', color: NAVY }}>Investment Council</span>
        </div>
        <button onClick={() => router.push('/')}
          style={{ background: 'none', border: `1px solid ${NAVY}`, borderRadius: '8px', padding: '8px 16px', color: NAVY, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.background = NAVY; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = NAVY }}
        >← Back to Home</button>
      </nav>

      {/* Header */}
      <div style={{ background: NAVY, padding: '56px 32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '40px', fontWeight: 900, color: '#fff', margin: '0 0 12px' }}>Site Map</h1>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.55)', margin: 0 }}>Every page on Investment Council — find what you're looking for</p>
      </div>

      {/* Sections */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 32px 80px' }}>
        {SECTIONS.map(section => (
          <div key={section.title} style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '4px', height: '24px', background: GOLD, borderRadius: '2px' }} />
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: NAVY, margin: 0 }}>{section.title}</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '12px' }}>
              {section.links.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#fff', borderRadius: '10px', padding: '16px 18px', textDecoration: 'none', border: '1px solid #e5e7eb', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb' }}
                >
                  <span style={{ color: GOLD, fontWeight: 700, fontSize: '16px', marginTop: '1px', flexShrink: 0 }}>→</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: NAVY, marginBottom: '3px' }}>{link.label}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.5 }}>{link.desc}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer style={{ background: '#06060a', padding: '24px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
          © 2026 Investment Council · investmentcouncil.io · For educational and informational purposes only. Not financial advice.
        </div>
      </footer>

    </div>
  )
}
