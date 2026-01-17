# Lootbox Probability Threshold Proposal

**Source:** Claude (Anthropic)
**Date:** January 2026

---

## Overview

This proposal addresses the probability distribution for a multi-tenant lootbox gambling platform on Solana. The goal is to balance house profitability with player experience across three luck tiers, while managing vault variance risk.

---

## Design Philosophy

My approach differs from pure mathematical optimization by considering the **psychological experience** of players:

1. **Keep duds, but make them rare** — A 0x outcome creates emotional stakes that pure rebate systems lack. The "relief" of avoiding a dud is part of gambling psychology.

2. **Fixed jackpot at 3% across all tiers** — This is higher than ChatGPT's 1% and higher than Grok's 2%, making jackpots feel achievable while keeping EV contribution manageable.

3. **Conservative jackpot multiplier (3x)** — Lower multiplier means we can afford higher probability without blowing up variance.

4. **Focus on break-even and profit progression** — Luck should primarily make you feel "luckier" by increasing wins, not just reducing losses.

---

## Payout Multipliers

| Outcome | Multiplier | Notes |
|---------|------------|-------|
| Dud | 0x | Keep for emotional stakes, but rare |
| Rebate | 0.5x | Consolation prize |
| Break-even | 1x | "Didn't lose" feeling |
| Profit | 1.5x | Small win |
| Jackpot | 3x | Big win (conservative for variance) |

---

## Recommended Probability Distributions

### Tier 1 — Low Luck (0-5)

**Target RTP:** 75-80%

| Outcome | Payout | Probability |
|---------|-------:|------------:|
| Dud | 0x | 15% |
| Rebate | 0.5x | 40% |
| Break-even | 1x | 30% |
| Profit | 1.5x | 12% |
| Jackpot | 3x | 3% |

**RTP Calculation:**

```
(0 × 0.15) + (0.5 × 0.40) + (1 × 0.30) + (1.5 × 0.12) + (3 × 0.03)
= 0 + 0.20 + 0.30 + 0.18 + 0.09
= 0.77 (77%)
```

**House Edge:** 23%

**Rationale:**
- 15% dud rate is painful but not brutal
- 40% rebate gives most players "something back"
- 42% break-even or better keeps hope alive
- 3% jackpot chance is tangible (1 in ~33)

---

### Tier 2 — Medium Luck (6-13)

**Target RTP:** 82-88%

| Outcome | Payout | Probability |
|---------|-------:|------------:|
| Dud | 0x | 10% |
| Rebate | 0.5x | 35% |
| Break-even | 1x | 35% |
| Profit | 1.5x | 17% |
| Jackpot | 3x | 3% |

**RTP Calculation:**

```
(0 × 0.10) + (0.5 × 0.35) + (1 × 0.35) + (1.5 × 0.17) + (3 × 0.03)
= 0 + 0.175 + 0.35 + 0.255 + 0.09
= 0.87 (87%)
```

**House Edge:** 13%

**Rationale:**
- Dud rate cut by a third (15% → 10%)
- Break-even matches rebate (symmetry feels fair)
- Profit jumps meaningfully (12% → 17%)
- 55% break-even or better creates positive expectation feeling

---

### Tier 3 — High Luck (14-60)

**Target RTP:** 92-96%

| Outcome | Payout | Probability |
|---------|-------:|------------:|
| Dud | 0x | 7% |
| Rebate | 0.5x | 25% |
| Break-even | 1x | 40% |
| Profit | 1.5x | 25% |
| Jackpot | 3x | 3% |

**RTP Calculation:**

```
(0 × 0.07) + (0.5 × 0.25) + (1 × 0.40) + (1.5 × 0.25) + (3 × 0.03)
= 0 + 0.125 + 0.40 + 0.375 + 0.09
= 0.99 (99%)
```

**House Edge:** 1%

**Rationale:**
- Only 7% duds (rare bad outcome)
- 65% break-even or better
- Profit matches rebate (25% each) — feeling of "winning more than losing"
- 99% RTP rewards patience enormously

---

## Summary Table

| Tier | Luck | Dud | Rebate | Break-even | Profit | Jackpot | RTP | House Edge |
|------|------|-----|--------|------------|--------|---------|-----|------------|
| 1 | 0-5 | 15% | 40% | 30% | 12% | 3% | 77% | 23% |
| 2 | 6-13 | 10% | 35% | 35% | 17% | 3% | 87% | 13% |
| 3 | 14-60 | 7% | 25% | 40% | 25% | 3% | 99% | 1% |

---

## Key Differentiators from Other Proposals

### vs ChatGPT (1% jackpot, 3x)
- I use 3% jackpot — more excitement, feels achievable
- My Tier 3 is more generous (99% vs 94%)
- Keep duds for emotional stakes

### vs Grok (2% jackpot, 4x, no duds)
- I keep duds (psychological stakes matter)
- Lower jackpot multiplier but higher probability
- Different philosophy on "worst outcome"

---

## Variance Analysis

**Jackpot EV contribution per tier:** 3% × 3x = 0.09x

This is higher than ChatGPT (0.03x) but controlled by the lower multiplier.

**Worst-case scenario (first 100 boxes at Tier 3):**
- Expected jackpots: 3
- 99th percentile jackpots: ~8
- Maximum additional payout: 8 × 3x × box_price = 24x exposure

With 77-99% RTP across tiers, the vault accumulates reserves from lower-luck opens to cover high-luck variance.

---

## Vault Funding Recommendation

Based on these probabilities:

```
Minimum vault seed = 30 × box_price
```

This covers worst-case early variance while the vault self-sustains from accumulated house edge.

---

## Implementation Notes

1. **Jackpot fixed at 3%** — Simplifies on-chain logic, prevents jackpot farming
2. **Linear interpolation** — Consider interpolating between tier boundaries for smooth progression
3. **Real-time monitoring** — Track actual RTP vs theoretical to detect anomalies

---

## Psychological Design Summary

| Tier | Player Feeling |
|------|---------------|
| Tier 1 | "Fair enough for quick open" — mostly get something back |
| Tier 2 | "Patience is paying off" — noticeably better outcomes |
| Tier 3 | "Worth the wait" — feels almost break-even with jackpot upside |

The 3% jackpot across all tiers maintains excitement without making holding feel like "chasing jackpots."
