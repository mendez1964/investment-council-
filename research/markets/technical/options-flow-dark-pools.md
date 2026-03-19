# Options Flow and Dark Pools — Complete Reference

## Why Options Flow Matters
Options are derivative contracts — they derive their value from an underlying stock, index, or asset. Large options trades often reveal what sophisticated institutional traders expect to happen before the price move occurs. Because options are leveraged, a trader who truly believes a stock is about to move significantly will often express that conviction in the options market rather than the stock market — getting more leverage for their capital.

---

## Reading the Options Chain

### Basic Structure
The options chain displays all available contracts for a stock, organized by:
- **Expiration date:** When the contract expires
- **Strike price:** The price at which the option gives the right to buy (call) or sell (put)
- **Bid/Ask:** The prices you can trade the contract
- **Volume:** How many contracts traded today
- **Open Interest (OI):** How many contracts are currently outstanding

### The Greeks — Plain English Explanations

**Delta:** How much the option price moves for every $1 the stock moves.
- Call with 0.50 delta: Option gains $0.50 when stock rises $1
- Delta of 1.0: Moves dollar-for-dollar with the stock (deep in-the-money)
- Delta of 0.10: Barely moves relative to the stock (far out-of-the-money)
- Delta as probability: A 0.30 delta option implies approximately 30% probability of expiring in-the-money

**Gamma:** How fast delta changes when the stock moves. High gamma means your delta changes quickly — the option accelerates as you approach expiration and the stock moves in your direction. Gamma is highest for at-the-money options near expiration.

**Theta:** Time decay — how much the option loses in value each day just from the passage of time. Options are wasting assets. A theta of -0.05 means the option loses $0.05 in value every day, all else equal. Time decay accelerates dramatically in the final weeks before expiration. Theta is the enemy of option buyers and the friend of option sellers.

**Vega:** How much the option price moves for every 1% change in implied volatility. High vega = option is very sensitive to IV changes. Vega is highest for longer-dated options. If you buy options when IV is high and IV then falls, you lose money even if the stock moves in your direction (this is IV crush).

**Implied Volatility (IV):** The market's expectation of how much the stock will move. Expressed as annualized percentage. High IV = expensive options. Low IV = cheap options. IV is driven by demand for options — when traders expect big moves (earnings, FDA approvals, court decisions), they buy options, driving IV higher.

### IV Percentile and IV Rank
**IV Rank:** Where current IV sits relative to the past year's IV range. IV Rank of 80 means current IV is higher than 80% of the past year's readings. High IV Rank = consider selling premium. Low IV Rank = consider buying premium.

**IV Crush after Earnings:** IV spikes before earnings (anticipation of a move). After earnings are released, uncertainty resolves and IV collapses — often 40-60%. This crush can cause options to lose value even when the stock moves in the right direction. This is the most common surprise for new options traders.

---

## Unusual Options Activity — The Signal

### What Constitutes "Unusual"
Options activity is considered unusual when:
- Volume is significantly higher than open interest — new positions being created, not just existing positions trading
- The trade is sweeping multiple exchanges — a large buyer is being aggressive, taking every available contract
- The trade is in out-of-the-money strikes — directional conviction, not just hedging
- Short-dated expiration — expecting a move soon, not just hedging a long-term position
- Premium paid is large — the buyer is putting real money behind the conviction

### High Conviction Bullish Signal
- Large out-of-the-money call sweep (multiple exchanges)
- Expiration 2-6 weeks out
- Total premium paid is significant ($500K+)
- Stock is near a technical breakout point or about to have a catalyst
- Volume is 5-10x open interest (brand new position, not an existing one)

### High Conviction Bearish Signal
- Large out-of-the-money put sweep
- Unusual size relative to average daily volume
- Short expiration showing urgency
- Stock showing technical weakness already
- Sometimes placed ahead of bad news (occasionally involves information concerns)

### Hedging vs. Directional
Not all large options trades are directional bets. Some are hedges:
- A fund that owns millions of shares of Apple may buy puts to protect the position
- Large put buying in an ETF often represents portfolio insurance, not a bearish bet

**How to distinguish:** A hedge tends to be in longer-dated, closer-to-the-money options. A directional bet tends to be in shorter-dated, out-of-the-money options. Look for the context.

---

## Put/Call Ratio as Sentiment Indicator

**What it is:** Total put volume divided by total call volume. Above 1.0 means more puts trading than calls (bearish sentiment). Below 1.0 means more calls than puts (bullish sentiment).

**Using it as a contrarian indicator:**
- Put/call ratio above 1.3-1.5: Extreme fear. Most people bearish = contrarian buy signal
- Put/call ratio below 0.6: Extreme greed. Most people bullish = contrarian sell signal

**The CBOE Equity-Only Put/Call Ratio** strips out index options (which are often used for hedging and distort the signal) and focuses only on equity options — the most reliable version.

---

## Options Expiration and Gamma Squeeze

### Max Pain Theory
"Max pain" is the strike price where the most options expire worthless — where option sellers (typically market makers) profit the most. The theory suggests price gravitates toward max pain near expiration as market makers hedge their books.

**Using max pain:** Calculate max pain using online tools. In the week before expiration, if the stock is well above max pain, there may be selling pressure pulling it down. Well below max pain, there may be buying pressure. Not reliable in volatile markets but can add context.

### Gamma Squeeze Mechanics
When a stock rises and call options go in-the-money, market makers who sold those calls must buy the stock to hedge their exposure (delta hedging). This buying pushes the stock higher. As the stock rises more, more options go in-the-money, requiring more hedging, which pushes the stock even higher. This self-reinforcing buying is a gamma squeeze.

**The mechanics:**
1. Stock starts rising (catalyst or momentum)
2. Call buyers flood in, driving up call options volume
3. Market makers sell those calls and must buy the underlying to hedge
4. Hedging buying pushes the stock higher
5. More calls go in-the-money, requiring more hedging
6. Explosive upward move ensues (GameStop 2021 was the extreme example)

**Identifying potential gamma squeezes:** Large call open interest at strikes above current price. IV rising as stock approaches those strikes. Short interest still high (shorts also buying to cover as prices rise). These conditions create a powder keg.

---

## Options Flow Tools

**Free Options Flow:**
- Barchart.com (Options → Unusual Options Activity): Shows volume/OI ratio, expiration, strike, and type. Good free starting point.
- Market Chameleon: IV analysis and unusual activity

**Paid Options Flow (Most Useful):**
- Unusual Whales ($50/month): Real-time flow, dark pool prints, Congress trading tracker, alerts
- Flow Algo (~$100/month): Real-time sweeps with sentiment scoring, dark pool integration
- Cheddar Flow: Flow with sentiment analysis

---

## Dark Pools Integration

Large dark pool prints combined with options flow creates the highest-conviction signals.

**The setup:**
1. Dark pool print shows institutional buyer at $50
2. Options flow shows large out-of-the-money calls purchased at $55 and $60 strikes
3. Stock is currently trading at $51
4. Interpretation: The same institutional player bought stock in the dark pool AND bought calls — they expect significant upside. High conviction.

When dark pool buying and unusual call flow align in the same stock at the same time — this is the smart money expressing maximum conviction.

---

## DISCLAIMER
For educational purposes only. Not financial advice. Consult a qualified financial advisor before making investment decisions.
