import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { getSystemPrompt, getRelevantKnowledge, getRelevantPineKnowledge } from '@/lib/knowledge-base'
import { fetchLiveData } from '@/lib/live-data'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createServerSupabaseClientAuth } from '@/lib/supabase-server-auth'

// Investment Council's own Claude key — used only during 24h grace period
const ic_anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type AIProvider = 'claude' | 'chatgpt' | 'gemini' | 'grok'

const OPENAI_CONFIGS: Record<string, { baseURL?: string; model: string; inputCostPer1M: number; outputCostPer1M: number }> = {
  chatgpt: { model: 'gpt-4o',           inputCostPer1M: 2.50,  outputCostPer1M: 10.00 },
  gemini:  { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-2.0-flash', inputCostPer1M: 0.075, outputCostPer1M: 0.30 },
  grok:    { baseURL: 'https://api.x.ai/v1', model: 'grok-2-latest', inputCostPer1M: 2.00, outputCostPer1M: 10.00 },
}

function streamText(text: string): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text))
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}

// CoinGecko IDs already covered by the top-10 live feed — skip re-fetching these
const TOP10_COIN_IDS = new Set([
  'bitcoin','ethereum','tether','binancecoin','solana','usd-coin','ripple',
  'dogecoin','cardano','tron','staked-ether','wrapped-bitcoin','avalanche-2',
  'shiba-inu','polkadot','chainlink','uniswap','bitcoin-cash','litecoin','near',
])

// Direct ticker/name → CoinGecko ID map — bypasses search for known coins
// This is the primary fix: case-insensitive ticker detection without depending on uppercase-only regex
const COIN_ID_MAP: Record<string, string> = {
  'xrp': 'ripple', 'ripple': 'ripple',
  'ada': 'cardano', 'cardano': 'cardano',
  'bnb': 'binancecoin', 'binance': 'binancecoin',
  'doge': 'dogecoin', 'dogecoin': 'dogecoin',
  'dot': 'polkadot', 'polkadot': 'polkadot',
  'link': 'chainlink', 'chainlink': 'chainlink',
  'avax': 'avalanche-2', 'avalanche': 'avalanche-2',
  'matic': 'matic-network', 'polygon': 'matic-network',
  'ltc': 'litecoin', 'litecoin': 'litecoin',
  'xlm': 'stellar', 'stellar': 'stellar',
  'atom': 'cosmos', 'cosmos': 'cosmos',
  'near': 'near',
  'tao': 'bittensor', 'bittensor': 'bittensor',
  'inj': 'injective-protocol', 'injective': 'injective-protocol',
  'rndr': 'render-token', 'render': 'render-token',
  'arb': 'arbitrum', 'arbitrum': 'arbitrum',
  'op': 'optimism', 'optimism': 'optimism',
  'tia': 'celestia', 'celestia': 'celestia',
  'sei': 'sei-network',
  'sui': 'sui',
  'apt': 'aptos', 'aptos': 'aptos',
  'kas': 'kaspa', 'kaspa': 'kaspa',
  'wld': 'worldcoin', 'worldcoin': 'worldcoin',
  'jup': 'jupiter-exchange-solana', 'jupiter': 'jupiter-exchange-solana',
  'jito': 'jito-governance-token',
  'pyth': 'pyth-network',
  'wif': 'dogwifcoin',
  'bonk': 'bonk',
  'pepe': 'pepe',
  'floki': 'floki',
  'gmx': 'gmx',
  'pendle': 'pendle',
  'aave': 'aave',
  'mkr': 'maker', 'maker': 'maker',
  'crv': 'curve-dao-token', 'curve': 'curve-dao-token',
  'ldo': 'lido-dao', 'lido': 'lido-dao',
  'stx': 'blockstack', 'stacks': 'blockstack',
  'icp': 'internet-computer',
  'fil': 'filecoin', 'filecoin': 'filecoin',
  'hbar': 'hedera-hashgraph', 'hedera': 'hedera-hashgraph',
  'vet': 'vechain', 'vechain': 'vechain',
  'algo': 'algorand', 'algorand': 'algorand',
  'xtz': 'tezos', 'tezos': 'tezos',
  'mana': 'decentraland', 'decentraland': 'decentraland',
  'sand': 'the-sandbox', 'sandbox': 'the-sandbox',
  'axs': 'axie-infinity', 'axie': 'axie-infinity',
  'gala': 'gala',
  'blur': 'blur',
}

