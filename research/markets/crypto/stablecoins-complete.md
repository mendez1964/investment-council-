# Stablecoins: Complete Research Framework

## Overview

Stablecoins are blockchain-based assets designed to maintain a peg to a reference value — most commonly the US dollar — while inheriting the programmability and composability of crypto infrastructure. They have grown from a niche settlement layer into a $160B+ asset class that underpins DeFi liquidity, cross-border payments, and institutional crypto participation. Understanding stablecoin mechanics, counterparty risk, and market signals is essential for any serious crypto portfolio framework.

---

## Types of Stablecoins

### 1. Fiat-Backed (Custodial)
The simplest model: a centralized issuer holds fiat currency (or equivalent reserves) in a bank or custodian and mints tokens on a 1:1 basis. Users trust the issuer to hold adequate reserves and honor redemptions. USDT and USDC are the dominant examples. Risk is concentrated in the issuer's creditworthiness, reserve quality, and regulatory standing.

### 2. Crypto-Backed (Overcollateralized)
Users lock cryptocurrency as collateral in excess of the minted stablecoin value. DAI (MakerDAO) pioneered this model. If collateral value falls below a liquidation threshold, the protocol automatically liquidates positions. No single custodian holds assets, but the stablecoin's stability depends on smart contract integrity and the collateral assets' liquidity. These are inherently capital-inefficient — locking $150 of ETH to mint $100 of DAI.

### 3. Algorithmic (Uncollateralized or Undercollateralized)
Stability is maintained purely through algorithmic supply-demand mechanisms, often using a companion volatile token as a shock absorber. Terra/LUNA was the catastrophic case study: when confidence broke in May 2022, the algorithmic backstop entered a death spiral, destroying ~$40B in value in days. Pure algorithmic stablecoins are now widely regarded as structurally unsafe.

### 4. Hybrid Models
Combine elements from the above — partial fiat backing with algorithmic adjustment, or overcollateralized crypto with real-world asset (RWA) exposure. FRAX and the evolved MakerDAO/Sky Protocol represent this category. Hybrids attempt to balance capital efficiency with stability robustness.

### 5. Synthetic / Delta-Neutral
Newer design: create a synthetic dollar by holding a spot crypto position and a corresponding short futures position, so the combined delta is zero relative to USD. Ethena's USDe uses this approach. Yield is generated from funding rates on the short. Not technically backed by dollars at all — backed by a hedged derivatives position.

---

## USDT (Tether)

**Market Position:** Largest stablecoin by supply (~$110B+ as of early 2026), dominant in emerging markets and offshore trading. USDT settles more daily volume than Bitcoin.

**Reserve Composition:** Tether publishes quarterly attestations (not full audits) showing reserves primarily in US Treasury bills (~80%+), with smaller allocations to money market funds, secured loans, Bitcoin, and other assets. The composition has improved substantially since 2021, when reserves included riskier commercial paper.

**Ongoing Controversy:**
- Tether has never completed a full independent audit from a Big Four firm, relying instead on attestations from BDO Italia
- Historical opacity about reserve quality fueled persistent accusations of fractional backing
- Tether settled with the CFTC in 2021 for $41M over false reserve claims
- The New York AG investigation (2019-2021) found Tether had temporarily used customer funds to cover an $850M loss at Bitfinex

**Systemic Risk if Tether Fails:** A Tether collapse would be the most disruptive event in crypto history. USDT is the primary liquidity pair on most exchanges outside the US. A loss of peg would trigger margin calls across leveraged positions, force liquidations, and drain liquidity from every major trading venue simultaneously. The contagion would likely exceed the Terra/LUNA collapse by an order of magnitude. The crypto system has an embedded dependency on Tether that has not been diversified away.

**Risk Assessment:** Despite improvement in reserve quality, the absence of a clean audit and the counterparty concentration in Bitfinex/iFinex create tail risk that cannot be fully priced. Treat USDT holdings above operational needs as a risk concentration.

