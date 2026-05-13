# Macroeconomics & Fed Policy — Complete Reference for AI Investment Analysis

*Context document for AI analyst use. Dense, signal-oriented, asset-class aware.*

---

## 1. Federal Reserve Policy

### Structure and Mandate

The Federal Reserve operates under a **dual mandate**: price stability (target 2% inflation) and maximum employment. The Federal Open Market Committee (FOMC) meets 8 times per year to set the federal funds rate — the overnight lending rate between banks. All rate decisions flow through this rate to the broader economy via the transmission mechanism.

**Key FOMC outputs:**
- **Rate decision** — hold, hike, or cut; communicated in basis points (25bp = 0.25%)
- **Statement** — language shifts are as important as the rate itself; hawkish vs. dovish tone moves markets
- **Press conference** — Chair's comments on trajectory, data dependency, and risk balance
- **Summary of Economic Projections (SEP)** — quarterly; includes the dot plot

### The Dot Plot

The dot plot shows each FOMC member's anonymous projection for the appropriate federal funds rate at year-end for the current year, next two years, and the long run. Markets trade the **gap between current dot plot median and fed funds futures pricing**. When futures price in more cuts than the dot plot implies, markets are "dovish of the Fed." When the dot plot is more aggressive than futures, it signals hawkish surprise risk.

**Signals traders watch:**
- Shift in median dot (e.g., from 3 cuts projected to 2 cuts = hawkish surprise)
- Dispersion narrowing or widening (more consensus = more conviction)
- Long-run dot drift higher = structural shift in neutral rate assumptions

### Quantitative Easing (QE) and Quantitative Tightening (QT)

**QE:** The Fed purchases Treasuries and agency MBS to inject reserves, suppress long-end yields, and stimulate risk appetite. Asset prices rise as the risk-free rate compresses and liquidity floods markets. QE expands the Fed balance sheet.

**QT:** The Fed allows bonds to mature without reinvestment (passive QT) or actively sells (rare). QT drains reserves, tightens financial conditions, and puts upward pressure on long-end yields. Currently the primary tool for balance sheet normalization post-COVID.

**Balance sheet size matters:** A larger balance sheet correlates with elevated equity multiples. Balance sheet contraction is a headwind for P/E expansion. As of 2025-2026, the Fed has reduced its balance sheet from ~$9T peak to ~$6.7T. The floor is debated — "ample reserves" is the target, not a specific number.

**Asset class impact of QT:**
- Bonds: upward yield pressure, especially at long end
- Equities: P/E compression pressure; reduces the TINA ("There Is No Alternative") effect
- Real estate: higher mortgage rates, cap rate expansion
- Dollar: mild strength as USD liquidity is removed globally

---

## 2. Yield Curve Dynamics

### Shape Interpretation

| Shape | Definition | Implication |
|---|---|---|
| Normal (upward-sloping) | Long rates > short rates | Growth expected, normal risk premium |
| Flat | Short ≈ long rates | Uncertainty; late-cycle |
| Inverted | Short rates > long rates | Recession signal; tight monetary policy |
| Bear steepener | Both rise, long faster | Inflation fears or fiscal stress |
| Bull steepener | Both fall, short faster | Fed cutting cycle beginning |
| Bear flattener | Both rise, short faster | Fed hiking aggressively |
| Bull flattener | Both fall, long faster | Flight to safety, growth fears |

### The 2s10s Spread

The 2-year minus 10-year Treasury spread (2s10s) is the most-watched recession indicator. **Inversions have preceded every U.S. recession since 1955**, though with variable lags (6–24 months). The signal is **sustained inversion**, not brief dips.

**Historical examples:**
- 2006–2007: inverted deeply before GFC; S&P peaked ~18 months after initial inversion
- 2019: briefly inverted, COVID disrupted the signal
- 2022–2023: most inverted since 1981 (~110bp); disinflation + soft landing delayed recession

