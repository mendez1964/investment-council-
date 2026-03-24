import type { Metadata } from 'next'
import LandingPage from '@/components/LandingPage'

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Investment Council',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    description: 'AI stock analysis tool and crypto market analysis platform. Daily AI stock picks, AI trading signals, options picks with entry/stop/target, and pre-market briefings for retail traders.',
    url: 'https://investmentcouncil.io',
    offers: [
      { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free — 5 queries/day' },
      { '@type': 'Offer', price: '29.99', priceCurrency: 'USD', name: 'Trader — Full stock & crypto access' },
      { '@type': 'Offer', price: '49.99', priceCurrency: 'USD', name: 'Pro — Options picks + alerts' },
    ],
    featureList: [
      'AI stock analysis tool',
      'AI crypto analysis',
      'Best AI stock picks daily',
      'AI trading signals',
      'Options picks with entry stop and target',
      'Pre-market briefing',
      'Crypto market analysis tool',
      'On-chain crypto metrics',
      'Investment analysis platform',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Investment Council?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Investment Council is an AI stock analysis tool and investment analysis platform that provides daily AI stock picks, AI trading signals, crypto market analysis, and options picks with entry, stop, and target levels for retail traders.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does the AI stock analysis work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Investment Council uses the IC Formula — a 5-factor scoring system — to evaluate stocks using trend alignment, momentum quality, sector flow, catalyst clarity, and market regime fit. Only picks scoring 70+ are included.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a free AI stock analysis tool?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Investment Council offers a free tier with 5 queries per day including pre-market briefings, stock analysis, and crypto analysis. No credit card required.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I get AI crypto analysis on Investment Council?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Investment Council provides daily AI crypto analysis covering Bitcoin dominance, altcoin season indicators, funding rates, on-chain metrics, and AI-generated crypto picks using the IC Crypto Formula.',
        },
      },
    ],
  },
]

export const metadata: Metadata = {
  title: 'Investment Council — AI Stock Analysis Tool & Crypto Market Analysis Platform',
  description: 'The AI stock analysis tool built for retail traders. Get daily AI stock picks, AI trading signals, crypto market analysis, options picks with entry/stop/target, and pre-market briefings. Free tier available — no credit card required.',
  keywords: [
    'AI stock analysis tool',
    'AI crypto analysis',
    'best AI stock picks',
    'crypto market analysis tool',
    'AI investment analysis',
    'stock analysis using AI',
    'how to analyze crypto with AI',
    'AI trading signals',
    'investment analysis platform',
    'free stock analysis AI',
    'AI options picks',
    'pre-market briefing AI',
    'daily stock picks AI',
    'crypto trading signals AI',
    'AI trading platform retail traders',
  ],
  openGraph: {
    title: 'Investment Council — AI Stock Analysis Tool & Crypto Market Analysis',
    description: 'Daily AI stock picks, AI trading signals, crypto market analysis, and options picks. The investment analysis platform built for serious retail traders. Free to start.',
    type: 'website',
    url: 'https://investmentcouncil.io',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Investment Council — AI Stock Analysis & Crypto Market Tool',
    description: 'Daily AI stock picks, trading signals, crypto analysis, and options picks. Free tier available.',
  },
  alternates: {
    canonical: 'https://investmentcouncil.io',
  },
}

export default function Page() {
  return (
    <>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      <LandingPage />
    </>
  )
}
