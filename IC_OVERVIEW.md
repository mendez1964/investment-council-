# Investment Council — Full Feature & Data Source Reference

## What It Is

Investment Council (`investmentcouncil.io`) is a multi-AI investment research and analysis platform. Users chat with AI, get daily stock/crypto/options picks, scan markets using famous investor frameworks, monitor portfolios, and receive automated email briefings. Built with Next.js 14 (App Router), Supabase, Railway, and Stripe.

---

## Data Sources

### 1. Finnhub — Primary Stock Market Data
**Key:** `FINNHUB_API_KEY` | Free tier: 60 calls/min, no daily limit

| Data | Used For |
|------|----------|
| Real-time quotes (price, change, high/low) | Chat, AI picks, scanner, watchlist |
| Company profile (name, sector, market cap) | Chat, AI picks |
| Fundamental metrics (P/E, EPS, ROE, debt/equity, 52wk high/low, short interest) | AI picks scoring, scanner frameworks |
| Earnings history (last 8 quarters, beat rate) | AI picks Factor scoring |
| Intraday candles (1-min) → VWAP | AI picks |
| Daily OHLCV candles (260 days) → RSI14, SMA20/50/200, MACD(12,26,9), ATR14, Bollinger Bands(20,2) | AI picks technical scoring |
| Pivot points (PP, R1, R2, S1, S2) + Fibonacci retracements (38.2%, 50%, 61.8%) | AI picks, trading plans |
| Insider sentiment (buy/sell activity) | AI picks analyst context |
| Analyst price targets + buy/hold/sell counts | AI picks analyst context |
| Earnings calendar (next 7 days) | Chat briefings, morning emails |
| IPO calendar (next 90 days) | IPO page |
| Company news (7-day window) | Chat ticker queries |
| General market news (general, forex, crypto, merger) | Chat |
| Sector ETF quotes (XLK XLF XLE XLV XLI XLY XLP XLU XLRE XLB XLC) | Market briefings |
| VIX quote | AI picks Factor 5 (volatility regime) |

---

### 2. CoinGecko — Crypto Market Data
**Key:** `COINGECKO_API_KEY` (Demo tier) | Free with key

| Data | Used For |
|------|----------|
| Real-time price, 24h change, market cap, volume for 50+ coins | Chat crypto queries, AI picks crypto |
| Top 10 coins by market cap | Crypto dashboard |
| Bitcoin dominance + total market cap | Chat briefings |

**Coin support:** BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, DOT, MATIC, LINK, LTC, UNI, ARB, OP, NEAR, SUI, HBAR, AAVE, MKR, SHIB, PEPE, WIF, BONK, and 30+ more

---

### 3. Alternative.me — Crypto Sentiment
**No key required | Free**

| Data | Used For |
|------|----------|
| Crypto Fear & Greed Index (0–100, classification) | Chat crypto queries, Fear & Greed page |

---

### 4. FRED (Federal Reserve Economic Data)
**Key:** `FRED_API_KEY` | Free

| Data | Used For |
|------|----------|
| Federal Funds Rate (`FEDFUNDS`) | Chat macro queries, briefings |
| CPI Inflation (`CPIAUCSL`) | Chat macro queries, briefings |
| 2-Year Treasury Yield (`DGS2`) | Yield curve, chat macro |
| 10-Year Treasury Yield (`DGS10`) | Yield curve, chat macro |
| 2s/10s Yield Curve Spread + inversion signal | Chat macro, briefings |
| Unemployment Rate (`UNRATE`) | Chat macro queries, briefings |
| Real GDP — last 4 quarters + annualized growth (`GDPC1`) | Chat macro queries, briefings |

---

### 5. Alpha Vantage — Market Movers & Backup Quotes
**Key:** `ALPHA_VANTAGE_API_KEY` | Free tier (limited calls)

| Data | Used For |
|------|----------|
| Top gainers, top losers, most actively traded | Market Movers page, briefings |
| Stock quotes (backup) | Redundancy |
| Price history (daily/weekly/monthly) | Historical queries |
| Company overview (fundamentals) | Ticker deep-dives |

---

### 6. Glassnode — Bitcoin On-Chain Data (Premium)
**Key:** `GLASSNODE_API_KEY` | Standard tier ~$39/mo

