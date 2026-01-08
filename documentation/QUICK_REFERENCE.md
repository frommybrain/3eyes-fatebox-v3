# 3Eyes Platform - Quick Reference Guide

## 📚 Documentation Files

### Core Specification
- **[PLATFORM_SPEC.md](PLATFORM_SPEC.md)** (3,300+ lines)
  - Complete technical specification
  - Rust program architecture
  - Backend API endpoints
  - Frontend structure
  - Database schema
  - Super admin configuration
  - Security considerations
  - **Version**: 2.1

### Strategy Documents
- **[DEVNET_MAINNET_STRATEGY.md](DEVNET_MAINNET_STRATEGY.md)**
  - Network-agnostic architecture
  - Deployment workflow
  - Cost savings analysis (~$1000-2000 saved)
  - Safety mechanisms

- **[NETWORK_DATA_SEPARATION.md](NETWORK_DATA_SEPARATION.md)**
  - Separating devnet vs mainnet data
  - Subdomain prefixing strategy
  - Network filtering
  - Visual indicators

### Reference Code
- **[REFERENCE_FILES/](REFERENCE_FILES/)**
  - Working code from FateBox v2
  - See [REFERENCE_FILES/README.md](REFERENCE_FILES/README.md)
  - Patterns to use vs avoid

### Change Log
- **[UPDATES_SUMMARY.md](UPDATES_SUMMARY.md)**
  - Summary of all changes made
  - What was updated and why

---

## 🎯 Key Concepts

### No NFTs
- ❌ Old approach: Candy Machine minting NFTs
- ✅ New approach: Pure PDA-based box instances
- **Savings**: 90% cost reduction, instant creation

### Network-Agnostic Rust Program
- Deploy to mainnet ONCE (~$500-1000)
- Switch networks via database update ($0)
- No code changes needed
- Same program works on devnet and mainnet

### Multi-Tenant Platform
- Multiple projects on one deployment
- Each project gets unique subdomain (`catbox.3eyes.fun`)
- Vault PDA per project (program-controlled)
- Database-driven configuration

### $3EYES Platform Token
- Launch fee: Configurable (default: 10,000 $3EYES)
- Withdrawal fee: Configurable % (default: 2%)
- All fees to liquidity pool (no burns)

---

## 🗄️ Database Schema Quick Reference

### super_admin_config (Single Row)
```sql
network                    -- 'devnet' or 'mainnet-beta'
rpc_url                    -- Network-specific RPC
lootbox_program_id         -- Same on both networks
three_eyes_mint            -- Network-specific token
platform_fee_account       -- Network-specific ATA
launch_fee_amount          -- Configurable
withdrawal_fee_percentage  -- Configurable
is_production             -- Safety flag
mainnet_enabled           -- Kill switch
```

### projects
```sql
project_id         -- Unique ID
owner_wallet       -- Creator wallet
subdomain          -- e.g., "catbox" or "devnet-catbox"
network            -- Which network created on
payment_token_mint -- Project's SPL token
box_price          -- Cost per box
vault_pda          -- Program-controlled vault
active             -- Pause/resume flag
```

---

## 🔐 Wallets

### Super Admin Wallet
`C9t218MuHcsKPFMZQLvVdnPMRP5AYGRAYc8oLhshH3aF`
- Authenticates to super admin dashboard
- Receives platform fees
- Configures platform settings
- **Does NOT control vaults** (program does)

### Vault Authority
- PDA controlled by Rust program
- Derived from: `["vault", project_id, payment_token]`
- Program uses PDA seeds as signer for withdrawals

---

## 🚀 Deployment Workflow

### Phase 1: Devnet ($0)
1. Deploy Rust program to devnet
2. Set database: `network = 'devnet'`
3. Create devnet test token
4. Test with pilot projects
5. Subdomains: `devnet-catbox.3eyes.fun`

### Phase 2: Mainnet Deploy (~$500-1000)
1. Deploy SAME Rust program to mainnet
2. Create real $3EYES token
3. DO NOT activate yet

### Phase 3: Network Switch ($0)
1. Super admin updates database
2. Backend automatically uses mainnet
3. Frontend automatically detects mainnet
4. Subdomains: `catbox.3eyes.fun` (no prefix)

---

## 📊 Network Separation

### Devnet Projects
- Subdomain: `devnet-{name}.3eyes.fun`
- Database: `network = 'devnet'`
- Badge: 🧪 DEVNET
- Archived after mainnet switch

### Mainnet Projects
- Subdomain: `{name}.3eyes.fun`
- Database: `network = 'mainnet-beta'`
- Badge: ✓ MAINNET (or no badge)
- Production data

### Filtering
```javascript
// Always filter by current network
const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('network', currentNetwork)
    .eq('archived', false);
```

---

## 🛠️ Tech Stack

### Rust Program
- Anchor Framework 0.31
- Switchboard VRF for randomness
- PDAs for state and vaults
- Network-agnostic (no hardcoded values)

### Backend
- Node.js + Express
- **JavaScript ONLY** (no TypeScript)
- Supabase (PostgreSQL)
- Anchor SDK for Solana
- tweetnacl for signature verification

### Frontend
- Next.js 15 (App Router)
- React 19
- **JavaScript ONLY** (no TypeScript)
- Solana Wallet Adapter
- Subdomain routing via middleware

---

## 🔧 RPC Configuration

