# Investment Council — Project Guide for Claude

## CRITICAL: Project Isolation
- This is **completely separate** from AdZone AI — NEVER touch `adzoneai-platform`
- NEVER use AdZone AI Supabase, URL, or API keys
- NEVER deploy to AdZone AI Railway project

---

## Tech Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database:** Supabase (investment-council project)
- **Deployment:** Railway (investment-council project) — auto-deploys from GitHub `main`
- **AI:** Claude API (Anthropic) — `claude-sonnet-4-6`
- **Domain:** investmentcouncil.io

---

## Environment Variables

Local: `/Users/dag/investment-council/.env.local`
Production: Railway dashboard → investment-council service → Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
FINNHUB_API_KEY=               # Stock quotes, technicals, fundamentals, earnings
ALPHA_VANTAGE_API_KEY=         # Top market movers
FRED_API_KEY=                  # Fed funds rate, CPI, yield curve, GDP, unemployment
COINGECKO_API_KEY=             # Crypto prices, market data (Demo key — use x-cg-demo-api-key header)
GLASSNODE_API_KEY=             # On-chain Bitcoin metrics (optional)
TRADIER_API_KEY=               # Options chain data — PENDING Tradier account approval
TRADIER_SANDBOX=true           # Set to true until Tradier approves production
OPENAI_API_KEY=                # ChatGPT for AI Battle feature
GEMINI_API_KEY=                # Google Gemini for AI Battle feature
GROK_API_KEY=                  # xAI Grok for AI Battle feature
CRON_SECRET=ic-cron-2024       # Protects cron endpoints
ADMIN_EMAIL=                   # Owner email — gets IC API key forever
NEXT_PUBLIC_BASE_URL=https://www.investmentcouncil.io
```

---

## What Is Built & Working

### Core Chat (`src/app/api/chat/route.ts`)
The main AI chat endpoint. Every message goes through this pipeline:

1. **Auth check** — determines if user uses their own API key, IC key (admin/grace period), or blocks
2. **`needsLiveData` detection** — regex on the message determines if live market data is needed
3. **`fetchLiveData()`** — if needsLiveData, fetches live data with 15s timeout (was 8s, raised to fix cold-start timeouts)
4. **`wantsCrypto` block** — fires on ANY crypto keyword (tao, xrp, btc, etc.) regardless of needsLiveData. Calls `fetchCoinOnDemand()` which uses `COIN_ID_MAP` for direct CoinGecko lookup (no search step needed for 50+ known coins). Uses `COINGECKO_API_KEY` header to avoid rate limiting.
5. **`wantsTechnicals` block** — fires on technical keywords (support, resistance, RSI, MACD, fib, pivot, etc.) for STOCK queries only (`!wantsCrypto`). Calls `getTechnicalSnapshot()` + `getPivotLevels()` from `src/lib/finnhub.ts` for the detected ticker. Injects MAs, RSI, MACD, Bollinger, ATR, volume, pivot points, swing high/low, Fibonacci 38.2/50/61.8%.
6. **News context** — pulls last 72h high/medium-impact news from `market_news` Supabase table
7. **Graceful degradation** — if live data times out, injects a note telling Claude to use training knowledge. NEVER hard-blocks.
8. **Multi-AI routing** — supports Claude, ChatGPT, Gemini, Grok based on user preference + API key

**Key rule:** `fetchLiveData` is ONLY called when `needsLiveData` is true (gated since 2026-03-30).

### Live Data (`src/lib/live-data.ts`)
Assembles context for the chat. Detects what data to fetch based on the message:
- **Stock quotes + fundamentals** — Finnhub (quotes, profiles, metrics, earnings, insider sentiment, analyst targets)
- **Technical analysis** — `getTechnicalSnapshot()` = RSI, MAs, MACD, Bollinger, ATR, volume vs avg
- **Pivot levels** — `getPivotLevels()` = floor trader pivots (PP/R1/R2/S1/S2), swing high/low, Fibonacci 38.2/50/61.8%
- **Market movers** — Alpha Vantage top gainers/losers/most active
- **Crypto** — CoinGecko prices, Fear & Greed, BTC dominance; Binance funding rates
- **Economic** — FRED: Fed funds rate, CPI, yield curve, unemployment, GDP, DXY
- **On-chain** — Glassnode (if key set) + CoinMetrics
- **Sector rotation** — 11 sector ETF quotes from Finnhub
- **Options chain** — Tradier (when TRADIER_API_KEY is set — PENDING)
- **Dark pool** — FINRA live dark pool data (working); Congressional trades via free House/Senate Stock Watcher APIs (not yet implemented — still using Quiver Quant placeholder)
- **SEC filings** — 10-K/10-Q/8-K/insider transactions via SEC EDGAR
- **Signal Engine** — `computeStockSignal()` + `computeCryptoSignal()` composite signal scores

### Sidebar & Prompts (`src/components/Sidebar.tsx`, `src/app/[locale]/app/page.tsx`)
- Sidebar has two modes: **Stocks** and **Crypto** (toggle at bottom)
- Sections: Analyze, Tools, Council, Scans (collapsed), Options (collapsed)
- **Council names** (Buffett, Dalio, Lynch, etc.) = ask those council members questions directly. Names are simple — NOT descriptions.
- **Predefined prompts** fire the full professional prompt but only show the short label in chat (via `displayLabel` on Message interface)
- **Ticker-based tools** (Analyze a Stock, Sector Rotation, etc.) show a popup asking for the ticker, then append it to the prompt

### AI Picks (`src/app/api/ai-picks/route.ts`)
- Generates 10 stock picks + 8 crypto picks daily using IC Formula (5 factors, 0-20 pts each)
- Pulls live technicals for 25 stocks via Finnhub before sending to Claude
- Scores: trend alignment, momentum quality, sector flow, catalyst clarity, market regime
- Evaluates pending picks via cron only (NOT on page load — fixed 2026-03-30)
- Stored in `ai_picks` Supabase table

### Options Picks (`src/app/api/ai-picks/options/route.ts`)
- Universe: **SPX, SPY, QQQ, AAPL, NVDA** (5 tickers, 0DTE daily + weekly swing)
- Daily: generates 5 picks using IC Daily Options Formula (0DTE)
- Weekly: generates 5 picks on Mondays using IC Weekly Options Formula
- `evaluatePending` runs on CRON ONLY — not on page load (fixed 2026-03-30)
- Generation has 55s timeout to prevent infinite hangs (fixed 2026-03-30)
- Tradier integration ready but gated on `TRADIER_API_KEY` — pending account approval

### AI Battle / War of AIs (`src/app/api/war/generate/route.ts`, `src/lib/battle-ai.ts`)
- 4 AIs compete: Claude, ChatGPT, Gemini, Grok — each picks stock + crypto + option daily
- Each AI has its own scoring formula (IC Formula / WIN Score / Conviction Score / CAS)
- If external API fails or returns empty, falls back to Claude with that AI's persona (fixed 2026-03-30)
- Stored in `battle_picks` Supabase table

### Reports (`src/app/[locale]/reports/page.tsx`, `src/app/api/reports/`)
- Mode-aware: stocks reports vs crypto reports (reads `?mode=` URL param)
- 16 predefined stock reports, 11 predefined crypto reports grouped by category
- Custom report builder: describe in plain English → Claude generates the prompt → save to Supabase
- Saved in `user_reports` table with RLS
- "Run Report" stores prompt in localStorage and auto-sends when app loads

### Crypto Data — Key Fix History
- `fetchCoinOnDemand()` uses `COIN_ID_MAP` (50+ tickers) — case-insensitive, any casing works
- `wantsCrypto` has no `needsLiveData` guard — fires on any crypto mention
- Major crypto tickers (XRP, ADA, BNB, DOT, LINK, AVAX, etc.) are in `wantsCrypto` regex so they NEVER route to the stock technical path (XRP was getting Finnhub stock data — fixed)
- CoinGecko API key is sent as `x-cg-demo-api-key` header on all calls

### Other Features
- **Options Morning Brief** — sidebar prompt, dedicated email template
- **Market Guardian** — per-holding AI alert system (spec in memory, not yet built)
- **Performance Tracker** — wait until 90+ days / 150+ picks before building
- **Dark Pool** — FINRA live data working; Congressional trades API swap pending
- **Pricing** — Free / Standard $19.99 / Elite $49.99 + 7-day full trial then drops to free

---

## Supabase Tables (key ones)
- `profiles` — user tiers, API keys, preferences
- `ai_picks` — daily stock + crypto picks with outcomes
- `ai_options_picks` — daily + weekly options picks
- `battle_picks` — AI Battle picks (Claude vs ChatGPT vs Gemini vs Grok)
- `market_news` — pipeline news with impact level/direction/tickers
- `user_reports` — user-saved custom reports (RLS)
- `user_watchlist` — per-user watchlist
- `user_portfolio` — per-user portfolio holdings

---

## Cron Jobs (Railway)
All cron endpoints require `x-cron-secret: ic-cron-2024` header.
- `POST /api/ai-picks` — generates daily stock + crypto picks (weekdays 7:30 AM ET)
- `POST /api/ai-picks/options` — generates daily options picks (weekdays 7:30 AM ET)
- `POST /api/war/generate` — generates AI Battle picks (daily)
- News pipeline cron — runs periodically to fetch and score market news

---

## Key Files
```
src/app/api/chat/route.ts          ← Main chat API — all live data wiring lives here
src/lib/live-data.ts               ← fetchLiveData() — assembles all market context
src/lib/finnhub.ts                 ← getTechnicalSnapshot(), getPivotLevels(), quotes
src/lib/coingecko.ts               ← getCryptoPrice(), top10, fear/greed
src/lib/battle-ai.ts               ← AI Battle — 4 AI personas + fallback logic
src/app/api/ai-picks/route.ts      ← Daily stock + crypto picks
src/app/api/ai-picks/options/route.ts ← Daily + weekly options picks
src/app/api/war/generate/route.ts  ← AI Battle generation
src/app/[locale]/app/page.tsx      ← Main chat UI + sidebar integration
src/components/Sidebar.tsx         ← Sidebar component + SidebarItem types
src/app/[locale]/reports/page.tsx  ← Reports page (stock + crypto modes)
src/app/api/reports/route.ts       ← Reports CRUD
src/app/api/reports/generate/route.ts ← AI report prompt builder
```

---

## DO NOT
- Submit sitemap or request Google indexing — site not ready for public launch yet
- Build performance tracker until 90+ days / 150+ picks of real data
- Commit `.env.local` or any secrets
- Touch anything in `adzoneai-platform`
