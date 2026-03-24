# Earnings Analysis: Complete Framework for AI Investment Research

## Overview

Earnings season is the single most concentrated period of price discovery in equity markets. Four times per year, companies report financial results that either confirm or contradict the market's assumptions embedded in current valuations. Mastering earnings analysis requires understanding both the quantitative mechanics of financial statements and the qualitative signals embedded in management communication.

---

## 1. Reading an Earnings Report

### EPS: Beat, Miss, and What They Actually Mean

Earnings per share is reported on two bases:

- **GAAP EPS** — includes stock-based compensation, restructuring charges, amortization of acquired intangibles, and one-time items
- **Non-GAAP / Adjusted EPS** — excludes these items; this is the number compared against consensus estimates

A beat or miss is measured against the **consensus estimate** (the average of sell-side analyst forecasts). However, the magnitude matters enormously:

- A $0.01 beat on $1.00 EPS estimates is noise
- A $0.10 beat (10%) typically warrants a meaningful re-rating
- Beats driven by share buybacks or tax rate changes rather than operational improvement are lower quality

**Warning sign:** Companies that consistently "beat by a penny" quarter after quarter are often managing guidance deliberately low. This is called the "guidance game" — management sandbagging estimates to manufacture beats. Watch for shrinking beat magnitude over time as a sign the sandbagging cushion is being exhausted.

### Revenue Beat/Miss

Revenue is harder to manipulate than EPS and therefore more informative. Key questions:

- Did revenue beat on volume (units sold) or price? Price-driven beats may not be sustainable.
- Is revenue growth accelerating or decelerating? Deceleration, even on a beat, is often penalized.
- What is the organic growth rate vs. growth from acquisitions or FX tailwinds?

**Red flag:** Revenue beat but gross margin compressed — this can indicate the company discounted to hit numbers.

### Guidance: The Most Important Number

The market is forward-looking. Management's guidance for the next quarter and full year often matters more than the just-reported results. Parse guidance carefully:

