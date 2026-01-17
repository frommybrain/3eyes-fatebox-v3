# Recommended Balanced Lootbox Probability Structure

**Source:** Grok (xAI)
**Date:** January 2026

---

## Overview

We're building a multi-tenant lootbox gambling platform on Solana. This document outlines a balanced probability distribution for the three luck tiers to ensure the house always profits (RTP < 100%), low luck isn't too punishing, high luck feels rewarding, and variance is manageable. The design encourages replays by making quick opens feel fair and holding boxes worthwhile.

---

## Key Decisions and Rationale

1. **No duds:** Eliminated duds (0x payout) to improve player experience, especially at low luck. The worst outcome is now a 0.5x rebate, reducing the "scammy" feel of total losses. This encourages buying more boxes.

2. **Fixed jackpot probability (2%):** Keeps variance predictable across tiers. Luck improves other outcomes instead of increasing jackpot chance.

3. **Jackpot multiplier = 4x:** A compromise for excitement (better than 3x) while safer than 5x. Limits jackpot EV contribution to 0.08 per bet, reducing vault risks from clustering.

4. **Probability shifts:** As luck increases, rebate probability decreases, while break-even and profit probabilities increase. This creates smooth progression.

5. **RTP calculation:** `RTP = (Rebate% × 0.5 + Break-even% × 1 + Profit% × 1.5 + Jackpot% × 4) / 100`. House edge = 100% - RTP.

6. **How arrived at values:** Targeted EV for each tier, subtracted fixed jackpot contribution (0.08), then solved for remaining EV using non-jackpot outcomes. Balanced with a ~0.59 profit-to-break-even ratio for progression. Rounded to whole numbers.

---

## Balanced Probability Distributions

| Tier | Luck Range | Rebate (0.5x) | Break-even (1x) | Profit (1.5x) | Jackpot (4x) | RTP | House Edge |
|------|------------|---------------|-----------------|---------------|--------------|-----|------------|
| Tier 1 | 0-5 | 72% | 17% | 9% | 2% | 74.5% | 25.5% |
| Tier 2 | 6-13 | 57% | 26% | 15% | 2% | 85% | 15% |
| Tier 3 | 14-60 | 44% | 34% | 20% | 2% | 94% | 6% |

---

## RTP Calculations

### Tier 1 — Low Luck (0-5)

```
(0.5 × 0.72) + (1 × 0.17) + (1.5 × 0.09) + (4 × 0.02)
= 0.36 + 0.17 + 0.135 + 0.08
= 0.745 (74.5%)
```

### Tier 2 — Medium Luck (6-13)

```
(0.5 × 0.57) + (1 × 0.26) + (1.5 × 0.15) + (4 × 0.02)
= 0.285 + 0.26 + 0.225 + 0.08
= 0.85 (85%)
```

### Tier 3 — High Luck (14-60)

```
(0.5 × 0.44) + (1 × 0.34) + (1.5 × 0.20) + (4 × 0.02)
= 0.22 + 0.34 + 0.30 + 0.08
= 0.94 (94%)
```

---

## Why This Balances the Goals

### House profits over volume
RTP < 100% in all tiers, with decreasing house edge as luck rises (rewards patience but ensures profitability).

### Low luck not too punishing
74.5% RTP (70-80% target). Mostly rebates (72%), with chances for break-even (17%), profit (9%), or jackpot (2%). No total losses encourage replays.

### High luck rewarding
94% RTP (90-98% target). Higher profits (20%) and break-evens (34%), with "win or break-even" at 56% (plus 2% jackpot).

### Encourages replays
Gradual tier improvements motivate repeated buys and holding. Avoids brutal early experiences.

### Manageable variance
Low fixed jackpot prob (2%) and 4x multiplier limit swings. Expected jackpot payout per bet is 0.08 units; house edge covers outliers over volume.

### Alignment with benchmarks
Fits slot machine RTPs (85-95% average), with progression like strategy-rewarding games (e.g., blackjack at 99% optimal).

---

## Implementation Notes

- Feed these probabilities into Switchboard VRF for random outcomes.
- If adjustments needed (e.g., add duds, change jackpot prob/multiplier), recalculate accordingly.

---

## Summary

This structure meets industry benchmarks while prioritizing player retention and house sustainability.

**Key differentiator:** No duds (0x outcomes) — worst case is always getting half back.
