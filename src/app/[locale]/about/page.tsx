'use client'

import { useRouter } from 'next/navigation'

const NAVY = '#0F2A44'
const GOLD = '#C9A34E'
const GREY_BG = '#f8f9fa'

export default function AboutPage() {
  const router = useRouter()

  const pillars = [
    {
      icon: '📖',
      title: 'Full Scope, Not Hints',
      text: 'Most platforms give you a summary and send you on your way. We give you the complete framework — the why, the how, and the what-to-look-for — so you understand every layer of every analysis.',
    },
    {
      icon: '🧠',
      title: 'Teach the Thinking, Not Just the Signal',
      text: 'A signal without understanding is just noise. Every AI pick, every council analysis, every market briefing is designed to show you the reasoning so you can apply it yourself — not just follow it blindly.',
    },
    {
      icon: '🎓',
      title: 'Education First, Always',
      text: 'Everything on this platform is built as an educational tool. The Training library, the AI Council frameworks, the daily picks — all of it is designed to make you a more capable, more independent trader.',
    },
  ]

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

  const whatWeTeach = [
    { label: 'Council Chat', desc: 'Ask anything — every response explains the concept behind the answer, not just the answer itself.' },
    { label: 'AI Picks', desc: 'Every pick shows the scoring rationale and factors, so you learn what makes a quality setup.' },
    { label: 'Training Library', desc: 'Structured modules covering technical analysis, options, macro, crypto, and trading psychology.' },
    { label: 'The Investment Council', desc: '18 legendary investor frameworks — Buffett, Dalio, Livermore and more — applied to live markets.' },
    { label: 'Pre-Market Briefings', desc: 'Daily context on why markets are moving, not just that they moved.' },
    { label: 'Options Education', desc: 'All 14 major strategies explained from mechanics to execution — Greeks, IV, rolling, and more.' },
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
      <section style={{ background: NAVY, padding: '88px 32px 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(201,163,78,0.15)', border: `1px solid ${GOLD}`, borderRadius: '100px', padding: '6px 18px', fontSize: '12px', fontWeight: 700, color: GOLD, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '24px' }}>
            Our Mission
          </div>
          <h1 style={{ fontSize: '52px', fontWeight: 900, color: '#fff', marginBottom: '24px', lineHeight: 1.1 }}>
            Most platforms show you<br />
            <span style={{ color: GOLD }}>the signal.</span><br />
            We show you the science.
          </h1>
          <p style={{ fontSize: '19px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, maxWidth: '680px', margin: '0 auto 32px' }}>
            Investment Council was built on one belief: retail traders deserve the same depth of knowledge as Wall Street professionals — not watered-down summaries, not black-box signals, but the complete framework behind every decision.
          </p>
          <div style={{ width: '60px', height: '3px', background: GOLD, margin: '0 auto' }} />
        </div>
      </section>

      {/* Core Statement */}
      <section style={{ background: '#fff', padding: '80px 32px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '22px', color: '#374151', lineHeight: 1.9, fontStyle: 'italic', borderLeft: `4px solid ${GOLD}`, paddingLeft: '28px', textAlign: 'left', marginBottom: '40px' }}>
            "We don't just tell you what to watch. We teach you why it matters, how the pros think about it, and what to look for yourself. Every analysis, every AI pick, every council framework is designed to make you a better, more independent trader — not a dependent one."
          </p>
          <p style={{ fontSize: '20px', fontWeight: 800, color: NAVY }}>
            Because the goal was never to give you fish.<br />
            <span style={{ color: GOLD }}>It was to teach you how the whole ocean works.</span>
          </p>
        </div>
      </section>

      {/* Three Pillars */}
      <section style={{ background: GREY_BG, padding: '80px 32px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: NAVY, textAlign: 'center', marginBottom: '12px' }}>What We Stand For</h2>
          <p style={{ fontSize: '16px', color: '#6b7280', textAlign: 'center', marginBottom: '48px', maxWidth: '600px', margin: '0 auto 48px' }}>
            These are the core values behind every feature we build.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
            {pillars.map(p => (
              <div key={p.title} style={{ background: '#fff', borderRadius: '16px', padding: '36px 28px', borderTop: `4px solid ${GOLD}` }}>
                <div style={{ fontSize: '42px', marginBottom: '16px' }}>{p.icon}</div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: NAVY, marginBottom: '12px' }}>{p.title}</h3>
                <p style={{ fontSize: '15px', color: '#4b5563', lineHeight: 1.75, margin: 0 }}>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Teach */}
      <section style={{ background: '#fff', padding: '80px 32px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: NAVY, textAlign: 'center', marginBottom: '12px' }}>Education Built Into Everything</h2>
          <p style={{ fontSize: '16px', color: '#6b7280', textAlign: 'center', maxWidth: '600px', margin: '0 auto 48px', lineHeight: 1.7 }}>
            Every feature on this platform was designed with education at its core. Here is where the learning happens.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {whatWeTeach.map((item, i) => (
              <div key={item.label} style={{ display: 'flex', gap: '16px', padding: '20px', background: GREY_BG, borderRadius: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: GOLD, flexShrink: 0 }}>
                  {(i + 1).toString().padStart(2, '0')}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: NAVY, marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The IC Formula */}
      <section style={{ background: GREY_BG, padding: '80px 32px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: NAVY, textAlign: 'center', marginBottom: '16px' }}>The IC Formula — Transparent by Design</h2>
          <p style={{ fontSize: '16px', color: '#4b5563', textAlign: 'center', lineHeight: 1.75, maxWidth: '700px', margin: '0 auto 48px' }}>
            We don't hide how picks are selected. Every candidate stock, crypto, or option is scored against 5 factors before making the cut. We publish the criteria so you can learn to spot the same setups yourself.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '32px' }}>
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
            <span style={{ fontSize: '16px', fontWeight: 700, color: GOLD }}>Only picks scoring 70+ out of 100 make the final cut — and we show you exactly why.</span>
          </div>
        </div>
      </section>

      {/* Technology */}
      <section style={{ background: '#fff', padding: '80px 32px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: NAVY, marginBottom: '20px' }}>Powered by World-Class AI</h2>
          <p style={{ fontSize: '16px', color: '#4b5563', lineHeight: 1.75, maxWidth: '660px', margin: '0 auto 48px' }}>
            Investment Council runs on Claude by Anthropic — one of the world's most capable AI models — combined with a 91-domain knowledge base built specifically for trading and investing education.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            {[
              { title: 'Claude AI by Anthropic', icon: '🧠', desc: 'State-of-the-art AI with custom IC Formula prompting for institutional-grade financial analysis.' },
              { title: '91 Knowledge Domains', icon: '📚', desc: 'Custom-built knowledge base covering every major area of trading, investing, and crypto — loaded dynamically per query.' },
              { title: 'Real-Time Market Data', icon: '📡', desc: 'Live price feeds, economic calendar, sector flows, and crypto on-chain metrics updated continuously.' },
              { title: 'Your Choice of AI', icon: '⚡', desc: 'Use Claude, ChatGPT, Gemini, or Grok — bring your own API key and choose the AI that fits your workflow.' },
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
      <section style={{ background: GREY_BG, padding: '64px 32px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: NAVY, marginBottom: '16px' }}>Educational Purpose — Important Disclaimer</h2>
          <div style={{ background: '#fff', borderRadius: '12px', borderLeft: '5px solid #d97706', padding: '28px 28px 28px 24px' }}>
            <p style={{ fontSize: '15px', color: '#374151', lineHeight: 1.8, margin: 0 }}>
              Investment Council is an educational and informational platform. Nothing on this site constitutes financial advice, investment advice, trading advice, or any other sort of advice. All AI-generated picks, signals, and analyses are for educational purposes only. Past performance does not guarantee future results. Always conduct your own research and consult with a licensed financial advisor before making any investment decisions. Trading stocks, cryptocurrencies, and options involves substantial risk of loss and is not suitable for all investors.
            </p>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section style={{ background: '#fff', padding: '80px 32px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{ width: '4px', height: '28px', background: GOLD, borderRadius: '2px' }} />
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: NAVY, margin: 0 }}>Built by a Trader, Not a Tech Company</h2>
          </div>
          <div style={{ background: GREY_BG, borderRadius: '16px', padding: '40px 40px 36px', borderLeft: `5px solid ${GOLD}` }}>
            <p style={{ fontSize: '16px', color: '#374151', lineHeight: 1.85, marginBottom: '20px' }}>
              I'm Dagoberto Mendez — entrepreneur, auctioneer, real estate investor, and trader. I've been building businesses for over 30 years and trading the markets for 15.
            </p>
            <p style={{ fontSize: '16px', color: '#374151', lineHeight: 1.85, marginBottom: '20px' }}>
              I didn't build Investment Council to get rich off a SaaS product. I built it because I needed it.
            </p>
            <p style={{ fontSize: '16px', color: '#374151', lineHeight: 1.85, marginBottom: '20px' }}>
              After a decade and a half of trading with average results, I got tired of platforms that gave me signals without explanations, picks without reasoning, and tools built for Wall Street professionals that left retail traders guessing. I wanted something that treated me like an intelligent adult — something that showed me the <em>why</em> behind every analysis, not just the what.
            </p>
            <p style={{ fontSize: '16px', color: '#374151', lineHeight: 1.85, marginBottom: '20px' }}>
              When I discovered what AI could actually do, something clicked. For the first time, I could take everything I'd learned across 30 years of business — reading people, reading markets, understanding risk, surviving setbacks — and put it into a product that could help other traders the way I wished something had helped me.
            </p>
            <p style={{ fontSize: '16px', color: '#374151', lineHeight: 1.85, marginBottom: '20px' }}>
              I'm 62 years old. I've been in the paging industry, the auction business, real estate, and a dozen things in between. I'm not a Silicon Valley founder. I'm not backed by venture capital. I still work for a living — just on my own terms now, which is the only kind of success that ever mattered to me.
            </p>
            <p style={{ fontSize: '17px', fontWeight: 700, color: NAVY, lineHeight: 1.75, marginBottom: '28px', borderTop: `1px solid #e5e7eb`, paddingTop: '24px' }}>
              The lesson that took me 30 years to learn is simple: the only way the world doesn't control you is if you learn to fend for yourself. That means building real skills — not just following someone else's signals.
            </p>
            <p style={{ fontSize: '16px', color: '#374151', lineHeight: 1.85, marginBottom: '28px' }}>
              That's what Investment Council is built to do — help you build the knowledge to move forward on your own terms.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px', color: GOLD, flexShrink: 0 }}>DM</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: NAVY }}>Dagoberto Mendez</div>
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>Founder, Investment Council</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: NAVY, padding: '72px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>Ready to learn how the market really works?</h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.65)', marginBottom: '32px', lineHeight: 1.7 }}>
            Join a growing community of traders building real knowledge — not just chasing signals.
          </p>
          <button
            onClick={() => router.push('/login')}
            style={{ background: GOLD, color: '#fff', border: 'none', borderRadius: '10px', padding: '16px 40px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            Get Started Free
          </button>
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
