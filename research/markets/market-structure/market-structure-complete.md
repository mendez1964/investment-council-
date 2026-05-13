# Market Structure & Market Microstructure
## A Comprehensive Reference for AI Investment Research

---

## 1. How Exchanges Work

### NYSE vs NASDAQ Mechanics

The **New York Stock Exchange (NYSE)** operates as an auction market with a physical trading floor. It uses a designated market maker (DMM) model — each listed stock is assigned to a single DMM firm (e.g., Citadel Securities, Virtu Financial) that is obligated to maintain a fair and orderly market. DMMs post continuous two-sided quotes, facilitate price discovery at the open and close, and can use their own capital to absorb order imbalances.

**NASDAQ** is an electronic dealer market with no physical floor. Multiple competing market makers post simultaneous bids and offers in every listed stock. There is no single designated intermediary — instead, price discovery emerges from the competition among dozens of market makers and ECNs (Electronic Communication Networks). NASDAQ tends to list technology, biotech, and high-growth companies; NYSE tends to list large industrials, financials, and blue chips.

**Key mechanical differences:**
- NYSE open/close: DMMs conduct an opening and closing auction, matching all queued orders at a single price. This is why MOO (Market-on-Open) and MOC (Market-on-Close) orders are powerful on NYSE.
- NASDAQ open/close: Handled by the NASDAQ Opening and Closing Cross — a purely algorithmic auction with no human intervention.
- Price improvement: NYSE's auction model can provide better price improvement for retail orders; NASDAQ's competitive maker model often achieves tight spreads intraday.

### Specialists vs Market Makers

The legacy **specialist** system on NYSE assigned one firm per stock with a monopoly on order flow and an obligation to stabilize prices. Post-decimalization and Reg NMS reforms largely replaced specialists with the current DMM model, which retains the obligation component but added competitive pressure.

**Market makers** (NASDAQ model) operate under no single-stock obligation. They compete for order flow by posting tight spreads and earning the bid-ask spread as compensation for providing liquidity. Market makers include banks (Goldman Sachs), dedicated firms (Virtu, Citadel Securities, Jane Street), and broker internalization desks.

### Order Routing

When a retail trader submits an order, it travels through a chain: broker → smart order router → execution venue. Under **RegNMS's Order Protection Rule**, brokers must route to the venue displaying the best available price (National Best Bid and Offer, or NBBO). In practice, most retail order flow is sold to wholesalers (see Payment for Order Flow), who execute against their own inventory and claim price improvement over the NBBO.

---

## 2. Order Types In Depth

**Market Order:** Executes immediately at the best available price. Use when speed of execution outweighs price certainty. Dangerous in illiquid stocks or during high volatility — the fill price can deviate significantly from the last traded price.

**Limit Order:** Executes only at the specified price or better. Buy limits execute at or below your price; sell limits at or above. Limit orders add liquidity to the book and typically receive rebates on maker-taker exchanges. Use when price matters more than speed.

**Stop Order (Stop-Loss):** Becomes a market order once the stop price is triggered. A sell stop at $50 becomes a market sell if the stock trades at $50. Susceptible to slippage — in a fast-moving market, the fill can be far below the stop price. Not a guaranteed exit.

**Stop-Limit Order:** Becomes a limit order (not a market order) when triggered. Provides price protection but risks non-execution — if the market gaps through your limit price, the order sits unfilled while the loss grows.

**Trailing Stop:** Stop price tracks the market price by a fixed amount or percentage. As the stock rises, the stop rises with it; if the stock reverses, the stop holds and triggers. Useful for locking in gains without micromanaging exits.

**MOO (Market-on-Open):** Executes at the opening auction price. Useful for strategies that require participation at the official open price — earnings plays, index rebalancing, gap strategies. No price guarantee; you receive whatever the auction clears at.

**MOC (Market-on-Close):** Executes at the official closing auction price. Heavily used by index funds and institutional desks managing benchmark tracking error. The closing auction typically has the highest single-minute volume of the day.

**Iceberg Orders (Reserve Orders):** A large order where only a portion (the "tip") is visible on the order book; as each visible tranche fills, a new tranche replenishes automatically. Institutions use icebergs to conceal true order size and prevent the market from front-running a large position. Detectable by watching Level 2 for orders that repeatedly replenish at the same price level.

---

## 3. Bid-Ask Spread Mechanics

The **bid** is the highest price a buyer is willing to pay; the **ask** (or offer) is the lowest price a seller will accept. The spread is the difference. A market maker simultaneously posts both sides and profits by buying at the bid and selling at the ask.

**What creates the spread:**
- **Inventory risk:** The market maker holds positions that can move against them. Wider spreads in volatile stocks compensate for this risk.
- **Adverse selection risk:** The market maker fears trading against someone with superior information (e.g., an insider or an algorithm with edge). Spreads widen when information asymmetry is high — around earnings, news events, or in thinly traded names.
- **Order processing costs:** Exchange fees, clearing costs, technology infrastructure.

