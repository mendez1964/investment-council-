# Futures Trading — Complete Reference for Active Traders

## 1. Futures Basics

### What a Futures Contract Is

A futures contract is a legally binding agreement to buy or sell a standardized quantity of an asset at a predetermined price on a specified future date. Unlike spot markets, both parties are obligated to fulfill the contract (unless they offset it before expiration). Every contract trades on a regulated exchange (CME, CBOT, NYMEX, COMEX) with a central clearinghouse acting as counterparty to both sides, eliminating bilateral default risk.

### Contract Specifications

Each futures contract defines:

- **Underlying asset** — the specific commodity, index, currency, or rate
- **Contract size (notional)** — the standardized quantity (e.g., 1,000 barrels of crude, $250 × index level)
- **Tick size and tick value** — the minimum price increment and its dollar value
- **Delivery months** — the calendar months in which contracts expire (quarterly, monthly, or seasonal)
- **Last trading day and settlement** — when and how the contract concludes

### Margin and Leverage

Futures use a performance bond system, not a loan. Two margin levels apply:

- **Initial margin** — the deposit required to open a position (set by the exchange, typically 3–12% of notional value)
- **Maintenance margin** — the floor balance; if your account drops below this, you receive a margin call and must restore to initial margin immediately

Because you control a large notional value with a small deposit, leverage is significant — often 10:1 to 30:1. A 1% move in the underlying can represent a 10–30% gain or loss on margin posted.

### Mark-to-Market (Daily Settlement)

Unlike stocks, futures P&L is settled daily in cash. At the close of each session the exchange marks every open position to the daily settlement price. Gains are credited to your account; losses are debited. This daily cash flow is what creates the margin call mechanism — losses accumulate in real time rather than at position close.

### Settlement: Cash vs Physical Delivery

- **Cash-settled contracts** — at expiration, the final P&L is settled against the published index or reference price (equity index futures, Eurodollars, VIX)
- **Physically delivered contracts** — the actual commodity or Treasury security changes hands (crude oil, gold, most agricultural contracts, Treasury futures). Active traders always roll or close before the first notice day to avoid delivery obligations.

---

## 2. Equity Index Futures

### E-mini S&P 500 (ES)

- **Multiplier:** $50 × index level (~$275,000 notional at 5,500)
- **Tick:** 0.25 points = $12.50
- **Micro (MES):** $5 × index, tick = $1.25
- **Trading hours:** Sunday–Friday 6:00 PM – 5:00 PM ET (23 hours/day with a 1-hour break)
- **Settlement:** Cash, quarterly (March, June, September, December) + serial months

### E-mini Nasdaq-100 (NQ)

- **Multiplier:** $20 × index (~$390,000 notional at 19,500)
- **Tick:** 0.25 points = $5.00
- **Micro (MNQ):** $2 × index, tick = $0.50
- Higher beta to growth/tech; amplifies moves relative to ES

### E-mini Dow (YM)

- **Multiplier:** $5 × DJIA (~$220,000 notional at 44,000)
- **Tick:** 1 point = $5.00
- **Micro (MYM):** $0.50 × index
- Price-weighted nature of DJIA makes YM more sensitive to high-priced components

### E-mini Russell 2000 (RTY)

- **Multiplier:** $50 × index (~$110,000 notional at 2,200)
- **Tick:** 0.10 points = $5.00
- **Micro (M2K):** $5 × index
- Leads risk-on/risk-off cycles; small-cap sensitivity to domestic economic data

### Fair Value

Fair value is the theoretical futures price derived from the cash index:

```
Futures Fair Value = Spot × (1 + r × t/365) − Dividends
```

Where `r` is the risk-free rate and `t` is days to expiration. When futures trade above fair value, buy programs (arbitrage) push cash higher; below fair value, sell programs appear. Pre-market fair value is broadcast by financial media and reflects the implied open for the cash index.

---

