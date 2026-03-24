# Options Strategies — Complete Analyst Reference

**Purpose:** Injected context for AI investment analysts. All strategies, Greeks, IV mechanics, and trade management in one reference.

---

## Core Concepts Before Strategies

**Options contracts** give the buyer the right (not obligation) to buy (call) or sell (put) 100 shares at the strike price before expiration. The seller collects premium and takes on obligation.

**Moneyness:**
- ITM (in-the-money): call strike below spot; put strike above spot
- ATM (at-the-money): strike approximately equal to spot
- OTM (out-of-the-money): call strike above spot; put strike below spot

**Premium components:** Intrinsic value (ITM amount) + extrinsic value (time + implied volatility). Extrinsic decays to zero at expiration.

---

## The Greeks — Deep Reference

### Delta (Δ)
Rate of change of option price per $1 move in underlying. Range: 0 to +1.0 for calls, -1.0 to 0 for puts.

- ATM options: ~0.50 delta
- Deep ITM: delta approaches ±1.0 (moves dollar-for-dollar with stock)
- Far OTM: delta approaches 0

**Position delta** = (contract delta × 100 shares × number of contracts). A 0.30 delta call on 2 contracts gives +60 deltas — equivalent directional exposure to 60 shares.

**Delta as probability proxy:** A 0.30 delta call approximates a 30% probability of expiring ITM (not exact, but useful heuristic).

**Key use:** Hedge ratios. To delta-hedge 100 short shares, buy 2 contracts of a 0.50 delta call.

---

### Gamma (Γ)
Rate of change of delta per $1 move in underlying. Highest for ATM options near expiration.

- Long options have positive gamma (delta accelerates in your favor)
- Short options have negative gamma (delta accelerates against you)
- Gamma risk spikes dramatically in the final week before expiration — a $5 move in the underlying can swing an ATM option's delta from 0.50 to 0.90

**Example:** You are short a 0-DTE ATM straddle on SPY at $500. SPY moves $8. Negative gamma means both legs rapidly go against you — the call's delta surges from -0.50 to -0.85 (you're short), catastrophic for premium sellers.

**Rule:** Avoid short gamma positions into binary events (earnings, FOMC) unless the premium justifies the tail risk.

---

### Theta (Θ)
Daily time decay — the amount an option loses in value per calendar day, all else equal. Always negative for long options, positive for short options.

- Theta is non-linear: decay accelerates exponentially in final 30 DTE
- ATM options decay fastest in absolute dollar terms
- OTM options have less theta but higher sensitivity to IV changes

**Example:** A 45-DTE ATM call on a $100 stock with $3.00 premium might decay $0.03/day. At 7 DTE, the same option might decay $0.15/day.

**Practical rule:** Options sellers (theta collectors) target 30-45 DTE to sell, then close at 50% profit or 21 DTE — capturing the steepest portion of the decay curve while avoiding gamma risk explosion.

---

### Vega (ν)
Change in option price per 1% point change in implied volatility. Always positive for long options, negative for short options.

- Longer-dated options have higher vega (more time for IV to matter)
- ATM options have highest vega at any given expiration
- Vega is expressed per 1 IV point, not 1%

**Example:** An option with vega of 0.15 will gain $0.15 in value if IV rises from 30% to 31%.

**IV crush:** When a high-IV event (earnings) resolves, IV collapses 30-60%. An ATM straddle worth $8.00 with vega of 0.20 and 30-point IV drop loses $6.00 from vega alone — regardless of direction.

**Practical rule:** Buy options when IV rank is below 30; sell options when IV rank is above 50.

---

### Rho (ρ)
Change in option price per 1% change in risk-free interest rate. Generally minor except for LEAPS or in high-rate environments.

- Calls have positive rho (higher rates = higher call prices, cost of carry)
- Puts have negative rho
- In 2022-2023 rate environment, rho became material for long-dated positions

---

## IV Rank and IV Percentile

**IV Rank (IVR):** Where current IV sits relative to the 52-week high/low range.
- IVR = (Current IV − 52w Low) / (52w High − 52w Low) × 100
- IVR of 80 means IV is near the top of its annual range → elevated premium → favor selling

**IV Percentile (IVP):** Percentage of days over the past 52 weeks where IV was below current IV.
- IVP of 85 means IV was lower than today on 85% of trading days → historically expensive options

**Actionable thresholds:**
- IVR/IVP > 50: Favor net short vega strategies (selling premium)
- IVR/IVP < 30: Favor net long vega strategies (buying premium or debit spreads)
- IVR/IVP 30-50: Neutral; use spreads to define risk

---

## Options Strategies

