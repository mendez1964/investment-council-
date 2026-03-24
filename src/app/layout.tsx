import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Investment Council — AI Stock Analysis Tool & Crypto Market Analysis',
    template: '%s | Investment Council',
  },
  description: 'Investment Council is an AI stock analysis tool and crypto market analysis platform. Get daily AI stock picks, AI trading signals, pre-market briefings, and options picks with entry, stop, and target levels. Free tier available.',
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
    'daily stock picks',
    'crypto trading signals',
  ],
  authors: [{ name: 'Investment Council' }],
  creator: 'Investment Council',
  publisher: 'Investment Council',
  metadataBase: new URL('https://www.investmentcouncil.io'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.investmentcouncil.io',
    siteName: 'Investment Council',
    title: 'Investment Council — AI Stock Analysis Tool & Crypto Market Analysis',
    description: 'Daily AI stock picks, crypto analysis, options trades with entry/stop/target, and pre-market briefings. The AI investment analysis platform built for serious retail traders.',
    images: [
      {
        url: '/logo-preview.svg',
        width: 1200,
        height: 630,
        alt: 'Investment Council — AI Stock & Crypto Analysis Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Investment Council — AI Stock Analysis Tool & Crypto Market Analysis',
    description: 'Daily AI stock picks, crypto analysis, options trades, and pre-market briefings. Built for serious retail traders.',
    images: ['/logo-preview.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a', color: '#e5e5e5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace' }}>
        {children}
      </body>
    </html>
  )
}