## 3. Treasury Futures

### Key Contracts (CBOT)

| Contract | Symbol | Underlying | Notional | Tick Value |
|----------|--------|------------|----------|------------|
| 30-Year T-Bond | ZB | ~30-yr Treasury | $100,000 | $31.25 (1/32) |
| 10-Year T-Note | ZN | ~10-yr Treasury | $100,000 | $15.625 (1/64) |
| 5-Year T-Note | ZF | ~5-yr Treasury | $100,000 | $7.8125 (1/64) |
| 2-Year T-Note | ZT | ~2-yr Treasury | $200,000 | $15.625 (1/128) |

### How Bond Traders Use Treasury Futures

- **Duration hedging:** Portfolio managers use ZN and ZB to reduce or increase interest rate sensitivity without liquidating bond holdings
- **Yield curve positioning:** Long ZN / short ZB (flattener) or the reverse (steepener) to express curve views
- **DV01 matching:** One ZN contract has roughly $65–$85 DV01 (varies with rates); traders calculate hedge ratios in terms of dollar value of a basis point
- **Basis trading:** The difference between the futures price and the cheapest-to-deliver (CTD) bond's converted cash price. Arbitrageurs exploit mispricings; the CTD bond can switch as rates move, creating convexity exposure.

---

## 4. Commodity Futures

### Crude Oil (CL — NYMEX WTI)

- **Contract size:** 1,000 barrels
- **Tick:** $0.01/barrel = $10.00
- **Settlement:** Physical delivery, Cushing Oklahoma
- **Key drivers:** EIA inventory reports (Wednesday), OPEC+ decisions, geopolitical risk, refinery margins, dollar strength
- **Trading hours:** Sunday–Friday 6:00 PM – 5:00 PM ET

### Gold (GC — COMEX)

- **Contract size:** 100 troy ounces
- **Tick:** $0.10/oz = $10.00
- **Micro (MGC):** 10 troy ounces
- **Drivers:** Real interest rates (inverse relationship), dollar index, central bank purchases, inflation expectations
- **Settlement:** Physical delivery (rarely taken)

### Silver (SI — COMEX)

- **Contract size:** 5,000 troy ounces
- **Tick:** $0.005/oz = $25.00
- Higher volatility than gold; dual role as monetary metal and industrial input (solar, electronics)

### Natural Gas (NG — NYMEX Henry Hub)

- **Contract size:** 10,000 MMBtu
- **Tick:** $0.001/MMBtu = $10.00
- Extreme seasonality; EIA storage report (Thursday) drives weekly volatility; weather sensitivity is dominant near-term driver

---

## 5. Currency Futures (CME)

| Contract | Symbol | Size | Tick Value |
|----------|--------|------|------------|
| Euro | 6E | €125,000 | $12.50 |
| Japanese Yen | 6J | ¥12,500,000 | $12.50 |
| British Pound | 6B | £62,500 | $6.25 |
| Canadian Dollar | 6C | C$100,000 | $10.00 |
| Australian Dollar | 6A | A$100,000 | $10.00 |

Currency futures quote the foreign currency price in USD terms (except JPY). They align closely with the forex spot market but trade on exchange with centralized clearing. Roll timing matters — major currency futures roll quarterly, and the roll differential reflects interest rate differentials between countries (covered interest parity).

---

## 6. Contango and Backwardation

### The Mechanics

The futures curve describes how futures prices relate to the spot price across different expiration months:

- **Contango:** Futures price > Spot price. The curve slopes upward. Typical for storable commodities with carry costs (storage, insurance, financing). Traders pay a premium for deferred delivery.
- **Backwardation:** Futures price < Spot price. The curve slopes downward. Occurs when near-term demand is intense relative to supply, or when there is a "convenience yield" (value of holding the physical asset immediately).

### Spot vs. Futures Convergence