### 1. Long Call
**Structure:** Buy 1 call, pay debit.
**Outlook:** Strongly bullish; needs move > (strike + premium).
**Risk/Reward:** Max loss = premium paid; unlimited upside.
**Use when:** High conviction directional move expected; IV is low (IVR < 30).
**Capital required:** Premium only (e.g., $300 for a $3.00 call).
**Example:** NVDA at $850. Buy 1 $870 call, 30 DTE, for $15.00. Breakeven = $885. Profit if NVDA > $885 at expiration.
**Common mistake:** Buying calls into earnings when IV is elevated — IV crush destroys the position even if direction is correct.

---

### 2. Long Put
**Structure:** Buy 1 put, pay debit.
**Outlook:** Strongly bearish.
**Risk/Reward:** Max loss = premium; max gain = strike − premium (if stock goes to zero).
**Use when:** Speculating on downside or hedging a long position; IV is low.
**Example:** SPY at $500. Buy 1 $490 put, 21 DTE, for $3.50. Breakeven = $486.50.

---

### 3. Covered Call
**Structure:** Long 100 shares + sell 1 OTM call.
**Outlook:** Neutral to mildly bullish; willing to sell shares at strike.
**Risk/Reward:** Premium collected reduces cost basis; capped upside at strike. Downside risk is full stock loss minus premium.
**Use when:** Already hold shares; want to generate income in sideways/slow-grind market.
**Capital required:** 100 shares of stock.
**Example:** Own 100 shares of AAPL at $175. Sell 1 $185 call, 30 DTE, for $2.00. Collect $200. Effective sell price = $187 if called away. Breakeven on downside reduced to $173.
**Rolling:** If approaching expiration with stock near strike, roll the call out in time (buy back, sell next month) to avoid assignment and collect additional premium.

---

### 4. Cash-Secured Put (CSP)
**Structure:** Sell 1 OTM put; hold cash equal to (strike × 100) as collateral.
**Outlook:** Neutral to mildly bullish; willing to acquire shares at strike.
**Risk/Reward:** Premium collected upfront; max loss = (strike − premium) × 100 if stock goes to zero.
**Use when:** Want to enter a stock position at a lower price, or generate yield on cash. IVR > 40 ideal.
**Capital required:** Full cash collateral for the short put strike.
**Example:** MSFT at $420. Sell 1 $400 put, 30 DTE, for $4.50. Collect $450. Breakeven = $395.50. If assigned, effective cost basis = $395.50.
**The wheel:** CSP → assignment → covered call → repeat. Creates income cycle on stocks you want to own.

---

### 5. Protective Put
**Structure:** Long 100 shares + buy 1 OTM put.
**Outlook:** Long-term bullish but hedging against downside.
**Risk/Reward:** Upside unlimited; downside limited to (stock price − strike + premium paid).
**Use when:** Protecting a large gain; hedging into binary events; insurance for concentrated positions.
**Example:** Own TSLA at $180, up significantly. Buy 1 $160 put, 60 DTE, for $5.00. Maximum loss limited to $25/share regardless of how far TSLA falls.

---

### 6. Bull Call Spread (Debit Call Spread)
**Structure:** Buy 1 lower strike call + sell 1 higher strike call, same expiration. Net debit.
**Outlook:** Moderately bullish; price will rise but not explosively.
**Risk/Reward:** Max loss = debit paid; max gain = spread width − debit.
**Use when:** Want directional exposure but limit cost and IV impact. Suitable at any IVR.
**Example:** SPY at $500. Buy $500 call, sell $510 call, 30 DTE, for $3.50 debit. Max gain = $10 − $3.50 = $6.50 per share ($650/contract). Max loss = $350. Breakeven = $503.50.
**Efficiency:** Short call reduces cost basis and vega exposure. Ideal when IVR is moderate-high (the short call is sold at elevated premium).

---

### 7. Bear Put Spread (Debit Put Spread)
**Structure:** Buy 1 higher strike put + sell 1 lower strike put, same expiration. Net debit.
**Outlook:** Moderately bearish.
**Risk/Reward:** Max loss = debit; max gain = spread width − debit.
**Example:** QQQ at $440. Buy $440 put, sell $425 put, 30 DTE, for $5.00 debit. Max gain = $15 − $5.00 = $10.00 ($1,000/contract). Max loss = $500.

---