**Spread as a trading cost:** For a retail trader, the spread is an immediate, invisible transaction cost. Buying at the ask and selling at the bid means starting each trade in a small loss. In a stock with a $0.05 spread and a $50 price, each round-trip costs 10 basis points before commissions. Frequent trading in wide-spread names compounds this cost substantially.

---

## 4. High-Frequency Trading (HFT)

HFT firms use co-located servers (physically adjacent to exchange matching engines), fiber optic and microwave networks, and algorithms that execute in microseconds. HFT broadly falls into two categories:

**Market-making HFT:** Firms like Virtu and Citadel Securities post bids and offers across thousands of stocks simultaneously, capturing the spread while hedging inventory risk. This activity compresses spreads and provides liquidity — generally beneficial to retail traders. Virtu famously disclosed losing money on only one trading day in four-plus years, illustrating how statistical edge compounds over millions of trades.

**Latency arbitrage (predatory HFT):** Exploiting speed advantages to detect stale quotes across venues and trade against them before they update. Example: a large sell order hits NYSE and moves the price; the HFT firm's algorithm detects this in microseconds and sells on NASDAQ before the NYSE price update propagates. This extracts value from institutional orders. IEX Exchange was designed to combat this via a 350-microsecond "speed bump."

**Impact on retail traders:** Retail order flow is typically not the direct target of predatory HFT — the latency gap is too large and retail orders are routed through wholesalers who internalize them. Institutional block trades are the primary victims of latency arbitrage. Retail traders benefit from tight spreads (HFT market making) but lose indirectly when institutional costs rise.

---

## 5. Payment for Order Flow (PFOF)

PFOF is the practice of retail brokers (Robinhood, E*TRADE, TD Ameritrade) receiving compensation from wholesalers (Citadel Securities, Virtu, Susquehanna) in exchange for routing retail orders to them for execution.

**Mechanics:** Retail order arrives at broker → broker sells the order to a wholesaler → wholesaler executes against its own inventory, typically providing slight price improvement over the NBBO → wholesaler profits from internalizing the spread minus the price improvement given → broker receives a per-share or per-order payment.

**The Robinhood/Citadel relationship:** Citadel Securities is Robinhood's largest order flow purchaser, representing a significant portion of Robinhood's revenue. Citadel pays for the right to execute Robinhood's retail order flow — which is valuable because retail orders are informationally uncorrelated (i.e., not based on superior information), making them low adverse-selection risk.

**Arguments for PFOF:** Enables commission-free trading for retail. Provides price improvement over quoted prices in many cases. Makes markets accessible to small investors.

**Arguments against PFOF:** Conflict of interest — brokers are incentivized to route to whoever pays most, not who executes best. True price improvement is difficult for retail traders to verify. SEC has studied whether PFOF suppresses competition and leaves retail investors getting worse prices than a fair open market would provide. The EU and UK have banned PFOF; the practice is under ongoing SEC review in the US.

---

## 6. Dark Pools

Dark pools are private trading venues that allow large institutions to execute block trades without displaying orders on public exchanges. Order size and identity are hidden pre-trade, reducing market impact.

**Why institutions use them:** A pension fund buying 2 million shares of a stock on a public exchange would signal its intent to the entire market, causing prices to rise before the order completes. In a dark pool, the order is matched against a counterparty without ever appearing on the lit tape.

**Types:** Broker-dealer dark pools (Goldman's Sigma X, Morgan Stanley's MS POOL), independent platforms (Liquidnet), and exchange-operated dark pools (NYSE Arca, NASDAQ BX).

**Tracking dark pool activity:** FINRA requires ATS (Alternative Trading System) operators to report weekly volume data, published with a two-week delay. Services like FINRA's ATS transparency data and commercial providers (Unusual Whales, FlowAlgo) aggregate this information. Spikes in dark pool volume relative to lit exchange volume can indicate institutional accumulation or distribution ahead of price moves.

---

## 7. Level 2 Quotes (Reading the Order Book)

Level 2 displays the full bid and ask stack — every market maker and ECN's quote with size. Level 1 shows only the best bid/ask; Level 2 reveals the depth behind it.

**Reading the book:** Bid side shows buyers stacked in descending price order; ask side shows sellers in ascending price. Size is quoted in shares (or lots). A large bid at a round number ($50.00 for 50,000 shares) may indicate a market maker defending a support level — or may be a spoof.

**Hidden orders:** Many venues allow reserve/iceberg orders where only a fraction of size is displayed. The true depth of the book is always larger than what Level 2 shows.