| Data | Used For |
|------|----------|
| MVRV Ratio (>3.7 = overheated, <1 = bottom zone) | Chat BTC analysis |
| SOPR — Spent Output Profit Ratio | Chat BTC analysis |
| Bitcoin Realized Price (avg cost basis on-chain) | Chat BTC analysis |
| Mean Hash Rate (TH/s → EH/s) | Network health |
| Active Addresses (24h unique) | Network activity |
| Exchange Net Flow (positive = sell pressure, negative = accumulation) | BTC sentiment |
| Long-Term Holder Supply (held 155+ days) | BTC smart money |
| Short-Term Holder Supply (held <155 days) | BTC weak hands |
| Puell Multiple (>4 = top zone, <0.5 = bottom zone) | Miner pressure |

**Trigger keywords:** mvrv, sopr, realized price, on-chain, hash rate, exchange flow, LTH, STH, puell, glassnode, accumulation, whale, bitcoin health, cycle position

---

### 7. CoinMetrics Community API — Bitcoin On-Chain (Free Backup)
**No key required | Always free**

| Data | Used For |
|------|----------|
| MVRV Ratio | Primary on-chain when no Glassnode key |
| Exchange inflow + outflow + net flow | Exchange pressure signal |
| Hash Rate | Network security |
| Active Addresses | Network activity |

*Used as primary on-chain source when Glassnode key is absent, or to fill gaps when Glassnode is active.*

---

### 8. Tradier — Options Chain Data
**Key:** `TRADIER_API_KEY` | Sandbox: free delayed; Production: $10/mo
**Variable:** `TRADIER_SANDBOX` — set to `"false"` for live data

| Data | Used For |
|------|----------|
| Options expirations for any ticker | Options picks, chat options queries |
| Full options chain (calls + puts): bid, ask, last, volume, OI | Options picks, chat |
| Greeks: IV (mid_iv), Delta, Gamma, Theta | Options picks scoring, chat |
| Gamma Exposure (GEX) calculation | Options flow context |
| Unusual options flow detection (Vol/OI ratio ≥ 0.5) | Options intelligence |

**Supported tickers for chat:** SPY, QQQ, AAPL, NVDA, TSLA, MSFT, AMZN, GOOGL, META, SPX, IWM, NFLX, AMD, PLTR

**Options strike selection logic:** ATM when confidence ≥ 9/10; 1 strike OTM at 7-8; 2 OTM at 5-6; 3 OTM at <5

---

### 9. SEC EDGAR — Public Company Filings
**No key required | Free public database**

| Data | Used For |
|------|----------|
| 10-K annual reports (last 3) | Chat SEC queries |
| 10-Q quarterly reports (last 5) | Chat SEC queries |
| Form 4 insider transactions (last 15) | Chat insider queries |
| 13F hedge fund holdings | Chat institutional queries |
| 8-K material events (last 10) | Chat event queries |
| Full-text EDGAR search | Discovery queries |

**Trigger keywords:** 10-K, 10-Q, annual report, quarterly report, SEC filing, insider buy/sell, Form 4, 8-K, material event, 13F, hedge fund holdings

---

### 10. Agentic Trader Signals (AT → IC Bridge)
**Internal | Supabase `at_signals` table**

| Data | Used For |
|------|----------|
| 20 crypto signals from LSTM+agent model on DGX Spark | Chat crypto queries, AI picks crypto section |

**How it works:** `signals_push.py` on Spark runs via cron every 15 min → pushes to Supabase `at_signals` → IC reads in chat (when crypto keywords detected) and AI picks (crypto call injects AT signals as context)

---

### 11. Supabase — Internal Database
**Project:** investment-council (separate from AdZone AI)

| Table | Contents |
|-------|----------|
| `profiles` | User ID, tier, API keys (anthropic, openai, gemini, grok), preferred AI, Stripe customer ID |
| `ai_picks` | Daily stock + crypto picks (symbol, type, bias, confidence, rationale, catalyst, entry price) |
| `ai_options_picks` | Daily/weekly options picks (underlying, type, strike, expiry, entry premium, confidence) |
| `at_signals` | Agentic Trader crypto signals from Spark |
| `market_news` | Ingested news articles (used by picks + chat for context) |
| `watchlists` | User watchlist tickers + categories |
| `portfolios` | User portfolio positions |
| `alerts` + `alert_prefs` | User price/event alerts |
| `ai_usage_log` | Claude API cost tracking (tokens, cost) |

---

## Features

