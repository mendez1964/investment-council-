'use client'

import { useRouter } from 'next/navigation'

const NAVY = '#0F2A44'
const GOLD = '#C9A34E'
const GREY_BG = '#f8f9fa'

export default function AboutPage() {
  const router = useRouter()

  const stockFactors = [
    { name: 'Trend Alignment', desc: 'Is the stock trending in the same direction across daily, weekly, and macro time frames?' },
    { name: 'Momentum Quality', desc: 'Is the price momentum sustained and volume-confirmed, or a single-day spike?' },
    { name: 'Sector Flow', desc: 'Is institutional capital flowing into or out of this stock\'s sector right now?' },
    { name: 'Catalyst Clarity', desc: 'Does the stock have a clear, identifiable near-term catalyst to drive the move?' },
    { name: 'Market Regime Fit', desc: 'Does the current macro environment favor this type of trade setup?' },
  ]

  const cryptoFactors = [
    { name: 'BTC Dominance Alignment', desc: 'Is BTC dominance trending in a direction that supports this coin\'s setup?' },
    { name: 'Price Momentum', desc: 'Is the coin showing sustained upward momentum with volume confirmation?' },
    { name: 'Funding Rate Signal', desc: 'Are perpetual futures funding rates neutral to negative, avoiding crowded longs?' },
    { name: 'Narrative Strength', desc: 'Does this coin have a strong, current narrative catalyst driving genuine interest?' },
    { name: 'Fear & Greed Regime', desc: 'Is the overall crypto sentiment positioned for continued upside or nearing euphoria?' },
  ]

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1f2937', margin: 0, padding: 0 }}>

      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          onClick={() => router.push('/')}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: '#fff', letterSpacing: '-0.5px', flexShrink: 0 }}>IC</div>
          <span style={{ fontWeight: 700, fontSize: '16px', color: NAVY }}>Investment Council</span>
        </div>
        <button
          onClick={() => router.push('/')}
          style={{ background: 'none', border: `1px solid ${NAVY}`, borderRadius: '8px', padding: '8px 16px', color: NAVY, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.background = NAVY; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = NAVY }}
        >← Back to Home</button>
      </nav>

      {/* Hero */}
      <section style={{ background: NAVY, padding: '80px 32px 72px', textAlign: 'center' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 800, color: '#fff', marginBottom: '16px', lineHeight: 1.15 }}>About Investment Council</h1>
          <p style={{ fontSize: '20px', fontWeight: 600, color: GOLD, marginBottom: '20px', lineHeight: 1.4 }}>The AI-Powered Investment Analysis Platform Built for Retail Traders</p>
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, maxWidth: '640px', margin: '0 auto' }}>
            We believe every retail trader deserves the same quality of market intelligence that institutional desks have — without the $50,000/year Bloomberg terminal.
          </p>
        </div>
      </section>

      {/* Our Mission */}
      <section style={{ background: '#fff', padding: '80px 32px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: NAVY, textAlign: 'center', marginBottom: '48px' }}>Our Mission</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
            {[
              {
                icon: '🎯',
                title: 'No Hype, No Bias',
                text: 'Every analysis is data-driven. No stock pumping, no affiliate kickbacks, no paid promotions. If the IC Formula says skip it, we skip it.',
              },
              {
                icon: '🤖',
                title: 'AI That Actually Works',
                text: 'We use Claude by Anthropic — the same AI used by Fortune 500 companies — with custom IC Formula prompts designed specifically for financial analysis.',
              },
              {
                icon: '💡',
                title: 'Built for the Retail Trader',
                text: 'Institutional-grade analysis at a price retail traders can afford. Pre-market briefings, daily picks, options trades, and on-chain crypto metrics — all in one place.',
              },
            ].map(pillar => (
              <div key={pillar.title} style={{ background: GREY_BG, borderRadius: '16px', padding: '32px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>{pillar.icon}</div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: NAVY, marginBottom: '12px' }}>{pillar.title}</h3>
                <p style={{ fontSize: '15px', color: '#4b5563', lineHeight: 1.7, margin: 0 }}>{pillar.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The IC Formula */}
      <section style={{ background: GREY_BG, padding: '80px 32px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: NAVY, textAlign: 'center', marginBottom: '16px' }}>The IC Formula — How We Score Every Pick</h2>
          <p style={{ fontSize: '16px', color: '#4b5563', textAlign: 'center', lineHeight: 1.75, maxWidth: '680px', margin: '0 auto 48px' }}>
            Not every AI pick makes the cut. Investment Council uses a proprietary 5-factor scoring system called the IC Formula. Every candidate stock, crypto, or option is scored against all 5 factors before being included. Anything under 70 points is rejected.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '32px' }}>
            {/* Stock Formula */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: NAVY, marginBottom: '16px', paddingBottom: '10px', borderBottom: `2px solid ${GOLD}` }}>IC Stock Formula</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stockFactors.map(f => (
                  <div key={f.name} style={{ background: '#fff', borderRadius: '10px', padding: '16px 18px', borderLeft: `4px solid ${GOLD}` }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: NAVY, marginBottom: '4px' }}>{f.name}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Crypto Formula */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: NAVY, marginBottom: '16px', paddingBottom: '10px', borderBottom: `2px solid ${GOLD}` }}>IC Crypto Formula</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cryptoFactors.map(f => (
                  <div key={f.name} style={{ background: '#fff', borderRadius: '10px', padding: '16px 18px', borderLeft: `4px solid ${GOLD}` }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: NAVY, marginBottom: '4px' }}>{f.name}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '40px', background: NAVY, borderRadius: '12px', padding: '20px 28px', textAlign: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: GOLD }}>Only picks scoring 70+ out of 100 make the final cut.</span>
          </div>
        </div>
      </section>

      {/* Technology */}
      <section style={{ background: '#fff', padding: '80px 32px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: NAVY, marginBottom: '20px' }}>Powered by World-Class AI</h2>
          <p style={{ fontSize: '16px', color: '#4b5563', lineHeight: 1.75, maxWidth: '640px', margin: '0 auto 48px' }}>
            Investment Council is built on Claude by Anthropic — one of the world's most capable and safety-focused AI models. Every analysis uses real-time market data from multiple sources including live price feeds, economic calendars, sector rotation data, and crypto on-chain metrics.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            {[
              { title: 'Claude AI by Anthropic', icon: '🧠', desc: 'State-of-the-art large language model with custom IC Formula prompting for financial analysis.' },
              { title: 'Real-Time Market Data', icon: '📡', desc: 'Live price feeds, economic calendar, sector flows, and crypto on-chain metrics updated continuously.' },
              { title: 'Proprietary IC Formula', icon: '⚙️', desc: 'A 5-factor scoring framework built specifically for equity, crypto, and options analysis.' },
            ].map(card => (
              <div key={card.title} style={{ border: '1px solid #e5e7eb', borderRadius: '14px', padding: '28px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>{card.icon}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: NAVY, marginBottom: '10px' }}>{card.title}</h3>
                <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section style={{ background: GREY_BG, padding: '80px 32px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: NAVY, marginBottom: '20px' }}>Important Disclaimer</h2>
          <div style={{ background: '#fff', borderRadius: '12px', borderLeft: '5px solid #d97706', padding: '28px 28px 28px 24px' }}>
            <p style={{ fontSize: '15px', color: '#374151', lineHeight: 1.8, margin: 0 }}>
              Investment Council is an educational and informational platform. Nothing on this site constitutes financial advice, investment advice, trading advice, or any other sort of advice. The AI-generated picks, signals, and analysis are for educational purposes only. Past performance of any picks or signals does not guarantee future results. Always conduct your own research and consult with a licensed financial advisor before making any investment decisions. Trading stocks, cryptocurrencies, and options involves substantial risk of loss and is not suitable for all investors. You may lose some or all of your invested capital.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#06060a', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
          © 2026 Investment Council · investmentcouncil.io · For educational and informational purposes only. Not financial advice.
        </div>
      </footer>

    </div>
  )
}