As expiration approaches, the futures price converges to spot. If no delivery arbitrage existed, this would not be guaranteed — but the possibility of physical delivery forces convergence. Arbitrageurs will buy spot and deliver against overpriced futures (or vice versa) until prices align.

### Roll Yield and Its Impact on ETFs

When a futures-based ETF (such as USO for crude oil or UNG for natural gas) must roll expiring contracts into the next month, the roll yield is the gain or loss from that trade:

- **In contango:** Rolling means selling the expiring (cheaper) contract and buying the next (more expensive) one. The ETF pays the premium — negative roll yield — causing the ETF to chronically underperform spot prices. USO famously lost value even when crude prices were flat during persistent contango periods.
- **In backwardation:** Rolling means selling at a premium and buying cheaper deferred contracts — positive roll yield, which boosts ETF returns above the spot price change.

This distinction is critical when evaluating commodity ETFs. A futures ETF is NOT a proxy for the spot price when curves are steep. Active traders often prefer futures directly, or use ETFs that hold physical metal (GLD, SLV) to avoid roll costs.

---

## 7. Rolling Futures Contracts

### When to Roll

Traders must roll before the contract's first notice day (for physically-delivered contracts) or last trading day (for cash-settled). Most volume migrates to the next active month approximately:

- **Equity index futures (ES, NQ):** 8 days before expiration (the Thursday before the quarterly expiration Friday)
- **Crude oil (CL):** Around the 20th of the month prior to delivery month
- **Treasury futures:** 5–10 days before last trading day

### How to Roll

A roll is executed as a calendar spread — simultaneously selling the expiring contract and buying the next deferred contract. This can be done as a single spread order on the exchange (e.g., the ESH6/ESM6 spread), which eliminates execution risk from legging in. The roll price reflects carrying costs and is shown in the spread market.

---

## 8. Futures vs. ETFs vs. Options — When to Use Each

| Factor | Futures | ETFs | Options |
|--------|---------|------|---------|
| Leverage | High (built-in) | Low (1:1 unless leveraged) | High (via premium) |
| Roll costs | Yes (manage manually) | Embedded (commodity ETFs) | Via theta decay |
| Tax treatment | 60/40 (see below) | Short/long-term capital gains | 60/40 (index options) |
| Defined risk | No | Yes | Yes (long options) |
| Liquidity (S&P) | Excellent (ES) | Excellent (SPY) | Excellent (SPX/SPY) |
| 24-hour access | Yes | No (market hours) | No (market hours) |
| No uptick rule | Yes | No (depends) | N/A |

**Use futures when:** you need overnight/24-hour market access, tax efficiency, precise large-notional hedges, or cross-asset spread trades.
**Use ETFs when:** you want simplicity, no margin requirements, long-term holds, or retirement account eligibility.
**Use options when:** you need defined risk, want to express a directional view with capped downside, or are selling premium for income.

---

## 9. Margin Requirements

Initial margin is set by exchanges but brokers may impose higher "house margin" requirements. Margin requirements change with volatility — the CME SPAN (Standard Portfolio Analysis of Risk) system calculates margin based on worst-case scenario moves across correlated positions.

**Margin call mechanics:**
1. Account equity falls below maintenance margin
2. Broker issues a margin call — funds must be deposited by next morning (sometimes same day intraday)
3. Failure to meet the call results in forced liquidation at market prices, often at the worst possible moment

**Portfolio margin** for sophisticated traders nets correlated positions, often reducing total margin significantly compared to individual contract margin requirements.

---

## 10. Seasonal Patterns in Futures

Seasonal tendencies arise from recurring supply/demand cycles:

- **Crude oil (CL):** Refineries increase throughput in spring (driving season preparation); summer demand peaks; heating oil demand rises in fall
- **Natural gas (NG):** Highest demand in winter (heating) and summer (cooling); storage builds in shoulder months (April–October)
- **Gold (GC):** Tends to firm in late summer and early fall (Indian wedding/festival season buying, then Western holiday jewelry demand)
- **Grains:** USDA planting intentions report (March) and crop progress reports drive seasonal volatility; harvest pressure in fall
- **Equity index futures:** "Sell in May" is a weak but studied pattern; September is historically the worst month for equities

