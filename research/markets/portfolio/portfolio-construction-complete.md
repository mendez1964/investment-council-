# Portfolio Construction: A Comprehensive Reference

## Modern Portfolio Theory

### The Efficient Frontier

Harry Markowitz's 1952 framework established that investors should not evaluate securities in isolation but as components of a portfolio. The efficient frontier is the set of portfolios that maximize expected return for a given level of risk, or equivalently minimize risk for a given level of expected return.

The math rests on two inputs per asset: expected return (μ) and standard deviation (σ). For a two-asset portfolio:

- **Portfolio return:** E(Rp) = w₁·E(R₁) + w₂·E(R₂)
- **Portfolio variance:** σ²p = w₁²·σ₁² + w₂²·σ₂² + 2·w₁·w₂·σ₁·σ₂·ρ₁₂

The term ρ₁₂ (correlation) is the critical insight: when correlation is less than 1.0, combining assets reduces portfolio variance below the weighted average of individual variances. This is the mathematical proof of diversification — you can reduce risk without proportionally sacrificing return.

As assets are added, the expected return of a portfolio is always the weighted average of its components, but the standard deviation falls below the weighted average of its components whenever correlations are imperfect. The minimum variance portfolio sits at the leftmost point of the efficient frontier. The tangency portfolio — where a line from the risk-free rate is tangent to the frontier — represents the maximum Sharpe ratio.

### Risk/Return Tradeoff

The Capital Market Line (CML) extends the Markowitz framework by introducing a risk-free asset. Every investor should hold some combination of the risk-free asset and the market portfolio (tangency portfolio), with the proportion determined by risk tolerance. The slope of the CML is the Sharpe ratio of the market portfolio.

The Capital Asset Pricing Model (CAPM) derives individual security expected returns:
E(Ri) = Rf + βi · [E(Rm) - Rf]

Where Rf is the risk-free rate and [E(Rm) - Rf] is the equity risk premium. Beta measures co-movement with the market — the only risk CAPM says you are compensated for bearing. Idiosyncratic (company-specific) risk can be diversified away and earns no premium in theory.

---

## Key Performance Metrics

### Sharpe Ratio
(Rp - Rf) / σp — excess return per unit of total volatility. The most common risk-adjusted return metric. A ratio above 1.0 is considered good; above 2.0 is exceptional. Limitation: penalizes upside and downside volatility equally.

### Sortino Ratio
(Rp - Rf) / σd — excess return per unit of downside deviation only. More useful for strategies with positive skew (frequent small gains, rare large losses). Better captures investor experience since investors dislike downside volatility, not upside.

### Calmar Ratio
Annualized return / Maximum drawdown — measures return per unit of peak-to-trough loss. Particularly relevant for trend-following and alternative strategies where drawdown duration matters more than volatility. A Calmar above 1.0 means the annual return exceeds the worst drawdown experienced.

### Maximum Drawdown
The largest peak-to-trough decline in portfolio value over a measurement period. Drawdown duration (how long recovery takes) often matters as much as depth. A 50% drawdown requires a 100% subsequent gain to recover — asymmetric math that demands drawdown be taken seriously as a primary risk measure rather than an afterthought.

### Beta
Portfolio sensitivity to market movements. Beta of 1.0 moves in line with the market. Beta of 0.7 means the portfolio typically moves 70% as much as the index. Beta is not fixed — it varies by market regime, sector composition, and leverage. Measured by regressing portfolio returns against benchmark returns.

### Alpha
Return above what CAPM predicts given the portfolio's beta exposure. Positive alpha indicates skill (or exposure to uncompensated factors). Alpha should be calculated net of fees and tax drag to be meaningful. Most active managers produce negative alpha net of costs over long periods.

### R-Squared
The percentage of portfolio return variance explained by the benchmark. An R-squared of 0.95 means 95% of portfolio movement is explained by the index — that portfolio is essentially an expensive index fund. Lower R-squared indicates the manager is doing something genuinely differentiated (though not necessarily better).

