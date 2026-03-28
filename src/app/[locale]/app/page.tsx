'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import { PRICES } from '@/lib/stripe-prices'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import PineScriptTab from '@/components/PineScriptTab'
import WatchlistTab from '@/components/WatchlistTab'
import EarningsCalendar from '@/components/EarningsCalendar'
import MarketMovers from '@/components/MarketMovers'
import FearGreedGauge from '@/components/FearGreedGauge'
import AIPicks from '@/components/AIPicks'
import IPOCalendar from '@/components/IPOCalendar'
import NewsFeed from '@/components/NewsFeed'
import ChartModal from '@/components/ChartModal'
import EconomicCalendar from '@/components/EconomicCalendar'
import PortfolioTab from '@/components/PortfolioTab'
import Sidebar, { type SidebarItem as SidebarItemType } from '@/components/Sidebar'
import UpgradeModal from '@/components/UpgradeModal'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import GuardianPanel from '@/components/GuardianPanel'
import TradingPlanTab from '@/components/TradingPlanTab'
import { Menu } from 'lucide-react'
import ReviewPrompt from '@/components/ReviewPrompt'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// ── Training link detection ────────────────────────────────────────────────────
const FRAMEWORK_CHIPS: { pattern: RegExp; topic: string; label: string }[] = [
  { pattern: /\b(dalio|economic machine|all.?weather|bridgewater|debt cycle|beautiful deleveraging)\b/i, topic: 'Ray Dalio Economic Machine', label: 'Ray Dalio Economic Machine' },
  { pattern: /\b(livermore|jesse livermore|pivotal point)\b/i, topic: 'Jesse Livermore Trading Method', label: 'Jesse Livermore Trading Method' },
  { pattern: /\b(warren buffett|buffett|moat|circle of competence|berkshire)\b/i, topic: 'Warren Buffett Value Investing', label: 'Warren Buffett Value Investing' },
  { pattern: /\b(peter lynch|lynch|tenbagger|ten.?bagger|invest in what you know)\b/i, topic: 'Peter Lynch Investment Strategy', label: 'Peter Lynch Investment Strategy' },
  { pattern: /\b(benjamin graham|graham|net.?net|margin of safety|intelligent investor)\b/i, topic: 'Benjamin Graham Value Investing', label: 'Benjamin Graham Value Investing' },
  { pattern: /\b(grantham|gmo|mean reversion.*bubble|asset bubble)\b/i, topic: 'Jeremy Grantham Market Cycles', label: 'Jeremy Grantham Market Cycles' },
  { pattern: /\b(michael burry|burry|deep value|big short)\b/i, topic: 'Michael Burry Deep Value Investing', label: 'Michael Burry Deep Value Investing' },
  { pattern: /\b(tudor jones|paul tudor|macro trading)\b/i, topic: 'Paul Tudor Jones Macro Trading', label: 'Paul Tudor Jones Macro Trading' },
  { pattern: /\b(options trading|call option|put option|0dte|implied volatility|iv crush|iron condor|covered call|credit spread|debit spread)\b/i, topic: 'Options Trading Fundamentals', label: 'Options Trading' },
  { pattern: /\b(technical analysis|candlestick pattern|support.?resistance|moving average|rsi|macd|bollinger band|fibonacci retracement)\b/i, topic: 'Technical Analysis Fundamentals', label: 'Technical Analysis' },
  { pattern: /\b(sector rotation|business cycle|early.?cycle|mid.?cycle|late.?cycle)\b/i, topic: 'Sector Rotation Strategy', label: 'Sector Rotation' },
  { pattern: /\b(pine script|pinescript|tradingview indicator)\b/i, topic: 'Pine Script Trading Indicators', label: 'Pine Script' },
  { pattern: /\b(on.?chain analysis|bitcoin halving|crypto market cycle|defi protocol)\b/i, topic: 'Cryptocurrency Investing', label: 'Crypto Market Cycles' },
]

function detectFrameworks(content: string): { topic: string; label: string }[] {
  const seen = new Set<string>()
  const results: { topic: string; label: string }[] = []
  for (const chip of FRAMEWORK_CHIPS) {
    if (chip.pattern.test(content) && !seen.has(chip.topic)) {
      seen.add(chip.topic)
      results.push({ topic: chip.topic, label: chip.label })
    }
  }
  return results.slice(0, 3) // cap at 3 chips per message
}

// ── Sidebar data ──────────────────────────────────────────────────────────────

type SidebarItem = { label: string; itemId?: string; prompt: string; icon?: string; needsTicker?: boolean; isAnalysis?: 'stock' | 'crypto'; isCalendar?: boolean; isMovers?: boolean; isFearGreed?: boolean; isAIPicks?: boolean; isBattle?: boolean; isWar?: boolean; isIPO?: boolean; isNews?: boolean; isChart?: boolean; isEconCalendar?: boolean; isCalculators?: boolean; isPatterns?: boolean; isCryptoDashboard?: boolean; isAlerts?: boolean; tier?: 'trader' | 'pro' }
type SidebarSection = { id: string; title: string; items: SidebarItem[] }