**Traders also watch:**
- **3m10y spread** (Fed's preferred recession model input — more statistically reliable short-term)
- **5s30s** (long-end curve steepness; risk premium and inflation expectations)
- **Real yield curve** (TIPS-derived) — separates growth expectations from inflation premium

### Why the Yield Curve Inverts

The Fed raises short rates faster than the market prices long-term growth. Long rates anchor on expected future rates and growth. When the market believes the Fed is hiking into a slowdown, long rates fall below short rates. The inversion itself tightens financial conditions (banks borrow short, lend long — net interest margin compression → reduced lending).

---

## 3. Inflation Mechanics

### CPI vs. PCE

| Metric | Weights | Fed preference |
|---|---|---|
| CPI (Consumer Price Index) | Fixed basket; shelter-heavy (~33%) | Market and political attention |
| PCE (Personal Consumption Expenditures) | Substitution-adjusted; broader | **Fed's official target** |
| Core (ex-food and energy) | Strips volatile components | Policy-setting focus |
| Headline | All items included | Political and consumer reality |

**PCE typically runs 30–50bp below CPI** due to basket composition and weighting methodology. The Fed targets 2% PCE. CPI at 2.5% is roughly consistent with PCE near 2%.

### Supercore Inflation

**Supercore = Core Services ex-Housing** (Fed Chair Powell's 2022-era focus). This isolates labor-driven inflation and is the stickiest component. Wages feeding into services prices (haircuts, medical, dining) — this is the last mile of disinflation. Watch Employment Cost Index (ECI) and average hourly earnings as leading indicators.

### Inflation Expectations

**TIPS breakeven rates** = nominal Treasury yield minus TIPS real yield. The 5-year and 10-year breakevens are forward-looking inflation expectations.

- 5Y5Y forward breakeven: inflation expectations 5 years from now over the following 5 years — the Fed's preferred long-term expectations gauge
- Breakevens de-anchoring above 2.5–3% = policy credibility risk, forces more hawkish Fed response
- Inflation expectations affect bond yields independently of current inflation prints

**University of Michigan and NY Fed consumer surveys** measure near-term expectations and influence wage bargaining behavior, making them self-fulfilling.

---

## 4. GDP and Economic Cycles

### Expansion and Contraction

A technical recession = 2 consecutive quarters of negative real GDP growth. The NBER (official arbiter) uses a broader definition including depth, breadth, and duration across employment, income, spending, and production.

**GDP components (expenditure approach):**
- **C** (consumption, ~70%): driven by employment and consumer confidence
- **I** (investment, ~15–18%): volatile; leads the cycle
- **G** (government spending): countercyclical in downturns (fiscal stimulus)
- **NX** (net exports): DXY strength = headwind for exports

### Leading vs. Lagging Indicators

| Type | Examples | Timing |
|---|---|---|
| Leading | ISM PMI, building permits, yield curve, equity prices, consumer expectations | Turn before economy |
| Coincident | Nonfarm payrolls, industrial production, real personal income | Move with economy |
| Lagging | Unemployment rate, CPI, corporate profits | Confirm after turn |

### PMI (Purchasing Managers' Index)

- Above 50 = expansion; below 50 = contraction
- **Manufacturing PMI** (ISM Mfg) leads industrial activity by 1–3 months
- **Services PMI** (ISM Services) covers ~80% of the economy; more important for employment
- New Orders sub-index leads the headline by 1–2 months — the most forward-looking PMI component
- Global PMI divergences drive currency and equity rotation

### Jobs Data

**Nonfarm Payrolls (NFP):** Monthly, first Friday. Most market-moving U.S. data point. Headline jobs + revisions + average hourly earnings + participation rate.

**JOLTS (Job Openings and Labor Turnover Survey):** Quits rate = worker confidence. Openings-to-unemployed ratio measures labor market tightness. Leading the NFP by several months.

**Initial jobless claims:** Weekly; early-cycle recession signal. Sustained rise above 300K is a warning.

**Sahm Rule:** When the 3-month moving average of the national unemployment rate rises by 0.50pp or more relative to its low during the previous 12 months, a recession has typically started. Real-time recession signal.

---

## 5. Interest Rate Impact on Asset Classes

### Equities

**Rate rises = multiple compression (P/E contraction).** The discount rate applied to future earnings rises. Growth stocks (long duration assets) hit hardest because their cash flows are far in the future. Value stocks and financials (banks benefit from higher NIM) are relatively more resilient.

**Fed model:** Earnings yield (E/P) vs. 10-year Treasury yield. When risk-free rates rise, equities become comparatively less attractive. Equity risk premium compression.

### Bonds

**Inverse price-yield relationship:** When rates rise, existing bond prices fall. Duration measures sensitivity. A 10-year bond has ~8–9 years of duration — a 1% rate rise causes ~8–9% price decline.

**Long-duration Treasuries (TLT):** The most sensitive. Used as a recession hedge — when growth fears spike, Treasuries rally as rates fall.

**Investment grade and high yield credit:** Spread widening (credit deterioration) compounds rate risk in a risk-off environment.

### Real Estate

**Cap rate expansion:** As risk-free rates rise, required returns on real estate rise, compressing asset values. REITs are particularly rate-sensitive. **Mortgage rates track the 10-year Treasury** more than the fed funds rate — the Fed cutting short rates does not automatically lower mortgage rates if term premium or inflation expectations remain elevated.

### Dollar (DXY)

**Rate differentials** are the primary driver of USD direction. Higher U.S. rates relative to foreign rates attract capital flows into USD-denominated assets, strengthening the dollar. The Fed's rate path relative to ECB, BOJ, BOE drives EUR/USD, USD/JPY, and GBP/USD.

---

## 6. Dollar Strength and Weakness Cycles

### DXY Basics

The DXY index measures USD against a basket: EUR (57.6%), JPY (13.6%), GBP (11.9%), CAD (9.1%), SEK (4.2%), CHF (3.6%). Heavy EUR weighting means EUR/USD is the primary DXY driver.

### Global Impact of Dollar Cycles

**Strong dollar (DXY rising):**
- U.S. multinational earnings headwind (overseas profits worth less in USD)
- Emerging market stress: EM countries with USD-denominated debt face higher debt service burdens
- Commodities priced in USD fall in price (oil, gold suppressed in USD terms)
- Safe haven flows reinforce strength in risk-off environments

**Weak dollar (DXY falling):**
- EM outperformance: debt service eases, capital flows to higher-yielding EM assets
- Commodities rally in USD terms
- U.S. multinational earnings tailwind
- Gold tends to rally strongly — historically inverse correlation with DXY

**Key signal:** Real effective exchange rate (REER) overvaluation/undervaluation vs. purchasing power parity. Extended DXY strength historically mean-reverts, often triggering broad EM/commodity rallies.

---

## 7. Geopolitical Risk and Markets

### Risk Premium Framework

Geopolitical shocks inject a **risk premium** into affected assets. Markets price uncertainty (unknown outcomes) differently from risk (known probabilities). "Buy the rumor, sell the news" applies to anticipated escalations.

**Typical geopolitical risk asset responses:**
- **Oil/energy:** Supply disruption fears spike crude (WTI, Brent); energy equities follow
- **Gold:** Primary safe haven; rises on uncertainty, conflict escalation, dollar weakness
- **Treasuries:** Flight to safety; yields fall as capital flees risk assets
- **Defense equities:** Direct beneficiary of increased military spending
- **EM equities:** Risk-off selloff; proximity to conflict compounds losses
- **Commodities:** Sanctions on key producers (Russia = wheat, natural gas; Middle East = oil) create supply shocks

### Geopolitical Risk Index (GPR)

Measured by frequency of geopolitical risk mentions in major newspapers. Spikes correspond to equity volatility and commodity price dislocations. Persistent elevated GPR suppresses capex and business investment.

**Historical markers:**
- Gulf War 1990–91: Oil shock, brief recession
- 9/11: Equity markets closed 4 days; VIX spike; gold/Treasuries bid
- Russia-Ukraine 2022: European energy crisis; natural gas to record highs; EUR/USD fell to parity
- Middle East escalation cycles: Oil risk premium repricing; USD safe haven bid

---

## 8. Fiscal Policy vs. Monetary Policy

### Mechanisms

| Dimension | Monetary Policy | Fiscal Policy |
|---|---|---|
| Controlled by | Federal Reserve (independent) | Congress + Executive |
| Tools | Interest rates, QE/QT, forward guidance | Spending, taxation, debt issuance |
| Speed | Fast (meeting-to-meeting) | Slow (legislative process) |
| Transmission | Credit costs, asset prices, dollar | Direct income/spending injection |

### Fiscal Dominance Risk

When government debt levels become so large that the central bank feels pressure to keep rates low (to manage debt service costs), monetary policy independence is compromised. Markets watch:
- **Debt/GDP ratio:** U.S. now above 120%; structural deficit spending persists
- **Treasury supply:** Heavy issuance puts upward pressure on long-end yields independently of Fed policy
- **Term premium:** Compensation investors demand for holding long duration; rising term premium = fiscal credibility stress

### Interaction Effects

Fiscal stimulus during monetary tightening is contradictory — the Fed hikes while Congress spends, partially offsetting each other. This dynamic characterized 2022–2024: aggressive Fed hiking but large fiscal deficits cushioned the economy, contributing to the "soft landing."

**Bond vigilante risk:** If investors demand higher yields to absorb Treasury supply, long rates rise beyond the Fed's intent, tightening financial conditions. UK gilt crisis (September 2022) was a live example of fiscal credibility breakdown.

---

## 9. Key Signal Checklist for Macro Analysis

**Monthly calendar priorities (market impact order):**

1. **CPI / PCE release** — inflation trajectory; drives rate expectations
2. **NFP (Nonfarm Payrolls)** — labor market health; Fed dual mandate input
3. **FOMC meeting** — rate decision + statement + press conference + dot plot (quarterly)
4. **ISM Manufacturing / Services PMI** — economic momentum; new orders sub-index
5. **GDP advance estimate** — quarterly; large revision risk
6. **JOLTS** — labor market leading indicator; quits rate
7. **Initial Jobless Claims** — weekly; early recession signal
8. **Retail Sales** — consumer spending health; 70% of GDP
9. **Housing data** — starts, permits, existing sales; rate sensitivity barometer
10. **University of Michigan / Conference Board Consumer Confidence**

**Real-time market signals:**
- Fed funds futures (CME FedWatch) — implied probability of rate moves at each meeting
- 2s10s spread — recession timeline signal
- 10-year breakeven — inflation expectations
- Investment grade / high yield credit spreads — risk appetite
- VIX — near-term equity uncertainty
- DXY — dollar trend; EM and commodity implications
- Gold / USD correlation — risk-off intensity

---

*Last updated: March 2026. Sources: Federal Reserve publications, BLS, BEA, ISM, CME Group, NBER.*
