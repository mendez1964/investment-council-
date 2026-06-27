# Investment Council — Platform Overview

## What Is Investment Council?

Investment Council (investmentcouncil.io) is an AI-powered market intelligence platform built for serious investors and traders. It gives you the kind of analysis and trade intelligence that was previously only available to professional buy-side analysts and institutional trading desks — delivered through a conversational interface, updated with live market data, and powered by multiple AI systems working together.

The platform does not give generic financial advice. It gives you specific, data-driven analysis: what the market is doing right now, which setups are forming, what the models say, and how the best investors in history would frame the trade. You ask a question — you get a qualified answer backed by real data.

---

## How the Intelligence Works

Investment Council runs on four layers of intelligence that work together every time you ask a question.

### Layer 1 — Live Market Data

Every question you ask triggers a real-time data fetch from multiple financial data sources. Before the AI responds, it pulls:

- **Live stock quotes and fundamentals** — current price, day change, volume, P/E ratio, analyst targets, earnings history, insider sentiment (via Finnhub)
- **Technical analysis** — RSI, MACD, Bollinger Bands, moving averages (20/50/200-day), ATR, pivot points, Fibonacci retracement levels, support and resistance (via Finnhub)
- **Market movers** — today's top gainers, losers, and most actively traded stocks with volume data (via Alpha Vantage)
- **Crypto prices and metrics** — real-time prices, market cap, Fear & Greed Index, Bitcoin dominance, funding rates (via CoinGecko and Binance)
- **Macroeconomic data** — Fed funds rate, CPI inflation, yield curve, unemployment, GDP growth, DXY (via Federal Reserve Economic Data)
- **Market news** — last 72 hours of high and medium impact financial news, scored by relevance and market direction
- **Dark pool activity** — institutional block trade data from FINRA
- **SEC filings** — 10-K, 10-Q, 8-K, insider transactions, 13F hedge fund holdings (via SEC EDGAR)
- **Options flow** — options chain data, unusual activity, GEX levels (via Tradier)

The AI never answers a market question from memory alone. It reads what is happening right now and answers from that data.

### Layer 2 — The Agentic Trader (Spark)

Running on a dedicated NVIDIA DGX Spark machine, Investment Council operates a proprietary AI trading system called the Agentic Trader (AT). This is a local system that runs entirely offline — no external AI services — and provides three capabilities that no API can replicate:

**LSTM Neural Network Models**
The Spark machine has 426 trained Long Short-Term Memory (LSTM) neural networks — one for each major US stock. Each model was trained on years of daily price and volume data and learns the statistical patterns that precede price moves. Every model outputs a directional signal (bullish or bearish) with a confidence score between 0–100%.

**Crypto Signal Engine**
For cryptocurrency markets, Spark runs LSTM models trained on OKX perpetual futures data, incorporating funding rates, open interest trends, and volume patterns. These signals update every 15 minutes.

**Chart Vision Scanner**
Spark generates annotated chart images for every stock in its universe — candlesticks, moving averages, Fibonacci retracements, RSI, MACD, and volume panels — and runs them through a vision AI model (Gemma 3) that reads the chart the same way a human trader would: identifying patterns, trend structure, support and resistance levels, and volume confirmation. A second AI model (Qwen 2.5) then synthesizes the visual chart read with the LSTM signal and technical indicators to produce a complete trade setup — direction, entry price, stop loss, target price, and risk/reward ratio.

This scanner runs four times daily on weekdays (6:30am, 9:45am, 12:00pm, 3:30pm ET) and the results are immediately available to the chat.

### Layer 3 — The Knowledge Base

Investment Council has a deep knowledge base of 18 investment frameworks built from the methodologies of the world's most successful investors and traders. These frameworks are loaded into the AI's context when relevant to your question.

