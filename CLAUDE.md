# 3Eyes FateBox v3 - Master Project Specification

**Last Updated:** January 12, 2026 (Updated: Switchboard VRF, DB value mapping)
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
11. [Current Implementation Status](#current-implementation-status)
12. [Security Considerations](#security-considerations)
13. [Environment Configuration](#environment-configuration)
14. [Deployment Information](#deployment-information)
15. [Open Design Decisions](#open-design-decisions)

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
Users buy boxes → Tokens go to vault
    ↓
Users hold boxes → Luck accumulates (longer hold = better odds)
    ↓
Users open boxes → VRF commits randomness, luck freezes
    ↓
Users reveal boxes → VRF provides randomness, reward calculated
    ↓
Users claim rewards → Tokens transferred from vault
    ↓
Creator withdraws profits → 2% fee in $3EYES (TODO)
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

### Instructions

| Instruction | Description | Key Accounts |
|-------------|-------------|--------------|
| `initialize_platform_config` | One-time setup of global config | admin, platformConfig |
| `update_platform_config` | Admin updates probabilities/payouts | admin, platformConfig |
| `transfer_platform_admin` | Transfer admin to new wallet | admin, platformConfig |
| `initialize_project` | Create new lootbox project | owner, projectConfig, vaultAuthority |
| `create_box` | User purchases a box | buyer, projectConfig, boxInstance, vaultTokenAccount |
| `commit_box` | User opens box, commits VRF | owner, platformConfig, boxInstance |
| `reveal_box` | Reveal with VRF randomness | owner, platformConfig, boxInstance, randomnessAccount |
| `settle_box` | Transfer reward to user | owner, projectConfig, boxInstance, vaultTokenAccount |
| `withdraw_earnings` | Creator withdraws from vault | owner, projectConfig, vaultTokenAccount |
| `update_project` | Pause/resume, change price | owner, projectConfig |
| `close_project` | Close project, reclaim rent | owner, projectConfig |

### Account Structures

#### PlatformConfig (98 bytes) - Global Singleton
```rust
pub struct PlatformConfig {
    pub admin: Pubkey,              // 32 bytes - Only this wallet can update
    pub initialized: bool,          // 1 byte
    pub paused: bool,               // 1 byte - Emergency pause all operations

    // Luck parameters
    pub base_luck: u8,              // 1 byte (default: 5)
    pub max_luck: u8,               // 1 byte (default: 60)
    pub luck_time_interval: i64,    // 8 bytes (seconds per +1 luck)

    // Payout multipliers (basis points: 10000 = 1.0x)
    pub payout_dud: u32,            // 0 = 0x
    pub payout_rebate: u32,         // 8000 = 0.8x
    pub payout_breakeven: u32,      // 10000 = 1.0x
    pub payout_profit: u32,         // 25000 = 2.5x
    pub payout_jackpot: u32,        // 100000 = 10x

    // Tier probabilities (basis points, must sum to 10000)
    pub tier1_max_luck: u8,         // Luck 0-5
    pub tier1_dud: u16,             // 5500 = 55%
    pub tier1_rebate: u16,          // 3000 = 30%
    pub tier1_breakeven: u16,       // 1000 = 10%
    pub tier1_profit: u16,          // 450 = 4.5%
    // tier1_jackpot = 10000 - sum = 50 = 0.5%

    pub tier2_max_luck: u8,         // Luck 6-13
    pub tier2_dud: u16,             // 4500 = 45%
    pub tier2_rebate: u16,          // 3000 = 30%
    pub tier2_breakeven: u16,       // 1500 = 15%
    pub tier2_profit: u16,          // 850 = 8.5%
    // tier2_jackpot = 150 = 1.5%

    pub tier3_dud: u16,             // Luck 14-60, 3000 = 30%
    pub tier3_rebate: u16,          // 2500 = 25%
    pub tier3_breakeven: u16,       // 2000 = 20%
    pub tier3_profit: u16,          // 2000 = 20%
    // tier3_jackpot = 500 = 5%

    pub updated_at: i64,
}
```

#### ProjectConfig (123 bytes)
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
    pub reward_tier: u8,            // 0=Dud, 1=Rebate, 2=Break-even, 3=Profit, 4=Jackpot
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

---

## Backend API (Node.js/Express)

### Base URL
- Development: `http://localhost:3333`
- Production: TBD

### Routes

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
| POST | `/update-platform-config` | Update on-chain platform config |
| GET | `/platform-config` | Read current on-chain config |

### Key Files

| File | Purpose |
|------|---------|
| `server.js` | Express entry point, middleware |
| `routes/program.js` | All on-chain transaction building (2400+ lines) |
| `routes/projects.js` | Project CRUD operations |
| `routes/vault.js` | Vault balance queries |
| `routes/admin.js` | Admin platform config sync |
| `lib/pdaHelpers.js` | PDA derivation utilities |
| `lib/anchorClient.js` | Anchor program connection |
| `lib/getNetworkConfig.js` | Network/RPC configuration |
| `lib/switchboard.js` | Switchboard VRF helpers (create, commit, reveal) |
| `scripts/init-platform-config.js` | Initialize platform config PDA |

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

### State Management (Zustand)

| Store | Purpose |
|-------|---------|
| `useNetworkStore.js` | Network config, RPC, admin wallet |
| `useProjectStore.js` | Projects list, loading states |
| `useBoxStore.js` | User's boxes, filters |

### React 19 Features Used

- `useOptimistic` - Optimistic UI updates for box operations
- `useTransition` - Non-blocking state updates

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
launch_fee_amount: bigint (lamports)
withdrawal_fee_percentage: numeric
luck_interval_seconds: integer
vault_fund_amount: bigint (lamports)
is_production: boolean
```

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

**Formula:** `DB value = On-chain tier + 1` (to reserve 0 for pending state)

**Code checks:**
- `box_result === 0` → Box is pending/not revealed
- `box_result !== 0` → Box has been revealed
- `box_result === 5` → Jackpot (not 4!)

#### `reserved_subdomains`
```sql
subdomain: string (primary key)
reason: string
```

### Migrations Applied

1. `001_treasury_to_vault.sql` - Renamed treasury to vault
2. `002_reserved_subdomains.sql` - Reserved subdomain list
3. `003_add_payment_token_fields.sql` - Token metadata
4. `004_add_numeric_id_sequence.sql` - Auto-increment project IDs
5. `005_add_box_verification_columns.sql` - TX signatures, luck values

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
1. Creator on /dashboard/manage/[id] clicks "Withdraw"
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
Note: Withdrawal fee (2% in $3EYES) NOT YET IMPLEMENTED
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
- `luck_time_interval`: 3 seconds (devnet) or 10800 seconds (mainnet)

### Reward Tiers

| Tier | Payout | Tier 1 (Luck 0-5) | Tier 2 (Luck 6-13) | Tier 3 (Luck 14-60) |
|------|--------|-------------------|---------------------|---------------------|
| Dud | 0x | 55% | 45% | 30% |
| Rebate | 0.8x | 30% | 30% | 25% |
| Break-even | 1.0x | 10% | 15% | 20% |
| Profit | 2.5x | 4.5% | 8.5% | 20% |
| Jackpot | 10x | 0.5% | 1.5% | 5% |

### Expected Value Calculation

For Tier 3 (best odds):
```
EV = (0.30 × 0) + (0.25 × 0.8) + (0.20 × 1.0) + (0.20 × 2.5) + (0.05 × 10)
EV = 0 + 0.2 + 0.2 + 0.5 + 0.5
EV = 1.4x (40% expected profit for users)
```

### Locked Balance Calculation (Off-Chain)

To prevent creators from withdrawing funds needed for potential payouts:

```javascript
// Statistical approach (1.4x expected value)
const pendingBoxes = await getPendingBoxCount(projectId);
const boxPrice = project.box_price;
const lockedBalance = pendingBoxes * boxPrice * 1.4;
const available = vaultBalance - lockedBalance;
```

**Note:** This is calculated off-chain only. The on-chain program trusts the backend to enforce this.

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
   - Randomness is read from account offset 152-184 (32 bytes)

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
```

### Important Notes

1. **Never use Crossbar for VRF** - Crossbar routes to different oracles, which breaks the commit-reveal pattern and causes `InvalidSecpSignature` errors (0x1780).

2. **Devnet Reliability** - Devnet oracles can be unreliable (503 errors, timeouts). The backend includes retry logic with exponential backoff.

3. **Randomness Account Reading** - The randomness value is at offset 152-184 in the account data. Check `reveal_slot` at offset 144-152 is non-zero before reading.

4. **Retry Logic** - The reveal instruction has built-in retry logic (3 attempts, exponential backoff) for transient oracle failures.

---

## Current Implementation Status

### Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Platform Config PDA | Complete | Global tunable parameters |
| Project Creation | Complete | Launch fee collection works |
| Box Purchase | Complete | VRF commit on open |
| Box Reveal | Complete | VRF randomness working |
| Reward Claim | Complete | Vault payout via PDA |
| Project Pause/Resume | Complete | Active flag toggleable |
| Admin Dashboard | Complete | Config sync to on-chain |
| Luck System | Complete | Time-based accumulation |
| Tier Probabilities | Complete | 3 configurable tiers |

### Incomplete / TODO

| Feature | Priority | Notes |
|---------|----------|-------|
| Withdrawal Fee | High | 2% in $3EYES not implemented |
| Rate Limiting | High | No express-rate-limit yet |
| RLS Policies | High | Need owner_wallet checks |
| Subdomain Routing | Medium | Currently using path routing |
| Backend Wallet Auth | Medium | No signed message verification |
| Program Security Metadata | Low | For mainnet launch |

---

## Security Considerations

### Strengths

| Feature | Implementation | Benefit |
|---------|----------------|---------|
| PDA-controlled vaults | Vault authority is program-derived | Developers cannot steal funds |
| VRF randomness | Switchboard oracle-signed | Cannot predict/manipulate outcomes |
| On-chain verification | confirm-reveal reads blockchain | Cannot fake rewards |
| Fresh blockhash | Every transaction | Prevents replay attacks |
| Reveal window | 1 hour limit | Prevents timing attacks |

### Known Gaps

| Issue | Risk | Recommendation |
|-------|------|----------------|
| RLS too permissive | Any user can UPDATE | Add owner_wallet checks |
| No backend wallet auth | Claim any owner_wallet | Require signed messages |
| No rate limiting | API spam | Add express-rate-limit |
| Missing withdrawal fee | Platform revenue loss | Implement fee transfer |

---

## Environment Configuration

### Backend (.env)

```bash
PORT=3333
NODE_ENV=development
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
DEPLOY_WALLET_JSON=[array of 64 bytes]  # Platform admin wallet keypair
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3333
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## Deployment Information

### Current Devnet Deployment

| Resource | Address |
|----------|---------|
| Program ID | `GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat` |
| Platform Config PDA | `6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t` |
| Admin Wallet | `5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn` |
| Test Token ($3EYES) | Set in super_admin_config |

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

*Document maintained by Claude Code for 3Eyes FateBox v3 development*
