# 3Eyes FateBox v3 - Architecture Documentation

**Last Updated:** January 13, 2026 (Updated: Treasury Withdrawal & Logging)
**Purpose:** Complete technical architecture reference for AI handoff and development continuity

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Directory Structure](#directory-structure)
3. [Technology Stack](#technology-stack)
4. [On-Chain Program (Rust/Anchor)](#on-chain-program-rustanchor)
5. [Backend API (Node.js/Express)](#backend-api-nodejsexpress)
6. [Frontend (Next.js/React)](#frontend-nextjsreact)
7. [Database (Supabase/PostgreSQL)](#database-supabasepostgresql)
8. [External Services](#external-services)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [State Management](#state-management)
11. [Authentication & Authorization](#authentication--authorization)
12. [Error Handling Patterns](#error-handling-patterns)
13. [Testing Strategy](#testing-strategy)
14. [Deployment Architecture](#deployment-architecture)

---

## System Overview

3Eyes FateBox is a multi-tenant lootbox gambling platform on Solana. The system consists of four main components:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER'S BROWSER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FRONTEND (Next.js 16 + React 19)                  │   │
│  │  • Wallet connection (Solflare/Phantom via @solana/wallet-adapter)  │   │
│  │  • Project discovery, box purchase, reveal, claim                    │   │
│  │  • Admin dashboard for platform configuration                        │   │
│  │  • Creator dashboard for project management                          │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │ REST API (JSON)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Express.js on Node 20)                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Routes:                                                             │   │
│  │  • /api/projects - Project CRUD, box queries                        │   │
│  │  • /api/program - Transaction building (Anchor SDK)                 │   │
│  │  • /api/vault - Vault balance, withdrawal operations                │   │
│  │  • /api/admin - Platform config sync, treasury management          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Libraries:                                                          │   │
│  │  • anchorClient.js - Anchor program connection                      │   │
│  │  • pdaHelpers.js - PDA derivation utilities                         │   │
│  │  • switchboard.js - VRF randomness helpers                          │   │
│  │  • getNetworkConfig.js - Network configuration                      │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌──────────────────────────────────┐  ┌────────────────────────────────────────┐
│      SUPABASE (PostgreSQL)       │  │           SOLANA BLOCKCHAIN            │
│  ┌────────────────────────────┐  │  │  ┌──────────────────────────────────┐  │
│  │ Tables:                    │  │  │  │  3Eyes Lootbox Program (Anchor)  │  │
│  │ • super_admin_config       │  │  │  │  Program ID:                     │  │
│  │ • projects                 │  │  │  │  GTpP39xwT47iTUwbC5HZ7TjCiNon... │  │
│  │ • boxes                    │  │  │  │                                  │  │
│  │ • withdrawal_history       │  │  │  │  PDAs:                           │  │
│  │ • reserved_subdomains      │  │  │  │  • PlatformConfig (singleton)    │  │
│  └────────────────────────────┘  │  │  │  • Treasury (singleton)          │  │
│                                  │  │  │  • ProjectConfig (per project)   │  │
│  Real-time subscriptions for     │  │  │  • VaultAuthority (per project)  │  │
│  live UI updates                 │  │  │  • BoxInstance (per box)         │  │
└──────────────────────────────────┘  │  └──────────────────────────────────┘  │
                                      │                                        │
                                      │  ┌──────────────────────────────────┐  │
                                      │  │  Switchboard VRF (On-Demand)     │  │
                                      │  │  • Randomness accounts           │  │
                                      │  │  • Oracle-signed values          │  │
                                      │  └──────────────────────────────────┘  │
                                      └────────────────────────────────────────┘
```

---

## Directory Structure

```
3eyes-fatebox-v3/
├── backend/
│   ├── program/                    # Anchor/Rust on-chain program
│   │   ├── programs/
│   │   │   └── lootbox_platform/
│   │   │       ├── src/
│   │   │       │   └── lib.rs     # Main program logic (~1500 lines)
│   │   │       └── Cargo.toml     # Rust dependencies
│   │   ├── Anchor.toml            # Anchor configuration
│   │   └── target/                # Build artifacts
│   │
│   ├── routes/                    # Express route handlers
│   │   ├── program.js             # Transaction building (~2400 lines)
│   │   ├── projects.js            # Project CRUD
│   │   ├── vault.js               # Vault operations (~1200 lines)
│   │   └── admin.js               # Admin endpoints
│   │
│   ├── lib/                       # Shared utilities
│   │   ├── anchorClient.js        # Anchor program connection
│   │   ├── pdaHelpers.js          # PDA derivation
│   │   ├── switchboard.js         # VRF integration (~400 lines)
│   │   ├── getNetworkConfig.js    # Network config from Supabase
│   │   └── priceOracle.js         # Jupiter price API (deprecated for fees)
│   │
│   ├── scripts/                   # Maintenance scripts
│   │   ├── init-platform-config.js    # One-time platform init
│   │   └── process-treasury-fees.js   # Treasury withdrawal & processing
│   │
│   ├── server.js                  # Express entry point
│   ├── package.json
│   └── .env                       # Environment variables
│
├── frontend/
│   ├── app/                       # Next.js App Router
│   │   ├── page.js                # Landing page
│   │   ├── dashboard/
│   │   │   ├── page.js            # User dashboard
│   │   │   ├── create/page.js     # Project creation wizard
│   │   │   └── manage/[id]/page.js # Project management
│   │   ├── project/[subdomain]/page.js  # Public project page
│   │   └── admin/page.js          # Admin dashboard
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   └── Dashboard.jsx      # User boxes and projects
│   │   ├── project/
│   │   │   └── ProjectPage.jsx    # Box purchase/reveal UI
│   │   ├── manage/
│   │   │   └── ManageProject.jsx  # Creator management UI
│   │   ├── admin/
│   │   │   └── AdminDashboard.jsx # Platform admin UI
│   │   ├── create/
│   │   │   └── CreateProject.jsx  # 3-step creation wizard
│   │   └── ui/                    # Shared UI components
│   │       ├── DegenButton.jsx
│   │       ├── DegenCard.jsx
│   │       ├── DegenTabs.jsx
│   │       └── index.js           # Barrel export
│   │
│   ├── store/                     # Zustand state management
│   │   ├── useNetworkStore.js     # Network config, admin wallet
│   │   ├── useProjectStore.js     # Projects list
│   │   └── useBoxStore.js         # User's boxes
│   │
│   ├── lib/
│   │   └── supabase.js            # Supabase client
│   │
│   └── package.json
│
├── database/
│   └── migrations/                # SQL migrations
│       ├── 001_treasury_to_vault.sql
│       ├── 002_reserved_subdomains.sql
│       ├── 003_add_payment_token_fields.sql
│       ├── 004_add_numeric_id_sequence.sql
│       ├── 005_add_box_verification_columns.sql
│       └── 010_add_treasury_processing_log.sql
│
├── CLAUDE.md                      # Project specification & status
├── ARCHITECTURE.md                # This file
└── .env.example                   # Environment template
```

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Blockchain** | Solana | 1.18+ | Settlement layer |
| **Smart Contract** | Anchor | 0.30.1 | Program framework |
| **VRF Oracle** | Switchboard On-Demand | 0.11 | Verifiable randomness |
| **Backend Runtime** | Node.js | 20.x | API server |
| **Backend Framework** | Express.js | 4.x | HTTP routing |
| **Frontend Framework** | Next.js | 16.x | React framework |
| **UI Library** | React | 19.x | Component library |
| **Database** | Supabase (PostgreSQL) | - | Data persistence |
| **Wallet Adapter** | @solana/wallet-adapter | Latest | Wallet connection |
| **State Management** | Zustand | 4.x | Client state |
| **Styling** | Tailwind CSS | 3.x | Utility CSS |

### Key Dependencies

**Backend:**
```json
{
  "@coral-xyz/anchor": "^0.30.1",
  "@solana/web3.js": "^1.95.8",
  "@solana/spl-token": "^0.4.9",
  "@switchboard-xyz/on-demand": "^1.2.38",
  "@supabase/supabase-js": "^2.x",
  "express": "^4.21.2",
  "cors": "^2.8.5",
  "dotenv": "^16.4.7"
}
```

**Frontend:**
```json
{
  "next": "^16.x",
  "react": "^19.x",
  "@solana/wallet-adapter-react": "latest",
  "@solana/wallet-adapter-wallets": "latest",
  "@supabase/supabase-js": "^2.x",
  "zustand": "^4.x"
}
```

---

## On-Chain Program (Rust/Anchor)

### Program ID
```
GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
```

### Account Structures

```rust
// PlatformConfig - Global singleton (~200 bytes)
pub struct PlatformConfig {
    pub admin: Pubkey,                    // Platform admin wallet
    pub initialized: bool,
    pub paused: bool,                     // Emergency pause

    // Luck parameters
    pub base_luck: u8,                    // Default: 5
    pub max_luck: u8,                     // Default: 60
    pub luck_time_interval: i64,          // Seconds per +1 luck

    // Payout multipliers (basis points: 10000 = 1.0x)
    pub payout_dud: u32,                  // 0
    pub payout_rebate: u32,               // 8000 (0.8x)
    pub payout_breakeven: u32,            // 10000 (1.0x)
    pub payout_profit: u32,               // 25000 (2.5x)
    pub payout_jackpot: u32,              // 100000 (10x)

    // Tier probabilities (basis points, sum to 10000)
    pub tier1_max_luck: u8,               // 5
    pub tier1_dud: u16,                   // 5500 (55%)
    pub tier1_rebate: u16,                // 3000 (30%)
    pub tier1_breakeven: u16,             // 1000 (10%)
    pub tier1_profit: u16,                // 450 (4.5%)
    // tier1_jackpot = 10000 - sum = 50 (0.5%)

    // ... tier2, tier3 similar

    // Platform commission
    pub platform_commission_bps: u16,     // 500 (5%)
    pub treasury_bump: u8,

    pub updated_at: i64,
}

// ProjectConfig - Per project (~123 bytes)
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

// BoxInstance - Per box (~118 bytes)
pub struct BoxInstance {
    pub box_id: u64,
    pub project_id: u64,
    pub owner: Pubkey,
    pub created_at: i64,
    pub committed_at: i64,
    pub luck: u8,
    pub revealed: bool,
    pub settled: bool,
    pub reward_amount: u64,
    pub is_jackpot: bool,
    pub random_percentage: f64,
    pub reward_tier: u8,                  // 0-4
    pub randomness_account: Pubkey,
    pub randomness_committed: bool,
}
```

### PDA Seeds

| PDA | Seeds | Derivation |
|-----|-------|------------|
| PlatformConfig | `["platform_config"]` | Singleton |
| Treasury | `["treasury"]` | Singleton |
| ProjectConfig | `["project", u64_le(project_id)]` | Per project |
| VaultAuthority | `["vault", u64_le(project_id), mint.to_bytes()]` | Per project+token |
| BoxInstance | `["box", u64_le(project_id), u64_le(box_id)]` | Per box |

### Instructions

| Instruction | Purpose | Key Validation |
|-------------|---------|----------------|
| `initialize_platform_config` | One-time setup | Admin only |
| `update_platform_config` | Update probabilities/commission | Admin only |
| `transfer_platform_admin` | Transfer admin role | Current admin only |
| `initialize_project` | Create project, pay launch fee | Anyone |
| `create_box` | Purchase box, collect commission | Anyone |
| `commit_box` | Start VRF, freeze luck | Box owner |
| `reveal_box` | Read VRF, calculate reward | Box owner |
| `settle_box` | Transfer reward to user | Box owner |
| `withdraw_earnings` | Creator withdraws from vault | Project owner |
| `withdraw_treasury` | Admin withdraws commission | Admin only |
| `update_project` | Pause/resume project | Project owner |
| `close_project` | Close project, reclaim rent | Project owner |

### Switchboard VRF Integration

The program uses Switchboard On-Demand VRF with SDK parsing:

```rust
use switchboard_on_demand::accounts::RandomnessAccountData;

// In reveal_box instruction:
let randomness_data = RandomnessAccountData::parse(
    ctx.accounts.randomness_account.data.borrow()
).map_err(|_| LootboxError::RandomnessNotReady)?;

let clock = Clock::get()?;
let revealed_random_value: [u8; 32] = randomness_data
    .get_value(&clock)
    .map_err(|_| LootboxError::RandomnessNotReady)?;

// Use first 8 bytes for randomness
let random_u64 = u64::from_le_bytes(revealed_random_value[0..8].try_into().unwrap());
let random_percentage = (random_u64 as f64) / (u64::MAX as f64);
```

---

## Backend API (Node.js/Express)

### Route Organization

```
/api
├── /projects
│   ├── GET /                     - List all projects
│   ├── GET /:id                  - Get project by ID
│   ├── POST /create              - Create project in DB
│   └── GET /boxes/by-owner/:wallet - Get user's boxes
│
├── /program
│   ├── POST /build-initialize-project-tx
│   ├── POST /confirm-project-init
│   ├── POST /build-fund-vault-tx
│   ├── POST /confirm-vault-funding
│   ├── POST /build-create-box-tx
│   ├── POST /confirm-box-creation
│   ├── POST /build-commit-box-tx
│   ├── POST /confirm-commit
│   ├── POST /build-reveal-box-tx
│   ├── POST /confirm-reveal
│   ├── POST /build-settle-box-tx
│   ├── POST /confirm-settle
│   ├── POST /derive-pdas
│   ├── GET /project/:projectId
│   └── GET /box/:projectId/:boxId
│
├── /vault
│   ├── GET /balance/:projectId
│   ├── GET /withdrawal-info/:projectId
│   ├── POST /build-withdraw-tx
│   ├── POST /confirm-withdraw
│   └── GET /withdrawal-history/:projectId
│
└── /admin
    ├── POST /update-platform-config
    ├── GET /platform-config
    ├── GET /treasury/:tokenMint
    ├── GET /treasury-balances
    ├── POST /withdraw-treasury
    └── GET /treasury-logs          - Treasury activity with Solscan links
```

### Transaction Building Pattern

All on-chain interactions follow this pattern:

```javascript
// Frontend calls build endpoint
const buildResponse = await fetch('/api/program/build-xxx-tx', {
    method: 'POST',
    body: JSON.stringify({ ...params })
});
const { transaction, ...metadata } = await buildResponse.json();

// Frontend deserializes and signs
const tx = Transaction.from(Buffer.from(transaction, 'base64'));
const signedTx = await wallet.signTransaction(tx);

// Frontend submits to Solana
const signature = await connection.sendRawTransaction(signedTx.serialize());
await connection.confirmTransaction(signature);

// Frontend confirms with backend
await fetch('/api/program/confirm-xxx', {
    method: 'POST',
    body: JSON.stringify({ signature, ...metadata })
});
```

### Key Library Functions

**pdaHelpers.js:**
```javascript
export function derivePlatformConfigPDA(programId) { ... }
export function deriveTreasuryPDA(programId) { ... }
export function deriveProjectConfigPDA(programId, projectId) { ... }
export function deriveVaultAuthorityPDA(programId, projectId, tokenMint) { ... }
export function deriveBoxInstancePDA(programId, projectId, boxId) { ... }
export async function deriveTreasuryTokenAccount(treasuryPDA, tokenMint) { ... }
```

**switchboard.js:**
```javascript
export function getSwitchboardConstants(network) { ... }
export function getSwitchboardProgram(provider, network) { ... }
export async function createRandomnessAccount(provider, network, payer) { ... }
export async function createCommitInstruction(randomness, network, authority) { ... }
export async function createRevealInstruction(randomness, payer, network) { ... }
export async function loadRandomness(provider, pubkey, network) { ... }
export async function readRandomnessValue(connection, pubkey) { ... }
export async function waitForRandomness(connection, pubkey, maxWaitMs) { ... }
```

---

## Frontend (Next.js/React)

### App Router Structure

```
app/
├── layout.js                 # Root layout with providers
├── page.js                   # Landing page (/)
├── dashboard/
│   ├── page.js               # User dashboard (/dashboard)
│   ├── create/
│   │   └── page.js           # Project creation (/dashboard/create)
│   └── manage/
│       └── [id]/
│           └── page.js       # Project management (/dashboard/manage/:id)
├── project/
│   └── [subdomain]/
│       └── page.js           # Public project page (/project/:subdomain)
└── admin/
    └── page.js               # Admin dashboard (/admin)
```

### Component Architecture

```
components/
├── providers/
│   ├── WalletProvider.jsx    # Solana wallet context
│   └── ToastProvider.jsx     # Toast notifications
│
├── dashboard/
│   └── Dashboard.jsx         # Main dashboard with tabs
│       ├── MyProjectsTab     # Creator's projects
│       ├── MyBoxesTab        # User's purchased boxes
│       ├── ProjectBoxesGroup # Boxes grouped by project
│       └── BoxCard           # Individual box with actions
│
├── project/
│   └── ProjectPage.jsx       # Public project interface
│       ├── BuyBoxSection     # Purchase new boxes
│       └── UserBoxes         # Display owned boxes
│
├── manage/
│   └── ManageProject.jsx     # Creator management
│       ├── ProjectDetails    # Basic info
│       ├── StatusControls    # Pause/active toggles
│       ├── VaultWithdrawal   # Profit withdrawal
│       └── WithdrawalHistory # Past withdrawals
│
├── admin/
│   └── AdminDashboard.jsx    # Platform admin
│       ├── ProjectsTab       # All projects list
│       ├── ConfigTab         # Supabase config
│       ├── OnChainTab        # On-chain config
│       └── TreasuryTab       # Treasury balances
│
├── create/
│   └── CreateProject.jsx     # 3-step wizard
│       ├── Step1: Project Info
│       ├── Step2: Token Selection
│       └── Step3: Confirmation
│
└── ui/                       # Shared components
    ├── DegenButton.jsx
    ├── DegenCard.jsx
    ├── DegenInput.jsx
    ├── DegenTabs.jsx
    ├── DegenBadge.jsx
    ├── DegenLoadingState.jsx
    ├── DegenEmptyState.jsx
    └── index.js              # Barrel export
```

### State Management (Zustand)

```javascript
// useNetworkStore.js
const useNetworkStore = create((set) => ({
    config: null,
    configLoading: true,
    adminWallet: null,

    loadConfig: async () => { ... },
    refreshConfig: async () => { ... },
}));

// useProjectStore.js
const useProjectStore = create((set) => ({
    projects: [],
    projectsLoading: false,
    projectsError: null,

    loadAllProjects: async () => { ... },
    loadProjectsByOwner: async (wallet) => { ... },
    loadProjectBySubdomain: async (subdomain) => { ... },
}));

// useBoxStore.js
const useBoxStore = create((set) => ({
    boxes: [],
    boxesLoading: false,

    loadBoxesByProject: async (projectId) => { ... },
    loadBoxesByOwner: async (wallet) => { ... },
}));
```

### React 19 Features Used

1. **useOptimistic** - Instant UI updates before confirmation
2. **useTransition** - Non-blocking state updates
3. **Server Components** - Where applicable in App Router

---

## Database (Supabase/PostgreSQL)

### Tables

```sql
-- Platform configuration (singleton)
CREATE TABLE super_admin_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    network TEXT NOT NULL DEFAULT 'devnet',
    rpc_url TEXT NOT NULL,
    admin_wallet TEXT NOT NULL,
    lootbox_program_id TEXT NOT NULL,
    three_eyes_mint TEXT,
    launch_fee_amount BIGINT DEFAULT 100000000000,
    withdrawal_fee_percentage NUMERIC DEFAULT 2.5,
    luck_interval_seconds INTEGER DEFAULT 3,
    vault_fund_amount BIGINT DEFAULT 10000000000,
    is_production BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_numeric_id BIGINT UNIQUE NOT NULL,
    project_name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    description TEXT,
    owner_wallet TEXT NOT NULL,
    payment_token_mint TEXT NOT NULL,
    payment_token_symbol TEXT,
    payment_token_decimals INTEGER DEFAULT 9,
    box_price BIGINT NOT NULL,
    max_boxes INTEGER,
    vault_pda TEXT,
    vault_authority_pda TEXT,
    vault_token_account TEXT,
    vault_funded_amount BIGINT DEFAULT 0,
    initial_vault_amount BIGINT DEFAULT 0,
    total_withdrawn BIGINT DEFAULT 0,
    boxes_created INTEGER DEFAULT 0,
    boxes_settled INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT false,
    is_paused BOOLEAN DEFAULT false,
    closed_at TIMESTAMPTZ,
    last_withdrawal_at TIMESTAMPTZ,
    network TEXT DEFAULT 'devnet',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boxes
CREATE TABLE boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    box_number INTEGER NOT NULL,
    owner_wallet TEXT NOT NULL,
    box_pda TEXT,
    box_result INTEGER DEFAULT 0,  -- 0=pending, 1=dud, 2=rebate, 3=breakeven, 4=profit, 5=jackpot
    payout_amount BIGINT DEFAULT 0,
    randomness_account TEXT,
    randomness_committed BOOLEAN DEFAULT false,
    committed_at TIMESTAMPTZ,
    purchase_tx_signature TEXT,
    commit_tx_signature TEXT,
    reveal_tx_signature TEXT,
    settle_tx_signature TEXT,
    luck_value BIGINT,
    max_luck INTEGER,
    random_percentage NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    opened_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    UNIQUE(project_id, box_number)
);

-- Withdrawal history
CREATE TABLE withdrawal_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    owner_wallet TEXT NOT NULL,
    withdrawal_amount BIGINT NOT NULL,
    withdrawal_type TEXT DEFAULT 'partial',
    fee_percentage NUMERIC,
    fee_amount_in_project_token BIGINT,
    fee_amount_in_platform_token BIGINT,
    project_token_price_usd NUMERIC,
    platform_token_price_usd NUMERIC,
    exchange_rate NUMERIC,
    withdrawal_tx_signature TEXT,
    vault_balance_before BIGINT,
    vault_balance_after BIGINT,
    reserved_for_boxes BIGINT,
    unopened_boxes_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

-- Reserved subdomains
CREATE TABLE reserved_subdomains (
    subdomain TEXT PRIMARY KEY,
    reason TEXT
);

-- Treasury processing log (tracks withdrawals, swaps, buybacks)
CREATE TABLE treasury_processing_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_by TEXT NOT NULL,                    -- Admin wallet
    action_type TEXT NOT NULL DEFAULT 'withdraw', -- 'withdraw', 'swap', 'dev_transfer', 'buyback'
    token_mint TEXT NOT NULL,
    token_amount BIGINT,
    amount_withdrawn BIGINT,
    sol_received BIGINT DEFAULT 0,
    dev_sol_amount BIGINT DEFAULT 0,
    buyback_sol_amount BIGINT DEFAULT 0,
    three_eyes_bought BIGINT DEFAULT 0,
    tx_signature TEXT,                            -- Primary TX signature
    swap_to_sol_signature TEXT,
    dev_transfer_signature TEXT,
    buyback_signature TEXT,
    status TEXT NOT NULL DEFAULT 'completed',     -- 'completed', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Queries

```sql
-- Get user's boxes across all projects
SELECT b.*, p.project_name, p.payment_token_symbol, p.payment_token_decimals
FROM boxes b
JOIN projects p ON b.project_id = p.id
WHERE b.owner_wallet = $1
ORDER BY b.created_at DESC;

-- Count unopened boxes for a project
SELECT COUNT(*) FROM boxes
WHERE project_id = $1 AND box_result = 0;

-- Get unclaimed rewards
SELECT SUM(payout_amount) FROM boxes
WHERE project_id = $1
  AND box_result > 1  -- Exclude duds
  AND settled_at IS NULL;
```

---

## External Services

### Switchboard VRF

**Purpose:** Provably fair randomness for box reveals

**Network Constants:**
| Network | Program ID | Queue |
|---------|------------|-------|
| Devnet | `Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2` | `EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7` |
| Mainnet | `SBondMDrcV3K4kxZR1HNVT7osZxAHVHgYXL5Ze1oMUv` | `A43DyUGA7s8eXPxqEjJY6EBu1KKbNgfxF8h17VAHn13w` |

**Flow:**
1. Commit: Create randomness account, request randomness
2. Wait: Oracle generates randomness (~5-10 seconds)
3. Reveal: Read randomness, calculate reward

### Jupiter API

**Purpose:** Token swaps for treasury processing

**Endpoints:**
- Quote: `https://quote-api.jup.ag/v6/quote`
- Swap: `https://quote-api.jup.ag/v6/swap`

**Usage:** Treasury batch processing script swaps collected tokens to SOL

### Supabase

**Purpose:** Database, authentication (future), real-time subscriptions

**Features Used:**
- PostgreSQL database
- REST API for queries
- Real-time subscriptions (planned)

---

## Data Flow Diagrams

### Box Purchase Flow

```
User clicks "Buy Box"
        │
        ▼
Frontend: POST /api/program/build-create-box-tx
        │
        ▼
Backend:
  ├── Get project from Supabase
  ├── Derive BoxInstance PDA
  ├── Calculate commission (5% of box_price)
  └── Build transaction:
        ├── Transfer (box_price - commission) to vault
        ├── Transfer commission to treasury
        └── Initialize BoxInstance PDA
        │
        ▼
Frontend:
  ├── Deserialize transaction
  ├── Get fresh blockhash
  ├── User signs with wallet
  └── Submit to Solana
        │
        ▼
Solana: Execute create_box instruction
        │
        ▼
Frontend: POST /api/program/confirm-box-creation
        │
        ▼
Backend: Insert box record in Supabase
```

### Box Reveal Flow

```
User clicks "Open Box"
        │
        ▼
[COMMIT PHASE]
Frontend: POST /api/program/build-commit-box-tx
        │
        ▼
Backend:
  ├── Create Switchboard randomness keypair
  ├── Build transaction:
  │     ├── Switchboard: Create randomness account
  │     ├── Switchboard: Commit instruction
  │     └── Program: commit_box (freeze luck)
  └── Return transaction + serialized keypair
        │
        ▼
Frontend:
  ├── Deserialize transaction
  ├── Sign with randomness keypair (ephemeral)
  ├── User signs with wallet
  └── Submit to Solana
        │
        ▼
[WAIT ~10 SECONDS FOR ORACLE]
        │
        ▼
[REVEAL PHASE]
Frontend: POST /api/program/build-reveal-box-tx
        │
        ▼
Backend:
  ├── Load randomness account
  ├── Build transaction:
  │     ├── Switchboard: Reveal instruction
  │     └── Program: reveal_box (calculate reward)
  └── Return transaction
        │
        ▼
Frontend: Sign and submit
        │
        ▼
Frontend: POST /api/program/confirm-reveal
        │
        ▼
Backend:
  ├── Read on-chain BoxInstance state
  ├── Update box in Supabase with:
  │     ├── box_result
  │     ├── payout_amount
  │     ├── luck_value
  │     └── random_percentage
  └── Return reward info
```

---

## State Management

### Client-Side State

| Store | Data | Persistence |
|-------|------|-------------|
| `useNetworkStore` | Network config, admin wallet | Session |
| `useProjectStore` | Projects list, loading states | Session |
| `useBoxStore` | User's boxes | Session |
| React State | Form inputs, UI state | Component |

### Server-Side State

| Location | Data | Purpose |
|----------|------|---------|
| Supabase | Projects, boxes, config | Persistence |
| Solana | PDAs, token accounts | Source of truth |
| Backend Memory | None | Stateless |

### State Synchronization

1. **On-chain → Database:** After each transaction, backend reads on-chain state and updates Supabase
2. **Database → Frontend:** Frontend fetches from Supabase for lists, from backend for fresh data
3. **Optimistic Updates:** React 19 `useOptimistic` for instant UI feedback

---

## Authentication & Authorization

### Current Implementation

| Role | Authentication | Authorization |
|------|----------------|---------------|
| User | Wallet signature (transaction signing) | Wallet ownership check |
| Creator | Wallet signature | `owner_wallet` match in DB |
| Admin | Wallet signature | `admin_wallet` match in config |

### Security Model

1. **Transaction Signing:** All state-changing operations require wallet signature
2. **On-Chain Checks:** Program validates ownership/permissions
3. **Backend Validation:** Owner wallet checks before building transactions

### Known Gaps

- No signed message verification (wallet can be spoofed in API calls)
- RLS policies too permissive in Supabase
- No rate limiting on API endpoints

---

## Error Handling Patterns

### On-Chain Errors

```rust
#[error_code]
pub enum LootboxError {
    #[msg("Insufficient launch fee")]
    InsufficientLaunchFee,
    #[msg("Project inactive")]
    ProjectInactive,
    #[msg("Box already revealed")]
    BoxAlreadyRevealed,
    // ... more errors
}
```

### Backend Error Responses

```javascript
// Standard error response format
return res.status(400).json({
    success: false,
    error: 'Human-readable error message',
    details: technicalDetails,
    code: 'ERROR_CODE'
});
```

### Frontend Error Handling

```javascript
try {
    const result = await fetch(...);
    if (!result.success) {
        toast.error(result.error);
        return;
    }
    // success
} catch (err) {
    console.error('Operation failed:', err);
    toast.error('Network error');
}
```

---

## Testing Strategy

### Current Coverage

| Area | Testing | Status |
|------|---------|--------|
| On-Chain Program | Anchor tests | Minimal |
| Backend API | Manual testing | No automated tests |
| Frontend | Manual testing | No automated tests |
| Integration | Manual E2E | Ad-hoc |

### Recommended Testing

1. **Unit Tests:** Jest for backend utilities
2. **Integration Tests:** Supertest for API routes
3. **E2E Tests:** Playwright for frontend flows
4. **Program Tests:** Anchor test framework

---

## Deployment Architecture

### Current (Development)

```
┌─────────────────┐     ┌─────────────────┐
│   Local Dev     │     │    Devnet       │
│   Frontend      │────▶│    Solana       │
│   (localhost)   │     │                 │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│   Local Dev     │────▶│   Supabase      │
│   Backend       │     │   (Cloud)       │
│   (localhost)   │     │                 │
└─────────────────┘     └─────────────────┘
```

### Production (Planned)

```
┌─────────────────┐     ┌─────────────────┐
│    Vercel       │     │    Mainnet      │
│    Frontend     │────▶│    Solana       │
│                 │     │                 │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│   Railway/      │────▶│   Supabase      │
│   Render        │     │   (Cloud)       │
│   Backend       │     │                 │
└─────────────────┘     └─────────────────┘
```

### Environment Variables

**Backend (.env):**
```bash
PORT=3333
NODE_ENV=development
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
DEPLOY_WALLET_JSON=[...keypair bytes...]
DEPLOY_WALLET_PUBKEY=xxx
RPC_URL=https://devnet.helius-rpc.com/?api-key=xxx
SOLANA_NETWORK=devnet
JUPITER_API_KEY=xxx
```

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3333
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

---

## Quick Reference

### Common Operations

```bash
# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev

# Build Anchor program
cd backend/program && anchor build

# Deploy to devnet
cd backend/program && anchor deploy --provider.cluster devnet

# Initialize platform config
node backend/scripts/init-platform-config.js

# Process treasury fees
node backend/scripts/process-treasury-fees.js --dry-run
```

### Key Files for Each Feature

| Feature | Files |
|---------|-------|
| Box Purchase | `routes/program.js` (build-create-box-tx), `lib.rs` (create_box) |
| Box Reveal | `routes/program.js`, `lib/switchboard.js`, `lib.rs` (reveal_box) |
| Withdrawals | `routes/vault.js`, `lib.rs` (withdraw_earnings) |
| Treasury | `routes/admin.js`, `scripts/process-treasury-fees.js` |
| Treasury Logging | `routes/admin.js` (treasury-logs), `scripts/process-treasury-fees.js` (logTreasuryTransaction) |
| Config | `routes/admin.js`, `lib.rs` (update_platform_config) |

---

## Mainnet Readiness Checklist

### Complete (Devnet Tested)
- [x] Platform commission collection (5% on box purchases)
- [x] Treasury withdrawal to admin wallet
- [x] Treasury activity logging with Solscan links
- [x] Admin dashboard treasury tab with Recent Activity
- [x] Switchboard VRF commit/reveal flow
- [x] Creator withdrawals (no fee)

### Incomplete (Mainnet Testing Required)
- [ ] Jupiter swap integration (token → SOL)
- [ ] $3EYES buyback via Jupiter
- [ ] Dev wallet SOL distribution (10%)
- [ ] Full treasury processing flow end-to-end
- [ ] Production RPC rate limits
- [ ] Mainnet Switchboard oracle timing

### Configuration Required for Mainnet
```bash
# In super_admin_config table:
network: 'mainnet-beta'
rpc_url: '<production RPC endpoint>'
three_eyes_mint: '<real $3EYES token mint>'

# In .env:
SOLANA_NETWORK=mainnet-beta
RPC_URL=<mainnet RPC>

# For treasury script:
--dev-wallet <dev wallet pubkey>
```

---

*Architecture documentation for 3Eyes FateBox v3 - Maintained for AI handoff and development continuity*
