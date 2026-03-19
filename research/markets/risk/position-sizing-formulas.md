# Position Sizing Formulas — Complete Reference

## The Core Formula

**Position Size = Dollar Risk ÷ Risk Per Share**

Where:
- Dollar Risk = Account Size × Risk Percentage (typically 1-2%)
- Risk Per Share = Entry Price − Stop Loss Price

---

## Worked Examples

### Example 1: Standard Stock Trade
- Account value: $100,000
- Risk per trade: 1% = $1,000
- Entry price: $50.00
- Stop loss: $47.50 (5% below entry, $2.50 away)
- Position size: $1,000 ÷ $2.50 = 400 shares
- Dollar value of position: 400 × $50 = $20,000 (20% of account)
- If stopped out: lose $1,000 (1% of account) ✓

### Example 2: Tight Stop Trade (Breakout Setup)
- Account value: $100,000
- Risk per trade: 2% = $2,000
- Entry: $100.00 (breakout entry)
- Stop: $98.50 (below breakout base, $1.50 away)
- Position size: $2,000 ÷ $1.50 = 1,333 shares
- Dollar value: 1,333 × $100 = $133,300 (133% of account — using margin)
- If stopped out: lose $2,000 (2%) ✓
- Note: Tight stop allows large position — this is why proper stops enable controlled position sizing

### Example 3: Wide Stop Trade (Swing off Support)
- Account value: $100,000
- Risk per trade: 1% = $1,000
- Entry: $200.00
- Stop: $185.00 ($15 away — wide stop at major support)
- Position size: $1,000 ÷ $15 = 67 shares
- Dollar value: 67 × $200 = $13,400 (13% of account)
- Wide stop forces small position size — system working correctly

### Example 4: Options Trade
- Account value: $100,000
- Risk per trade: 1% = $1,000 (maximum loss on this trade)
- Option premium: $2.50 per share = $250 per contract (100 shares)
- Maximum loss on this option: $250 per contract if it expires worthless
- Position size: $1,000 ÷ $250 = 4 contracts
- Total premium paid: 4 × $250 = $1,000
- If options expire worthless: lose $1,000 (1%) ✓

---

## The Kelly Criterion — Optimal Bet Sizing

The Kelly Criterion calculates the theoretically optimal percentage of your bankroll to risk on each trade to maximize long-term growth.

**Formula:** Kelly % = (Win Rate × Reward) − (Loss Rate × Risk) / Reward

**Example:**
- Win rate: 55% (0.55)
- Average winner: 2× the average loser (reward-to-risk = 2)
- Kelly % = (0.55 × 2) − (0.45 × 1) / 2 = (1.10 − 0.45) / 2 = 0.325 = 32.5%

**Important:** Full Kelly is far too aggressive for most traders — a bad streak can wipe you out. Professional traders typically use "half Kelly" or less. In the example above, half Kelly = 16.25%.

In practice, the 1-2% rule is effectively a very conservative fraction of Kelly for most typical trading setups, which is why it has proven so robust over decades.

---

## Scaling Into Positions

Rather than buying your full position at once, scale in as the trade proves itself:

### Three-Stage Entry (Tudor Jones Method)
1. **Probe (25-33% of planned position):** Enter a test position to see how the stock acts
2. **Add on confirmation (another 33-50%):** If the stock acts well and moves in your direction, add
3. **Full position (remainder):** Only when the trade is clearly working

**Benefit:** Your average entry price is better in hindsight — you buy more of the position when the trade is already working. Your risk on the initial probe is very small.

**Stop loss:** Placed based on the initial entry, recalculated as you add.

### Pyramiding Into a Winner
Add to winning positions as they move in your favor, but only in small increments. The size of each add should be smaller than the previous, so your average cost rises slowly.

**Livermore's rule:** Each add should be at a new high — the stock proving itself by making progress. Never add to a position that is going sideways or slightly down.

---

## Portfolio-Level Risk Management

### Total Correlated Exposure
Do not treat 5 correlated positions as 5 separate positions. If you are long 5 technology stocks, your real exposure is closer to one large technology position.

**Rule:** Never have more than 2-3 positions in the same sector or with strong correlation.

**Correlation test:** Do your positions tend to move up and down together? If yes, they are correlated and you need to count them as a single risk unit for portfolio heat calculations.

### The Portfolio Heat Calculation
Add up the maximum dollar loss across all open positions simultaneously. This is your portfolio heat.

- 3 positions each risking 2% = 6% portfolio heat ✓ (acceptable)
- 5 positions each risking 2% = 10% portfolio heat ✗ (too high)
- 3 correlated positions each risking 2% = effectively 6% in one direction ✗ (too concentrated)

### Scaling Down During Drawdowns
When your account is down more than a defined threshold, reduce size:

**Example drawdown protocol:**
- Account down 5%: Reduce position size by 25%
- Account down 10%: Reduce position size by 50%
- Account down 15%: Reduce position size by 75%
- Account down 20%: Stop trading, reassess strategy

This protocol prevents the worst outcomes. The deeper the hole, the smaller the shovel. Protect remaining capital above all else.

---

## Options-Specific Sizing

### The Defined Risk Rule
One advantage of buying options is defined maximum risk. You cannot lose more than the premium paid.

**Sizing approach:** Size so that the maximum loss (full premium) equals your 1-2% risk amount.

### Selling Options (Selling Premium)
When selling options, the theoretical loss is much larger than the premium received. Apply the same 1-2% rule but based on the maximum possible loss of the spread (if using spreads) or on the delta-adjusted stock position equivalent.

**Safer approach for sellers:** Use spreads (sell one option, buy another) to cap the maximum loss at a defined amount. Size the spread so the maximum loss equals 1-2% of account.

---

## DISCLAIMER
For educational purposes only. Not financial advice. Consult a qualified financial advisor before making investment decisions.
