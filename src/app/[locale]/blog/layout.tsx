import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog — AI Stock Analysis, Crypto Market Analysis & Trading Insights | Investment Council',
  description: 'Investment Council blog: guides on AI stock analysis, crypto market analysis tools, AI trading signals, and investment analysis. Learn how to use AI for stock and crypto trading.',
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