---

## USDC (Circle)

**Model:** Fully reserved against cash and short-duration US Treasuries. Circle publishes monthly reserve reports audited by Deloitte. USDC is issued under US money transmission licenses and is the preferred stablecoin for regulated US institutions and DeFi protocols that prioritize compliance.

**The SVB Depeg (March 2023):** Circle held approximately $3.3B of USDC reserves in Silicon Valley Bank when it failed. USDC depegged to $0.87 over a weekend as markets feared reserve losses. The peg fully recovered within 48 hours after the FDIC announced it would make SVB depositors whole. This was the clearest real-world test of fiat-backed stablecoin fragility — bank counterparty risk is real even in "fully backed" models.

**Regulatory Compliance Focus:** Circle is pursuing a US banking charter and has cooperated extensively with regulators. USDC is the likely beneficiary of the GENIUS Act framework (see Regulatory section). Blacklisting and address freezing capabilities are built in, which is an operational feature for compliance but a censorship risk for permissionless DeFi.

**Market Position:** ~$45B supply. Dominant in US institutional DeFi, Coinbase ecosystem, and Base network.

---

## MakerDAO / Sky Protocol — DAI and USDS

**DAI Mechanics:** Users deposit collateral (ETH, wBTC, RWA tokens, stablecoins) into Maker Vaults and mint DAI against it. Each vault has a collateralization ratio (typically 150%+); if the ratio breaches the liquidation threshold, a keeper bot liquidates the position. The Peg Stability Module (PSM) allows 1:1 swaps between DAI and approved stablecoins (primarily USDC), which has been critical to maintaining the peg but has made DAI substantially backed by USDC.

**The RWA Pivot:** MakerDAO aggressively shifted toward real-world asset backing — US Treasuries, short-duration bond ETFs, and private credit — managed through entities like Monetalis and BlockTower. By late 2023, RWAs constituted a majority of protocol revenue. This generates genuine yield but introduces legal and counterparty complexity that pure DeFi purists reject.

**USDS Rebrand:** The Sky Protocol rebrand (2024) introduced USDS as the successor to DAI under the broader Sky Ecosystem. USDS incorporates a token freeze capability for regulatory compliance — a meaningful departure from DAI's censorship-resistance ethos. The rebranding has been controversial within the Maker community, with some viewing it as governance capture by RWA-focused stakeholders.