### Correlation
Ranges from -1.0 (perfect inverse relationship) to +1.0 (perfect co-movement). Portfolio diversification benefit diminishes as correlations rise. Practical target: asset classes with correlations below 0.5 provide meaningful diversification. Correlations are not stable — they are calm-weather estimates that change dramatically under stress.

---

## Asset Allocation Frameworks

### 60/40 (Stocks/Bonds)
The traditional institutional portfolio. Equities provide growth; bonds provide income and a volatility buffer. Works well when stock/bond correlation is negative (bonds rally when stocks fall). Struggled in 2022 when rising rates caused both to fall simultaneously. Despite criticisms, remains the baseline against which alternatives are measured.

### All Weather Portfolio (Ray Dalio)
Designed to perform across all economic environments defined by two axes: growth rising/falling and inflation rising/falling. Approximate allocation: 30% stocks, 40% long-term bonds, 15% intermediate bonds, 7.5% gold, 7.5% commodities. Uses leverage at the bond level to risk-balance across environments. Strong drawdown characteristics historically but underperforms in pure equity bull markets.

### Permanent Portfolio (Harry Browne)
Equal 25% weights: stocks, long-term government bonds, gold, cash. Each asset thrives in one of four economic regimes (prosperity, recession, inflation, deflation). Extremely simple to maintain. Lower absolute returns than 60/40 historically but with much shallower drawdowns. Appeals to investors who prioritize capital preservation and simplicity.

### Endowment Model (Yale/Swensen)
Diversifies across illiquid alternatives: private equity, venture capital, real estate, natural resources, hedge funds, alongside public equity. Accesses illiquidity premium — investors are compensated for locking up capital. Requires long time horizons, large capital pools, and sophisticated manager selection. The model's success has been partially arbitraged away as capital flooded the strategy.

### Risk Parity
Weight each asset class so it contributes equally to portfolio risk rather than weighting by dollar amount. Bonds have lower volatility than stocks, so risk parity typically requires significant bond leverage to equalize contributions. Results in a more balanced portfolio across regimes than market-cap or dollar-weighted approaches. Criticized for bond dependence when rates rise.

---

## Factor Investing

### The Core Factors

**Value:** Low price relative to fundamentals (P/E, P/B, P/FCF). Historically compensated because value stocks carry higher distress risk that investors demand a premium to bear. Has underperformed since 2008 due to rate compression and intangible asset dominance in growth stocks.

**Momentum:** Recent winners continue outperforming over 3–12 month horizons. Explained by behavioral biases (underreaction, herding) and earnings revision cycles. One of the most robust factors across asset classes and geographies but subject to severe crashes when crowded momentum unwinds.

**Quality:** High return on equity, stable earnings, low debt, strong margins. Quality companies tend to have durable competitive advantages and perform well in downturns. Often described as the defensive factor alongside low volatility.

**Low Volatility:** Low-beta, low-volatility stocks outperform high-volatility stocks on a risk-adjusted basis — contradicting CAPM. Explained by leverage constraints, benchmark hugging, and lottery-ticket preferences among investors.

**Size:** Small-cap stocks have historically outperformed large-caps (the size premium). Much of the premium disappears when controlling for quality — many small-caps are unprofitable. Small-cap quality or small-cap value is a more refined implementation.

### Implementation

Factors can be accessed through ETFs (cheapest, most liquid), factor-tilted index funds, or direct stock selection. Key implementation considerations:

- **Factor timing is unreliable** — factors can underperform for a decade before recovering
- **Diversify across factors** — value and momentum are naturally diversifying (momentum sells what value buys)
- **Transaction costs matter** — momentum requires higher turnover; ensure net-of-cost factor premium survives
- **Crowding risk** — popular factor ETFs can distort factor valuations and exacerbate drawdowns

---

