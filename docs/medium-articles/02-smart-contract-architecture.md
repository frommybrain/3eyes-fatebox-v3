# Building a Provably Fair On-Chain Lootbox Platform on Solana

## Part 2: Smart Contract Architecture Deep-Dive

*This is the second article in a series documenting the development of 3Eyes FateBox—a multi-tenant lootbox gambling platform for Solana SPL token communities.*

---

In the [first article](./01-introduction.md), I explained why we're building FateBox and how $3EYES powers the platform. Now let's get technical.

This article covers the smart contract architecture: how we designed the on-chain program, why PDAs are the foundation of trustless gambling, and the complete instruction flow from project creation to reward claims.

If you've ever wondered how to build self-custodial infrastructure on Solana, this is for you.

---

## The Architecture Philosophy

Before diving into code, let me explain our design principles:

1. **Self-Custodial**: No human should be able to access user funds
2. **Multi-Tenant**: One program serves unlimited projects
3. **Tunable**: Parameters can be adjusted without redeploying
4. **Verifiable**: All state is public and auditable

These principles drove every technical decision.

---

## Understanding Program Derived Addresses (PDAs)

PDAs are the foundation of FateBox security. If you're not familiar with them, here's the key insight:

**A PDA is a Solana address with no private key.**

Traditional wallets have a private key that signs transactions. PDAs don't. Instead, they can only be "signed for" by the program that derived them. This is enforced at the Solana runtime level—it's not something we implemented, it's how Solana works.

### Why This Matters for Gambling

When you deposit tokens into a FateBox vault, they go to a PDA-controlled token account. Since no private key exists for this address:

- **Developers can't steal funds** (there's no key to steal)
- **Hackers can't drain wallets** (there's no key to compromise)
- **Only program logic can move tokens** (enforced by Solana)

This is what "trustless" actually means. You're not trusting us—you're trusting math and the Solana runtime.

### PDA Derivation

PDAs are derived deterministically from "seeds" and a program ID. Same seeds always produce the same address. Here's how we derive our PDAs:

```javascript
// Platform Config - Global singleton
const [platformConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform_config')],
    PROGRAM_ID
);

// Treasury - Global commission vault
const [treasuryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury')],
    PROGRAM_ID
);

// Project Config - Per-project settings
const projectIdBytes = new BN(projectId).toArrayLike(Buffer, 'le', 8);
const [projectConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('project'), projectIdBytes],
    PROGRAM_ID
);

// Vault Authority - Controls project's token vault
const [vaultAuthorityPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), projectIdBytes, tokenMint.toBuffer()],
    PROGRAM_ID
);

// Box Instance - Individual box state
const boxIdBytes = new BN(boxId).toArrayLike(Buffer, 'le', 8);
const [boxInstancePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('box'), projectIdBytes, boxIdBytes],
    PROGRAM_ID
);
```

Notice how each PDA includes relevant identifiers in its seeds. This means:
- Each project has a unique vault authority
- Each box has a unique state account
- Collisions are impossible (deterministic derivation)

---

## The Account Structures

### PlatformConfig: Global Parameters

This is the singleton that controls the entire platform:

```rust
pub struct PlatformConfig {
    pub admin: Pubkey,              // Only this wallet can update config
    pub initialized: bool,
    pub paused: bool,               // Emergency pause all operations

    // Luck parameters
    pub base_luck: u8,              // Starting luck (default: 5)
    pub max_luck: u8,               // Maximum luck (default: 60)
    pub luck_time_interval: i64,    // Seconds per +1 luck

    // Payout multipliers (basis points: 10000 = 1.0x)
    pub payout_dud: u32,            // 0 = 0x (only for expired boxes)
    pub payout_rebate: u32,         // 5000 = 0.5x
    pub payout_breakeven: u32,      // 10000 = 1.0x
    pub payout_profit: u32,         // 15000 = 1.5x
    pub payout_jackpot: u32,        // 40000 = 4x

    // Tier probabilities (basis points, must sum to 10000)
    pub tier1_max_luck: u8,
    pub tier1_dud: u16,
    pub tier1_rebate: u16,
    pub tier1_breakeven: u16,
    pub tier1_profit: u16,
    // tier1_jackpot = 10000 - sum (calculated)

    // ... tier2 and tier3 similar ...

    // Platform commission
    pub platform_commission_bps: u16, // 500 = 5%
    pub treasury_bump: u8,

    pub updated_at: i64,
}
```