### 8. Iron Condor
**Structure:** Sell OTM put + buy further OTM put + sell OTM call + buy further OTM call. Net credit.
**Outlook:** Neutral; underlying stays range-bound.
**Risk/Reward:** Max gain = net credit; max loss = spread width − credit (on either side).
**Use when:** IVR > 50; expect low realized volatility. Classic high-probability income strategy.
**Example:** SPY at $500. Sell $480 put, buy $470 put (put spread), sell $520 call, buy $530 call (call spread), 30 DTE. Collect $3.00 total credit ($300). Max loss per side = $10 − $3.00 = $7.00. Breakeven: $477 on downside, $523 on upside.
**Management:** Close at 50% of max profit (collect $1.50). Roll or close if a short strike is breached.

---

### 9. Iron Butterfly
**Structure:** Sell ATM call + sell ATM put + buy OTM call + buy OTM put. Net credit. Both short strikes are the same (ATM).
**Outlook:** Strongly neutral; expects underlying to pin near current price.
**Risk/Reward:** Higher credit than iron condor; narrower profit zone.
**Example:** SPY at $500. Sell $500 call + $500 put, buy $520 call + $480 put, 30 DTE. Collect $8.00 credit. Max loss = $20 − $8.00 = $12.00. Profit zone = $492–$508.
**Best for:** Low-movement environments, mean-reverting underlyings, or as an earnings play hypothesis.

---

### 10. Long Straddle
**Structure:** Buy 1 ATM call + buy 1 ATM put, same strike/expiration. Net debit.
**Outlook:** Expects large move in either direction; direction unknown.
**Risk/Reward:** Max loss = total debit; unlimited upside on either side.
**Use when:** Anticipating high realized volatility exceeding current IV pricing. IVR < 30 is ideal.
**Example:** AMZN at $200 pre-earnings. Buy $200 call + $200 put, 7 DTE, for $12.00 total. Breakeven: $188 or $212. Profitable if AMZN moves more than $12 (6%) in either direction.
**Earnings play:** Only profitable if the actual move exceeds the implied move priced into the straddle. Research historical earnings moves vs. implied move.

---

### 11. Long Strangle
**Structure:** Buy 1 OTM call + buy 1 OTM put, different strikes, same expiration. Net debit.
**Outlook:** Expects very large move; cheaper than straddle but needs bigger move.
**Risk/Reward:** Cheaper entry; wider breakeven range needed.
**Example:** SPY at $500. Buy $515 call + $485 put, 30 DTE, for $4.00 total. Needs > 3.8% move to profit.
**vs. Straddle:** Strangle is cheaper but requires larger move; straddle profits from smaller moves but costs more.

---

### 12. Calendar Spread (Time Spread)
**Structure:** Sell near-term option + buy same-strike longer-dated option. Net debit.
**Outlook:** Neutral near-term; expects low near-term movement, higher long-term IV or movement.
**Risk/Reward:** Max gain occurs when stock pins at strike at front-month expiration; max loss = debit paid.
**Use when:** Low near-term IV expected; front-month IV is elevated relative to back-month.
**Example:** AAPL at $175. Sell $175 call, 30 DTE; buy $175 call, 60 DTE. Pay $1.50 net debit. Max profit if AAPL near $175 at 30-DTE expiration.

---

