# Crypto Security and Self-Custody: A Comprehensive Guide

## Why Self-Custody Matters: Lessons from Exchange Failures

The history of cryptocurrency is punctuated by catastrophic exchange failures that wiped out billions in customer assets. These events are not edge cases — they are recurring proof that the default assumption in traditional finance ("my bank is safe") does not hold in crypto.

**Mt. Gox (2014)** was the defining early disaster. Once handling roughly 70% of all global Bitcoin transactions, Mt. Gox collapsed after a years-long hack drained approximately 850,000 BTC — worth around $450 million at the time and billions at later prices. Customers waited years in bankruptcy proceedings and received partial recoveries only a decade later. The lesson: volume and prominence are not indicators of security.

**Celsius Network (2022)** promised yields of up to 18% on deposited crypto. Under the hood, it was relending customer assets in undercollateralized DeFi positions and to hedge funds with no adequate risk management. When markets turned in mid-2022, Celsius froze withdrawals overnight, trapping approximately $4.7 billion in customer assets. Bankruptcy followed. Customers became unsecured creditors.

**BlockFi (2022)** failed in the wake of FTX's collapse. BlockFi had significant exposure to FTX and its affiliated trading entity Alameda Research. When FTX imploded, BlockFi could not meet obligations. Another custodian, another bankruptcy, another queue of creditors receiving cents on the dollar.

**FTX (2022)** was the largest and most instructive failure. Founded by Sam Bankman-Fried and once valued at $32 billion, FTX was considered among the most reputable exchanges globally. Behind the scenes, customer deposits were being used by Alameda Research for speculative trading and venture investments. When a bank-run-like withdrawal surge hit in November 2022, FTX had an $8 billion hole in its balance sheet. It halted withdrawals within days. Approximately one million creditors were affected. The criminal convictions that followed confirmed what the crypto ethos had always maintained: counterparty risk is real, and exchange balances are not your assets — they are unsecured IOUs.

The throughline across all these failures is identical: customers trusted institutions with custody of assets they could not control. In each case, that trust was not earned.

---

## The Custody Spectrum

Custody of crypto assets exists on a spectrum from maximum convenience to maximum control.

**Exchange custody** is the starting point for most users. Assets sit in exchange-controlled wallets. The user holds a username and password, not cryptographic keys. This is appropriate only for active trading positions — not long-term storage.

**Software wallets** (MetaMask, Exodus, Trust Wallet) are applications that manage private keys on an internet-connected device. The user controls keys, but the attack surface — malware, compromised browsers, phishing — is substantial. Suitable for DeFi interaction and smaller amounts.

**Hardware wallets** are purpose-built physical devices that generate and store private keys in secure chips, isolated from internet-connected systems. Signing transactions happens on-device. The private key never leaves the hardware. This is the baseline for serious self-custody.

**Multisignature setups** require multiple independent keys to authorize a transaction. No single device or location is a single point of failure. Appropriate for larger holdings.

**Institutional custody** (Coinbase Custody, Anchorage Digital, BitGo) offers regulated custody with insurance, compliance infrastructure, and multi-party authorization. Appropriate for entities that cannot or should not manage their own key operations but need better guarantees than a retail exchange.

---

## Hardware Wallet Comparison

### Ledger

Ledger is the most widely distributed hardware wallet brand globally, producing the Nano S Plus, Nano X, and Stax models. Ledger devices use a certified Secure Element chip (the same class used in passports and payment cards) and support thousands of coins and tokens. The companion Ledger Live software is polished and actively maintained.

The critical controversy arrived in May 2023 with the announcement of **Ledger Recover** — an optional subscription service that would split a user's seed phrase into encrypted shards and back them up to third-party identity custodians. The backlash was immediate and intense. While the service was positioned as opt-in, the announcement confirmed that Ledger's firmware architecture had the technical ability to extract seed material from the device — contradicting years of marketing language implying the seed never left. Trust, once questioned, is difficult to restore. Ledger remains a functional, secure device for most users, but the Recover controversy exposed a philosophical gap between Ledger's corporate direction and the expectations of sovereignty-focused users.

### Trezor

Trezor (produced by SatoshiLabs) pioneered the hardware wallet category with the original Model One in 2014. The Model T and newer Model One (2023 revision) are the current offerings. Trezor's defining characteristic is **fully open-source firmware and hardware schematics** — every line of code is auditable by the public, and researchers have done so extensively. There is no Secure Element in older Trezor models, meaning physical attacks by a sophisticated adversary with direct device access are theoretically more feasible — but for the vast majority of threat models, Trezor remains highly secure and philosophically aligned with crypto's open-source ethos.

### Coldcard

