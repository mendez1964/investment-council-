import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Investment Council — AI Stock Analysis Tool & Investment Research Platform',
  description: 'Investment Council is an AI-powered investment analysis platform using the IC Formula — a 5-factor scoring system — to generate daily AI stock picks, crypto analysis, and options trades for retail traders.',
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
