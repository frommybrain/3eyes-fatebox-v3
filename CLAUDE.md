# 3Eyes FateBox v3 - Master Project Specification

**Last Updated:** January 21, 2026 (Updated: Security Fixes & Audit)
**Version:** 3.0 (Development)
**Network:** Devnet (Solana)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [On-Chain Program (Anchor/Rust)](#on-chain-program-anchorrust)
5. [Backend API (Node.js/Express)](#backend-api-nodejsexpress)
6. [Frontend (Next.js/React)](#frontend-nextjsreact)
7. [Database Schema (Supabase)](#database-schema-supabase)
8. [Complete User Flows](#complete-user-flows)
9. [PDA Architecture](#pda-architecture)
10. [Game Mechanics](#game-mechanics)
11. [Game Presets System](#game-presets-system)
12. [Configuration Architecture (On-Chain Source of Truth)](#configuration-architecture-on-chain-source-of-truth)
13. [Enterprise Activity Logging System](#enterprise-activity-logging-system)
14. [Switchboard VRF Integration](#switchboard-vrf-integration)
15. [Current Implementation Status](#current-implementation-status)
16. [Platform Treasury & Commission System](#platform-treasury--commission-system)
17. [Creator Withdrawals](#creator-withdrawals)
18. [Security Considerations](#security-considerations)
19. [Common Debugging Scenarios](#common-debugging-scenarios)
20. [Environment Configuration](#environment-configuration)
21. [Deployment Information](#deployment-information)
22. [Open Design Decisions](#open-design-decisions)
23. [3EYES Project Updates](#3eyes-project-updates)

---

## Executive Summary

**3Eyes FateBox v3** is a multi-tenant, Solana-based lootbox gambling platform. Project creators can launch their own token-based gambling experiences where users purchase "boxes" with outcomes determined by Switchboard VRF (Verifiable Random Function).

### Core Value Propositions

1. **Provably Fair** - All randomness from Switchboard VRF oracles, verifiable on-chain
2. **Multi-Tenant** - Anyone can create their own lootbox project with any SPL token
3. **Self-Custodial** - PDA-controlled vaults, no developer access to funds
4. **Tunable Parameters** - Admin can adjust probabilities/payouts without redeploying

### Platform Flow (High Level)

```
Creator pays launch fee (100 $3EYES) → Creates project with custom token
    ↓
Creator funds vault with tokens → Project goes live
    ↓
Users buy boxes → Tokens go to vault (5% commission to platform treasury)
    ↓
Users hold boxes → Luck accumulates (longer hold = better odds)
    ↓
Users open boxes → VRF commits randomness, luck freezes
    ↓
Users reveal boxes → VRF provides randomness, reward calculated
    ↓
Users claim rewards → Tokens transferred from vault
    ↓
Creator withdraws profits → In project token (no fee - commission already taken)
    ↓
Platform processes treasury → 90% $3EYES buyback, 10% dev wallet
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js 16 + React 19)               │
│  - Wallet connection (Solflare, Phantom)                            │
│  - Project discovery and box purchasing                             │
│  - Real-time state updates via Supabase                             │
│  - React 19 useOptimistic for UI updates                            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ REST API
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express.js)                           │
│  - Transaction building (Anchor SDK)                                │
│  - Database operations (Supabase)                                   │
│  - On-chain state verification                                      │
│  - Admin endpoints for platform config                              │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────────┐   ┌───────────────────────────────────────┐
│  SUPABASE (PostgreSQL)  │   │           SOLANA BLOCKCHAIN           │
│  - Project metadata     │   │                                       │
│  - Box records          │   │  ┌─────────────────────────────────┐  │
│  - Platform config      │   │  │  3Eyes Platform Program         │  │
│  - Cached stats         │   │  │  - PlatformConfig PDA (global)  │  │
└─────────────────────────┘   │  │  - ProjectConfig PDAs           │  │
                              │  │  - BoxInstance PDAs              │  │
                              │  │  - Vault Token Accounts          │  │
                              │  └─────────────────────────────────┘  │
                              │                                       │
                              │  ┌─────────────────────────────────┐  │
                              │  │  Switchboard VRF                 │  │
                              │  │  - Randomness accounts           │  │
                              │  │  - Oracle-signed values          │  │
                              │  └─────────────────────────────────┘  │
                              └───────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Blockchain | Solana | 1.18+ |
| Smart Contract | Anchor | 0.30.1 |
| VRF Oracle | Switchboard On-Demand | @switchboard-xyz/on-demand |
| Backend | Node.js + Express | 20.x |
| Frontend | Next.js | 16.x |
| UI Framework | React | 19.x |
| Database | Supabase (PostgreSQL) | - |
| Wallet Adapter | @solana/wallet-adapter | Latest |
| Token Standard | SPL Token | - |

---

## On-Chain Program (Anchor/Rust)

### Program ID
```
GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
```

### IDL Location
```
backend/program/target/idl/lootbox_platform.json
```

The Anchor IDL auto-generates TypeScript types and is used by the backend for instruction building.

### Instructions

| Instruction | Description | Key Accounts |
|-------------|-------------|--------------|
| `initialize_platform_config` | One-time setup of global config | admin, platformConfig, treasury |
| `update_platform_config` | Admin updates probabilities/payouts/commission | admin, platformConfig |
| `transfer_platform_admin` | Transfer admin to new wallet | admin, platformConfig |
| `initialize_project` | Create new lootbox project | owner, projectConfig, vaultAuthority |
| `create_box` | User purchases a box (with commission) | buyer, projectConfig, boxInstance, vaultTokenAccount, treasuryTokenAccount |
| `commit_box` | User opens box, commits VRF | owner, platformConfig, boxInstance |
| `reveal_box` | Reveal with VRF randomness | owner, platformConfig, boxInstance, randomnessAccount |
| `settle_box` | Transfer reward to user | owner, projectConfig, boxInstance, vaultTokenAccount |
| `refund_box` | Refund box price to user (system errors) | owner, projectConfig, boxInstance, vaultTokenAccount |
| `withdraw_earnings` | Creator withdraws from vault | owner, projectConfig, vaultTokenAccount |
| `withdraw_treasury` | Admin withdraws from treasury | admin, platformConfig, treasury, treasuryTokenAccount |
| `update_project` | Pause/resume, change price, update luck interval | owner, projectConfig |
| `close_project` | Close project, reclaim rent | owner, projectConfig |

### Account Structures

#### PlatformConfig (261 bytes) - Global Singleton
```rust
pub struct PlatformConfig {
    pub admin: Pubkey,              // 32 bytes - Only this wallet can update
    pub initialized: bool,          // 1 byte
    pub paused: bool,               // 1 byte - Emergency pause all operations

    // Luck parameters
    pub base_luck: u8,              // 1 byte (default: 5)
    pub max_luck: u8,               // 1 byte (default: 60)
    pub luck_time_interval: i64,    // 8 bytes (seconds per +1 luck)

    // Default payout multipliers (basis points: 10000 = 1.0x)
    pub payout_dud: u32,            // 0 = 0x (only for expired boxes)
    pub payout_rebate: u32,         // 5000 = 0.5x
    pub payout_breakeven: u32,      // 10000 = 1.0x
    pub payout_profit: u32,         // 15000 = 1.5x
    pub payout_jackpot: u32,        // 40000 = 4x

    // Default tier probabilities (basis points, must sum to 10000)
    // No-dud model: duds only occur for expired boxes
    pub tier1_max_luck: u8,         // Luck 0-5
    pub tier1_dud: u16,             // 0 = 0% (no duds in normal gameplay)
    pub tier1_rebate: u16,          // 7200 = 72%
    pub tier1_breakeven: u16,       // 1700 = 17%
    pub tier1_profit: u16,          // 900 = 9%
    // tier1_jackpot = 10000 - sum = 200 = 2%

    pub tier2_max_luck: u8,         // Luck 6-13
    pub tier2_dud: u16,             // 0 = 0%
    pub tier2_rebate: u16,          // 5700 = 57%
    pub tier2_breakeven: u16,       // 2600 = 26%
    pub tier2_profit: u16,          // 1500 = 15%
    // tier2_jackpot = 200 = 2%

    pub tier3_dud: u16,             // Luck 14-60, 0 = 0%
    pub tier3_rebate: u16,          // 4400 = 44%
    pub tier3_breakeven: u16,       // 3400 = 34%
    pub tier3_profit: u16,          // 2000 = 20%
    // tier3_jackpot = 200 = 2%

    // Platform commission
    pub platform_commission_bps: u16, // 500 = 5% (configurable, max 50%)
    pub treasury_bump: u8,          // Bump for treasury PDA

    pub updated_at: i64,

    // ===============================================
    // GAME PRESETS (Added January 18, 2026)
    // Projects can choose preset 0-3 for different RTP profiles
    // See "Game Presets System" section for details
    // ===============================================

    // Preset 1: "Conservative" (~88% RTP)
    pub preset1_payout_rebate: u32,
    pub preset1_payout_breakeven: u32,
    pub preset1_payout_profit: u32,
    pub preset1_payout_jackpot: u32,
    pub preset1_tier1_dud: u16, pub preset1_tier1_rebate: u16,
    pub preset1_tier1_breakeven: u16, pub preset1_tier1_profit: u16,
    pub preset1_tier2_dud: u16, pub preset1_tier2_rebate: u16,
    pub preset1_tier2_breakeven: u16, pub preset1_tier2_profit: u16,
    pub preset1_tier3_dud: u16, pub preset1_tier3_rebate: u16,
    pub preset1_tier3_breakeven: u16, pub preset1_tier3_profit: u16,

    // Preset 2: "Degen" (~75% RTP, 8x jackpot)
    // (same structure as preset1)

    // Preset 3: "Whale" (~95% RTP)
    // (same structure as preset1)

    pub reserved: [u8; 32],         // Reserved for future presets
}
```

**Note:** PlatformConfig size increased from ~100 bytes to 261 bytes on January 18, 2026 to add game preset support. See [Game Presets System](#game-presets-system) for details.

#### ProjectConfig (139 bytes)
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
    pub luck_time_interval: i64,      // Per-project luck interval (0 = use platform default)
    pub game_preset: u8,              // Game config preset (0 = default, 1-3 = presets)
    pub reserved: [u8; 7],            // Reserved for future expansion
}
```

**Note:** ProjectConfig size history:
- 123 bytes: Original (before Jan 16, 2026)
- 131 bytes: Added `luck_time_interval` (Jan 16, 2026)
- 139 bytes: Added `game_preset` + `reserved` (Jan 18, 2026)

Projects created before January 16, 2026 have the old 123-byte struct and will fail to deserialize if you try to update them.

#### BoxInstance (118 bytes)
```rust
pub struct BoxInstance {
    pub box_id: u64,
    pub project_id: u64,
    pub owner: Pubkey,
    pub created_at: i64,
    pub committed_at: i64,          // When user opened box
    pub luck: u8,                   // Frozen at commit time
    pub revealed: bool,
    pub settled: bool,
    pub reward_amount: u64,
    pub is_jackpot: bool,
    pub random_percentage: f64,
    pub reward_tier: u8,            // 0=Dud, 1=Rebate, 2=Break-even, 3=Profit, 4=Jackpot, 5=Refunded
    pub randomness_account: Pubkey, // Switchboard VRF account
    pub randomness_committed: bool,
}
```

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| 6000 | InsufficientLaunchFee | Not enough $3EYES for launch fee |
| 6001 | ProjectInactive | Project is paused |
| 6002 | BoxAlreadyRevealed | Cannot reveal twice |
| 6003 | BoxNotRevealed | Must reveal before settle |
| 6004 | BoxAlreadySettled | Cannot settle twice |
| 6005 | NotBoxOwner | Caller doesn't own box |
| 6006 | NotProjectOwner | Caller doesn't own project |
| 6007 | NotPlatformAdmin | Only admin can update config |
| 6008 | InsufficientVaultBalance | Vault can't cover reward |
| 6009 | InsufficientFeeBalance | Not enough for withdrawal fee |
| 6010 | InvalidBoxPrice | Price must be > 0 |
| 6011 | ArithmeticOverflow | Math overflow |
| 6012 | RandomnessNotReady | VRF not revealed yet |
| 6013 | RandomnessNotCommitted | Must commit before reveal |
| 6014 | RandomnessAlreadyCommitted | Can't commit twice |
| 6015 | InvalidRandomnessAccount | Wrong VRF account |
| 6016 | PlatformPaused | All operations paused |
| 6017 | VaultNotEmpty | Must empty vault to close |
| 6018 | RevealWindowExpired | 1 hour reveal window passed |
| 6019 | InvalidCommissionRate | Commission > 50% (5000 bps) |

### Instruction Flow Details

#### Box Lifecycle (On-Chain)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BOX STATE MACHINE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  create_box                 commit_box                reveal_box               settle_box
      │                          │                         │                        │
      ▼                          ▼                         ▼                        ▼
┌──────────┐    hold time   ┌──────────┐   VRF ready  ┌──────────┐   claim     ┌──────────┐
│ PENDING  │ ──────────────▶│ COMMITTED│ ────────────▶│ REVEALED │ ──────────▶│ SETTLED  │
│          │    (luck++)    │          │              │          │             │          │
│ luck=0   │                │ luck=N   │              │reward=X  │             │ paid=X   │
│ opened=F │                │ opened=T │              │ tier=T   │             │ settled=T│
└──────────┘                └──────────┘              └──────────┘             └──────────┘
                                 │                                                  ▲
                                 │     ◀── 1 hour window ──▶                       │
                                 │                                                  │
                                 │         reveal fails                             │
                                 └──────────────────────────────────────────────────┤
                                           (mark refund eligible)                   │
                                                    │                               │
                                                    ▼                               │
                                            ┌──────────────┐     refund_box         │
                                            │   REFUND     │ ──────────────────────▶│
                                            │   ELIGIBLE   │   (box_price - comm)   │
                                            └──────────────┘                        │
```

#### create_box
- Transfers `box_price` from buyer to vault (95%)
- Transfers `commission` to treasury (5%)
- Creates BoxInstance PDA with `owner`, `project_id`, timestamps
- Increments `project_config.total_boxes_created` and `total_revenue`

#### commit_box (Open Box)
- Creates Switchboard randomness account
- Freezes luck at current time: `luck = min(base_luck + (hold_time / interval), max_luck)`
- Stores `randomness_account` pubkey and `committed_at` timestamp
- Sets `randomness_committed = true`
- User has 1 hour to reveal

#### reveal_box
- Reads VRF result from randomness account
- Calculates `random_percentage` (0-100 from VRF bytes)
- Determines tier based on luck and tier probabilities
- Calculates `reward_amount = box_price * payout_multiplier`
- Sets `revealed = true`, stores `reward_tier`

#### settle_box
- **Security:** State updated BEFORE CPI (reentrancy prevention)
- Transfers `reward_amount` from vault to owner
- Sets `settled = true`
- Updates `project_config.total_paid_out`

#### refund_box
- Only for boxes marked as refund-eligible (system errors)
- Refunds `box_price - commission` (commission already in treasury)
- Sets `reward_tier = 5` (Refunded)

### Key Security Patterns

```rust
// 1. All arithmetic uses checked operations
total_revenue = total_revenue.checked_add(amount).ok_or(LootboxError::ArithmeticOverflow)?;

// 2. Ownership verified via Anchor constraints
#[account(
    constraint = box_instance.owner == owner.key() @ LootboxError::NotBoxOwner
)]

// 3. State changes before CPI (settle_box)
box_instance.settled = true;  // BEFORE transfer
token::transfer(cpi_ctx, amount)?;  // AFTER state change

// 4. PDA seeds ensure deterministic account addresses
#[account(
    seeds = [b"project", project_id.to_le_bytes().as_ref()],
    bump
)]

// 5. Token account ownership validation
constraint = token_account.owner == expected_owner.key()
```

---

## Backend API (Node.js/Express)

### Base URL
- Development: `http://localhost:3333`
- Production: TBD

### Routes

#### Config (`/api/config`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get combined platform config (on-chain + database) |

This is the **primary config endpoint** that the frontend uses. It reads the PlatformConfig PDA from on-chain as the source of truth, then supplements with database values (RPC URL, mints, etc.).

**Response includes:**
- On-chain values: `baseLuck`, `maxLuck`, `luckIntervalSeconds`, `payoutMultipliers`, `tierProbabilities`, `platformCommissionBps`, `adminWallet`, `paused`
- Database values: `rpcUrl`, `threeEyesMint`, `platformFeeAccount`, `launchFeeAmount`
- Metadata: `network`, `programId`, `source` (indicates if from on-chain or database fallback)

#### Oracle Health (`/api/oracle-health`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Check Switchboard oracle availability |

Checks if Switchboard oracles are reachable by testing DNS resolution for the xip.switchboard-oracles.xyz domain. Used by frontend before committing boxes to warn users if oracles are down.

**Response:**
- `healthy: boolean` - Whether oracles are reachable
- `message: string` - Status message or error description
- `cached: boolean` - Whether result is from 30-second cache
- `network: string` - Current network (devnet/mainnet)

#### Projects (`/api/projects`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all projects |
| GET | `/:id` | Get project by ID |
| POST | `/create` | Create project in database |
| GET | `/boxes/by-owner/:wallet` | Get user's boxes across all projects |

#### Program (`/api/program`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/build-initialize-project-tx` | Build project init transaction |
| POST | `/confirm-project-init` | Confirm init, record in DB |
| POST | `/build-fund-vault-tx` | Build vault funding transaction |
| POST | `/confirm-vault-funding` | Record vault funding in DB |
| POST | `/build-create-box-tx` | Build box purchase transaction |
| POST | `/confirm-box-creation` | Record box in database |
| POST | `/build-commit-box-tx` | Build VRF commit transaction (open box) |
| POST | `/confirm-commit` | Record commit in database |
| POST | `/build-reveal-box-tx` | Build VRF reveal transaction |
| POST | `/confirm-reveal` | Record reveal (reads on-chain result) |
| POST | `/build-settle-box-tx` | Build claim transaction |
| POST | `/confirm-settle` | Record settlement |
| POST | `/mark-reveal-failed` | Mark box as refund-eligible (system error) |
| POST | `/build-refund-box-tx` | Build refund transaction |
| POST | `/confirm-refund` | Verify on-chain refund, update database |
| POST | `/derive-pdas` | Derive all PDAs for a project |
| GET | `/project/:projectId` | Get on-chain project state |
| GET | `/box/:projectId/:boxId` | Get on-chain box state |

#### Vault (`/api/vault`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/balance/:projectId` | Get vault token balance |

#### Admin (`/api/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/update-platform-config` | Update on-chain platform config (incl. commission) |
| GET | `/platform-config` | Read current on-chain config |
| GET | `/treasury/:tokenMint` | Get treasury balance for specific token |
| GET | `/treasury-balances` | Get all treasury balances (shows $3EYES first) |
| POST | `/withdraw-treasury` | Withdraw tokens from treasury to admin wallet |

### Key Files

| File | Purpose |
|------|---------|
| `server.js` | Express entry point, middleware |
| `routes/program.js` | All on-chain transaction building (2400+ lines) |
| `routes/projects.js` | Project CRUD operations |
| `routes/vault.js` | Vault balance queries |
| `routes/admin.js` | Admin platform config sync |
| `lib/pdaHelpers.js` | PDA derivation utilities (incl. treasury) |
| `lib/anchorClient.js` | Anchor program connection |
| `lib/getNetworkConfig.js` | Network/RPC configuration (reads on-chain config) |
| `lib/switchboard.js` | Switchboard VRF helpers (create, commit, reveal) |
| `lib/priceOracle.js` | Jupiter Price API integration for fee calculations |
| `lib/evCalculator.js` | EV/RTP calculations, dynamic vault funding, reserve calculations |
| `lib/luckHelpers.js` | Luck interval helpers, presets, time-to-max-luck formatting |
| `scripts/init-platform-config.js` | Initialize platform config PDA |
| `scripts/process-treasury-fees.js` | Batch process treasury (swap to SOL, buyback) |

### Switchboard Library Functions (`lib/switchboard.js`)

| Function | Purpose |
|----------|---------|
| `getSwitchboardConstants(network)` | Get program ID and queue for network |
| `getSwitchboardProgram(provider, network)` | Get Anchor program instance |
| `createRandomnessAccount(provider, network, payer)` | Create new VRF randomness account |
| `createCommitInstruction(randomness, network, authority)` | Build commit IX |
| `createRevealInstruction(randomness, payer, network)` | Build reveal IX with retries |
| `loadRandomness(provider, pubkey, network)` | Load existing randomness account |
| `readRandomnessValue(connection, pubkey)` | Read revealed randomness bytes |
| `waitForRandomness(connection, pubkey, maxWaitMs)` | Poll until randomness ready |
| `serializeKeypair(keypair)` | Serialize keypair to base64 |
| `deserializeKeypair(base64)` | Deserialize keypair from base64 |

---

## Frontend (Next.js/React)

### Style Guide

See **[/frontend/STYLE_GUIDE.md](/frontend/STYLE_GUIDE.md)** for complete UI styling documentation including:
- Color palette and tokens
- Typography standards
- Component variants and sizes
- Spacing and padding scales
- Interaction states
- Layout patterns

All UI development should follow these standards for brand consistency.

### Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Home | Landing page with 3D scene |
| `/dashboard` | Dashboard | User's boxes and projects |
| `/dashboard/create` | CreateProject | 3-step project wizard |
| `/dashboard/manage/[id]` | ManageProject | Project settings, stats |
| `/project/[subdomain]` | ProjectPage | Buy/reveal boxes |
| `/admin` | AdminDashboard | Platform admin panel |

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Dashboard.jsx` | `components/dashboard/` | User dashboard |
| `ProjectPage.jsx` | `components/project/` | Box interaction |
| `CreateProject.jsx` | `components/create/` | Project creation |
| `AdminDashboard.jsx` | `components/admin/` | Admin panel with config sync |
| `DegenButton`, etc. | `components/ui/` | Shared UI components |
| `proxy.js` | root | Multi-tenant subdomain routing |

### State Management (Zustand)

| Store | Purpose |
|-------|---------|
| `useNetworkStore.js` | Network config, RPC, admin wallet |
| `useProjectStore.js` | Projects list, loading states |
| `useBoxStore.js` | User's boxes, filters |

### React 19 Features Used

- `useOptimistic` - Optimistic UI updates for box operations
- `useTransition` - Non-blocking state updates

### Multi-tenant Subdomain Routing

**File:** `frontend/proxy.js`

The platform uses wildcard DNS subdomain routing to give each project its own subdomain:

```
catbox.degenbox.fun → /project/catbox
myproject.degenbox.fun → /project/myproject
```

**How it works:**
1. Wildcard DNS (`*.degenbox.fun`) points all subdomains to the same server
2. `proxy.js` extracts the subdomain from the hostname
3. Requests are rewritten to `/project/[subdomain]` internally
4. Reserved subdomains (www, admin, dashboard, api) route to their respective pages

**Reserved Subdomains:**
- `www`, `app`, `admin`, `dashboard`, `api`, `docs`, `blog`, `help`, `support`, `status`, `staging`, `dev`, `test`

**Local Development:**
Use `?subdomain=` query param to test subdomain routing locally:
```
http://localhost:3000?subdomain=catbox → /project/catbox
```

**Configuration:**
- Root domain: `NEXT_PUBLIC_PLATFORM_DOMAIN` (default: `degenbox.fun`)
- CORS allowed origins set in `proxy.js`

---

## Database Schema (Supabase)

### Tables

#### `super_admin_config` (Singleton)
```sql
id: 1 (always)
network: 'devnet' | 'mainnet-beta'
rpc_url: string
admin_wallet: string (Pubkey)
lootbox_program_id: string (Pubkey)
three_eyes_mint: string (Pubkey)
platform_fee_account: string (Pubkey)
launch_fee_amount: bigint (lamports)
luck_interval_seconds: integer
is_production: boolean
platform_commission_bps: integer (default 500 = 5%)
dev_cut_bps: integer (default 1000 = 10% of commission)
dev_wallet: string (Pubkey, optional)
treasury_pda: string (Pubkey)
-- Note: vault_fund_amount removed (migration 011) - now calculated dynamically based on box price (~30x)
-- Note: withdrawal_fee_percentage removed (migration 015) - commission is only fee
-- Note: min_box_price, max_projects_per_wallet removed - no longer used
```

**Important:** The frontend `getNetworkConfig.js` only queries these columns:
- `rpc_url`, `three_eyes_mint`, `platform_fee_account`, `admin_wallet`, `launch_fee_amount`

All other config values come from the on-chain PlatformConfig PDA via the `/api/config` endpoint.

#### `projects`
```sql
id: uuid (primary key)
numeric_id: bigint (auto-increment, for PDA)
project_name: string
subdomain: string (unique)
owner_wallet: string
payment_token_mint: string
payment_token_symbol: string
payment_token_decimals: integer
box_price: bigint
project_pda: string
vault_pda: string
is_active: boolean
is_paused: boolean
boxes_created: integer
boxes_settled: integer
created_at: timestamp
```

#### `boxes`
```sql
id: uuid (primary key)
project_id: uuid (FK → projects)
box_number: integer
owner_wallet: string
box_pda: string
box_result: integer  -- See mapping table below
payout_amount: bigint
randomness_account: string
randomness_committed: boolean
committed_at: timestamp
purchase_tx_signature: string
commit_tx_signature: string
reveal_tx_signature: string
settle_tx_signature: string
luck_value: bigint
max_luck: integer
random_percentage: numeric
created_at: timestamp
opened_at: timestamp  -- When revealed
settled_at: timestamp
```

##### Box Result Value Mapping (Database vs On-Chain)

**IMPORTANT:** The database uses different values than the on-chain program:

| DB Value | Meaning | On-Chain Value | Notes |
|----------|---------|----------------|-------|
| 0 | Pending (not revealed) | N/A | Box purchased but not opened/revealed |
| 1 | Dud | 0 | No payout |
| 2 | Rebate | 1 | 0.8x box price |
| 3 | Break-even | 2 | 1.0x box price |
| 4 | Profit | 3 | 2.5x box price |
| 5 | Jackpot | 4 | 10x box price |
| 6 | Refunded | 6 | Full refund (system error) |

**Formula:** `DB value = On-chain tier + 1` (to reserve 0 for pending state)
**Exception:** Refunded uses value 6 in both DB and on-chain (migration 018)

**Code checks:**
- `box_result === 0` → Box is pending/not revealed
- `box_result !== 0` → Box has been revealed
- `box_result === 5` → Jackpot (not 4!)

#### `reserved_subdomains`
```sql
subdomain: string (primary key)
reason: string
```

#### `treasury_processing_log`
```sql
id: uuid (primary key)
processed_at: timestamp
processed_by: text (admin wallet)
action_type: text  -- 'withdraw', 'swap', 'dev_transfer', 'buyback'
token_mint: text
token_amount: bigint
amount_withdrawn: bigint
sol_received: bigint
dev_sol_amount: bigint
buyback_sol_amount: bigint
three_eyes_bought: bigint
tx_signature: text
swap_to_sol_signature: text
dev_transfer_signature: text
buyback_signature: text
status: text  -- 'completed', 'failed'
error_message: text
```

#### `project_counter` (Atomic Counter)
```sql
id: integer (always 1)
counter: bigint (current project numeric ID)
```

**Purpose:** Provides atomic sequential IDs for project creation. The numeric ID is used in PDA derivation seeds.

**RPC Function:**
```sql
CREATE OR REPLACE FUNCTION get_next_project_number()
RETURNS bigint LANGUAGE plpgsql AS $
DECLARE next_id bigint;
BEGIN
    UPDATE project_counter SET counter = counter + 1 WHERE id = 1
    RETURNING counter INTO next_id;
    IF next_id IS NULL THEN
        INSERT INTO project_counter (id, counter) VALUES (1, 1)
        ON CONFLICT (id) DO UPDATE SET counter = project_counter.counter + 1
        RETURNING counter INTO next_id;
    END IF;
    RETURN next_id;
END; $;
```

**Important:** If project creation fails due to PDA already existing on-chain (from previous testing), increment the counter to skip past used IDs:
```sql
UPDATE project_counter SET counter = 10 WHERE id = 1;
```

### Current Schema Reference

See **[/database/current_schema_130126_1337.sql](/database/current_schema_130126_1337.sql)** for the complete authoritative database schema snapshot.

### Migrations Applied

1. `001_treasury_to_vault.sql` - Renamed treasury to vault
2. `002_reserved_subdomains.sql` - Reserved subdomain list
3. `003_add_payment_token_fields.sql` - Token metadata
4. `004_add_numeric_id_sequence.sql` - Auto-increment project IDs
5. `005_add_box_verification_columns.sql` - TX signatures, luck values
6. `006_add_switchboard_vrf_columns.sql` - VRF columns for commit/reveal
7. `006b_add_withdrawal_tracking.sql` - Withdrawal history tracking
8. `007_add_commit_tracking_columns.sql` - Commit tracking
9. `010_add_treasury_processing_log.sql` - Treasury activity logging
10. `011_remove_vault_fund_amount.sql` - Remove vault_fund_amount (now dynamic)
11. `012_advance_project_sequence.sql` - Advance project counter past old PDAs
12. `013_add_project_luck_interval.sql` - Per-project luck interval column
13. `014_activity_logs.sql` - Enterprise activity logging system
14. `015_remove_withdrawal_fee_percentage.sql` - Remove deprecated withdrawal_fee_percentage column
15. `016_add_refund_columns.sql` - Add refund tracking columns (refund_eligible, reveal_failure_reason, etc.)
16. `017_add_refund_tx_signature.sql` - Add refund_tx_signature column
17. `018_allow_refunded_box_result.sql` - Update valid_box_result constraint to allow value 6 (REFUNDED)
18. `019_add_randomness_closed_column.sql` - Track if Switchboard randomness account was closed (rent reclaimed)

---

## Complete User Flows

### Flow 1: Project Creation

```
1. Creator connects wallet on /dashboard/create
       ↓
2. Frontend: Validate wallet has enough $3EYES for launch fee
       ↓
3. Creator fills form: name, subdomain, token mint, box price
       ↓
4. Frontend: POST /api/projects/create
   → Backend: Insert project in DB (status: pending)
       ↓
5. Frontend: POST /api/program/build-initialize-project-tx
   → Backend: Builds transaction with:
      - derive ProjectConfig PDA
      - derive VaultAuthority PDA
      - create ATA for vault if needed
      - initialize_project instruction (collects launch fee)
       ↓
6. Frontend: User signs with wallet, submits to Solana
       ↓
7. On-chain:
   - Transfer launch fee ($3EYES) to platform fee account
   - Create ProjectConfig PDA
   - Set vault_authority_bump
       ↓
8. Frontend: POST /api/program/confirm-project-init
   → Backend: Update project status to active
       ↓
9. Creator funds vault (separate transfer transaction)
```

### Flow 2: Box Purchase

```
1. User on /project/[subdomain] clicks "Buy Box"
       ↓
2. Frontend: POST /api/program/build-create-box-tx
   → Backend:
      - Get next box_id from project
      - Derive BoxInstance PDA
      - Build transaction:
        * create_box instruction
       ↓
3. Frontend: User signs, submits to Solana
       ↓
4. On-chain:
   - Transfer box_price tokens from user to vault
   - Create BoxInstance PDA
   - Set base_luck = 5, randomness_committed = false
       ↓
5. Frontend: POST /api/program/confirm-box-creation
   → Backend: Insert box record in DB
```

### Flow 3: Box Open (Commit VRF)

```
1. User clicks "Open Box" on purchased box
       ↓
2. Frontend: POST /api/program/build-reveal-box-tx (commit phase)
   → Backend:
      - Create Switchboard randomness keypair
      - Build transaction:
        * Switchboard VRF commit instruction
        * commit_box instruction (freezes luck)
       ↓
3. Frontend:
   - Sign with randomness keypair (ephemeral)
   - User signs with wallet
   - Submit to Solana
       ↓
4. On-chain:
   - Create Switchboard randomness account
   - commit_box: store randomness_account, freeze luck, set committed_at
       ↓
5. Wait ~10 seconds for Switchboard oracle to reveal randomness
```

### Flow 4: Box Reveal

```
1. After ~10 seconds, Frontend: POST /api/program/build-reveal-box-tx (reveal phase)
   → Backend: Build transaction:
      - Switchboard consume_randomness instruction
      - reveal_box instruction
       ↓
2. Frontend: User signs, submits
       ↓
3. On-chain:
   - Read randomness from Switchboard account (offset 152-155)
   - Check reveal window (must be within 1 hour of commit)
   - Calculate reward using luck + random_percentage + config probabilities
   - Store reward_amount, reward_tier, is_jackpot
       ↓
4. Frontend: POST /api/program/confirm-reveal
   → Backend: Read on-chain state, update DB with result
```

### Flow 5: Claim Reward (Settle)

```
1. User clicks "Claim" on revealed box
       ↓
2. Frontend: POST /api/program/build-settle-box-tx
   → Backend: Build settle_box transaction
       ↓
3. Frontend: User signs, submits
       ↓
4. On-chain:
   - Verify box revealed, not settled
   - Transfer reward_amount from vault to user (PDA signer)
   - Mark box as settled
       ↓
5. Frontend: POST /api/program/confirm-settle
   → Backend: Update box settled_at, settle_tx_signature
```

### Flow 6: Creator Withdrawal

```
1. Creator on /dashboard/manage/[id] clicks "Withdraw Profits"
       ↓
2. Frontend: Calculate available balance:
   - vault_balance = current tokens in vault
   - pending_boxes = count of unrevealed boxes
   - locked_balance = pending_boxes * box_price * 1.4 (statistical max)
   - available = vault_balance - locked_balance
       ↓
3. Frontend: POST /api/program/build-withdraw-tx
   → Backend: Build withdraw_earnings transaction
       ↓
4. Frontend: User signs, submits
       ↓
5. On-chain:
   - Verify project owner
   - Transfer amount from vault to owner (PDA signer)
       ↓
6. Payout in project token (no fee - commission already taken on box purchases)
```

### Flow 7: Admin Config Update

```
1. Admin on /admin saves config changes
       ↓
2. Frontend: Update super_admin_config in Supabase
       ↓
3. If luck_interval_seconds changed:
   → Frontend: POST /api/admin/update-platform-config
   → Backend: Build update_platform_config transaction
   → Sign with deploy wallet, submit to Solana
   → On-chain: Update PlatformConfig PDA
       ↓
4. Frontend: Show success/failure toast
```

---

## PDA Architecture

### Seeds Reference

| PDA | Seeds | Purpose |
|-----|-------|---------|
| PlatformConfig | `["platform_config"]` | Global tunable parameters |
| Treasury | `["treasury"]` | Global treasury for platform commission |
| ProjectConfig | `["project", u64_le(project_id)]` | Per-project settings |
| VaultAuthority | `["vault", u64_le(project_id), pubkey(payment_token_mint)]` | PDA that controls vault tokens |
| BoxInstance | `["box", u64_le(project_id), u64_le(box_id)]` | Individual box state |

### Derivation Code (JavaScript)

```javascript
// Platform Config
function derivePlatformConfigPDA(programId) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('platform_config')],
        programId
    );
}

// Treasury (Global)
function deriveTreasuryPDA(programId) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('treasury')],
        programId
    );
}

// Treasury Token Account (ATA for treasury PDA)
async function deriveTreasuryTokenAccount(treasuryPDA, tokenMint) {
    return await getAssociatedTokenAddress(
        tokenMint,
        treasuryPDA,
        true  // allowOwnerOffCurve - PDAs can own token accounts
    );
}

// Project Config
function deriveProjectConfigPDA(programId, projectId) {
    const projectIdBytes = new BN(projectId).toArrayLike(Buffer, 'le', 8);
    return PublicKey.findProgramAddressSync(
        [Buffer.from('project'), projectIdBytes],
        programId
    );
}

// Vault Authority
function deriveVaultAuthorityPDA(programId, projectId, paymentTokenMint) {
    const projectIdBytes = new BN(projectId).toArrayLike(Buffer, 'le', 8);
    return PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), projectIdBytes, paymentTokenMint.toBuffer()],
        programId
    );
}

// Box Instance
function deriveBoxInstancePDA(programId, projectId, boxId) {
    const projectIdBytes = new BN(projectId).toArrayLike(Buffer, 'le', 8);
    const boxIdBytes = new BN(boxId).toArrayLike(Buffer, 'le', 8);
    return PublicKey.findProgramAddressSync(
        [Buffer.from('box'), projectIdBytes, boxIdBytes],
        programId
    );
}
```

---

## Game Mechanics

### Luck System

Luck determines reward probability. Users earn luck by holding boxes longer before opening.

| Hold Time | Luck Score | Tier |
|-----------|------------|------|
| 0 | 5 (base) | Tier 1 |
| 3 hours | 6 | Tier 2 |
| 24 hours | 13 | Tier 2 |
| 7 days | 60 (max) | Tier 3 |

**Formula:**
```
bonus_luck = floor(hold_time_seconds / luck_time_interval)
current_luck = min(base_luck + bonus_luck, max_luck)
```

**Config Values:**
- `base_luck`: 5
- `max_luck`: 60
- `luck_time_interval`: Per-project (0 = use platform default)

### Per-Project Luck Interval

Project creators can set their own luck accumulation interval instead of using the platform default. This allows creators to customize the player experience.

**How it works:**
- `luck_time_interval = 0` → Uses platform default (from `PlatformConfig.luck_time_interval`)
- `luck_time_interval > 0` → Uses project's custom interval

**On-chain logic (in `commit_box`):**
```rust
let effective_interval = if project_config.luck_time_interval > 0 {
    project_config.luck_time_interval
} else {
    platform_config.luck_time_interval
};
```

**UI Features:**
- **Create Project:** Set custom luck interval during creation with presets
- **Manage Project:** Update luck interval after launch (affects all future box openings)
- **Platform Default Display:** Shows actual platform default value (e.g., "Platform Default (3 hours)")

**Database:**
- `projects.luck_interval_seconds` - NULL/0 = use platform default, >0 = custom interval
- Migration: `database/migrations/013_add_project_luck_interval.sql`

---

## Game Presets System

**Added:** January 18, 2026
**Status:** On-chain implementation complete, UI pending

The game presets system allows project creators to choose from pre-defined game configurations with different RTP (Return to Player) profiles. This gives creators flexibility while maintaining platform control over game balance.

### How It Works

1. **Platform Admin** defines 3 presets in `PlatformConfig` (on-chain)
2. **Project Creator** chooses a preset (0-3) when creating their project
3. **Preset 0** = Platform default (uses the original tier probabilities)
4. **Presets 1-3** = Custom RTP profiles defined by admin

### Preset Definitions (Current Defaults)

| Preset | Name | Tier 3 RTP | Jackpot | Description |
|--------|------|------------|---------|-------------|
| 0 | Default | 94% | 4x | Current platform settings (highest RTP) |
| 1 | Conservative | ~88% | 4x | Steady returns, lower variance |
| 2 | Degen | ~75% | 8x | High variance, biggest jackpots |
| 3 | Whale | ~95% | 3x | Best odds, smaller jackpots |

### On-Chain Implementation

#### ProjectConfig Changes
```rust
pub struct ProjectConfig {
    // ... existing fields ...
    pub game_preset: u8,              // 0 = default, 1-3 = presets
    pub reserved: [u8; 7],            // Reserved for future expansion
}
```

#### PlatformConfig Preset Fields
Each preset stores:
- 4 payout multipliers (rebate, breakeven, profit, jackpot) - 16 bytes
- 12 tier probabilities (4 per tier × 3 tiers) - 24 bytes
- Total: 36 bytes per preset × 3 presets = 108 bytes
- Plus 32 bytes reserved = 140 bytes added to PlatformConfig

#### Reward Calculation Logic
```rust
// In reveal_box instruction
let (payout_rebate, payout_breakeven, payout_profit, payout_jackpot) = match project_config.game_preset {
    1 => (config.preset1_payout_rebate, config.preset1_payout_breakeven, ...),
    2 => (config.preset2_payout_rebate, config.preset2_payout_breakeven, ...),
    3 => (config.preset3_payout_rebate, config.preset3_payout_breakeven, ...),
    _ => (config.payout_rebate, config.payout_breakeven, ...),  // Default
};

// Similarly for tier probabilities...
```

### Default Preset Values (Initialized on Deploy)

**Preset 1 - Conservative (~88% Tier 3 RTP)**
```
Payouts: 0.5x rebate, 1.0x breakeven, 1.5x profit, 4x jackpot
Tier 1: 80% rebate, 12% breakeven, 6% profit, 2% jackpot
Tier 2: 65% rebate, 22% breakeven, 11% profit, 2% jackpot
Tier 3: 52% rebate, 30% breakeven, 16% profit, 2% jackpot
```

**Preset 2 - Degen (~75% Tier 3 RTP, High Variance)**
```
Payouts: 0.5x rebate, 1.0x breakeven, 2.0x profit, 8x jackpot
Tier 1: 85% rebate, 8% breakeven, 4% profit, 3% jackpot
Tier 2: 75% rebate, 14% breakeven, 8% profit, 3% jackpot
Tier 3: 62% rebate, 20% breakeven, 15% profit, 3% jackpot
```

**Preset 3 - Whale (~95% Tier 3 RTP)**
```
Payouts: 0.6x rebate, 1.0x breakeven, 1.3x profit, 3x jackpot
Tier 1: 65% rebate, 22% breakeven, 12% profit, 1% jackpot
Tier 2: 50% rebate, 32% breakeven, 17% profit, 1% jackpot
Tier 3: 38% rebate, 40% breakeven, 21% profit, 1% jackpot
```

### UI Implementation Guide (TODO)

When implementing the UI for game presets:

#### 1. Create Project Page
Add preset selection to project creation form:
```jsx
// In CreateProject.jsx
<GamePresetSelector
    selectedPreset={formData.gamePreset}
    onSelect={(preset) => setFormData({...formData, gamePreset: preset})}
    presets={[
        { id: 0, name: 'Default', rtp: '94%', description: 'Platform default settings' },
        { id: 1, name: 'Conservative', rtp: '88%', description: 'Steady returns' },
        { id: 2, name: 'Degen', rtp: '75%', description: 'High variance, 8x jackpot' },
        { id: 3, name: 'Whale', rtp: '95%', description: 'Best odds' },
    ]}
/>
```

#### 2. Backend Endpoint Updates
Update `POST /api/program/build-initialize-project-tx`:
```javascript
// Accept gamePreset in request body
const { projectId, boxPrice, luckIntervalSeconds, gamePreset = 0 } = req.body;

// Pass to on-chain instruction
await program.methods.initializeProject(
    new BN(projectId),
    new BN(boxPrice),
    new BN(launchFeeAmount),
    new BN(luckIntervalSeconds),
    gamePreset  // NEW: 0-3
).accounts({...}).instruction();
```

#### 3. Admin Dashboard
Add preset configuration to AdminDashboard.jsx:
- Display all 3 presets with their values
- Allow editing preset payouts and probabilities
- Call `update_platform_config` to update on-chain

#### 4. Project Page Display
Show the project's preset to users:
```jsx
// In ProjectPage.jsx
<div className="text-sm text-degen-text-muted">
    Game Profile: {getPresetName(project.game_preset)}
    <InfoTooltip content={`This project uses the ${getPresetName(project.game_preset)} profile with ${getPresetRTP(project.game_preset)} RTP`} />
</div>
```

### Database Changes (TODO)

Add `game_preset` column to projects table:
```sql
-- Migration: 015_add_project_game_preset.sql
ALTER TABLE projects ADD COLUMN game_preset SMALLINT DEFAULT 0;
COMMENT ON COLUMN projects.game_preset IS 'Game preset (0=default, 1-3=presets)';
```

### Key Files

| File | Changes |
|------|---------|
| `backend/program/programs/lootbox_platform/src/lib.rs` | Added preset fields to PlatformConfig, game_preset to ProjectConfig, updated calculate_reward_from_config |
| `backend/lib/luckHelpers.js` | Helper functions for preset display (TODO) |
| `frontend/components/create/CreateProject.jsx` | Preset selector (TODO) |
| `frontend/components/admin/AdminDashboard.jsx` | Preset configuration (TODO) |

### Backward Compatibility

- **Existing projects:** `game_preset` defaults to 0 in on-chain struct
- **New projects:** Can specify preset 0-3 during initialization
- **Preset 0 behavior:** Identical to pre-preset platform (94% RTP Tier 3)
- **No migration needed:** Preset 0 = default behavior

### Verification

After deployment, verify presets are configured:
```javascript
// Read on-chain config
const config = await program.account.platformConfig.fetch(platformConfigPDA);

console.log('Preset 1 Jackpot:', config.preset1PayoutJackpot);  // 40000 (4x)
console.log('Preset 2 Jackpot:', config.preset2PayoutJackpot);  // 80000 (8x)
console.log('Preset 3 Jackpot:', config.preset3PayoutJackpot);  // 30000 (3x)
```

### Future Expansion

The `reserved: [u8; 32]` field in PlatformConfig allows adding more presets or per-preset parameters in the future without changing the account structure.

---

## Configuration Architecture (On-Chain Source of Truth)

As of January 17, 2026, the platform uses **on-chain configuration as the source of truth**. This ensures that critical game parameters (luck settings, payout multipliers, commission rates) are verifiable on-chain.

### Config Flow

```
Frontend (getNetworkConfig.js)
    ↓
Backend GET /api/config (server.js)
    ↓
Reads PlatformConfig PDA from Solana
    ↓
Supplements with Supabase (RPC URL, mints)
    ↓
Returns combined config to frontend
    ↓
Frontend stores in useNetworkStore
```

### Key Files

| File | Purpose |
|------|---------|
| `backend/server.js` | `/api/config` endpoint - reads on-chain PlatformConfig |
| `backend/lib/getNetworkConfig.js` | Backend helper to read on-chain config |
| `frontend/lib/getNetworkConfig.js` | Frontend - fetches from `/api/config`, falls back to Supabase |
| `frontend/store/useNetworkStore.js` | Zustand store for config state |

### What Comes From Where

| Source | Fields |
|--------|--------|
| **On-Chain** (PlatformConfig PDA) | `baseLuck`, `maxLuck`, `luckIntervalSeconds`, `payoutMultipliers`, `tierProbabilities`, `platformCommissionBps`, `adminWallet`, `paused` |
| **Database** (super_admin_config) | `rpcUrl`, `threeEyesMint`, `platformFeeAccount`, `launchFeeAmount` |
| **Derived** | `network`, `programId`, `isProduction`, `source` |

### Fallback Behavior

1. Frontend calls `GET /api/config`
2. Backend reads on-chain → returns `source: 'on-chain'`
3. If on-chain fails → Backend returns `source: 'database-fallback'` with Supabase values
4. If backend unreachable → Frontend queries Supabase directly

### Admin Config Updates

When admin updates config via AdminDashboard:
1. **Database fields** (RPC URL, mints) → Direct Supabase update
2. **On-chain fields** (luck, payouts, commission) → Builds `update_platform_config` transaction
3. Backend signs with deploy wallet → Submits to Solana
4. Frontend clears cache → Fetches fresh config

---

## Enterprise Activity Logging System

The platform includes a comprehensive, enterprise-grade activity logging system for monitoring, debugging, and analytics.

### Log Tables

**`activity_logs`** - Core logging table for all platform events:
- Event classification (type, category, severity)
- Actor information (wallet, type: user/creator/admin/system)
- Target/subject (project_id, box_id)
- Transaction details (signature, status)
- Financial data (amounts in lamports/tokens)
- Contextual metadata (JSON)
- Error information (code, message)
- Request context (IP, user agent)

**`log_aggregates`** - Pre-computed aggregates for dashboard performance:
- Hourly/daily/weekly buckets
- Counts by severity and category
- Financial totals

**`system_health_logs`** - System-level metrics:
- RPC latency, DB connections, API errors
- Service health monitoring

### Event Categories

| Category | Event Types |
|----------|-------------|
| project | created, updated, activated, deactivated, luck_updated |
| box | purchased, opened, settled, expired |
| treasury | deposited, withdrawn, fee_collected |
| withdrawal | requested, approved, completed, failed |
| admin | config_updated, project_verified, user_banned, emergency_action |
| error | transaction_failed, rpc_error, database_error, validation_error |
| system | startup, shutdown, health_check, maintenance |

### Withdrawal Logging

Project creator withdrawals are logged to `activity_logs` with:
- `event_type`: `withdrawal_completed`
- `actor_type`: `creator`
- `actor_wallet`: Creator's wallet
- `project_id`: Project numeric ID
- `tx_signature`: Solana transaction signature
- `amount_tokens`: Withdrawal amount
- `token_mint`: Project payment token
- Metadata: `withdrawalType`, `vaultBalanceBefore`, `vaultBalanceAfter`, `reservedForBoxes`, `unopenedBoxes`

### Key Files

| File | Description |
|------|-------------|
| `backend/lib/logger.js` | ActivityLogger service with batching and retry |
| `backend/routes/logs.js` | API endpoints for log queries |
| `frontend/components/admin/LogsViewer.jsx` | Real-time log viewer component |
| `database/migrations/014_activity_logs.sql` | Database schema |

### Features

- **Real-time Updates**: Supabase Realtime subscription for live log streaming
- **Filtering**: By category, severity, project, wallet, date range, text search
- **Pagination**: 50 logs per page with total count
- **Statistics**: 24-hour summaries, error counts, top projects
- **Log Batching**: Buffers logs and flushes every 5 seconds or 10 logs
- **Retry Logic**: Failed writes queued for retry (max 3 attempts)
- **RLS Security**: Only super admins can view logs

### Usage

```javascript
import logger from '../lib/logger.js';

// Log project creation
await logger.logProjectCreated({
    creatorWallet: '...',
    projectId: 123,
    subdomain: 'my-project',
    txSignature: '...',
});

// Log project withdrawal (in vault.js confirm-withdraw)
await logger.logProjectWithdrawal({
    creatorWallet: project.owner_wallet,
    projectId: project.project_numeric_id,
    projectSubdomain: project.subdomain,
    txSignature: signature,
    amount: withdrawalAmount,
    tokenMint: project.payment_token_mint,
    withdrawalType: 'partial',  // or 'full'
    vaultBalanceBefore: '...',
    vaultBalanceAfter: '...',
    reservedForBoxes: '...',
    unopenedBoxes: 0,
});

// Log errors (immediate flush)
await logger.logTransactionError({
    wallet: '...',
    errorCode: 'TX_FAILED',
    errorMessage: error.message,
});
```

Migration: `database/migrations/014_activity_logs.sql`

**Important Notes:**
1. Changes take effect immediately for all future box openings
2. Existing unopened boxes will use the new interval when opened (luck calculated at commit time)
3. Only projects created after Jan 16, 2026 support this feature (struct size change)

### Reward Tiers (No-Dud Model)

The platform uses a **no-dud model** for normal gameplay, providing a better player experience where the worst outcome is getting half back (0.5x rebate). Duds (0x) only occur for **expired boxes** (not revealed within the 1-hour oracle window).

#### Payout Multipliers

| Outcome | Multiplier | On-Chain Tier | DB Value | Notes |
|---------|------------|---------------|----------|-------|
| Dud | 0x | 0 | 1 | Only for expired boxes (user inaction penalty) |
| Rebate | 0.5x | 1 | 2 | Worst outcome in normal gameplay |
| Break-even | 1.0x | 2 | 3 | Get your money back |
| Profit | 1.5x | 3 | 4 | 50% profit |
| Jackpot | 4x | 4 | 5 | Big win |
| Refunded | 1.0x | 6 | 6 | System error refund (full box price) |

**Note:** DB values are on-chain tier + 1 (0 is reserved for "pending/unrevealed" in DB)

#### Tier Probability Distributions

| Outcome | Tier 1 (Luck 0-5) | Tier 2 (Luck 6-13) | Tier 3 (Luck 14-60) |
|---------|-------------------|---------------------|---------------------|
| Dud | 0% | 0% | 0% |
| Rebate | 72% | 57% | 44% |
| Break-even | 17% | 26% | 34% |
| Profit | 9% | 15% | 20% |
| Jackpot | 2% | 2% | 2% |
| **RTP** | **74.5%** | **85%** | **94%** |
| **House Edge** | **25.5%** | **15%** | **6%** |

**Key design decisions:**
- **Fixed 2% jackpot** across all tiers - luck affects other outcomes, not jackpot chance
- **No duds in normal gameplay** - worst case is 0.5x rebate (get half back)
- **Duds only for expired boxes** - penalty for not revealing within 1-hour oracle window
- **4x jackpot multiplier** - exciting but variance-controlled (0.08x EV contribution)

### Expected Value (EV) & RTP Calculations

**Formula:**
```
EV = (Dud% × 0) + (Rebate% × 0.5) + (Break-even% × 1) + (Profit% × 1.5) + (Jackpot% × 4)
RTP = EV × 100%
House Edge = 100% - RTP
```

**Tier 1 (Low Luck):**
```
EV = (0 × 0) + (0.72 × 0.5) + (0.17 × 1) + (0.09 × 1.5) + (0.02 × 4)
EV = 0 + 0.36 + 0.17 + 0.135 + 0.08 = 0.745 (74.5% RTP)
```

**Tier 2 (Medium Luck):**
```
EV = (0 × 0) + (0.57 × 0.5) + (0.26 × 1) + (0.15 × 1.5) + (0.02 × 4)
EV = 0 + 0.285 + 0.26 + 0.225 + 0.08 = 0.85 (85% RTP)
```

**Tier 3 (High Luck):**
```
EV = (0 × 0) + (0.44 × 0.5) + (0.34 × 1) + (0.20 × 1.5) + (0.02 × 4)
EV = 0 + 0.22 + 0.34 + 0.30 + 0.08 = 0.94 (94% RTP)
```

**Industry Benchmarks:**
- Slot machines: 85-95% RTP
- Roulette (single zero): 94.7% RTP
- Our Tier 3: 94% RTP (competitive with casino games)

### Dynamic Vault Funding

Vault funding is now calculated **dynamically based on box price** rather than a fixed amount. This ensures creators only fund what's statistically required.

**Formula:**
```
minimum_vault_funding = box_price × 30 (minimum)
```

**Calculation basis:**
- Uses 99th percentile worst-case variance analysis
- Accounts for jackpot clustering risk in first ~100 boxes
- 20% safety margin built in

**Example:**
- Box price: 1,000 tokens → Vault funding: ~30,000 tokens
- Box price: 10,000 tokens → Vault funding: ~300,000 tokens

**Implementation:** `backend/lib/evCalculator.js`

### Reserve Calculation for Withdrawals

When creators withdraw, the system reserves funds for unopened boxes using EV-based calculations:

```javascript
// Uses worst-case (99th percentile) reserve based on tier 3 probabilities
const reservedForUnopened = calculateUnopenedBoxReserve(
    boxPrice,
    unopenedBoxCount,
    tier3Probabilities,  // Use max luck tier (worst case for house)
    payoutMultipliers
);
```

**Implementation:** `backend/routes/vault.js` and `backend/lib/evCalculator.js`

### Expired Box Handling

Boxes that are committed (user clicked "Open Box") but not revealed within the **1-hour oracle window** become **true duds (0x payout)**:

```javascript
// In build-reveal-box-tx endpoint
if (now - committedAtTime > oneHourMs) {
    // Mark box as expired/dud
    await supabase.from('boxes').update({
        box_result: 1,      // Dud tier (DB: 1=dud)
        payout_amount: 0,   // 0x payout
    }).eq('id', box.id);
}
```

This is the **only scenario where duds occur** - it's a penalty for user inaction, not random bad luck.

### Refund System (System Error Recovery)

The platform includes a comprehensive refund system for boxes that fail due to system errors (oracle failures, network issues, etc.) - NOT user inaction.

**Key Principle:** Any error that isn't the user failing to reveal within the 1-hour window qualifies for a refund.

#### Dud vs Refund

| Scenario | Result | User's Fault? |
|----------|--------|---------------|
| User didn't reveal within 1 hour | Dud (0x) | Yes |
| Oracle unavailable during reveal | Refund (1x) | No |
| Network error during reveal | Refund (1x) | No |
| Switchboard DNS failure | Refund (1x) | No |
| Backend error during reveal | Refund (1x) | No |

#### Refund Flow

```
1. Box commit succeeds (user opens box)
       ↓
2. Reveal fails due to system error (oracle/network)
       ↓
3. Backend marks box as refund_eligible = true
   (immediately, no 1-hour wait needed)
       ↓
4. Frontend shows "Refund Available" button
       ↓
5. User clicks "Claim Refund"
       ↓
6. Frontend: POST /api/program/build-refund-box-tx
       ↓
7. On-chain: refund_box instruction
   - Returns full box price to user
   - Sets reward_tier = 6 (REFUNDED)
   - Marks box as settled
       ↓
8. Frontend: POST /api/program/confirm-refund
       ↓
9. Backend: Verifies on-chain state (reward_tier === 6)
   - Updates database: box_result = 6
   - Records refund_tx_signature
```

#### On-Chain Implementation

**In `refund_box` instruction:**
```rust
// Transfer full box price back to user
let box_price = project_config.box_price;
transfer(ctx.accounts.vault_to_owner_context(), box_price)?;

// Mark as refunded
box_instance.reward_tier = 6;  // REFUNDED
box_instance.reward_amount = box_price;
box_instance.settled = true;
box_instance.revealed = true;
```

**Note:** The refund instruction does NOT check the 1-hour reveal window. Refund eligibility is determined off-chain based on system error detection.

#### Backend Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/program/mark-reveal-failed` | Mark box as refund-eligible (called on system errors) |
| `POST /api/program/build-refund-box-tx` | Build refund transaction |
| `POST /api/program/confirm-refund` | Verify on-chain refund and update database |

#### On-Chain Verification (Security)

The `confirm-refund` endpoint verifies the refund actually happened on-chain before updating the database:

```javascript
// Read on-chain box state
const onChainBox = await program.account.boxInstance.fetch(boxInstancePDA);

// Verify refund occurred
if (onChainBox.rewardTier !== 6 || !onChainBox.settled) {
    return res.status(400).json({
        error: 'On-chain refund not confirmed'
    });
}

// Only then update database
await supabase.from('boxes').update({ box_result: 6 });
```

#### Database Schema

Refund-related columns in `boxes` table:
- `refund_eligible: boolean` - Set by backend when system error detected
- `reveal_failure_reason: text` - Reason for failure (e.g., "oracle_unavailable: DNS error")
- `reveal_failed_at: timestamp` - When failure occurred
- `refund_tx_signature: text` - Solana transaction signature for refund
- `refunded_at: timestamp` - When refund was processed

**Constraint:** `valid_box_result CHECK (box_result BETWEEN 0 AND 6)` - Migration 018 added value 6

#### Frontend UI

Refund-eligible boxes display:
- Neutral/blank styling (same as dud boxes)
- "Refund Available" badge
- Tooltip explaining the system error
- "Claim Refund" button (immediately available, no 1-hour wait)

Refunded boxes display:
- Neutral/blank styling (same as dud boxes)
- "Refunded" badge
- "Refund Tx" in dropdown menu (links to Solscan)
- No luck/random values shown (since reveal didn't complete)

#### Automated Testing Script

The automated box test script (`backend/scripts/automatedBoxTest.js`) automatically marks boxes as refund-eligible when reveal fails due to system errors (not user expiry).

### Reveal Window

- After opening a box (commit), user has **1 hour** to reveal
- If window expires, box automatically becomes a **Dud** (0x payout)
- This prevents gaming the system by waiting for favorable conditions

---

## Switchboard VRF Integration

### Overview

Switchboard VRF (Verifiable Random Function) provides provably fair randomness for box reveals. The implementation uses the **On-Demand** version which is simpler than the legacy subscription model.

### Network Constants

| Network | Program ID | Queue |
|---------|------------|-------|
| Devnet | `Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2` | `EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7` |
| Mainnet | `SBondMDrcV3K4kxZR1HNVT7osZxAHVHgYXL5Ze1oMUv` | `A43DyUGA7s8eXPxqEjJY6EBu1KKbNgfxF8h17VAHn13w` |

### Commit-Reveal Pattern

The VRF uses a two-phase commit-reveal pattern to ensure fairness:

1. **Commit Phase** (User opens box):
   - Create new Switchboard randomness account (ephemeral keypair)
   - Call `Randomness.create()` to initialize account
   - Call `randomness.commitIx()` to request randomness from oracle
   - Call our `commit_box` instruction to freeze luck and record commitment
   - Oracle begins generating randomness (takes ~5-10 seconds)

2. **Reveal Phase** (User reveals box):
   - Call `randomness.revealIx()` to get oracle's signed randomness
   - Call our `reveal_box` instruction to read randomness and calculate reward
   - Uses official SDK parsing (see below)

### SDK vs Manual Parsing (IMPORTANT)

**Current Implementation:** Uses official Switchboard SDK for parsing randomness.

**Rust (on-chain):**
```rust
use switchboard_on_demand::accounts::RandomnessAccountData;

// Parse randomness account using official SDK
let randomness_data = RandomnessAccountData::parse(
    ctx.accounts.randomness_account.data.borrow()
).map_err(|_| LootboxError::RandomnessNotReady)?;

// Get the revealed random value (32 bytes)
let clock = Clock::get()?;
let revealed_random_value: [u8; 32] = randomness_data
    .get_value(&clock)
    .map_err(|_| LootboxError::RandomnessNotReady)?;

// Use 8 bytes (u64) for better entropy distribution
let random_u64 = u64::from_le_bytes([
    revealed_random_value[0], revealed_random_value[1],
    revealed_random_value[2], revealed_random_value[3],
    revealed_random_value[4], revealed_random_value[5],
    revealed_random_value[6], revealed_random_value[7],
]);

let random_percentage = (random_u64 as f64) / (u64::MAX as f64);
```

**Why SDK over Manual Parsing:**
- Byte offsets can change between Switchboard versions
- SDK handles validation automatically
- `get_value()` checks reveal timing with clock
- More robust against future Switchboard updates

**Legacy Manual Parsing (deprecated):**
```rust
// DO NOT USE - byte offsets may change!
// let reveal_slot = u64::from_le_bytes(data[144..152]);
// let random_bytes = &data[152..184];
```

### Key Implementation Details

**File:** `backend/lib/switchboard.js`

```javascript
// Create randomness account - buyer pays for account creation
const [randomness, createInstruction] = await Randomness.create(
    sbProgram,
    rngKeypair,
    queue,
    payer  // Buyer's wallet pays, not backend
);

// Commit - pass authority explicitly (account may not exist yet)
const commitIx = await randomness.commitIx(queue, authority);

// Reveal - SDK contacts the SAME oracle that committed
const revealIx = await randomness.revealIx(payer);

// Close - reclaim rent after reveal completes
const closeIx = await randomness.closeIx();
```

### Randomness Account Lifecycle & Rent Reclaim

Each VRF request creates a temporary randomness account that costs ~0.006 SOL in rent. To minimize costs for users, we close the account after reveal to reclaim this rent.

**Transaction Order (Critical):**
```
revealIx → reveal_box (on-chain) → closeIx
```

The close instruction MUST come AFTER the `reveal_box` instruction reads the randomness value. If closed too early, the on-chain program can't read the random data.

**Implementation:**

```javascript
// In build-reveal-box-tx endpoint
const revealIx = await createRevealInstruction(randomness, buyerWallet, network);
transaction.add(revealIx);
transaction.add(revealBoxInstruction);

// Close after reveal_box reads the randomness
const closeIx = await createCloseInstruction(randomness);
transaction.add(closeIx);
```

**Cost Breakdown per Box (with rent reclaim):**
| Component | Cost |
|-----------|------|
| Randomness Account Rent | ~0.006 SOL (temporary) |
| Oracle Fee | ~0.002 SOL |
| Transaction Fees | ~0.00001 SOL |
| **Rent Reclaimed** | **+0.006 SOL** |
| **Net Cost** | **~0.002 SOL** |

**Database Tracking:**
- `boxes.randomness_closed` (boolean) - tracks if rent was reclaimed
- Migration: `019_add_randomness_closed_column.sql`

### Important Notes

1. **Never use Crossbar for VRF** - Crossbar routes to different oracles, which breaks the commit-reveal pattern and causes `InvalidSecpSignature` errors (0x1780).

2. **Devnet Reliability** - Devnet oracles can be unreliable (503 errors, timeouts). The backend includes retry logic with exponential backoff.

3. **Use SDK for Parsing** - Always use `RandomnessAccountData::parse()` and `get_value()` instead of manual byte offsets.

4. **Retry Logic** - The reveal instruction has built-in retry logic (3 attempts, exponential backoff) for transient oracle failures.

5. **Cargo.toml Dependency:**
```toml
switchboard-on-demand = "0.11"
```

### Oracle Health Check

**Endpoint:** `GET /api/oracle-health`

Tests oracle availability by performing DNS resolution for the Switchboard xip service.

```javascript
// Response
{
  healthy: true,
  message: "Oracle service is available",
  cached: false,
  network: "devnet"
}
```

**Pre-commit Warning:** Frontend checks oracle health before users commit (open) boxes. If unhealthy, users are warned to avoid starting the 1-hour timer.

#### Error Codes for Frontend

When reveal fails, backend returns structured errors:

| Error Code | Description | Retryable | Retry After |
|------------|-------------|-----------|-------------|
| `ORACLE_UNAVAILABLE` | Switchboard DNS/network failure | Yes | 60s |
| `ORACLE_TIMEOUT` | Oracle took too long to respond | Yes | 30s |
| `INSUFFICIENT_FUNDS` | Wallet can't pay transaction fee | No | N/A |
| `REVEAL_EXPIRED` | Past 1-hour reveal window | No | N/A |
| `REVEAL_ERROR` | Generic error | Maybe | N/A |

---

## Current Implementation Status

### Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Platform Config PDA | Complete | Global tunable parameters |
| Project Creation | Complete | Launch fee collection works |
| Box Purchase | Complete | VRF commit on open, commission collected |
| Box Reveal | Complete | VRF randomness via SDK parsing |
| Reward Claim | Complete | Vault payout via PDA |
| Project Pause/Resume | Complete | Active flag toggleable |
| Admin Dashboard | Complete | Config sync, Treasury tab |
| Luck System | Complete | Time-based accumulation |
| Per-Project Luck Interval | Complete | Creators can set custom luck intervals |
| Tier Probabilities | Complete | 3 configurable tiers |
| Platform Treasury | Complete | 5% commission on purchases |
| Configurable Commission | Complete | Admin can set 0-50% |
| Treasury Admin UI | Complete | View balances, $3EYES first |
| Treasury Withdrawal | Complete | Admin can withdraw to wallet |
| Treasury Processing Script | Complete | Withdraw, swap, buyback with logging |
| Treasury Activity Logging | Complete | Database logging with Solscan links |
| Enterprise Activity Logging | Complete | Full platform logging with real-time UI |
| Project Withdrawal Logging | Complete | Creator withdrawals logged to activity_logs |
| On-Chain Config Source of Truth | Complete | Backend reads PlatformConfig PDA |
| Switchboard SDK | Complete | Migrated from manual parsing |
| Multi-tenant Subdomain Routing | Complete | proxy.js with wildcard DNS |
| Oracle Health Check | Complete | Pre-commit warning, `/api/oracle-health` endpoint |
| Refund System | Complete | System error detection, on-chain verification, immediate refund availability |

### Incomplete / TODO

| Feature | Priority | Notes |
|---------|----------|-------|
| Withdraw All & Close | High | Close project mode not implemented |
| **Mainnet Testing** | **High** | Treasury script untested on mainnet (Jupiter swaps) |
| Rate Limiting | Medium | No express-rate-limit yet |
| RLS Policies | Medium | Need owner_wallet checks |
| Backend Wallet Auth | Medium | No signed message verification |
| Program Security Metadata | Low | For mainnet launch |

### Mainnet Readiness Gaps

| Gap | Description | Risk |
|-----|-------------|------|
| Jupiter Swaps | Treasury script uses Jupiter API - only works on mainnet | Script will fail swap/buyback on devnet |
| $3EYES Token | Need real $3EYES mint address for buyback | Must configure before mainnet |
| Dev Wallet | `--dev-wallet` flag required for SOL distribution | 10% dev cut needs destination |
| Oracle Reliability | Mainnet Switchboard oracles more reliable but need testing | VRF timing may differ |
| RPC Limits | Production RPC needed for mainnet traffic | Rate limits could cause issues |

---

## Platform Treasury & Commission System

### Overview

The platform collects a configurable commission (default 5%) on every box purchase. This commission is collected in the project's payment token and stored in the global treasury PDA.

### Commission Flow

```
User buys box for 100 tokens
    ↓
On-chain: calculate commission (5% = 5 tokens)
    ↓
95 tokens → Project Vault (for payouts)
5 tokens → Treasury Token Account (platform revenue)
    ↓
Admin batches treasury processing:
    - Withdraw tokens from treasury
    - Swap all tokens to SOL via Jupiter
    - 90% of SOL → Buy $3EYES → Treasury wallet
    - 10% of SOL → Dev wallet
```

### On-Chain Implementation

**In `create_box` instruction:**
```rust
// Calculate commission
let commission = (box_price * platform_config.platform_commission_bps as u64) / 10000;
let net_amount = box_price - commission;

// Transfer net amount to vault
transfer(ctx.accounts.buyer_to_vault_context(), net_amount)?;

// Transfer commission to treasury
if commission > 0 {
    transfer(ctx.accounts.buyer_to_treasury_context(), commission)?;
}
```

### Treasury PDA Structure

| Component | Description |
|-----------|-------------|
| Treasury PDA | `seeds = ["treasury"]` - Global treasury account |
| Treasury Token Accounts | ATAs owned by treasury PDA for each token type |

### Admin Dashboard (Treasury Tab)

The admin dashboard includes a Treasury tab showing:
- Treasury PDA address
- Current commission rate (configurable)
- Token balances ($3EYES always shown first, even if 0)
- Token account addresses

### Batch Processing Script

**File:** `backend/scripts/process-treasury-fees.js`

```bash
# Show all available flags
node scripts/process-treasury-fees.js --help

# Dry run (simulation, no transactions)
node scripts/process-treasury-fees.js --dry-run

# Withdraw only (skip Jupiter swaps - useful for devnet testing)
node scripts/process-treasury-fees.js --withdraw-only

# Test with partial balance (e.g., 20% of treasury)
node scripts/process-treasury-fees.js --withdraw-only --test-multiplier 0.2

# Process specific token only
node scripts/process-treasury-fees.js --token <mint_address>

# Set minimum SOL threshold (default: 0.001 SOL)
node scripts/process-treasury-fees.js --min-sol 0.01

# Full mainnet processing with dev wallet
node scripts/process-treasury-fees.js --dev-wallet <pubkey>
```

**Script Flow:**
1. Query all unique payment tokens from projects
2. Check treasury balance for each token
3. Get Jupiter quote for SOL value
4. Skip if below minimum threshold
5. **Withdraw:** Transfer tokens from treasury PDA to admin wallet
6. **Swap:** Swap tokens to SOL via Jupiter API (mainnet only)
7. **Split:** 90% for $3EYES buyback, 10% to dev wallet (if specified)
8. **Log:** Each step logged to `treasury_processing_log` table

**Database Logging:**
All treasury operations are logged to the `treasury_processing_log` table with:
- `action_type`: 'withdraw', 'swap', 'dev_transfer', 'buyback' (REQUIRED)
- `processed_by`: Admin wallet that triggered the operation (REQUIRED)
- Transaction signatures for Solscan links
- Amounts and status
- Error messages for failed operations

**Important:** The `processed_by` and `action_type` fields are NOT NULL. All inserts must include these fields.

**Testing Status:**
- Devnet: Withdrawal tested successfully with `--withdraw-only --test-multiplier 0.2`
- Mainnet: **NOT TESTED** - Jupiter swaps require real liquidity

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/treasury-balances` | GET | All treasury balances |
| `/api/admin/treasury/:tokenMint` | GET | Specific token balance |
| `/api/admin/withdraw-treasury` | POST | Withdraw to admin wallet |
| `/api/admin/treasury-logs` | GET | Treasury activity logs with Solscan links |

### Configuration

Commission rate is stored on-chain in `PlatformConfig.platform_commission_bps`:
- Units: Basis points (100 = 1%)
- Default: 500 (5%)
- Maximum: 5000 (50%)
- Configurable via Admin Dashboard → On-Chain Config

### Important Notes

1. **Commission is per-token** - Each project's payment token accumulates separately
2. **Treasury is global** - One treasury PDA, multiple token accounts
3. **$3EYES shown first** - Even with 0 balance, for visibility
4. **SOL threshold** - Batch script skips tokens worth less than threshold
5. **Buyback destination** - $3EYES purchased goes to treasury wallet (not burned)

---

## Creator Withdrawals

### Overview

Creators can withdraw profits from their project vault in the project's payment token. **No withdrawal fee is charged** because the platform already collects a 5% commission on every box purchase (double-charging would be unfair).

### Withdrawal Modes

1. **Withdraw Profits** - Take only profits above initial funding amount
   - Keeps vault funded for ongoing payouts
   - Project stays active
   - Available = vault_balance - locked_balance - initial_funding

2. **Withdraw All & Close** - Withdraw everything and close the project
   - Calculate reserve needed for unclaimed boxes (pending reveals)
   - Creator receives: vault_balance - reserve_for_pending
   - Project becomes inactive
   - Any remaining funds after all boxes settle can be claimed

### Locked Balance Calculation

To prevent creators from withdrawing funds needed for potential payouts, reserves are calculated using EV-based worst-case analysis:

```javascript
// Uses EV calculator for worst-case (99th percentile) reserve
import { calculateUnopenedBoxReserve, DEFAULT_TIER_PROBABILITIES, DEFAULT_PAYOUT_MULTIPLIERS } from '../lib/evCalculator.js';

const reservedForUnopened = calculateUnopenedBoxReserve(
    boxPrice,
    unopenedBoxes,
    DEFAULT_TIER_PROBABILITIES.tier3,  // Use max luck tier (worst case)
    DEFAULT_PAYOUT_MULTIPLIERS
);
const available = vaultBalance - reservedForUnopened - unclaimedRewards;
```

This calculation accounts for:
- **Tier 3 RTP (94%)** - worst case for house
- **Jackpot clustering risk** - 99th percentile for multiple jackpots in small samples
- **20% safety margin** - additional buffer for variance

### Why No Withdrawal Fee?

The platform revenue model is based on commission, not withdrawal fees:

| Revenue Source | Rate | Collection Point |
|----------------|------|------------------|
| Box Purchase Commission | 5% | Per box purchase |
| Launch Fee | 100 $3EYES | Project creation |

Charging both commission AND withdrawal fee would double-charge creators, which is unfair and could discourage project creation.

### Payout Currency

Creators receive payouts in their **project's payment token only**:
- Example: CATS project → Creator withdraws in CATS
- No SOL conversion option (would create unnecessary sell pressure on project token)

### Implementation Status

| Feature | Status |
|---------|--------|
| Withdraw Profits | Complete |
| Withdraw All & Close | Needs implementation |
| Locked Balance Calc | Off-chain only |
| No Withdrawal Fee | Complete (by design)

---

## Security Considerations

**Last Security Audit:** January 21, 2026

### On-Chain Security (Anchor Program)

#### Reentrancy Prevention
The `settle_box` instruction follows the **Checks-Effects-Interactions** pattern:
```rust
// SECURITY: Mark as settled BEFORE CPI to prevent reentrancy
box_instance.settled = true;
project_config.total_boxes_settled = project_config.total_boxes_settled
    .checked_add(1)
    .ok_or(LootboxError::ArithmeticOverflow)?;
project_config.total_paid_out = project_config.total_paid_out
    .checked_add(box_instance.reward_amount)
    .ok_or(LootboxError::ArithmeticOverflow)?;

// CPI transfer happens AFTER state changes
token::transfer(cpi_ctx, box_instance.reward_amount)?;
```

#### Refund Calculation Security
Refunds deduct the platform commission to prevent fund drainage attacks:
```rust
// Calculate commission that was already taken
let commission_bps = platform_config.platform_commission_bps as u64;
let commission_amount = project_config.box_price
    .checked_mul(commission_bps)
    .ok_or(LootboxError::ArithmeticOverflow)?
    .checked_div(10000)
    .ok_or(LootboxError::ArithmeticOverflow)?;

// Refund = box_price - commission (commission already in treasury)
let refund_amount = project_config.box_price
    .checked_sub(commission_amount)
    .ok_or(LootboxError::ArithmeticOverflow)?;
```

#### Token Account Ownership Validation
Admin operations validate token account ownership to prevent unauthorized withdrawals:
```rust
#[account(
    mut,
    constraint = admin_token_account.mint == token_mint.key() @ LootboxError::InvalidOwnerTokenAccount,
    constraint = admin_token_account.owner == admin.key() @ LootboxError::InvalidOwnerTokenAccount
)]
pub admin_token_account: Account<'info, TokenAccount>,
```

#### Account Constraints
All critical accounts have proper Anchor constraints:
- Box ownership: `constraint = box_instance.owner == owner.key() @ LootboxError::NotBoxOwner`
- Project ownership: `constraint = project_config.owner == owner.key() @ LootboxError::NotProjectOwner`
- Platform admin: `constraint = platform_config.admin == admin.key() @ LootboxError::NotAdmin`
- Arithmetic overflow protection via `checked_*` operations throughout

### Backend Security

#### Rate Limiting
Three tiers of rate limiting (configured in `backend/server.js`):
| Limiter | Production | Development | Applied To |
|---------|------------|-------------|------------|
| `generalLimiter` | 100 req/15min | 10,000 | All routes |
| `adminLimiter` | 20 req/hour | 1,000 | `/api/admin/*` |
| `transactionLimiter` | 30 req/min | 1,000 | `/api/program/*` |

Controlled by `DISABLE_RATE_LIMIT` env var for testing.

#### Wallet Ownership Verification
Backend verifies wallet ownership before sensitive operations:
- Transaction building requires wallet signature
- Owner wallet validated against on-chain state
- Token account ownership checked before transfers

#### Error Message Sanitization
All error responses pass through `sanitizeErrorMessage()` to prevent information leakage:
```javascript
import { sanitizeErrorMessage } from '../lib/utils.js';
// ...
return res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: sanitizeErrorMessage(error.message)
});
```

#### RLS Policies (Supabase)
Row Level Security enforces data access at the database level:
- `boxes` table: Users can only SELECT/UPDATE their own boxes (by `owner_wallet`)
- `projects` table: Creators can only UPDATE their own projects (by `owner_wallet`)
- Service role key used for backend operations that bypass RLS

See migration `023_fix_rls_security.sql` for complete policy definitions.

### Frontend Security

#### Security Headers (next.config.mjs)
```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ];
},
```

#### Subdomain Validation
Subdomains are validated to prevent injection attacks:
```javascript
// frontend/lib/getNetworkConfig.js
export function isValidSubdomain(subdomain) {
    if (!subdomain || typeof subdomain !== 'string') return false;
    return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain);
}
```

Applied in:
- `frontend/lib/getNetworkConfig.js` - URL construction
- `frontend/proxy.js` - Dev mode subdomain query param

### Security Summary Table

| Feature | Implementation | Location |
|---------|----------------|----------|
| Reentrancy prevention | State changes before CPI | `lib.rs:settle_box` |
| Refund drainage prevention | Deduct commission from refund | `lib.rs:refund_box` |
| Token ownership validation | Anchor constraints | `lib.rs:WithdrawTreasury` |
| Rate limiting | express-rate-limit | `backend/server.js` |
| RLS policies | PostgreSQL policies | `migrations/023_fix_rls_security.sql` |
| Error sanitization | sanitizeErrorMessage() | `backend/lib/utils.js` |
| Security headers | Next.js headers config | `frontend/next.config.mjs` |
| Subdomain validation | Regex validation | `frontend/lib/getNetworkConfig.js` |
| VRF integrity | Switchboard oracle-signed randomness | `lib.rs:reveal_box` |
| PDA-controlled vaults | Program-derived addresses | All vault operations |

---

## Common Debugging Scenarios

### Config Loading Failures
**Error:** `Cannot read properties of undefined (reading 'slice')` or `Cannot read properties of null`
**Cause:** Frontend component accessing config before it's loaded, or config field is null
**Fix:** Add null checks with optional chaining:
```javascript
// Bad
config.rpcUrl.slice(0, 30)
config.adminWallet.toString()

// Good
config?.rpcUrl?.slice(0, 30) || 'Not configured'
config?.adminWallet && publicKey.toString() === config.adminWallet.toString()
```

### Supabase 400 Bad Request
**Error:** `400 Bad Request` on Supabase queries
**Cause:** Query references columns that don't exist in the database
**Fix:** Check `super_admin_config` table schema. Common removed columns:
- `vault_fund_amount` (removed in migration 011)
- `withdrawal_fee_percentage` (removed in migration 015)
- `min_box_price`, `max_projects_per_wallet` (no longer used)

### BN.js vs BigInt Mismatch
**Error:** `src.toArrayLike is not a function`
**Cause:** Anchor expects BN.js, JavaScript gives native BigInt
**Fix:**
```javascript
const BN = require('bn.js');
const amountBN = new BN(amount.toString());
```

### ATA Not Created
**Error:** `AccountNotInitialized` or withdrawal fails silently
**Cause:** Admin/user wallet doesn't have an Associated Token Account for the token
**Fix:** Add `createAssociatedTokenAccountInstruction` before transfer:
```javascript
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');
const ata = await getAssociatedTokenAddress(mint, owner, true); // true for PDAs
// Check if exists, create if not
```

### PDA Already Exists (Project Creation Fails)
**Error:** Transaction fails with no clear message, or "Unexpected error" from wallet
**Cause:** Project numeric ID maps to a PDA that already exists on-chain from previous testing
**Fix:** Increment the project counter in Supabase:
```sql
UPDATE project_counter SET counter = 10 WHERE id = 1;
```
**Debug:** Check if PDA exists:
```bash
solana account <PDA_ADDRESS> --url devnet
```

### VRF InvalidSecpSignature (0x1780)
**Error:** Reveal transaction fails with error 0x1780
**Cause:** Using Crossbar for VRF, which routes to different oracles
**Fix:** Never use Crossbar for VRF. Use direct oracle connection.

### Switchboard VRF DNS Resolution Failures (Devnet)
**Error:** `getaddrinfo ENOTFOUND 92.222.100.185.xip.switchboard-oracles.xyz`
**Cause:** Switchboard devnet oracles use `xip.io` style DNS (maps hostnames to IPs via DNS wildcards). The xip DNS service can be unreliable.
**Symptoms:**
- Box commits succeed (randomness account created)
- Reveals fail with DNS resolution errors
- Affects all devnet VRF operations

**Platform Handling (as of Jan 17, 2026):**

1. **Pre-commit health check** - Before opening a box, frontend calls `GET /api/oracle-health` to check if oracles are reachable. If unhealthy, user is warned and prevented from committing.

2. **Error classification** - Backend classifies reveal errors with specific error codes:
   - `ORACLE_UNAVAILABLE` - DNS/network failure (retryable)
   - `ORACLE_TIMEOUT` - 503/timeout (retryable)
   - `INSUFFICIENT_FUNDS` - User needs more SOL (retryable)
   - `REVEAL_EXPIRED` - 1-hour window passed (not retryable)

3. **Time remaining display** - When reveal fails, the error includes how much time remains in the 1-hour window, so users know they can retry.

4. **Retry within window** - Users CAN retry reveals as many times as needed within the 1-hour window. Only the commit is on-chain; reveals can be reattempted.

**Key Implementation Files:**
- `backend/lib/switchboard.js` - `checkOracleHealth()` function
- `backend/server.js` - `GET /api/oracle-health` endpoint
- `backend/routes/program.js` - Error classification in `build-reveal-box-tx`
- `frontend/components/dashboard/Dashboard.jsx` - Health check before commit, error display

**Workarounds (manual):**
1. Wait for xip service to recover (usually resolves within hours)
2. Add manual entry to `/etc/hosts`: `92.222.100.185 92.222.100.185.xip.switchboard-oracles.xyz`
3. Report to Switchboard Discord

**Note:** This is a Switchboard infrastructure issue, not a code bug. Mainnet oracles are generally more reliable.

### Transaction Simulation Fails
**Debug:** Check simulation logs for the actual error:
```javascript
const simulation = await connection.simulateTransaction(transaction);
console.log(simulation.value.logs);
```

### Solana Timestamps
**Issue:** Dates display incorrectly
**Cause:** Solana uses Unix seconds, JavaScript uses milliseconds
**Fix:** `new Date(solanaTimestamp * 1000)`

---

## Environment Configuration

### Backend (.env)

```bash
PORT=3333
NODE_ENV=development
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
DEPLOY_WALLET_JSON=[array of 64 bytes]  # Platform admin wallet keypair
DEPLOY_WALLET_PUBKEY=your_pubkey        # For reference
RPC_URL=https://devnet.helius-rpc.com/?api-key=xxx
SOLANA_NETWORK=devnet
JUPITER_API_KEY=your_jupiter_api_key    # Required for price oracle & swaps
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3333
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## Deployment Information

### Backend Hosting (Render.com)

The backend is deployed to Render.com. Required environment variables:

```bash
# Server
PORT=3333
NODE_ENV=production

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Solana
SOLANA_NETWORK=devnet
RPC_URL=https://your-rpc-url
DEPLOY_WALLET_JSON=[keypair,bytes]
DEPLOY_WALLET_PUBKEY=YourPubkey

# External APIs
JUPITER_API_KEY=your_key

# Security (IMPORTANT for production)
ALLOWED_ORIGINS=https://degenbox.fun,https://www.degenbox.fun
PLATFORM_DOMAIN=degenbox.fun
API_BASE_URL=https://api.degenbox.fun
```

### Security Features (January 2026)

The backend includes these security measures:

| Feature | Implementation |
|---------|----------------|
| Security Headers | `helmet` middleware |
| Rate Limiting | `express-rate-limit` (100 req/15min general, 20/hr admin, 30/min transactions) |
| CORS | Wildcard subdomain support for `*.degenbox.fun` |
| Input Validation | Zod schemas for all endpoints |
| Error Sanitization | Production hides sensitive error details |
| Request IDs | Every request gets tracking ID |

**Key Files:**
- `backend/server.js` - Security middleware configuration
- `backend/middleware/auth.js` - Admin authentication middleware
- `backend/lib/validation.js` - Zod validation schemas
- `backend/lib/utils.js` - Utility functions
- `backend/lib/devLogger.js` - Development-only logging

### Current Devnet Deployment

| Resource | Address |
|----------|---------|
| Program ID | `GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat` |
| Platform Config PDA | `6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t` |
| Admin Wallet | `5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn` |
| Test Token ($3EYES) | Set in super_admin_config |
| Test Token (CATS) | `CATSnp3CJhT7wa81csuBx5TQX5nwKRKLh2MAjByrR3Td` |

### Test Data (Devnet)

For testing on devnet, use these known-good values:
- **Project numeric IDs 1-9**: May have existing PDAs on-chain from previous testing
- **Project counter**: Currently set to 10+ to avoid PDA collisions
- **CATS token**: Used for testing box purchases and treasury operations

### Deployment Commands

```bash
# Build program
cd backend/program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Initialize platform config
cd backend
node scripts/init-platform-config.js
```

### Program Verification (Solscan)

The program is verified on Solscan using `solana-verify`. This proves the on-chain bytecode matches the public source code.

**Requirements:**
- Docker Desktop installed and running
- `solana-verify` CLI: `cargo install solana-verify`
- Public GitHub repository
- `Cargo.lock` committed to repo

**Verification Process:**

```bash
# 1. Ensure Cargo.lock compatibility (base64ct must be <= 1.6.0 for Solana Docker image)
cd backend/program
cargo update base64ct@1.7.3 --precise 1.6.0  # If needed

# 2. Build verifiable binary locally (takes ~5 min on M1/M2 due to x86 emulation)
solana-verify build --library-name lootbox_platform

# 3. Deploy the verified binary
solana program deploy \
  target/deploy/lootbox_platform.so \
  --program-id target/deploy/lootbox_platform-keypair.json \
  --keypair /path/to/deploy-wallet.json \
  --url devnet

# 4. Verify and upload verification record to on-chain
solana-verify verify-from-repo \
  --program-id GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat \
  --library-name lootbox_platform \
  --mount-path backend/program \
  --url devnet \
  --keypair /path/to/deploy-wallet.json \
  -y \
  https://github.com/frommybrain/3eyes-fatebox-v3
```

**Publish IDL (separate from verification):**

```bash
# IDL allows block explorers to decode transaction data
cd backend/program
anchor idl init GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat \
  --filepath target/idl/lootbox_platform.json \
  --provider.cluster devnet \
  --provider.wallet /path/to/deploy-wallet.json
```

**Current Verification Status (Devnet):**

| Item | Status | Details |
|------|--------|---------|
| Program Verified | ✅ | Hash: `216bd3e1b6c7efc92879bacaf01adfe389ff584947a10fe208f84917e7e73572` |
| IDL Published | ✅ | Account: `5Hhwx2Tm6CMSNEHyzo3mMZYNwaYmP7wF7n3Sx3TmyxUv` |
| Commit | `2a694a6` | Main branch |
| Verification Tx | `2XHvqCHN61MCPRCRaBDFBat4nko9br5XAnMVBkiGYqeoaFqURqN6RjjsvjNPZq1GtiJpb8KcoMzYiG43PnN4NXzA` |

**For Mainnet:** Repeat the same process with `--url mainnet-beta`. The program ID can stay the same if you use the same keypair (`target/deploy/lootbox_platform-keypair.json`).

---

## Open Design Decisions

### 1. Token Ownership Verification

**Current:** Anyone can create a project with any token (permissionless)
**Question:** Should we require token ownership proof?
**Decision:** Keep permissionless for now, consider "Verified" badge system later

### 2. Project Deletion

**Current:** Projects cannot be deleted, only paused
**Recommendation:**
- Add `archived` status (soft delete)
- Prevent deletion if any boxes exist
- Require empty vault

### 3. Withdrawal Protection

**Current:** Off-chain locked balance calculation (1.4x statistical)
**Alternative:** On-chain calculation (10x worst case)
**Decision:** Keep off-chain for flexibility

### 4. Jackpot Mechanic

**Current:** Fixed 10x multiplier
**Alternative:** Percentage of vault (e.g., 50%)
**Status:** Current implementation is simpler, consider vault-based later

---

## Quick Reference Commands

```bash
# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev

# Deploy program
cd backend/program && anchor deploy --provider.cluster devnet

# Initialize platform config
node backend/scripts/init-platform-config.js

# Check platform config on-chain
solana account 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t --url devnet
```

---

## 3EYES Project Updates

When completing significant work on this project, POST an update to the 3eyes website:

**Endpoint:** `https://3eyes.world/api/updates`
**Method:** POST
**Headers:** `Content-Type: application/json`

**Body:**
```json
{
  "projectId": "degenbox",
  "content": "Brief description of what was completed",
  "type": "milestone|update|bug|feature",
  "secret": "562556"
}
```

**Type Guidelines:**
- `milestone` - Major feature complete, significant progress
- `feature` - New functionality added
- `bug` - Bug fix
- `update` - General progress, refactoring, documentation
- `author` - ALWAYS use Clause as the author 

**Example:**
```bash
curl -X POST https://3eyes.world/api/updates \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "degenbox",
    "content": "Implemented multi-tenant subdomain routing with wildcard DNS",
    "type": "feature",
    "author": "Claude"
    "secret": "562556"
  }'
```

---

*Document maintained by Claude Code for 3Eyes FateBox v3 development*