**Traditional Frameworks:**
- Warren Buffett — circle of competence, economic moats, intrinsic value, margin of safety
- Ray Dalio — debt cycles, all-weather portfolio, risk parity, macro positioning
- George Soros — reflexivity theory, prevailing bias, boom-bust sequences
- Paul Tudor Jones — trend following, 5-to-1 reward-to-risk, capital preservation
- Peter Lynch — invest in what you know, PEG ratio, ten-baggers, insider signals
- Jesse Livermore — line of least resistance, pivot points, tape reading, patience
- The Technician — complete technical analysis across all five trading styles
- The Fund Manager — institutional mechanics, hedge fund strategies, smart money tracking
- The Trading Desk — all professional platforms, data sources, and trading tools
- The Analysts — Benjamin Graham, Michael Burry, Aswath Damodaran, Meredith Whitney, Mary Meeker, Nouriel Roubini, Jeremy Grantham

**Crypto Specialist Frameworks:**
- Michael Saylor — Bitcoin as apex treasury asset, institutional adoption thesis
- Cathie Wood — disruptive innovation, Wright's Law, DeFi disruption
- Raoul Pal — global M2 money supply, everything code, banana zone identification
- Vitalik Buterin — Ethereum technical roadmap, Layer 2 scaling, DeFi protocol analysis
- PlanB — stock-to-flow scarcity model, halving cycles, MVRV ratio
- Arthur Hayes — derivatives market structure, funding rates, fiat debasement
- Andreas Antonopoulos — Bitcoin network security, self-custody, Lightning Network
- Charles Hoskinson — Cardano, peer-reviewed development, formal verification

These frameworks are not applied automatically. They engage only when you ask for them — "What would Buffett say about this?" or "Give me the Tudor Jones read on this setup." For standard questions, the AI responds as a professional analyst using data and sound analysis.

### Layer 4 — Multi-AI Architecture

Investment Council supports four AI models that you can switch between based on your preference and use case:

| Model | Strengths |
|-------|-----------|
| **Claude (Anthropic)** | Deep reasoning, nuanced analysis, long-form research |
| **ChatGPT (OpenAI)** | Broad knowledge, clear explanations, strong narrative |
| **Gemini (Google)** | Fast responses, strong with data interpretation |
| **Grok (xAI)** | Real-time market commentary style, direct and punchy |

Each AI uses your personal API key so your conversations go through your own account — privacy, your own rate limits, your own costs. New users get a 24-hour trial using the platform's Claude key.

---

## What You Can Do

### Ask Any Market Question
Type any financial question in plain English. The platform identifies what data is needed, fetches it in real time, and gives a direct answer. Examples:

- "What is RVI doing today and should I hold?"
- "Give me a technical read on NVDA"
- "What are the best momentum setups for tomorrow's session?"
- "Explain what the yield curve is telling us right now"
- "What's the funding rate on ETH and what does it mean?"

### Get Trade Setups
Ask for a trade and the platform delivers a complete setup: direction (long or short), entry price, stop loss, target price, risk/reward ratio, and the reasoning behind it. The setup is grounded in the chart structure, LSTM model signal, and current technical conditions — not a guess.

### Daily AI Picks
Every trading day, Investment Council generates a full slate of picks:

- **20 stock picks** — generated by the Spark LSTM models and powered by Qwen 2.5, covering the top 20 highest-conviction setups from 426 trained models
- **8 crypto picks** — generated using AT LSTM signals combined with live funding rates and on-chain data
- **Options picks** — daily 0DTE plays and weekly swing plays on SPX, SPY, QQQ, AAPL, and NVDA, scored by the IC Formula

Each pick includes: bias (bullish/bearish), confidence score (1–10), IC score (0–100), rationale, catalyst, and sector context.

### Scanner Results
The Spark scanner runs four times daily and identifies the highest-conviction trade setups across 426 stocks. Each result includes the LSTM model's assessment, a visual chart read from the AI vision model, and a complete trade setup with entry, stop, target, and risk/reward. When you ask for trade ideas, the scanner results are injected directly into the AI's context so it can give you specific, data-backed recommendations.

### War of AIs
Four AI models compete head-to-head daily: Claude, ChatGPT, Gemini, and Grok each pick one stock, one crypto, and one options trade using their own scoring methodology. Performance is tracked over time so you can see which model is performing best across different market conditions.

### Research Reports
Generate any research report in plain English. Describe what you want — "a macro analysis of Fed policy impact on tech stocks" or "a full sector rotation report" — and the platform builds it using live data and the knowledge base. Reports are saved to your account and can be re-run at any time.

