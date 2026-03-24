# Bitcoin and Ethereum ETF Mechanics — Comprehensive Knowledge Base

**Category:** Crypto Market Structure | **Updated:** 2026 | **Depth:** Institutional

---

## How Bitcoin Spot ETFs Work

### The Core Mechanism

A Bitcoin spot ETF holds actual Bitcoin in custody and issues shares that track the price of that Bitcoin. Unlike futures-based products, the ETF must acquire, hold, and safeguard real BTC to back each share. This makes custodianship the most operationally critical component of the entire structure.

The NAV (Net Asset Value) of a Bitcoin spot ETF is calculated daily, typically using a reference rate derived from aggregated pricing across major spot exchanges — most commonly the CME CF Bitcoin Reference Rate (BRR), which averages prices from Coinbase, Kraken, itBit, Bitstamp, and Gemini during a specific 1-hour window.

### Authorized Participants and the Creation/Redemption Process

The creation/redemption mechanism is what keeps ETF market prices anchored to NAV. It works through a two-tier structure:

**Tier 1 — Authorized Participants (APs):** Large financial institutions (typically market makers and broker-dealers) with direct agreements with the ETF issuer. For Bitcoin ETFs, APs include Jane Street, Virtu Financial, and JPMorgan Securities. APs do not need to hold Bitcoin directly.

**Tier 2 — The Arbitrage Engine:**

- **Creation (when ETF trades at premium to NAV):** AP delivers cash (or Bitcoin, in an in-kind model) to the ETF issuer. The issuer uses cash to purchase Bitcoin, then delivers newly created ETF shares to the AP. AP sells shares into the market at the premium price, pocketing the spread. This arbitrage simultaneously increases share supply and pushes price toward NAV.

- **Redemption (when ETF trades at discount to NAV):** AP purchases ETF shares on the open market at the discounted price, delivers them to the issuer, and receives cash (equal to NAV). AP buys shares cheap, redeems at NAV, profit realized. This removes shares from circulation and supports price recovery.

**Cash vs. In-Kind Creation:** All U.S. Bitcoin spot ETFs approved in January 2024 use a cash creation model — APs deliver cash, not Bitcoin. The SEC required this, as it did not want broker-dealers handling spot Bitcoin directly. The ETF issuer then purchases Bitcoin through regulated channels. This adds a small operational cost vs. in-kind models used internationally but does not meaningfully impact NAV accuracy.

### NAV Maintenance in Practice

Because APs can arbitrage any persistent premium or discount, Bitcoin spot ETFs typically trade within 0.01–0.05% of NAV during market hours. The arbitrage is so efficient that significant dislocations are extremely rare and typically resolve within minutes. This is fundamentally different from the GBTC structure that existed prior to January 2024.

---

## Major Bitcoin ETF Comparison

| ETF | Issuer | Ticker | Fee | Est. AUM (early 2026) | Custodian |
|---|---|---|---|---|---|
| iShares Bitcoin Trust | BlackRock | IBIT | 0.25% | ~$60B+ | Coinbase |
| Fidelity Wise Origin Bitcoin Fund | Fidelity | FBTC | 0.25% | ~$20B+ | Fidelity Digital Assets |
| Bitwise Bitcoin ETF | Bitwise | BITB | 0.20% | ~$4B+ | Coinbase |
| Grayscale Bitcoin Trust ETF | Grayscale | GBTC | 1.50% | ~$18B+ | Coinbase |
| Grayscale Bitcoin Mini Trust | Grayscale | BTC | 0.15% | ~$4B+ | Coinbase |
| ARK 21Shares Bitcoin ETF | ARK/21Shares | ARKB | 0.21% | ~$4B+ | Coinbase |

**IBIT (BlackRock):** The dominant product by inflows. BlackRock's distribution network, brand credibility with institutional allocators, and existing iShares infrastructure drove rapid adoption. IBIT became the fastest ETF in history to reach $10 billion in AUM, achieving this in under two months. The 0.25% fee is competitive for its scale; BlackRock initially offered a fee waiver.

**FBTC (Fidelity):** Unique in that Fidelity Digital Assets serves as its own custodian rather than outsourcing to Coinbase. This vertical integration is a differentiator for clients who prefer not to concentrate custodial risk at Coinbase. FBTC has attracted strong flows from Fidelity's existing wealth management and 401(k) client base.

