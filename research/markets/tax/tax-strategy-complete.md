# Investment Tax Strategy — Complete Reference

*For use by the Investment Council AI research platform. This document covers core tax concepts relevant to investment decisions. Always consult a qualified CPA or tax attorney for advice specific to your situation.*

---

## 1. Capital Gains Basics

### Short-Term vs. Long-Term Rates

The IRS distinguishes between two holding periods for capital assets:

- **Short-term gains:** Assets held 12 months or fewer. Taxed as ordinary income at your marginal bracket — up to 37% for high earners.
- **Long-term gains:** Assets held more than 12 months. Taxed at preferential rates: 0%, 15%, or 20%, depending on taxable income.

The one-year threshold is calculated precisely from trade date to trade date. Selling one day early collapses a 20% tax bill into a 37% one on the same gain — a costly mistake on large positions.

### 2024 / 2025 Long-Term Capital Gains Brackets

**2024 (filed in 2025):**

| Rate | Single | Married Filing Jointly |
|------|--------|------------------------|
| 0%   | Up to $47,025 | Up to $94,050 |
| 15%  | $47,026 – $518,900 | $94,051 – $583,750 |
| 20%  | Over $518,900 | Over $583,750 |

**2025 (filed in 2026):**

| Rate | Single | Married Filing Jointly |
|------|--------|------------------------|
| 0%   | Up to $48,350 | Up to $96,700 |
| 15%  | $48,351 – $533,400 | $96,701 – $600,050 |
| 20%  | Over $533,400 | Over $600,050 |

Brackets are inflation-adjusted annually. Note that state taxes are additive — California, for example, taxes all capital gains as ordinary income at up to 13.3%.

### Net Investment Income Tax (NIIT)

A 3.8% surtax applies to the lesser of net investment income or the amount by which modified adjusted gross income (MAGI) exceeds:

- $200,000 (single)
- $250,000 (married filing jointly)

Net investment income includes capital gains, dividends, interest, rents, and passive income. It does not include wages or active business income. The effective top federal rate on long-term gains for high earners is therefore **23.8%** (20% + 3.8%).

---

## 2. Tax Loss Harvesting

### Mechanics

Tax loss harvesting is the practice of selling positions at a loss to generate a capital loss that offsets capital gains elsewhere in the portfolio. Capital losses first offset capital gains dollar-for-dollar. If losses exceed gains, up to **$3,000 of net losses** can offset ordinary income per year. Unused losses carry forward indefinitely.

**Example:** You have $40,000 in realized short-term gains from options trading. You harvest $40,000 in losses from underperforming positions. Net taxable gain: $0. At a 35% effective rate, you deferred approximately $14,000 in taxes.

### How to Execute

1. Identify positions with unrealized losses, particularly near year-end.
2. Sell the losing position to realize the loss.
3. Immediately reinvest in a similar (but not substantially identical) security to maintain market exposure.
4. Track the cost basis and holding period of the replacement security.
5. After the wash sale window clears (31+ days), you may repurchase the original security if desired.

### The Wash Sale Rule — In Full Detail

Under IRC Section 1091, a wash sale occurs when you sell a security at a loss and, within the period beginning **30 days before** and ending **30 days after** the sale date, you buy a **substantially identical** security. The 61-day window is symmetric around the sale.

**Consequence:** The loss is disallowed. It is not permanently lost — it is added to the cost basis of the replacement security, deferring the loss until the replacement is eventually sold. However, if the replacement is held inside a retirement account, or gifted, the deferred loss may be permanently lost.

**Substantially Identical Securities**

The IRS has not issued an exhaustive definition, but the following are generally treated as substantially identical:

- The same stock (buying back AAPL within 30 days of selling AAPL at a loss)
- Convertible bonds or preferred stock of the same issuer that is convertible into the stock sold
- Options or warrants on the same stock (see Section 5)
- Different share classes of the same fund (e.g., Vanguard Investor vs. Admiral shares of the same fund)

**What is generally NOT substantially identical:**

- Stock of a different company in the same industry (selling Intel, buying AMD)
- An ETF tracking a similar but different index (selling SPY, buying IVV is debated; selling SPY, buying VTI is safer)
- A mutual fund and an ETF with similar holdings but different structures
- Two ETFs tracking different indices (selling QQQ, buying VGT)

**Safe ETF Substitutes (commonly used):**

| Sold | Replacement Candidate | Index Difference |
|------|-----------------------|-----------------|
| SPY (S&P 500) | VTI (Total Market) | Broader index |
| QQQ (Nasdaq 100) | VGT (Tech sector) | Sector tilt |
| GLD (Gold ETF) | IAUM (iShares Gold) | Similar but different sponsor — use caution |
| AGG (US Agg Bond) | BND (Vanguard Total Bond) | Slightly different composition |

Note: Swapping between two ETFs that track the exact same index (e.g., SPY and IVV both track the S&P 500) is at risk of being treated as substantially identical. Use funds tracking genuinely different indices.

---

## 3. Wash Sale Traps with Options

