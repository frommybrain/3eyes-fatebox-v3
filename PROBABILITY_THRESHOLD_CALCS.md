# Lootbox Probability Balancing: A Case Study in AI-Assisted Game Design

**Project:** 3Eyes FateBox v3 (Solana Lootbox Platform)
**Date:** January 2026
**Author:** 3Eyes Development Team with Claude, ChatGPT, and Grok

---

## Executive Summary

This document chronicles the process of balancing probability distributions for a blockchain-based lootbox gambling platform. We consulted three AI systems (Claude, ChatGPT, and Grok) with identical problem statements and compared their approaches. This serves as a case study in using AI for game design mathematics.

---

## The Problem Statement

We are building a multi-tenant lootbox gambling platform on Solana where:

1. Project creators set up lootboxes with their own token
2. Users buy boxes that reveal prizes based on Switchboard VRF (verifiable randomness)
3. A "luck" mechanic rewards users for holding boxes longer before opening

### The Original (Broken) Configuration

Our initial probability distribution was heavily skewed:

| Tier | Luck | Dud | Rebate | Break-even | Profit | Jackpot (5x) | RTP |
|------|------|-----|--------|------------|--------|--------------|-----|
| Low | 0-5 | 55% | 30% | 10% | 4.5% | 0.5% | **34.25%** |
| Max | 14-60 | 30% | 25% | 20% | 20% | 5% | **87.5%** |

**Critical Issues Identified:**

1. **Low luck at 34% RTP is brutal** — Players lose 66% on average when opening quickly
2. **55% dud rate feels like a scam** — More than half the time, total loss
3. **Max luck with 5x jackpot at 5%** — Creates variance risk (0.25x EV from jackpot alone)
4. **No medium tier definition** — Jump from low to max was undefined

---

## The Requirements

We needed a probability structure that:

1. **House always profits over volume** — RTP < 100% at ALL luck levels
2. **Low luck isn't too punishing** — Players who open quickly shouldn't feel "scammed"
3. **High luck feels rewarding** — Players who hold should feel their patience was worthwhile
4. **Encourages replays** — If early boxes feel terrible, players won't buy more
5. **Manageable variance** — Vault needs to handle early jackpot clustering

### Industry Benchmarks

| Game Type | Typical RTP |
|-----------|-------------|
| Slot Machines | 85-95% |
| Roulette (single zero) | 94.7% |
| Blackjack (basic strategy) | 99%+ |

### Target RTPs

- **Tier 1 (Low Luck):** 70-80%
- **Tier 2 (Medium Luck):** 80-90%
- **Tier 3 (High Luck):** 90-98%

---

## The Mathematics

### Expected Value (EV) Formula

```
EV = Σ (probability × payout_multiplier)
   = (P_dud × 0) + (P_rebate × 0.5) + (P_breakeven × 1) + (P_profit × 1.5) + (P_jackpot × M_jackpot)
```

Where `M_jackpot` is the jackpot multiplier (3x, 4x, or 5x).

### Return To Player (RTP)

```
RTP = EV × 100%
House Edge = 100% - RTP
```

### Constraint

```
P_dud + P_rebate + P_breakeven + P_profit + P_jackpot = 100%
```

### The Jackpot Problem

A high jackpot multiplier with high probability breaks the math:

```
If jackpot = 5x at 5% probability:
Jackpot EV contribution = 0.05 × 5 = 0.25x

This alone contributes 25% to RTP!

Remaining 95% of outcomes must contribute < 75% to stay under 100% RTP.
```

This is why the original max luck configuration was problematic — the jackpot contribution was too high.

---

## AI Consultation Process

We provided identical problem statements to three AI systems and asked for balanced probability distributions.

### The Prompt (Simplified)

> We're building a lootbox platform with 5 payout tiers (dud 0x, rebate 0.5x, break-even 1x, profit 1.5x, jackpot Nx). Users have "luck" from 5-60 based on hold time. We need probability distributions for 3 luck tiers that:
> - Keep RTP < 100% always
> - Make low luck feel fair (70-80% RTP)
> - Make high luck feel rewarding (90-98% RTP)
> - Control variance

---

## Comparison of AI Proposals

### Overview Table

| Aspect | ChatGPT | Grok | Claude |
|--------|---------|------|--------|
| Keep Duds? | Yes (5-15%) | **No** (0%) | Yes (7-15%) |
| Jackpot Multiplier | 3x | 4x | 3x |
| Jackpot Probability | 1% (fixed) | 2% (fixed) | 3% (fixed) |
| Jackpot EV | 0.03x | 0.08x | 0.09x |
| Tier 1 RTP | 75% | 74.5% | 77% |
| Tier 2 RTP | 85% | 85% | 87% |
| Tier 3 RTP | 94% | 94% | 99% |
| Philosophy | Conservative | No-dud focus | Generous high luck |

### Detailed Comparison

#### ChatGPT's Approach

**Philosophy:** Conservative, variance-minimizing

- Lowest jackpot probability (1%)
- Keeps duds but minimizes them
- Suggested linear interpolation between tiers
- Most balanced house edge distribution

**Strengths:**
- Safest for vault management
- Clear mathematical rigor
- Suggested implementation improvements (interpolation)

**Weaknesses:**
- Jackpot may feel too rare (1%)
- Less exciting for players

#### Grok's Approach

**Philosophy:** Player-friendly, eliminate bad feelings

- **No duds at all** — Worst outcome is 0.5x rebate
- Higher jackpot probability (2%) and multiplier (4x)
- Focus on reducing "scammy" feelings

**Strengths:**
- Best player experience (no total losses)
- Higher excitement from 4x jackpot
- Clear rationale for each decision

**Weaknesses:**
- Higher variance (0.08x from jackpot)
- Removing duds changes gambling psychology
- May feel less like "real gambling"