// Detect a specific coin mention and fetch comprehensive data from CoinGecko on demand
async function fetchCoinOnDemand(message: string): Promise<string> {
  try {
    // Check direct map first — works for any casing (tao, TAO, Tao)
    const words = message.toLowerCase().match(/\b[a-z]{2,12}\b/g) ?? []
    let directId: string | null = null
    for (const w of words) {
      if (COIN_ID_MAP[w] && !TOP10_COIN_IDS.has(COIN_ID_MAP[w])) {
        directId = COIN_ID_MAP[w]
        break
      }
    }

    // Fall back to uppercase ticker extraction + CoinGecko search for unknown coins not in the map
    const upper = message.match(/\b([A-Z]{2,8})\b/g) ?? []
    const SKIP = new Set(['THE','AND','FOR','NOT','BUT','ARE','YOU','ALL','CAN','HAS','HAD','ITS','HIS','HER','WHO','HOW','NOW','NEW','OLD','ONE','TWO','GET','SET','PUT','LET','SAY','USE','MAY','BIG','TOP','LOW','HIGH','LONG','CALL','PUTS','HOLD','SELL','BUY','SPY','QQQ','DIA','IWM','USD','EUR','GBP','JPY','API','CEO','CFO','SEC','FED','GDP','CPI','IPO','ETF','OTC','RSI','ATH','ATL','EMA','SMA','AUM','ROE','EPS','TVL','APY','APR','GIVE','WHAT','DOES','TELL','SHOW','LOOK','NEED','WANT','GOOD','BAD','BEST','NEXT','LAST','WEEK','YEAR','RISK','LOSS','GAIN','MOVE','PUMP','DUMP'])
    const candidates: string[] = []
    for (const t of upper) {
      if (!SKIP.has(t) && t.length >= 2 && t.length <= 8) candidates.push(t)
    }

    if (!directId && candidates.length === 0) return ''

    // Build ordered list of CoinGecko IDs to try: direct map first, then search-based
    const idsToTry: string[] = []
    if (directId) idsToTry.push(directId)

    const cgKey = process.env.COINGECKO_API_KEY
    const cgHeaders: HeadersInit = cgKey ? { 'x-cg-demo-api-key': cgKey } : {}

    for (const candidate of candidates.slice(0, 3)) {
      try {
        // Search for unknown coins not in the direct map
        const searchRes = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(candidate)}`,
          { headers: cgHeaders, cache: 'no-store' }
        )
        if (!searchRes.ok) continue
        const searchData = await searchRes.json()
        const coin = searchData.coins?.[0]
        if (coin && !TOP10_COIN_IDS.has(coin.id) && !idsToTry.includes(coin.id)) {
          idsToTry.push(coin.id)
        }
      } catch { /* ignore search errors */ }
    }

    for (const coinId of idsToTry.slice(0, 2)) {
      try {
        // Fetch full coin detail — price, market, fundamentals, community, developer
        const detailRes = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=false`,
          { headers: cgHeaders, cache: 'no-store' }
        )
        if (!detailRes.ok) {
          console.error(`[coin-ondemand] CoinGecko ${coinId} returned ${detailRes.status}`)
          continue
        }
        const d = await detailRes.json()
        if (!d?.market_data) continue

        const md = d.market_data
        const sym = d.symbol?.toUpperCase() ?? ''

        // Price & performance
        const price    = md.current_price?.usd
        const ch24h    = md.price_change_percentage_24h?.toFixed(2)
        const ch7d     = md.price_change_percentage_7d?.toFixed(2)
        const ch30d    = md.price_change_percentage_30d?.toFixed(2)
        const ch1y     = md.price_change_percentage_1y?.toFixed(2)
        const mcap     = md.market_cap?.usd
        const fdv      = md.fully_diluted_valuation?.usd
        const vol24h   = md.total_volume?.usd
        const ath      = md.ath?.usd
        const athChg   = md.ath_change_percentage?.usd?.toFixed(1)
        const atl      = md.atl?.usd
        const atlChg   = md.atl_change_percentage?.usd?.toFixed(1)
        const hi24h    = md.high_24h?.usd
        const lo24h    = md.low_24h?.usd

        // Supply / tokenomics
        const circSupply = md.circulating_supply
        const totalSupply = md.total_supply
        const maxSupply  = md.max_supply
        const supplyPct  = circSupply && maxSupply ? ((circSupply / maxSupply) * 100).toFixed(1) : null

        // FDV/MCap ratio — measures inflation risk (high ratio = lots of tokens yet to unlock)
        const fdvMcapRatio = fdv && mcap ? (fdv / mcap).toFixed(2) : null

        // Community
        const twitterFollowers = d.community_data?.twitter_followers
        const redditSubscribers = d.community_data?.reddit_subscribers
        const sentiment = d.sentiment_votes_up_percentage?.toFixed(1)

        // Developer activity
        const githubStars   = d.developer_data?.stars
        const githubForks   = d.developer_data?.forks
        const commits4weeks = d.developer_data?.commit_count_4_weeks
        const devScore      = d.developer_score?.toFixed(0)

        // Categories & description
        const categories = d.categories?.filter(Boolean).slice(0, 4).join(', ') ?? ''
        const desc = d.description?.en
          ? d.description.en.replace(/<[^>]+>/g, '').slice(0, 300).trim() + '...'
          : ''

        // Liquidity signal: volume-to-mcap ratio (>10% = liquid, <1% = illiquid)
        const volMcapRatio = vol24h && mcap ? ((vol24h / mcap) * 100).toFixed(2) : null

        const fmt = (n: number | undefined | null, decimals = 2) =>
          n != null ? n.toLocaleString('en-US', { maximumFractionDigits: decimals }) : 'N/A'
        const fmtB = (n: number | undefined | null) =>
          n != null ? (n >= 1e9 ? `$${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(0)}M` : `$${fmt(n)}`) : 'N/A'

        return `\n\n## COMPREHENSIVE COIN INTELLIGENCE — ${d.name} (${sym})
Rank: #${d.market_cap_rank ?? 'N/A'} | Categories: ${categories || 'N/A'}

### PRICE & PERFORMANCE
Current Price: $${fmt(price)} | 24h Range: $${fmt(lo24h)} – $${fmt(hi24h)}
24h: ${ch24h ?? 'N/A'}% | 7d: ${ch7d ?? 'N/A'}% | 30d: ${ch30d ?? 'N/A'}% | 1Y: ${ch1y ?? 'N/A'}%
ATH: $${fmt(ath)} (${athChg ?? 'N/A'}% from ATH) | ATL: $${fmt(atl)} (+${atlChg ?? 'N/A'}% from ATL)

### MARKET & LIQUIDITY
Market Cap: ${fmtB(mcap)} | Fully Diluted Valuation: ${fmtB(fdv)}
FDV/MCap Ratio: ${fdvMcapRatio ?? 'N/A'}x${fdvMcapRatio && parseFloat(fdvMcapRatio) > 3 ? ' ⚠ HIGH — significant token inflation risk' : fdvMcapRatio && parseFloat(fdvMcapRatio) < 1.5 ? ' ✓ LOW — most tokens already in circulation' : ''}
24h Volume: ${fmtB(vol24h)} | Volume/MCap: ${volMcapRatio ?? 'N/A'}%${volMcapRatio && parseFloat(volMcapRatio) < 1 ? ' ⚠ LOW LIQUIDITY' : volMcapRatio && parseFloat(volMcapRatio) > 20 ? ' — HIGH activity' : ''}

### TOKENOMICS & SUPPLY
Circulating: ${circSupply ? circSupply.toLocaleString() : 'N/A'} ${sym}
Total Supply: ${totalSupply ? totalSupply.toLocaleString() : 'N/A'} ${sym}
Max Supply: ${maxSupply ? maxSupply.toLocaleString() : 'Unlimited'} ${sym}${supplyPct ? ` | ${supplyPct}% of max supply in circulation` : ''}

### COMMUNITY & SENTIMENT
Twitter Followers: ${twitterFollowers ? twitterFollowers.toLocaleString() : 'N/A'}
Reddit Subscribers: ${redditSubscribers ? redditSubscribers.toLocaleString() : 'N/A'}
Community Sentiment: ${sentiment ?? 'N/A'}% bullish

### DEVELOPER ACTIVITY
GitHub Stars: ${githubStars?.toLocaleString() ?? 'N/A'} | Forks: ${githubForks?.toLocaleString() ?? 'N/A'}
Commits (last 4 weeks): ${commits4weeks ?? 'N/A'} | Developer Score: ${devScore ?? 'N/A'}/100${commits4weeks != null && commits4weeks < 5 ? ' ⚠ LOW dev activity' : commits4weeks != null && commits4weeks > 50 ? ' ✓ ACTIVE development' : ''}

### PROJECT DESCRIPTION
${desc || 'No description available.'}

Use all of the above data to give a complete, informed analysis including: price momentum, valuation (FDV vs MCap), tokenomics risk, liquidity, community strength, developer health, and a clear recommendation with entry/risk/outlook.`
      } catch { continue }
    }
    return ''
  } catch {
    return ''
  }
}

