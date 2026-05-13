# AT → IC Integration Plan

> Created: 2026-05-13
> Status: **Reviewed. Ready to build. Start with Step 1.**
> Context: Full AT codebase reviewed against IC architecture improvement plan. This doc captures what AT has, what IC is missing, scope of changes, and build order.

---

## The Core Shift

IC's crypto picks currently work as: **"Claude decides with AT data as context."**
After integration they work as: **"AT validates the setup, Claude explains it."**
Claude is good at explaining. It's not reliably good at deciding when confluence is sufficient — that's what AT's math is for.

---

## What AT Has That IC Can Use

### 1. Regime Classifier (`src/features/regime_classifier.py`)
Classifies each coin as **TRENDING / RANGING / VOLATILE** using ADX + Bollinger Band width.
IC has zero regime detection. Momentum strategies fail in ranging markets — this is the #1 source of false signals in IC picks.

### 2. Confluence Scoring (`src/features/setup_detector.py`)
Checks 6 signals (HTF bias 1H, HTF bias 4H, regime, RSI, MACD, order book imbalance) and scores agreement as `confluence_score` (0.0–1.0). AT requires a minimum threshold before any setup is considered. IC currently passes all signals to Claude with no gate.

### 3. LSTM Confidence — **ALREADY BEING PUSHED, NOT USED PROPERLY**
`lstm_confidence` is already in the Supabase `at_signals` table (read from `models/{SYM}/metrics.json`). IC passes it as context text — Claude may or may not weight it. Needs to be a hard weighted factor in the scoring pipeline, not prose.

### 4. Sentiment Engine (`src/ingestion/sentiment/`)
- Local Llama 3.1 8B scores news text → -1.0 to +1.0 per coin
- Aggregates: news (35%) + Fear & Greed (30%) + options put/call (25%) + mention velocity (10%)
- Produces `composite_score` and `signal` (STRONG_BULLISH / BULLISH / NEUTRAL / BEARISH / STRONG_BEARISH)
- IC currently injects raw news headlines. AT has already digested these into a number.

### 5. Setup Context (`src/features/setup_detector.py` → `Setup` dataclass)
Rich chart-reading data AT already computes but doesn't push:
- `fib_level_name` — where price sits in the Fibonacci structure (e.g. "61.8% golden ratio")
- `pullback_volume_trend` — DECLINING (healthy) / STABLE / INCREASING (warning)
- `candle_pattern_at_level` — HAMMER / SHOOTING_STAR / DOJI / BULL_MARUBOZU etc.
- `wick_rejection_pct` — strength of rejection at the level
- `bb_position` — price position relative to Bollinger Bands
- `atr_stop_pct` / `atr_tp_pct` — pre-calculated stop and target distances

### 6. Backtesting Infrastructure (`src/backtest/`)
Full backtest engine writes to PostgreSQL: win rate, profit factor, avg win/loss, max drawdown, exit reason breakdown. Results saved to `backtest_runs` and `backtest_trades` tables. Will become more valuable as AT accumulates trade history.

---

## Dependency Note
The setup detector and sentiment aggregator only run when `main.py` is active (currently stopped — paper trading phase not started). This means:
- **Regime** can be computed standalone from QuestDB candles ✅
- **LSTM confidence** already available from metrics.json files ✅
- **Fear & Greed** runs independently ✅
- **Full sentiment composite** requires sentiment services running ⚠️
- **Live setup context** (fib levels, candle patterns) requires main.py running ⚠️

---

## Scope of Changes

| File / Area | Change | Size |
|-------------|--------|------|
| `signals_push.py` on Spark | Add regime from QuestDB + sentiment from Redis + setup context | Medium (~150 lines) |
| Supabase `at_signals` table | Add 6–8 new columns | Small — one migration |
| IC picks route (crypto section) | Use `lstm_confidence` + `confluence_score` as hard gates, not context | Medium |
| IC picks Claude prompt | AT-validated data first, Claude explains — not invents | Medium |
| IC chat route | Inject regime + setup context when crypto coins mentioned | Small |

**Total: 2–3 focused days.**

---

## Effectiveness Prediction

### High confidence
- **Regime gate** — Filters out picks in ranging markets. Fewer picks, higher quality. Momentum strategies need trending conditions. Biggest single quality improvement.
- **Confluence ≥ 0.6 as hard gate** — AT's own validated threshold from backtesting. Applies AT's proven filter to IC picks. Highest-confidence improvement.
- **LSTM confidence as weighted factor** — Moves from "Claude may notice this number" to "this number drives the score." Model-driven vs LLM-rationalized.

### Medium confidence
- **Richer setup context in chat** — Users get "61.8% Fibonacci, declining volume pullback, hammer candle" instead of "near support." Big UX upgrade.
- **Sentiment composite** — Replaces raw news injection with scored signal. More grounded responses, less hallucinated sentiment.

### Lower confidence (needs more AT trade history)
- **Backtest stats as pick confidence evidence** — Good idea, gets more valuable as AT accumulates real trade data over time.

---

## Priority Build Order

| # | Step | Spark changes | IC changes | Impact |
|---|------|--------------|------------|--------|
| **1** | Use `lstm_confidence` + `confluence_score` properly in IC picks | None — already in Supabase | Restructure crypto picks scoring | High — zero infrastructure |
| **2** | Rewrite `signals_push.py` to add regime + setup context | Yes — read QuestDB + Redis | Add columns to `at_signals` table | Highest overall |
| **3** | Update IC chat + picks prompts for richer data | None | Prompt restructure | Medium |
| **4** | Add sentiment composite to push (once sentiment services verified running) | Yes | Add column | Medium |
| **5** | AT stock signals → IC picks (after AT Phase 8 stock scanning loop) | Depends on AT Phase 8 | Same pattern as crypto | High — applies to stocks too |

---

## Where We Left Off

**Next action: Start with Step 1.**
- Zero Spark work needed
- `lstm_confidence` and `confluence_score` are already in the `at_signals` Supabase table
- IC's crypto picks route needs to be restructured to use these as weighted/gated factors instead of prose context passed to Claude
- File to change: IC picks API route (crypto section) + the Claude prompt for crypto picks

---

## Key Files Reference

| File | Location | Purpose |
|------|----------|---------|
| `signals_push.py` | `/home/dag/agentic-trader/signals_push.py` | The bridge — runs every 15 min via cron |
| `regime_classifier.py` | `/home/dag/agentic-trader/src/features/regime_classifier.py` | Standalone regime computation |
| `setup_detector.py` | `/home/dag/agentic-trader/src/features/setup_detector.py` | Full setup context + confluence scoring |
| `sentiment/aggregator.py` | `/home/dag/agentic-trader/src/ingestion/sentiment/aggregator.py` | Composite sentiment score |
| `risk/engine.py` | `/home/dag/agentic-trader/src/risk/engine.py` | Hard risk rules — reference for IC pick gates |
| `backtest/report.py` | `/home/dag/agentic-trader/src/backtest/report.py` | Backtest output format + PostgreSQL schema |
| IC picks route | `/Users/dag/investment-council/src/app/api/...` (find picks API) | Where Step 1 changes go |
| `at_signals` table | IC Supabase | Already has: symbol, lstm_signal, lstm_confidence, funding_rate, oi_trend, liq levels |

*Last updated: 2026-05-13*