Seasonals are tendencies, not certainties. Use as a secondary filter, not a primary signal.

---

## 11. COT Report — Reading and Using It

The Commodity Futures Trading Commission (CFTC) publishes the **Commitment of Traders (COT)** report every Friday (for data as of Tuesday close). It breaks open interest into three categories:

- **Commercial hedgers** — producers and end-users hedging real exposure (airlines hedging jet fuel, miners hedging gold production). They are naturally positioned against the trend and are not market-timing signals.
- **Large speculators (non-commercial)** — hedge funds, CTAs, and managed money. Their positioning extremes are contrarian signals. When large specs are record-long, the market is often due for a pullback; record-short can mark bottoms.
- **Small speculators** — retail traders; weakest signal but extreme positioning noted

**How to use COT:**
- Track the **net speculative position** (long minus short for large specs) over a rolling 52-week window
- Extremes (top/bottom decile) in net positioning often precede reversals — particularly in currencies and commodities
- Look for **divergence**: price making new highs but spec longs declining signals distribution
- COT is a slow-moving, weekly signal — best used as a positioning backdrop, not a timing trigger

---

## 12. Key Futures Trading Strategies

### Spread Trading

A spread is the simultaneous purchase and sale of related futures contracts. Spreads reduce outright directional risk and often have lower margin requirements.

- **Calendar spread:** Same commodity, different expirations (e.g., long CLM6 / short CLN6). Profits from changes in the futures curve shape.
- **Inter-commodity spread:** Related but different products (e.g., long crude / short heating oil — "crack spread" in reverse; long gold / short silver — "gold-silver ratio" trade)
- **Inter-market spread:** Same product on different exchanges (rare today given electronic access)

### Basis Trading

Basis = Futures Price − Spot Price (or CTD-adjusted cash price for Treasuries). Basis traders exploit mispricings between the futures and the deliverable cash instrument. In Treasury markets, basis trading requires understanding the cheapest-to-deliver bond, the net basis, and implied repo rate.

### Hedging

A producer (oil company, farmer) sells futures to lock in a price for future production. A consumer (airline, food manufacturer) buys futures to cap input costs. The hedge ratio is adjusted for correlation between the futures contract and the actual exposure:

```
Hedge Ratio = (Portfolio Value × Beta) / (Futures Contract Notional)
```

For equity portfolios, ES futures are used to reduce beta exposure without liquidating holdings — tax-efficient for concentrated positions.

---

## 13. Tax Treatment of Futures — The 60/40 Rule

Under **IRC Section 1256**, futures contracts traded on U.S. exchanges receive favorable tax treatment regardless of holding period:

- **60% of gains/losses** are treated as long-term capital gains
- **40% of gains/losses** are treated as short-term capital gains
- This blended rate applies even if the position was held for one day

At the top federal rate (20% LTCG + 3.8% NIIT), the blended maximum rate on futures profits is approximately **26.8%** compared to **40.8%** for short-term ordinary rates on stock trades.

Additional provisions:
- **Mark-to-market at year end** — open futures positions are treated as if sold at year-end fair market value; gains/losses are recognized annually
- **3-year carryback** — Section 1256 losses can be carried back up to 3 years (vs. only forward for other capital losses)
- Broad-based **index options** (SPX, RUT, VIX options) also qualify for 60/40 treatment; narrow-based index options (single stocks, individual equity options) do not

*Consult a tax professional for jurisdiction-specific guidance and treatment of spreads, straddles, or mixed positions.*

---

*Last updated: March 2026 | Source: CME Group contract specs, CFTC COT data, IRC Section 1256*