export async function POST(request: Request) {
  try {
    const { messages, locale } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
      es: 'IMPORTANT: Respond entirely in Spanish (Español). Keep all ticker symbols (SPY, QQQ, AAPL, BTC, etc.), financial metric abbreviations (P/E, EPS, ROE, ATH, etc.), and numerical data in their standard form — do not translate tickers or metric labels. All prose, headings, analysis, and explanations must be in Spanish.',
      pt: 'IMPORTANT: Respond entirely in Portuguese (Português). Keep all ticker symbols, financial metric abbreviations, and numerical data in their standard form — do not translate tickers or metric labels. All prose, headings, analysis, and explanations must be in Portuguese.',
      fr: 'IMPORTANT: Respond entirely in French (Français). Keep all ticker symbols, financial metric abbreviations, and numerical data in their standard form — do not translate tickers or metric labels. All prose, headings, analysis, and explanations must be in French.',
    }
    const languageInstruction = LANGUAGE_INSTRUCTIONS[locale] ?? ''

    // ── Resolve which AI + key to use ─────────────────────────────────────────
    let aiProvider: AIProvider = 'claude'
    let userApiKey: string | null = null
    let useICKey = false

    try {
      const authClient = createServerSupabaseClientAuth()
      const { data: { user } } = await authClient.auth.getUser()

      if (user) {
        const db = createServerSupabaseClient()
        const { data: profile } = await db
          .from('profiles')
          .select('preferred_ai, anthropic_key, openai_key, gemini_key, grok_key, tier, stripe_customer_id')
          .eq('id', user.id)
          .single()

        const preferred = ((profile?.preferred_ai ?? 'claude') as AIProvider)
        aiProvider = preferred

        const keyMap: Record<AIProvider, string | null> = {
          claude:  profile?.anthropic_key ?? null,
          chatgpt: profile?.openai_key    ?? null,
          gemini:  profile?.gemini_key    ?? null,
          grok:    profile?.grok_key      ?? null,
        }
        userApiKey = keyMap[preferred]

        // Admin owner and admin-granted employees always use IC key (no expiry)
        const isAdmin = user.email === process.env.ADMIN_EMAIL || user.email === 'mendezdag@gmail.com'
        const isAdminGranted = !profile?.stripe_customer_id && (profile?.tier === 'trader' || profile?.tier === 'pro')

        if (userApiKey) {
          // User has their own key — use it
          useICKey = false
        } else if (isAdmin || isAdminGranted) {
          // Owner or admin-granted employee — use IC key, never expires
          aiProvider = 'claude'
          useICKey = true
        } else {
          // Check 24-hour grace period from signup
          const signupTime = new Date(user.created_at).getTime()
          const gracePeriodEnds = signupTime + 24 * 60 * 60 * 1000
          const inGracePeriod = Date.now() < gracePeriodEnds

          if (inGracePeriod) {
            // Grace period: fall back to IC Claude key
            aiProvider = 'claude'
            useICKey = true
          } else {
            // Trial expired — block and prompt to add own key
            return streamText(
              `**Your 24-hour free trial has ended.**\n\nTo continue using the Investment Council AI chat, add your own API key in **Profile → Your API Keys**.\n\n**Where to get your key:**\n- **Claude** — console.anthropic.com\n- **ChatGPT** — platform.openai.com/api-keys\n- **Gemini** — aistudio.google.com/apikey\n- **Grok** — console.x.ai\n\nYour keys are stored encrypted and never shared. Once added, you get unlimited queries using your own account.`
            )
          }
        }
      } else {
        // Not authenticated
        useICKey = true
      }
    } catch (err) {
      console.error('[auth-check] failed:', (err as Error).message)
      useICKey = true
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Get the latest user message
    const latestUserMessage = messages
      .filter((m: { role: string }) => m.role === 'user')
      .at(-1)?.content || ''

    // Load knowledge base + system prompt in parallel
    const [knowledgeBase, pineKnowledge, systemPrompt] = await Promise.all([
      Promise.resolve(getRelevantKnowledge(latestUserMessage)),
      Promise.resolve(getRelevantPineKnowledge(latestUserMessage)),
      Promise.resolve(getSystemPrompt()),
    ])

    // Current date/time
    const now = new Date()
    const reportDate = now.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    })

    // Fetch live market data
    const needsLiveData = /\b(quote|price|stock|ticker|etf|crypto|btc|eth|sol|market|briefing|analysis|analyze|fundamentals|earnings|sector|movers|scan|report|watchlist|portfolio|nvda|aapl|tsla|spy|qqq|msft|amzn|googl|meta|nflx|option|call|put|strike|expiry|0dte|chain|delta|gamma|theta|implied|fall|drop|rise|surge|crash|rally|target|predict|forecast|outlook|direction|trend|support|resistance|level|short|long|bullish|bearish|buy|sell|trade|hold|move|how far|smci|pltr|crwd|coin|mstr|hood|sofi|rivn|arm)\b/i.test(latestUserMessage)

    let liveData = ''
    try {
      const isScan = /council\s*scan|full\s*scan|run\s*(all|the|council)?\s*scan|(tudor(\s+jones)?|livermore|buffett|lynch|graham|grantham|dalio|burry|roubini)\s+scan/i.test(latestUserMessage)
      const timeoutMs = isScan ? 30000 : 8000
      const timeout = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('live-data timeout')), timeoutMs)
      )
      liveData = await Promise.race([fetchLiveData(latestUserMessage), timeout])
      console.log('[live-data] fetched, length:', liveData.length)
    } catch (err) {
      console.error('[live-data] failed:', (err as Error).message)
    }

    // On-demand coin fetch — fires whenever a crypto keyword is mentioned, regardless of needsLiveData
    // needsLiveData misses questions like "Is TAO going higher?" which have no price/buy/analysis keywords
    const wantsCrypto = /\b(crypto|coin|token|blockchain|defi|nft|web3|altcoin|bitcoin|btc|ethereum|eth|solana|sol|xrp|ripple|ada|cardano|bnb|binance|doge|dogecoin|dot|polkadot|link|chainlink|avax|avalanche|matic|polygon|ltc|litecoin|xlm|stellar|atom|cosmos|algo|algorand|near|icp|tao|bittensor|inj|injective|rndr|render|arb|arbitrum|op|optimism|tia|celestia|sei|sui|apt|aptos|kas|kaspa|fetch|wld|worldcoin|pepe|bonk|floki|jito|pyth|wormhole|jup|jupiter)\b/i.test(latestUserMessage)
    if (wantsCrypto) {
      try {
        const coinData = await fetchCoinOnDemand(latestUserMessage)
        if (coinData) {
          liveData += coinData
          console.log('[coin-ondemand] injected specific coin data')
        }
      } catch (err) {
        console.error('[coin-ondemand] failed:', (err as Error).message)
      }
    }

    // On-demand stock technical analysis — support/resistance, Fibonacci, pivots, MAs
    // Fires when user asks about technicals for a specific ticker
    const wantsTechnicals = /\b(support|resistance|fib|fibonacci|pivot|moving average|sma|ema|rsi|macd|bollinger|technical|setup|level|breakdown|breakout|oversold|overbought|trend|momentum|chart|pattern)\b/i.test(latestUserMessage)
    if (wantsTechnicals && needsLiveData && !wantsCrypto) {
      try {
        // Extract stock ticker from message — 1-5 uppercase letters
        const tickerMatch = latestUserMessage.match(/\b([A-Z]{1,5})\b/g)
        const SKIP_WORDS = new Set(['THE','AND','FOR','NOT','ARE','YOU','ALL','CAN','GET','SET','BUY','SELL','HOLD','SPY','QQQ','ETF','RSI','SMA','EMA','ATH','ATL','MACD','USE','ITS','HIS','HOW','NOW','TOP','LOW','HIGH','LONG','USD','API','SEC','FED','GDP','CPI','IPO','OTC','AUM','ROE','EPS','TVL','APY','APR','BTC','ETH','SOL'])
        const tickers = (tickerMatch ?? []).filter(t => !SKIP_WORDS.has(t) && t.length >= 2 && t.length <= 5)

        if (tickers.length > 0) {
          const { getTechnicalSnapshot, getPivotLevels } = await import('@/lib/finnhub')
          const ticker = tickers[0]
          const [snap, pivots] = await Promise.all([
            getTechnicalSnapshot(ticker).catch(() => null),
            getPivotLevels(ticker).catch(() => null),
          ])

          if (snap || pivots) {
            const p = (n: number | null) => n != null ? `$${n.toFixed(2)}` : 'N/A'
            const pct = (n: number | null) => n != null ? `${n.toFixed(2)}%` : 'N/A'

            let techBlock = `\n\n## TECHNICAL ANALYSIS — ${ticker.toUpperCase()}\n`

            if (snap) {
              const maStatus = [
                snap.sma20 != null ? `20-day SMA: $${snap.sma20.toFixed(2)} (price is ${snap.aboveSma20 ? 'ABOVE ✓' : 'BELOW ✗'})` : null,
                snap.sma50 != null ? `50-day SMA: $${snap.sma50.toFixed(2)} (price is ${snap.aboveSma50 ? 'ABOVE ✓' : 'BELOW ✗'})` : null,
                snap.sma200 != null ? `200-day SMA: $${snap.sma200.toFixed(2)} (price is ${snap.aboveSma200 ? 'ABOVE ✓' : 'BELOW ✗'})` : null,
              ].filter(Boolean).join('\n')

              techBlock += `
### MOVING AVERAGES
${maStatus}

### MOMENTUM INDICATORS
RSI (14): ${snap.rsi14 != null ? snap.rsi14.toFixed(1) : 'N/A'}${snap.rsi14 != null ? (snap.rsi14 > 70 ? ' — OVERBOUGHT ⚠' : snap.rsi14 < 30 ? ' — OVERSOLD ✓ potential reversal' : snap.rsi14 > 55 ? ' — Bullish momentum' : snap.rsi14 < 45 ? ' — Bearish momentum' : ' — Neutral') : ''}
MACD Line: ${snap.macdLine?.toFixed(3) ?? 'N/A'} | Signal: ${snap.macdSignal?.toFixed(3) ?? 'N/A'} | Histogram: ${snap.macdHistogram?.toFixed(3) ?? 'N/A'}${snap.macdHistogram != null ? (snap.macdHistogram > 0 ? ' — Bullish momentum building' : ' — Bearish momentum') : ''}
ATR (14-day): ${snap.atr14?.toFixed(2) ?? 'N/A'} — average daily range, use for stop sizing

### BOLLINGER BANDS
Upper: ${p(snap.bbUpper)} | Lower: ${p(snap.bbLower)}
%B: ${pct(snap.bbPctB)}${snap.bbPctB != null ? (snap.bbPctB > 80 ? ' — Price near upper band, overbought' : snap.bbPctB < 20 ? ' — Price near lower band, oversold' : ' — Price within bands') : ''}

### VOLUME
Today vs 30-day avg: ${snap.volVsAvg != null ? `${snap.volVsAvg}x` : 'N/A'}${snap.volVsAvg != null ? (snap.volVsAvg > 2 ? ' — HIGH volume, strong conviction' : snap.volVsAvg < 0.5 ? ' — LOW volume, weak move' : ' — Normal volume') : ''}

### TREND SUMMARY
${snap.trendSignal}`
            }

            if (pivots) {
              techBlock += `

### PIVOT POINTS (Floor Trader Method — based on yesterday's session)
Pivot Point: ${p(pivots.pp)}
Resistance 1: ${p(pivots.r1)} | Resistance 2: ${p(pivots.r2)}
Support 1: ${p(pivots.s1)} | Support 2: ${p(pivots.s2)}

### 20-DAY SWING HIGH/LOW
Swing High: ${p(pivots.swingHigh20)} — key resistance / stop above
Swing Low: ${p(pivots.swingLow20)} — key support / stop below

### FIBONACCI RETRACEMENTS (20-day swing high → swing low)
38.2% retracement: ${p(pivots.fib382)}
50.0% retracement: ${p(pivots.fib500)}
61.8% retracement (golden ratio): ${p(pivots.fib618)}
Current price: ${p(pivots.price)}${pivots.price && pivots.fib618 && pivots.fib382 ? ` — ${pivots.price < pivots.fib618 ? 'Below 61.8% Fib — deep retracement / potential base' : pivots.price < pivots.fib500 ? 'Between 50-61.8% Fib — mid-range retracement' : pivots.price < pivots.fib382 ? 'Between 38.2-50% Fib — shallow retracement, trend still intact' : 'Above 38.2% Fib — holding up well'}` : ''}`
            }

            liveData += techBlock
            console.log(`[technicals-ondemand] injected for ${ticker}`)
          }
        }
      } catch (err) {
        console.error('[technicals-ondemand] failed:', (err as Error).message)
      }
    }

    // Inject news context — always for any financial question, not just briefings
    if (needsLiveData) {
      try {
        const { createServerSupabaseClient: getDB } = await import('@/lib/supabase')
        const db = getDB()
        const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString() // 72h window
        // Pull all high/medium news + any news specifically affecting detected tickers
        const { data: newsItems } = await db
          .from('market_news')
          .select('headline, summary, impact_level, impact_direction, affected_tickers, source, price_impact_est')
          .gte('created_at', cutoff)
          .eq('is_price_moving', true)
          .in('impact_level', ['high', 'medium'])
          .order('created_at', { ascending: false })
          .limit(20)
        if (newsItems && newsItems.length > 0) {
          const newsBlock = newsItems.map(n =>
            `[${n.impact_level?.toUpperCase()} / ${n.impact_direction}] ${n.affected_tickers?.join(', ') ?? ''}: ${n.headline} — ${n.summary}${n.price_impact_est ? ` (est. ${n.price_impact_est})` : ''}`
          ).join('\n')
          liveData += `\n\n## MARKET NEWS (last 72h — high/medium impact)\n${newsBlock}`
          console.log(`[news-context] injected ${newsItems.length} items`)
        }
      } catch (err) {
        console.error('[news-context] failed:', (err as Error).message)
      }
    }

    // If live data fetch failed, proceed anyway — Claude will note the gap and use training knowledge
    if (needsLiveData && !liveData.trim()) {
      liveData = `[LIVE DATA UNAVAILABLE — data feed timed out. Use your training knowledge and clearly note that live prices/data could not be fetched for this response.]`
    }

    // Build shared content pieces
    const kbParts: string[] = []
    if (knowledgeBase.length > 0) {
      kbParts.push(`# LOADED KNOWLEDGE BASE CONTEXT\nThe following framework files are loaded for this query. Draw from them directly in your analysis:\n${knowledgeBase}`)
    }
    if (pineKnowledge.length > 0) {
      kbParts.push(`# PINE SCRIPT v6 DOCUMENTATION — loaded from local knowledge base\nUse these exact docs to write or review Pine Script. Do not guess syntax — use what is documented here.\n${pineKnowledge}`)
    }

    const liveAndReminder = `REPORT DATE/TIME: ${reportDate}\n\n${liveData}\n\nRemember: Always include the report date (${reportDate}) at the top of any analysis or report. Use exact numbers from live data above. Include risk considerations on trade analysis. End substantive analyses with the disclaimer that this is for educational purposes only and is not financial advice. Do NOT invoke council member perspectives unless the user explicitly asked for them.${languageInstruction ? `\n\n${languageInstruction}` : ''}`

    const encoder = new TextEncoder()

    // ── Claude (Anthropic SDK — supports prompt caching) ─────────────────────
    if (aiProvider === 'claude') {
      const anthropicClient = useICKey
        ? ic_anthropic
        : new Anthropic({ apiKey: userApiKey! })

      const systemBlocks: Anthropic.Messages.TextBlockParam[] = []

      systemBlocks.push({
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      } as Anthropic.Messages.TextBlockParam)

      if (kbParts.length > 0) {
        systemBlocks.push({
          type: 'text',
          text: kbParts.join('\n\n'),
          cache_control: { type: 'ephemeral' },
        } as Anthropic.Messages.TextBlockParam)
      }

      systemBlocks.push({ type: 'text', text: liveAndReminder })

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const anthropicStream = await (anthropicClient.messages.create as any)({
              model: 'claude-sonnet-4-6',
              max_tokens: 4096,
              system: systemBlocks,
              messages: messages.map((m: { role: string; content: string }) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              })),
              stream: true,
            })

            let inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheWriteTokens = 0

            for await (const chunk of anthropicStream) {
              if (chunk.type === 'message_start') {
                const usage = chunk.message.usage as any
                inputTokens     = usage?.input_tokens                   ?? 0
                cacheReadTokens = usage?.cache_read_input_tokens        ?? 0
                cacheWriteTokens = usage?.cache_creation_input_tokens   ?? 0
              } else if (chunk.type === 'message_delta') {
                outputTokens = (chunk.usage as any)?.output_tokens ?? 0
              } else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                controller.enqueue(encoder.encode(chunk.delta.text))
              }
            }

            const cost =
              (inputTokens      / 1_000_000) * 3.00 +
              (cacheWriteTokens / 1_000_000) * 3.75 +
              (cacheReadTokens  / 1_000_000) * 0.30 +
              (outputTokens     / 1_000_000) * 15.00

            console.log(`[claude] in:${inputTokens} cacheWrite:${cacheWriteTokens} cacheRead:${cacheReadTokens} out:${outputTokens} cost:$${cost.toFixed(5)} ic:${useICKey}`)

            const usageMarker = `\x00[USAGE:${JSON.stringify({ inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, cost })}]`
            controller.enqueue(encoder.encode(usageMarker))
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        },
      })

      return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
      })
    }

    // ── ChatGPT / Gemini / Grok (OpenAI-compatible SDK) ──────────────────────
    const config = OPENAI_CONFIGS[aiProvider]
    const openaiClient = new OpenAI({
      apiKey: userApiKey!,
      ...(config.baseURL ? { baseURL: config.baseURL } : {}),
    })

    const systemText = [systemPrompt, ...kbParts, liveAndReminder].join('\n\n')

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const openaiStream = await openaiClient.chat.completions.create({
            model: config.model,
            max_tokens: 4096,
            stream: true,
            stream_options: { include_usage: true },
            messages: [
              { role: 'system', content: systemText },
              ...messages.map((m: { role: string; content: string }) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              })),
            ],
          })

          let inputTokens = 0, outputTokens = 0

          for await (const chunk of openaiStream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) controller.enqueue(encoder.encode(text))
            if (chunk.usage) {
              inputTokens  = chunk.usage.prompt_tokens     ?? 0
              outputTokens = chunk.usage.completion_tokens ?? 0
            }
          }

          const cost =
            (inputTokens  / 1_000_000) * config.inputCostPer1M +
            (outputTokens / 1_000_000) * config.outputCostPer1M

          console.log(`[${aiProvider}] in:${inputTokens} out:${outputTokens} cost:$${cost.toFixed(5)}`)

          const usageMarker = `\x00[USAGE:${JSON.stringify({ inputTokens, outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0, cost })}]`
          controller.enqueue(encoder.encode(usageMarker))
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