## Portfolio Construction Process

### Position Sizing

Position sizing is the primary risk control mechanism. Common approaches:

- **Equal weight:** Each position is 1/N of the portfolio. Simple, avoids concentration, but treats high-conviction and low-conviction equally.
- **Volatility-scaled:** Size positions inversely to their volatility so each contributes equal dollar risk. A stock with half the volatility gets twice the weight.
- **Kelly criterion:** Size to maximize logarithmic wealth growth given edge and odds. Full Kelly is too aggressive for most applications; fractional Kelly (1/4 to 1/2 Kelly) is common.

A practical discipline: define maximum position size as a percentage of portfolio before entry (often 2–5% for individual stocks, 10–20% for asset classes). This forces pre-commitment to risk limits.

### Sector and Concentration Limits

Concentration limits prevent any single position, sector, or theme from dominating portfolio outcomes. Common institutional limits: no single name exceeds 5–10% of portfolio; no single sector exceeds 25–30%. Factor portfolios often limit factor concentration to avoid pure-play bets on a single driver.

### Correlation Analysis

Before adding a position, estimate its correlation to existing holdings. A highly correlated position adds little diversification benefit and effectively increases concentration in existing exposures. Tools: rolling correlation matrices, correlation heatmaps, principal component analysis (which sources of risk actually explain portfolio variance).

---

## Rebalancing Strategies

### Calendar Rebalancing
Rebalance on a fixed schedule (monthly, quarterly, annually). Simple and systematic. Annual rebalancing is often optimal for tax accounts — balances turnover costs against drift risk. More frequent rebalancing in high-volatility environments captures more mean reversion but generates higher costs.

### Threshold Rebalancing
Rebalance when any asset class drifts more than a defined percentage from target (e.g., ±5%). More responsive to market moves than calendar rebalancing. Can be combined: check thresholds on a regular schedule rather than monitoring continuously.

### Tax Implications
In taxable accounts, rebalancing triggers capital gains. Strategies to minimize tax drag: rebalance using new cash contributions, harvest losses to offset gains, allow drift within bands before forcing trades, use tax-advantaged accounts for higher-turnover factor strategies.

---

## Drawdown Management

A 20% drawdown requires a 25% recovery. A 33% drawdown requires a 50% recovery. A 50% drawdown requires a 100% recovery. This asymmetry means that preserving capital in drawdowns is mathematically more valuable than capturing upside.

**When to hold through a drawdown:** If the thesis is intact, position sizing was appropriate, and the drawdown reflects market-wide selling rather than company-specific deterioration, holding is often correct. The worst investment decision is selling at the bottom of a fundamentally sound position.

**When to cut:** If the thesis has been invalidated, if the drawdown reflects company-specific problems (fraud, competitive disruption, management failure), or if position size is large enough that further losses would impair portfolio-level decision-making.

**Sizing to survive:** Define maximum acceptable loss per position before entry. If a position has a realistic adverse scenario of -40%, size it so that loss represents an acceptable portfolio-level impact (e.g., 1% of total portfolio). This means position size = (Max portfolio loss tolerance) / (Expected worst-case loss per share).

---

## Correlation in Practice

### Why Correlations Break Down in Crashes

Correlations estimated from normal market periods are unreliable in crises. In crashes, correlations across risky assets converge toward 1.0 — everything sells off together as investors deleverage. The diversification benefit of international equities, real estate, and high-yield bonds largely disappears exactly when it is most needed.

### Crisis Alpha

