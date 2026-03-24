import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'War of the AIs — Claude vs ChatGPT vs Gemini Daily Stock Picks',
  description: 'Watch Claude, ChatGPT, and Gemini compete head-to-head with daily AI stock picks, crypto analysis, and options trades. Live leaderboard, win rates, and daily winner declared. Powered by Investment Council.',
  openGraph: {
    title: 'War of the AIs — Claude vs ChatGPT vs Gemini | Investment Council',
    description: 'Daily AI stock picks competition. Claude vs ChatGPT vs Gemini — same market, same rules, one winner. Live leaderboard and track record.',
    type: 'website',
    url: 'https://investmentcouncil.io/war',
  },
}

export default function WarLayout({ children }: { children: React.ReactNode }) {
  return children
}