### AI Chat (`/app/[locale]/app/`)
- **Multi-AI:** Claude (Anthropic SDK), ChatGPT (GPT-4o via OpenAI), Gemini (2.0 Flash), Grok (3 via xAI)
- **Key routing:** User's own key → IC key (24h grace) → blocked
- **Languages:** English, Spanish (es), Portuguese (pt), French (fr)
- **Live data injection:** Every message runs `fetchLiveData()` which pulls from all external sources based on intent detection (tickers, crypto keywords, macro keywords, SEC keywords, options keywords)
- **Internal data injection:** Pulls today's picks, options picks, AT signals, and news from Supabase when relevant
- **Intent detection:** Automatically routes to correct data sources based on message content

### AI Picks (`/app/[locale]/ai-picks/`)
- **Stock picks:** Scans 25-ticker universe (SPY, QQQ, IWM, AAPL, NVDA, TSLA, META, AMZN, MSFT, GOOGL, AMD, NFLX, JPM, GS, BAC, XOM, GLD, TLT, COIN, PLTR, CRWD, PANW, UBER, SMCI, MSTR)
- **Technical scoring (pre-computed from real data):**
  - Factor 1: MA trend (SMA20/50/200 position)
  - Factor 2: RSI14 momentum
  - Factor 3: Volume vs 30-day avg
  - Factor 4: MACD histogram direction
  - Factor 5: VIX regime
- **Also fetches:** Pivot levels, Fibonacci retracements, VWAP, pre-market gap, analyst targets, insider sentiment, earnings beat history
- **Crypto picks:** Separate Claude call (3000 token budget) with AT signals + CoinGecko data as context
- **Stored in:** Supabase `ai_picks`, cached by date, regenerated at 7:30 AM ET

### Options Picks (`/app/[locale]/ai-picks/` → options tab)
- **0DTE picks** (same-day expiry) + **weekly picks** (~3 weeks out)
- **Real options chain data** via Tradier (bid/ask/IV/delta/OI per contract)
- **Stored in:** Supabase `ai_options_picks`
- **Regenerated:** 7:30 AM ET morning cron

### Framework Scanner (`/app/[locale]/app/` → Council Scan)
Scans 30-stock universe through 9 legendary investor frameworks using real Finnhub + FRED data:

| Framework | What it looks for |
|-----------|-------------------|
| **Buffett** | High ROE (>15%), low P/E, low debt/equity, consistent earnings |
| **Lynch** | PEG ratio, revenue growth vs valuation |
| **Graham** | Deep value, price < book value, net current asset plays |
| **Dalio** | Macro regime awareness, yield curve, employment context |
| **Tudor Jones** | Momentum, technical breakouts |
| **Grantham** | Mean reversion, bubble detection |
| **Roubini** | Macro risk, recession signals |
| **Burry** | Deep contrarian value, high short interest |
| **Livermore** | Price action, trend following |

Trigger: "council scan", "run [framework] scan", or "what would [investor] buy?"

### War Room / Battle (`/app/[locale]/war/`, `/app/[locale]/battle/`)
- Multiple AI models debate an investment thesis simultaneously
- User picks a topic, all AIs respond — compare perspectives

### Guardian Alerts (`/app/[locale]/alerts/`)
- Portfolio risk monitoring with user-defined conditions
- Alert delivery via email (`/api/email/send/guardian-alerts/`)

### News Feed (`/app/[locale]/news/`)
- Company-specific news (Finnhub, 7-day window) + general market news
- Deduplicated, sorted newest first, 72-hour display window
- News ingested to Supabase `market_news` on morning cron for picks context

### Earnings Calendar (`/app/[locale]/economic-calendar/`)
- Upcoming earnings: ticker, date, BMO/AMC/DMH, EPS estimate
- Source: Finnhub, cached 1 hour

### IPO Calendar (`/app/[locale]/ipo/`)
- Next 90 days of IPOs: name, exchange, price range, status
- Source: Finnhub, cached 1 hour

### Fear & Greed (`/app/[locale]/fear-greed/`)
- Crypto sentiment gauge: 0 = Extreme Fear, 100 = Extreme Greed
- Source: Alternative.me

### Market Movers (`/app/[locale]/movers/`)
- Real-time top gainers, top losers, most active
- Source: Alpha Vantage

### Crypto Dashboard (`/app/[locale]/crypto-dashboard/`)
- Top coin prices and market data
- Source: CoinGecko

### Watchlist (`/app/[locale]/app/` → Watchlist tab)
- User-managed tickers with auto-categorization by sector
- Real-time quotes via Finnhub

### Portfolio (`/app/[locale]/app/` → Portfolio tab)
- Track positions with P&L
- Lookup via ticker

