# Order Flow and Market Microstructure — Complete Reference

## What Order Flow Is
Order flow is the actual buying and selling happening in the market at the moment you are watching. It is not the result of that activity (price) — it is the activity itself. Understanding order flow means reading *why* price is moving, not just *that* it is moving.

---

## Market Basics: Bid, Ask, and the Spread

**Bid:** The highest price a buyer is willing to pay right now.
**Ask (Offer):** The lowest price a seller is willing to accept right now.
**Spread:** The difference between bid and ask. This is your cost to enter a trade.

**Market orders:** Execute immediately at the best available price. Buyers hit the ask (pay more). Sellers hit the bid (accept less). Market orders move the price.

**Limit orders:** Sit on the order book waiting. Buyers post bids below the ask. Sellers post offers above the bid. Limit orders provide liquidity.

**The key principle:** Aggressive market orders cause price movement. Passive limit orders absorb the movement. Understanding which force is winning tells you the direction of least resistance.

---

## Level 2 / Order Book

The order book shows all pending limit orders at each price level — how many shares are waiting to be bought at each price below the market, and how many waiting to be sold at each price above.

**What to look for:**
- **Large bids:** A big order sitting at a price below the market is support — it must be hit and absorbed before price can fall through that level.
- **Large asks:** A big order sitting above the market is resistance — it must be absorbed before price can rise through.
- **Stacking:** When multiple large orders appear at the same price level, that level becomes very strong.
- **Order book imbalance:** When there are significantly more shares bid than offered, buyers outnumber sellers — price is likely to rise. More shares offered than bid — sellers dominate.

**Iceberg orders:** Large institutional orders often hide their real size. Only a small portion shows in the order book; as that portion is filled, more appears. You see a 1,000-share bid but it has been absorbing 10,000 shares — the real size is hidden. Watch for bids or asks that keep refreshing after being hit.

---

## Time and Sales (The Tape)

The time and sales window shows every trade as it executes — time, price, size, and which side was the aggressor (buyer or seller).

**Reading the tape for momentum:**
- Rapid succession of large prints at the ask: buyers are aggressive, price likely to rise
- Large prints at the bid: sellers are aggressive, price likely to fall
- A mix with no clear dominance: chop, wait for clarity

**Tape acceleration:** When the pace of trades suddenly increases dramatically, a big player has entered with a market order. The direction of that acceleration — hitting bids or lifting asks — tells you which way they are positioned.

**Price acting right vs wrong (Livermore concept):** If news comes out that should cause a rally and the tape shows immediate selling — price is not acting right. Institutional sellers are using the news to distribute. This is bearish.

---

## Smart Money Concepts (SMC)

Developed from Inner Circle Trader (ICT) methodology. The premise: institutional "smart money" leaves predictable footprints in price action that reveal where they are buying and selling.

### Break of Structure (BOS)
When price breaks a previous significant high (in an uptrend) or significant low (in a downtrend), it is a Break of Structure — confirming the current trend is continuing.

**Trading implication:** A BOS is confirmation that smart money is continuing to push price in that direction. Trade in the direction of the BOS.

### Change of Character (CHOCH)
When price breaks a significant low during what appeared to be an uptrend (or breaks a significant high during a downtrend) — the character of the market has changed. This is the signal that the trend may be reversing.

**Trading implication:** After a CHOCH, stop looking for trend-continuation trades and start looking for reversal entries.

### Order Blocks
The last bearish candle (or group of candles) before a significant bullish move, or the last bullish candle before a significant bearish move. These are areas where smart money placed large orders.

**Bullish order block:** The zone (usually the body range of the last bearish candle before a sharp rally) where institutional buyers placed buy orders. When price returns to this zone, they often buy again — creating support.

**Bearish order block:** The zone of the last bullish candle before a sharp decline. When price returns here, institutional sellers re-emerge.

**Trading implication:** Mark order blocks on your chart. When price returns to them from above (bullish OB acting as support) or below (bearish OB acting as resistance), look for entry setups.

### Fair Value Gaps (FVG)
When price moves so fast that a gap is created where no actual trading occurred — three-candle pattern where the wicks of candle 1 and candle 3 do not overlap. This creates an inefficiency — the market will often return to "fill" this gap.

**Bullish FVG:** Gap created during a rapid upward move. The zone between candle 1's high and candle 3's low is the gap. Price often returns here before continuing upward.

**Bearish FVG:** Gap created during a rapid downward move. Price often returns to fill this gap before continuing downward.

**Trading implication:** FVGs are like magnets — price is drawn back to fill them. When price trades in the direction opposite the FVG, the gap is often the first target.

### Inducement and Stop Hunts
Smart money knows where retail traders place their stops — just above resistance levels (retail shorts) and just below support levels (retail longs). They will often push price just beyond these obvious levels to trigger the stops, collect the liquidity, and then reverse in their intended direction.

**Identifying stop hunts:**
- Price spikes just beyond a key level on high volume
- Immediately reverses with equal or greater force
- Often creates a wick on the candle

**Trading implication:** Do not place stops at the most obvious levels. Place them beyond the obvious level to avoid being hunted. Alternatively, use stop hunts as entry opportunities — enter in the opposite direction after the spike and reversal.

### Liquidity Pools
Price gravitates toward areas where large numbers of stop orders are clustered. These pools of liquidity are found:
- Just above previous highs (where short sellers placed stops)
- Just below previous lows (where long buyers placed stops)
- At round numbers
- At equal highs or lows (double top/bottom levels)

**Trading implication:** When price is approaching an obvious liquidity pool, the move toward it may be smart money seeking that liquidity before reversing.

---

## Footprint Charts and Delta

**Footprint charts:** Show the volume traded at each specific price level within each candle. You can see exactly how many shares traded at each tick — and whether buyers or sellers were the aggressor at each price.

**Delta:** The difference between buying volume and selling volume. Positive delta = net buying. Negative delta = net selling.

**Delta divergence:** When price makes a new high but delta is falling (less net buying), buying pressure is weakening. Bearish signal. When price makes a new low but delta is rising (less net selling), selling pressure is weakening. Bullish signal.

**Absorption:** When large sell orders appear at a price but delta remains positive (buyers are absorbing all the selling). This suggests a large buyer is present and the level will hold.

---

## Dark Pools and Block Trades

**Dark pools:** Private trading venues where large institutions (mutual funds, pension funds, hedge funds) trade large blocks of stock away from public exchanges. Approximately 35-45% of all US equity volume trades in dark pools.

**Why they exist:** If a fund wants to buy 5 million shares of a stock, posting that order on a public exchange would immediately move the price against them. Dark pools allow them to find a counterparty without telegraphing their intent.

**How dark pool prints affect price:**
- A large dark pool print at a specific price suggests institutional interest at that level
- That price often becomes future support (if a buyer) or resistance (if a seller)
- Multiple dark pool prints in a tight range indicate strong institutional positioning

**Where to find dark pool data:**
- Unusual Whales (unusualwhales.com)
- Squawk.net for real-time audio alerts
- FINRA ATS transparency data (delayed, free)

**Practical use:** When you see a large dark pool print at a price below the current market and price subsequently pulls back to that level — that level has strong institutional support. Trade the bounce.

---

## DISCLAIMER
For educational purposes only. Not financial advice. Consult a qualified financial advisor before making investment decisions.
