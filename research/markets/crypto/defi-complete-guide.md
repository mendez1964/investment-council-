# DeFi — Complete Guide

## What Is DeFi
Decentralized Finance: financial services running on smart contracts with no company, bank, or middleman. Rules are code — they execute automatically, transparently, and for anyone with a wallet.

## Core DeFi Protocols

### Decentralized Exchanges (DEXs)
**Uniswap, Curve, dYdX, Jupiter (Solana)**
- Trade tokens without a centralized exchange
- Automated Market Maker (AMM): liquidity pools replace order books
- Liquidity providers earn fees for depositing assets
- TVL = total assets in pools (key health metric)

### Lending & Borrowing
**Aave, Compound, Maker, Morpho**
- Deposit assets → earn interest
- Post collateral → borrow other assets
- Overcollateralized (150-200%) → safer than TradFi
- Interest rates set algorithmically by supply/demand
- Liquidation risk: if collateral falls below threshold, position auto-liquidated

### Liquid Staking
**Lido (stETH), Rocket Pool (rETH), Jito (Solana)**
- Stake ETH/SOL without 32 ETH minimum or lockup
- Receive liquid token (stETH) usable in other DeFi
- Lido controls ~30% of staked ETH (centralization risk)
- Rocket Pool more decentralized (8 ETH minimum for operators)

### Stablecoins
**USDC, USDT, DAI, USDS, FRAX**
- Fiat-backed (USDC, USDT): centralized, trust the issuer
- Crypto-backed (DAI): overcollateralized, decentralized
- Algorithmic (UST failed 2022): risky, avoid
- Yield-bearing stablecoins: growing sector

## TVL — Total Value Locked
**The primary DeFi health metric:**
- Rising TVL = more capital entering DeFi = bullish
- Falling TVL = capital leaving = bearish
- TVL leaders by chain: Ethereum >> Solana > Arbitrum > BSC > Base

**TVL quality matters:**
- Real TVL: genuine user deposits earning yield
- Mercenary TVL: chasing emissions, leaves when incentives end
- Sustainable TVL: protocol revenue > emissions cost

## DeFi Risk Framework

### Smart Contract Risk
- Unaudited code can be exploited
- Even audited code: "security bug" vs "working as coded" distinction
- Older protocols = more battle-tested = lower risk
- Red flag: protocol with < 6 months live and large TVL

### Liquidation Risk (for borrowers)
- Borrowing against volatile collateral is dangerous
- BTC/ETH collateral with stablecoin loan = manageable
- Altcoin collateral = high liquidation risk in volatile markets

### Oracle Risk
- DeFi uses price feeds (oracles) to determine value
- Oracle manipulation = flash loan attacks
- Chainlink = most trusted oracle network

### Liquidity Risk
- During market stress, DEX liquidity can evaporate
- Slippage on large trades can be severe
- Best liquidity: Uniswap, Curve, major pools only

## Layer 2 DeFi Ecosystem
**Why L2 DeFi is growing:**
- Ethereum L1 fees: $5-50+ per transaction
- Arbitrum/Optimism/Base: $0.01-0.10 per transaction
- Same security as Ethereum, fraction of cost
- Most new DeFi protocols launching on L2 first

**Top L2 ecosystems:**
- **Arbitrum:** Largest L2 TVL, GMX (perps), Aave, Uniswap
- **Base (Coinbase):** Fastest growing, retail-friendly
- **Optimism:** OP Stack used by Base and many others
- **zkSync/Starknet:** ZK-proof based, growing developer adoption

## DeFi Yield Sources
**Legitimate yield sources:**
1. Lending interest (real demand to borrow)
2. Trading fees from liquidity provision
3. Staking rewards (validation services)
4. Protocol revenue sharing

**Unsustainable yield sources:**
1. Token emissions subsidies (yield paid in depreciating tokens)
2. Ponzi mechanics (new depositor pays old depositor)
3. "Points" programs (speculative, may be worth nothing)

**Rule:** If yield source isn't clear, assume it's coming from token inflation.

## DeFi Assessment Checklist
For any DeFi protocol:
- [ ] Smart contract audited? By whom? Results public?
- [ ] How long running without major exploit?
- [ ] TVL trend: growing or declining?
- [ ] Token emissions: what % of yield is paid in native token?
- [ ] Protocol revenue vs token inflation: sustainable?
- [ ] Team: anonymous or doxxed? Track record?
- [ ] Governance: who controls upgrades? Timelock?
- [ ] Insurance available (Nexus Mutual, InsurAce)?

## Key DeFi Metrics to Monitor
- **Total DeFi TVL** (DeFiLlama.com — free, best source)
- **Protocol revenue** (Token Terminal — fees/revenue ratio)
- **Stablecoin supply** (growing = more capital entering DeFi)
- **ETH gas fees** (high = DeFi demand high; Ultrasound.money)
- **L2 transaction volume** vs Ethereum L1 (scaling adoption)