### 13. Diagonal Spread
**Structure:** Sell near-term OTM option + buy longer-dated different-strike option. Combination of calendar and vertical spread.
**Outlook:** Directional with time decay benefit.
**Use when:** Want covered call-like exposure without owning shares; or structured bull/bear position with time.
**Example (Poor Man's Covered Call):** Buy NVDA $800 call, 6 months out (LEAPS-like); sell $870 call, 30 DTE. Collect ongoing monthly premium against deep ITM long call.

---

### 14. LEAPS (Long-Term Equity Anticipation Securities)
**Definition:** Options with expirations greater than 1 year (typically 1-2 years out).
**Use cases:**
- Long-term bullish exposure with defined risk (replaces stock)
- "Poor Man's Covered Call" — buy deep ITM LEAPS, sell monthly OTM calls against it
- Lower capital requirement than shares; leveraged exposure with defined max loss

**Example:** MSFT at $420. Buy $380 call, Jan 2027 expiry (deep ITM, ~0.75 delta), for $65.00 ($6,500). Controls 100 shares for $6,500 vs. $42,000 to own shares. Delta exposure comparable to 75 shares.

**LEAPS Greeks:** High vega (sensitive to long-term IV), low theta (minimal daily decay at 500+ DTE), high rho in elevated rate environments.

**Risk:** Full premium at risk. Select strikes with 0.70+ delta to behave more like stock ownership.

---

## Earnings Plays — Special Considerations

**IV crush mechanics:** Earnings create IV spike pre-event. Post-announcement, IV collapses to normal levels within minutes. The magnitude of crush depends on historical vs. realized volatility.

**Implied move:** The ATM straddle price (front-month, closest to earnings expiration) divided by stock price approximates the market-implied earnings move. E.g., NFLX at $600 with $30 straddle = 5% implied move.

**Historical vs. implied:** Compare the implied move to the last 8 earnings moves. If the stock has historically moved 8% but the straddle implies 5%, buying premium (long straddle/strangle) has edge. If the stock typically moves 3% but market implies 6%, selling premium has edge.

**Selling premium into earnings:** Use short straddle, iron condor, or iron butterfly with post-earnings expiration. Collect elevated IV; close immediately after announcement. Risk: a gap beyond the wings destroys the trade.

**Buying premium into earnings:** Enter 5-14 days before event when IV is still building. Exit before earnings — collect the IV expansion without taking binary risk. This is the "vol expansion" play, not a directional bet.

---

## Managing Positions

### Winning Trades
- **Standard rule:** Close at 50% of max profit for credit spreads/iron condors. Captures bulk of theta decay with fraction of time remaining; frees up buying power; eliminates late-stage gamma risk.
- **Covered calls/CSPs:** Let expire if OTM (100% profit); close early if high profit achieved quickly.
- **Long options:** Take partial profits at 50-100% gain; let remainder run with house money.

### Losing Trades
- **Hard stop for credit spreads:** Close at 2x credit received (max loss = 2× premium collected). Prevents small losses becoming catastrophic.
- **Breached short strike:** Evaluate: is the move temporary (mean reversion candidate) or a trend break? Roll down/out for credit if trend is likely to stabilize.
- **Undefined risk short positions (naked puts/calls):** Close immediately if underlying moves through short strike — do not hold naked short options through continued adverse movement.

### Rolling Options
**Roll out:** Buy back current short, sell same strike in a future expiration. Extends duration; collects additional credit. Use when: position is near breakeven with limited time remaining.

**Roll down (calls) / up (puts):** Buy back current short strike, sell a closer-to-money strike in same or later expiration. Increases credit but narrows profit zone.

**Roll out-and-down/up:** Combined roll for credit. Adds duration and adjusts strike simultaneously. Use when: position is marginally tested and you have conviction the underlying will return to range.

**Rule for rolling:** Only roll for a net credit. Never roll for a debit unless explicitly increasing conviction on the trade.

---

## Common Mistakes

1. **Buying OTM calls/puts into high IV (earnings):** Paying maximum premium when IV crush will destroy extrinsic value even if direction is correct.
2. **Ignoring theta on long options:** Holding OTM long options through time decay without a catalyst is a guaranteed slow loss.
3. **Undefined risk on earnings:** Selling naked straddles/strangles into earnings without defined-risk wings. A single gap can wipe multiple months of premium collected.
4. **Over-sizing:** Options leverage is seductive. A 5% allocation to options positions is sufficient for most strategies. Never risk more than 2-3% of portfolio on a single speculative long option.
5. **Not closing winners:** Letting 50% winners ride to expiration exposes the position to gamma risk and reversal. The last 20% of profit is the most dangerous to capture.
6. **Confusing IV rank and IV percentile:** IVR uses only the high/low; IVP uses all daily observations. A low IVR can still have a high IVP if IV clustered near the bottom for most of the year.
7. **Ignoring liquidity:** Wide bid/ask spreads destroy edge. Require bid/ask spread < 10% of option midpoint. Avoid options on thinly traded underlyings.
8. **Assignment risk on short calls:** Deep ITM short calls near dividend dates carry early assignment risk. Monitor and roll or close before ex-dividend date.

---

## Quick Reference: Capital Requirements by Strategy

| Strategy | Capital Required | Defined Risk? | IV Preference |
|---|---|---|---|
| Long Call/Put | Premium only | Yes | Low IVR (<30) |
| Covered Call | 100 shares + margin | Yes (downside) | Any |
| Cash-Secured Put | Strike × 100 in cash | Yes (vs. short) | High IVR (>40) |
| Bull/Bear Spread | Debit only | Yes | Any |
| Iron Condor | Spread width × 100 − credit | Yes | High IVR (>50) |
| Iron Butterfly | Spread width × 100 − credit | Yes | High IVR (>50) |
| Long Straddle | Combined premium | Yes | Low IVR (<30) |
| Long Strangle | Combined premium | Yes | Low IVR (<30) |
| Calendar Spread | Net debit | Yes | Front-month IV elevated |
| LEAPS | Deep ITM premium | Yes | Any (favor low IV) |
| Naked Put | Full strike × 100 in margin | No | High IVR (>50) |

---

*Last updated: 2026-03-24. Reference document for AI analyst context injection.*