**Spoofing:** A manipulative practice where large orders are placed on the book to create the appearance of supply or demand, then cancelled before execution. A 100,000-share bid that repeatedly disappears when the ask approaches it is a classic spoof. Spoofing is illegal under the Dodd-Frank Act; however, it remains difficult to prosecute and continues to occur. Identifying spoofing requires watching for persistent orders that cancel before touching.

---

## 8. Time and Sales / Tape Reading

The Time and Sales window (the "tape") shows every executed trade in real time: timestamp, price, size, and exchange. Color coding typically indicates whether the trade occurred at the bid (seller-initiated, bearish) or ask (buyer-initiated, bullish).

**Identifying large block trades:** A sudden print of 50,000+ shares at a single price, particularly above the ask (a "plus tick"), signals aggressive institutional buying. Trades printing in rapid succession at ascending prices with large size indicate momentum buildup.

**Aggressor side:** The aggressor is whichever side crossed the spread to execute. A buyer hitting the ask is bullish aggression; a seller hitting the bid is bearish. Tape readers look for sustained aggressor-side dominance as a trend confirmation signal.

**Reading the tape for institutional footprints:** Institutions break large orders into smaller pieces to minimize impact. A pattern of consistent 500-share buys at the ask every 15 seconds, persisting for hours, suggests algorithmic accumulation — a VWAP or TWAP execution algorithm working a large order.

---

## 9. Pre-Market and After-Hours Trading

Extended hours trading (pre-market: 4:00–9:30 AM ET; after-hours: 4:00–8:00 PM ET) operates with materially different conditions:

- **Thinner liquidity:** Fewer participants means larger bid-ask spreads, sometimes 10–50x wider than regular hours.
- **Wider spreads:** Price discovery is incomplete; quoted prices may not reflect true market value.
- **Gap risk:** Price movements in extended hours set the stage for gap opens. A stock that closes at $100 and trades to $115 after hours on an earnings beat may open at $112–$118 as regular-session participants absorb the news.
- **Volatility:** News (earnings, FDA decisions, macro data) hits outside regular hours, creating exaggerated moves in low-liquidity environments. A $0.50 move in normal hours might be a $5 move after hours on the same news.
- **Participation:** Mostly institutions, professionals, and informed retail. Less efficient but also less competitive than regular hours.

Extended hours trading is appropriate for reacting to catalysts but carries outsized execution risk. Limit orders are strongly recommended; market orders in extended hours can fill at extreme prices.

---

## 10. Market Maker Signals and Order Flow Imbalances

**Accumulation signals:** Consistent bids at or above the offer, large dark pool prints, steady tape aggression on the buy side without corresponding price increases (absorption), and narrowing spreads as a stock consolidates near support.

**Distribution signals:** Repeated offers at or below the bid, large uptick prints followed by price failure, rising volume with no price progress (distribution into strength), and widening spreads as price approaches resistance.

**Order flow imbalances:** When buy orders materially exceed sell orders (or vice versa) at a given price level, the market must reprice to attract the other side. Imbalances are the fundamental driver of short-term price movement. Order book imbalance (OBI) — the ratio of bid size to total bid+ask size — is a quantitative signal used by algorithmic traders to predict near-term price direction. A book heavily weighted to the bid side suggests upward pressure; heavy ask-side weighting suggests downward pressure.

---

## 11. RegNMS and Market Regulation Basics

**Regulation National Market System (Reg NMS, 2005):** The foundational rule governing US equity market structure. Key provisions:

- **Order Protection Rule (Rule 611):** Prohibits trading-through — executing an order at a price inferior to a better price displayed on another exchange. Requires brokers to route to the venue with the best price, creating the NBBO as the national benchmark.
- **Access Rule (Rule 610):** Limits fees that exchanges can charge for accessing protected quotes, preventing venues from erecting toll barriers to order flow.
- **Sub-Penny Rule (Rule 612):** Prohibits quoting in increments smaller than one cent for stocks above $1. Intended to prevent sub-penny stepping by market makers to jump ahead of queued orders — though internalization by wholesalers effectively circumvents this.
- **Market Data Rules:** Require exchanges to share data through consolidated feeds (SIP — Securities Information Processor), ensuring all participants have access to NBBO data (albeit at varying latency).

**Other key regulations:**
- **Dodd-Frank Act (2010):** Banned spoofing and layering; expanded CFTC/SEC jurisdiction over derivatives.
- **FINRA ATS Transparency:** Requires dark pool operators to report volume, enabling post-trade analysis of off-exchange activity.
- **Best Execution:** FINRA Rule 5310 requires brokers to use reasonable diligence to execute at the most favorable terms reasonably available. The standard is deliberately flexible, creating ongoing debate about whether PFOF-routed orders satisfy it.

---

*Last updated: March 2026 | Investment Council Research Division*