### Ask the Council
Engage any of the 18 investment frameworks directly. Ask Warren Buffett to evaluate a stock's moat. Get Paul Tudor Jones's read on a trend setup. Have Ray Dalio assess your portfolio against the debt cycle. The framework's full methodology is applied to your specific question using current market data.

---

## How Picks Are Generated

### The IC Formula (Stocks)
Every stock pick is scored across five factors, each worth up to 20 points (100 points maximum):

1. **F1 — Trend Alignment** (20 pts): Is the stock above its key moving averages? Is the broader sector in favor?
2. **F2 — Momentum Quality** (20 pts): RSI in the right zone? MACD confirming? Volume supporting the move?
3. **F3 — Sector Flow** (20 pts): Is capital flowing into this sector? Relative strength vs. the market?
4. **F4 — Catalyst Clarity** (20 pts): Is there a clear reason for the move — earnings, product, macro tailwind?
5. **F5 — Market Regime** (20 pts): Does the VIX level and overall market environment support this type of trade?

Picks must score above 70 to be included. The LSTM model signal adds a hard gate — if the model is bearish above 65% confidence, bullish picks for that stock are blocked.

### The IC Formula (Crypto)
Crypto picks use the same five-factor framework adapted for digital assets:

1. **F1 — Trend** (20 pts): Price above key MAs, Bitcoin dominance direction
2. **F2 — Momentum** (20 pts): RSI, MACD, volume relative to 30-day average
3. **F3 — Funding Rates** (20 pts): Funding rate direction and magnitude (negative = bullish setup)
4. **F4 — Narrative** (20 pts): Active adoption story, protocol development, macro catalyst
5. **F5 — Regime** (20 pts): Fear & Greed Index, BTC dominance, altcoin season indicator

AT LSTM signal acts as a gate: coins with model confidence below 45% are blocked from bullish picks.

---

## Data Flow Architecture

```
SPARK (NVIDIA DGX)                    SUPABASE (Database)           IC CHAT
─────────────────                    ──────────────────            ────────
LSTM Models (426 stocks)  ──────────► ai_picks table    ──────────► Live context
Crypto Models             ──────────► spark_scanner     ──────────► injected into
Chart Generator                      at_signals         ──────────► every response
Gemma3 Vision AI          ──────────► spark_events
Qwen2.5 Trade AI

EXTERNAL APIS                        IC PLATFORM
─────────────                        ───────────
Finnhub ──────────────────────────► Chat route
Alpha Vantage ────────────────────► Live data fetch
CoinGecko ────────────────────────► Technical analysis
FRED ─────────────────────────────► Macro context
Binance ──────────────────────────► Funding rates
SEC EDGAR ────────────────────────► Filings
FINRA ────────────────────────────► Dark pool data
```

---

## What Makes It Different

**It uses your own AI keys.** Your conversations are private, run through your account, and are not shared with the platform.

**The analysis is grounded in real data.** Every response is anchored to live prices, live technicals, and live market conditions — not the AI's training data from months ago.

**The models are trained on market data specifically.** The 426 LSTM models were trained on years of actual price and volume history. They are not general-purpose AI making educated guesses — they are pattern-recognition models built for one purpose.

**It synthesizes everything at once.** When you ask for a trade, the platform simultaneously considers the visual chart structure, the model signal, the technical indicators, the market regime, the sector context, and the relevant investment framework — and delivers one coherent recommendation.

**It runs locally where it matters.** The heavy AI workloads — model inference, chart generation, vision analysis — run on a dedicated local machine. No cloud latency, no API rate limits, no per-token costs for the compute-intensive work.

---

## Pricing

| Tier | Price | What You Get |
|------|-------|--------------|
| **Free** | $0 | 7-day full trial, then limited access |
| **Standard** | $19.99/month | Full chat, daily picks, scanner, reports |
| **Elite** | $49.99/month | Everything + priority model access, advanced analytics |

Your own API keys work on any tier. If you bring Claude, ChatGPT, Gemini, or Grok keys, those models are available to you on the free tier as well.

---

*Investment Council is built for educational and research purposes. All analysis is for informational use only and does not constitute financial advice. Past model performance does not guarantee future results.*