### Trading Plan (`/app/[locale]/app/` → Trading Plan tab)
- AI-generated trade plans with entry/exit/stop levels
- Uses technical data (pivots, Fibonacci) from Finnhub

### Pine Script (`/app/[locale]/app/` → Pine Script tab)
- Generate and save TradingView Pine Script strategies
- Stored in Supabase with version history

### Calculators (`/app/[locale]/calculators/`)
- Financial calculation tools

### Training (`/app/[locale]/training/`)
- Investment education content

### Chart Patterns (`/app/[locale]/patterns/`)
- Pattern recognition reference

### Blog (`/app/[locale]/blog/`)
- Static investment research articles

---

## Automated Email System

All emails triggered by cron-job.org hitting Railway endpoints. Cron secret: `CRON_SECRET`

| Email | Trigger | Content |
|-------|---------|---------|
| Morning Briefing | 7:30 AM ET Mon–Fri | Market overview, key levels |
| Daily Picks | 7:30 AM ET Mon–Fri | Today's AI stock + crypto picks |
| Options Trades | 7:30 AM ET Mon–Fri | Today's 0DTE + weekly options picks |
| Options Briefing | 7:30 AM ET Mon–Fri | Options market context |
| EOD Recap | ~4:30 PM ET Mon–Fri | How picks performed, end-of-day summary |
| Evening Summary | Evening | Overnight positioning ideas |
| Guardian Alerts | Triggered by risk events | Portfolio protection alerts |
| Fear & Greed Alert | When index hits extremes | Sentiment warning |

**Morning cron sequence:**
1. News ingest → writes to `market_news` (8s pause)
2. Options picks refresh
3. Stock picks refresh
4. Morning briefing email
5. Daily picks email
6. Options trades email
7. Options briefing email

---

## Subscription & Auth

| Tier | Key Source | Access |
|------|-----------|--------|
| Free / 24h trial | IC's own Claude key | Full access, time-limited |
| Paid (Trader/Pro) | User's own API keys | Full access, unlimited |
| Admin (owner) | IC's own key | Full access, no expiry |
| Admin-granted | IC's own key | Full access, no Stripe required |

**Stripe tiers:**
- **Trader:** monthly (`price_1TF2N66f3KoBGu7depcijGMf`) + yearly (`price_1TF2QV6f3KoBGu7dxQOUbxO8`)
- **Pro:** monthly (`price_1TF2Np6f3KoBGu7dkayHYFd7`) + yearly (`price_1TF2Pj6f3KoBGu7dqgUJ1f3y`)

**AI providers supported:** Claude (Anthropic), ChatGPT (OpenAI GPT-4o), Gemini (Google 2.0 Flash), Grok (xAI Grok-3)

---

## Social Media Automation (n8n — separate from the app)

| Workflow | Schedule | Channels |
|----------|----------|---------|
| IC Daily Briefing | 8 posts/day Mon–Fri | Telegram stocks + crypto + Discord |
| Reddit Monitor | Every 12 min | Monitors r/CryptoMarkets → Telegram crypto |

**Telegram:** @investmentcouncil_stocks (−1003810172381), @investmentcouncil_crypto (−1003741168303)
**Discord:** Investment Council server #general (webhook stored in n8n)
**Bot:** @Icmarketingbot_bot

---

## Deployment

| Service | Role |
|---------|------|
| Railway | Hosts the Next.js app |
| Supabase | Database + auth |
| cron-job.org | Triggers morning/EOD cron endpoints |
| n8n cloud | Social media automation |
| Crisp | Live chat widget |

**Deploy command:** `railway up --service investment-council-`

---

## Environment Variables Summary

```
NEXT_PUBLIC_SUPABASE_URL          IC Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     IC Supabase anon key
SUPABASE_SERVICE_ROLE_KEY         IC Supabase service role key
ANTHROPIC_API_KEY                 IC's own Claude key (24h trial + admin)
FINNHUB_API_KEY                   Stock data (primary)
COINGECKO_API_KEY                 Crypto prices
FRED_API_KEY                      Macro economic data
ALPHA_VANTAGE_API_KEY             Market movers
GLASSNODE_API_KEY                 Bitcoin on-chain (optional — paid)
TRADIER_API_KEY                   Options chain data
TRADIER_SANDBOX                   "false" for live options data
CRON_SECRET                       Authenticates cron endpoint calls
ADMIN_EMAIL                       Owner email (IC key bypass)
PORT                              Railway assigns this automatically
```
