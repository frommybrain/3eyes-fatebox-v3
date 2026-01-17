# Security Audit Report: Lootbox Platform Anchor Program

**Program ID:** `GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat`
**Audit Date:** January 17, 2026
**Auditor:** Claude Opus 4.5 (Automated Security Analysis)
**Severity Levels:** CRITICAL | HIGH | MEDIUM | LOW | INFORMATIONAL

---

## Executive Summary

This audit examines the `lootbox_platform` Anchor smart contract deployed on Solana. The program implements a multi-tenant lootbox/gacha system with Switchboard VRF for provably fair randomness.

### Overall Assessment: **MODERATE RISK**

The program demonstrates solid security fundamentals with proper use of PDAs, checked arithmetic, and access controls. However, several issues require attention before mainnet launch with real funds.

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH | 3 |
| MEDIUM | 5 |
| LOW | 4 |
| INFORMATIONAL | 6 |

---

## Critical Findings

### [C-01] Vault Token Account Not Verified Against Project's Payment Token

**Severity:** CRITICAL
**Location:** [lib.rs:1016-1020](backend/program/programs/lootbox_platform/src/lib.rs#L1016-L1020) (CreateBox), [lib.rs:1092](backend/program/programs/lootbox_platform/src/lib.rs#L1092) (RevealBox), [lib.rs:1127-1128](backend/program/programs/lootbox_platform/src/lib.rs#L1127-L1128) (SettleBox)

**Description:**
The `vault_token_account` in CreateBox, RevealBox, SettleBox, and WithdrawEarnings contexts is not constrained to match the project's `payment_token_mint`. An attacker could potentially pass a different vault token account.

**Architecture Context:** Each project has its own vault with its own payment token (multi-tenant design). A project using CATS token should only interact with CATS vault accounts, never with another project's vault.

**Current Code:**
```rust
#[account(mut)]
pub vault_token_account: Account<'info, TokenAccount>,
```

**Impact:**
- Funds could potentially be transferred to/from wrong accounts
- Project funds could be stolen if attacker provides their own token account
- Cross-project token account confusion possible

**Recommendation:**
Add constraints to verify the vault token account matches the project's configuration:
```rust
#[account(
    mut,
    constraint = vault_token_account.mint == project_config.payment_token_mint @ LootboxError::InvalidTokenAccount,
    constraint = vault_token_account.owner == vault_authority.key() @ LootboxError::InvalidTokenAccount
)]
pub vault_token_account: Account<'info, TokenAccount>,
```

**Note:** This fix is compatible with multi-tenant architecture - each project's `payment_token_mint` is stored in its `ProjectConfig`, so the constraint correctly validates per-project.

**Status:** UNRESOLVED

---

## High Severity Findings

### [H-01] Missing Vault Authority Verification in Token Transfers

**Severity:** HIGH
**Location:** [lib.rs:1119-1123](backend/program/programs/lootbox_platform/src/lib.rs#L1119-L1123), [lib.rs:1148-1153](backend/program/programs/lootbox_platform/src/lib.rs#L1148-L1153)

**Description:**
While the `vault_authority` PDA is derived correctly with seeds, there's no verification that the `vault_token_account.owner` equals the `vault_authority.key()` in SettleBox and WithdrawEarnings. The token transfer will fail if wrong, but explicit constraints provide defense-in-depth.

**Impact:**
Potential for transaction failures or edge-case exploits if token account ownership is manipulated.

**Recommendation:**
```rust
#[account(
    mut,
    constraint = vault_token_account.owner == vault_authority.key() @ LootboxError::InvalidVaultOwner
)]
pub vault_token_account: Account<'info, TokenAccount>,
```

---

### [H-02] Treasury Token Account Missing Proper Verification in CreateBox

**Severity:** HIGH
**Location:** [lib.rs:1022-1033](backend/program/programs/lootbox_platform/src/lib.rs#L1022-L1033)

**Description:**
The `treasury_token_account` in CreateBox is mutable and verified against treasury seeds, but there's no constraint ensuring:
1. The token account's mint matches the project's payment token
2. The token account is owned by the treasury PDA

**Architecture Context:** Treasury is a global PDA that collects commission from ALL projects in their respective tokens. A project using CATS sends commission to treasury's CATS ATA; a project using BONK sends to treasury's BONK ATA.

**Current Code:**
```rust
#[account(mut)]
pub treasury_token_account: Account<'info, TokenAccount>,

/// CHECK: Verified by seeds
#[account(
    seeds = [b"treasury"],
    bump = platform_config.treasury_bump
)]
pub treasury: UncheckedAccount<'info>,
```

**Impact:**
Platform commission could potentially be sent to wrong account, resulting in loss of platform revenue.

**Recommendation:**
```rust
#[account(
    mut,
    constraint = treasury_token_account.owner == treasury.key() @ LootboxError::InvalidTreasuryAccount,
    constraint = treasury_token_account.mint == project_config.payment_token_mint @ LootboxError::InvalidTreasuryAccount
)]
pub treasury_token_account: Account<'info, TokenAccount>,
```

**Note:** This ensures each project's commission goes to the correct treasury token account (matching the project's payment token), which is compatible with the multi-token treasury design.

---

### [H-03] Owner Token Account Not Verified for Correct Ownership/Mint

**Severity:** HIGH
**Location:** [lib.rs:1130-1131](backend/program/programs/lootbox_platform/src/lib.rs#L1130-L1131) (SettleBox), [lib.rs:1160-1161](backend/program/programs/lootbox_platform/src/lib.rs#L1160-L1161) (WithdrawEarnings)

**Description:**
The `owner_token_account` in SettleBox and WithdrawEarnings lacks constraints verifying that:
1. It's owned by the `owner` signer
2. Its mint matches the project's payment token

**Architecture Context:** Each project pays out in its own token. A CATS project pays rewards in CATS, so the owner's token account must be for CATS tokens.

**Current Code:**
```rust
#[account(mut)]
pub owner_token_account: Account<'info, TokenAccount>,
```

**Impact:**
Rewards or withdrawals could potentially be sent to wrong accounts if a malicious frontend constructs invalid transactions.

**Recommendation:**
```rust
#[account(
    mut,
    constraint = owner_token_account.owner == owner.key() @ LootboxError::InvalidOwnerAccount,
    constraint = owner_token_account.mint == payment_token_mint.key() @ LootboxError::InvalidTokenMint
)]
pub owner_token_account: Account<'info, TokenAccount>,
```

**Note:** The `payment_token_mint` is already passed as an account in these contexts, so this constraint is straightforward to add.

---

## Medium Severity Findings

### [M-01] Floating Point Arithmetic in Reward Calculation

**Severity:** MEDIUM
**Location:** [lib.rs:490](backend/program/programs/lootbox_platform/src/lib.rs#L490), [lib.rs:823](backend/program/programs/lootbox_platform/src/lib.rs#L823)

**Description:**
The program uses `f64` floating-point arithmetic for randomness percentage calculations:
```rust
let random_percentage = (random_u64 as f64) / (u64::MAX as f64);
let roll = (random_percentage * 10000.0) as u16;
```

Floating-point operations on Solana are deterministic but have precision limitations that could cause edge-case inconsistencies between expected and actual behavior.

**Impact:**
- Potential for rounding errors at probability boundaries
- Minor bias in outcome distribution (acceptable but not ideal)

**Recommendation:**
Consider using integer-only arithmetic for probability calculations:
```rust
// Use basis points directly from u64
let roll = ((random_u64 as u128) * 10000 / (u64::MAX as u128)) as u16;
```

---

### [M-02] No Validation That Probability Tiers Sum to 100%

**Severity:** MEDIUM
**Location:** [lib.rs:80-172](backend/program/programs/lootbox_platform/src/lib.rs#L80-L172) (update_platform_config)

**Description:**
When updating platform config probabilities, there's no validation ensuring the tier probabilities sum to exactly 10000 basis points (100%). Invalid configurations could result in unexpected jackpot probabilities.

**Example Attack:**
```
tier1_dud = 1000, rebate = 1000, breakeven = 1000, profit = 1000
// Total = 4000 bp, leaving 60% for jackpot!
```

**Impact:**
Admin misconfiguration could dramatically alter payout distributions, potentially leading to economic exploits or fund drainage.

**Recommendation:**
Add validation in `update_platform_config`:
```rust
// Validate tier probabilities sum correctly (jackpot is remainder)
let tier1_sum = tier1_dud + tier1_rebate + tier1_breakeven + tier1_profit;
require!(tier1_sum <= 10000, LootboxError::InvalidProbabilitySum);
// Repeat for tier2, tier3
```

---

### [M-03] Buyer Token Account Not Verified in CreateBox

**Severity:** MEDIUM
**Location:** [lib.rs:1016-1017](backend/program/programs/lootbox_platform/src/lib.rs#L1016-L1017)

**Description:**
The `buyer_token_account` lacks constraints for ownership and mint verification:
```rust
#[account(mut)]
pub buyer_token_account: Account<'info, TokenAccount>,
```

**Impact:**
While the token transfer would fail if the account doesn't belong to the buyer (since buyer is the signer/authority), explicit constraints provide better error messages and defense-in-depth.

**Recommendation:**
```rust
#[account(
    mut,
    constraint = buyer_token_account.owner == buyer.key() @ LootboxError::InvalidBuyerAccount,
    constraint = buyer_token_account.mint == project_config.payment_token_mint @ LootboxError::InvalidTokenMint
)]
pub buyer_token_account: Account<'info, TokenAccount>,
```

---

### [M-04] Launch Fee Token Accounts Not Fully Verified

**Severity:** MEDIUM
**Location:** [lib.rs:968-976](backend/program/programs/lootbox_platform/src/lib.rs#L968-L976)

**Description:**
In InitializeProject, the launch fee token accounts lack constraints:
```rust
#[account(mut)]
pub owner_fee_token_account: Account<'info, TokenAccount>,

#[account(mut)]
pub platform_fee_token_account: Account<'info, TokenAccount>,

pub fee_token_mint: Account<'info, Mint>,
```

There's no verification that:
- `owner_fee_token_account.mint == fee_token_mint`
- `owner_fee_token_account.owner == owner`
- `platform_fee_token_account.mint == fee_token_mint`

**Impact:**
Launch fee could potentially be paid with wrong token or from wrong account.

**Recommendation:**
Add explicit constraints for all three accounts.

---

### [M-05] No On-Chain Rate Limiting on Box Creation

**Severity:** MEDIUM (Mitigated)
**Location:** [lib.rs:246-330](backend/program/programs/lootbox_platform/src/lib.rs#L246-L330)

**Description:**
There's no on-chain mechanism to prevent rapid box creation that could:
1. Spam the blockchain with transactions
2. Create denial-of-service conditions for project vaults
3. Potentially exploit any timing vulnerabilities

**Mitigation Already in Place:**
Per CLAUDE.md, the backend already implements rate limiting:
- 100 requests/15min general
- 30/min for transaction endpoints
- 20/hour for admin endpoints

**Impact:**
Risk is partially mitigated by backend rate limiting. Direct RPC calls bypassing the backend could still spam, but would need to pay transaction fees.

**Recommendation:**
Current backend rate limiting is sufficient for beta. Consider on-chain cooldowns only if abuse is observed.

---

## Low Severity Findings

### [L-01] Error Code Reuse for Different Purposes

**Severity:** LOW
**Location:** [lib.rs:1227-1228](backend/program/programs/lootbox_platform/src/lib.rs#L1227-L1228), [lib.rs:1235](backend/program/programs/lootbox_platform/src/lib.rs#L1235), [lib.rs:769-773](backend/program/programs/lootbox_platform/src/lib.rs#L769-L773)

**Description:**
`LootboxError::InvalidRandomnessAccount` is used for multiple unrelated validation failures:
- Treasury token account verification in WithdrawTreasury
- Admin verification in close_platform_config

**Impact:**
Debugging difficulties due to ambiguous error messages.

**Recommendation:**
Create specific error codes:
```rust
InvalidTreasuryAccount,
InvalidTreasuryMint,
InvalidAdminPubkey,
```

---

### [L-02] Missing Project ID in Box PDA Could Allow Theoretical Collision

**Severity:** LOW
**Location:** [lib.rs:1007-1012](backend/program/programs/lootbox_platform/src/lib.rs#L1007-L1012)

**Description:**
Box PDAs use `project_id` and `box_id` as seeds, which is correct. However, the project_id in the seed comes from the instruction parameter, not the verified project_config. An attacker could theoretically pass mismatched parameters.

**Current:**
```rust
seeds = [
    b"box",
    project_id.to_le_bytes().as_ref(),
    (project_config.total_boxes_created + 1).to_le_bytes().as_ref()
]
```

**Note:** The project_config is verified by seeds using the same project_id, so this is actually safe. The risk is minimal.

**Recommendation:**
Consider using `project_config.project_id` for clarity and safety:
```rust
seeds = [
    b"box",
    project_config.project_id.to_le_bytes().as_ref(),
    ...
]
```

---

### [L-03] Reveal Window Constant Should Be Configurable

**Severity:** LOW
**Location:** [lib.rs:9](backend/program/programs/lootbox_platform/src/lib.rs#L9)

**Description:**
`REVEAL_WINDOW_SECONDS` is a compile-time constant:
```rust
const REVEAL_WINDOW_SECONDS: i64 = 3600; // 1 hour
```

This cannot be adjusted without program redeployment.

**Impact:**
Operational inflexibility. If Switchboard oracle performance changes, the window cannot be adjusted.

**Recommendation:**
Move to `PlatformConfig` as an admin-configurable parameter.

---

### [L-04] Unchecked Arithmetic in close_platform_config

**Severity:** LOW
**Location:** [lib.rs:793](backend/program/programs/lootbox_platform/src/lib.rs#L793)

**Description:**
```rust
**admin_info.try_borrow_mut_lamports()? = admin_info.lamports().checked_add(lamports).unwrap();
```

The `.unwrap()` on checked_add could panic in extreme edge cases.

**Impact:**
Theoretical panic if admin already has near-max lamports (practically impossible).

**Recommendation:**
Replace with proper error handling:
```rust
**admin_info.try_borrow_mut_lamports()? = admin_info.lamports()
    .checked_add(lamports)
    .ok_or(LootboxError::ArithmeticOverflow)?;
```

---

## Informational Findings

### [I-01] Comprehensive Use of Checked Arithmetic - POSITIVE

**Location:** Throughout the program

**Description:**
The program consistently uses `checked_add`, `checked_sub`, `checked_mul`, `checked_div` for all arithmetic operations involving token amounts and counters. This is excellent practice.

---

### [I-02] Proper PDA Derivation - POSITIVE

**Location:** All account contexts

**Description:**
PDAs are derived using deterministic seeds with proper bump verification. The seeds include project_id, token mint, and appropriate prefixes, preventing collision attacks.

---

### [I-03] No Reentrancy Vulnerabilities

**Location:** Throughout

**Description:**
The program follows Solana's standard pattern of updating state before making CPI calls, and uses Anchor's built-in protections. No reentrancy vectors identified.

---

### [I-04] Good Access Control Pattern - POSITIVE

**Location:** All admin functions

**Description:**
Admin functions properly verify `platform_config.admin == admin.key()` through Anchor constraints. Project owner functions similarly verify ownership.

---

### [I-05] Switchboard VRF Integration

**Location:** [lib.rs:463-472](backend/program/programs/lootbox_platform/src/lib.rs#L463-L472)

**Description:**
The Switchboard VRF integration is implemented correctly:
- Uses official SDK for parsing randomness
- Validates randomness is revealed before use
- Commits randomness account at commit time, preventing manipulation

**Note:** The reliance on Switchboard oracles means oracle downtime affects reveal functionality (as observed in devnet testing).

---

### [I-06] Emergency Pause Functionality - POSITIVE

**Location:** [lib.rs:150-157](backend/program/programs/lootbox_platform/src/lib.rs#L150-L157)

**Description:**
The platform has a `paused` flag that can halt all critical operations. Importantly, `settle_box` is exempt from pause checks, ensuring users can always claim revealed rewards.

---

## Economic Model Analysis

### Actual Configured Model (No-Dud Design)

**CORRECTION:** The program initialization contains placeholder values. The **actual configured model** uses a "no-dud" design where duds only occur for expired boxes, not random outcomes. The current live configuration (from AdminDashboard/PlatformConfig PDA) is:

**Payout Multipliers:**
| Outcome | Multiplier | Notes |
|---------|------------|-------|
| Dud | 0x | Only for expired boxes (1hr reveal window) |
| Rebate | 0.5x | Worst outcome in normal gameplay |
| Break-even | 1.0x | Get your money back |
| Profit | 1.5x | 50% profit |
| Jackpot | 4x | Big win |

**Tier Probabilities (Configured):**
| Outcome | Tier 1 (Luck 0-5) | Tier 2 (Luck 6-13) | Tier 3 (Luck 14-60) |
|---------|-------------------|---------------------|---------------------|
| Dud | 0% | 0% | 0% |
| Rebate | 72% | 57% | 44% |
| Break-even | 17% | 26% | 34% |
| Profit | 9% | 15% | 20% |
| Jackpot | 2% | 2% | 2% |
| **RTP** | **74.5%** | **85%** | **94%** |

**Expected Value Analysis (Tier 3):**
```
EV = (0 × 0) + (0.44 × 0.5) + (0.34 × 1) + (0.20 × 1.5) + (0.02 × 4)
   = 0 + 0.22 + 0.34 + 0.30 + 0.08 = 0.94 (94% RTP)
```

**FINDING:** The economic model is well-designed:
- 94% RTP for Tier 3 is competitive with casino games (roulette is 94.7%)
- No duds in normal gameplay provides better player experience
- Fixed 2% jackpot across tiers is variance-controlled
- House edge ranges from 6% (Tier 3) to 25.5% (Tier 1)

**No action required** - the economics are sound and intentionally designed

---

## Recommendations Summary

### Immediate (Before Mainnet)

1. **[C-01]** Add vault token account verification constraints (mint + owner)
2. **[H-01, H-02, H-03]** Add ownership/mint verification to all token accounts
3. **[M-02]** Add probability sum validation in config updates
4. **[M-03, M-04]** Add buyer/launch fee token account verification

### Short-Term

5. **[L-01]** Create specific error codes for different failures
6. **[L-04]** Replace `.unwrap()` with proper error handling

### Long-Term Improvements

7. **[L-03]** Make reveal window configurable (move to PlatformConfig)
8. **[M-01]** Consider integer-only arithmetic for probabilities
9. **[M-05]** Evaluate rate limiting mechanisms (backend already has this)

---

## Testing Recommendations

1. **Fuzz testing** for arithmetic operations with extreme values
2. **Integration tests** verifying all token account constraints
3. **Economic simulation** with thousands of boxes to validate payout distribution
4. **Oracle failure scenarios** testing (already discovered in devnet)
5. **Concurrent transaction testing** for race conditions

---

## Audit Limitations

This audit was conducted through static code analysis only. It does not include:
- Runtime testing or dynamic analysis
- Formal verification
- Full economic modeling
- Frontend/backend integration review
- Third-party dependency audit (Switchboard SDK)

---

## Conclusion

The lootbox_platform program demonstrates solid Solana/Anchor development practices with proper use of PDAs, checked arithmetic, and access controls. The critical finding regarding vault token account verification should be addressed before handling real funds on mainnet.

**Key Strengths:**
- Well-designed multi-tenant architecture (each project has own vault/token)
- Configurable parameters via PlatformConfig PDA (admin can tune without redeploy)
- No-dud economic model with balanced RTP (74.5% - 94%)
- Proper Switchboard VRF integration for provably fair randomness
- Emergency pause functionality that still allows settlements

**Primary Concerns:**
The main issue is missing token account verification constraints. While the token transfers would fail if the wrong account is used (SPL Token program checks), adding explicit constraints provides:
1. Better error messages for debugging
2. Defense-in-depth security
3. Prevents potential edge cases with malicious transaction construction

**Recommended Actions:**
1. Implement token account verification constraints (C-01, H-01-H-03)
2. Add probability sum validation in `update_platform_config`
3. Conduct thorough integration testing on devnet
4. Consider a professional audit firm review before significant TVL on mainnet

**Architecture Compatibility:**
All recommendations are compatible with:
- Multi-tenant design (multiple projects, each with own token)
- Global treasury collecting commission in multiple tokens
- Per-project luck intervals
- Single wallet owning multiple projects

---

*This automated audit should be supplemented with manual expert review and professional audit services for production deployment with significant funds at risk.*