### Helius (Mainnet)
```
https://mainnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6
```

### Public Devnet
```
https://api.devnet.solana.com
```

---

## 💰 Cost Breakdown

### One-Time Costs
- Rust program deployment: ~$500-1000 (mainnet only, devnet free)
- $3EYES token creation: ~$1
- Platform ATA creation: ~$0.20

### Ongoing Costs
- RPC (Helius): $100/month
- Supabase: $0-25/month
- Hosting (Render): $7/month
- Hosting (Vercel): $0-20/month

### Savings vs Traditional
- Traditional (multiple deployments): $1500-3000
- Our approach (one deployment): $500-1000
- **Saved: $1000-2000**

---

## 🎨 UI Patterns

### Network Badge
```javascript
{config.network === 'devnet' && (
    <div className="network-badge">
        🧪 DEVNET MODE
    </div>
)}
```

### Project Badge
```javascript
<NetworkBadge network={project.network} />
// Shows: 🧪 DEVNET or ✓ MAINNET
```

### Subdomain Prefix
```javascript
function generateSubdomain(name, network) {
    return network === 'devnet' ? `devnet-${name}` : name;
}
```

---

## 📝 Common Queries

### Get Current Network Config
```javascript
const config = await getNetworkConfig();
// Returns: { network, rpcUrl, programId, threeEyesMint, ... }
```

### Filter Projects by Network
```sql
SELECT * FROM projects
WHERE network = (SELECT network FROM super_admin_config)
  AND archived = false;
```

### Get All Boxes for User (Current Network)
```javascript
const boxes = await connection.getProgramAccounts(programId, {
    filters: [
        { memcmp: { offset: 8+8+8, bytes: userWallet } },
        { dataSize: 8 + 110 }
    ]
});
```

---

## 🔒 Security Checklist

### Database
- [x] Constraints on network values
- [x] Production downgrade prevented (trigger)
- [x] Audit log for all config changes
- [x] Network-production flag consistency

### Backend
- [x] Wallet signature verification
- [x] Admin-only endpoints protected
- [x] Rate limiting on all routes
- [x] Network mismatch detection on startup

### Frontend
- [x] Network badge visible in devnet
- [x] Config fetched from backend (not hardcoded)
- [x] Transaction simulation before sending

### Rust Program
- [x] No hardcoded network values
- [x] PDA-based vault control
- [x] Ownership checks on all instructions
- [x] Checked arithmetic (no overflow)

---

## 📦 Box Lifecycle

```
1. UNOPENED (box_state doesn't exist)
   - User buys box
   - BoxInstance PDA created
   - Luck = 5 (base)

2. UNREVEALED (box exists, revealed = false)
   - Luck accumulates over time
   - User can reveal when ready

3. REVEALED (revealed = true, settled = false)
   - Switchboard randomness requested
   - Reward calculated and stored
   - User can claim

4. SETTLED (settled = true)
   - Reward transferred from vault to user
   - Box complete
```

---

## 🎲 Luck Calculation

```rust
base_luck = 5
hold_time_hours = (current_time - created_at) / 3600
bonus_luck = floor(hold_time_hours / 3)  // +1 every 3 hours
current_luck = min(base_luck + bonus_luck, 60)  // cap at 60
```

**Testing mode**: +1 every 3 seconds (for devnet)

---

## 📈 Reward Calculation

```rust
luck_multiplier = luck / 10.0  // 0.5 - 6.0
random_bonus = random_percentage * 2.0  // 0.0 - 2.0
total_multiplier = luck_multiplier + random_bonus
reward = box_price * total_multiplier

// Jackpot check
if luck >= 60 && random_percentage > 0.99 {
    reward = vault_balance * 0.5  // 50% of vault
    is_jackpot = true
}
```

---

## 🔄 Withdrawal Flow

```
1. Creator requests withdrawal of X tokens
2. Program calculates:
   - Available = vault_balance - locked_for_pending_boxes
   - Fee = (X * withdrawal_fee_percentage / 100) in $3EYES
3. Creator must have sufficient $3EYES
4. Program transfers:
   - Fee: creator → platform (in $3EYES)
   - Earnings: vault → creator (in project token)
5. Fee goes to liquidity pool
```

---

## 🚨 Emergency Controls

### Project Pause (Creator)
```sql
UPDATE projects SET active = false WHERE project_id = X;
```
- Prevents new box purchases
- Existing boxes can still be revealed/settled

### Mainnet Kill Switch (Super Admin)
```sql
UPDATE super_admin_config SET mainnet_enabled = false;
```
- Immediately stops all mainnet operations
- Backend rejects all transactions

### Force Pause (Super Admin)
```
POST /api/super-admin/projects/:id/force-pause
```
- Emergency pause for suspicious projects

---

## 📞 Support

For questions or issues:
- Technical: See [PLATFORM_SPEC.md](PLATFORM_SPEC.md)
- Network Strategy: See [DEVNET_MAINNET_STRATEGY.md](DEVNET_MAINNET_STRATEGY.md)
- Data Separation: See [NETWORK_DATA_SEPARATION.md](NETWORK_DATA_SEPARATION.md)
- Reference Code: See [REFERENCE_FILES/README.md](REFERENCE_FILES/README.md)

---

**Last Updated**: 2026-01-07
**Document Version**: 1.0
**Platform Version**: 2.1