**BITB (Bitwise):** Bitwise operates a crypto-native firm with deeper on-chain expertise than BlackRock or Fidelity. BITB's 0.20% fee makes it the cost leader among established products. Bitwise has been transparent about its Bitcoin addresses, allowing public auditability of holdings.

**GBTC (Grayscale):** The legacy product. At 1.50%, GBTC's fee is six times higher than competitors. Despite this, it retains significant AUM because many holders have large embedded capital gains and converting to another product would trigger a taxable event. GBTC remains a persistent source of structural outflow pressure as long-term holders gradually rotate.

---

## GBTC: The Discount/Premium Saga

### Origins and the Accredited Investor Arbitrage

Grayscale launched GBTC in 2013 as a private placement. Accredited investors could contribute Bitcoin and receive GBTC shares, which were locked up for six months. After the lockup, those shares traded on OTC markets. During bull markets — when retail demand for GBTC exceeded supply on secondary markets — GBTC traded at significant premiums to NAV, sometimes 20–40%. This allowed the arbitrage of contributing Bitcoin worth $100 and receiving shares trading at $120–140 on secondary markets.

### The Discount Trap (2021–2024)

When the accredited investor arbitrage trade became crowded, particularly through Three Arrows Capital and other crypto funds, it created a structural problem. When crypto markets turned in 2021–2022, the premium collapsed — and then inverted to a discount. With no redemption mechanism (Grayscale was not an ETF and could not offer redemptions), there was no arbitrage force to close the gap. GBTC traded at a persistent, widening discount to NAV that at times exceeded 40%.

This trapped investors: holding GBTC meant owning something worth, say, $60 for every $100 of underlying Bitcoin. Selling meant realizing the loss; holding meant watching the gap persist. The discount became a systemic concern and was cited as a contributing factor to the collapse of entities like Three Arrows Capital that held large GBTC positions.

### The Conversion and Outflow Cascade

Grayscale fought a multi-year legal battle with the SEC to convert GBTC into a spot ETF. In August 2023, the D.C. Circuit Court ruled that the SEC had acted arbitrarily in denying Grayscale's conversion application. Following the January 2024 spot ETF approvals, GBTC converted to an ETF structure, the discount closed immediately, and — critically — redemptions became possible for the first time.

The result was a massive and sustained outflow. Investors who had been trapped for years could finally exit. Additionally, FTX's bankruptcy estate sold approximately $1 billion in GBTC during early 2024 to raise cash. In the first weeks after conversion, GBTC saw multi-billion dollar outflows that temporarily offset the net positive inflows from new ETFs like IBIT and FBTC. This dynamic is why Bitcoin's price did not immediately surge on ETF approval day — GBTC supply was hitting the market simultaneously with new institutional demand.

---

## Ethereum Spot ETF Approval and Market Impact

The SEC approved Ethereum spot ETFs in May 2024 (S-1 approvals came in July 2024), with products from BlackRock (ETHA), Fidelity (FETH), Grayscale (ETHE), Bitwise (ETHW), and others launching on July 23, 2024.

**Why ETH ETF Underperformed vs. BTC ETF at Launch:**

1. **No staking yield:** The SEC required that ETH held in ETFs could not be staked. This eliminated a core value proposition of Ethereum — the ~3–5% annual staking yield. An ETH ETF is thus structurally inferior to directly holding and staking ETH for sophisticated investors, dampening institutional demand.

2. **ETHE outflows mirrored GBTC:** Grayscale's Ethereum Trust (ETHE) had the same discount/trap dynamic and immediately began experiencing outflows upon conversion, absorbing new inflows from other products.

3. **Smaller addressable market:** Bitcoin's narrative as "digital gold" and a macro hedge is more immediately legible to traditional finance allocators. Ethereum's value proposition requires understanding smart contracts, DeFi, and application-layer ecosystems — a harder sell to wealth managers and pension funds.

4. **Timing:** ETH ETFs launched into a market that had already experienced significant price appreciation; the BTC ETF launch in January 2024 had more compressed expectations.

Net flows into Ethereum ETFs were materially lower in their first months than the comparable BTC ETF period, and ETH underperformed BTC on a relative basis through much of the post-launch window.

---

## Futures ETFs vs. Spot ETFs: The Contango Problem