Coldcard (by Coinkite) is a Bitcoin-only device and the preferred choice among Bitcoin maximalists and security-oriented users. It features a Secure Element, a physical keypad for PIN entry (rather than touching a connected screen), and is designed for fully **air-gapped operation** — transactions can be signed via microSD card without the device ever connecting to a computer via USB. Coldcard supports PSBT (Partially Signed Bitcoin Transactions), making it the standard choice for multisig setups. It also supports a duress PIN that loads a decoy wallet. The interface is uncompromising — Coldcard is not designed for beginners — but for those holding significant Bitcoin, it is the most hardened consumer option available.

### Passport by Foundation Devices

Passport is an open-source Bitcoin-only hardware wallet with a focus on air-gapped operation and transparency. The device ships with an open-source supply chain and reproducible firmware builds. Passport uses a camera to scan QR codes for transaction signing, eliminating USB entirely. The build quality is notably premium for the hardware wallet category. Foundation Devices publishes its hardware design files publicly, placing Passport alongside Trezor as the most philosophically open products in the space.

### Jade by Blockstream

Jade is Blockstream's open-source hardware wallet, supporting Bitcoin and Liquid Network assets. It is notably less expensive than competitors while maintaining strong security properties. Jade can operate in an air-gapped mode using QR codes and supports a "blind oracle" PIN model where the device PIN verification is partially managed by a Blockstream server — a tradeoff that maintains security but introduces a minor external dependency. For budget-conscious users who want open-source Bitcoin self-custody, Jade is a compelling entry point.

---

## Practical Hardware Wallet Setup

**Initialization:** When setting up a new hardware wallet, initialize it fresh — never accept a device that arrives pre-initialized or with a seed phrase already written in the box. A legitimate hardware wallet will always generate a new seed on first use.

**Seed phrase generation:** The device generates a random seed phrase (12 or 24 words) using its internal random number generator. For Coldcard specifically, you can add dice rolls or card entropy to supplement the device RNG — meaningful for paranoid setups.

**Verification:** Write down the seed phrase on paper immediately. Then wipe and restore the device from the seed to confirm it restores correctly before sending any funds. This verification step is skipped by many users and is non-negotiable.

**Firmware updates:** Update firmware before first use but be cautious with future updates — read release notes, verify firmware signatures, and update only via the official manufacturer process. Never install firmware from unofficial sources.

---

## Seed Phrase Security

A seed phrase (also called a recovery phrase or mnemonic) is a human-readable encoding of your wallet's master private key. Whoever holds the seed phrase controls all assets derived from it, unconditionally and permanently.

**12 vs 24 words:** Both use the BIP39 standard and a wordlist of 2,048 words. A 12-word phrase provides 128 bits of entropy; a 24-word phrase provides 256 bits. Both are computationally unbreakable by brute force with current or foreseeable technology. The 24-word format is preferred for large or permanent holdings.

**The 25th word (passphrase):** BIP39 supports an optional additional passphrase — sometimes called the "25th word" — that modifies the derived wallet entirely. With the same 24-word seed, different passphrases generate completely different wallets with no connection to one another. This provides two meaningful protections: a "$5 wrench attack" mitigation (you can reveal the seed but not the passphrase, exposing only a decoy wallet with small funds) and an additional layer against seed phrase theft. The passphrase must be memorized or stored separately from the seed phrase — losing it means losing access permanently.

---

## Physical Seed Storage

**Paper** is the default and is adequate if stored carefully — away from water, fire, and eyes. Use archival-quality paper and a permanent pen. Lamination helps against moisture.

**Steel plates** are the superior option for long-term storage. Products like Cryptosteel Capsule, Bilodeau Crypto Steel, and Coldbit Steel allow you to stamp or engrave seed words into stainless steel that survives fire at temperatures well above 1,400°F and is impervious to water. These are not optional for serious long-term storage.

**Geographic distribution:** Store seed backups in at least two physically separate locations. A house fire should not be a total loss event. Safe deposit boxes, trusted family properties, and fireproof home safes used in combination provide meaningful redundancy.

**Fireproof safes:** A quality fireproof safe (UL-rated) is appropriate for one copy. It provides fire and basic physical protection but should not be relied on as the sole backup location.

---

## What Not to Do

The most common custody failures are not exotic attacks — they are self-inflicted:

- **Never photograph your seed phrase.** Photos sync to iCloud, Google Photos, and similar services automatically. These platforms are high-value targets for attackers.
- **Never store seed phrases digitally.** Not in notes apps, email drafts, password managers, text files, or any internet-connected system.
- **Never store seed phrases in cloud storage.** Not Dropbox, Google Drive, OneDrive, or any synchronized folder.
- **Never tell people you hold significant crypto.** Social engineering and physical coercion (the "$5 wrench attack") are real threat vectors.
- **Never enter your seed phrase into any website or application.** No legitimate service will ever request your seed phrase.

---

## Multisig Explained