Options create wash sale complexity that trips up many investors.

### Selling Stock at a Loss, Then Buying Calls

If you sell stock at a loss and within the 30-day window purchase a call option on the same stock, the IRS treats the call as an acquisition of substantially identical property. The loss is disallowed. The call gives you the right to reacquire the stock — that's enough for the wash sale rule to trigger.

**Example:** You sell 500 shares of MSFT at a $15,000 loss on March 1. On March 10, you buy MSFT call options. Wash sale triggered. The $15,000 loss is added to the basis of the options.

### Put Selling Complications

Selling a cash-secured put on a stock you just sold at a loss is also potentially a wash sale. A short put obligates you to buy the stock at the strike price — the IRS may consider this an acquisition of a contract to acquire substantially identical stock. The risk is heightened when the put is deep in the money.

The safe path: wait the full 31 days before engaging in any long or short options position on the same underlying.

### The Retirement Account Trap

If you sell a security at a loss in a taxable account and repurchase within 30 days inside a Traditional IRA or Roth IRA, the wash sale rule is triggered and the loss is **permanently disallowed** — it cannot be added back to the IRA's basis. This is one of the most costly wash sale errors.

---

## 4. Retirement Account Tax Advantages

### Traditional IRA

- **2024 / 2025 contribution limit:** $7,000 ($8,000 if age 50+)
- **Deductibility:** Fully deductible if you (and your spouse) have no workplace retirement plan. Phases out with MAGI between $77,000–$87,000 (single) and $123,000–$143,000 (MFJ) in 2024 if covered by a workplace plan.
- **Growth:** Tax-deferred. Distributions taxed as ordinary income.
- **RMDs:** Required beginning at age 73.

### Roth IRA

- **2024 / 2025 contribution limit:** Same as Traditional ($7,000 / $8,000)
- **Income limits:** Phases out $146,000–$161,000 (single), $230,000–$240,000 (MFJ) in 2024.
- **Growth:** Tax-free. Qualified distributions are never taxed.
- **No RMDs** during owner's lifetime.

### 401(k)

- **2024 employee deferral limit:** $23,000 ($30,500 if age 50+)
- **2025 employee deferral limit:** $23,500 ($31,000 if age 50+)
- **Total limit including employer contributions:** $69,000 / $76,500 (2024)
- Traditional (pre-tax) or Roth 401(k) options are common.

### Backdoor Roth IRA

High earners above the Roth income limits can contribute to a non-deductible Traditional IRA and then immediately convert to Roth. Key considerations:

1. File Form 8606 to track the non-deductible basis.
2. The **pro-rata rule** applies if you have other pre-tax IRA funds — the conversion is partially taxable based on the ratio of pre-tax to total IRA assets.
3. A clean backdoor Roth requires rolling all existing pre-tax IRAs into a 401(k) first or having zero pre-tax IRA basis.

---

## 5. Tax-Advantaged Asset Location

Asset location — placing the right investments in the right account type — can meaningfully improve after-tax returns without changing the portfolio itself.

### Core Principles

- **Tax-deferred accounts (Traditional IRA, 401k):** Best for high-turnover strategies, actively managed funds, bonds, and REITs — assets that generate ordinary income or frequent short-term gains.
- **Tax-free accounts (Roth IRA):** Best for highest-growth assets. A small-cap or growth position that triples is worth dramatically more in a Roth than in a taxable account. Also ideal for dividend stocks with high yields.
- **Taxable accounts:** Best for buy-and-hold positions in tax-efficient ETFs, municipal bonds (already tax-exempt), and assets you may need to harvest losses from.

### Practical Placement Guide

| Asset Type | Preferred Location |
|------------|-------------------|
| High-yield bonds | Tax-deferred (Traditional IRA / 401k) |
| REITs | Tax-deferred |
| Short-term options strategies | Tax-deferred or Roth |
| Index ETFs (buy and hold) | Taxable (very tax-efficient) |
| High-growth individual stocks | Roth IRA |
| Dividend growth stocks | Roth IRA |
| Municipal bonds | Taxable (tax-exempt interest) |
| International stocks (foreign tax credit) | Taxable (credit is lost in IRA) |

---

## 6. Qualified Dividends vs. Ordinary Dividends

**Qualified dividends** are taxed at the same preferential rates as long-term capital gains (0%, 15%, 20%). To qualify:

- The dividend must be paid by a U.S. corporation or a qualified foreign corporation.
- You must have held the stock for more than 60 days during the 121-day period surrounding the ex-dividend date (91 days for preferred stock).

**Ordinary dividends** are taxed as ordinary income at marginal rates. These include:

- Dividends from REITs (though a 20% deduction may apply under Section 199A)
- Dividends from money market funds and bond funds
- Dividends on shares held short-term
- Dividends on short-sold shares (payments in lieu — always ordinary income)

Most ETF dividends from broad equity funds are largely qualified. Check the fund's annual 1099-DIV breakdown to confirm the qualified percentage.

---

## 7. Options Tax Treatment

### Standard Options (Equity Options)