**BITO (ProShares Bitcoin Strategy ETF)** launched in October 2021 and was the first U.S. Bitcoin ETF — but it holds CME Bitcoin futures contracts, not spot Bitcoin.

**How futures ETFs underperform via roll costs:**

Futures contracts expire monthly. To maintain continuous exposure, BITO must sell expiring front-month contracts and buy the next month's contracts — a process called "rolling." When the futures curve is in contango (futures price above spot, the normal state for Bitcoin), rolling is structurally costly: you sell lower (expiring contract near spot convergence) and buy higher (next month's contract at a premium). This creates a persistent drag on returns called "negative roll yield."

In a strong contango environment, this cost can be 5–10%+ annualized, meaning BITO can significantly underperform spot Bitcoin even if the underlying price rises. Over BITO's existence from 2021 to the January 2024 spot ETF launch, the performance gap between BITO and spot Bitcoin was substantial.

**Spot ETFs eliminate this entirely.** IBIT, FBTC, and other spot products hold actual Bitcoin. There is no rolling, no futures curve exposure, no contango drag. The only costs are the management fee and minor custodial/operational expenses.

---

## How to Read Bitcoin ETF Flow Data

### Primary Data Sources

**Farside Investors (farside.co.uk/bitcoin-etf-flow):** The most widely cited free resource for daily Bitcoin ETF flows. Updated each business day, showing net flows in millions of dollars for each ETF. Displays individual fund flows and a total net flow figure.

**Bloomberg Terminal:** IBIT US Equity → CF → Fund Flows. Professionals use this to pull historical flow data, identify accumulation patterns, and compare fund-level flows against price action. Bloomberg's ETF IQ function provides deeper analytics.

**ETF.com and VettaFi:** Secondary sources providing flow data with additional context on AUM trends.

### Interpreting Flow Data

**Positive net flows:** New capital entering the product. The issuer must purchase Bitcoin to back new shares. This is direct spot market buying pressure and is generally price-supportive.

**Negative net flows (outflows):** Redemptions require the issuer to sell Bitcoin. Sustained negative flows exert downward price pressure.

**GBTC-adjusted vs. total flows:** During 2024, analysts would report "ex-GBTC flows" to separate structural GBTC selling from genuine new demand. By 2025, this distinction became less critical as GBTC outflows stabilized.

**Concentration signals:** When IBIT dominates inflows, it indicates BlackRock's institutional distribution network is active — a signal of wealth manager and institutional buying. When smaller funds see disproportionate inflows, it may indicate retail-driven demand.

---

## ETF Flows as a Market Signal

IBIT flows have become one of the most closely watched daily data points in Bitcoin market structure. The relationship is direct and mechanical: when $500M flows into IBIT, Coinbase (as custodian) must purchase $500M of Bitcoin on spot markets. This is real, transparent, measurable buying pressure.

This represents a structural shift. Pre-ETF, institutional Bitcoin demand was opaque — corporate treasury purchases, OTC trades, and futures positioning were harder to aggregate. Now, daily flow data provides a near-real-time institutional demand signal.

Analysts monitor rolling 5-day and 30-day flow trends to assess institutional momentum. Sustained inflows during price dips are interpreted as institutional "buy-the-dip" behavior — a bullish signal. Outflows during price strength suggest profit-taking. Sudden large single-day inflows (e.g., $1B+ days in IBIT) often precede or accompany sharp price moves.

---

## Institutional Adoption via ETFs

**Wealth Managers:** The primary driver of IBIT inflows. Registered Investment Advisors (RIAs) and broker-dealer platforms can now allocate client portfolios to Bitcoin without custody complexity. Firms like Morgan Stanley, UBS, and Merrill Lynch have granted advisors access to Bitcoin ETFs for qualified clients.

**Hedge Funds:** 13-F filings reveal hedge fund ETF holdings. Multi-strategy funds have used Bitcoin ETFs for macro exposure and volatility trading. Some funds use ETFs as a base position alongside options for more complex payoff structures.

**Corporate Treasuries:** Companies following the MicroStrategy model can hold Bitcoin ETFs instead of spot Bitcoin, simplifying accounting treatment and eliminating custody risk. This is particularly relevant for smaller companies without dedicated digital asset operations.

**Sovereign Wealth Funds and Pension Funds:** Early-stage adoption. Some state pension funds (e.g., Wisconsin Investment Board disclosed BTC ETF holdings in 2024) have taken initial positions, typically representing small allocations relative to total AUM.

