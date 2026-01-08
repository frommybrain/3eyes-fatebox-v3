# 3Eyes Lootbox Platform - Technical Specification

## Executive Summary

A multi-tenant Solana platform that enables creators to deploy their own token-based lootbox gambling systems. The platform uses a pure on-chain Rust program approach (no NFTs), with database-driven configuration and a commission model using the $3EYES platform token.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Reference Files](#reference-files)
3. [Architecture Decisions](#architecture-decisions)
4. [Core Components](#core-components)
5. [Rust Program Specification](#rust-program-specification)
6. [Backend API Specification](#backend-api-specification)
7. [Frontend Specification](#frontend-specification)
8. [Database Schema](#database-schema)
9. [Token Economics](#token-economics)
10. [User Flows](#user-flows)
11. [Security Considerations](#security-considerations)
12. [Deployment Strategy](#deployment-strategy)
13. [Migration from Current System](#migration-from-current-system)
14. [Super Admin Configuration](#super-admin-configuration)

---

## Platform Overview

### Current State (FateBox v2)
- Single-project Solana gambling system
- Uses Metaplex Candy Machine v3 for NFT minting
- Custom Rust program for box state and randomness
- Fixed token payment (DEV_FATE_MINT)
- Manual configuration via environment variables

### Target State (3Eyes Platform)
- Multi-tenant platform supporting unlimited projects
- No NFTs - pure PDA-based box instances
- Each project uses their own SPL token
- Database-driven configuration (no env vars per project)
- Automated deployment via API
- Commission model using $3EYES token

### Key Platform Features
1. **Project Creation**: Creators pay configurable launch fee in $3EYES (set by super admin)
2. **Automated Setup**: Platform deploys vault PDAs and configures project
3. **Box Purchases**: Users buy boxes with project's native token
4. **Escrow System**: Funds held in platform-controlled vault PDAs
5. **Withdrawal Fees**: Creators pay configurable % fee in $3EYES (set by super admin)
6. **Subdomain Routing**: Each project gets unique subdomain (e.g., `catbox.3eyes.fun`, `dogbox.3eyes.fun`)
7. **Pause/Resume**: Projects can be paused by creator to prevent new box purchases

---

## Reference Files

A curated collection of working code from FateBox v2 is available in the `/REFERENCE_FILES/` directory. This includes:

- **lib.rs** - Complete Anchor program with Switchboard VRF integration, PDA patterns, vault logic
- **Backend routes** - Admin API, batch status checks, commit/reveal/settle patterns
- **Scripts** - Box opening, settlement, Switchboard debugging utilities
- **Utilities** - Keypair loading, wallet authentication, rate limiting
- **Configuration** - Anchor.toml, config.json examples

**See `/REFERENCE_FILES/README.md` for detailed documentation on what to use and what to avoid.**

Key learnings from FateBox v2:
- Manual buffer deserialization when Anchor decoder fails
- Rate limiting patterns for RPC calls
- PDA signer seeds for vault withdrawals
- Wallet signature verification for admin auth
- Switchboard VRF timing considerations

**Note**: Reference files contain NFT/Candy Machine code that should NOT be used in the new platform. Focus on Solana/Anchor patterns only.

---

## Architecture Decisions

### Why No NFTs?

**Original Approach**: Used Metaplex Candy Machine to mint NFTs as "box receipts"

**Problems**:
- NFTs aren't meant to be traded (defeats the purpose)
- Expensive (0.01 SOL per mint + candy machine rent)
- Adds complexity (metadata, IPFS, Metaplex integration)
- Poor UX (wallet clutter, slow mints)
- NFT market is bearish
- Not aligned with actual use case (gambling logic, not collectibles)

**Solution**: Pure on-chain game state using PDAs

**Benefits**:
- 90% cost reduction (no Metaplex fees)
- Instant box creation
- Simpler architecture
- Aligned with modern Solana gaming patterns
- No wallet clutter
- Full control over logic

### Why Custom Rust Program?

**Considered Alternatives**:
- Metaplex Core NFTs
- Candy Guard extensions
- Pure backend logic

**Decision**: Custom Rust program for business logic, no Metaplex

**Rationale**:
- Metaplex doesn't support multi-tenant vault management
- No native way to enforce withdrawal fees in different token
- Need project-scoped escrow PDAs
- Commission logic is unique to platform
- Modern Solana gaming standard is PDA-based state

### Architecture Pattern: Pure On-Chain Game

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  (Next.js 15 + React 19 + Solana Wallet Adapter)            │
│  - Subdomain routing: catbox.3eyes.fun, dogbox.3eyes.fun    │
│  - Reads PDAs for box state                                  │
│  - No NFT metadata parsing                                   │
│  - Pure JavaScript (NO TypeScript)                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API (Express)                   │
│  - Authentication & authorization                            │
│  - Project creation orchestration                            │
│  - Database operations                                       │
│  - Stats & analytics                                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                     │
│  - Project configurations                                    │
│  - User data                                                 │
│  - Analytics cache                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Solana Blockchain (Mainnet-Beta)               │
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │   3Eyes Platform Program (Custom Rust)       │          │
│  │                                               │          │
│  │  PDAs:                                        │          │
│  │  ┌─────────────────────────────────────┐    │          │
│  │  │ ProjectConfig                        │    │          │
│  │  │ - project_id                         │    │          │
│  │  │ - owner                              │    │          │
│  │  │ - payment_token                      │    │          │
│  │  │ - box_price                          │    │          │
│  │  │ - vault_pda                          │    │          │
│  │  │ - total_boxes                        │    │          │
│  │  └─────────────────────────────────────┘    │          │
│  │                                               │          │
│  │  ┌─────────────────────────────────────┐    │          │
│  │  │ BoxInstance                          │    │          │
│  │  │ - box_id                             │    │          │
│  │  │ - owner                              │    │          │
│  │  │ - project_id                         │    │          │
│  │  │ - luck, revealed, settled            │    │          │
│  │  │ - reward_amount                      │    │          │
│  │  └─────────────────────────────────────┘    │          │
│  │                                               │          │
│  │  ┌─────────────────────────────────────┐    │          │
│  │  │ Vault PDA (SPL Token Account)        │    │          │
│  │  │ - Holds project earnings              │    │          │
│  │  │ - Controlled by program               │    │          │
│  │  └─────────────────────────────────────┘    │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │   Switchboard VRF (Verifiable Randomness)    │          │
│  └──────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. 3Eyes Platform Token ($3EYES)

**Purpose**: Platform utility token for fees and governance

**Token Economics**:
- Launch Fee: xxx $3EYES (one-time per project) - will need a super-admin dashboard where I can set this amount
- Withdrawal Fee: TBD - most likely a tiered fixed withdrawal fee in $3EYES

**Creation**: Super admin to deploy on pump.fun or Raydium with initial liquidity

**Tokenomics** (To be finalized):
- Total Supply: TBD
- Initial Liquidity: TBD
- Team Allocation: TBD
- Treasury: TBD

### 2. Custom Rust Program

**Program ID**: (New deployment, not current RANDOM_GUARD_PROGRAM_ID)

**Purpose**: Core business logic for multi-tenant lootbox platform

**Key Features**:
- Project management (create, configure)
- Box lifecycle (create, reveal, settle)
- Vault escrow management
- Withdrawal with fee enforcement
- Randomness integration (Switchboard VRF)
- Luck accumulation over time

### 3. Backend API

**Stack**: Node.js + Express + Anchor SDK

**Purpose**:
- Orchestrate project creation
- Manage database state
- Provide analytics
- Handle authentication
- Rate limiting

### 4. Frontend

**Stack**: Next.js 15 + React 19 + Solana Wallet Adapter

**Purpose**:
- Project discovery and selection
- Box purchase interface
- User dashboard (my boxes)
- Creator dashboard (project stats, withdrawals)
- Admin panel (platform management)

### 5. Database

**Stack**: Supabase (PostgreSQL + Auth + Realtime)

**Purpose**:
- Store project configurations
- Cache on-chain data for performance
- User profiles and preferences
- Analytics and metrics

---

## Rust Program Specification

### Program Structure

```
3eyes-platform/
├── programs/
│   └── lootbox-platform/
│       └── src/
│           ├── lib.rs                  # Program entry point
│           ├── state.rs                # Account structures
│           ├── instructions/
│           │   ├── mod.rs
│           │   ├── create_project.rs
│           │   ├── create_box.rs
│           │   ├── reveal_box.rs
│           │   ├── settle_box.rs
│           │   ├── withdraw_earnings.rs
│           │   └── update_project.rs
│           ├── errors.rs               # Custom errors
│           └── utils.rs                # Helper functions
└── tests/
    └── lootbox-platform.ts
```

### Account Structures

#### ProjectConfig PDA
```rust
#[account]
pub struct ProjectConfig {
    pub project_id: u64,              // 8 bytes - Sequential ID
    pub owner: Pubkey,                // 32 bytes - Project creator
    pub payment_token: Pubkey,        // 32 bytes - SPL token mint for payments
    pub box_price: u64,               // 8 bytes - Cost per box in smallest units
    pub vault_authority: Pubkey,      // 32 bytes - PDA that controls vault
    pub total_boxes_created: u64,     // 8 bytes - Counter for box IDs
    pub total_boxes_settled: u64,     // 8 bytes - Completed boxes
    pub total_revenue: u64,           // 8 bytes - Total tokens collected
    pub total_paid_out: u64,          // 8 bytes - Total rewards distributed
    pub launch_fee_paid: bool,        // 1 byte - 10k $3EYES paid
    pub active: bool,                 // 1 byte - Can create new boxes
    pub created_at: i64,              // 8 bytes - Unix timestamp
    pub bump: u8,                     // 1 byte - PDA bump seed
}

impl ProjectConfig {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 32 + 8 + 8 + 8 + 8 + 1 + 1 + 8 + 1; // 155 bytes
}

// PDA Derivation: ["project", project_id.to_le_bytes()]
```

#### BoxInstance PDA
```rust
#[account]
pub struct BoxInstance {
    pub box_id: u64,                  // 8 bytes - Unique box ID within project
    pub project_id: u64,              // 8 bytes - Which project this belongs to
    pub owner: Pubkey,                // 32 bytes - Box owner
    pub created_at: i64,              // 8 bytes - Unix timestamp
    pub luck: u8,                     // 1 byte - Current luck score (5-60)
    pub reward_amount: u64,           // 8 bytes - Calculated reward
    pub box_result: u8,               // 1 byte - Result type: 0=dud, 1=rebate, 2=break_even, 3=profit, 4=jackpot
    pub is_jackpot: bool,             // 1 byte - Hit jackpot (legacy, could merge with box_result)
    pub revealed: bool,               // 1 byte - Randomness requested
    pub settled: bool,                // 1 byte - Reward claimed
    pub randomness_account: Pubkey,   // 32 bytes - Switchboard VRF account
    pub random_percentage: f64,       // 8 bytes - Random value (0.0-1.0)
    pub bump: u8,                     // 1 byte - PDA bump seed
}

impl BoxInstance {
    pub const LEN: usize = 8 + 8 + 32 + 8 + 1 + 8 + 1 + 1 + 1 + 1 + 32 + 8 + 1; // 110 bytes
}

// PDA Derivation: ["box", project_id.to_le_bytes(), box_id.to_le_bytes()]

// Box Result Enum (not stored on-chain, just for clarity)
pub enum BoxResult {
    Dud = 0,        // Lost: reward < box_price (e.g., 0.5x)
    Rebate = 1,     // Slight loss: reward < box_price but close (e.g., 0.9x)
    BreakEven = 2,  // Exactly box_price (1.0x)
    Profit = 3,     // Won: reward > box_price (e.g., 1.5x, 2x)
    Jackpot = 4,    // Massive win: reward >> box_price (e.g., 50% of vault)
}
```

#### VaultAuthority PDA
```rust
// This is just a PDA, not an account with data
// It's the authority over the vault token account
// PDA Derivation: ["vault", project_id.to_le_bytes(), payment_token.as_ref()]

// IMPORTANT CLARIFICATION:
// The vault PDA is controlled by the PROGRAM (not any user wallet).
// Each project gets its own vault PDA derived from project_id.
// The platform admin wallet (C9t218MuHcsKPFMZQLvVdnPMRP5AYGRAYc8oLhshH3aF)
// does NOT control vaults - the program itself does via PDA seeds.
//
// This means:
// - Project creator cannot directly withdraw from vault
// - Users cannot directly withdraw from vault
// - Only the program instructions can move funds from vault
// - The program enforces all withdrawal rules (fees, available balance, etc.)
//
// Example: When creator withdraws:
// 1. Creator calls withdraw_earnings instruction
// 2. Program verifies creator owns project
// 3. Program calculates fee in $3EYES
// 4. Creator must pay fee
// 5. Program uses vault PDA seeds as signer to transfer tokens
// 6. Tokens go from vault → creator wallet
//
// The admin wallet is only used for:
// - Authenticating to admin dashboard
// - Receiving platform fees ($3EYES payments)
// - Super admin configuration changes
```

### Instructions

#### 1. create_project
```rust
pub fn create_project(
    ctx: Context<CreateProject>,
    project_id: u64,
    payment_token: Pubkey,
    box_price: u64,
) -> Result<()>
```

**Accounts**:
- `owner` (signer, mut) - Project creator, pays rent
- `project_config` (init, pda) - ProjectConfig PDA
- `vault_authority` (pda) - Vault authority PDA
- `vault_token_account` (init) - SPL token account for vault
- `platform_fee_account` (mut) - Where launch fee goes
- `owner_3eyes_account` (mut) - Owner's $3EYES account
- `three_eyes_mint` - $3EYES mint address
- `token_program` - SPL Token program
- `system_program` - System program

**Logic**:
1. Verify owner has 10,000 $3EYES
2. Transfer 10,000 $3EYES from owner to platform
3. Derive vault_authority PDA: `["vault", project_id, payment_token]`
4. Create vault token account owned by vault_authority PDA
5. Initialize ProjectConfig PDA with:
   - project_id
   - owner
   - payment_token
   - box_price
   - vault_authority
   - launch_fee_paid = true
   - active = true
   - created_at = current timestamp
6. Emit event: ProjectCreated

**Constraints**:
- Project ID must be unique (account init will fail if exists)
- box_price must be > 0
- payment_token must be valid SPL token mint

---

#### 2. create_box
```rust
pub fn create_box(
    ctx: Context<CreateBox>,
    project_id: u64,
) -> Result<()>
```

**Accounts**:
- `buyer` (signer, mut) - User creating box
- `project_config` (mut) - ProjectConfig PDA
- `box_instance` (init, pda) - New BoxInstance PDA
- `buyer_token_account` (mut) - Buyer's SPL token account
- `vault_token_account` (mut) - Project's vault token account
- `token_program` - SPL Token program
- `system_program` - System program

**Logic**:
1. Verify project is active
2. Increment project.total_boxes_created to get new box_id
3. Transfer box_price tokens from buyer to vault
4. Initialize BoxInstance PDA with:
   - box_id
   - project_id
   - owner = buyer
   - created_at = current timestamp
   - luck = 5 (base luck)
   - revealed = false
   - settled = false
5. Increment project.total_revenue by box_price
6. Emit event: BoxCreated

**Constraints**:
- project_config.active must be true
- buyer must have sufficient tokens
- box_id derived from counter (prevents collisions)

---

#### 3. reveal_box
```rust
pub fn reveal_box(
    ctx: Context<RevealBox>,
    project_id: u64,
    box_id: u64,
) -> Result<()>
```

**Accounts**:
- `owner` (signer) - Box owner
- `project_config` - ProjectConfig PDA
- `box_instance` (mut) - BoxInstance PDA
- `randomness_account` - Switchboard VRF account
- `switchboard_program` - Switchboard program

**Logic**:
1. Verify owner owns this box
2. Verify box not already revealed
3. Calculate current luck based on hold time:
   - Base luck: 5
   - Bonus: +1 every 3 hours held (testing: 3 seconds)
   - Max luck: 60
4. Request randomness from Switchboard VRF
5. Store randomness_account reference
6. Calculate reward_amount based on luck + randomness:
   ```rust
   // Reward calculation logic
   let luck_multiplier = (luck as f64) / 10.0; // 0.5 - 6.0
   let random_bonus = random_percentage * 2.0; // 0.0 - 2.0
   let total_multiplier = luck_multiplier + random_bonus;
   let base_reward = box_price;
   let reward = (base_reward as f64 * total_multiplier) as u64;

   // Jackpot check (1% chance at max luck)
   let is_jackpot = luck >= 60 && random_percentage > 0.99;
   if is_jackpot {
       reward = vault_balance * 0.5; // 50% of vault
   }
   ```
7. Set revealed = true
8. Set reward_amount
9. Set is_jackpot
10. Set random_percentage
11. Emit event: BoxRevealed

**Constraints**:
- Must be box owner
- Box must not be revealed
- Box must not be settled
- Sufficient time passed for Switchboard callback

---

#### 4. settle_box
```rust
pub fn settle_box(
    ctx: Context<SettleBox>,
    project_id: u64,
    box_id: u64,
) -> Result<()>
```

**Accounts**:
- `owner` (signer) - Box owner
- `project_config` (mut) - ProjectConfig PDA
- `box_instance` (mut) - BoxInstance PDA
- `vault_authority` (pda) - Vault authority PDA
- `vault_token_account` (mut) - Project's vault
- `owner_token_account` (mut) - Owner's token account
- `token_program` - SPL Token program

**Logic**:
1. Verify owner owns this box
2. Verify box is revealed but not settled
3. Transfer reward_amount from vault to owner
   - Use vault_authority PDA as signer (via seeds)
4. Set settled = true
5. Increment project.total_boxes_settled
6. Increment project.total_paid_out by reward_amount
7. Emit event: BoxSettled

**Constraints**:
- Must be box owner
- Box must be revealed
- Box must not already be settled
- Vault must have sufficient balance

---

#### 5. withdraw_earnings
```rust
pub fn withdraw_earnings(
    ctx: Context<WithdrawEarnings>,
    project_id: u64,
    amount: u64,
) -> Result<()>
```

**Accounts**:
- `owner` (signer) - Project owner
- `project_config` - ProjectConfig PDA
- `vault_authority` (pda) - Vault authority PDA
- `vault_token_account` (mut) - Project's vault
- `owner_token_account` (mut) - Owner's project token account
- `owner_3eyes_account` (mut) - Owner's $3EYES account
- `platform_fee_account` (mut) - Platform $3EYES account
- `three_eyes_mint` - $3EYES mint
- `token_program` - SPL Token program

**Logic**:
1. Verify caller is project owner
2. Calculate available balance:
   ```rust
   let vault_balance = vault_token_account.amount;
   let locked_for_boxes = calculate_locked_amount(project_config);
   let available = vault_balance - locked_for_boxes;
   ```
3. Verify amount <= available
4. Calculate 2% fee in $3EYES:
   ```rust
   // Get oracle price or use fixed rate
   // For MVP: 1 project token = 0.0001 $3EYES (configurable)
   let fee_in_3eyes = (amount as f64 * 0.02 * price_ratio) as u64;
   ```
5. Transfer fee from owner's $3EYES to platform
6. Transfer amount from vault to owner (using vault_authority seeds)
7. Emit event: EarningsWithdrawn

**Constraints**:
- Must be project owner
- Amount must not exceed available balance
- Must have sufficient $3EYES for fee
- Cannot withdraw locked funds (for pending boxes)

---

#### 6. update_project
```rust
pub fn update_project(
    ctx: Context<UpdateProject>,
    project_id: u64,
    new_box_price: Option<u64>,
    new_active: Option<bool>,
) -> Result<()>
```

**Accounts**:
- `owner` (signer) - Project owner
- `project_config` (mut) - ProjectConfig PDA

**Logic**:
1. Verify caller is project owner
2. Update fields if provided:
   - box_price (if Some)
   - active (if Some) - This is the PAUSE/RESUME functionality
3. Emit event: ProjectUpdated

**Constraints**:
- Must be project owner
- new_box_price (if provided) must be > 0

**Pause/Resume Functionality**:
- When `active = false`: Users CANNOT call create_box (checked in create_box instruction)
- When `active = true`: Users CAN call create_box
- Creator can toggle this anytime to pause new box purchases
- Does NOT affect revealing/settling existing boxes
- Useful for:
  - Creator needs to add more tokens to vault
  - Creator wants to temporarily pause for maintenance
  - Creator wants to end the project gracefully

**Box Limit**:
- There is NO limit on number of boxes
- ProjectConfig.total_boxes_created is u64 (max: 18,446,744,073,709,551,615)
- Practically unlimited
- Creator can pause project if they want to stop accepting new boxes

---

### Error Codes

```rust
#[error_code]
pub enum LootboxError {
    #[msg("Insufficient funds for launch fee")]
    InsufficientLaunchFee,

    #[msg("Project is not active")]
    ProjectInactive,

    #[msg("Box already revealed")]
    BoxAlreadyRevealed,

    #[msg("Box not revealed yet")]
    BoxNotRevealed,

    #[msg("Box already settled")]
    BoxAlreadySettled,

    #[msg("Not box owner")]
    NotBoxOwner,

    #[msg("Not project owner")]
    NotProjectOwner,

    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,

    #[msg("Withdrawal amount exceeds available balance")]
    WithdrawalExceedsAvailable,

    #[msg("Insufficient 3EYES for withdrawal fee")]
    InsufficientFeeBalance,

    #[msg("Invalid box price")]
    InvalidBoxPrice,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Randomness not ready")]
    RandomnessNotReady,
}
```

---

## Backend API Specification

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.x
- **Blockchain SDK**: @coral-xyz/anchor ^0.31.1
- **Database**: Supabase client
- **Authentication**: Wallet signature verification (tweetnacl)

### API Endpoints

#### Project Management

##### POST /api/projects/create
Create a new project after on-chain initialization

**Request**:
```json
{
  "projectId": 1,
  "ownerWallet": "ABC...xyz",
  "paymentTokenMint": "DEF...789",
  "boxPrice": "1000000000",
  "signature": "...",
  "message": "Create project 1 at 1234567890"
}
```

**Response**:
```json
{
  "success": true,
  "project": {
    "id": 1,
    "projectId": 1,
    "ownerWallet": "ABC...xyz",
    "paymentTokenMint": "DEF...789",
    "boxPrice": "1000000000",
    "vaultPda": "GHI...456",
    "candyMachineAddress": null,
    "active": true,
    "createdAt": "2026-01-07T12:00:00Z"
  }
}
```

**Logic**:
1. Verify wallet signature
2. Check if project_id already exists in DB
3. Fetch ProjectConfig PDA from chain
4. Store project in database
5. Return project data

---

##### GET /api/projects/:projectId
Get project details

**Response**:
```json
{
  "success": true,
  "project": {
    "id": 1,
    "projectId": 1,
    "ownerWallet": "ABC...xyz",
    "paymentTokenMint": "DEF...789",
    "tokenMetadata": {
      "name": "Project Token",
      "symbol": "PROJ",
      "decimals": 9
    },
    "boxPrice": "1000000000",
    "vaultPda": "GHI...456",
    "vaultBalance": "50000000000",
    "totalBoxesCreated": 123,
    "totalBoxesSettled": 100,
    "totalRevenue": "123000000000",
    "totalPaidOut": "150000000000",
    "active": true,
    "createdAt": "2026-01-07T12:00:00Z"
  }
}
```

**Logic**:
1. Query database for project
2. Fetch on-chain ProjectConfig for latest stats
3. Fetch vault token account balance
4. Fetch token metadata
5. Return combined data

---

##### GET /api/projects
List all projects (with pagination)

**Query Params**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `active`: Filter by active status (optional)
- `owner`: Filter by owner wallet (optional)

**Response**:
```json
{
  "success": true,
  "projects": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

#### Box Management

##### GET /api/boxes/user/:walletAddress
Get all boxes owned by a wallet

**Query Params**:
- `projectId`: Filter by project (optional)
- `status`: Filter by status (unopened/revealed/settled) (optional)

**Response**:
```json
{
  "success": true,
  "boxes": [
    {
      "boxId": 42,
      "projectId": 1,
      "owner": "ABC...xyz",
      "createdAt": 1704628800000,
      "luck": 15,
      "rewardAmount": "2500000000",
      "isJackpot": false,
      "revealed": true,
      "settled": false,
      "phase": "revealed",
      "pda": "JKL...mno"
    }
  ]
}
```

**Logic**:
1. Query Solana for BoxInstance PDAs owned by wallet
2. Parse box state from account data
3. Calculate current luck for unrevealed boxes
4. Determine phase (unopened/revealed/settled)
5. Return array of boxes

---

##### POST /api/boxes/batch-status
Check status for multiple boxes (rate-limited)

**Request**:
```json
{
  "boxPdas": ["PDA1...", "PDA2...", "PDA3..."]
}
```

**Response**:
```json
{
  "success": true,
  "boxes": {
    "PDA1...": {
      "exists": true,
      "boxState": {...},
      "currentLuck": 25,
      "phase": "revealed"
    }
  }
}
```

**Rate Limiting**:
- Max 50 boxes per request
- Process in chunks of 5 with 200ms delay
- Cache results for 5 minutes

---

#### Stats & Analytics

##### GET /api/stats/platform
Platform-wide statistics (admin only)

**Response**:
```json
{
  "success": true,
  "stats": {
    "totalProjects": 42,
    "activeProjects": 38,
    "totalBoxesCreated": 15234,
    "totalBoxesSettled": 12890,
    "total3EyesCollected": "5420000000000",
    "topProjects": [...]
  }
}
```

---

##### GET /api/stats/project/:projectId
Project-specific statistics

**Response**:
```json
{
  "success": true,
  "stats": {
    "projectId": 1,
    "boxStats": {
      "unopened": 23,
      "revealed": 5,
      "settled": 95
    },
    "financials": {
      "totalRevenue": "123000000000",
      "totalPaidOut": "150000000000",
      "currentVaultBalance": "50000000000",
      "lockedForPendingBoxes": "28000000000",
      "availableToWithdraw": "22000000000",
      "netProfitLoss": "-27000000000"
    },
    "jackpots": {
      "total": 2,
      "totalAmount": "25000000000"
    },
    "luckDistribution": {
      "5-10": 50,
      "11-20": 30,
      "21-40": 15,
      "41-60": 5
    }
  }
}
```

---

#### Admin Endpoints

##### POST /api/admin/authenticate
Authenticate admin wallet

**Request**:
```json
{
  "wallet": "C9t218MuHc...",
  "message": "Admin auth 1704628800123",
  "signature": "..."
}
```

**Response**:
```json
{
  "success": true,
  "token": "JWT_TOKEN_HERE"
}
```

**Logic**:
1. Verify wallet matches ADMIN_WALLET env var
2. Verify signature using tweetnacl
3. Check timestamp (5 minute window)
4. Generate JWT token
5. Return token

---

##### GET /api/admin/stats/platform
Comprehensive platform statistics (requires admin auth)

---

##### POST /api/admin/projects/:projectId/deactivate
Deactivate a project (emergency only)

---

### Authentication Middleware

```javascript
// middleware/requireWalletAuth.js
const nacl = require('tweetnacl');
const bs58 = require('bs58');

function requireWalletAuth(req, res, next) {
    const { wallet, message, signature } = req.headers;

    if (!wallet || !message || !signature) {
        return res.status(401).json({ error: 'Missing auth headers' });
    }

    try {
        // Verify signature
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = bs58.decode(signature);
        const publicKeyBytes = bs58.decode(wallet);

        const verified = nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKeyBytes
        );

        if (!verified) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Check timestamp (5 minute window)
        const timestamp = parseInt(message.match(/\d+/)[0]);
        const now = Date.now();
        if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
            return res.status(401).json({ error: 'Authentication expired' });
        }

        req.wallet = wallet;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Authentication failed' });
    }
}

// middleware/requireAdmin.js
function requireAdmin(req, res, next) {
    requireWalletAuth(req, res, () => {
        if (req.wallet !== process.env.ADMIN_WALLET) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
}
```

---

### Environment Variables

```bash
# Solana Configuration
SOLANA_NETWORK=mainnet-beta
RPC_URL=https://mainnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6

# Alternative RPC providers (if needed):
# RPC_URL=https://api.mainnet-beta.solana.com  # Free but rate-limited
# RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY  # Alchemy
# RPC_URL=https://rpc.ankr.com/solana  # Ankr

# Program IDs
LOOTBOX_PLATFORM_PROGRAM_ID=NEW_PROGRAM_ID_HERE
THREE_EYES_MINT=3EYES_MINT_ADDRESS

# Platform Configuration
PLATFORM_FEE_ACCOUNT=PLATFORM_3EYES_ATA
ADMIN_WALLET=C9t218MuHcsKPFMZQLvVdnPMRP5AYGRAYc8oLhshH3aF

# Backend Wallet
BACKEND_WALLET_PATH=/path/to/backend-wallet.json
# OR (for deployed environments like Render)
BACKEND_WALLET_JSON={"keypair":"array"}

# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your_anon_key

# Server
PORT=3001
NODE_ENV=production

# JWT Secret
JWT_SECRET=random_secret_here

# NOTE: Launch fee and withdrawal fee percentage are NOT env vars
# They are stored in the database (super_admin_config table)
# and can be updated via the super admin dashboard
```

---

## Frontend Specification

### Technology Stack
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Solana**: @solana/wallet-adapter-react
- **State**: React Context + local state
- **Blockchain**: @coral-xyz/anchor

### Application Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.js              # Root layout with wallet provider
│   │   ├── page.js                # Landing page
│   │   ├── projects/
│   │   │   └── page.js            # Project listing
│   │   ├── project/
│   │   │   └── [id]/
│   │   │       └── page.js        # Dynamic project page
│   │   ├── dashboard/
│   │   │   └── page.js            # User dashboard (my boxes)
│   │   ├── creator/
│   │   │   ├── page.js            # Creator landing
│   │   │   ├── new/
│   │   │   │   └── page.js        # Create project flow
│   │   │   └── [id]/
│   │   │       └── page.js        # Project management dashboard
│   │   └── admin/
│   │       └── page.js            # Admin dashboard
│   ├── components/
│   │   ├── wallet/
│   │   │   └── WalletButton.jsx
│   │   ├── boxes/
│   │   │   ├── BoxCard.jsx
│   │   │   ├── BoxGrid.jsx
│   │   │   ├── CreateBoxButton.jsx
│   │   │   ├── RevealBoxButton.jsx
│   │   │   └── ClaimRewardButton.jsx
│   │   ├── projects/
│   │   │   ├── ProjectCard.jsx
│   │   │   └── ProjectStats.jsx
│   │   ├── creator/
│   │   │   ├── CreateProjectForm.jsx
│   │   │   ├── WithdrawEarnings.jsx
│   │   │   └── ProjectSettings.jsx
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       └── ...
│   ├── contexts/
│   │   ├── ProgramContext.jsx     # Anchor program instance
│   │   └── ProjectContext.jsx     # Current project state
│   ├── hooks/
│   │   ├── useProgram.js          # Access program instance
│   │   ├── useProject.js          # Fetch project data
│   │   ├── useUserBoxes.js        # Fetch user's boxes
│   │   └── useWalletAuth.js       # Wallet signature auth
│   ├── lib/
│   │   ├── anchor.js              # Anchor setup
│   │   ├── solana.js              # Connection helpers
│   │   └── api.js                 # API client
│   └── styles/
│       └── globals.css
```

### Key Pages

#### 1. Landing Page (`/`)
- Hero section explaining platform
- Featured projects carousel
- Stats (total projects, boxes opened, etc.)
- CTA buttons: "Create Project" / "Explore Projects"

#### 2. Project Listing (`/projects`)
- Grid of all active projects
- Filters: token type, activity, etc.
- Search bar
- Pagination

#### 3. Project Page (`/project/[id]`)
**Main Lootbox Interface**

Components:
- Project header (name, token, stats)
- "Buy Box" button (connects wallet, shows price)
- User's boxes for this project (grid)
- Box states: unopened (shows luck accumulation), revealed (shows reward), settled (completed)
- Project stats sidebar

**Box Interaction Flow**:
```
[Unopened Box]
├─ Shows current luck (updates in real-time)
├─ "Reveal" button appears when luck > 5
└─ Click Reveal → Calls reveal_box instruction
            ↓
[Revealing...]
├─ Waiting for Switchboard callback
└─ Shows loading state
            ↓
[Revealed Box]
├─ Shows reward amount
├─ Shows luck used
├─ Jackpot indicator if applicable
└─ "Claim Reward" button
            ↓
[Claim Clicked]
└─ Calls settle_box instruction
            ↓
[Settled Box]
└─ Shows completed state with final reward
```

#### 4. User Dashboard (`/dashboard`)
- All user's boxes across all projects
- Filters by project, status
- Portfolio value
- Total rewards claimed

#### 5. Creator Dashboard (`/creator/[id]`)
**Project Management Interface**

Sections:
- Project stats (boxes created, revenue, etc.)
- Vault balance (available vs locked)
- Withdraw earnings form (calculates $3EYES fee)
- Project settings (update price, pause/activate)
- Box activity log

#### 6. Create Project Flow (`/creator/new`)

**Multi-step Form**:

Step 1: Project Details
- Project name
- Description
- Token selection (dropdown of wallet's tokens OR paste mint address)
- Box price (in token units)

Step 2: Review & Confirm
- Shows all details
- Explains 10,000 $3EYES fee
- Checks user has sufficient $3EYES

Step 3: Transaction
- Calls create_project instruction
- Shows transaction status
- Redirects to creator dashboard on success

#### 7. Admin Dashboard (`/admin`)
- Platform stats
- All projects list with controls
- Emergency deactivation buttons
- $3EYES collected tracking

---

### React Hooks

#### useProgram
```javascript
// hooks/useProgram.js
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { useMemo } from 'react';
import idl from '../lib/idl/lootbox_platform.json';

export function useProgram() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    const program = useMemo(() => {
        if (!wallet) return null;

        const provider = new AnchorProvider(connection, wallet, {
            commitment: 'confirmed'
        });

        return new Program(idl, provider);
    }, [connection, wallet]);

    return program;
}
```

#### useProject
```javascript
// hooks/useProject.js
import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useProgram } from './useProgram';

export function useProject(projectId) {
    const program = useProgram();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!program || !projectId) return;

        async function fetchProject() {
            try {
                const [projectPda] = PublicKey.findProgramAddressSync(
                    [
                        Buffer.from('project'),
                        new BN(projectId).toArrayLike(Buffer, 'le', 8)
                    ],
                    program.programId
                );

                const projectAccount = await program.account.projectConfig.fetch(projectPda);

                // Also fetch from API for cached metadata
                const apiData = await fetch(`/api/projects/${projectId}`).then(r => r.json());

                setProject({
                    ...projectAccount,
                    ...apiData.project
                });
            } catch (error) {
                console.error('Error fetching project:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchProject();
    }, [program, projectId]);

    return { project, loading };
}
```

#### useUserBoxes
```javascript
// hooks/useUserBoxes.js
import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from './useProgram';

export function useUserBoxes(projectId = null) {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const program = useProgram();
    const [boxes, setBoxes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!program || !publicKey) return;

        async function fetchBoxes() {
            try {
                // Fetch all BoxInstance accounts owned by user
                const accounts = await connection.getProgramAccounts(
                    program.programId,
                    {
                        filters: [
                            {
                                memcmp: {
                                    offset: 8 + 8 + 8, // Skip discriminator + box_id + project_id
                                    bytes: publicKey.toBase58()
                                }
                            },
                            {
                                dataSize: 8 + 111 // Discriminator + BoxInstance::LEN
                            }
                        ]
                    }
                );

                const parsedBoxes = accounts.map(acc => {
                    const data = program.coder.accounts.decode(
                        'BoxInstance',
                        acc.account.data
                    );
                    return {
                        pda: acc.pubkey.toString(),
                        ...data
                    };
                });

                // Filter by project if specified
                const filtered = projectId
                    ? parsedBoxes.filter(b => b.projectId.toNumber() === projectId)
                    : parsedBoxes;

                setBoxes(filtered);
            } catch (error) {
                console.error('Error fetching boxes:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchBoxes();

        // Poll every 10 seconds for updates
        const interval = setInterval(fetchBoxes, 10000);
        return () => clearInterval(interval);

    }, [program, publicKey, projectId]);

    return { boxes, loading };
}
```

---

### Transaction Helpers

#### Creating a Box
```javascript
// lib/transactions/createBox.js
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

export async function createBox(program, wallet, projectId) {
    const projectIdBN = new BN(projectId);

    // Derive PDAs
    const [projectPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('project'), projectIdBN.toArrayLike(Buffer, 'le', 8)],
        program.programId
    );

    const projectAccount = await program.account.projectConfig.fetch(projectPda);
    const nextBoxId = projectAccount.totalBoxesCreated.add(new BN(1));

    const [boxPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('box'),
            projectIdBN.toArrayLike(Buffer, 'le', 8),
            nextBoxId.toArrayLike(Buffer, 'le', 8)
        ],
        program.programId
    );

    // Get token accounts
    const buyerTokenAccount = await getAssociatedTokenAddress(
        projectAccount.paymentToken,
        wallet.publicKey
    );

    const [vaultAuthority] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('vault'),
            projectIdBN.toArrayLike(Buffer, 'le', 8),
            projectAccount.paymentToken.toBuffer()
        ],
        program.programId
    );

    const vaultTokenAccount = await getAssociatedTokenAddress(
        projectAccount.paymentToken,
        vaultAuthority,
        true
    );

    // Build and send transaction
    const tx = await program.methods
        .createBox(projectIdBN)
        .accounts({
            buyer: wallet.publicKey,
            projectConfig: projectPda,
            boxInstance: boxPda,
            buyerTokenAccount,
            vaultTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId
        })
        .rpc();

    return { signature: tx, boxPda: boxPda.toString() };
}
```

Similar helpers for:
- `revealBox()`
- `settleBox()`
- `createProject()`
- `withdrawEarnings()`

---

## Database Schema

### Supabase Tables

#### projects
```sql
CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT UNIQUE NOT NULL,
    owner_wallet TEXT NOT NULL,
    payment_token_mint TEXT NOT NULL,
    box_price BIGINT NOT NULL,
    vault_pda TEXT NOT NULL,
    vault_authority_pda TEXT NOT NULL,
    vault_token_account TEXT NOT NULL,

    -- Subdomain for dynamic routing
    subdomain TEXT UNIQUE NOT NULL,  -- e.g., "catbox", "dogbox"

    -- Cached on-chain data (updated periodically)
    total_boxes_created BIGINT DEFAULT 0,
    total_boxes_settled BIGINT DEFAULT 0,
    total_revenue BIGINT DEFAULT 0,
    total_paid_out BIGINT DEFAULT 0,
    vault_balance BIGINT DEFAULT 0,

    -- Project metadata
    name TEXT NOT NULL,              -- Display name: "Cat Box Gambling"
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    twitter_url TEXT,
    discord_url TEXT,

    -- Status
    active BOOLEAN DEFAULT true,     -- Can users buy boxes? (pause/resume)
    launch_fee_paid BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT projects_project_id_key UNIQUE (project_id),
    CONSTRAINT projects_subdomain_key UNIQUE (subdomain),
    CONSTRAINT subdomain_format CHECK (
        subdomain ~ '^[a-z0-9-]{3,63}$'  -- lowercase, alphanumeric, hyphens only, 3-63 chars
    )
);

CREATE INDEX idx_projects_owner ON projects(owner_wallet);
CREATE INDEX idx_projects_active ON projects(active);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_subdomain ON projects(subdomain);  -- For fast subdomain lookup
```

#### token_metadata_cache
```sql
CREATE TABLE token_metadata_cache (
    mint_address TEXT PRIMARY KEY,
    name TEXT,
    symbol TEXT,
    decimals INTEGER,
    logo_uri TEXT,
    fetched_at TIMESTAMP DEFAULT NOW()
);

-- Cache token metadata to avoid repeated RPC calls
```

#### user_profiles (optional, for future features)
```sql
CREATE TABLE user_profiles (
    wallet_address TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### platform_stats_cache
```sql
CREATE TABLE platform_stats_cache (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_projects INTEGER DEFAULT 0,
    active_projects INTEGER DEFAULT 0,
    total_boxes_created BIGINT DEFAULT 0,
    total_boxes_settled BIGINT DEFAULT 0,
    total_3eyes_collected BIGINT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),

    CONSTRAINT only_one_row CHECK (id = 1)
);

-- Single row table for cached platform-wide stats
```

#### super_admin_config
```sql
CREATE TABLE super_admin_config (
    id INTEGER PRIMARY KEY DEFAULT 1,

    -- Network Configuration (CRITICAL for devnet → mainnet transition)
    network TEXT NOT NULL DEFAULT 'devnet',     -- 'devnet' or 'mainnet-beta'
    rpc_url TEXT NOT NULL,                      -- Network-specific RPC endpoint
    lootbox_program_id TEXT NOT NULL,           -- SAME program ID on both networks

    -- Platform token configuration (network-specific)
    three_eyes_mint TEXT NOT NULL,              -- $3EYES token mint address
    platform_fee_account TEXT NOT NULL,         -- Where $3EYES fees are collected

    -- Fee configuration (adjustable by super admin)
    launch_fee_amount BIGINT NOT NULL,          -- Launch fee in $3EYES (smallest units)
    withdrawal_fee_percentage NUMERIC(5,2) NOT NULL,  -- e.g., 2.00 for 2%

    -- Super admin wallet (SAME on both networks)
    admin_wallet TEXT NOT NULL,                 -- C9t218MuHcsKPFMZQLvVdnPMRP5AYGRAYc8oLhshH3aF

    -- Platform settings
    min_box_price BIGINT DEFAULT 1000,          -- Minimum box price (prevents spam)
    max_projects_per_wallet INTEGER DEFAULT 10,  -- Limit projects per creator

    -- Deployment flags
    is_production BOOLEAN DEFAULT false,        -- Safety flag: true only when on mainnet
    mainnet_enabled BOOLEAN DEFAULT false,      -- Master kill switch for mainnet operations

    -- Timestamps
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by TEXT,                            -- Wallet that last updated

    CONSTRAINT only_one_row CHECK (id = 1),
    CONSTRAINT fee_percentage_range CHECK (withdrawal_fee_percentage >= 0 AND withdrawal_fee_percentage <= 100),
    CONSTRAINT network_values CHECK (network IN ('devnet', 'mainnet-beta')),
    CONSTRAINT production_safety CHECK (
        (network = 'mainnet-beta' AND is_production = true) OR
        (network = 'devnet' AND is_production = false)
    )
);

-- Single row table for platform configuration
-- Initialize with DEVNET configuration for testing
INSERT INTO super_admin_config (
    id,
    network,
    rpc_url,
    lootbox_program_id,
    three_eyes_mint,
    platform_fee_account,
    launch_fee_amount,
    withdrawal_fee_percentage,
    admin_wallet,
    is_production,
    mainnet_enabled
) VALUES (
    1,
    'devnet',                                                       -- Start on devnet
    'https://api.devnet.solana.com',                                -- Devnet RPC
    'PLACEHOLDER_PROGRAM_ID',                                       -- Deploy ONCE, use on both networks
    'DEVNET_TEST_3EYES_MINT',                                       -- Devnet test token
    'DEVNET_PLATFORM_ATA',                                          -- Devnet platform ATA
    100000000000,                                                   -- 100 test tokens (lower for testing)
    0.50,                                                           -- 0.5% withdrawal fee (lower for testing)
    'C9t218MuHcsKPFMZQLvVdnPMRP5AYGRAYc8oLhshH3aF',                -- Super admin wallet
    false,                                                          -- NOT production
    false                                                           -- Mainnet NOT enabled yet
);

-- Config change log for audit trail
CREATE TABLE super_admin_config_history (
    id BIGSERIAL PRIMARY KEY,
    changed_at TIMESTAMP DEFAULT NOW(),
    changed_by TEXT NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    reason TEXT
);
```

---

## Token Economics

### $3EYES Token

**Purpose**: Platform utility and governance token

**Launch Options**:
1. **pump.fun**: Community-driven launch, no presale
2. **Raydium**: Create pool with initial liquidity

**Recommended Approach**: pump.fun for community engagement

#### Tokenomics (Draft - To Be Finalized)

```
Total Supply: 1,000,000,000 (1 billion)

Distribution:
├─ 40% (400M) - Initial Liquidity Pool
├─ 20% (200M) - Platform Treasury (vested)
├─ 15% (150M) - Team (vested over 2 years)
├─ 10% (100M) - Community Rewards / Airdrops
├─ 10% (100M) - Marketing & Partnerships
└─  5% (50M)  - Early Supporters / Advisors
```

#### Token Utility

1. **Launch Fee**: Configurable (default: 10,000 $3EYES) - Set by super admin
2. **Withdrawal Fee**: Configurable % (default: 2%) - Set by super admin
3. **Future Utilities**:
   - Governance (DAO decisions on platform parameters)
   - Premium features (analytics, whitelabeling)
   - Staking for reduced fees
   - Liquidity mining incentives

#### Fee Mechanics

**Launch Fee**:
- Configurable flat amount per project (super admin controlled)
- Stored in `super_admin_config.launch_fee_amount`
- Default: 10,000 $3EYES (can be adjusted for testing or market conditions)
- Prevents spam projects
- Creates immediate utility demand

**Withdrawal Fee (Percentage-Based)**:
- Configurable percentage (super admin controlled)
- Stored in `super_admin_config.withdrawal_fee_percentage`
- Default: 2.00% (can be adjusted, e.g., 1.5%, 2.5%, etc.)
- More fair than flat fees (scales with withdrawal size)
- Calculation logic:
  ```
  Creator withdraws X tokens from vault

  Step 1: Calculate 2% equivalent in $3EYES
  - Get withdrawal value in project tokens
  - Convert to $3EYES using oracle price or fixed rate
  - Calculate: fee = (withdrawal_value * fee_percentage / 100) in $3EYES

  Step 2: Creator must have sufficient $3EYES
  - Check creator's $3EYES balance >= fee
  - If insufficient, transaction fails

  Step 3: Transfer fee, then transfer earnings
  - Transfer fee $3EYES: creator → platform
  - Transfer earnings: vault → creator

  Example with 100,000 DOGE withdrawal at 2% fee:
  - Assume: 1 DOGE = 0.0001 $3EYES (oracle or fixed rate)
  - Withdrawal value in $3EYES: 100,000 * 0.0001 = 10 $3EYES
  - Fee (2%): 10 * 0.02 = 0.2 $3EYES
  - Creator pays: 0.2 $3EYES
  - Creator receives: 100,000 DOGE
  ```

**Fee Allocation**:
- 100% → Add to $3EYES liquidity pool
- **No burns** - Focus on deepening liquidity for better price stability
- Alternative (if needed later): 80% liquidity, 20% treasury

---

## User Flows

### Flow 1: Creator Launches a Project

```
1. Creator visits /creator/new
   └─ Connects wallet

2. Fills out project form
   ├─ Project name: "Lucky Doge Boxes"
   ├─ Token: Selects DOGE token from wallet
   └─ Box price: 1000 DOGE

3. Reviews summary
   └─ Platform calculates launch fee: 10,000 $3EYES

4. Checks $3EYES balance
   ├─ If insufficient: Shows "Buy $3EYES" link
   └─ If sufficient: Proceeds

5. Clicks "Create Project"
   ├─ Frontend calls create_project instruction
   ├─ Transaction requires signature
   └─ User approves in wallet

6. Transaction processing
   ├─ On-chain program:
   │   ├─ Transfers 10,000 $3EYES to platform
   │   ├─ Creates ProjectConfig PDA
   │   ├─ Creates vault_authority PDA
   │   └─ Creates vault token account
   ├─ Transaction confirms
   └─ Event emitted: ProjectCreated

7. Backend listens for event
   ├─ Catches ProjectCreated event
   ├─ Stores project in database
   └─ Fetches token metadata

8. User redirected to /creator/[projectId]
   └─ Sees project dashboard
   └─ Gets shareable link: /project/[projectId]
```

---

### Flow 2: User Buys and Opens a Box

```
1. User visits /project/123
   └─ Sees "Lucky Doge Boxes" project

2. Reviews project details
   ├─ Box price: 1000 DOGE
   ├─ Current vault jackpot: 50,000 DOGE
   └─ Recent winners displayed

3. Connects wallet
   └─ Frontend checks DOGE balance

4. Clicks "Buy Box"
   ├─ Frontend calls createBox()
   ├─ Transaction requires signature
   └─ User approves

5. Transaction processing
   ├─ On-chain program:
   │   ├─ Transfers 1000 DOGE to vault
   │   ├─ Creates BoxInstance PDA
   │   └─ Sets luck = 5, created_at = now
   └─ Transaction confirms

6. Box appears in user's grid
   └─ Shows "Unopened" state
   └─ Displays current luck: 5

7. User waits (luck accumulates)
   ├─ Frontend polls box state every 10s
   ├─ Calculates luck: 5 + Math.floor(holdTime / 3_hours)
   └─ UI shows increasing luck score

8. After 6 hours, luck = 7
   └─ User decides to reveal

9. Clicks "Reveal Box"
   ├─ Frontend calls revealBox()
   ├─ User approves transaction
   └─ On-chain program:
       ├─ Requests Switchboard randomness
       ├─ Calculates reward based on luck + random
       ├─ Sets revealed = true
       └─ Stores reward_amount

10. Box updates to "Revealed" state
    ├─ Shows reward: 1,500 DOGE
    ├─ Shows luck used: 7
    └─ "Claim Reward" button appears

11. User clicks "Claim Reward"
    ├─ Frontend calls settleBox()
    ├─ User approves transaction
    └─ On-chain program:
        ├─ Transfers 1,500 DOGE from vault to user
        └─ Sets settled = true

12. Box shows "Settled" state
    └─ User's wallet received 1,500 DOGE
    └─ Net profit: +500 DOGE
```

---

### Flow 3: Creator Withdraws Earnings

```
1. Creator visits /creator/123
   └─ Sees project dashboard

2. Reviews financials
   ├─ Total revenue: 50,000 DOGE
   ├─ Total paid out: 45,000 DOGE
   ├─ Vault balance: 5,000 DOGE
   ├─ Locked (pending boxes): 500 DOGE
   └─ Available to withdraw: 4,500 DOGE

3. Enters withdrawal amount: 4,000 DOGE

4. Frontend calculates fee
   ├─ 2% of 4,000 DOGE
   ├─ At current rate: 0.0001 $3EYES per DOGE
   └─ Fee: 0.8 $3EYES

5. Frontend checks $3EYES balance
   └─ User has 100 $3EYES ✓

6. User clicks "Withdraw"
   ├─ Frontend calls withdrawEarnings()
   ├─ User approves transaction
   └─ On-chain program:
       ├─ Verifies caller is project owner
       ├─ Calculates available = vault_balance - locked
       ├─ Verifies 4,000 <= 4,500 ✓
       ├─ Transfers 0.8 $3EYES to platform
       └─ Transfers 4,000 DOGE to creator

7. Transaction confirms
   └─ Creator receives 4,000 DOGE
   └─ Vault balance now: 1,000 DOGE
   └─ Platform collected: 0.8 $3EYES
```

---

## Security Considerations

### Smart Contract Security

#### 1. PDA Validation
- Always verify PDA derivation with `seeds` and `bump` constraints
- Never trust user-provided PDAs without verification

```rust
#[account(
    seeds = [b"project", project_id.to_le_bytes().as_ref()],
    bump = project_config.bump
)]
pub project_config: Account<'ctx, ProjectConfig>,
```

#### 2. Ownership Checks
- Verify caller owns the resource before allowing operations
- Use `constraint` to enforce ownership

```rust
#[account(
    mut,
    constraint = box_instance.owner == owner.key() @ LootboxError::NotBoxOwner
)]
pub box_instance: Account<'ctx, BoxInstance>,
```

#### 3. Arithmetic Safety
- Use checked arithmetic operations (overflow-safe)
- Validate all calculations

```rust
let new_total = project_config.total_revenue
    .checked_add(box_price)
    .ok_or(LootboxError::ArithmeticOverflow)?;
```

#### 4. Reentrancy Protection
- Anchor's account system prevents reentrancy by design
- Always update state before external calls (CPI)

#### 5. Access Control
- Separate admin functions with authority checks
- Use `has_one` constraint for owner validation

```rust
#[account(
    mut,
    has_one = owner @ LootboxError::NotProjectOwner
)]
pub project_config: Account<'ctx, ProjectConfig>,
```

#### 6. Token Security
- Validate token mint addresses
- Check token account ownership
- Use ATA (Associated Token Account) for predictable addresses

#### 7. Withdrawal Safety
- Calculate locked funds for unrevealed boxes
- Prevent withdrawing more than available
- Atomic fee + withdrawal transaction

```rust
// Calculate locked amount for pending boxes
let locked = calculate_locked_for_pending_boxes(&project_config)?;
let available = vault_balance.checked_sub(locked)
    .ok_or(LootboxError::InsufficientVaultBalance)?;

require!(amount <= available, LootboxError::WithdrawalExceedsAvailable);
```

---

### Backend Security

#### 1. Rate Limiting
- Implement per-IP and per-wallet rate limits
- Prevent spam and DoS attacks

```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', apiLimiter);
```

#### 2. Input Validation
- Validate all user inputs (project IDs, wallet addresses, amounts)
- Sanitize strings to prevent injection

```javascript
const { body, validationResult } = require('express-validator');

router.post('/api/projects/create', [
    body('projectId').isInt({ min: 0 }),
    body('ownerWallet').custom(value => {
        try {
            new PublicKey(value);
            return true;
        } catch {
            throw new Error('Invalid wallet address');
        }
    }),
    // ... other validations
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    // ... proceed
});
```

#### 3. Authentication
- Wallet signature verification for all authenticated endpoints
- Short-lived JWT tokens (15 min) for admin sessions
- Timestamp validation (5 min window) to prevent replay attacks

#### 4. CORS Configuration
- Restrict origins in production

```javascript
const cors = require('cors');

const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://3eyes.io', 'https://www.3eyes.io']
        : '*',
    credentials: true
};

app.use(cors(corsOptions));
```

#### 5. Environment Variables
- Never expose private keys or secrets
- Use environment variables for all sensitive config
- Validate env vars on startup

#### 6. RPC Protection
- Use rate-limited RPC providers (Helius, QuickNode)
- Implement request caching
- Handle RPC errors gracefully

---

### Frontend Security

#### 1. Wallet Security
- Use official @solana/wallet-adapter
- Never request seed phrases or private keys
- Show transaction details before signing

#### 2. Transaction Simulation
- Simulate transactions before sending
- Show user exactly what will happen

```javascript
const simulation = await connection.simulateTransaction(transaction);
if (simulation.value.err) {
    throw new Error('Transaction simulation failed');
}
```

#### 3. Input Validation
- Validate amounts (positive, within bounds)
- Validate addresses client-side before sending to backend

#### 4. XSS Prevention
- React escapes strings by default
- Never use `dangerouslySetInnerHTML` with user content
- Sanitize markdown/rich text if used

#### 5. HTTPS Only
- Enforce HTTPS in production
- Redirect HTTP to HTTPS

---

## Deployment Strategy

### Phase 1: Development (Local)

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Configure .env with devnet settings
npm run dev

# Frontend
cd frontend
npm install
cp .env.local.example .env.local
# Configure .env.local
npm run dev

# Rust program
cd onchain
anchor build
anchor test
```

---

### Phase 2: Devnet Testing

1. **Deploy Program to Devnet**
```bash
anchor build
anchor deploy --provider.cluster devnet
# Note program ID
```

2. **Update Configuration**
- Add program ID to backend/frontend env vars
- Deploy $3EYES token to devnet (create test token)
- Create test projects

3. **End-to-End Testing**
- Test project creation flow
- Test box purchase/reveal/settle flow
- Test withdrawal with fees
- Stress test with multiple users

---

### Phase 3: Mainnet Staging

1. **Launch $3EYES Token**
- Deploy on pump.fun or create Raydium pool
- Provide initial liquidity
- Announce to community

2. **Deploy Program to Mainnet**
```bash
# Audit program first!
anchor build --verifiable
anchor deploy --provider.cluster mainnet
```

3. **Deploy Backend (Render)**
- Create new Render service
- Configure environment variables:
  ```
  SOLANA_NETWORK=mainnet-beta
  RPC_URL=<helius_mainnet_url>
  LOOTBOX_PLATFORM_PROGRAM_ID=<mainnet_program_id>
  THREE_EYES_MINT=<mainnet_3eyes_mint>
  SUPABASE_URL=<your_supabase>
  SUPABASE_KEY=<anon_key>
  ADMIN_WALLET=<admin_public_key>
  ```
- Deploy from GitHub main branch

4. **Deploy Frontend (Vercel)**
- Create Vercel project
- Configure environment variables:
  ```
  NEXT_PUBLIC_RPC_URL=<helius_mainnet_url>
  NEXT_PUBLIC_PROGRAM_ID=<mainnet_program_id>
  NEXT_PUBLIC_API_URL=<render_backend_url>
  ```
- Deploy from GitHub main branch
- Configure custom domain

5. **Database Setup (Supabase)**
- Create production project
- Run SQL migrations for all tables
- Configure Row Level Security (RLS) policies
- Enable realtime for projects table

---

### Phase 4: Launch

1. **Pilot Projects**
- Work with 2-3 trusted creators
- Help them launch first projects
- Gather feedback

2. **Public Launch**
- Announce on Twitter/Discord
- List $3EYES on CoinGecko/CMC
- Create documentation site
- Marketing campaign

3. **Monitoring**
- Set up error tracking (Sentry)
- Monitor RPC usage
- Track platform metrics
- Monitor $3EYES price/liquidity

---

## Migration from Current System

### Current FateBox v2 → New Platform

**Challenge**: Existing FateBox v2 uses candy machine + NFTs

**Options**:

#### Option A: Run in Parallel
- Keep FateBox v2 running as-is
- Launch new platform as separate entity
- No migration needed
- Users understand they're different systems

#### Option B: Migrate Existing Boxes
**Complex - Not Recommended**

Would require:
1. Snapshot all NFT holders
2. Airdrop equivalent BoxInstance PDAs
3. Maintain old candy machine data
4. Create migration UI

**Recommendation**: Option A (Parallel Systems)

**Reasoning**:
- Existing FateBox v2 already deployed and working
- Users already familiar with that system
- New platform is fundamentally different (no NFTs)
- Cleaner to start fresh
- Can sunset old system gradually

---

## Development Roadmap

### MVP (Minimum Viable Product) - 6-8 Weeks

**Week 1-2: Rust Program**
- [ ] Set up project structure
- [ ] Implement ProjectConfig and BoxInstance accounts
- [ ] Implement create_project instruction
- [ ] Implement create_box instruction
- [ ] Implement reveal_box with Switchboard integration
- [ ] Implement settle_box instruction
- [ ] Write comprehensive tests
- [ ] Security audit (internal)

**Week 3-4: Backend API**
- [ ] Set up Express server
- [ ] Database schema and Supabase setup
- [ ] Authentication middleware
- [ ] Project creation endpoint
- [ ] Project listing/detail endpoints
- [ ] Box status endpoints
- [ ] Stats endpoints
- [ ] Admin endpoints

**Week 5-6: Frontend**
- [ ] Next.js setup with wallet adapter
- [ ] Landing page
- [ ] Project listing page
- [ ] Project detail page (main box interface)
- [ ] Creator dashboard
- [ ] Create project flow
- [ ] User dashboard
- [ ] Admin panel

**Week 7: Integration & Testing**
- [ ] End-to-end testing on devnet
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] UI/UX polish

**Week 8: Launch Prep**
- [ ] Launch $3EYES token
- [ ] Deploy to mainnet
- [ ] Pilot projects onboarding
- [ ] Documentation
- [ ] Marketing materials

---

### Post-MVP Features

**Phase 2: Enhanced Features**
- [ ] Project customization (themes, branding)
- [ ] Advanced analytics dashboard
- [ ] Leaderboards (biggest winners, most boxes, etc.)
- [ ] Referral system (creators get bonus for referring other creators)
- [ ] Email/Discord notifications for box reveals

**Phase 3: Advanced Mechanics**
- [ ] Time-locked boxes (can't reveal before X time)
- [ ] Multiplier events (2x rewards during certain periods)
- [ ] Box bundles (buy 5, get 1 free)
- [ ] Honorary transformation mechanism
- [ ] Seasonal/limited boxes

**Phase 4: Platform Governance**
- [ ] DAO structure for $3EYES holders
- [ ] Vote on platform parameters (fees, limits)
- [ ] Community treasury management
- [ ] Grants program for innovative projects

---

## API Reference Summary

### Public Endpoints
```
GET    /api/projects                    # List all projects
GET    /api/projects/:id                # Get project details
GET    /api/boxes/user/:wallet          # Get user's boxes
POST   /api/boxes/batch-status          # Batch check box status
GET    /api/stats/platform               # Platform stats (public)
GET    /api/stats/project/:id            # Project stats
```

### Authenticated Endpoints (Wallet Signature)
```
POST   /api/projects/create              # Create project record
POST   /api/creator/withdraw             # Initiate withdrawal
PUT    /api/projects/:id/update          # Update project settings
```

### Admin Endpoints (JWT)
```
POST   /api/admin/authenticate           # Admin login
GET    /api/admin/stats/platform         # Detailed platform stats
POST   /api/admin/projects/:id/deactivate # Emergency deactivate
```

---

## Testing Strategy

### Unit Tests (Rust)
```bash
anchor test
```

Test coverage:
- All instruction handlers
- PDA derivation
- Arithmetic operations
- Error conditions
- Edge cases (max luck, zero balance, etc.)

### Integration Tests (TypeScript)
```bash
cd tests && npm test
```

Test scenarios:
- Full project lifecycle
- Full box lifecycle
- Multiple users interacting
- Withdrawal with fees
- Error handling

### End-to-End Tests (Playwright)
```bash
cd frontend && npx playwright test
```

Test flows:
- Create project flow
- Buy and reveal box flow
- Withdrawal flow
- Admin dashboard

---

## Monitoring & Observability

### Metrics to Track

**On-Chain**:
- Total projects created
- Total boxes created/revealed/settled
- Total value locked in vaults
- $3EYES fees collected

**Backend**:
- API response times
- Error rates
- RPC call volumes
- Cache hit rates

**Frontend**:
- Page load times
- Transaction success rates
- Wallet connection rates
- User drop-off points

### Tools
- **Sentry**: Error tracking
- **Vercel Analytics**: Frontend performance
- **Render Metrics**: Backend performance
- **Supabase Dashboard**: Database metrics

---

## Cost Analysis

### User Costs

**Creating a Box**:
- Transaction fee: ~0.000005 SOL (~$0.0005)
- Box price: Variable (set by project, e.g., 1000 DOGE)
- **Total**: Box price + negligible SOL

**Revealing a Box**:
- Transaction fee: ~0.000005 SOL (~$0.0005)
- Switchboard VRF: ~0.00001 SOL (~$0.001)
- **Total**: ~$0.0015 SOL

**Claiming Reward**:
- Transaction fee: ~0.000005 SOL (~$0.0005)
- **Total**: ~$0.0005 SOL

**Comparison to NFT Approach**:
- Old way (with NFT mint): ~0.01 SOL + Metaplex fees = ~$1
- New way (PDA): ~$0.002
- **Savings**: ~99.8%

### Creator Costs

**Launching a Project**:
- Launch fee: 10,000 $3EYES (variable, e.g., $100)
- Transaction fee: ~0.000005 SOL (~$0.0005)
- PDA rent: ~0.003 SOL (~$0.30)
- Vault ATA rent: ~0.002 SOL (~$0.20)
- **Total**: ~$100.50 (mostly $3EYES)

**Withdrawing Earnings**:
- Withdrawal fee: 2% in $3EYES (variable)
- Transaction fee: ~0.000005 SOL (~$0.0005)
- **Total**: 2% + negligible SOL

---

## FAQ for Developers

### Q: Why Anchor instead of native Rust?
**A**: Anchor provides safety guarantees, reduces boilerplate, and has excellent TypeScript integration. The overhead is minimal and the security benefits are substantial.

### Q: Why Supabase instead of [other database]?
**A**: Supabase offers PostgreSQL (robust, reliable), realtime subscriptions (great for live updates), built-in auth (if needed later), and generous free tier. Easy to migrate if needed.

### Q: How does the luck system work exactly?
**A**:
```
base_luck = 5
hold_time_in_hours = (current_time - created_at) / 3600
bonus_luck = floor(hold_time_in_hours / 3)  # +1 every 3 hours
current_luck = min(base_luck + bonus_luck, 60)  # cap at 60
```

### Q: How is randomness secured?
**A**: Using Switchboard VRF (Verifiable Random Function) which provides cryptographically secure randomness that can be verified on-chain. Alternative: Orao VRF.

### Q: Can creators rug pull?
**A**: No. Funds are held in PDAs controlled by the program. Creators can only withdraw available balance (vault - locked). The program enforces all rules.

### Q: What prevents creators from setting box_price = 0?
**A**: The program has a constraint: `require!(box_price > 0, LootboxError::InvalidBoxPrice)`. Could also add minimum (e.g., > 1000 units).

### Q: How do we prevent spam projects?
**A**: 10,000 $3EYES launch fee creates economic barrier. Could add reputation system post-MVP.

### Q: What if Switchboard is down?
**A**: Boxes remain in "unrevealed" state. Users can retry reveal later. Consider adding fallback VRF provider (Orao) in v2.

### Q: How do we handle token price volatility for withdrawal fees?
**A**:
- **MVP**: Use fixed exchange rate (e.g., 1 token = 0.0001 $3EYES)
- **v2**: Integrate Jupiter price oracle for dynamic pricing

### Q: Can boxes be transferred/traded?
**A**: Not in MVP. Could add `transfer_box` instruction in v2 that changes owner field. Would enable secondary market.

### Q: What's the max number of boxes per project?
**A**: Limited by u64 (18.4 quintillion). Practically unlimited.

### Q: How do we handle failed transactions?
**A**:
- Frontend: Retry logic with exponential backoff
- Backend: Log failures, allow manual intervention
- Users: Clear error messages, support contact

---

## Next Steps

### Immediate Actions

1. **Decision: Finalize $3EYES Tokenomics**
   - Total supply
   - Distribution
   - Launch method (pump.fun vs Raydium)

2. **Decision: Project Naming**
   - Current: "3Eyes Platform" / "Lootbox Platform"
   - Need final branding

3. **Security: Code Audit**
   - Budget for professional audit (~$10-20k)
   - Or: Internal review + bug bounty

4. **Legal: Terms of Service**
   - Gambling laws vary by jurisdiction
   - Need legal review for platform ToS
   - Creator agreement template

5. **Infrastructure: Set Up Services**
   - Supabase account
   - Render account
   - Vercel account
   - Helius RPC (or QuickNode)

---

## Conclusion

This specification outlines a complete migration from the NFT-based FateBox v2 system to a modern, efficient, PDA-based multi-tenant lootbox platform. The new architecture:

✅ **Removes NFT complexity** - Pure on-chain game state
✅ **Enables multi-tenancy** - Unlimited projects on one platform
✅ **Reduces costs by 99%** - No Metaplex fees
✅ **Improves UX** - Instant box creation, no wallet clutter
✅ **Creates revenue** - Launch fees + withdrawal fees in $3EYES
✅ **Maintains security** - Vault escrow, verifiable randomness
✅ **Scales efficiently** - Database-driven config, dynamic routing

**Development Estimate**: 6-8 weeks for MVP with a team of:
- 1 Rust/Solana developer
- 1 Backend developer (Node.js)
- 1 Frontend developer (React/Next.js)
- 1 UI/UX designer

**Budget Estimate** (excluding team costs):
- Security audit: $10,000 - $20,000
- RPC provider (Helius): $100/month
- Supabase: Free → $25/month
- Render: $7/month (basic)
- Vercel: Free (hobby) → $20/month (pro)
- Domain: $20/year
- **Total Year 1**: ~$15,000 - $25,000

---

## Super Admin Configuration

### Overview

The super admin (wallet: `C9t218MuHcsKPFMZQLvVdnPMRP5AYGRAYc8oLhshH3aF`) has a dedicated dashboard for platform-wide configuration. Unlike regular project creators, the super admin can modify core platform parameters.

### Super Admin Dashboard Features

#### 1. Platform Token Configuration

**Manage $3EYES Token Settings:**
- Set/update $3EYES mint address
- Set/update platform fee collection account (ATA)
- View total $3EYES collected
- View liquidity pool status

**Initial Setup:**
- After deploying $3EYES token, super admin updates `three_eyes_mint` in database
- Creates/sets platform's $3EYES ATA for fee collection
- These values are then used by backend and Rust program

---

#### 2. Fee Configuration

**Launch Fee:**
- Current value displayed (e.g., "10,000 $3EYES")
- Input field to update amount
- Confirmation required
- Logged in `super_admin_config_history`

**Withdrawal Fee Percentage:**
- Current value displayed (e.g., "2.00%")
- Slider or input field (0.00% - 10.00%)
- Confirmation required
- Logged in `super_admin_config_history`

**Use Cases:**
- Start with test token and lower fees during beta (e.g., 100 $3EYES, 0.5%)
- Increase fees after launch based on market conditions
- Run promotions (temporarily reduce fees)

---

#### 3. Platform Limits

**Minimum Box Price:**
- Prevents spam projects with 1-token boxes
- Default: 1,000 (smallest units)
- Adjustable per market

**Max Projects Per Wallet:**
- Prevents single user from creating unlimited projects
- Default: 10
- Can be increased for verified creators

---

#### 4. Super Admin API Endpoints

All require admin wallet authentication (signature verification).

##### POST /api/super-admin/authenticate
Authenticate super admin wallet

**Request:**
```javascript
{
  "wallet": "C9t218MuHcsKPFMZQLvVdnPMRP5AYGRAYc8oLhshH3aF",
  "message": "Super admin auth 1704628800123",
  "signature": "..."
}
```

**Response:**
```javascript
{
  "success": true,
  "token": "JWT_TOKEN",
  "config": {
    "three_eyes_mint": "...",
    "platform_fee_account": "...",
    "launch_fee_amount": "10000000000000",
    "withdrawal_fee_percentage": "2.00",
    "min_box_price": "1000",
    "max_projects_per_wallet": 10
  }
}
```

---

##### GET /api/super-admin/config
Get current configuration

**Response:**
```javascript
{
  "success": true,
  "config": {
    "three_eyes_mint": "ABC...xyz",
    "platform_fee_account": "DEF...123",
    "launch_fee_amount": "10000000000000",
    "withdrawal_fee_percentage": "2.00",
    "min_box_price": "1000",
    "max_projects_per_wallet": 10,
    "updated_at": "2026-01-07T12:00:00Z",
    "updated_by": "C9t218Mu..."
  }
}
```

---

##### PUT /api/super-admin/config/launch-fee
Update launch fee

**Request:**
```javascript
{
  "launch_fee_amount": "20000000000000",  // 20,000 $3EYES
  "reason": "Increased to reduce spam projects"
}
```

**Logic:**
1. Verify admin wallet signature
2. Validate amount (must be > 0)
3. Log change to `super_admin_config_history`
4. Update `super_admin_config` table
5. Return success

---

##### PUT /api/super-admin/config/withdrawal-fee
Update withdrawal fee percentage

**Request:**
```javascript
{
  "withdrawal_fee_percentage": 1.50,  // 1.5%
  "reason": "Promotional reduction for first month"
}
```

**Constraints:**
- Must be between 0.00 and 10.00
- Logged to history

---

##### PUT /api/super-admin/config/token-settings
Update $3EYES token configuration

**Request:**
```javascript
{
  "three_eyes_mint": "NEW_MINT_ADDRESS",
  "platform_fee_account": "NEW_ATA_ADDRESS",
  "reason": "Switched from test token to mainnet token"
}
```

**Critical Operation:**
- Requires extra confirmation
- Affects all future transactions
- Cannot be changed frequently (add cooldown period?)

---

##### PUT /api/super-admin/config/limits
Update platform limits

**Request:**
```javascript
{
  "min_box_price": 5000,
  "max_projects_per_wallet": 20,
  "reason": "Adjusted based on market feedback"
}
```

---

##### GET /api/super-admin/config/history
Get configuration change history

**Query Params:**
- `limit`: Number of records (default: 50)
- `offset`: Pagination offset

**Response:**
```javascript
{
  "success": true,
  "history": [
    {
      "id": 123,
      "changed_at": "2026-01-07T12:00:00Z",
      "changed_by": "C9t218Mu...",
      "field_name": "launch_fee_amount",
      "old_value": "10000000000000",
      "new_value": "20000000000000",
      "reason": "Increased to reduce spam projects"
    },
    // ... more entries
  ]
}
```

---

##### GET /api/super-admin/stats/detailed
Get comprehensive platform statistics

**Response:**
```javascript
{
  "success": true,
  "stats": {
    "platform": {
      "total_projects": 42,
      "active_projects": 38,
      "paused_projects": 4,
      "total_boxes_created": 15234,
      "total_boxes_settled": 12890,
      "pending_boxes": 2344
    },
    "financials": {
      "total_launch_fees_collected": "420000000000000",  // $3EYES
      "total_withdrawal_fees_collected": "8500000000000",  // $3EYES
      "total_3eyes_collected": "428500000000000",
      "estimated_liquidity_added": "428500000000000"
    },
    "top_projects": [
      {
        "project_id": 5,
        "name": "Lucky Cat Boxes",
        "subdomain": "luckycat",
        "total_boxes": 5234,
        "total_revenue": "52340000000000",
        "owner_wallet": "ABC...xyz"
      },
      // ... top 10
    ],
    "recent_activity": [
      {
        "timestamp": "2026-01-07T12:00:00Z",
        "event_type": "project_created",
        "project_id": 43,
        "details": "New project launched: Doge Gambler"
      },
      // ... recent 20 events
    ]
  }
}
```

---

##### POST /api/super-admin/projects/:projectId/force-pause
Emergency project pause (admin override)

**Request:**
```javascript
{
  "reason": "Suspicious activity detected"
}
```

**Use Case:**
- Project showing signs of rug pull
- Excessive losses (potential exploit)
- User reports of issues

**Effect:**
- Sets project.active = false
- Users cannot buy new boxes
- Existing boxes can still be revealed/settled
- Notifies project owner

---

### Super Admin Frontend (`/super-admin`)

**URL**: `https://3eyes.fun/super-admin` or `https://admin.3eyes.fun`

**Authentication:**
- Must connect with exact wallet: `C9t218MuHcsKPFMZQLvVdnPMRP5AYGRAYc8oLhshH3aF`
- Sign authentication message
- JWT token for session

**Dashboard Sections:**

1. **Overview**
   - Total projects, boxes, fees collected
   - Recent configuration changes
   - Quick stats cards

2. **Token Configuration**
   - Current $3EYES mint
   - Platform fee account
   - Update buttons

3. **Fee Management**
   - Launch fee slider/input
   - Withdrawal fee % slider/input
   - Historical changes chart

4. **Platform Limits**
   - Min box price input
   - Max projects per wallet input

5. **Projects Management**
   - Searchable table of all projects
   - Status indicators (active/paused)
   - Emergency pause buttons
   - View project details

6. **Analytics**
   - Charts: Projects over time, Boxes over time, Fees collected
   - Top performing projects
   - Geographic distribution (if available)

7. **Configuration History**
   - Audit log of all changes
   - Filterable by field, date, user

---

### Security Considerations for Super Admin

**Wallet Security:**
- Super admin wallet should be a hardware wallet (Ledger/Trezor)
- Never share private key
- Consider multi-sig in future (requires Squads Protocol)

**Access Control:**
- Only this exact wallet can access super admin functions
- Backend verifies signature on every request
- JWT tokens expire after 30 minutes (shorter than regular users)

**Change Logging:**
- All configuration changes logged with:
  - Timestamp
  - Wallet address
  - Old value
  - New value
  - Reason (required field)

**Rate Limiting:**
- Super admin endpoints: 100 requests/15 min
- Prevents brute force if wallet compromised

**Critical Operation Confirmations:**
- Changing $3EYES mint: Requires confirmation dialog
- Large fee changes (>50%): Requires confirmation
- Force pausing projects: Requires reason

---

### Initial Setup Checklist

When deploying the platform, super admin must:

1. ✅ Deploy $3EYES token (pump.fun or Raydium)
2. ✅ Update `super_admin_config.three_eyes_mint` in database
3. ✅ Create platform's $3EYES ATA
4. ✅ Update `super_admin_config.platform_fee_account` in database
5. ✅ Verify backend can read from `super_admin_config` table
6. ✅ Set initial launch fee (consider lower for testing)
7. ✅ Set initial withdrawal fee % (consider lower for testing)
8. ✅ Test project creation flow end-to-end
9. ✅ Test withdrawal fee calculation
10. ✅ Monitor first few projects closely

---

### Devnet → Mainnet Transition Strategy

**Critical Requirement**: The Rust program must be deployed ONLY ONCE to mainnet due to high deployment costs (~5-10 SOL).

#### Key Design Principle: Network-Agnostic Program

The Rust program does NOT contain any hardcoded network-specific values:
- ❌ No hardcoded token mints
- ❌ No hardcoded RPC endpoints
- ❌ No hardcoded wallet addresses (except in constraints that check signer)
- ✅ All network-specific config stored in database
- ✅ Backend reads config and passes to program via instruction accounts

#### Deployment Process

**Phase 1: Devnet Testing (0 cost)**

1. Deploy Rust program to devnet
   ```bash
   anchor build
   anchor deploy --provider.cluster devnet
   # Note the program ID
   ```

2. Initialize database with devnet config:
   ```sql
   UPDATE super_admin_config SET
       network = 'devnet',
       rpc_url = 'https://api.devnet.solana.com',
       lootbox_program_id = 'DEVNET_PROGRAM_ID_HERE',
       three_eyes_mint = 'DEVNET_TEST_TOKEN_MINT',
       platform_fee_account = 'DEVNET_PLATFORM_ATA',
       launch_fee_amount = 100000000000,  -- 100 tokens
       withdrawal_fee_percentage = 0.50,   -- 0.5%
       is_production = false,
       mainnet_enabled = false;
   ```

3. Backend automatically reads config and uses devnet
4. Test thoroughly with 2-3 pilot projects
5. Verify all flows work end-to-end

**Phase 2: Mainnet Deployment (ONE-TIME, ~5-10 SOL cost)**

1. Build program in verifiable mode (SAME code as devnet):
   ```bash
   anchor build --verifiable
   # CRITICAL: Do NOT change ANY code
   ```

2. Deploy to mainnet (ONE TIME ONLY):
   ```bash
   anchor deploy --provider.cluster mainnet-beta
   # This costs ~5-10 SOL
   # Note the program ID - should be SAME as devnet if using same keypair
   ```

3. Create real $3EYES token on mainnet:
   - Option A: Deploy via pump.fun
   - Option B: Create token + Raydium pool
   - Note the mint address

4. Create platform's $3EYES ATA on mainnet

**Phase 3: Network Switch (Database Update Only, 0 cost)**

**CRITICAL**: This is just a database update, NO Rust redeployment needed

1. Super admin updates config via dashboard:
   ```sql
   UPDATE super_admin_config SET
       network = 'mainnet-beta',
       rpc_url = 'https://mainnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6',
       lootbox_program_id = 'MAINNET_PROGRAM_ID_HERE',  -- From step 2
       three_eyes_mint = 'MAINNET_3EYES_MINT',           -- From step 3
       platform_fee_account = 'MAINNET_PLATFORM_ATA',    -- From step 4
       launch_fee_amount = 10000000000000,               -- 10,000 tokens
       withdrawal_fee_percentage = 2.00,                 -- 2%
       is_production = true,
       mainnet_enabled = true;
   ```

2. Backend automatically:
   - Reads new config
   - Connects to Helius mainnet RPC
   - Uses mainnet program ID
   - Uses mainnet $3EYES token
   - All instructions work with mainnet accounts

3. Frontend automatically:
   - Wallet adapter uses mainnet
   - Transactions sent to mainnet
   - Users see mainnet tokens

**NO CODE CHANGES. NO REDEPLOYMENT. Just database update.**

---

#### Backend Implementation

```javascript
// lib/getNetworkConfig.js
const { createClient } = require('@supabase/supabase-js');

async function getNetworkConfig() {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );

    const { data, error } = await supabase
        .from('super_admin_config')
        .select('*')
        .single();

    if (error) throw new Error('Failed to load network config');

    return {
        network: data.network,
        rpcUrl: data.rpc_url,
        programId: new PublicKey(data.lootbox_program_id),
        threeEyesMint: new PublicKey(data.three_eyes_mint),
        platformFeeAccount: new PublicKey(data.platform_fee_account),
        launchFee: BigInt(data.launch_fee_amount),
        withdrawalFeePercentage: parseFloat(data.withdrawal_fee_percentage),
        isProduction: data.is_production,
        mainnetEnabled: data.mainnet_enabled
    };
}

// Use in all backend routes
const config = await getNetworkConfig();
const connection = new Connection(config.rpcUrl, 'confirmed');
const program = new Program(idl, config.programId, provider);
```

---

#### Frontend Environment Variables

**Development (Devnet)**:
```bash
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Production (Backend determines network)**:
```bash
NEXT_PUBLIC_API_URL=https://api.3eyes.fun

# NO HARDCODED NETWORK!
# Backend returns network config via API:
# GET /api/config/network
```

**Frontend fetches network config from backend**:
```javascript
// lib/getNetworkConfig.js
export async function getNetworkConfig() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/config/network`);
    const config = await res.json();

    return {
        network: config.network,  // 'devnet' or 'mainnet-beta'
        programId: new PublicKey(config.programId),
        threeEyesMint: new PublicKey(config.threeEyesMint),
        // ... etc
    };
}

// Use in wallet adapter
const config = await getNetworkConfig();
const endpoint = useMemo(
    () => config.network === 'mainnet-beta'
        ? 'https://mainnet.helius-rpc.com/...'
        : 'https://api.devnet.solana.com',
    [config]
);
```

---

#### Super Admin Dashboard: Network Switch UI

**Location**: `/super-admin/network`

**UI Components**:

1. **Current Network Status**
   ```
   Current Network: Devnet
   RPC Endpoint: https://api.devnet.solana.com
   Program ID: ABC123...xyz
   $3EYES Mint: DEF456...789
   Environment: Testing
   Production Mode: Disabled
   ```

2. **Network Switch Form** (visible only when `network = 'devnet'`)
   ```
   ⚠️ SWITCHING TO MAINNET

   This is a ONE-WAY operation. Once switched to mainnet, you cannot switch back to devnet.

   Before proceeding, ensure:
   ☐ Rust program deployed to mainnet (ID: ____________)
   ☐ $3EYES token deployed on mainnet (Mint: ____________)
   ☐ Platform ATA created (Address: ____________)
   ☐ All devnet testing completed successfully
   ☐ Ready for public launch

   Mainnet Configuration:
   - RPC URL: [https://mainnet.helius-rpc.com/...]
   - Program ID: [____________]
   - $3EYES Mint: [____________]
   - Platform ATA: [____________]
   - Launch Fee: [10000] $3EYES
   - Withdrawal Fee: [2.00]%

   Type "SWITCH TO MAINNET" to confirm: [____________]

   [Cancel] [Switch to Mainnet]
   ```

3. **Confirmation Dialog**
   ```
   ⚠️ FINAL CONFIRMATION

   You are about to switch the platform from DEVNET to MAINNET.

   This will:
   - Change all backend connections to mainnet
   - Start using real $3EYES tokens
   - Enable production mode
   - Affect ALL users immediately

   All devnet data will remain in the database but will no longer be accessible.

   Are you absolutely sure?

   [No, Cancel] [Yes, Switch to Mainnet]
   ```

4. **Post-Switch Status** (after switch)
   ```
   ✅ Platform is now on MAINNET

   Current Network: Mainnet-Beta
   RPC Endpoint: https://mainnet.helius-rpc.com/...
   Program ID: ABC123...xyz (verified on Solscan)
   $3EYES Mint: XYZ789...abc (verified on Solscan)
   Environment: Production

   Switched at: 2026-01-15 14:32:00 UTC
   Switched by: C9t218Mu...H3aF

   Next steps:
   - Monitor first project creations closely
   - Verify transactions on Solscan
   - Check $3EYES token transfers
   ```

---

#### API Endpoint: Network Configuration

```javascript
// routes/config.js
router.get('/network', async (req, res) => {
    try {
        const config = await getNetworkConfig();

        return res.json({
            success: true,
            network: config.network,
            programId: config.programId.toString(),
            threeEyesMint: config.threeEyesMint.toString(),
            isProduction: config.isProduction,
            launchFee: config.launchFee.toString(),
            withdrawalFeePercentage: config.withdrawalFeePercentage
            // Don't expose RPC URL or private keys
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Failed to load network config'
        });
    }
});
```

---

#### Safety Mechanisms

1. **Database Constraint**: Cannot set `network = 'mainnet-beta'` unless `is_production = true`

2. **Master Kill Switch**: `mainnet_enabled` must be true for mainnet operations
   - If false, backend rejects all transactions even if network is set to mainnet
   - Allows emergency pause if something goes wrong

3. **Audit Log**: Every network config change logged to `super_admin_config_history`

4. **One-Way Switch**: Once `is_production = true`, it cannot be set back to false
   ```sql
   -- Add trigger to prevent reverting to devnet
   CREATE OR REPLACE FUNCTION prevent_production_downgrade()
   RETURNS TRIGGER AS $$
   BEGIN
       IF OLD.is_production = true AND NEW.is_production = false THEN
           RAISE EXCEPTION 'Cannot downgrade from production to non-production';
       END IF;
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER no_production_downgrade
       BEFORE UPDATE ON super_admin_config
       FOR EACH ROW
       EXECUTE FUNCTION prevent_production_downgrade();
   ```

5. **Environment Mismatch Detection**:
   ```javascript
   // In backend startup
   const config = await getNetworkConfig();
   if (config.network === 'mainnet-beta' && process.env.NODE_ENV !== 'production') {
       console.error('⚠️ WARNING: Network is mainnet but NODE_ENV is not production!');
       process.exit(1);  // Fail fast
   }
   ```

---

#### Cost Breakdown

**Devnet Testing**: $0 (free devnet SOL from faucet)

**One-Time Mainnet Deployment**:
- Deploy Rust program: ~5-10 SOL (~$500-1000)
- Create $3EYES token: ~0.01 SOL (~$1)
- Create platform ATA: ~0.002 SOL (~$0.20)
- **Total**: ~$501-1001 (ONE TIME)

**Network Switch**: $0 (database update only)

**Ongoing Costs**: Just RPC + hosting (covered in deployment section)

---

#### Testing Checklist Before Mainnet Switch

**Devnet Testing**:
- [ ] Create test project successfully
- [ ] Buy box with test token
- [ ] Reveal box (Switchboard VRF works)
- [ ] Settle box (vault withdrawal works)
- [ ] Creator withdraws earnings (fee calculation correct)
- [ ] Pause/resume project
- [ ] Test with 2-3 different pilot projects
- [ ] Verify all PDAs derive correctly
- [ ] Check vault balances match expected
- [ ] Test super admin fee adjustments
- [ ] Verify subdomain routing works

**Mainnet Preparation**:
- [ ] Rust program deployed to mainnet (verified build)
- [ ] Program ID confirmed on Solscan
- [ ] $3EYES token deployed and verified
- [ ] Liquidity added to $3EYES (if using Raydium)
- [ ] Platform ATA created and funded (small amount for testing)
- [ ] Helius RPC account active and working
- [ ] Database backup taken
- [ ] Monitoring/alerting set up

**Post-Switch Validation**:
- [ ] Backend connects to mainnet RPC
- [ ] Program ID matches deployed program
- [ ] $3EYES mint address correct
- [ ] Create test project on mainnet with real tokens
- [ ] Verify transaction on Solscan
- [ ] Monitor first few projects closely

---

## Contact & Questions

For questions about this specification or the platform:
- **Technical**: [Add contact method]
- **Business**: [Add contact method]
- **Security**: [Add contact method]

---

**Document Version**: 2.1
**Last Updated**: 2026-01-07 (Added devnet → mainnet transition strategy)
**Author**: 3eyes
**Admin Wallet**: C9t218MuHcsKPFMZQLvVdnPMRP5AYGRAYc8oLhshH3aF
**Helius RPC**: https://mainnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6
**Status**: Draft - Pending Review
**Language**: Pure JavaScript (NO TypeScript)
**Network Strategy**: Network-agnostic Rust program, database-driven network config, one-time mainnet deployment
