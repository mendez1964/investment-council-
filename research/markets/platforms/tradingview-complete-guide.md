# TradingView — Complete Guide

## What TradingView Is
TradingView is the most popular charting platform in the world. Web-based (no download required) with mobile apps. Free tier available with limited features. Pro/Pro+/Premium tiers unlock more indicators, more alerts, more charts. Most traders use TradingView for charting even if they execute through a different broker.

Website: tradingview.com

---

## Getting Started — Basic Setup

### Chart Layout
When you open a chart:
- Search for any ticker in the search bar at top
- Click the timeframe (1D, 4H, 1H, 15, 5, 1) to change the time period
- The toolbar on the left has drawing tools (trend lines, horizontal lines, text, etc.)
- The toolbar at the top has layout options, indicators, and alerts

### Adding Indicators
Click **"Indicators"** in the top toolbar (or press "/" shortcut).
Type the indicator name and click to add it.
Key indicators to add immediately:
- **Volume:** Type "Volume" — add the basic volume histogram
- **VWAP:** Type "VWAP" — shows the Volume Weighted Average Price
- **EMA 9:** Type "EMA" → add → settings → change period to 9
- **EMA 20:** Add another EMA, change period to 20
- **SMA 50:** Type "SMA" → add → change period to 50
- **SMA 200:** Add another SMA → change period to 200
- **RSI:** Type "RSI" → standard 14 period
- **MACD:** Type "MACD" → standard 12,26,9

### Saving Indicator Templates
Once you have your preferred indicators set up:
Click **"Indicators"** → **"My scripts"** → Save your current indicator set as a template.
Apply the template to any new chart in one click.

---

## Chart Layouts for Different Trading Styles

### Swing Trading Daily Chart Setup
1. Set timeframe to **1D** (daily)
2. Add: 20 EMA (blue), 50 SMA (orange), 200 SMA (red)
3. Add: RSI (14) below the chart
4. Add: MACD (12,26,9) below RSI
5. Add: Volume histogram at the bottom
6. What you see at a glance: trend direction (MAs), momentum (RSI/MACD), volume confirmation

### Day Trading 5-Minute Setup
1. Set timeframe to **5** (5-minute)
2. Add: VWAP (anchored to today)
3. Add: 9 EMA
4. Add: 20 EMA
5. Add: Volume
6. Have a secondary chart open at **15 minutes** to see the bigger picture

### Scalping 1-Minute Setup
1. Set timeframe to **1** (1-minute)
2. Add: VWAP
3. Add: 9 EMA
4. Add: Volume with relative volume coloring
5. Have 5-minute reference chart open

---

## Multi-Chart Layout
Click the layout icon (top right — looks like a grid). Select how many charts to display simultaneously (2, 4, 6 charts).

**Linking charts:** Click the colored dot on each chart (top left of each panel) and set them all to the same color. When you change the ticker on one linked chart, all linked charts change to the same ticker — but maintain their own timeframes.

---

## The Screener

Click **"Screener"** at the very bottom of the screen.

### Setting Up a Momentum Scanner
Click **"Stock Screener"** then **"Filters"**:
1. Country: United States
2. Exchange: NYSE, NASDAQ
3. Market Cap: Mid cap and above (over $2B)
4. Price: Over $10
5. Average Volume: Over 1M
6. Change %: Over 3% (stocks moving today)
7. Relative Volume: Over 1.5 (volume above average)

Click **"Add Column"** to add RSI, MACD, EMA position to your results.

### Setting Up a Breakout Scanner
1. Price greater than 52W High × 0.97 (within 3% of 52-week high)
2. Volume greater than Average Volume
3. RSI greater than 50
4. Price above 50 SMA
Click column headers to sort by volume or performance.

### Saving Scanners
Click the bookmark icon next to your scanner filters to save for reuse.

---

## Alerts

Setting alerts on TradingView is one of its most powerful features.

### Price Alert
Right-click on a price level on the chart → **"Add Alert"**. Set the condition (crosses, moves above/below). Choose notification method (popup, email, SMS, app push notification, webhook).

### Moving Average Alert
Click on a moving average line on the chart → right-click → **"Add Alert on MA"**. Alert fires when price crosses the MA.

### Indicator Alert
With RSI visible: right-click on the RSI → **"Add Alert on RSI"**. Set condition (RSI crosses below 30, crosses above 70, etc.).

### Webhook Alerts
For advanced users: Webhooks allow TradingView alerts to trigger external systems. You can pipe alerts into Discord, Slack, or custom applications.

---

## Drawing Tools

**Horizontal line (most used):** Press "H" shortcut or click the horizontal line tool. Click on a price level to draw support/resistance.

**Trend line:** Press "L" shortcut. Click two points to draw.

**Fibonacci retracement:** In the left toolbar, find the Fibonacci tools. Click the swing low, then the swing high. Levels appear automatically.

**Save drawings:** Your drawings auto-save to your TradingView account and appear on any device.

---

## Bar Replay (Chart Practice)
Click the **"Bar Replay"** button in the top toolbar (looks like a play button near the date range).

Navigate to any historical date. Press play to watch the chart unfold bar by bar. Practice reading price action, spotting setups, and seeing how they resolved — without risking real money.

This is one of the most valuable practice tools available for free.

---

## Pine Script — Writing Custom Indicators
Pine Script is TradingView's built-in programming language. Even basic knowledge lets you customize or create indicators.

To access: Click **"Pine Editor"** at the bottom of the screen.

**Simple custom indicator example — RSI with levels:**
```pinescript
//@version=5
indicator("RSI Custom", overlay=false)
rsiValue = ta.rsi(close, 14)
plot(rsiValue, color=color.blue)
hline(70, "Overbought", color=color.red)
hline(30, "Oversold", color=color.green)
hline(50, "Middle", color=color.gray, linestyle=hline.style_dashed)
```

**Best community Pine Script indicators to add (search in Indicators → Community Scripts):**
- "Squeeze Momentum Indicator" by LazyBear
- "Supertrend" for trend direction
- "Volume Profile" for volume-at-price analysis
- "Smart Money Concepts" for institutional order block detection
- "Market Cipher B" for momentum analysis

---

## DISCLAIMER
This guide is for educational purposes only. Not financial advice. Consult a qualified financial advisor before making investment decisions.
