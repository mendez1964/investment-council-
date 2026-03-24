# Fixed Income & Bond Trading — Complete Reference

*Investment Council Research Framework | Fixed Income Markets*

---

## 1. Bond Basics

### What a Bond Is

A bond is a debt instrument. The issuer borrows money from investors and promises to pay periodic interest (the **coupon**) and return the **principal** (face value, typically $1,000 per bond) at **maturity**. Bonds are priced as a percentage of face value: a bond trading at 98 is priced at $980.

### The Price/Yield Relationship

This is the foundational concept in fixed income: **bond prices and yields move inversely**.

When yields rise, existing bond prices fall. When yields fall, prices rise. The intuition: if a bond pays a 4% coupon but new bonds are being issued at 5%, your 4% bond is less attractive — its price must fall until its effective return matches the market rate.

**Yield to Maturity (YTM)** is the single discount rate that equates a bond's future cash flows (coupons + principal) to its current market price. It is the most commonly quoted yield metric.

Other yield measures:
- **Current yield:** Annual coupon / current price. Ignores time value and capital gain/loss at maturity.
- **Yield to call (YTC):** For callable bonds, the yield assuming the bond is called at the first call date.
- **Yield to worst (YTW):** The lowest of YTM and all YTC scenarios. The conservative measure for callable bonds.

### Duration

**Duration** measures a bond's price sensitivity to interest rate changes. It is expressed in years and has two forms:

- **Macaulay duration:** The weighted average time to receive cash flows. A bond with a Macaulay duration of 7 years means the investor receives their money back, on average, in 7 years.
- **Modified duration:** Macaulay duration / (1 + YTM). This is the practical risk metric. A modified duration of 7 means the bond price moves approximately **7% for every 1% (100 bps) change in yield**.

Key duration rules:
- Zero-coupon bonds have the longest duration (equal to maturity) — maximum rate sensitivity.
- Higher coupon = lower duration (you get cash back sooner).
- Longer maturity = higher duration.
- Duration shortens as a bond approaches maturity.

### Convexity

Convexity is the second-order price/yield relationship — the curvature of the price-yield curve. Duration alone underestimates price gains when yields fall and overestimates price losses when yields rise. **Positive convexity** (held by most standard bonds) means the bond outperforms the duration estimate in both directions. Investors pay a premium for convexity; callable bonds have **negative convexity** (the issuer can call the bond away just when you want to hold it most).

---

## 2. The Treasury Market

The U.S. Treasury market is the deepest, most liquid bond market in the world and serves as the global risk-free rate benchmark.

### Treasury Instruments

| Instrument | Maturity | Key Feature |
|---|---|---|
| T-Bills | 4, 8, 13, 17, 26, 52 weeks | Sold at discount; no coupon |
| T-Notes | 2, 3, 5, 7, 10 years | Semiannual coupon |
| T-Bonds | 20, 30 years | Semiannual coupon; highest duration |
| TIPS | 5, 10, 30 years | Principal adjusts with CPI; real yield |
| I-Bonds | Up to 30 years | Fixed + inflation rate; retail only; $10K/year limit |

**TIPS (Treasury Inflation-Protected Securities):** The principal rises with CPI. Coupon is paid on the adjusted principal, so both income and redemption value protect against inflation. The **breakeven inflation rate** = nominal Treasury yield minus TIPS real yield. If actual inflation exceeds the breakeven, TIPS outperform nominal Treasuries.

### The Auction Process

The Treasury issues new debt via regularly scheduled auctions. Primary dealers are required to bid. Key metrics watched by the market:

- **Bid-to-cover ratio:** Total bids received / amount offered. Higher = stronger demand.
- **Tail:** Difference between the highest yield accepted (stop-out rate) and the when-issued yield at auction time. A large tail signals weak demand — bearish for bonds.
- **Indirect bidders:** Proxy for foreign central bank demand. Declining indirect bidder participation raises concerns about reserve diversification away from dollars.

Weak Treasury auctions can trigger immediate yield spikes and equity market pressure.

---

## 3. The Yield Curve

