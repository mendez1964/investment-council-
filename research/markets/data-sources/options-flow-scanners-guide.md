# Options Flow Scanners — Complete Guide

## Free Options Flow Tools

### Barchart.com — Best Free Source
**URL:** barchart.com

**How to access unusual options activity:**
1. Go to barchart.com
2. Click **"Options"** in the top navigation
3. Click **"Unusual Options Activity"**

**What you see:**
Each row shows a trade with: Symbol, Expiration, Strike, Call/Put, Volume, Open Interest, Volume/OI ratio, and the implied volatility.

**What to look for:**
- **Volume/OI ratio above 3-5x:** New positions being initiated (not existing ones trading)
- **Short expiration (1-4 weeks):** Directional conviction, not just hedging
- **Out-of-the-money strikes:** Directional bet, not just protection
- **Call sweeps:** Bullish bets
- **Put sweeps:** Bearish bets

**How to filter:**
Use the dropdowns to filter by: Calls only / Puts only, minimum premium, minimum volume, specific expiration ranges.

**Free limitation:** Not real-time. Slight delay. Does not show which exchange the trade went through. Still very useful for end-of-day review.

---

### Market Chameleon
**URL:** marketchameleon.com

**Best for:**
- Implied volatility analysis and history
- Earnings IV analysis (shows expected move for upcoming earnings)
- Historical unusual options activity

**How to use:**
Search any ticker → click **"Options"** tab → see IV history, IV rank, unusual volume.

The **IV Rank** displayed is one of the most useful free data points — tells you if current options are cheap or expensive relative to the past year.

---

## Paid Options Flow Services

### Unusual Whales — Best Value (~$50/month)
**URL:** unusualwhales.com

**What you get:**
- Real-time options flow feed (updated as trades happen)
- Dark pool prints feed
- Congress trading tracker (politicians' stock trades)
- Custom alerts for specific tickers
- Flow by ticker showing historical unusual activity
- Sentiment indicators derived from flow

**How to read the flow feed:**
Each entry shows: Ticker, type (Call/Put), strike, expiration, premium paid, whether it was a sweep (aggressive multi-exchange buy), and the underlying stock price at time of trade.

**Red flags for high conviction:**
- "Sweep" designation: Buyer was aggressive, hitting multiple exchanges
- OTM (out-of-the-money) strike: Directional bet
- Short expiration: Urgency
- Large premium: Real money behind the conviction
- Repeat sweeps in same ticker same day: Very high conviction

**Setting alerts:**
Log in → search your watchlist tickers → click the bell icon to get notified when unusual activity occurs in that ticker.

---

### Flow Algo (~$100/month)
**URL:** flowalgo.com

**What you get:**
- Real-time options sweeps with exchange routing detail
- Dark pool integration
- Sector flow analysis (which sectors are seeing most unusual activity)
- Historical backtest of flow signals

**Differentiator:** Shows which specific exchanges the sweep went through — a sweep hitting 5 exchanges is more aggressive than one hitting only 2.

---

## How to Interpret Options Flow Signals

### A Bullish Signal Checklist
All of the following increase conviction:
- Call sweep (hitting multiple exchanges)
- Out-of-the-money strikes (say, +10-15% above current stock price)
- Expiration 2-6 weeks out (urgency + time for thesis to play out)
- Premium paid is significant (over $200K in single trade = institutional)
- Volume is 5-10x or more vs open interest (new position)
- Stock is near a technical breakout
- Multiple sweeps in same direction same day

### A Bearish Signal Checklist
- Put sweep
- Out-of-the-money puts (below current stock price)
- Short expiration
- Large premium relative to ticker's normal options volume
- Stock showing technical weakness already

### What to Ignore
- Single small options purchase (could be anyone)
- Far out-of-the-money, very cheap options in large quantities (often retail lottery tickets)
- Deep in-the-money options with large premium (often delta hedging, not directional)
- Put buying in ETFs like SPY, QQQ by large institutions (almost always portfolio hedging, not bearish bets)

---

## Combining Options Flow with Technical Analysis

The most powerful signals occur when options flow and technical analysis align:

**Scenario 1: Breakout Confirmation**
Stock forms a multi-week consolidation base → large call sweep appears → stock breaks out on volume
→ High conviction breakout with smart money confirmation

**Scenario 2: Support Defense**
Stock pulls back to key support → large call sweep or put selling occurs → stock bounces
→ Institutional buyers stepping in at support — strong buy signal

**Scenario 3: Warning Before Breakdown**
Stock at all-time highs, looks healthy → large put sweep appears → stock begins to roll over
→ Someone knows something — reduce or exit longs

**The combined workflow:**
1. Use TradingView to identify your technical setups
2. Before entering, check Barchart or Unusual Whales for that ticker's recent options flow
3. If flow aligns with your technical thesis → higher conviction, potentially larger position
4. If flow contradicts your technical thesis → wait, reassess, or reduce size

---

## DISCLAIMER
For educational purposes only. Not financial advice. Consult a qualified financial advisor before making investment decisions.