**Risk Profile:** Maker is battle-tested (survived March 2020's ETH crash). Primary risks are smart contract failure, governance attacks, and RWA counterparty defaults. The USDC dependency in the PSM means a USDC failure would impair DAI.

---

## Ethena USDe — Synthetic Dollar

**Design:** USDe is minted by depositing staked ETH (stETH) or BTC as collateral. Ethena simultaneously opens an equivalent short perpetual futures position on derivatives exchanges. The combined position is delta-neutral — gains and losses from price movement cancel out, leaving a synthetic dollar exposure.

**sUSDe Yield Mechanics:** Stakers of USDe receive sUSDe, which accrues yield from two sources: (1) staking rewards from the underlying stETH collateral, and (2) funding rates collected from the short perpetual position. In bull markets, funding rates trend positive (longs pay shorts), generating yields that have historically exceeded 20% APY. This yield is real economic return, not token emissions.

**Why It Is Controversial:**
- If funding rates go persistently negative (shorts pay longs), the protocol bleeds yield and must draw down an insurance fund
- Exchange counterparty risk: collateral is held with derivatives exchanges (Binance, OKX, Bybit, Deribit); an exchange failure could cause capital loss
- LST depeg risk: if stETH depegs significantly from ETH (as occurred in June 2022), the collateral is worth less than the short exposure
- Regulatory ambiguity: it is not a stablecoin in any traditional sense, and its regulatory classification is unresolved

**Funding Rate Risk in Context:** Extended bear markets with crowded short positioning can invert funding rates for weeks. The Ethena insurance fund provides a buffer, but a prolonged period of negative rates without sufficient reserves would force a contraction in USDe supply. This is the primary stress scenario.

**Market Position:** USDe reached ~$6B supply at peak in 2024, establishing itself as the third-largest stablecoin briefly. It demonstrated that yield-bearing synthetic dollars have genuine demand.

---

## Yield-Bearing Stablecoins

**sUSDe (Ethena):** As described above. High yield potential, real economic basis, but exchange and funding rate risk. Not suitable as a primary capital park — treat as a yield-generating position with commensurate risk.

**sDAI (Maker/Sky):** Depositing DAI into Maker's DSR (DAI Savings Rate) generates sDAI. Yield is set by MakerDAO governance and funded by protocol revenue from RWA holdings and vault stability fees. Historically 5-8% in the 2024 rate environment. Safer risk profile than sUSDe; ultimate risk is Maker governance and RWA counterparty.

**USDY (Ondo Finance):** Tokenized yield from short-duration US Treasuries. Ondo holds actual T-bills; USDY holders receive the underlying yield minus fees. Designed for institutional and accredited investors. Represents the "tokenized TradFi" category — risk is essentially sovereign credit risk plus Ondo operational risk. Not accessible to US retail investors.

**General Framework:** Yield-bearing stablecoins do not create yield from nothing. The source of yield must be identifiable: (1) real-world interest income (T-bills, loans), (2) DeFi protocol revenue (liquidation fees, stability fees), or (3) derivatives funding rates. When yield is funded by token emissions or ponzi mechanics, it is not sustainable. Always trace the yield source before allocating capital.

---

## FRAX — Algorithmic Hybrid Evolution

FRAX launched as a fractional-algorithmic stablecoin — partially collateralized by USDC and partially stabilized by the FXS governance token. As Terra/LUNA collapsed, FRAX shifted toward full collateralization (v3 targets 100%+ CR). The protocol has evolved into a DeFi infrastructure layer, with frxETH (liquid staking), Fraxlend (lending), and FraxBP (Curve liquidity). FRAX is a useful case study in protocol pivoting away from algorithmic risk after industry-wide lessons.

---

## Institutional Stablecoins

**PayPal PYUSD:** Issued by Paxos, fully backed by USD deposits and T-bills, available on Ethereum and Solana. PayPal's distribution network is the thesis — potential to onboard mainstream users to stablecoin payments. Regulatory risk is lower than most given PayPal's existing compliance infrastructure. ~$500M supply as of early 2026; adoption has been slower than anticipated.

**Ripple RLUSD:** Launched late 2024. USD-backed, issued on XRP Ledger and Ethereum. Ripple's target is cross-border B2B payments where XRP already has institutional traction. Early supply modest; differentiation thesis depends on XRP network velocity and Ripple's bank/FI relationships.

**Institutional Trend:** Major banks and fintechs are entering stablecoin issuance. JPMorgan's JPM Coin operates on permissioned rails for institutional settlement. The trend toward bank-issued stablecoins accelerates under clear regulatory frameworks — this is the medium-term competitive threat to Tether and Circle.

---

## Regulatory Landscape

**US — GENIUS Act:** The Guiding and Establishing National Innovation for US Stablecoins Act represents the most significant US legislative effort to date. Key provisions: stablecoin issuers must maintain 1:1 liquid reserves (cash, T-bills), obtain federal or state licensing, and comply with AML/KYC requirements. Non-US issuers serving US customers face compliance obligations. This framework would legitimize USDC's model while creating legal exposure for Tether's offshore structure. Status: passed Senate committee in 2025; full passage pending.

**EU — MiCA (Markets in Crypto-Assets):** In force since 2024. Stablecoins (called "e-money tokens" for fiat-pegged) require authorization as electronic money institutions. Issuers must hold liquid reserves, publish white papers, and comply with ongoing reporting. Tether has declined to seek MiCA authorization; Tether trading on EU regulated venues faces phase-out. Circle has pursued MiCA compliance aggressively.

**Regulatory Divergence Risk:** The bifurcation between MiCA-compliant and non-compliant stablecoins creates friction in global liquidity. Offshore venues may fragment from regulated venues, concentrating compliant volume in USDC and reducing Tether's accessible market over time.

---

## Stablecoin Dominance as a Market Signal

**Rising Stablecoin Dominance (Bearish):** When stablecoin market cap as a percentage of total crypto market cap rises, it signals capital rotation out of risk assets into stable stores. Investors are holding cash equivalents, waiting. This is a bearish signal for BTC and altcoins — often precedes or accompanies drawdowns.

**Falling Stablecoin Dominance (Bullish):** When stablecoin dominance falls as a percentage, capital is being deployed into risk assets. This is a classic bull market entry signal. Monitor the USDT.D and USDC.D charts on TradingView as sentiment gauges.

**Stablecoin Supply Growth:** A rising absolute stablecoin supply (independent of dominance) indicates new capital entering the ecosystem — a bullish on-ramp indicator. Stagnant or declining supply suggests reduced inflows.

---

## Portfolio Application

**Parking Capital:** Stablecoins function as a cash equivalent in a crypto portfolio — use during bear markets, high-volatility periods, or when conviction on entry points is low. Prefer USDC for US-regulated environments; USDT for offshore exchange liquidity.

**Yield Generation:** Allocate a portion to sDAI or USDY for risk-adjusted yield superior to money market funds with manageable smart contract or counterparty risk. Treat sUSDe as a higher-yield, higher-risk position — appropriate during bull markets with positive funding, reduce exposure when funding rates trend negative.

**Hedging:** Stablecoins can replace selling crypto by providing a liquid, non-taxable-event (in some jurisdictions) hedge against drawdowns when held in wallets rather than exchanged.

**Depeg Risk Assessment Framework:**
1. Identify the reserve backing (cash, crypto, derivatives, algo)
2. Assess custodian/exchange concentration
3. Review historical stress performance (did it depeg, how far, how fast did it recover)
4. Check redemption mechanism — can you redeem 1:1 directly or only via secondary market
5. Size positions accordingly — diversify stablecoin exposure across at least two issuers

---

## Yield Platforms and Cross-Chain Risks

**Yield Platform Risk:** Protocols like Aave, Compound, Curve, and Morpho offer stablecoin yields via lending and liquidity provision. Risks include smart contract exploits, governance attacks, and oracle manipulation. Never deploy more than a defined risk allocation into any single protocol regardless of yield.

**Cross-Chain Bridging Risk:** Moving stablecoins across chains (Ethereum to Arbitrum, Solana, etc.) via bridges introduces bridge smart contract risk — bridge exploits have resulted in hundreds of millions in losses (Ronin, Wormhole, Nomad). Native issuance (Circle's CCTP for USDC, Tether's native multi-chain USDT) is significantly safer than third-party bridge wrapping. Always prefer native minting/burning over wrapped bridge tokens when available.

---

## Summary Risk Matrix

| Stablecoin | Backing | Custody Risk | Smart Contract Risk | Regulatory Risk | Yield Potential |
|---|---|---|---|---|---|
| USDT | Fiat/T-bills | High (opaque) | Low | High | None native |
| USDC | Fiat/T-bills | Low-Medium | Low | Low | None native |
| DAI/USDS | Crypto + RWA | Medium | Medium | Medium | sDAI 5-8% |
| USDe | Delta-neutral | High (exchanges) | Medium | High | sUSDe 10-25%+ |
| USDY | T-bills | Low-Medium | Low | Low | ~5% |
| PYUSD | Fiat/T-bills | Low | Low | Low | None native |

---

*Last updated: March 2026. Stablecoin supply figures, yields, and regulatory status evolve rapidly — verify current data via DeFiLlama, Coingecko, and issuer attestation pages before making allocation decisions.*