// Sidebar sections are defined inside the Home component (uses useTranslations hook)
export default function Home() {
  const router = useRouter()
  const pathname = usePathname()
  const currentLocale = useLocale()
  const t = useTranslations('sidebar')
  const ta = useTranslations('app')

  // ── Sidebar data (translated labels, English itemId for icon lookup) ─────

  const STOCKS_SECTIONS: SidebarSection[] = [
    {
      id: 'ai-picks',
      title: t('sections.aiPicks'),
      items: [
        { itemId: 'AI Daily Picks', label: t('items.aiDailyPicks'), prompt: '', isAIPicks: true, tier: 'trader' as const },
        { label: t('items.challengeCouncil'), prompt: '', isBattle: true, tier: 'trader' as const },
        { label: t('items.warOfAIs'), prompt: '', isWar: true, tier: 'trader' as const },
      ],
    },
    {
      id: 'analyze',
      title: t('sections.analyze'),
      items: [
        { itemId: 'Analyze a Stock / ETF', label: t('items.analyzeStock'), prompt: '', isAnalysis: 'stock' },
      ],
    },
    {
      id: 'market',
      title: t('sections.market'),
      items: [
        { itemId: 'Pre-Market Briefing', label: t('items.preMarket'), tier: 'trader' as const, prompt: `Give me today's pre-market briefing.

IMPORTANT — DATA GATE: First check the live data provided. If SPY, QQQ, DIA, and IWM prices are ALL missing from the feed, do not generate the full briefing. Instead output only: "LIVE FEED UNAVAILABLE — Equity prices did not load. Available: [list what we do have]. Try asking for a specific ticker like SPY or ask again in a few minutes." Then stop.

If we have at least 2 of SPY/QQQ/DIA/IWM prices, proceed with this structure:

## PRE-MARKET BRIEFING — [Today's Date]

**1. MARKET SNAPSHOT**
One table using the live data provided. Columns: Instrument | Price | Change | Status. Include: SPY, QQQ, DIA, IWM, Bitcoin, 2-Year Yield, 10-Year Yield, Fed Funds Rate. For any missing: write "—" and move on. Note at the bottom how many equity prices loaded.

**2. SECTOR SCORECARD**
Use the LIVE SECTOR SCORECARD data provided. One table: Sector | ETF | Price | Change %. Sort best to worst. If sector data is missing, skip this section.

**3. MOVERS & WHAT THEY SIGNAL**
Top gainers, losers, most active — 3-5 bullets maximum. Strip warrants and micro-caps. One sentence per bullet: what does this name signal about market conditions today? If movers data is missing, skip this section entirely.

**4. BREAKING NEWS & CATALYSTS**
Use the BREAKING MARKET NEWS data provided. List the top 3-5 high/medium impact stories. Format each as: [TICKER] — [one sentence: what happened and what it means for price]. If no news data is provided, skip this section entirely — do not invent news.

**5. KEY LEVELS & GAME PLAN**
- 4-5 key price levels to watch today, one line each
- Bias: Bullish / Neutral / Cautious / Bearish + one sentence of factual reasoning (data-based, not opinion)
- First 30 minutes: one thing to confirm before committing capital` },
        { itemId: 'End of Day Summary', label: t('items.eodSummary'), tier: 'trader' as const, prompt: `Give me today's end-of-day market summary.

IMPORTANT — DATA GATE: First check the live data provided. If SPY, QQQ, DIA, and IWM prices are ALL missing from the feed, do not generate the full summary. Instead output only: "LIVE FEED UNAVAILABLE — Equity prices did not load. Available: [list what we do have — yields, Bitcoin, movers, etc.]. Try asking for a specific ticker like SPY or ask again in a few minutes." Then stop.

If we have at least 2 of SPY/QQQ/DIA/IWM prices, proceed with this structure:

## END-OF-DAY SUMMARY — [Today's Date]

**1. MARKET CLOSE SNAPSHOT**
One table. Columns: Instrument | Price | Day Change % | Signal. Include: SPY, QQQ, DIA, IWM, Bitcoin, 10-Year Yield, 2-Year Yield, Fed Funds Rate. Write "—" for anything missing.

**2. SECTOR SCORECARD**
Use the LIVE SECTOR SCORECARD data provided. One table: Sector | ETF | Change % | Direction. Sort by performance — best to worst. Note top 2 leading and bottom 2 lagging sectors. If sector data is missing from the feed, skip this section.

**3. WHAT TODAY'S MOVERS TELL US**
Top gainers, losers, most active — 3-5 bullets maximum. Strip warrants and micro-caps. One sentence per bullet: what does each name signal about what the market was focused on today? If movers data is missing, skip entirely.

**4. KEY NEWS & CATALYSTS TODAY**
Use the BREAKING MARKET NEWS data provided. List the top 3-5 stories that moved the market today. Format each as: [TICKER] — [what happened and what it meant for price]. If no news data is provided, skip this section entirely.

**5. WHAT CHANGED & SETUP FOR TOMORROW**
- 3-5 things that actually shifted today — levels broken, narratives confirmed, risks rising/falling
- Market posture going into tomorrow: Bullish / Neutral / Cautious / Bearish + one factual sentence (data-based)
- One specific thing that could turn it bullish tomorrow, one that could turn it bearish` },
        { itemId: 'Market Health', label: t('items.marketHealth'), prompt: 'Give me a professional market health assessment using the live data available. Cover: trend (SPY/QQQ above or below key MAs?), breadth signals, VIX level, and any notable divergences. Data and facts only — no opinions or advisor frameworks unless I ask.' },
        { itemId: 'Sector Rotation', label: t('items.sectorRotation'), prompt: 'Using the live sector data available, show me which sectors are leading and lagging right now. One table: Sector | ETF | Change % | Direction. Then 3-4 factual bullets on what the rotation pattern suggests about current risk appetite. Data only.' },
        { itemId: 'Macro Environment', label: t('items.macroEnvironment'), prompt: 'Give me a current macro environment snapshot using the live data available. Cover: Fed Funds Rate, CPI trend, 2Y and 10Y yields, yield curve shape, GDP trend, unemployment. Format as a table, then 2-3 factual bullets on what the numbers indicate. No advisor frameworks unless I ask.' },
        { itemId: 'Fear & Greed', label: t('items.fearGreed'), prompt: '', isFearGreed: true },
        { itemId: 'Yield Curve', label: t('items.yieldCurve'), prompt: 'Give me the current yield curve snapshot using live data. Show key rates in a table, note whether the curve is normal, flat, or inverted, and what the current shape has historically preceded. Facts only.' },
        { itemId: 'Volatility Check', label: t('items.volatilityCheck'), prompt: 'Give me a current volatility assessment using live data. Cover: VIX level and context (where is it vs 12-month range?), any notable options flow signals, and what the current vol regime means for position sizing. Data first.' },
        { itemId: 'Economic Calendar', label: t('items.econCalendar'), prompt: '', isEconCalendar: true },
        { itemId: 'News Feed', label: t('items.newsFeed'), prompt: '', isNews: true },
      ],
    },
    {
      id: 'scans',
      title: t('sections.scans'),
      items: [
        { itemId: 'Full Council Scan', label: t('items.fullCouncilScan'), prompt: 'Run the full council scan' },
        { label: 'Tudor Jones', prompt: 'Run the Tudor Jones scan' },
        { label: 'Livermore', prompt: 'Run the Livermore scan' },
        { label: 'Buffett', prompt: 'Run the Buffett scan' },
        { label: 'Lynch', prompt: 'Run the Lynch scan' },
        { label: 'Graham', prompt: 'Run the Graham scan' },
        { label: 'Grantham', prompt: 'Run the Grantham scan' },
        { label: 'Dalio', prompt: 'Run the Dalio scan' },
        { label: 'Burry', prompt: 'Run the Burry scan' },
        { label: 'Roubini', prompt: 'Run the Roubini scan' },
      ],
    },
    {
      id: 'council',
      title: t('sections.council'),
      items: [
        { itemId: 'Full Council View', label: t('items.fullCouncilView'), prompt: 'Give me the full council view on the current market.' },
        { label: 'Buffett', prompt: 'What would Buffett say about the market right now?' },
        { label: 'Dalio', prompt: 'What would Dalio say about the market right now?' },
        { label: 'Soros', prompt: 'What would Soros say about the market right now?' },
        { label: 'Tudor Jones', prompt: 'What would Tudor Jones say about the market right now?' },
        { label: 'Lynch', prompt: 'What would Lynch say about the market right now?' },
        { label: 'Livermore', prompt: 'What would Livermore say about the market right now?' },
        { label: 'Graham', prompt: 'What would Graham say about the market right now?' },
        { label: 'Damodaran', prompt: 'What would Damodaran say about the market right now?' },
        { label: 'Burry', prompt: 'What would Burry say about the market right now?' },
        { label: 'Roubini', prompt: 'What would Roubini say about the market right now?' },
        { label: 'Grantham', prompt: 'What would Grantham say about the market right now?' },
      ],
    },
    {
      id: 'tools',
      title: t('sections.tools'),
      items: [
        { itemId: 'Analyze a Setup', label: t('items.analyzeSetup'), prompt: 'Analyze this trade setup for ', needsTicker: true },
        { itemId: 'Position Sizing', label: t('items.positionSizing'), prompt: 'Help me calculate position size. Walk me through the math — account size, risk per trade %, entry and stop levels. My account is $', needsTicker: true },
        { itemId: 'Risk Assessment', label: t('items.riskAssessment'), prompt: 'Give me a professional risk assessment for ', needsTicker: true },
        { itemId: 'Entry / Stop / Target', label: t('items.entryStopTarget'), prompt: 'Help me define entry, stop, and target levels for ', needsTicker: true },
        { itemId: 'Hold or Cut', label: t('items.holdOrCut'), prompt: 'Help me think through whether to hold or cut my position in ', needsTicker: true },
      ],
    },
    {
      id: 'data',
      title: t('sections.data'),
      items: [
        { itemId: 'Stock Quote', label: t('items.stockQuote'), prompt: 'Get me the current stock quote and fundamentals for ', needsTicker: true },
        { itemId: 'Insider Transactions', label: t('items.insiderTransactions'), prompt: 'Show me recent insider transactions for ', needsTicker: true },
        { itemId: '13F Holdings', label: t('items.holdingsF13'), prompt: 'Show me recent 13F hedge fund holdings for ', needsTicker: true },
        { itemId: 'SEC Filings', label: t('items.secFilings'), prompt: 'Show me the latest SEC filings for ', needsTicker: true },
        { itemId: 'Economic Data', label: t('items.economicData'), prompt: 'Give me the latest economic data — fed rate, CPI, yield curve, unemployment, and GDP.' },
        { itemId: 'Earnings Calendar', label: t('items.earningsCalendar'), prompt: '', isCalendar: true },
        { itemId: 'IPO Calendar', label: t('items.ipoCalendar'), prompt: '', isIPO: true },
        { itemId: 'Market Movers', label: t('items.marketMovers'), prompt: '', isMovers: true },
        { itemId: 'Chart a Ticker', label: t('items.chartATicker'), prompt: '', isChart: true },
      ],
    },
    {
      id: 'calculators',
      title: t('sections.calculators'),
      items: [
        { itemId: 'Financial Calculators', label: t('items.financialCalcs'), prompt: '', isCalculators: true },
      ],
    },
    {
      id: 'technical',
      title: t('sections.technical'),
      items: [
        { itemId: 'Candlestick Patterns', label: t('items.candlestickPatterns'), prompt: '', isPatterns: true },
      ],
    },
  ]

  const CRYPTO_SECTIONS: SidebarSection[] = [
    {
      id: 'ai-picks',
      title: t('sections.aiPicks'),
      items: [
        { itemId: 'AI Daily Picks', label: t('items.aiDailyPicks'), prompt: '', isAIPicks: true, tier: 'trader' as const },
        { label: t('items.challengeCouncil'), prompt: '', isBattle: true, tier: 'trader' as const },
        { label: t('items.warOfAIs'), prompt: '', isWar: true, tier: 'trader' as const },
      ],
    },
    {
      id: 'analyzecrypto',
      title: t('sections.analyzecrypto'),
      items: [
        { itemId: 'Analyze a Crypto', label: t('items.analyzeCrypto'), prompt: '', isAnalysis: 'crypto' },
      ],
    },
    {
      id: 'analysis',
      title: t('sections.analysis'),
      items: [
        { itemId: 'Morning Crypto Briefing', label: t('items.morningCryptoBriefing'), tier: 'trader' as const, prompt: `Give me this morning's crypto briefing. Cover: overnight BTC and ETH price action and key levels tested, Asian session performance, current funding rates and whether markets are overleveraged, Bitcoin dominance trend, any major news or catalysts overnight, and the top 3 things to watch today. Format as a structured briefing.` },
        { itemId: 'End of Day Crypto Recap', label: t('items.eodCryptoRecap'), tier: 'trader' as const, prompt: `Give me today's end-of-day crypto recap. Cover: how BTC and ETH performed today vs the stock market, which sectors of crypto outperformed (DeFi, L2s, meme coins, etc.), funding rate changes during the session, any significant whale activity or exchange flows, key support and resistance levels for overnight trading, and what to watch tomorrow. Format as a structured recap.` },
        { itemId: 'Full Crypto Council', label: t('items.fullCryptoCouncil'), prompt: 'Give me the full crypto council view right now. What do Saylor, PlanB, Raoul Pal, Hayes, Vitalik, Cathie Wood, Andreas, and Hoskinson all say about the current crypto market?' },
        { itemId: 'Bitcoin Deep Dive', label: t('items.bitcoinDeepDive'), prompt: 'Give me a full Bitcoin analysis right now using all relevant frameworks — Saylor, PlanB, Andreas, Raoul Pal, and Hayes.' },
        { itemId: 'Ethereum & DeFi', label: t('items.ethereumDefi'), prompt: 'Give me a full Ethereum and DeFi analysis from Vitalik, Raoul Pal, and Cathie Wood perspectives. Include Layer 2 ecosystem health and DeFi TVL context.' },
        { itemId: 'Cycle Position', label: t('items.cyclePosition'), prompt: 'Where are we in the Bitcoin halving cycle right now? Use PlanB Stock-to-Flow, MVRV context, halving timing, and Raoul Pal macro framework to assess current cycle position.' },
        { itemId: 'On-Chain Health', label: t('items.onChainHealth'), prompt: 'Give me a full on-chain health check for Bitcoin right now using the PlanB and Andreas frameworks. Cover MVRV, realized price, exchange reserves, long-term holders, hash rate, and what it all means.' },
        { itemId: 'Derivatives Positioning', label: t('items.derivativesPositioning'), prompt: 'What does current Bitcoin derivatives positioning look like? Apply Arthur Hayes framework — check funding rates, open interest, leverage risk, and liquidation level analysis.' },
        { itemId: 'Macro Crypto View', label: t('items.macroCryptoView'), prompt: 'What is the current macro environment saying about crypto? Apply Raoul Pal everything code — check global M2, DXY, ISM PMI, yen carry trade. Is macro favorable or unfavorable for crypto right now?' },
        { itemId: 'Altcoin Season', label: t('items.altcoinSeason'), prompt: 'Is altcoin season here, ending, or not started? Check BTC dominance, ETH/BTC ratio, funding rates, and apply Arthur Hayes altcoin season mechanics framework.' },
        { itemId: 'Institutional Flow', label: t('items.institutionalFlow'), prompt: 'What does institutional Bitcoin adoption look like right now? Apply Saylor framework — check ETF flow trends, exchange outflows, corporate treasury activity, and what it signals.' },
      ],
    },
    {
      id: 'cryptoscans',
      title: t('sections.cryptoscans'),
      items: [
        { itemId: 'Bitcoin Cycle Scan', label: t('items.bitcoinCycleScan'), prompt: 'Run a Bitcoin cycle scan. Apply PlanB framework — assess MVRV ratio position, distance from Stock-to-Flow model, days since last halving, realized price distance, and what phase of the cycle we are in.' },
        { itemId: 'Macro Crypto Scan', label: t('items.macroCryptoScan'), prompt: 'Run a macro crypto scan using Raoul Pal framework. Assess global M2 trend, DXY direction, ISM PMI cycle position, Fed liquidity conditions, and yen carry trade status. Is the macro environment favorable or unfavorable for crypto?' },
        { itemId: 'Derivatives Scan', label: t('items.derivativesScan'), prompt: 'Run a derivatives positioning scan using Arthur Hayes framework. Check Bitcoin and Ethereum funding rates, open interest trend, leverage risk, basis in futures markets. Are markets overleveraged long, overleveraged short, or neutral?' },
        { itemId: 'On-Chain Scan', label: t('items.onChainScan'), prompt: 'Run an on-chain health scan for Bitcoin. Check active address growth, new address growth, long-term holder accumulation vs distribution, miner selling pressure, exchange reserve trend. Is the network growing, stable, or contracting?' },
        { itemId: 'Altcoin Season Scan', label: t('items.altcoinSeasonScan'), prompt: 'Run an altcoin season scan. Check BTC dominance trend, ETH/BTC ratio, altcoin season index, funding rates across altcoins, and apply Hayes altcoin season mechanics. Where are we in the rotation?' },
        { itemId: 'DeFi Ecosystem Scan', label: t('items.defiEcosystemScan'), prompt: 'Run a DeFi ecosystem scan using Vitalik framework. Check total DeFi TVL trend, Layer 2 transaction volume, Ethereum gas fees as demand indicator, top protocol revenue and sustainability. What is the DeFi ecosystem health?' },
      ],
    },
    {
      id: 'specialists',
      title: t('sections.specialists'),
      items: [
        { label: 'Michael Saylor', prompt: 'Apply the Michael Saylor Bitcoin framework to current market conditions. What is Saylor saying about institutional adoption, ETF flows, and Bitcoin as a treasury asset right now?' },
        { label: 'PlanB', prompt: 'Apply PlanB Stock-to-Flow framework to Bitcoin right now. Where are we relative to the S2F model, halving cycle, and MVRV ratio?' },
        { label: 'Raoul Pal', prompt: 'Apply Raoul Pal macro crypto framework right now. What is global M2 saying, where is DXY, and what does the everything code suggest for crypto?' },
        { label: 'Arthur Hayes', prompt: 'Apply Arthur Hayes derivatives and macro framework to Bitcoin right now. What do funding rates, open interest, yen carry trade, and dollar liquidity suggest?' },
        { label: 'Vitalik Buterin', prompt: 'Apply Vitalik Buterin Ethereum framework right now. What is Ethereum roadmap progress, Layer 2 adoption, DeFi TVL, and ETH staking ratio saying?' },
        { label: 'Cathie Wood', prompt: 'Apply Cathie Wood ARK Invest framework to crypto right now. Where are we on the S-curve, what is developer adoption showing, and what is the total addressable market analysis?' },
        { label: 'Andreas Antonopoulos', prompt: 'Apply Andreas Antonopoulos Bitcoin fundamentals framework right now. What is hash rate saying, what is the self-custody situation, and what are the key regulatory risks?' },
        { label: 'Charles Hoskinson', prompt: 'Apply Charles Hoskinson Cardano framework. What is the current state of the Cardano ecosystem, ADA development progress, and how does it compare to competing platforms?' },
      ],
    },
    {
      id: 'cryptodata',
      title: t('sections.cryptodata'),
      items: [
        { itemId: 'Crypto Dashboard', label: t('items.cryptoDashboard'), prompt: '', isCryptoDashboard: true },
        { itemId: 'Crypto Prices', label: t('items.cryptoPrices'), prompt: 'Give me current crypto prices, fear and greed index, and BTC dominance.' },
        { itemId: 'Fear & Greed', label: t('items.fearGreed'), prompt: '', isFearGreed: true },
        { itemId: 'Crypto News', label: t('items.cryptoNews'), prompt: '', isNews: true },
      ],
    },
  ]

  // ── Component state ───────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'pine' | 'watchlist' | 'portfolio' | 'training' | 'trading-plan'>('chat')
  const [unreadAlerts, setUnreadAlerts] = useState(0)
  const [activePineScript, setActivePineScript] = useState<{ name: string; code: string } | null>(null)
  const pineCodeInjected = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [tickerPopup, setTickerPopup] = useState<{ promptPrefix: string; placeholder: string } | null>(null)
  const [tickerInput, setTickerInput] = useState('')
  const tickerInputRef = useRef<HTMLInputElement>(null)
  const [showEarningsCalendar, setShowEarningsCalendar] = useState(false)
  const [showMovers, setShowMovers] = useState(false)
  const [showFearGreed, setShowFearGreed] = useState(false)
  const [showAIPicks, setShowAIPicks] = useState(false)
  const [showIPO, setShowIPO] = useState(false)
  const [showNews, setShowNews] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [chartTicker, setChartTicker] = useState('')
  const [showEconCalendar, setShowEconCalendar] = useState(false)
  const [analysisPopup, setAnalysisPopup] = useState<'stock' | 'crypto' | null>(null)
  const [analysisSymbol, setAnalysisSymbol] = useState('')
  const [councilChimeIn, setCouncilChimeIn] = useState(false)
  const analysisInputRef = useRef<HTMLInputElement>(null)

  // Sidebar state
  const [sidebarMode, setSidebarMode] = useState<'stocks' | 'crypto'>('stocks')
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['ai-picks', 'analyze', 'market']))

  // Pine Script code coming back from chat → editor
  const [pendingPineCode, setPendingPineCode] = useState<string | null>(null)

  // Auth
  const [user, setUser] = useState<any>(null)
  const [userTier, setUserTier] = useState<'free' | 'trader' | 'pro' | null>(null)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user ?? null
      setUser(u)
      if (u) {
        const res = await fetch('/api/user/profile')
        if (res.ok) {
          const profile = await res.json()
          setUserTier(profile.tier ?? 'free')
          setTrialEndsAt(profile.trial_ends_at ?? null)
          // Restore saved language preference
          const savedLocale = profile.locale
          if (savedLocale && savedLocale !== currentLocale) {
            document.cookie = `NEXT_LOCALE=${savedLocale}; path=/; max-age=31536000; SameSite=Lax`
            router.replace(pathname, { locale: savedLocale })
          }
        }
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleUpgrade(priceId: string) {
    const skipTrial = userTier === 'trader' || userTier === 'pro'
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, skipTrial }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  async function handleManageBilling() {
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  // Cost tracking
  const [sessionCost, setSessionCost] = useState(0)
  const [sessionTokens, setSessionTokens] = useState({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })
  const [totalCost, setTotalCost] = useState(0)

  // Load cumulative cost from localStorage — keyed by user ID so each user has their own counter
  useEffect(() => {
    if (!user?.id) return
    const key = `ic_total_cost_${user.id}`
    const stored = localStorage.getItem(key)
    if (stored) setTotalCost(parseFloat(stored) || 0)
  }, [user?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll unread alert count every 60 seconds
  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch('/api/alerts?unread=true&limit=100')
        if (res.ok) {
          const data = await res.json()
          setUnreadAlerts(Array.isArray(data) ? data.length : 0)
        }
      } catch {}
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 60000)
    return () => clearInterval(interval)
  }, [])

  function switchSidebarMode(mode: 'stocks' | 'crypto') {
    setSidebarMode(mode)
    const sections = mode === 'stocks' ? STOCKS_SECTIONS : CRYPTO_SECTIONS
    setExpandedSections(new Set([sections[0].id, sections[1]?.id].filter(Boolean) as string[]))
  }

  function toggleSection(id: string) {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function newChat() {
    setMessages([])
    setInput('')
    setActivePineScript(null)
    setAnalysisPopup(null)
    setTickerPopup(null)
    pineCodeInjected.current = false
  }

  function buildAnalysisPrompt(symbol: string, type: 'stock' | 'crypto', withCouncil: boolean): string {
    const s = symbol.toUpperCase()
    if (type === 'stock') {
      const base = `Give me a professional analysis of ${s}. No investment council frameworks — just what a professional trader or analyst needs to know.

1. PRICE & MARKET DATA
Current price, day change %, volume vs average, market cap, 52-week high/low. Use the live data provided.

2. FUNDAMENTALS
P/E ratio, EPS, revenue growth (YoY), gross margin, profit margin, debt/equity ratio, free cash flow. Flag anything that stands out — good or bad.

3. VALUATION
Is ${s} cheap, fair, or expensive vs its sector and its own historical average? Give a direct answer.

4. TECHNICAL PICTURE
Trend direction (above or below 200-day MA?), key support and resistance levels, momentum reading (RSI direction, MACD). Where is price in relation to its range?

5. RECENT CATALYSTS
Latest earnings result, any major news, insider buying or selling activity, analyst rating changes.

6. KEY RISKS
Top 3 risks that could hurt this stock in the next 3-6 months. Be specific.

7. BOTTOM LINE
One direct paragraph: what is the state of this stock right now? Is it worth attention or not?

Be direct and factual. Use numbers. No fluff.`
      if (!withCouncil) return base
      return base + `\n\n---\n\n## COUNCIL VIEW\nNow have the Investment Council weigh in on ${s} — one synthesized paragraph applying the most relevant frameworks. Which council members have the strongest opinion here and why?`
    } else {
      const base = `Give me a professional crypto analysis of ${s}. No council frameworks — just what a pro crypto trader needs to know.

1. PRICE & MARKET DATA
Current price, 24h change %, volume, market cap, BTC dominance context. Use the live data provided.

2. ON-CHAIN METRICS
MVRV ratio, exchange net flows (accumulation or distribution?), active addresses, hash rate (if BTC). Use any on-chain data available.

3. TECHNICAL PICTURE
Trend direction, key support and resistance, momentum. Where is price relative to its recent range?

4. RECENT CATALYSTS
Key news, protocol updates, regulatory developments, whale activity.

5. KEY RISKS
Top 3 risks that could hurt ${s} in the near term. Be specific.

6. BOTTOM LINE
One direct paragraph: what is the state of ${s} right now?

Be direct and factual. Use numbers.`
      if (!withCouncil) return base
      return base + `\n\n---\n\n## COUNCIL VIEW\nNow have the Crypto Council weigh in on ${s} — one synthesized paragraph from the most relevant specialists (Saylor, PlanB, Hayes, Raoul Pal, Vitalik as applicable).`
    }
  }

  function submitAnalysisPopup() {
    if (!analysisPopup || !analysisSymbol.trim()) return
    const prompt = buildAnalysisPrompt(analysisSymbol.trim(), analysisPopup, councilChimeIn)
    setAnalysisPopup(null)
    setAnalysisSymbol('')
    setActiveTab('chat')
    setTimeout(() => sendMessageWithText(prompt), 50)
  }

  async function sendMessage() {
    await sendMessageWithText(input)
  }

  async function savePDF(content: string) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'letter' })

    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 56
    const usableW = pageW - margin * 2
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    // Header
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text('INVESTMENT COUNCIL — RESEARCH OUTPUT', margin, 40)
    doc.setFontSize(8)
    doc.text(dateStr.toUpperCase(), pageW - margin, 40, { align: 'right' })
    doc.setDrawColor(220)
    doc.line(margin, 48, pageW - margin, 48)

    // Body
    doc.setFontSize(11)
    doc.setTextColor(30)
    const lines = doc.splitTextToSize(content, usableW)
    let y = 68
    for (const line of lines) {
      if (y > pageH - 60) {
        doc.addPage()
        y = 48
      }
      doc.text(line, margin, y)
      y += 16
    }

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(170)
    doc.line(margin, pageH - 40, pageW - margin, pageH - 40)
    doc.text('For educational purposes only. Not financial advice. Past performance is not indicative of future results.', margin, pageH - 28)

    const filename = `investment-council-${new Date().toISOString().slice(0, 10)}.pdf`
    doc.save(filename)
  }

  function printMessage(content: string) {
    const win = window.open('', '_blank', 'width=800,height=600')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Investment Council — Research Output</title>
          <style>
            body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.8; }
            h1 { font-size: 13px; font-weight: normal; color: #888; border-bottom: 1px solid #ddd; padding-bottom: 12px; margin-bottom: 24px; letter-spacing: 0.05em; text-transform: uppercase; }
            pre { white-space: pre-wrap; word-break: break-word; font-family: Georgia, serif; font-size: 15px; margin: 0; }
            footer { margin-top: 40px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <h1>Investment Council &mdash; ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h1>
          <pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          <footer>For educational purposes only. Not financial advice.</footer>
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    win.print()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  function handleToolbarSelect(prompt: string, needsTicker?: boolean, placeholder?: string, isAnalysis?: 'stock' | 'crypto', isCalendar?: boolean, isMovers?: boolean, isFearGreed?: boolean, isAIPicks?: boolean, isIPO?: boolean, isNews?: boolean, isChart?: boolean, isEconCalendar?: boolean, isCalculators?: boolean, isPatterns?: boolean, isCryptoDashboard?: boolean, isAlerts?: boolean) {
    if (isCalendar) {
      setShowEarningsCalendar(true)
      return
    }
    if (isMovers) {
      router.push('/movers')
      return
    }
    if (isFearGreed) {
      router.push('/fear-greed')
      return
    }
    if (isAIPicks) {
      router.push('/ai-picks')
      return
    }
    if (isIPO) {
      router.push('/ipo')
      return
    }
    if (isNews) {
      router.push('/news')
      return
    }
    if (isEconCalendar) {
      router.push('/economic-calendar')
      return
    }
    if (isCalculators) {
      router.push('/calculators')
      return
    }
    if (isPatterns) {
      router.push('/patterns')
      return
    }
    if (isCryptoDashboard) {
      router.push('/crypto-dashboard')
      return
    }
    if (isAlerts) {
      router.push('/alerts')
      return
    }
    if (isChart) {
      setChartTicker('')
      setShowChart(true)
      return
    }
    if (isAnalysis) {
      setAnalysisPopup(isAnalysis)
      setAnalysisSymbol('')
      setCouncilChimeIn(false)
      setTimeout(() => analysisInputRef.current?.focus(), 50)
    } else if (needsTicker) {
      setTickerPopup({ promptPrefix: prompt, placeholder: placeholder || 'Enter ticker or description...' })
      setTickerInput('')
      setTimeout(() => tickerInputRef.current?.focus(), 50)
    } else {
      setInput(prompt)
      setTimeout(() => sendMessageWithText(prompt), 50)
    }
  }

  function submitTickerPopup() {
    if (!tickerPopup || !tickerInput.trim()) return
    const fullPrompt = tickerPopup.promptPrefix + tickerInput.trim()
    setTickerPopup(null)
    setTickerInput('')
    setInput(fullPrompt)
    setTimeout(() => sendMessageWithText(fullPrompt), 50)
  }

  async function sendMessageWithText(text: string, onComplete?: (response: string) => void) {
    let userMessage = text.trim()
    if (!userMessage || isLoading) return

    if (activePineScript && !pineCodeInjected.current) {
      userMessage = `[Pine Script Editor — Current Script: "${activePineScript.name}"]\n\`\`\`pinescript\n${activePineScript.code}\n\`\`\`\n\nIMPORTANT: If you provide an improved or modified version of this script, you MUST return the COMPLETE script in a single \`\`\`pinescript code block — every line, no truncation, no ellipsis, no "rest of code unchanged" shortcuts. The editor will auto-load whatever is inside that code block.\n\n${userMessage}`
      pineCodeInjected.current = true
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    let assistantMessage = ''
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, locale: currentLocale }),
      })
      if (!response.ok) throw new Error('API error')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })

          // Check for hidden usage marker (may arrive split across chunks)
          assistantMessage += chunk
          const usageIdx = assistantMessage.indexOf('\x00[USAGE:')
          if (usageIdx !== -1) {
            const endIdx = assistantMessage.indexOf(']', usageIdx)
            if (endIdx !== -1) {
              const markerJson = assistantMessage.slice(usageIdx + 8, endIdx)
              assistantMessage = assistantMessage.slice(0, usageIdx)
              try {
                const { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, cost } = JSON.parse(markerJson)
                setSessionCost(prev => prev + cost)
                setSessionTokens(prev => ({
                  input: prev.input + inputTokens,
                  output: prev.output + outputTokens,
                  cacheRead: prev.cacheRead + (cacheReadTokens ?? 0),
                  cacheWrite: prev.cacheWrite + (cacheWriteTokens ?? 0),
                }))
                if (cacheReadTokens > 0) {
                  console.log(`[cache] HIT — ${cacheReadTokens.toLocaleString()} tokens read from cache`)
                } else if (cacheWriteTokens > 0) {
                  console.log(`[cache] WRITE — ${cacheWriteTokens.toLocaleString()} tokens stored`)
                }
                setTotalCost(prev => {
                  const next = prev + cost
                  if (user?.id) localStorage.setItem(`ic_total_cost_${user.id}`, next.toFixed(6))
                  return next
                })
              } catch {}
            }
          }

          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: assistantMessage }
            return updated
          })
        }
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Error connecting to the Investment Council. Please try again.' },
      ])
    } finally {
      setIsLoading(false)
      if (onComplete && assistantMessage) onComplete(assistantMessage)

      // If response contains a Pine Script code block, push it to the editor automatically
      if (assistantMessage) {
        const match = assistantMessage.match(/```(?:pinescript|pine)\n([\s\S]*?)```/)
        if (match) {
          setPendingPineCode(match[1].trim())
        }
      }
    }
  }

  const currentSections = sidebarMode === 'stocks' ? STOCKS_SECTIONS : CRYPTO_SECTIONS

  async function showBriefingTeaser(itemId: string) {
    setActiveTab('chat')
    setSidebarMobileOpen(false)
    setIsLoading(true)

    const isCrypto = itemId === 'Morning Crypto Briefing' || itemId === 'End of Day Crypto Recap'
    const isEOD = itemId === 'End of Day Summary' || itemId === 'End of Day Crypto Recap'

    let fgValue: number | null = null
    let fgLabel = ''
    let guardianCount = 0

    try {
      const [fgRes, guardianRes] = await Promise.allSettled([
        fetch('/api/fear-greed'),
        fetch('/api/guardian'),
      ])
      if (fgRes.status === 'fulfilled') {
        const d = await fgRes.value.json()
        const fg = Array.isArray(d) ? d[0] : d
        fgValue = fg?.value != null ? parseInt(fg.value) : null
        fgLabel = fgValue == null ? '' : fgValue <= 20 ? 'Extreme Fear' : fgValue <= 45 ? 'Fear' : fgValue <= 55 ? 'Neutral' : fgValue <= 75 ? 'Greed' : 'Extreme Greed'
      }
      if (guardianRes.status === 'fulfilled') {
        const d = await guardianRes.value.json()
        guardianCount = d.unread ?? 0
      }
    } catch {}

    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    const label = isEOD ? (isCrypto ? '📊 End of Day Crypto Recap' : '🌆 End of Day Summary') : (isCrypto ? '🌅 Morning Crypto Briefing' : '🌅 Pre-Market Briefing')

    const teaser = [
      `## ${label} — ${dateStr}`,
      '',
      '**Market Snapshot**',
      fgValue != null ? `Fear & Greed Index: **${fgValue} — ${fgLabel}**` : 'Fear & Greed: loading...',
      guardianCount > 0 ? `🛡️ IC Market Guardian: **${guardianCount} alert${guardianCount > 1 ? 's' : ''} on your holdings** today` : '🛡️ IC Market Guardian: No alerts on your holdings today',
      '',
      '---',
      '',
      '🔒 **Full briefing is a Trader feature**',
      '',
      `The complete ${isEOD ? 'recap' : 'briefing'} includes:`,
      isEOD
        ? '- Full market close snapshot with performance breakdown\n- Sector scorecard — best and worst performers\n- What today\'s action means for tomorrow\n- Key levels overnight traders are watching'
        : '- Full market snapshot — futures, yields, Bitcoin, VIX\n- Sector scorecard with live prices\n- Top movers and what they signal\n- Key levels and game plan for the session',
      '',
      'Upgrade to Trader ($29.99/mo) to unlock the full briefing every morning and evening — plus AI daily picks, all 18 investment frameworks, and more.',
    ].join('\n')

    setMessages(prev => [
      ...prev,
      { role: 'user', content: label },
      { role: 'assistant', content: teaser },
    ])
    setIsLoading(false)
    setShowUpgradeModal(true)
  }

  function handleSidebarItemClick(item: SidebarItemType) {
    if ((item as any).isWar) {
      router.push('/war')
      setSidebarMobileOpen(false)
      return
    }
    if ((item as any).isBattle) {
      router.push('/battle')
      setSidebarMobileOpen(false)
      return
    }
    // Free tier sees a teaser for briefing/recap items
    const briefingItems = ['Pre-Market Briefing', 'End of Day Summary', 'Morning Crypto Briefing', 'End of Day Crypto Recap']
    if (userTier === 'free' && item.itemId && briefingItems.includes(item.itemId)) {
      showBriefingTeaser(item.itemId)
      return
    }
    handleToolbarSelect(item.prompt, item.needsTicker, item.label, item.isAnalysis, item.isCalendar, item.isMovers, item.isFearGreed, item.isAIPicks, item.isIPO, item.isNews, item.isChart, item.isEconCalendar, item.isCalculators, item.isPatterns, item.isCryptoDashboard, item.isAlerts)
    if (activeTab !== 'chat') setActiveTab('chat')
    setSidebarMobileOpen(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {showEarningsCalendar && <EarningsCalendar onClose={() => setShowEarningsCalendar(false)} />}
      {showMovers && <MarketMovers onClose={() => setShowMovers(false)} />}
      {showFearGreed && <FearGreedGauge onClose={() => setShowFearGreed(false)} />}
      {showAIPicks && <AIPicks onClose={() => setShowAIPicks(false)} />}
      {showIPO && <IPOCalendar onClose={() => setShowIPO(false)} />}
      {showNews && <NewsFeed onClose={() => setShowNews(false)} />}
      {showEconCalendar && <EconomicCalendar onClose={() => setShowEconCalendar(false)} />}
      {showChart && (
        <ChartModal
          ticker={chartTicker || 'SPY'}
          isCrypto={sidebarMode === 'crypto'}
          onClose={() => setShowChart(false)}
        />
      )}
      {showUpgradeModal && (
        <UpgradeModal
          currentTier={userTier}
          onClose={() => setShowUpgradeModal(false)}
          onSelectPlan={(priceId) => { setShowUpgradeModal(false); handleUpgrade(priceId) }}
          onManageBilling={() => { setShowUpgradeModal(false); handleManageBilling() }}
        />
      )}

      <ReviewPrompt trialEndsAt={trialEndsAt} tier={userTier ?? 'free'} />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #1f1f1f',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
      }}>
        {/* Mobile hamburger */}
        <button
          id="mobile-hamburger"
          onClick={() => setSidebarMobileOpen(true)}
          title="Open menu"
          style={{
            display: 'none',
            background: 'transparent',
            border: '1px solid #1f1f1f',
            borderRadius: '6px',
            padding: '5px 7px',
            color: '#555',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Menu size={16} />
        </button>
        <style>{`
          @media (max-width: 767px) {
            #mobile-hamburger { display: flex !important; }
          }
        `}</style>

        <img
          src="/investmentcouncillogo.svg"
          alt="Investment Council"
          style={{ height: '52px', width: 'auto', flexShrink: 0 }}
        />

        {/* New Chat button */}
        {messages.length > 0 && (
          <button
            onClick={newChat}
            title="Start a new chat"
            style={{
              marginLeft: '12px',
              background: 'transparent',
              border: '1px solid #1f1f1f',
              borderRadius: '6px',
              padding: '4px 10px',
              color: '#444',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.04em',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#333' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#444'; e.currentTarget.style.borderColor = '#1f1f1f' }}
          >
            {ta('newChat')}
          </button>
        )}

        {/* Cost counters */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div
            title={`This session · Input: ${sessionTokens.input.toLocaleString()} · Output: ${sessionTokens.output.toLocaleString()} · Cache read: ${sessionTokens.cacheRead.toLocaleString()} · Cache write: ${sessionTokens.cacheWrite.toLocaleString()}`}
            style={{
              fontSize: '11px',
              color: '#444',
              background: '#0d0d0d',
              border: '1px solid #1a1a1a',
              borderRadius: '6px',
              padding: '4px 10px',
              fontVariantNumeric: 'tabular-nums',
              cursor: 'default',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {ta('session')}:{' '}
            <span style={{ color: sessionCost > 0.50 ? '#f87171' : sessionCost > 0.10 ? '#fbbf24' : '#7ec8a0', fontWeight: 600 }}>
              ${sessionCost.toFixed(4)}
            </span>
          </div>

          <div
            title="All-time cumulative cost stored on this device. Click to reset."
            onClick={() => {
              if (confirm('Reset the all-time cost counter to $0.00?')) {
                if (user?.id) localStorage.setItem(`ic_total_cost_${user.id}`, '0')
                setTotalCost(0)
              }
            }}
            style={{
              fontSize: '11px',
              color: '#444',
              background: '#0d0d0d',
              border: `1px solid ${totalCost > 20 ? '#7f1d1d' : totalCost > 5 ? '#451a03' : '#1a1a1a'}`,
              borderRadius: '6px',
              padding: '4px 10px',
              fontVariantNumeric: 'tabular-nums',
              cursor: 'pointer',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {ta('allTime')}:{' '}
            <span style={{ color: totalCost > 20 ? '#f87171' : totalCost > 5 ? '#fbbf24' : '#6b7280', fontWeight: 600 }}>
              ${totalCost.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Upgrade button — free tier only */}
        {userTier === 'free' && (
          <button
            onClick={() => setShowUpgradeModal(true)}
            style={{
              marginLeft: '8px',
              background: '#16a34a',
              border: '1px solid #22c55e',
              borderRadius: '6px',
              padding: '5px 14px',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#15803d'}
            onMouseLeave={e => e.currentTarget.style.background = '#16a34a'}
          >
            ⬆ Upgrade
          </button>
        )}
        {/* Manage Plan button — paid users */}
        {(userTier === 'trader' || userTier === 'pro') && (
          <button
            onClick={() => userTier === 'trader' ? setShowUpgradeModal(true) : handleManageBilling()}
            style={{
              marginLeft: '8px',
              background: 'transparent',
              border: '1px solid #2d6a4f',
              borderRadius: '6px',
              padding: '5px 14px',
              color: '#7ec8a0',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#22c55e'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#2d6a4f'}
          >
            {userTier === 'pro' ? '★ Pro — Manage Plan' : '★ Trader — Upgrade to Pro'}
          </button>
        )}

        {/* IC Market Guardian bell */}
        <div style={{ marginLeft: '4px' }}>
          <GuardianPanel />
        </div>

        {/* Language switcher */}
        <div style={{ marginLeft: '4px' }}>
          <LanguageSwitcher />
        </div>

        {/* Support */}
        <button
          onClick={() => router.push('/contact')}
          title="Contact Support"
          style={{
            marginLeft: '8px',
            background: 'transparent',
            border: '1px solid #1f1f1f',
            borderRadius: '6px',
            padding: '4px 10px',
            color: '#444',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.borderColor = '#1e3a5f' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#444'; e.currentTarget.style.borderColor = '#1f1f1f' }}
        >
          Support
        </button>

        {/* Review */}
        <button
          onClick={() => router.push('/review')}
          title="Leave a review"
          style={{
            marginLeft: '8px', background: 'transparent', border: '1px solid #1f1f1f',
            borderRadius: '6px', padding: '4px 10px', color: '#f59e0b',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            letterSpacing: '0.04em', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fbbf24'; e.currentTarget.style.borderColor = '#4a3010' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#f59e0b'; e.currentTarget.style.borderColor = '#1f1f1f' }}
        >
          ⭐ Review
        </button>

        {/* Profile */}
        <button
          onClick={() => router.push('/profile')}
          title="My Profile"
          style={{
            marginLeft: '8px',
            background: 'transparent',
            border: '1px solid #1f1f1f',
            borderRadius: '6px',
            padding: '4px 10px',
            color: '#444',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.borderColor = '#2e1f4f' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#444'; e.currentTarget.style.borderColor = '#1f1f1f' }}
        >
          Profile
        </button>

        {/* Owner dashboard — admin only */}
        {user?.email === 'mendezdag@gmail.com' && (
          <>
            <div style={{
              marginLeft: '8px',
              background: '#1a0f00',
              border: '1px solid #3d2200',
              borderRadius: '6px',
              padding: '4px 10px',
              color: '#f59e0b',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.1em',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}>
              OWNER
            </div>
            <button
              onClick={() => router.push('/owner')}
              style={{
                marginLeft: '6px',
                background: 'transparent',
                border: '1px solid #1f1f1f',
                borderRadius: '6px',
                padding: '4px 10px',
                color: '#f59e0b',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fbbf24'; e.currentTarget.style.borderColor = '#4a3010' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#f59e0b'; e.currentTarget.style.borderColor = '#1f1f1f' }}
            >
              ⚙ Admin
            </button>
          </>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={user ? `Logged in as ${user.email}` : 'Log out'}
          style={{
            marginLeft: '8px',
            background: 'transparent',
            border: '1px solid #1f1f1f',
            borderRadius: '6px',
            padding: '4px 10px',
            color: '#444',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = '#3a1010' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#444'; e.currentTarget.style.borderColor = '#1f1f1f' }}
        >
          {ta('logOut')}
        </button>

        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
          {([
            { id: 'chat', label: `💬 ${ta('tabs.chat')}` },
            { id: 'pine', label: `📈 ${ta('tabs.pine')}` },
            { id: 'watchlist', label: `👁 ${ta('tabs.watchlist')}` },
            { id: 'portfolio', label: `💼 ${ta('tabs.portfolio')}` },
            { id: 'trading-plan', label: '📋 Trading Plan' },
            { id: 'training', label: `📚 ${ta('tabs.training')}` },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'training') { router.push('/training'); return }
                setActiveTab(tab.id)
                if (tab.id === 'watchlist') setUnreadAlerts(0)
              }}
              style={{
                position: 'relative',
                background: activeTab === tab.id ? '#1a472a' : 'transparent',
                border: `1px solid ${activeTab === tab.id ? '#2d6a4f' : '#262626'}`,
                borderRadius: '6px',
                padding: '4px 12px',
                color: activeTab === tab.id ? '#7ec8a0' : '#555',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.02em',
                fontFamily: 'inherit',
              }}
            >
              {tab.label}
              {tab.id === 'watchlist' && unreadAlerts > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: '#e53e3e', color: '#fff', fontSize: '10px',
                  fontWeight: 700, borderRadius: '10px', padding: '1px 5px',
                  lineHeight: '1.4', minWidth: '16px', textAlign: 'center',
                }}>
                  {unreadAlerts > 99 ? '99+' : unreadAlerts}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body: sidebar + main ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Left Sidebar ────────────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <Sidebar
            mode={sidebarMode}
            onModeChange={switchSidebarMode}
            sections={currentSections}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onItemClick={handleSidebarItemClick}
            isLoading={isLoading}
            mobileOpen={sidebarMobileOpen}
            onMobileClose={() => setSidebarMobileOpen(false)}
            userTier={userTier}
            onUpgradeClick={() => setShowUpgradeModal(true)}
          />
        )}

        {/* ── Main Content ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Pine Script Tab — always mounted so editor state survives tab switches */}
          <div style={{ flex: 1, overflow: 'hidden', display: activeTab === 'pine' ? 'flex' : 'none', flexDirection: 'column' }}>
              <PineScriptTab
                onSendMessage={sendMessageWithText}
                onSwitchToChat={() => setActiveTab('chat')}
                onScriptChange={(name, code) => {
                  setActivePineScript({ name, code })
                  pineCodeInjected.current = false
                }}
                isLoading={isLoading}
                pendingImprovedCode={pendingPineCode}
                onPendingCodeConsumed={() => setPendingPineCode(null)}
              />
            </div>

          {/* Watchlist Tab — always mounted so watchlist state survives tab switches */}
          <div style={{ flex: 1, overflow: 'hidden', display: activeTab === 'watchlist' ? 'flex' : 'none', flexDirection: 'column' }}>
              <WatchlistTab
                onSendMessage={sendMessageWithText}
                onSwitchToChat={() => setActiveTab('chat')}
              />
            </div>

          {/* Portfolio Tab */}
          <div style={{ flex: 1, overflow: 'hidden', display: activeTab === 'portfolio' ? 'flex' : 'none', flexDirection: 'column' }}>
            <PortfolioTab onSendMessage={sendMessageWithText} onSwitchToChat={() => setActiveTab('chat')} />
          </div>

          {/* Trading Plan Tab */}
          <div style={{ flex: 1, overflow: 'hidden', display: activeTab === 'trading-plan' ? 'flex' : 'none', flexDirection: 'column' }}>
            <TradingPlanTab onSendMessage={sendMessageWithText} />
          </div>

          {/* ── Chat Messages ──────────────────────────────────────────── */}
          <div style={{
            display: activeTab === 'chat' ? 'flex' : 'none',
            flex: 1,
            overflowY: 'auto',
            padding: messages.length === 0 ? '0' : '24px',
            flexDirection: 'column',
            gap: '24px',
          }}>
            {messages.length === 0 ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '48px 24px', gap: '32px',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#e5e5e5', letterSpacing: '-0.02em', marginBottom: '8px' }}>
                    {(() => {
                      const h = new Date().getHours()
                      const greeting = h < 12 ? ta('greeting.morning') : h < 17 ? ta('greeting.afternoon') : ta('greeting.evening')
                      const name = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'there'
                      return `${greeting}, ${name}.`
                    })()}
                  </div>
                  <div style={{ fontSize: '14px', color: '#555', lineHeight: 1.6 }}>
                    {ta('welcome')}
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '-16px' }}>
                  <div style={{ fontSize: '11px', color: '#333', marginBottom: '12px', letterSpacing: '0.04em' }}>
                    {ta('tryOne')}
                  </div>
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '8px',
                    justifyContent: 'center', maxWidth: '600px',
                  }}>
                    {(sidebarMode === 'stocks' ? [
                      { label: ta('chips.preMarket'), prompt: `Give me today's pre-market briefing. Include market snapshot, overnight futures, key levels to watch, and top risks for the session.` },
                      { label: ta('chips.fullCouncilScan'), prompt: 'Run a full investment council scan of the current market. I want every advisor framework applied — macro, technical, sentiment, risk, and opportunity.' },
                      { label: ta('chips.marketHealthCheck'), prompt: 'Give me a full market health check right now. Cover breadth, momentum, credit spreads, volatility, and whether this is a healthy or deteriorating market.' },
                      { label: ta('chips.sectorRotation'), prompt: 'Where is money rotating right now? Which sectors are leading, which are lagging, and where should I be positioned?' },
                      { label: ta('chips.fearGreedVolatility'), prompt: 'What is the current fear and greed reading and what does volatility tell us? Is this a buy-the-dip moment or time to reduce risk?' },
                      { label: ta('chips.bestSetup'), prompt: 'What is the single best trade setup in the market right now? Give me ticker, direction, entry, stop, and target with full reasoning.' },
                    ] : [
                      { label: ta('chips.morningCrypto'), prompt: 'Give me a full morning crypto briefing. Cover BTC price and dominance, ETH, altcoin season status, fear and greed, key levels, and what to watch today.' },
                      { label: ta('chips.isAltSeason'), prompt: 'Is it alt season right now? Give me BTC dominance trend, ETH/BTC ratio, altcoin season index, and which sectors of crypto are leading.' },
                      { label: ta('chips.btcDominance'), prompt: 'Give me a deep dive on Bitcoin dominance right now. Where are we in the cycle, what does dominance tell us about capital rotation, and what should I do with my portfolio?' },
                      { label: ta('chips.fullCryptoCouncil'), prompt: 'Run the full crypto investment council right now. Every advisor framework applied to the current crypto market — on-chain, macro, sentiment, technical, and cycle analysis.' },
                      { label: ta('chips.onChainHealth'), prompt: 'What is the current on-chain health of Bitcoin and Ethereum? Cover MVRV, realized price, active addresses, exchange flows, and what it all means.' },
                      { label: ta('chips.cyclePosition'), prompt: 'Where are we in the crypto market cycle right now? Give me the full picture — on-chain signals, historical patterns, institutional flows, and what typically happens next.' },
                    ]).map(({ label, prompt }) => (
                      <button
                        key={label}
                        onClick={() => !isLoading && sendMessageWithText(prompt)}
                        style={{
                          background: '#0d0d0d', border: `1px solid ${sidebarMode === 'stocks' ? '#1a472a' : '#451a03'}`,
                          borderRadius: '20px', padding: '7px 14px',
                          color: sidebarMode === 'stocks' ? '#4a9a6a' : '#d97706',
                          fontSize: '12px', cursor: isLoading ? 'default' : 'pointer',
                          lineHeight: 1.4, transition: 'all 0.15s', fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => {
                          if (!isLoading) {
                            e.currentTarget.style.background = sidebarMode === 'stocks' ? '#1a472a' : '#451a03'
                            e.currentTarget.style.color = sidebarMode === 'stocks' ? '#7ec8a0' : '#fbbf24'
                          }
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = '#0d0d0d'
                          e.currentTarget.style.color = sidebarMode === 'stocks' ? '#4a9a6a' : '#d97706'
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: msg.role === 'user' ? '#1f1f1f' : 'linear-gradient(135deg, #1a472a, #2d6a4f)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', flexShrink: 0, marginTop: '2px',
                  }}>
                    {msg.role === 'user' ? '👤' : '⚡'}
                  </div>

                  <div style={{ flex: 1 }}>
                    {msg.role === 'assistant' && msg.content && (
                      <div style={{ marginBottom: '8px', display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => printMessage(msg.content)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            background: '#2d6a4f', border: 'none', borderRadius: '5px',
                            padding: '4px 12px', color: '#fff', fontSize: '12px',
                            fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em',
                          }}
                        >
                          🖨︎ Print
                        </button>
                        <button
                          onClick={() => savePDF(msg.content)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            background: '#1e3a5f', border: 'none', borderRadius: '5px',
                            padding: '4px 12px', color: '#fff', fontSize: '12px',
                            fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em',
                          }}
                        >
                          📄 Save PDF
                        </button>
                      </div>
                    )}
                    {msg.role === 'user' ? (
                      <div style={{ fontSize: '14px', lineHeight: 1.75, color: '#bbb', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.content}
                      </div>
                    ) : (
                      <div style={{ fontSize: '14px', wordBreak: 'break-word' }}>
                        <MarkdownRenderer
                          content={msg.content}
                          isStreaming={isLoading && i === messages.length - 1 && msg.content === ''}
                        />
                        {/* Training chips — only on completed assistant messages */}
                        {!(isLoading && i === messages.length - 1) && msg.content && (() => {
                          const chips = detectFrameworks(msg.content)
                          if (!chips.length) return null
                          return (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                              {chips.map(chip => (
                                <a
                                  key={chip.topic}
                                  href={`/${currentLocale}/training?topic=${encodeURIComponent(chip.topic)}&level=Intermediate`}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                    background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)',
                                    borderRadius: '20px', padding: '4px 12px',
                                    fontSize: '11px', fontWeight: 600, color: '#a78bfa',
                                    textDecoration: 'none', cursor: 'pointer',
                                    transition: 'background 0.15s',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.22)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.12)')}
                                >
                                  📚 Learn: {chip.label}
                                </a>
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Chat Input ─────────────────────────────────────────────── */}
          <div style={{
            padding: '16px 24px 24px',
            borderTop: messages.length > 0 ? '1px solid #1f1f1f' : 'none',
            display: activeTab === 'chat' ? undefined : 'none',
          }}>

            {/* Active Pine Script banner */}
            {activePineScript && !pineCodeInjected.current && (
              <div style={{
                marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center',
                background: '#0a1a10', border: '1px solid #1a472a',
                borderRadius: '8px', padding: '7px 12px',
              }}>
                <span style={{ fontSize: '12px', color: '#7ec8a0', fontWeight: 600 }}>
                  📈 {activePineScript.name} is loaded in the editor
                </span>
                <span style={{ fontSize: '11px', color: '#444' }}>— your next message will include it automatically</span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => setActivePineScript(null)}
                  style={{ background: 'transparent', border: 'none', color: '#444', fontSize: '14px', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                >×</button>
              </div>
            )}

            {/* Analysis popup */}
            {analysisPopup && (
              <div style={{
                marginBottom: '10px',
                background: '#0d1f16', border: '1px solid #2d6a4f',
                borderRadius: '10px', padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: '10px',
              }}>
                <div style={{ fontSize: '12px', color: '#7ec8a0', fontWeight: 600 }}>
                  {analysisPopup === 'stock' ? '📈 Analyze a Stock or ETF' : '₿ Analyze a Crypto'}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    ref={analysisInputRef}
                    value={analysisSymbol}
                    onChange={e => setAnalysisSymbol(e.target.value.toUpperCase())}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitAnalysisPopup()
                      if (e.key === 'Escape') setAnalysisPopup(null)
                    }}
                    placeholder={analysisPopup === 'stock' ? 'e.g. AAPL, NVDA, SPY...' : 'e.g. BTC, ETH, SOL...'}
                    style={{
                      flex: 1, background: '#0a0a0a', border: '1px solid #1f1f1f',
                      borderRadius: '6px', padding: '7px 10px',
                      color: '#e5e5e5', fontSize: '14px', fontFamily: 'inherit',
                      outline: 'none', letterSpacing: '0.05em',
                    }}
                  />
                  <button
                    onClick={submitAnalysisPopup}
                    style={{ background: '#2d6a4f', border: 'none', borderRadius: '6px', padding: '7px 14px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {ta('analyze')}
                  </button>
                  <button
                    onClick={() => setAnalysisPopup(null)}
                    style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '18px', cursor: 'pointer', padding: '0 4px' }}
                  >×</button>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={councilChimeIn}
                    onChange={e => setCouncilChimeIn(e.target.checked)}
                    style={{ accentColor: '#2d6a4f', width: '14px', height: '14px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#555' }}>Have Council chime in after the analysis</span>
                </label>
              </div>
            )}

            {/* Ticker popup */}
            {tickerPopup && (
              <div style={{
                marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center',
                background: '#0d1f16', border: '1px solid #2d6a4f',
                borderRadius: '8px', padding: '8px 12px',
              }}>
                <span style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap' }}>
                  {tickerPopup.promptPrefix.length > 40 ? tickerPopup.promptPrefix.substring(0, 40) + '...' : tickerPopup.promptPrefix}
                </span>
                <input
                  ref={tickerInputRef}
                  value={tickerInput}
                  onChange={e => setTickerInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitTickerPopup()
                    if (e.key === 'Escape') setTickerPopup(null)
                  }}
                  placeholder={tickerPopup.placeholder}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    outline: 'none', color: '#e5e5e5', fontSize: '13px', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={submitTickerPopup}
                  style={{ background: '#2d6a4f', border: 'none', borderRadius: '5px', padding: '4px 10px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
                >Go</button>
                <button
                  onClick={() => setTickerPopup(null)}
                  style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '16px', cursor: 'pointer', padding: '0 4px' }}
                >×</button>
              </div>
            )}

            {/* Chat input box */}
            <div style={{
              display: 'flex', gap: '10px', alignItems: 'flex-end',
              background: '#111', border: '1px solid #262626',
              borderRadius: '12px', padding: '10px 14px', transition: 'border-color 0.15s',
            }}
              onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#2d6a4f' }}
              onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#262626' }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={ta('inputPlaceholder')}
                rows={1}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#e5e5e5', fontSize: '14px', lineHeight: 1.6,
                  resize: 'none', fontFamily: 'inherit', overflowY: 'hidden', maxHeight: '200px',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                  background: !input.trim() || isLoading ? '#1a1a1a' : '#2d6a4f',
                  color: !input.trim() || isLoading ? '#333' : '#fff',
                  cursor: !input.trim() || isLoading ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', flexShrink: 0, transition: 'all 0.15s',
                }}
              >
                {isLoading ? '•••' : '↑'}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#333', textAlign: 'center', marginTop: '8px' }}>
              Enter to send · Shift+Enter for new line · For educational purposes only
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1f1f1f; border-radius: 2px; }
      `}</style>
    </div>
  )
}