### Structure

The yield curve plots Treasury yields across maturities. The most watched spreads:

- **2s10s:** 10-year yield minus 2-year yield. The primary recession indicator. Inversion (2s10s < 0) has preceded every U.S. recession since the 1970s, typically with a 6–18 month lag.
- **3m10y:** 10-year yield minus 3-month T-bill yield. The Federal Reserve's preferred inversion measure. Has an even stronger recession-predictive track record than 2s10s.
- **5s30s:** Measures the long end steepness. Important for bank profitability (borrow short, lend long).

### Curve Shapes

| Shape | Description | Implication |
|---|---|---|
| Normal (upward sloping) | Long yields > short yields | Growth expected; healthy credit environment |
| Inverted | Short yields > long yields | Recession signal; tight monetary policy |
| Flat | Minimal spread across maturities | Transition period; uncertainty |
| Humped | Mid-curve yields highest | Specific rate path expectations |

### Steepener vs. Flattener Trades

A **steepener** trade profits when the yield curve steepens (spread widens). Implementations:
- Long long-duration bonds / short short-duration bonds
- Long bond futures (ZB) / short 2-year futures (ZT)
- Typical in early Fed easing cycles when short rates fall faster than long rates

A **flattener** trade profits when the curve flattens (spread narrows). Common when:
- The Fed is hiking aggressively (short rates rise faster)
- Growth expectations deteriorate while long-end anchored by deflationary fears

**Bear steepener:** Both short and long yields rise, but long yields rise more. Reflects fiscal/inflation concerns. Negative for risk assets.

**Bull steepener:** Both fall, short end falls more. Classic early easing environment.

---

## 4. Credit Markets

### Investment Grade vs. High Yield

Credit ratings divide the bond universe into two primary categories:

