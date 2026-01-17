# 3Eyes FateBox: Provably Fair On-Chain Lootboxes for SPL Token Communities

**Version 1.0 | January 2026**

---

## Abstract

3Eyes FateBox is a multi-tenant, Solana-based lootbox gambling platform that enables any SPL token project to launch provably fair gambling experiences for their community. Built on verifiable randomness (Switchboard VRF) and self-custodial smart contracts, the platform eliminates the trust issues inherent in traditional online gambling while creating sustainable value for the $3EYES token ecosystem.

This whitepaper outlines the technical architecture, economic model, and value proposition for both project creators and the $3EYES token holders who power the platform.

---

## Table of Contents

1. [The Problem](#the-problem)
2. [The Solution](#the-solution)
3. [Platform Architecture](#platform-architecture)
4. [$3EYES Token Economics](#3eyes-token-economics)
5. [Game Mechanics](#game-mechanics)
6. [Security & Provable Fairness](#security--provable-fairness)
7. [For Project Creators](#for-project-creators)
8. [Roadmap](#roadmap)
9. [Conclusion](#conclusion)

---

## The Problem

### The Trust Crisis in Online Gambling

Traditional online lootboxes and gambling platforms suffer from fundamental trust issues:

1. **Opaque Randomness** - Players have no way to verify that outcomes are truly random
2. **House Manipulation** - Operators can adjust odds in real-time without disclosure
3. **Custodial Risk** - Platforms hold user funds, creating exit scam potential
4. **Regulatory Arbitrage** - Offshore operations with no accountability

### The SPL Token Community Gap

Solana SPL token communities face a unique challenge: they want to create engaging experiences for holders, but:

- Building custom gambling infrastructure is expensive and time-consuming
- Most teams lack the security expertise to do it safely
- There's no standardized, auditable solution they can adopt
- Community trust is hard to establish for new projects

---

## The Solution

### 3Eyes FateBox: Infrastructure for Fair Gaming

FateBox provides turnkey gambling infrastructure that any SPL token project can deploy in minutes. The platform handles all the complex parts—smart contracts, randomness, payouts—while project creators focus on their community.

**Core Value Propositions:**

| Stakeholder | Value |
|-------------|-------|
| **Players** | Provably fair outcomes, self-custodial funds, transparent odds |
| **Project Creators** | Zero-code deployment, instant monetization, community engagement |
| **$3EYES Holders** | Platform revenue drives token buybacks, creating sustainable demand |

### Why Solana?

- **Speed**: Sub-second finality for real-time gaming
- **Cost**: Fractions of a cent per transaction
- **Ecosystem**: Thriving SPL token community
- **VRF**: Switchboard provides battle-tested verifiable randomness

---

## Platform Architecture

### High-Level Flow

```
Creator pays 100 $3EYES launch fee → Deploys custom lootbox project
    ↓
Creator funds vault with their token → Project goes live
    ↓
Users buy boxes with project tokens → 5% commission to platform treasury
    ↓
Users hold boxes → Luck accumulates (longer hold = better odds)
    ↓
Users open boxes → Switchboard VRF commits randomness
    ↓
VRF reveals outcome → Reward calculated on-chain
    ↓
Users claim rewards → Tokens transferred from vault
    ↓
Platform processes treasury → 90% $3EYES buyback, 10% operations
```

### Technical Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Solana (mainnet-beta) |
| Smart Contracts | Anchor Framework (Rust) |
| Randomness | Switchboard VRF (On-Demand) |
| Backend | Node.js + Express |
| Frontend | Next.js + React |
| Database | Supabase (PostgreSQL) |

### Self-Custodial Design

**All funds are controlled by Program Derived Addresses (PDAs):**

- **Project Vaults**: Each project has its own vault controlled by the smart contract
- **No Admin Keys**: Developers cannot access or move user funds
- **Transparent**: Anyone can verify vault balances on-chain

```
Vault Authority PDA = hash("vault" + project_id + token_mint)
```

This means:
- Creators cannot rug their community
- Platform operators cannot steal funds
- Users can verify their tokens are safe at any time

---

## $3EYES Token Economics

### The Platform Currency

$3EYES is the native platform currency that powers the entire FateBox ecosystem. Every action on the platform creates demand for $3EYES.

### Revenue Flows

```
┌─────────────────────────────────────────────────────────┐
│                    REVENUE SOURCES                       │
├─────────────────────────────────────────────────────────┤
│ 1. Launch Fees: 100 $3EYES per project deployment       │
│ 2. Box Commission: 5% of every box purchase             │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  PLATFORM TREASURY                       │
│         (Collects commissions in project tokens)         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│               TREASURY PROCESSING                        │
│                                                          │
│  1. Swap all tokens → SOL via Jupiter                   │
│  2. 90% of SOL → Buy $3EYES (permanent buy pressure)    │
│  3. 10% of SOL → Operations wallet                      │
└─────────────────────────────────────────────────────────┘
```

### The Buyback Flywheel

This is the key mechanism that makes $3EYES valuable:

1. **More Projects** → More launch fees paid in $3EYES
2. **More Box Sales** → More commission collected
3. **More Commission** → More tokens swapped to SOL
4. **More SOL** → More $3EYES buybacks
5. **More Buybacks** → Price appreciation → More projects want to launch

**Every successful project on FateBox creates sustained buy pressure for $3EYES.**

### Token Utility Summary

| Use Case | Impact on $3EYES |
|----------|------------------|
| Project launch fee (100 $3EYES) | Direct demand |
| 5% commission on all boxes | Indirect demand via buybacks |
| Future governance | Staking demand |
| Creator verification badges | Premium features |

---

## Game Mechanics

### The Luck System

FateBox introduces a unique "luck" mechanic that rewards patient players:

```
Hold Time          Luck Score      Tier
─────────────────────────────────────────
0 (immediate)      5 (base)        Tier 1
3 hours            6               Tier 2
24 hours           13              Tier 2
7 days             60 (max)        Tier 3
```

**Why Luck Matters:**

Higher luck = Better odds of profitable outcomes

This creates interesting dynamics:
- Impatient players get worse odds
- Diamond hands get rewarded
- Creates "box holding" behavior (engagement)

### Reward Tiers

| Outcome | Multiplier | Description |
|---------|------------|-------------|
| Rebate | 0.5x | Get half back (worst normal outcome) |
| Break-even | 1.0x | Get your tokens back |
| Profit | 1.5x | 50% gain |
| Jackpot | 4x | Big win |

**No-Dud Design**: The worst outcome in normal gameplay is 0.5x (rebate). True duds (0x) only occur if a player fails to reveal within the 1-hour window—a penalty for inaction, not random bad luck.

### Return-to-Player (RTP) by Tier

| Tier | Luck Range | RTP | House Edge |
|------|------------|-----|------------|
| Tier 1 | 0-5 | 74.5% | 25.5% |
| Tier 2 | 6-13 | 85% | 15% |
| Tier 3 | 14-60 | 94% | 6% |

**Industry Comparison:**
- Slot machines: 85-95% RTP
- Roulette (single zero): 94.7% RTP
- FateBox Tier 3: 94% RTP

Players who hold their boxes get near-casino-level fairness.

---

## Security & Provable Fairness

Security is the foundation of FateBox. Unlike traditional gambling platforms where you trust the operator, FateBox is designed so you don't have to trust anyone—the math and code enforce fairness.

### Switchboard VRF: Verifiable Randomness

Every box reveal uses Switchboard's Verifiable Random Function (VRF), an industry-standard cryptographic primitive that guarantees unpredictable, tamper-proof randomness.

#### How It Works

```
Step 1: COMMIT
Player clicks "Open Box" → Transaction records commitment on-chain
                         → Randomness account created
                         → Player's luck score frozen at this moment

Step 2: ORACLE PROCESSING
Switchboard oracles → Generate randomness using VRF
                   → Sign with oracle private key
                   → Randomness is deterministic but unpredictable

Step 3: REVEAL
Player clicks "Reveal" → Reads signed randomness from oracle
                      → On-chain program calculates outcome
                      → Result is immutable and verifiable
```

#### Why VRF Matters

| Property | Explanation |
|----------|-------------|
| **Unpredictable** | Randomness is generated AFTER commit—no one can predict it |
| **Deterministic** | Given the same inputs, the same output is always produced |
| **Verifiable** | Anyone can mathematically verify the randomness is legitimate |
| **Non-manipulable** | Oracles cannot bias results; signatures prove authenticity |

**Technical Detail**: Switchboard uses Ed25519 signatures and a distributed oracle network. The randomness is derived from oracle signatures, meaning even if one oracle is compromised, the overall system remains secure.

### Commit-Reveal Architecture

The two-phase commit-reveal pattern is critical for preventing manipulation:

```
Timeline:
─────────────────────────────────────────────────────────────────
  BUY BOX          COMMIT (Open)              REVEAL
     │                  │                        │
     │    Hold Time     │    1-Hour Window       │
     │   (Luck grows)   │   (Must reveal)        │
─────────────────────────────────────────────────────────────────
     ▼                  ▼                        ▼
  Box Created     Luck Frozen             Outcome Determined
                  Randomness Requested    Payout Calculated
```

**Why Two Phases?**

1. **Commit locks the player's state** - Luck score is frozen the moment you click "Open"
2. **Randomness is generated after commit** - You can't see the outcome before committing
3. **1-hour reveal window** - Prevents indefinite waiting for favorable conditions
4. **Expired boxes become duds** - Penalty for not completing the process

This eliminates timing attacks where a player might try to "peek" at randomness before deciding to open.

### Smart Contract Security Model

The FateBox smart contract is built on Anchor, Solana's leading framework for secure program development. Every instruction enforces strict security constraints.

#### Program Derived Addresses (PDAs)

PDAs are the cornerstone of FateBox security. They're special Solana addresses that:
- Can only be controlled by program code
- Have no private key (impossible to extract funds manually)
- Are deterministically derived from seeds

```
Vault PDA = hash("vault" + project_id + token_mint + program_id)
Box PDA = hash("box" + project_id + box_id + program_id)
Treasury PDA = hash("treasury" + program_id)
```

**What this means**: Even the platform developers cannot access vault funds. The only way tokens can move is through the program's defined instructions.

#### Enforced Constraints

Every instruction validates security constraints before execution:

| Constraint | What It Prevents |
|------------|------------------|
| `NotBoxOwner` | Only the box owner can commit/reveal/claim |
| `NotProjectOwner` | Only creators can withdraw from their vault |
| `NotPlatformAdmin` | Admin functions limited to platform authority |
| `InsufficientVaultBalance` | Cannot pay out more than vault holds |
| `BoxAlreadyRevealed` | Cannot reveal the same box twice |
| `BoxAlreadySettled` | Cannot claim rewards twice |
| `RandomnessNotCommitted` | Must commit before revealing |
| `RandomnessAlreadyCommitted` | Cannot re-commit to change luck |
| `ArithmeticOverflow` | All math uses checked operations |
| `InvalidCommissionRate` | Commission capped at 50% max |

#### No Admin Extraction

**Critical security property**: There is no instruction in the program that allows anyone—including the platform admin—to withdraw funds from project vaults.

```rust
// The ONLY ways funds leave a vault:
1. claim_box()     → Pays winner (requires valid revealed box)
2. withdraw()      → Creator withdrawal (requires owner signature)
3. close_project() → Returns remaining funds to creator
```

The platform admin can only:
- Update platform configuration (odds, fees)
- Pause the platform in emergencies
- Withdraw from the platform treasury (commission fees only)

#### Arithmetic Safety

All calculations use Rust's checked arithmetic to prevent overflow attacks:

```rust
// Example from the codebase
let total_cost = box_price
    .checked_mul(quantity)
    .ok_or(LootboxError::ArithmeticOverflow)?;
```

This prevents classic vulnerabilities where overflow could lead to incorrect payouts.

### Outcome Calculation Transparency

Every outcome is calculated on-chain using publicly readable parameters. Here's exactly how it works:

```rust
// 1. Get randomness (0 to 99)
let random_value = switchboard_randomness % 100;

// 2. Determine luck tier based on frozen luck score
let tier = if luck <= tier1_max { Tier1 }
           else if luck <= tier2_max { Tier2 }
           else { Tier3 };

// 3. Map random value to outcome using tier probabilities
// Example for Tier 3: [0-43]=Rebate, [44-77]=Breakeven, [78-97]=Profit, [98-99]=Jackpot

// 4. Calculate payout
let payout = box_price * payout_multiplier;
```

**All parameters are on-chain**:
- Tier boundaries
- Probability distributions
- Payout multipliers
- Individual box outcomes

Anyone can read these values directly from Solana and verify any outcome.

### Emergency Controls

The platform includes responsible emergency controls:

| Control | Purpose |
|---------|---------|
| **Platform Pause** | Admin can halt all operations if critical bug found |
| **Per-instruction checks** | Every operation verifies pause status |
| **No retroactive changes** | Pausing doesn't affect already-committed boxes |

The pause mechanism exists to protect users, not to manipulate outcomes. A paused platform cannot process new transactions but doesn't affect the integrity of past results.

### What This Means for Players

| Concern | FateBox Guarantee |
|---------|-------------------|
| "Are the odds fair?" | Probabilities are on-chain, verify anytime |
| "Can outcomes be rigged?" | VRF + commit-reveal makes manipulation cryptographically impossible |
| "Can they steal my deposit?" | PDA vaults have no private key—theft is impossible |
| "Can they change odds after I bet?" | Luck is frozen at commit time, before randomness |
| "Can the house run away with funds?" | No admin extraction exists in the code |
| "How do I verify my outcome?" | Check VRF account + box state on Solana Explorer |

### What This Means for Creators

| Concern | FateBox Guarantee |
|---------|-------------------|
| "Can the platform take my vault?" | No—vault PDA is controlled by your project, not the platform |
| "Can players exploit the system?" | Commit-reveal + VRF prevents all known timing attacks |
| "What if there's a bug?" | Emergency pause protects everyone; open source enables auditing |
| "Are payouts calculated correctly?" | On-chain math with overflow protection |

### Verification Guide

Want to verify fairness yourself? Here's how:

**1. Check Platform Config**
```bash
solana account <platform_config_pda> --output json
# See all probability distributions and payout multipliers
```

**2. Verify a Box Outcome**
```bash
solana account <box_instance_pda> --output json
# See: luck score, randomness account, outcome, payout
```

**3. Audit VRF Randomness**
```bash
solana account <randomness_account> --output json
# See: oracle signatures, random value, timestamp
```

**4. Check Vault Balance**
```bash
solana account <vault_token_account> --output json
# Verify funds are present to pay winners
```

All of this is public, permanent, and immutable on the Solana blockchain.

---

## For Project Creators

### Why Launch on FateBox?

**Zero Development Cost**
- No smart contract development needed
- No security audits required
- No infrastructure to maintain

**Instant Monetization**
- Keep 95% of all box revenue (5% platform commission)
- Withdraw profits in your project token
- No lock-up periods

**Community Engagement**
- Give your holders something fun to do
- Create utility for your token
- Build community engagement

### Launch Process

```
Step 1: Connect wallet with 100 $3EYES
Step 2: Enter project details (name, subdomain, box price)
Step 3: Select your SPL token
Step 4: Fund vault (minimum ~30x box price)
Step 5: Go live!
```

**That's it.** Your community can start buying boxes immediately.

### Economics Example

```
Project: CATS Token Lootbox
Box Price: 1,000 CATS
Daily Volume: 100 boxes

Daily Revenue: 100,000 CATS
Platform Commission (5%): 5,000 CATS
Expected Payouts (~85%): 85,000 CATS
Creator Profit: ~10,000 CATS/day
```

### Dynamic Vault Funding

Vault requirements are calculated based on statistical analysis:

```
Minimum Vault = Box Price × 30
```

This formula uses:
- 99th percentile worst-case variance
- Jackpot clustering risk analysis
- 20% safety margin

**Example**: 1,000 CATS box price → 30,000 CATS minimum vault

---

## Roadmap

### Phase 1: Foundation (Complete)
- Core smart contracts deployed
- Switchboard VRF integration
- Basic creator dashboard
- Box purchase, reveal, and claim flows

### Phase 2: Platform Launch
- Mainnet deployment
- Multi-tenant subdomain routing (yourproject.fatebox.io)
- Treasury processing automation
- Creator analytics dashboard

### Phase 3: Growth
- Mobile-optimized experience
- Leaderboards and achievements
- Creator verification badges
- Referral program

### Phase 4: Expansion
- Additional game modes (tournaments, mystery boxes)
- Cross-project promotions
- DAO governance for platform parameters
- SDK for custom integrations

---

## Conclusion

3Eyes FateBox represents a new paradigm in on-chain gambling: transparent, provably fair, and aligned with community interests.

**For Players**: True fairness backed by cryptographic proofs, not trust.

**For Creators**: Turnkey gambling infrastructure that generates revenue.

**For $3EYES Holders**: A growing platform where every transaction drives token demand.

The combination of Solana's speed, Switchboard's verifiable randomness, and thoughtful token economics creates a sustainable ecosystem where all participants benefit.

---

## Links & Resources

- **Platform**: [fatebox.io](https://fatebox.io) (Coming Soon)
- **Documentation**: [docs.fatebox.io](https://docs.fatebox.io)
- **Twitter**: [@3eyesworld](https://twitter.com/3eyesworld)
- **Discord**: [discord.gg/3eyes](https://discord.gg/3eyes)
- **$3EYES Token**: [View on DEX](https://dexscreener.com)

---

*This whitepaper is for informational purposes only. Gambling involves risk. Play responsibly.*

**3Eyes FateBox - Where Every Box Tells a Story**