- **Raised guidance** — bullish; signals management confidence
- **Maintained guidance** — neutral to slightly negative (you beat, but you're not raising?)
- **Lowered guidance** — bearish regardless of current quarter beat; often the source of sharp post-earnings selloffs

Pay attention to **guidance language**: "approximately," "at least," "up to" each carry different implied confidence levels.

---

## 2. The Earnings Call

### Structure

Earnings calls follow a predictable format: prepared remarks (CEO/CFO), then analyst Q&A. The Q&A is often more revealing than the prepared script.

### Management Tone Signals

Qualitative tone analysis can be as valuable as the numbers:

- **Confident tone + specific targets** — bullish signal
- **Vague language, hedging, passive voice** — management may be obscuring problems
- **Over-reliance on macro excuses** ("challenging environment," "headwinds from FX") — red flag if competitors aren't citing the same issues
- **CFO departure announced on the call** — almost always a significant negative signal

### Guidance Language Tells

| Language | Interpretation |
|----------|---------------|
| "We expect to exceed..." | Deliberate underpromise |
| "In line with..." | Neutral; no surprise intended |
| "We are navigating..." | Euphemism for problems |
| "Visibility is limited..." | Management doesn't know what's coming |
| "Monitoring closely..." | Something is deteriorating |

### Q&A Red Flags

- Analysts asking the same question multiple ways because the answer was evasive
- Management pivoting away from specific operational questions to macro commentary
- Short, clipped answers to questions about deceleration or churn
- CEO deferring operational questions to the CFO (can signal CEO is disengaged)
- Hostile or defensive tone from management toward analyst questions

---

## 3. Key Metrics by Sector

### Technology / SaaS

- **ARR (Annual Recurring Revenue)** — the primary growth metric; focus on sequential growth rate
- **NRR (Net Revenue Retention)** — measures expansion within existing customers; above 120% is exceptional, below 100% means the customer base is shrinking in value
- **CAC/LTV Ratio** — Customer Acquisition Cost vs. Lifetime Value; LTV:CAC above 3:1 is healthy; below 2:1 signals inefficient growth
- **Gross Margin** — SaaS should be 70%+ at scale; compression here is a serious warning
- **Rule of 40** — Revenue growth % + FCF margin % should exceed 40 for healthy SaaS

### Consumer / Retail

- **Same-Store Sales (Comps)** — growth at existing locations excluding new store openings; the cleanest read on underlying demand
- **Gross Margin** — watch for promotional activity compressing margins
- **Inventory Turnover** — rising inventory relative to sales growth signals demand weakness
- **Traffic vs. Ticket Size** — are more customers visiting (bullish structural) or are fewer customers spending more (fragile)?

### Industrials / Manufacturing

- **Operating Margin** — reflects operating leverage and pricing power
- **Backlog and Book-to-Bill Ratio** — book-to-bill above 1.0 means orders exceed shipments; forward indicator
- **Capacity Utilization** — high utilization = pricing power; low utilization = potential restructuring
- **Free Cash Flow Conversion** — FCF as % of net income; should be close to 100% for high-quality businesses

### Healthcare / Biotech

- **Pipeline milestones and trial data** — often more important than current financials
- **Gross margin on products** — pharmaceutical gross margins should be 70%+
- **Royalty revenue vs. product revenue** — royalties are high-margin and durable
- **FDA approval timelines and PDUFA dates** — binary events around earnings

### Financial Services

- **Net Interest Margin (NIM)** — banks' core earnings driver; sensitive to rate environment
- **Provision for Credit Losses** — rising provisions signal concern about loan quality
- **Return on Equity (ROE) and Return on Assets (ROA)**
- **Non-Performing Loans (NPLs)** — leading indicator of credit stress

### Energy

- **Realized price vs. strip price** — did management hedge effectively?
- **Production vs. guidance** — operational execution
- **All-in sustaining cost (AISC)** for miners
- **Debt-to-EBITDA and interest coverage** — capital structure under commodity stress

---

## 4. Pre-Earnings Positioning

### Implied Volatility Expansion

Options market implied volatility (IV) expands into earnings as traders buy options to hedge or speculate on the binary event. This IV expansion inflates option premiums. Key dynamics:

- IV typically reaches peak levels the day before earnings
- **IV crush** occurs immediately after earnings regardless of direction — IV collapses back to normal levels
- Buying options pre-earnings means you're paying a premium that will decay sharply regardless of the move

### Expected Move Calculation

The options market prices in an "expected move" — the range the stock is expected to trade within after earnings:

**Expected Move = Stock Price × IV × √(Days to Expiration / 365)**

A simpler approximation: add the at-the-money call and put prices for the front-month expiration. This straddle price approximates the expected move.

**Trading implication:** If a stock makes a move smaller than the expected move, short straddle sellers profit. If it exceeds the expected move, directional buyers win.

### Pre-Earnings Positioning Checklist

- What is the current consensus estimate and has it been revised recently?
- What is the whisper number (see Section 5)?
- What move has the stock made in the last 4 earnings events?
- Is short interest elevated (potential for short squeeze on beat)?
- What is the options market implying as the expected move?

---

## 5. Post-Earnings Reactions

### Why Stocks Fall on Beats

This is one of the most common sources of confusion for retail investors. A stock can beat on both EPS and revenue and still sell off 10%+ for several reasons:

1. **Buy the rumor, sell the news** — the stock ran up into earnings pricing in the beat; the beat was already in the price
2. **Guidance disappoints** — the quarter was great but next quarter or full year guidance was below expectations
3. **Margin compression** — beat on revenue but missed on margins; market penalizes profitability deterioration
4. **Valuation already extreme** — a 50x P/E stock needs flawless results plus raised guidance to sustain its multiple
5. **Beat vs. whisper number** — beat consensus but missed the whisper (see Section 5)

### Short Squeeze Setups Around Earnings

High short interest combined with an earnings beat creates conditions for a violent squeeze:

- Short sellers who bet against the company must buy shares to cover losses
- This buying pressure amplifies the upward move beyond what fundamentals alone justify
- **Indicators to watch:** Short interest as % of float above 15-20% creates squeeze potential; days-to-cover (short interest divided by average daily volume) above 5 days indicates significant squeeze risk for short sellers

---

## 6. Consensus Estimates vs. Whisper Numbers

**Consensus estimates** are the published average of sell-side analyst forecasts, available on Bloomberg, FactSet, or free services like Seeking Alpha and Earnings Whispers.

**Whisper numbers** represent the unofficial, informal expectation — what sophisticated institutional investors actually expect the company to report. Whisper numbers are typically higher than consensus because:

- The consensus includes older estimates that haven't been updated
- Analysts often maintain published estimates below their true expectations for relationship reasons
- Informal channel checks and data sources filter into whisper numbers

**Rule of thumb:** A company that beats consensus but misses the whisper number will often trade down. The stock's reaction in the first 30-60 minutes after earnings reflects whether the result cleared the whisper, not just the published estimate.

---

## 7. Revision Cycles and Estimate Momentum

### The Revision Cycle

Analyst estimates are not static. They revise throughout the quarter in response to:

- Management guidance at prior earnings
- Industry data releases (e.g., monthly retail sales, auto sales)
- Competitor earnings that reveal sector trends
- Management commentary at investor conferences (often held mid-quarter)

**Estimate momentum** — the trend of revisions — is a powerful predictor of stock performance. Stocks with rising estimate revisions tend to outperform; stocks with falling estimates tend to underperform, often before the bad earnings confirm the thesis.

### Quantitative Signal

The **Earnings Estimate Revision Factor** is a well-documented quant factor. Stocks in the top decile of upward revisions over the prior 3 months meaningfully outperform over the following quarter. This works because sell-side analysts are slow to fully incorporate positive information — they "anchor" on prior estimates.

---

## 8. SEC Filings: How to Find and Read Them

### Where to Find Filings

- **EDGAR (SEC):** `https://www.sec.gov/cgi-bin/browse-edgar` — free, official, comprehensive
- **Company investor relations pages** — often more navigable with earnings release PDFs
- **Bloomberg/FactSet** — institutional aggregation with context

### Key Filing Types

**10-K (Annual Report)**
- Filed within 60-90 days of fiscal year end
- Contains audited financials, MD&A (Management Discussion and Analysis), risk factors, and legal proceedings
- Read the MD&A for management's own narrative on what drove results
- **Risk factors** are often boilerplate, but watch for newly added risks year-over-year

**10-Q (Quarterly Report)**
- Filed within 40-45 days of quarter end
- Unaudited; contains 3 quarters of detail during the year
- Look for changes in accounting policies, new related-party disclosures, or changes in revenue recognition language

**8-K (Current Report)**
- Filed within 4 business days of a material event
- Earnings releases are filed as 8-K attachments
- Watch for 8-Ks disclosing executive departures, debt covenant waivers, or restatements — all significant negative signals

### What to Look for in the Footnotes

Footnotes contain information management does not highlight in prepared remarks:

- **Revenue recognition changes** — can artificially inflate or smooth reported revenue
- **Goodwill impairment tests** — impairment charges signal acquisitions that destroyed value
- **Pension and benefit obligations** — underfunded pensions are hidden liabilities
- **Contingent liabilities and litigation** — quantify the actual risk
- **Related-party transactions** — management enriching themselves at shareholder expense

---

## 9. Insider Buying and Selling Around Earnings

### Form 4 Filings

All insider transactions (officers, directors, 10%+ shareholders) must be reported on SEC Form 4 within 2 business days. These are searchable on EDGAR and aggregated on sites like OpenInsider.

### Interpreting Insider Activity

**Insider buying is a strong positive signal when:**
- Multiple insiders are buying in the open market (not exercising options)
- Purchases are large relative to the insider's existing holding
- Buying occurs after a sharp price decline (conviction at lower prices)
- CEO or CFO buying is particularly meaningful

**Insider selling is ambiguous:**
- Diversification of concentrated positions is routine and non-informative
- Pre-planned 10b5-1 selling programs are disclosed in advance and less informative
- **Red flag:** Accelerated selling outside of 10b5-1 plans, or selling after a run-up but before major product launches or trial readouts

### Blackout Periods

Companies typically impose blackout periods on insider trading in the weeks surrounding earnings. Insider transactions just before or after the blackout window can be informative timing signals.

---

## 10. Channel Checks and Alternative Data

### Channel Checks

Channel checks are qualitative interviews with suppliers, distributors, customers, or competitors to assess business trends before official results. Institutional research desks conduct these systematically; individual investors can approximate them by:

- Monitoring LinkedIn for hiring trends (rapidly growing headcount = growth confidence)
- Tracking job postings in specific departments (e.g., sales hiring = revenue growth expected)
- Reading trade publications and supplier commentary

### Alternative Data Sources

Alternative data has become institutionalized but remains valuable:

- **Credit/debit card transaction data** — direct read on consumer spending by retailer
- **Web traffic and app download data** — leading indicator for digital businesses (SimilarWeb, Sensor Tower)
- **Satellite imagery** — parking lot counts for retailers; oil storage levels
- **Shipping and logistics data** — freight volumes as leading indicator
- **Job postings** — qualitative signal of investment and growth expectations
- **Social media sentiment** — brand health and product reception (noisy but directional)
- **Earnings call NLP** — sentiment and tone analysis across thousands of calls to detect patterns

---

## 11. Earnings Season Calendar and Market Dynamics

### Cadence

Earnings season runs roughly:
- **Q1 results:** Mid-April through mid-May
- **Q2 results:** Mid-July through mid-August
- **Q3 results:** Mid-October through mid-November
- **Q4 results:** Late January through late February

The largest-cap companies (mega-cap tech, banks) report first and set the tone. Their results often drive sector-wide moves before smaller competitors report.

### Cross-Company Read-Throughs

When a major company reports, the results reveal information about competitors and suppliers:

- Strong iPhone demand reported by Apple is bullish for TSMC and component suppliers
- Weak ad revenue at Meta suggests softness across the digital advertising ecosystem
- A bank reporting rising commercial loan losses is a warning for regional banks

### Macro Signaling from Earnings

Aggregated earnings provide a real-time read on the macro environment that lags official data:

- Rising mentions of "consumer trade-down" across retail earnings = inflationary pressure on lower-income consumers
- Widespread inventory builds across manufacturing sectors = demand deceleration
- Accelerating capex commentary from industrial companies = cycle expansion

---

## Signals Summary: Strength vs. Trouble

### Signals of Strength

- Beat on revenue AND raised full-year guidance
- Gross margin expansion with revenue growth (operating leverage)
- NRR above 120% (SaaS); strong same-store comps (retail)
- FCF conversion above 100% of net income
- Insider buying in the open market post-earnings
- Book-to-bill above 1.2x (industrials)
- Management providing specific, quantitative forward commitments

### Signals of Trouble

- Revenue beat, guidance maintained or cut (pulled forward demand)
- Gross margin compression while citing "competitive environment"
- Rising DSOs (Days Sales Outstanding) — receivables growing faster than revenue
- Deferred revenue declining (SaaS) — future revenue pipeline weakening
- CFO or CEO departure announced on or near earnings
- Inventory build with slowing revenue growth
- Vague guidance language replacing prior specific targets
- Goodwill impairment charges
- Accelerated insider selling outside 10b5-1 plans
- Analysts pushing back repeatedly on the same question in Q&A

---

*Last updated: March 2026 | Investment Council Research Framework*