| Category | Ratings (Moody's/S&P) | Typical Spread to Treasuries |
|---|---|---|
| Investment Grade (IG) | Baa3/BBB- and above | 50–200 bps |
| High Yield (HY) | Ba1/BB+ and below | 200–800+ bps |

**Investment grade** issuers have strong balance sheets, reliable cash flows, and access to capital markets in most environments. They are held by insurance companies, pension funds, and conservative bond funds by mandate.

**High yield** (formerly called "junk bonds") offers higher income in exchange for higher default risk. HY spreads are highly correlated with equities — in risk-off environments, they widen dramatically.

### Credit Spreads

A credit spread is the yield premium over a comparable Treasury. If a 10-year corporate bond yields 5.5% and the 10-year Treasury yields 4.2%, the spread is 130 basis points (bps).

**Spread widening** signals:
- Rising default risk perception
- Deteriorating economic outlook
- Tighter financial conditions
- Risk-off sentiment across markets

**Spread tightening** signals:
- Improving credit quality or earnings
- Strong demand for yield (risk-on)
- Fed accommodation; easy financial conditions

The **OAS (Option-Adjusted Spread)** strips out embedded optionality (calls, puts) to give a cleaner apples-to-apples comparison across bonds with different structures.

---

## 5. Corporate Bonds

### Analyzing a Corporate Bond

Key metrics beyond yield and spread:

- **Leverage:** Net Debt / EBITDA. IG typically < 3x; HY often 4–7x.
- **Interest coverage:** EBITDA / interest expense. Below 2x is distress territory.
- **Free cash flow generation:** Can the company service debt organically?
- **Debt maturity profile:** A "maturity wall" — large debt maturities concentrated in a short window — creates refinancing risk, especially when rates are high.
- **Secured vs. unsecured:** Secured debt has claim on specific assets; recoveries are materially higher in default.
- **Seniority stack:** Senior secured > senior unsecured > subordinated > equity.

### Covenant Quality

Covenants are the contractual protections in bond indentures. They restrict issuer behavior to protect bondholders:

- **Maintenance covenants:** Require ongoing compliance with financial ratios (leverage, coverage). Common in bank loans, less so in bonds.
- **Incurrence covenants:** Only triggered if the issuer takes a specific action (e.g., cannot issue more debt if leverage exceeds a threshold).
- **Negative covenants:** Restrict asset sales, restricted payments (dividends, buybacks), and additional debt.

**Covenant-lite** bonds (common in late credit cycles) strip investor protections. They tend to produce lower recoveries in default. Moody's publishes a **Covenant Quality Score**; deteriorating scores are an early warning signal.

### Fallen Angels

A **fallen angel** is an issuer that was investment grade and has been downgraded to high yield. This creates a technical dislocation: IG-mandated funds must sell (creating forced selling pressure), while HY funds may not immediately buy. This can produce attractive entry points. Fallen angel ETFs (e.g., FALN) specifically target this segment.

---

## 6. Municipal Bonds

Municipal bonds are issued by state and local governments. Their primary advantage: **federal tax exemption** on interest income (and often state tax exemption for in-state bonds).

### Tax-Equivalent Yield

To compare munis to taxable bonds, use the tax-equivalent yield (TEY):

**TEY = Muni Yield / (1 - Marginal Tax Rate)**

Example: A muni yielding 3.5% for an investor in the 37% federal bracket has a TEY of 3.5% / 0.63 = **5.56%**. Munis are most attractive for high-income investors.

### GO vs. Revenue Bonds

- **General Obligation (GO) bonds:** Backed by the full taxing authority of the issuer. Considered safer; supported by property and income taxes.
- **Revenue bonds:** Backed by the cash flows of a specific project (toll road, airport, hospital). Higher yield; creditworthiness tied to project economics.

Key risk factors for munis: pension obligations (many cities have underfunded pension liabilities), population trends (shrinking tax base), and economic concentration.

---

## 7. Mortgage-Backed Securities (MBS)

MBS are pools of mortgages securitized and sold to investors. The two main types:

- **Agency MBS:** Issued/guaranteed by Fannie Mae, Freddie Mac, or Ginnie Mae. Carry implicit or explicit U.S. government backing; no credit risk, but significant **prepayment risk**.
- **Non-agency MBS:** No government guarantee; exposed to credit risk and prepayment risk.

**Prepayment risk** is the defining challenge of MBS. When rates fall, homeowners refinance — returning principal to investors at the worst time (when they must reinvest at lower rates). This creates **negative convexity** similar to callable bonds. The **CPR (Conditional Prepayment Rate)** measures the annualized prepayment speed.

The **current coupon MBS** spread to Treasuries (typically tracked on Bloomberg) is a key measure of mortgage market stress and Fed MBS purchase appetite.

---

## 8. Bond ETFs

Key bond ETFs and their risk profiles:

| ETF | Index/Focus | Effective Duration | Use Case |
|---|---|---|---|
| AGG | U.S. Aggregate (broad market) | ~6 years | Core bond allocation |
| TLT | 20+ Year Treasuries | ~16–17 years | Long-duration rate play |
| IEF | 7–10 Year Treasuries | ~7–8 years | Intermediate rate exposure |
| TIP | TIPS (inflation-protected) | ~6–7 years | Inflation hedge |
| HYG | High Yield Corporates | ~3–4 years | Credit/yield play |
| LQD | Investment Grade Corporates | ~8–9 years | IG credit exposure |
| MUB | Municipal bonds | ~6 years | Tax-advantaged income |

**Duration risk in bond ETFs:** Unlike individual bonds, ETFs do not mature — duration remains roughly constant as the fund continually rolls into new bonds. TLT holders absorb the full force of rate moves; a 100 bps yield rise translates to roughly a 16–17% NAV decline.

Bond ETFs also carry **premium/discount risk** — during stress events, ETF prices can trade at significant discounts to NAV as liquidity in the underlying bonds deteriorates faster than ETF shares.

---

## 9. How to Trade Bonds

### Direct Bond Purchase

- Retail investors can buy Treasuries commission-free at **TreasuryDirect.gov**.
- Corporate and muni bonds are traded OTC through broker-dealers. Bid-ask spreads are the primary transaction cost — wider for illiquid issues.
- Minimum denominations are typically $1,000–$5,000 face value.

### Bond Futures

Treasury futures are the most efficient vehicle for institutional rate trading:

| Contract | Underlying | Exchange |
|---|---|---|
| ZT | 2-Year T-Note | CME |
| ZF | 5-Year T-Note | CME |
| ZN | 10-Year T-Note | CME |
| ZB | 30-Year T-Bond | CME |
| UB | Ultra T-Bond (25+ yr) | CME |

Futures allow duration management at scale: a hedge fund can reduce portfolio duration by shorting ZN without touching the underlying bonds. The **DV01** (dollar value of a basis point) is the key sizing metric — how many dollars does the position gain or lose for a 1 bps move in yield.

---

## 10. Interest Rate Risk Management

- **Duration targeting:** Portfolio managers set a target duration vs. the benchmark (AGG duration ~6 years). Going shorter than benchmark = defensive; longer = expressing a rate decline view.
- **Barbell vs. bullet:** A barbell holds short and long maturities; a bullet concentrates at one maturity. Barbells have higher convexity; bullets have more predictable duration.
- **Swap overlays:** Interest rate swaps allow duration modification without selling bonds — common for pension funds and insurance companies managing liability-matching.
- **Immunization:** Matching asset duration to liability duration to neutralize rate risk. Used by defined-benefit pension funds.

---

## 11. Bonds vs. Stocks — When to Rotate

Bonds outperform equities when:
- Growth is decelerating or recession imminent (yield curve already inverted)
- Inflation is falling (real yields rising even as nominal yields fall)
- Credit conditions tightening (spreads widening signals risk-off)
- Fed is in a cutting cycle (long bonds benefit most)
- Equity valuations are stretched relative to bond yields (TINA — "there is no alternative" — reverses when 10Y yields > earnings yield)

**The equity risk premium (ERP)** = earnings yield (E/P) minus 10-year Treasury yield. When the ERP compresses to near zero or inverts, bonds become a competitive alternative to equities — historically a headwind for P/E multiples.

---

## 12. Credit Default Swaps (CDS)

A CDS is essentially insurance against a bond default. The **protection buyer** pays a periodic spread (in bps) to the **protection seller**. If the reference entity defaults, the seller compensates the buyer for the loss.

Key uses:
- **Hedging credit exposure** without selling bonds (avoids market impact, preserves relationship with issuer)
- **Expressing a negative view** on credit quality without shorting cash bonds
- **The CDX index** (IG and HY versions) is the synthetic equivalent of credit index exposure — liquid, standardized, and widely traded

CDS spreads often **lead cash bond spreads** — CDS markets respond faster to credit deterioration because they are more liquid.

---

## 13. Credit Spreads as Equity Market Signals

This is the most actionable cross-asset relationship in fixed income for equity traders:

**HY spreads as a leading indicator:**
- HY spreads above 500–600 bps historically signal elevated recession risk and equity downside.
- HY spread compression (tightening below 300 bps) typically accompanies equity bull markets.
- A sudden 50–100 bps HY spread widening over 1–2 weeks, without equivalent Treasury moves, signals credit market stress — watch for equity follow-through.

**IG spreads and financial conditions:**
- IG spread widening raises borrowing costs for corporations, compressing future earnings.
- The **Bloomberg Financial Conditions Index** incorporates credit spreads, equity volatility, and funding rates. Tightening financial conditions (higher readings) support risk assets.

**CDS-cash basis:**
- When CDS spreads diverge significantly from cash bond spreads (the "basis"), it signals technical dislocations — often a leading indicator of broader market stress (as seen in March 2020 and 2008).

**Key levels to watch:**
- **CDX HY Index > 500 bps:** Elevated stress; historically corresponds to equity bear market territory.
- **CDX IG Index > 150 bps:** IG credit under pressure; watch for investment grade downgrades.
- **2s10s < -50 bps and sustained:** Deep inversion; recession within 6–18 months historically.
- **10Y Treasury yield crossing equity earnings yield:** Structural headwind for equity multiples.

---

*Last updated: March 2026 | Investment Council Research*
