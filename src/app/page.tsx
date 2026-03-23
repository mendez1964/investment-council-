import type { Metadata } from 'next'
import LandingPage from '@/components/LandingPage'

export const metadata: Metadata = {
  title: 'Investment Council — Free AI Stock & Crypto Research Dashboard | No Hype, No Agenda',
  description: 'Your personal AI analyst. 18 investment frameworks. Stocks, crypto & options analysis on demand. Pre-market briefings, AI daily picks, sector rotation, fear & greed — free to start.',
  keywords: 'free AI stock and crypto research dashboard, personal AI analyst for retail traders, no hype investment research tool, TradingView alternative AI, Seeking Alpha alternative free, ChatGPT for stock market, unbiased AI trading frameworks, on demand AI investment council chat, stocks and crypto in one dashboard free, retail trader daily briefing AI, AI options trading ideas, pre market briefing AI tool, altcoin season indicator free, on-chain crypto analysis free, sector rotation dashboard free, fear and greed index tool AI, bitcoin cycle analysis tool, market health breadth dashboard AI',
  openGraph: {
    title: 'Investment Council — Your Personal AI Analyst',
    description: '18 investment frameworks. No hype. No agenda. Stocks, crypto & options analysis on demand.',
    type: 'website',
    url: 'https://www.investmentcouncil.io',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Investment Council — Free AI Stock & Crypto Research',
    description: 'Your personal AI analyst. 18 frameworks. No hype. No agenda.',
  },
  alternates: {
    canonical: 'https://www.investmentcouncil.io',
  },
}

export default function Page() {
  return <LandingPage />
}