#### Claude's Approach

**Philosophy:** Psychological balance, reward patience

- Keep duds for emotional stakes
- Highest jackpot probability (3%) but low multiplier (3x)
- Most generous high luck tier (99% RTP)

**Strengths:**
- Considers gambling psychology
- Jackpot feels achievable (1 in 33)
- Max luck feels almost break-even

**Weaknesses:**
- Highest jackpot EV contribution (0.09x)
- 99% RTP at max luck is very generous
- Smallest house edge at high luck (1%)

---

## Final Probability Tables

### ChatGPT's Recommendation

| Tier | Dud | Rebate | Break-even | Profit | Jackpot (3x) | RTP |
|------|-----|--------|------------|--------|--------------|-----|
| 1 (0-5) | 15% | 34% | 40% | 10% | 1% | 75% |
| 2 (6-13) | 8% | 32% | 45% | 14% | 1% | 85% |
| 3 (14-60) | 5% | 24% | 52% | 18% | 1% | 94% |

### Grok's Recommendation

| Tier | Dud | Rebate | Break-even | Profit | Jackpot (4x) | RTP |
|------|-----|--------|------------|--------|--------------|-----|
| 1 (0-5) | 0% | 72% | 17% | 9% | 2% | 74.5% |
| 2 (6-13) | 0% | 57% | 26% | 15% | 2% | 85% |
| 3 (14-60) | 0% | 44% | 34% | 20% | 2% | 94% |

### Claude's Recommendation

| Tier | Dud | Rebate | Break-even | Profit | Jackpot (3x) | RTP |
|------|-----|--------|------------|--------|--------------|-----|
| 1 (0-5) | 15% | 40% | 30% | 12% | 3% | 77% |
| 2 (6-13) | 10% | 35% | 35% | 17% | 3% | 87% |
| 3 (14-60) | 7% | 25% | 40% | 25% | 3% | 99% |

---

## Variance Analysis

### Jackpot Clustering Risk

The primary vault risk is multiple early jackpots before the house edge accumulates reserves.

**Scenario:** First 100 boxes opened, all at Tier 3

| Model | Jackpot Prob | Expected Jackpots | 99th Percentile | Max Exposure |
|-------|--------------|-------------------|-----------------|--------------|
| ChatGPT | 1% | 1 | 4 | 12x box price |
| Grok | 2% | 2 | 6 | 24x box price |
| Claude | 3% | 3 | 8 | 24x box price |

### Vault Funding Requirements

Based on 99th percentile worst-case:

| Model | Recommended Vault Seed |
|-------|----------------------|
| ChatGPT | 20x box price |
| Grok | 30x box price |
| Claude | 30x box price |

All dramatically lower than our original 50M token requirement.

---

## Key Insights

### 1. Jackpot Design is Critical

The jackpot probability × multiplier determines much of the RTP ceiling. All three AIs recommended:
- **Fixed jackpot probability across tiers** (luck affects other outcomes)
- **Lower multiplier (3-4x)** instead of 5x
- **Jackpot EV contribution under 0.10x**

### 2. Duds are a Design Choice, Not a Requirement

Grok's no-dud approach is valid but changes the psychological profile. ChatGPT and Claude kept duds for "emotional stakes." There's no mathematically correct answer — it's a UX decision.

### 3. Linear Interpolation > Hard Tiers

ChatGPT specifically recommended interpolating probabilities between tier boundaries rather than discrete jumps. This makes every +1 luck feel meaningful.

### 4. High Luck Generosity Varies

- ChatGPT: 94% RTP (6% house edge)
- Grok: 94% RTP (6% house edge)
- Claude: 99% RTP (1% house edge)

Claude's approach rewards patience most aggressively. The trade-off is smaller margins at high luck.

---

## Implementation Decision

For production, we're implementing a **hybrid approach**:

1. **Keep duds** (psychological stakes matter)
2. **3x jackpot multiplier** (variance control)
3. **2-3% jackpot probability** (feels achievable)
4. **Linear interpolation** between tier boundaries
5. **Target RTPs:** 75% / 85% / 95%

The final values will be tuned using the real-time EV/RTP calculator built into the admin dashboard.

---

## Tools Built

### Admin Dashboard EV Calculator

We added a real-time EV/RTP calculator to the admin dashboard that:

- Calculates EV for each tier based on current probability inputs
- Displays RTP and house edge with color-coded warnings
- Shows advice for each tier (e.g., "LOSING MONEY" if RTP >= 100%)
- Includes industry benchmark reference

This allows non-technical stakeholders to experiment with probability values and see immediate impact on game economics.

---

## Lessons Learned

### 1. AI as Second Opinion

Using multiple AI systems with the same problem revealed different design philosophies. None was "wrong" — they optimized for different goals.

### 2. Show Your Math

All three AIs provided complete RTP calculations. This made it easy to verify correctness and compare approaches.

### 3. Psychology vs Mathematics

Pure mathematical optimization (maximize house edge) produces terrible games. Good gambling design balances math with player psychology.

### 4. Variance is the Hidden Enemy

The original 5x jackpot at 5% wasn't mathematically broken (RTP was 87.5%), but the variance was unmanageable. Early jackpot clustering could drain the vault before house edge accumulated.

---

## Conclusion

This exercise demonstrated the value of consulting multiple AI systems for complex design problems. Each brought a unique perspective:

- **ChatGPT:** Mathematical rigor, implementation details
- **Grok:** Player experience focus, bold design choices
- **Claude:** Psychological considerations, generous high luck

The final implementation will blend insights from all three, with real-time tooling to iterate on values post-launch.

---

*This document serves as a case study for AI-assisted game design and may be referenced in future publications.*
