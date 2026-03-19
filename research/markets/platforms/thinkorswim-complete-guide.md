# Thinkorswim (TD Ameritrade / Schwab) — Complete Guide

## What Thinkorswim Is
Thinkorswim (TOS) is the most powerful retail trading platform available. Originally TD Ameritrade, now owned by Charles Schwab. Free to use with a Schwab/TDA brokerage account. Best features: options analysis tools, the Scan tab (most powerful scanner in retail), paper trading with live data, and excellent Level 2 data.

Download at: schwab.com/thinkorswim

---

## The Options Chain — TOS's Greatest Strength

### Accessing the Options Chain
Click the **"Trade"** tab at the top.
Search for your ticker.
The options chain appears below the stock quote.

### Reading the Chain Columns
Default view shows: Bid, Ask, Last, Volume, Open Interest, and Greeks for each strike.

**To add more columns:** Right-click on a column header → **"Customize"**:
- Add **IV% (Implied Volatility)** for each strike
- Add **Prob ITM (Probability In The Money)** — shows estimated probability that the option expires in the money
- Add **Delta, Gamma, Theta, Vega** for Greeks

### Identifying Unusual Options Activity in TOS
TOS does not have a built-in real-time unusual options scanner, but you can:

1. Go to any stock's options chain
2. Sort by Volume column (click the header)
3. Compare Volume to Open Interest — if Volume > OI, new positions are being built
4. Look for strikes with volume 5-10x or more above OI

For real-time unusual options scanning, use Barchart.com or Unusual Whales alongside TOS.

---

## The Scan Tab — Most Powerful Feature

### Accessing the Scanner
Click the **"Scan"** tab at the top of TOS.

### Stock Hacker
The Stock Hacker lets you build custom scans with any combination of technical and fundamental criteria.

**How to build a scan:**
1. Click **"Stock Hacker"**
2. Click **"Add Study Filter"** to add technical conditions
3. Click **"Add Fundamental Filter"** to add fundamental conditions
4. Click **"Scan"** when ready
5. Right-click any result to pull up the chart

### Pre-Built Scans to Set Up Immediately

**High Volume Momentum Scan:**
- Study filter: Volume > 1,000,000 (today's volume)
- Study filter: Close > 50-day MA (above 50 SMA)
- Fundamental filter: Last >= 10 (price above $10)
- Study filter: Relative Volume > 1.5

**How to add this in TOS:**
Click "Add Study Filter" → Find Volume → Set to "is greater than" 1,000,000
Click "Add Study Filter" → Type "SimpleMovingAvg" → "Close is greater than SimpleMovingAvg"
Click "Add Fundamental Filter" → "Last" → "is greater than or equal to" 10

**Earnings Tomorrow Scan:**
- Fundamental filter: "Earnings Date is in next 1 days"
Combine with volume and price filters to narrow.

**Stocks Crossing Above 200 SMA:**
- Study filter: Close crossed above SimpleMovingAvg(200)
This fires the day it crosses — very powerful signal scan.

**Saving Scans:**
Click the disk/save icon next to the scan. Name it. Access from saved scans dropdown.

---

## Level 2 Quotes in TOS

### Setting Up Level 2
1. Right-click anywhere on the main quotes screen
2. Select **"Add Column"** → **"Level II"**
Or: Pull up an individual stock → right-click → **"Add Level II"**

### Reading Level 2
Left side (green): All buyers and their bid prices, sorted highest to lowest
Right side (red): All sellers and their ask prices, sorted lowest to highest

**What to look for:**
- Large bid at a key price: A buyer is defending that level
- Large ask at a key price: A seller is working that offer
- Refreshing bid/offer: Hidden size (iceberg) — keeps refilling as it gets hit
- Bid/ask spread: Wider spread = less liquid, more expensive to trade

### Time and Sales (The Tape)
Right-click on the chart → **"Add Time & Sales"**

Shows every trade as it executes:
- Green prints: At the ask (buyer aggressive)
- Red prints: At the bid (seller aggressive)
- White/gray prints: In between (negotiated)

**Reading for momentum:** All-green tape with large prints = aggressive buyers. Mixed tape = balanced. All-red with large prints = aggressive sellers.

---

## Paper Trading Mode

### Setting Up Paper Trading
In TOS, there is a **"paperMoney"** button in the top right corner. Click it to switch to the simulated trading environment. Uses real-time market data but no real money.

Paper trading in TOS is superior to most paper trading platforms because:
- Uses real live market data
- Options quotes are real
- You practice actual order entry in the same interface you will use for real trading
- Performance is tracked with the same analytics as real trades

**Use paper trading for:**
- Testing new strategies before risking real money
- Practicing options trades to understand how they behave
- Getting comfortable with order entry before going live
- Testing scanner-identified setups to see how they perform

---

## ThinkScript — Custom Studies

ThinkScript is TOS's built-in programming language for custom indicators.

**Simple price alert example:**
```thinkscript
# Alert when RSI crosses below 30
def r = RSI(length = 14);
alert(r crosses below 30, "RSI Oversold", Alert.BAR, Sound.Bell);
```

To access ThinkScript editor: Click "Studies" → "Edit Studies" → select any study → click its gear icon → "Edit" tab to see the code.

---

## Options Analysis Tools

### Risk Profile (Most Important)
Before placing any options trade, use the Risk Profile tool to visualize:
- Your P&L at expiration at every possible price
- Your P&L today (not just at expiration)
- The break-even prices
- How Greeks affect the position

**How to access:** Click **"Analyze"** tab → **"Risk Profile"**
Add your intended option position and TOS shows you exactly how it performs at any stock price on any date.

### Probability Analysis
In the options chain, the **Prob ITM** column shows the market's estimated probability that each option will be in-the-money at expiration. This is derived from delta but displayed as a percentage — more intuitive.

**Decision tool:** A 15% probability ITM option (far OTM) has 85% probability of expiring worthless. If you pay $0.50 for it, you are paying for a 15% shot at a large gain. Is the risk-reward right? The probability column helps answer that.

---

## DISCLAIMER
For educational purposes only. Not financial advice. Consult a qualified financial advisor before making investment decisions.
