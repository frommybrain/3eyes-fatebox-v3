# Lootbox Probability Thresholds & RTP Balancing Proposal

**Source:** ChatGPT-4o
**Date:** January 2026

---

## Context

We are building a **multi-tenant lootbox gambling platform on Solana**.
Project creators configure lootboxes using their own token, and users purchase boxes that reveal prizes based on **verifiable randomness (Switchboard VRF)**.

A core mechanic of the platform is **Luck** — a time-based modifier that rewards users for holding lootboxes longer before opening them.

---

## The Luck Mechanic

- **Minimum luck:** 5 (open immediately)
- **Maximum luck:** 60 (held for maximum time)
- Luck accumulates at a configurable rate (e.g. **+1 luck every 3 hours** in production)
- Higher luck results in a **better probability distribution**
- Luck affects *baseline outcomes*, not randomness integrity

---

## Current Tier Structure

| Tier | Luck Range | Description |
|------|------------|-------------|
| Tier 1 | 0-5 | Low luck (opened quickly) |
| Tier 2 | 6-13 | Medium luck |
| Tier 3 | 14-60 | High luck (held for long time) |

---

## Payout Multipliers (Fixed)

| Outcome | Multiplier |
|---------|------------|
| Dud | 0x |
| Rebate | 0.5x |
| Break-even | 1x |
| Profit | 1.5x |
| Jackpot | 3x (recommended) |

---

## Design Goals

- **House always profits over volume**
- RTP must be **< 100% at all luck levels**
- Low luck must feel **fair and replayable**
- High luck must feel **rewarding**
- Medium tier must represent **real progress**
- Variance must be **manageable** to protect the vault
- Jackpot must feel exciting without destabilising payouts

---

## Industry Benchmarks

| Game Type | Typical RTP |
|-----------|-------------|
| Slot Machines | 85-95% |
| Roulette (single zero) | 94.7% |
| Blackjack (basic strategy) | 99%+ |

---

## Key Design Decision

### Fixed Jackpot Probability

- **Jackpot probability is fixed across all tiers**
- Luck improves *non-jackpot outcomes*
- Prevents jackpot farming via holding
- Dramatically reduces tail-risk variance

**Chosen values:**
- Jackpot multiplier: **3x**
- Jackpot probability: **1.0% (all tiers)**

---

## Recommended Probability Distributions

### Tier 1 — Low Luck (0-5)

**Target RTP:** 70-80%

| Outcome | Payout | Probability |
|---------|-------:|------------:|
| Dud | 0x | 15% |
| Rebate | 0.5x | 34% |
| Break-even | 1x | 40% |
| Profit | 1.5x | 10% |
| Jackpot | 3x | 1% |

**RTP Calculation:**

```
(0 × 0.15) + (0.5 × 0.34) + (1 × 0.40) + (1.5 × 0.10) + (3 × 0.01)
= 0 + 0.17 + 0.40 + 0.15 + 0.03
= 0.75 (75%)
```

**House Edge:** 25%

**Notes:**
- Only 15% full wipeouts
- Majority of outcomes return value
- Feels fair even when opening immediately

---

### Tier 2 — Medium Luck (6-13)

**Target RTP:** 80-90%

| Outcome | Payout | Probability |
|---------|-------:|------------:|
| Dud | 0x | 8% |
| Rebate | 0.5x | 32% |
| Break-even | 1x | 45% |
| Profit | 1.5x | 14% |
| Jackpot | 3x | 1% |

**RTP Calculation:**

```
(0 × 0.08) + (0.5 × 0.32) + (1 × 0.45) + (1.5 × 0.14) + (3 × 0.01)
= 0 + 0.16 + 0.45 + 0.21 + 0.03
= 0.85 (85%)
```

**House Edge:** 15%

**Notes:**
- Clear reduction in duds
- Profit rate meaningfully increased
- Feels like patience is paying off

---

### Tier 3 — High Luck (14-60)

**Target RTP:** 90-98%

| Outcome | Payout | Probability |
|---------|-------:|------------:|
| Dud | 0x | 5% |
| Rebate | 0.5x | 24% |
| Break-even | 1x | 52% |
| Profit | 1.5x | 18% |
| Jackpot | 3x | 1% |

**RTP Calculation:**

```
(0 × 0.05) + (0.5 × 0.24) + (1 × 0.52) + (1.5 × 0.18) + (3 × 0.01)
= 0 + 0.12 + 0.52 + 0.27 + 0.03
= 0.94 (94%)
```

**House Edge:** 6%

**Notes:**
- Wipeouts are rare
- Most outcomes are break-even or better
- High perceived fairness without exceeding 100% RTP

---

## Variance & Vault Safety

- Jackpot EV contribution: **0.03x per open**
- Jackpot probability capped at **1%**
- Lower volatility than 5x / high-probability designs
- Tiered RTP ensures profitability even at max luck

**Approximate payout volatility (σ):**
- Tier 1: ~0.49
- Tier 2: ~0.46
- Tier 3: ~0.44

This is well within acceptable bounds for sustained liquidity.

---

## Optional Variant: Keeping 5x Jackpot

If 5x is required for marketing:

- Fix jackpot probability to **0.6%**
- EV contribution remains ≈ 0.03x
- Higher excitement, higher tail risk
- Requires larger vault buffers

**Recommendation:** 3x @ 1% is safer and cleaner.

---

## Implementation Recommendation: Remove Hard Tier Cliffs

Instead of discrete jumps at luck thresholds:

- Define probability distributions at:
  - Luck 5
  - Luck 13
  - Luck 60
- Linearly interpolate probabilities between them
- Renormalise to 100%

This makes every +1 luck feel rewarding and avoids "magic breakpoint" behaviour.

---

## Summary

This proposal delivers:

- Predictable, scalable house profit
- Fair-feeling early gameplay
- Strong incentive to hold
- Controlled variance
- Clean, explainable mechanics
- Alignment with industry RTP norms

This system is suitable for production deployment with adjustable parameters per creator, while maintaining platform-wide risk guarantees.