Assets that genuinely provide crisis alpha — returns that are uncorrelated or negatively correlated in equity crashes — are rare and valuable: long-dated government bonds (when inflation isn't the cause of the crisis), gold, certain tail hedge strategies, managed futures (trend-following), and long volatility strategies. These often carry a negative carry cost in normal markets, making them difficult to hold through long bull markets.

---

## Portfolio Stress Testing

### Scenario Analysis
Model portfolio performance under specific scenarios: 2008 Global Financial Crisis, 2020 COVID crash, 1994 bond market rout, 2022 rate shock, 1970s stagflation. Use actual historical return series for each asset class during these periods to estimate portfolio impact.

### Historical Stress Tests
Map current portfolio to historical periods with similar characteristics (valuation, rate environment, factor exposures) and examine how analogous portfolios fared. Not predictive, but surfaces non-obvious vulnerabilities.

### Sensitivity Analysis
Shock individual variables: +200bps in rates, -30% in equities, +50% in oil, credit spread widening to 2008 levels. Examine portfolio P&L response. Identify which single inputs cause the largest losses — those represent concentrated risks that may not be visible in correlation matrices.

---

## Tail Risk Hedging

**Put options:** Direct protection against equity declines. Cost is the primary drawback — paying premium in normal markets creates a consistent drag. Optimal strike selection and rolling strategy significantly affects cost efficiency. Far out-of-the-money puts are cheap individually but provide protection only in severe crashes.

**Gold:** Historically retains value in financial crises and currency debasement scenarios. Zero yield means opportunity cost in high-rate environments. Behaves as a monetary hedge rather than a pure equity hedge — works best when the source of stress is systemic or monetary in nature.

**Managed futures / trend following:** Systematic strategies that go long rising asset classes and short falling ones. Tend to perform well in sustained trending markets (both up and down), providing crisis alpha in prolonged bear markets. Limited benefit in fast, sharp crashes. Tend to have low correlation to equities over long periods.

**Long volatility:** Strategies that profit from spikes in the VIX. Expensive to maintain in low-volatility environments but provide convex payoffs in crashes. Best used as a small allocation (2–5%) that dampens overall portfolio volatility asymmetrically.

---

## Performance Attribution

Separating skill from beta exposure is essential for evaluating whether a portfolio is adding value. The Brinson attribution model decomposes active return into:

- **Asset allocation effect:** Value added/subtracted by over/underweighting asset classes vs. benchmark
- **Security selection effect:** Value added/subtracted by picking securities within each asset class
- **Interaction effect:** Combined impact of allocation and selection decisions

For factor-exposed portfolios, multi-factor regression identifies which factor exposures (market, value, momentum, quality, size) explain returns and what residual alpha remains. A manager claiming alpha who simply has high factor loading on momentum or quality is providing beta at active management prices.

---

## Common Portfolio Mistakes

**Over-diversification:** Owning 50+ stocks without a clear thesis for each dilutes attention and returns toward an expensive index fund. Meaningful diversification is achieved with 15–25 well-chosen positions across low-correlated themes.

**Ignoring correlation:** Adding a third tech stock to two tech stocks does not diversify the portfolio — it increases tech concentration even if the companies differ. True diversification requires genuinely different drivers of return.

**Performance chasing:** Allocating to last year's best-performing asset class buys at peak valuations after most of the move has occurred. Systematic rebalancing forces selling recent winners and buying laggards — the opposite of the emotional impulse.

**Neglecting costs:** A 1% annual fee, 0.5% in transaction costs, and tax drag of 0.5% total 2% per year. Over 20 years, this difference in costs compounds to roughly 35% less wealth. Costs are the only factor in investment returns guaranteed in advance.

**Confusing volatility with risk:** Short-term price fluctuation is not the same as permanent capital loss. Selling during temporary volatility converts paper losses into real ones. True risk is the probability of permanent impairment of purchasing power.

**No rebalancing discipline:** Without a systematic rebalancing process, winning positions grow to dominate the portfolio, creating unintended concentration. The portfolio that looked balanced at inception looks like a single-stock bet five years later.

**Underestimating drawdown duration:** Investors model drawdown depth but not duration. A 30% drawdown that recovers in 6 months is psychologically and financially very different from a 30% drawdown that takes 4 years to recover. Duration tests conviction and can force liquidation at the worst moment.
