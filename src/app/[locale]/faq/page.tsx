'use client'

import { useState } from 'react'
import { useRouter } from '@/navigation'

const FAQS = [
  {
    category: 'Getting Started',
    items: [
      {
        q: 'What is Investment Council?',
        a: 'Investment Council is an AI-powered investment research platform that gives you daily stock, crypto, and options picks, a personal AI financial advisor (the Council), real-time market alerts, portfolio tracking, and educational training — all in one place.',
      },
      {
        q: 'What plans are available?',
        a: 'We offer three tiers: Free (limited Council queries, basic market data), Trader ($19.99/month — full Council access, AI picks, watchlist, portfolio tracker, pre-market and EOD briefings), and Pro ($49.99/month — everything in Trader plus IC Market Guardian alerts, email delivery, and priority features).',
      },
      {
        q: 'Is there a free trial?',
        a: 'Yes — all new paid subscriptions include a 7-day free trial. You also get a 24-hour grace period after signing up to explore the platform and add your own API keys before the trial begins.',
      },
      {
        q: 'How do I upgrade my plan?',
        a: 'Click the "Upgrade" button in the top navigation bar or visit your Profile page. You can upgrade from Free to Trader or Pro at any time. Upgrades take effect immediately.',
      },
      {
        q: 'How do I cancel my subscription?',
        a: 'Go to Profile → Manage Plan → Customer Portal. From there you can downgrade or cancel at any time. Your access continues until the end of your current billing period.',
      },
    ],
  },
  {
    category: 'Council AI Chat',
    items: [
      {
        q: 'What is the Council?',
        a: 'The Council is your personal AI financial advisor powered by your choice of Claude, ChatGPT, Gemini, or Grok. It can analyze stocks, explain market concepts, build watchlists, run scans, generate Pine Script strategies, and answer any investment question.',
      },
      {
        q: 'Why do I need to add my own API key?',
        a: 'To keep costs fair and give you unlimited queries, Council chat runs on your own AI provider key after the 24-hour grace period. Your key is stored securely in your profile and never shared. You get exactly the same quality — just billed directly to your own account.',
      },
      {
        q: 'Where do I get an API key?',
        a: 'Claude: console.anthropic.com — ChatGPT: platform.openai.com/api-keys — Gemini: aistudio.google.com/apikey — Grok: console.x.ai. Add your key in Profile → Your API Keys.',
      },
      {
        q: 'How many queries do I get per day?',
        a: 'Free tier: 5 queries per day. Trader and Pro tiers: unlimited queries (using your own API key after the grace period).',
      },
      {
        q: 'What AI models does the Council use?',
        a: 'You choose your preferred AI in your Profile: Claude (Anthropic), ChatGPT (OpenAI), Gemini (Google), or Grok (xAI). The Council uses the latest available model for whichever provider you select.',
      },
    ],
  },
  {
    category: 'AI Picks',
    items: [
      {
        q: 'How are the AI picks generated?',
        a: 'AI picks are generated daily using the IC Formula — a proprietary scoring system that evaluates momentum, volume, catalyst, sector strength, and narrative alignment. Every pick is scored 0–100 and must hit 70+ to be included. Picks are generated fresh each morning.',
      },
      {
        q: 'What types of picks are available?',
        a: 'We generate three types daily: Stock picks (top US equities), Crypto picks (top digital assets), and Options picks (0DTE intraday trades + 3-week swing trades). All available on the AI Picks page.',
      },
      {
        q: 'Are the picks financial advice?',
        a: 'No. AI picks are research tools and educational content only — not personalized financial advice. Always do your own research and consult a licensed financial advisor before making investment decisions.',
      },
      {
        q: 'How is pick performance tracked?',
        a: 'Each pick shows its entry price at time of generation. After 24 hours, outcomes are automatically evaluated as win or loss based on price movement in the direction of the pick\'s bias.',
      },
    ],
  },
  {
    category: 'IC Market Guardian',
    items: [
      {
        q: 'What is IC Market Guardian?',
        a: 'IC Market Guardian watches your portfolio holdings for breaking news that could impact your positions. When a high or medium-impact news event affects a stock or crypto you hold, you get an instant alert with an AI summary and estimated price impact.',
      },
      {
        q: 'Which plan includes Market Guardian?',
        a: 'IC Market Guardian is available on the Pro plan ($49.99/month). Pro users also receive Guardian alert emails delivered to their inbox.',
      },
      {
        q: 'How often does Guardian check for news?',
        a: 'Guardian runs three times daily — 9 AM, 12 PM, and 4 PM ET — scanning for news that affects your holdings. Alerts appear in the Guardian panel (the shield icon) in your portfolio.',
      },
      {
        q: 'Can I control which alerts I receive?',
        a: 'Yes. In the Guardian panel, each holding has its own alert mode: Smart (only price-moving, high/medium impact news) or Everything (all mentions). You can customize per ticker.',
      },
    ],
  },
  {
    category: 'Portfolio & Watchlist',
    items: [
      {
        q: 'How do I add holdings to my portfolio?',
        a: 'Go to the Portfolio tab and use the Add Position form at the bottom. Enter the ticker, number of shares, and average cost. Company name, sector, and current price auto-fill when you type the ticker.',
      },
      {
        q: 'Does the portfolio support crypto?',
        a: 'Yes. The portfolio tracker supports stocks, ETFs, and cryptocurrencies. Select the asset type when adding a position. Crypto prices are sourced from CoinGecko.',
      },
      {
        q: 'How do I add stocks to my watchlist?',
        a: 'Go to the Watchlist tab, type a ticker in the search box, and click Add. The system auto-categorizes stocks into sectors. You can also create custom categories.',
      },
    ],
  },
  {
    category: 'Billing & Account',
    items: [
      {
        q: 'What payment methods are accepted?',
        a: 'We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover) through Stripe. All payments are processed securely.',
      },
      {
        q: 'Can I switch between monthly and yearly billing?',
        a: 'Yes. Go to Profile → Manage Plan → Customer Portal to change your billing cycle. Yearly billing saves approximately 20% compared to monthly.',
      },
      {
        q: 'Is my data secure?',
        a: 'Yes. API keys are stored encrypted. We never sell or share your personal data. All connections use HTTPS/TLS. See our Privacy Policy for full details.',
      },
      {
        q: 'How do I contact support?',
        a: 'Use the live chat widget (bottom right of any page), visit our Contact page, or email support@investmentcouncil.io. We typically respond within a few hours during business days.',
      },
    ],
  },
]

