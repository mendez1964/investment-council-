# Investment Council — Architecture Improvement Plan

> Status: **Phase 1 — Analysis complete. Pending Agentic Trader review before full implementation plan.**
> Next step: Read AT codebase when Spark is online → identify integration opportunities → finalize build order.

---

## Source Document

The following recommendations came from a ChatGPT architectural review of IC. Each point has been evaluated against the current IC codebase to determine what's built, what's partial, and what's missing.

---

## What's Already Done

**One file per data source (Point 2)**
IC already has `finnhub.ts`, `coingecko.ts`, `fred.ts`, `alpha-vantage.ts`, `glassnode.ts`, `coinmetrics.ts`, `tradier.ts`, `sec-edgar.ts`. Pattern is correct.
- **Gap:** No standardized return envelope — each lib returns a different shape. Need consistent `{ source, symbol, data_type, timestamp, data, status, error }` wrapper.

**Fallback logic (Point 5)**
Glassnode → CoinMetrics fallback exists and works. `.catch(() => null)` fallbacks throughout `live-data.ts`.
- **Gap:** Fallbacks are silent — when a backup source fires, the AI doesn't know and can't label it.

**Fixed factor scoring for AI picks (Point 9)**
AI picks compute Factors 1–5 from real Finnhub data (MA trend, RSI, Volume, MACD, VIX) and pass scored values to Claude. Claude explains the score, not invents it.
- **Gap:** No Fundamental Score or Macro Regime Score as separate categories. Only 5 technical factors.

**Rate-limit caching (Point 17)**
Earnings calendar cached 1hr, profiles 24hr, options 15min. Quote calls intentionally use `no-store` for real-time.
- **Gap:** No fallback to cached last-known value when a live call fails.

**Security — server-side keys (Point 19)**
User API keys only fetched server-side in API routes, never exposed to frontend.
- **Gap:** No encryption at rest, no key usage logging, no rotation process documented.

---

## Partially Done — Needs Work

**5-layer architecture (Point 1)**
AI picks have reasonable separation (data fetch → technical scoring → Claude explanation). Chat is raw — `fetchLiveData()` pulls directly from APIs on every message, no validation or normalization in between.

**Prevent chat hallucination (Point 16)**
Live data is injected and Claude is told "use these exact numbers." But no forced response structure — no required "Data used / Bullish factors / Bearish factors / Confidence" format. Claude can still be vague or express false certainty.

**AT bridge hardening (Point 12)**
Bridge is functional — signals flow Spark → Supabase every 15 min → IC reads them in chat + picks. No expiry check, no price-drift check, no confidence threshold filter. IC reads whatever is in the table.

---

## Not Done — High Value

**Data quality checks (Point 3) — BIGGEST GAP**
Only basic null checks today. No stale timestamp detection during market hours, no zero-volume rejection, no candle gap detection. A Finnhub call returning an empty array passes silently into the scoring pipeline.

**Source confidence scoring (Point 4)**
No data point carries a confidence label. Delayed Tradier sandbox data is presented with the same confidence as real-time Finnhub quotes.

**Data health dashboard (Point 7)**
Nothing. Owner dashboard tracks users and Claude costs — not API health. No visibility into Finnhub rate limits, AT bridge status, or FRED staleness.

**Hard pick gates (Point 8)**
Scoring exists but no pick is ever rejected before Claude sees it. Earnings within 48 hours, high ATR, zero volume — all pass through to the AI.

**Market regime detection (Point 11) — SINGLE BIGGEST STRUCTURAL IMPROVEMENT**
VIX is one factor but there's no regime classifier. Every pick is evaluated the same regardless of market conditions. Need: Risk-on / Risk-off / High-vol chop / Defensive rotation / Crypto-led risk-on / Liquidity tightening.

Inputs for regime engine:
- VIX level + trend
- SPY + QQQ MA position
- Sector ETF strength/rotation
- 2Y/10Y yield curve spread
- Fed funds rate + CPI trend
- BTC dominance
- Crypto Fear & Greed

**Raw data + audit trail storage (Point 6)**
Only final picks stored. No record of what data went into a pick — source, raw numbers, score breakdown. Can't debug bad picks. Can't backtest without this.

Proposed Supabase tables to add:
- `raw_market_snapshots`
- `processed_market_metrics`
- `data_health_log`
- (keep existing: `ai_picks`, `ai_options_picks`, `at_signals`, `ai_usage_log`)

**Backtesting (Point 14)**
Not built. Picks generated daily but return tracking doesn't exist. Need to track: 1d/3d/5d/10d return, max drawdown after pick, hit rate, avg win/loss, risk/reward, sector performance, regime performance.

**Pick versioning (Point 13)**
No versioning. If prompt or scoring weights change, can't attribute pick quality changes to that change. Need: `strategy_version`, `model_version`, `scoring_version`, `prompt_version` on every stored pick.

**Paper trading mode (Point 15)**
Not built. No way to track picks against real entries/exits/stops before going live.

**Alert suppression (Point 18)**
No deduplication. Same alert can be sent twice, no staleness check before send.

---

## Priority Build Order (IC-specific)

| # | Item | Why |
|---|------|-----|
| 1 | Data quality checks + stale timestamp validation | Prevents bad data poisoning picks silently — highest leverage today |
| 2 | Market regime detection engine | Changes all downstream picks, chat, and alerts — single biggest structural gain |
| 3 | Hard pick gates (volume, earnings window, ATR, spread) | First deterministic filter before AI sees candidates |
| 4 | Standardized adapter envelope per data source | Unlocks source confidence tagging and health logging |
| 5 | Source confidence labels on data points | Makes AI honest about data quality in responses |
| 6 | AT bridge hardening (expiry, price drift, confidence threshold) | Signals flow — just need validation layer |
| 7 | Raw data storage + pick audit trail in Supabase | Required for backtesting |
| 8 | Data health dashboard (owner page) | Visibility before optimization |
| 9 | Backtesting — daily pick return tracking | Can't optimize what you don't measure |
| 10 | Forced chat response structure (data used / bullish / bearish / confidence) | Reduces hallucination risk |
| 11 | Pick versioning (strategy/model/scoring/prompt version on every pick) | Required for reliable iteration |
| 12 | Paper trading mode | Test before real alerts or execution |
| 13 | Alert suppression + deduplication | Prevents spam |

---

## Core Architecture Target

```
Raw Data APIs
     ↓
Data Ingestion Layer (one adapter per source, standardized envelope)
     ↓
Validation + Normalization Layer (quality checks, staleness, confidence tags)
     ↓
Signal/Scoring Engine (regime detection → hard gates → fixed factor scoring → contradiction checks)
     ↓
AI Explanation + User Interface (Claude explains the score, does not invent it)
```

The strongest single move:
> Move from "AI makes picks" → "validated data + fixed scoring + regime filter make picks, AI explains them."

---

## Open Questions (to resolve after Agentic Trader review)

- Which AT components (LSTM models, signal generation, regime detection, risk management) can be shared with or moved into IC?
- Does AT already have a regime detection engine that IC could consume?
- Can AT's backtesting infrastructure be reused for IC picks?
- Should AT signals feed the IC scoring engine as a first-class factor (not just context)?
- Is there a unified data ingestion layer that both systems could share?
- Should IC paper trading be driven by AT's paper trading infrastructure?

---

*Last updated: 2026-05-10*
*Next action: Read Agentic Trader codebase (when Spark is online) → fill in Open Questions → write final integrated implementation plan.*