**Key design decisions:**

1. **Basis points for precision**: We use 10000 = 100% instead of floats. This avoids floating-point errors and is standard in financial systems.

2. **Jackpot calculated implicitly**: Instead of storing all 5 probabilities, we store 4 and calculate the 5th. This ensures they always sum to exactly 10000.

3. **Commission is configurable**: We can adjust the platform fee without redeploying (though it's capped at 50% max for sanity).

### ProjectConfig: Per-Project Settings

Each project gets its own config account:

```rust
pub struct ProjectConfig {
    pub project_id: u64,
    pub owner: Pubkey,
    pub payment_token_mint: Pubkey,
    pub box_price: u64,
    pub vault_authority_bump: u8,
    pub total_boxes_created: u64,
    pub total_boxes_settled: u64,
    pub total_revenue: u64,
    pub total_paid_out: u64,
    pub active: bool,
    pub launch_fee_paid: bool,
    pub created_at: i64,
}
```

The `vault_authority_bump` is crucial. When we derive a PDA, Solana sometimes needs to try multiple "bumps" to find a valid address. We store the bump so we don't have to recalculate it every time.

### BoxInstance: Individual Box State

Every box purchased creates one of these:

```rust
pub struct BoxInstance {
    pub box_id: u64,
    pub project_id: u64,
    pub owner: Pubkey,
    pub created_at: i64,
    pub committed_at: i64,          // When user clicked "Open"
    pub luck: u8,                   // Frozen at commit time
    pub revealed: bool,
    pub settled: bool,
    pub reward_amount: u64,
    pub is_jackpot: bool,
    pub random_percentage: f64,
    pub reward_tier: u8,            // 0=Dud, 1=Rebate, 2=Breakeven, 3=Profit, 4=Jackpot
    pub randomness_account: Pubkey, // Switchboard VRF account
    pub randomness_committed: bool,
}
```

Notice the state machine embedded here:
- `created_at` set, `committed_at = 0` → Box purchased, not opened
- `committed_at` set, `revealed = false` → Box opened, awaiting VRF
- `revealed = true`, `settled = false` → Outcome known, awaiting claim
- `settled = true` → Complete

---

## The Instruction Flow

### 1. Platform Initialization (One-Time)

```
Admin → initialize_platform_config → PlatformConfig PDA created
```

This happens once when deploying the platform. It sets up the global singleton and establishes the admin wallet.

### 2. Project Creation

```
Creator → initialize_project → ProjectConfig + VaultAuthority PDAs created
                            → Launch fee (100 $3EYES) transferred to platform
```

Here's the Anchor instruction definition:

```rust
#[derive(Accounts)]
#[instruction(project_id: u64)]
pub struct InitializeProject<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + ProjectConfig::LEN,
        seeds = [b"project", project_id.to_le_bytes().as_ref()],
        bump
    )]
    pub project_config: Account<'info, ProjectConfig>,

    /// CHECK: PDA that will control vault tokens
    #[account(
        seeds = [b"vault", project_id.to_le_bytes().as_ref(), payment_token_mint.key().as_ref()],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    pub payment_token_mint: Account<'info, Mint>,

    // ... fee accounts for launch fee transfer ...
}
```

The `#[account(init, ...)]` macro tells Anchor to:
1. Derive the PDA from seeds
2. Create the account
3. Set the owner to our program
4. Charge the payer (owner) for rent

### 3. Box Purchase

```
User → create_box → BoxInstance PDA created
                 → Tokens transferred: User → Vault (95%) + Treasury (5%)
```

This is where commission collection happens:

```rust
// Calculate commission
let commission = (box_price * platform_config.platform_commission_bps as u64) / 10000;
let net_amount = box_price - commission;

// Transfer to vault
transfer(
    CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.buyer_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        },
    ),
    net_amount,
)?;

// Transfer commission to treasury
if commission > 0 {
    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer_token_account.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        ),
        commission,
    )?;
}
```

**Every box purchase automatically splits tokens between the project vault and platform treasury.** This is enforced by the program—creators can't avoid paying commission.

### 4. Box Commit (Open)

```
User → commit_box → Luck score frozen
                 → VRF randomness requested
                 → committed_at timestamp set
```

The commit phase is critical for fairness:

```rust
pub fn commit_box(ctx: Context<CommitBox>) -> Result<()> {
    let box_instance = &mut ctx.accounts.box_instance;
    let platform_config = &ctx.accounts.platform_config;
    let clock = Clock::get()?;

    require!(!box_instance.randomness_committed, LootboxError::RandomnessAlreadyCommitted);

    // Calculate and freeze luck
    let hold_time = clock.unix_timestamp - box_instance.created_at;
    let bonus_luck = (hold_time / platform_config.luck_time_interval) as u8;
    let luck = std::cmp::min(
        platform_config.base_luck + bonus_luck,
        platform_config.max_luck
    );

    box_instance.luck = luck;
    box_instance.committed_at = clock.unix_timestamp;
    box_instance.randomness_committed = true;
    box_instance.randomness_account = ctx.accounts.randomness_account.key();

    Ok(())
}
```

**Why freeze luck at commit time?** If we calculated luck at reveal time, a user could wait to see unfavorable randomness and try again. By freezing luck when they commit, we ensure they can't game the timing.

### 5. Box Reveal

```
User → reveal_box → VRF randomness consumed
                 → Outcome calculated on-chain
                 → reward_amount, reward_tier set
```

This is where the magic happens. We'll cover the VRF details in Article 3, but here's the outcome calculation:

```rust
// Get random value (0-99)
let random_value = (randomness_bytes[0] as u16
    + randomness_bytes[1] as u16
    + randomness_bytes[2] as u16
    + randomness_bytes[3] as u16) % 100;

// Determine tier based on luck
let (dud_prob, rebate_prob, breakeven_prob, profit_prob) =
    if luck <= platform_config.tier1_max_luck {
        (tier1_dud, tier1_rebate, tier1_breakeven, tier1_profit)
    } else if luck <= platform_config.tier2_max_luck {
        (tier2_dud, tier2_rebate, tier2_breakeven, tier2_profit)
    } else {
        (tier3_dud, tier3_rebate, tier3_breakeven, tier3_profit)
    };

// Map random value to outcome
let cumulative_dud = dud_prob;
let cumulative_rebate = cumulative_dud + rebate_prob;
let cumulative_breakeven = cumulative_rebate + breakeven_prob;
let cumulative_profit = cumulative_breakeven + profit_prob;

let (tier, multiplier) = if random_value < cumulative_dud {
    (0, payout_dud)
} else if random_value < cumulative_rebate {
    (1, payout_rebate)
} else if random_value < cumulative_breakeven {
    (2, payout_breakeven)
} else if random_value < cumulative_profit {
    (3, payout_profit)
} else {
    (4, payout_jackpot)
};

// Calculate payout
let reward = (box_price * multiplier as u64) / 10000;
```

**All of this is deterministic.** Given the same randomness and luck score, anyone can verify the outcome calculation.

### 6. Claim Reward (Settle)

```
User → settle_box → Tokens transferred: Vault → User
                 → Box marked as settled
```

The vault authority PDA signs for this transfer:

```rust
pub fn settle_box(ctx: Context<SettleBox>) -> Result<()> {
    let box_instance = &mut ctx.accounts.box_instance;
    let project_config = &ctx.accounts.project_config;

    require!(box_instance.revealed, LootboxError::BoxNotRevealed);
    require!(!box_instance.settled, LootboxError::BoxAlreadySettled);

    // Transfer reward from vault to user
    let seeds = &[
        b"vault",
        &project_config.project_id.to_le_bytes(),
        ctx.accounts.payment_token_mint.key().as_ref(),
        &[project_config.vault_authority_bump],
    ];
    let signer = &[&seeds[..]];

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            signer,
        ),
        box_instance.reward_amount,
    )?;

    box_instance.settled = true;

    Ok(())
}
```

The `CpiContext::new_with_signer` is key here. It tells Solana "this PDA is authorizing this transfer." The runtime verifies that our program derived this PDA, and only then allows the transfer.

---

## Security Constraints

Every instruction includes validation. Here are the key checks:

```rust
// Only box owner can commit/reveal/claim
require!(
    ctx.accounts.owner.key() == box_instance.owner,
    LootboxError::NotBoxOwner
);

// Only project owner can withdraw
require!(
    ctx.accounts.owner.key() == project_config.owner,
    LootboxError::NotProjectOwner
);

// Can't reveal before committing
require!(
    box_instance.randomness_committed,
    LootboxError::RandomnessNotCommitted
);

// Can't reveal twice
require!(
    !box_instance.revealed,
    LootboxError::BoxAlreadyRevealed
);

// Can't claim before revealing
require!(
    box_instance.revealed,
    LootboxError::BoxNotRevealed
);

// Can't claim twice
require!(
    !box_instance.settled,
    LootboxError::BoxAlreadySettled
);

// Platform pause check
require!(
    !platform_config.paused,
    LootboxError::PlatformPaused
);
```

These checks are enforced by the program. There's no way to bypass them—it's not a configuration option, it's compiled into the binary.

---

## The Multi-Tenant Model

FateBox is designed to serve unlimited projects from a single deployed program. Here's how it works:

```
┌─────────────────────────────────────────────────────────────┐
│                 FATEBOX PROGRAM (Single Deploy)             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────┐  │
│  │ PlatformConfig  │  │    Treasury     │  │  Treasury  │  │
│  │     (Global)    │  │   PDA (Global)  │  │  ATAs...   │  │
│  └─────────────────┘  └─────────────────┘  └────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Project 1 (CATS Token)                              │   │
│  │  - ProjectConfig PDA                                │   │
│  │  - VaultAuthority PDA → Vault Token Account (CATS)  │   │
│  │  - BoxInstance PDAs (1, 2, 3, ...)                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Project 2 (DOGE Token)                              │   │
│  │  - ProjectConfig PDA                                │   │
│  │  - VaultAuthority PDA → Vault Token Account (DOGE)  │   │
│  │  - BoxInstance PDAs (1, 2, 3, ...)                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ... unlimited projects ...                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Why this matters:**
- One security audit covers all projects
- Projects share proven infrastructure
- Platform commission flows to single treasury
- Global parameters can be updated once

---

## Lessons Learned

### 1. Use Basis Points, Not Percentages

Floating-point math is dangerous in financial applications. We use basis points (1 bp = 0.01%) for all probability and payout calculations. This gives us 4 decimal places of precision with simple integer math.

### 2. Store Bumps

PDA derivation includes finding a "bump" value. While Solana caches this, storing it explicitly makes our code faster and more predictable.

### 3. Explicit State Machines

Rather than relying on complex conditionals, we use explicit boolean flags (`revealed`, `settled`, `randomness_committed`) to track state. This makes the code easier to audit and reason about.

### 4. Commission at Source

We collect commission during box purchase, not during creator withdrawal. This ensures the platform always gets paid and simplifies the withdrawal logic.

### 5. Freeze Early

The luck score is frozen at commit time, not reveal time. This prevents timing attacks where users might try to manipulate their effective odds.

---

## What's Next

In [Article 3](./03-switchboard-vrf.md), we'll dive into Switchboard VRF integration: how we request randomness, why the commit-reveal pattern matters, and how anyone can verify that outcomes weren't manipulated.

The smart contract architecture we covered today provides the skeleton. VRF provides the heart—the unpredictable, verifiable randomness that makes provably fair gambling possible.

---

## Quick Reference

**Program ID (Devnet):** `GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat`

**PDA Seeds:**
| PDA | Seeds |
|-----|-------|
| PlatformConfig | `["platform_config"]` |
| Treasury | `["treasury"]` |
| ProjectConfig | `["project", project_id_le_bytes]` |
| VaultAuthority | `["vault", project_id_le_bytes, token_mint]` |
| BoxInstance | `["box", project_id_le_bytes, box_id_le_bytes]` |

**Instruction Flow:**
```
initialize_platform_config (once)
        ↓
initialize_project (per project)
        ↓
create_box (per purchase)
        ↓
commit_box (user opens)
        ↓
reveal_box (VRF consumed)
        ↓
settle_box (claim reward)
```

---

*Next up: Article 3 - Switchboard VRF integration, the commit-reveal pattern, and how we achieve verifiable randomness.*

---

**Links:**
- Twitter: [@3eyesworld](https://twitter.com/3eyesworld)
- Discord: [discord.gg/3eyes](https://discord.gg/3eyes)
- Previous: [Article 1 - Why We're Building FateBox](./01-introduction.md)

*Disclaimer: Gambling involves risk. This article is for educational purposes about the technical architecture. Always gamble responsibly.*