export default function FAQPage() {
  const router = useRouter()
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  function toggle(key: string) {
    setOpenItems(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const filtered = search.trim().length > 1
    ? FAQS.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          item.q.toLowerCase().includes(search.toLowerCase()) ||
          item.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : FAQS

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0, letterSpacing: '-0.02em' }}>Frequently Asked Questions</h1>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>Everything you need to know about Investment Council</p>
          </div>
          <button
            onClick={() => router.back()}
            style={{ fontSize: 13, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}
          >
            ← Back
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 32, marginTop: 24 }}>
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 16px', fontSize: 14,
              border: '1px solid #e5e7eb', borderRadius: 10,
              outline: 'none', background: '#fff',
              color: '#111',
            }}
          />
        </div>

        {/* FAQ Categories */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>No results found</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Try a different search term or use the live chat for help</div>
          </div>
        ) : (
          filtered.map(cat => (
            <div key={cat.category} style={{ marginBottom: 36 }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, color: '#7c3aed', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                {cat.category}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {cat.items.map((item, i) => {
                  const key = `${cat.category}-${i}`
                  const open = openItems.has(key)
                  return (
                    <div
                      key={key}
                      style={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 10,
                        overflow: 'hidden',
                        transition: 'box-shadow 0.15s',
                      }}
                    >
                      <button
                        onClick={() => toggle(key)}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '16px 20px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#111', lineHeight: 1.4 }}>{item.q}</span>
                        <span style={{ fontSize: 18, color: '#9ca3af', flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
                      </button>
                      {open && (
                        <div style={{ padding: '0 20px 16px', fontSize: 14, color: '#4b5563', lineHeight: 1.7 }}>
                          {item.a}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {/* Still need help */}
        <div style={{
          marginTop: 48, background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 14, padding: '28px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>💬</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 6 }}>Still have questions?</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>
            Our support team is here to help. Use the live chat below or send us an email.
          </div>
          <a
            href="mailto:support@investmentcouncil.io"
            style={{
              display: 'inline-block', background: '#7c3aed', color: '#fff',
              padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Email Support
          </a>
        </div>

      </div>
    </div>
  )
}