Options on individual stocks and non-broad-based ETFs are taxed on a short-term / long-term basis like stock:

- Gains on options held 12 months or fewer: short-term, taxed as ordinary income.
- Options are rarely held long enough to qualify for long-term rates.
- **Assignment:** If a call is exercised against you (covered call), the premium received is added to the strike price to calculate your proceeds. If a put you sold is exercised, the premium reduces your cost basis on the stock you're forced to buy.

### Section 1256 Contracts — The 60/40 Rule

Broad-based index options (SPX, NDX, RUT), futures contracts, and certain foreign currency contracts are classified as Section 1256 contracts and receive preferential tax treatment regardless of holding period:

- **60% of gains are treated as long-term, 40% as short-term** — even if the position was open for only one day.
- At a combined 23.8% long-term / 40.8% short-term rate (top brackets), the blended Section 1256 rate is approximately **26.8%** — meaningfully below the 40.8% on regular short-term gains.
- Section 1256 contracts are **marked to market** at year-end — open positions are treated as if sold on December 31.
- Losses on Section 1256 contracts can be carried back up to three years against prior Section 1256 gains.

SPY options (not a broad-based index) are taxed as standard equity options. SPX options (cash-settled, broad-based) qualify for Section 1256. This is a key distinction for active options traders.

---

## 8. Cryptocurrency Tax Rules

The IRS treats cryptocurrency as property, not currency. Every taxable event must be reported.

### What Triggers a Taxable Event

- Selling crypto for fiat currency
- Trading one crypto for another (crypto-to-crypto is a taxable exchange)
- Using crypto to purchase goods or services
- Receiving mining rewards, staking income, or airdrops

### Cost Basis Methods

- **FIFO (First In, First Out):** The IRS default. The oldest coins are sold first. In a rising market, this maximizes long-term treatment but also maximizes gains.
- **Specific Identification:** You designate which lots to sell, allowing you to minimize gains or maximize losses. Must be documented contemporaneously and some exchanges may not support this.
- **HIFO (Highest In, First Out):** A specific ID strategy that sells highest-cost lots first to minimize gain recognition.

### Staking and Airdrops

- Staking rewards are taxable as ordinary income at fair market value when received, per IRS Revenue Ruling 2023-14.
- The cost basis of staking rewards is the FMV at receipt. A subsequent sale of the rewards triggers a separate capital gain or loss.
- Airdrops are taxable as ordinary income when received and in your control. If tokens have no market value at receipt, income is recognized when first sold.

---

## 9. Estate Planning Basics for Investors

### Step-Up in Basis

Assets held until death receive a step-up in basis to their fair market value on the date of death (or the alternate valuation date). Decades of unrealized gains are permanently erased. This makes holding highly appreciated, tax-efficient positions (rather than harvesting gains) a deliberate strategy for long-term holders who don't need the liquidity.

**Example:** Shares bought for $10,000 worth $500,000 at death. Heirs inherit with a $500,000 basis. The $490,000 gain was never taxed.

### Gifting Appreciated Shares

Donating appreciated securities directly (rather than selling and donating cash) avoids capital gains tax entirely while generating a charitable deduction for the full fair market value. This is almost always superior to selling shares and donating the after-tax proceeds.

**Carryover basis for gifts:** When gifting appreciated shares to another person (not a charity), the recipient takes your original cost basis. This is useful for gifting to family members in lower tax brackets who can sell with less tax impact.

### Donor-Advised Funds (DAFs)

A donor-advised fund allows you to:

1. Contribute appreciated securities in one year and take the full charitable deduction immediately.
2. Invest the DAF assets to grow tax-free.
3. Recommend grants to charities over time at your own pace.

DAFs are ideal for "bunching" charitable deductions into a high-income year, or for donating a single highly appreciated position while spreading actual giving over years.

---

## 10. Working with a Tax Professional

### When You Need a CPA

If your investment activity includes any of the following, professional tax guidance is not optional — it is cost-justified:

- Active options trading with complex wash sale exposure
- Cryptocurrency transactions across multiple exchanges or years
- Backdoor Roth conversions with existing IRA assets
- Exercise of employer stock options (ISOs or NQSOs)
- Significant realized gains or losses requiring multi-year planning
- Estate planning with appreciated assets

### What to Bring

- Year-end 1099-B and 1099-DIV from all brokerages
- Cost basis documentation for positions transferred between brokerages
- Records of all cryptocurrency transactions (exchange exports or tax software exports)
- Retirement account contribution and conversion records (Form 5498)
- Prior year carryforward losses (Schedule D, Part III)

### Tax Software vs. CPA

Tax software (TurboTax, H&R Block) handles straightforward brokerage 1099s adequately. Engage a CPA or tax attorney when positions involve ambiguity, multi-year planning, or amounts where a mistake costs more than the professional fee. A good CPA is not an expense — for active investors, they typically pay for themselves many times over.

---

*Last updated: March 2026. Tax law is subject to change; verify brackets and limits against current IRS publications (IRS.gov) and consult a qualified tax professional before making decisions.*