---

## IBIT Options: Mechanics and Market Impact

Options on IBIT launched in November 2024, representing a significant structural development. For the first time, U.S. investors could access exchange-listed, regulated options on a spot Bitcoin product.

**Mechanics:** IBIT options function identically to equity options — calls, puts, various strikes and expirations traded on Nasdaq. Premiums are settled in cash. Notional exposure is 1 IBIT share per contract (not the 100-share equity convention, though this may vary).

**Gamma Exposure:** Options market makers who sell calls must delta-hedge by buying underlying IBIT shares (which requires buying Bitcoin). As Bitcoin prices rise and calls go deeper in-the-money near expiration, market makers must buy increasing quantities to stay delta-neutral — creating positive gamma feedback loops that can amplify price moves. This dynamic, well-understood in equity markets, now applies to Bitcoin.

**Max Pain and Expiration Dynamics:** Large open interest at specific strikes creates gravitational effects on price near monthly expirations. Bitcoin's options market, already significant via Deribit (offshore), now has an additional regulated layer that institutional participants can access.

---

## Future Crypto ETFs: Prospects

**Solana (SOL) ETF:** Applications filed by VanEck, 21Shares, and others. The primary regulatory hurdle is whether SOL is classified as a security. The regulatory environment post-2024 has become more favorable; approvals are considered likely in the 2025–2026 window.

**XRP ETF:** Multiple applications filed following Ripple's partial legal victory against the SEC. XRP's security status remains partially contested, creating regulatory uncertainty. An approval precedent from SOL would likely accelerate XRP ETF consideration.

**Multi-Asset Crypto ETFs:** Products combining BTC and ETH exposure in a single wrapper are under consideration and would appeal to investors seeking broad crypto exposure in a single product.

---

## International Crypto ETFs

**Canada:** Purpose Bitcoin ETF (BTCC) launched in February 2021 — the world's first Bitcoin spot ETF, predating U.S. approval by nearly three years. Canada also has ETH spot ETFs with staking, which U.S. products currently lack.

**Europe:** ETP (Exchange-Traded Product) structure rather than UCITS funds. Products from 21Shares, ETC Group, and WisdomTree trade on Deutsche Boerse, SIX Swiss Exchange, and Euronext. Liquidity is lower than U.S. products. Some European ETPs offer staking.

**Hong Kong:** Approved spot Bitcoin and Ethereum ETFs in April 2024, slightly after the U.S. These products allow in-kind creation/redemption (unlike U.S. cash-only model) and have attracted significant regional institutional interest.

---

## Tax Treatment: ETFs vs. Direct Crypto Ownership

**U.S. Tax Treatment of Bitcoin ETFs:**
- ETF shares are treated as property, same as stocks — capital gains on sale, holding period determines short vs. long-term rates
- **No wash sale rule applies to crypto directly**, but crypto ETF shares held in brokerage accounts may eventually be subject to wash sale rules if legislation changes
- ETF dividends: Bitcoin ETFs do not pay dividends; no tax event until shares are sold
- **No in-kind redemption tax advantage:** Because U.S. Bitcoin ETFs use cash creation/redemption, the ETF cannot use the equity ETF trick of flushing low-basis shares through in-kind redemptions to minimize capital gains distributions. However, Bitcoin's non-dividend nature means this is less relevant in practice.

**Comparison to Direct Ownership:**
- Direct Bitcoin allows **tax-loss harvesting without wash sale restrictions** (under current law) — selling at a loss and immediately repurchasing resets basis without a 30-day waiting period
- ETF shares held in IRAs, 401(k)s, and other tax-advantaged accounts generate no current tax event — a major advantage unavailable to direct crypto holders (direct crypto cannot be held in standard retirement accounts)
- Direct Bitcoin held overseas or in self-custody has no automatic reporting; ETF holdings are reported via standard 1099-B, simplifying tax compliance but reducing privacy
- **UBTI considerations:** Bitcoin ETFs held in IRAs do not generate Unrelated Business Taxable Income (UBTI), unlike some direct crypto investments in yield-generating protocols

---

*This file is part of the Investment Council research framework. For live ETF flow data, reference Farside Investors daily. For institutional holdings disclosures, monitor quarterly 13-F filings via SEC EDGAR.*