Multisig (multi-signature) setups require M-of-N keys to authorize a transaction. A common configuration is **2-of-3**: three keys exist, and any two are sufficient to spend funds. No single key — and no single device, location, or person — can move funds unilaterally.

**Why this matters:** Multisig eliminates single points of failure. A single hardware wallet lost in a fire, stolen, or compromised no longer means lost funds. An attacker who gains access to one key has nothing actionable.

**Bitcoin multisig tools:**
- **Sparrow Wallet** is a desktop Bitcoin wallet with excellent multisig support, PSBT handling, and deep integration with hardware signers.
- **Specter Desktop** is another desktop coordinator built for multisig with hardware wallets.
- **Casa** offers a managed multisig service with 2-of-3 and 3-of-5 configurations, with Casa holding one key as a recovery aid.
- **Unchained Capital** offers collaborative custody where Unchained holds one of three keys and provides inheritance and recovery services.

**Ethereum and EVM multisig:**
- **Gnosis Safe** (now Safe) is the standard for Ethereum-based multisig, used by DAOs, funds, and serious holders to manage ETH and ERC-20 assets with configurable M-of-N thresholds.

---

## Inheritance Planning for Crypto

Crypto held in self-custody is permanently inaccessible if the holder dies without leaving adequate instructions. This is not hypothetical — billions in Bitcoin are estimated to be permanently lost due to lost keys and deceased holders.

**Dead man's switch:** Services like Covenant or manual timed systems can trigger release of instructions if the holder fails to check in at defined intervals.

**Letter of instruction:** A physical, notarized letter explaining what assets exist, what hardware wallets or multisig setup is in use, and where to find keys or seed phrases (without including them in the letter itself). The letter directs a trusted executor to specific secure locations.

**Trusted executor:** Designate a technically capable person — or a service like Unchained Capital or Casa — who understands the recovery process. The executor does not need to hold the seed phrase in advance; they need to know where it is and how to use it.

---

## Exchange Account Security

For assets legitimately held on exchanges (active trading positions, fiat on-ramps), harden the account:

**Two-factor authentication:** Use an authenticator app (Authy, Google Authenticator, hardware keys like YubiKey). SMS-based 2FA is vulnerable to SIM-swapping attacks — telecom social engineering that redirects your phone number to an attacker's device. SMS 2FA is better than nothing but should be replaced with app-based 2FA wherever possible.

**Withdrawal whitelisting:** Most major exchanges allow you to whitelist withdrawal addresses. Funds can only be withdrawn to pre-approved addresses, with changes requiring a waiting period and email confirmation.

**API key hygiene:** If using API keys for bots or portfolio trackers, create read-only keys where possible. Never create keys with withdrawal permissions unless absolutely required. Rotate keys regularly.

---

## Recognizing Scams

**Phishing:** Fake websites mimicking exchanges or wallet providers, fake emails with login links. Always type URLs directly; use bookmarks for exchange logins. Check SSL certificates.

**Fake support:** No legitimate exchange or hardware wallet company will contact you via Discord, Telegram, or social media DMs to offer support. These are always scams.

**Clipboard hijacking:** Malware that monitors clipboard contents and replaces crypto addresses with attacker-controlled addresses when you paste. Always verify the first and last 6 characters of any address before confirming a transaction.

**Fake hardware wallets:** Tampered hardware wallets sold via Amazon third-party sellers, eBay, or unofficial resellers. Always buy hardware wallets directly from manufacturers. Inspect packaging for tampering.

**Address poisoning attacks:** Attackers send tiny transactions from addresses that visually resemble addresses in your transaction history, hoping you will copy a poisoned address from your history. Always use your address book, never copy from transaction history.

---

## MEV and Front-Running Protection On-Chain

**Maximal Extractable Value (MEV)** refers to profit extracted by block producers (miners or validators) or sophisticated bots by reordering, inserting, or censoring transactions within a block. For users, this manifests as sandwich attacks on DEX trades — a bot detects your pending transaction, front-runs it to move the price, and back-runs it to profit at your expense.

**Private mempools:** Instead of broadcasting transactions to the public mempool (where bots can see and exploit them), private mempool services route transactions directly to block builders. The transaction is invisible to the public until included in a block.

**Flashbots Protect** is the most widely used MEV protection RPC endpoint for Ethereum. By configuring MetaMask or other wallets to use `https://rpc.flashbots.net` as the RPC endpoint, transactions bypass the public mempool and are submitted directly through the Flashbots block builder network, eliminating sandwich attack exposure for most users. MEV Blocker (by CoW Protocol) is a similar service that additionally rebates any MEV back to the user where possible.

For large on-chain trades, using MEV protection is not optional — the cost of ignoring it is measurable slippage imposed by sophisticated extractors running in milliseconds.

---

*This document is part of the Investment Council research knowledge base. It is intended as an educational framework for understanding crypto security principles, not as personalized financial or security advice.*
