# Devnet → Mainnet Transition Strategy

## Executive Summary

**Goal**: Start testing on devnet with zero cost, then seamlessly switch to mainnet WITHOUT redeploying the Rust program.

**Key Principle**: The Rust program is **network-agnostic**. All network-specific configuration lives in the database.

**Cost Savings**: Deploy to mainnet ONCE (~$500-1000), then switch networks with a simple database update ($0).

---

## The Problem

Deploying a Rust program to Solana mainnet costs ~5-10 SOL (~$500-1000). If we hardcode devnet-specific values (token mints, etc.) into the program, we'd need to:
1. Deploy to devnet for testing
2. Change code for mainnet
3. Re-deploy to mainnet (~$500-1000)
4. Any bugs found = another costly redeployment

**This is expensive and risky.**

---

## The Solution

### Network-Agnostic Rust Program

The Rust program contains ZERO hardcoded network-specific values:

```rust
// ❌ BAD (hardcoded devnet token)
pub const THREE_EYES_MINT: Pubkey = pubkey!("DevnetToken123...");

// ✅ GOOD (passed as account in instruction)
pub fn create_project(
    ctx: Context<CreateProject>,
    // ... other params
) -> Result<()> {
    // Program receives three_eyes_mint as an account
    // No hardcoded values
}
```

**All network-specific config stored in database:**
- Network name (`devnet` or `mainnet-beta`)
- RPC endpoint URL
- Program ID (same on both networks if using same deploy keypair)
- $3EYES token mint address
- Platform fee account address

---

## Implementation

### Database: `super_admin_config` Table

```sql
CREATE TABLE super_admin_config (
    id INTEGER PRIMARY KEY DEFAULT 1,

    -- Network Configuration
    network TEXT NOT NULL DEFAULT 'devnet',
    rpc_url TEXT NOT NULL,
    lootbox_program_id TEXT NOT NULL,

    -- Network-specific addresses
    three_eyes_mint TEXT NOT NULL,
    platform_fee_account TEXT NOT NULL,

    -- Fees (can be different per network)
    launch_fee_amount BIGINT NOT NULL,
    withdrawal_fee_percentage NUMERIC(5,2) NOT NULL,

    -- Safety flags
    is_production BOOLEAN DEFAULT false,
    mainnet_enabled BOOLEAN DEFAULT false,

    -- Other config...
);
```

**Initial values (devnet)**:
```sql
INSERT INTO super_admin_config VALUES (
    1,
    'devnet',                               -- Network
    'https://api.devnet.solana.com',        -- Devnet RPC
    'PROGRAM_ID',                           -- Same ID on both networks
    'DEVNET_TEST_TOKEN',                    -- Devnet test token
    'DEVNET_PLATFORM_ATA',                  -- Devnet ATA
    100000000000,                           -- 100 tokens (low for testing)
    0.50,                                   -- 0.5% fee (low for testing)
    false,                                  -- NOT production
    false                                   -- Mainnet disabled
);
```

---

### Backend: Reads Config Dynamically

```javascript
// lib/getNetworkConfig.js
async function getNetworkConfig() {
    const { data } = await supabase
        .from('super_admin_config')
        .select('*')
        .single();

    return {
        network: data.network,              // 'devnet' or 'mainnet-beta'
        rpcUrl: data.rpc_url,               // Network-specific RPC
        programId: new PublicKey(data.lootbox_program_id),
        threeEyesMint: new PublicKey(data.three_eyes_mint),
        platformFeeAccount: new PublicKey(data.platform_fee_account),
        // ... etc
    };
}

// Use in all backend routes
const config = await getNetworkConfig();
const connection = new Connection(config.rpcUrl);  // Uses devnet or mainnet based on DB
const program = new Program(idl, config.programId, provider);
```

---

### Frontend: Fetches Config from Backend

```javascript
// Frontend doesn't hardcode network either
async function getNetworkConfig() {
    const res = await fetch(`${API_URL}/api/config/network`);
    const config = await res.json();

    return {
        network: config.network,  // Backend tells frontend which network
        programId: new PublicKey(config.programId),
        // ... etc
    };
}

// Wallet adapter uses config
const config = await getNetworkConfig();
const endpoint = config.network === 'mainnet-beta'
    ? 'https://mainnet.helius-rpc.com/...'
    : 'https://api.devnet.solana.com';
```

---

## The Workflow

### Phase 1: Devnet Testing (Cost: $0)

1. **Deploy Rust program to devnet**
   ```bash
   anchor build
   anchor deploy --provider.cluster devnet
   # Note program ID: ABC123...xyz
   ```

2. **Initialize database with devnet config**
   - Network: devnet
   - RPC: Devnet public endpoint
   - Program ID: ABC123...xyz
   - Token: Devnet test token
   - Fees: Low (100 tokens, 0.5%)

3. **Test everything on devnet**
   - Create test projects
   - Buy/reveal/settle boxes
   - Test withdrawals with fee calculation
   - Verify all PDAs work correctly
   - Test with 2-3 pilot projects

4. **Backend and frontend automatically use devnet**
   - No code changes needed
   - Everything configured via database

---

### Phase 2: Mainnet Deployment (Cost: ~$500-1000, ONE TIME)

1. **Build program (SAME CODE as devnet)**
   ```bash
   anchor build --verifiable
   # CRITICAL: Do NOT change any code
   ```

2. **Deploy to mainnet ONCE**
   ```bash
   anchor deploy --provider.cluster mainnet-beta
   # Costs ~5-10 SOL (~$500-1000)
   # Program ID will be the same: ABC123...xyz (if using same keypair)
   ```

3. **Create $3EYES token on mainnet**
   - Deploy via pump.fun or Raydium
   - Note mint address: XYZ789...abc

4. **Create platform ATA on mainnet**
   - Note ATA address: DEF456...789

**DO NOT SWITCH NETWORK YET** - mainnet program is deployed but not activated.

---

### Phase 3: Network Switch (Cost: $0)

When ready to go live, super admin updates database via dashboard:

**Single Database Update**:
```sql
UPDATE super_admin_config SET
    network = 'mainnet-beta',
    rpc_url = 'https://mainnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6',
    lootbox_program_id = 'ABC123...xyz',      -- SAME as devnet
    three_eyes_mint = 'XYZ789...abc',         -- Mainnet $3EYES
    platform_fee_account = 'DEF456...789',    -- Mainnet ATA
    launch_fee_amount = 10000000000000,       -- 10,000 tokens (production)
    withdrawal_fee_percentage = 2.00,         -- 2% (production)
    is_production = true,
    mainnet_enabled = true;
```

**That's it.** No code deployment. No frontend changes. No backend changes.

**What happens automatically:**
- Backend reads new config
- Connects to Helius mainnet RPC
- Uses mainnet $3EYES token
- All instructions work with mainnet accounts
- Frontend detects mainnet mode
- Users see mainnet in wallet adapter
- All transactions go to mainnet

---

## Super Admin Dashboard UI

**Location**: `/super-admin/network`

**Devnet Mode Display**:
```
┌─────────────────────────────────────────┐
│ Current Network Status                  │
├─────────────────────────────────────────┤
│ Network: Devnet                         │
│ RPC: https://api.devnet.solana.com      │
│ Program ID: ABC123...xyz                │
│ $3EYES Mint: DEVNET_TEST...             │
│ Environment: Testing                    │
│ Production Mode: Disabled               │
│                                         │
│ [Switch to Mainnet] (button disabled)  │
│ ⚠️ Complete checklist first             │
└─────────────────────────────────────────┘
```

**Mainnet Switch Form** (when ready):
```
┌──────────────────────────────────────────────────────┐
│ ⚠️  SWITCH TO MAINNET                                │
├──────────────────────────────────────────────────────┤
│ This is a ONE-WAY operation. You cannot switch back.│
│                                                      │
│ Checklist:                                           │
│ ☑ Rust program deployed to mainnet                  │
│ ☑ $3EYES token created                               │
│ ☑ Platform ATA created                               │
│ ☑ All devnet testing completed                       │
│                                                      │
│ Mainnet Configuration:                               │
│ RPC URL: [https://mainnet.helius-rpc.com/...]       │
│ Program ID: [ABC123...xyz]                           │
│ $3EYES Mint: [XYZ789...abc]                          │
│ Platform ATA: [DEF456...789]                         │
│ Launch Fee: [10000] $3EYES                           │
│ Withdrawal Fee: [2.00]%                              │
│                                                      │
│ Type "SWITCH TO MAINNET" to confirm:                 │
│ [________________]                                   │
│                                                      │
│ [Cancel] [Switch to Mainnet]                         │
└──────────────────────────────────────────────────────┘
```

**After Switch**:
```
┌─────────────────────────────────────────┐
│ ✅ Platform is now on MAINNET           │
├─────────────────────────────────────────┤
│ Network: Mainnet-Beta                   │
│ RPC: https://mainnet.helius-rpc.com/... │
│ Program ID: ABC123...xyz (verified ✓)   │
│ $3EYES Mint: XYZ789...abc (verified ✓)  │
│ Environment: Production                 │
│                                         │
│ Switched at: 2026-01-15 14:32 UTC       │
│ Switched by: C9t218Mu...H3aF            │
│                                         │
│ Next steps:                             │
│ • Monitor first project creations       │
│ • Verify transactions on Solscan        │
│ • Check $3EYES transfers                │
└─────────────────────────────────────────┘
```

---

## Safety Mechanisms

### 1. Database Constraints

**Network can only be devnet or mainnet**:
```sql
CONSTRAINT network_values CHECK (network IN ('devnet', 'mainnet-beta'))
```

**Production flag must match network**:
```sql
CONSTRAINT production_safety CHECK (
    (network = 'mainnet-beta' AND is_production = true) OR
    (network = 'devnet' AND is_production = false)
)
```

**Cannot revert to devnet after mainnet**:
```sql
CREATE TRIGGER no_production_downgrade
    BEFORE UPDATE ON super_admin_config
    FOR EACH ROW
    EXECUTE FUNCTION prevent_production_downgrade();
```

### 2. Master Kill Switch

`mainnet_enabled` flag allows emergency pause:
```javascript
if (config.network === 'mainnet-beta' && !config.mainnetEnabled) {
    throw new Error('Mainnet operations are disabled');
}
```

### 3. Environment Mismatch Detection

Backend checks on startup:
```javascript
const config = await getNetworkConfig();
if (config.network === 'mainnet-beta' && process.env.NODE_ENV !== 'production') {
    console.error('⚠️ Network is mainnet but NODE_ENV is not production!');
    process.exit(1);  // Fail fast
}
```

### 4. Audit Trail

All config changes logged:
```sql
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

## Cost Comparison

### Traditional Approach (Hardcoded Values)
```
Devnet deployment:     $0
Devnet testing:        $0
Change code:           Development time
Mainnet deployment:    ~$500-1000
Bug found:             Change code
Mainnet redeployment:  ~$500-1000 AGAIN
Another bug:           ~$500-1000 AGAIN
─────────────────────────────────
Total: $1500-3000+ (multiple deployments)
```

### Our Approach (Network-Agnostic)
```
Devnet deployment:     $0
Devnet testing:        $0
Mainnet deployment:    ~$500-1000 (ONE TIME)
Network switch:        $0 (database update)
Bug found:             Fix in backend (no redeployment)
Another bug:           Fix in backend (no redeployment)
─────────────────────────────────
Total: ~$500-1000 (single deployment)
```

**Savings: $1000-2000+**

---

## Pre-Switch Checklist

### Devnet Testing
- [ ] Create test project successfully
- [ ] Buy box with test token
- [ ] Reveal box (Switchboard VRF works)
- [ ] Settle box (vault withdrawal works)
- [ ] Creator withdraws earnings (fee calculation correct)
- [ ] Pause/resume project works
- [ ] Test with 2-3 different pilot projects
- [ ] All PDAs derive correctly
- [ ] Vault balances match expected
- [ ] Super admin fee adjustments work
- [ ] Subdomain routing works

### Mainnet Preparation
- [ ] Rust program deployed to mainnet (verified build)
- [ ] Program ID verified on Solscan
- [ ] $3EYES token deployed and verified
- [ ] Liquidity added (if using Raydium)
- [ ] Platform ATA created and funded
- [ ] Helius RPC account active
- [ ] Database backup taken
- [ ] Monitoring/alerting set up
- [ ] Team ready to monitor launch

### Post-Switch Validation
- [ ] Backend connects to mainnet RPC
- [ ] Program ID matches deployed program
- [ ] $3EYES mint address correct
- [ ] Create test project on mainnet
- [ ] Verify transaction on Solscan
- [ ] Monitor first few projects closely

---

## Timeline Example

**Week 1-6: Development on Devnet**
- Build Rust program
- Build backend
- Build frontend
- Deploy to devnet
- Test internally

**Week 7-8: Pilot Testing on Devnet**
- Invite 2-3 pilot projects
- Monitor for bugs
- Fix issues (no redeployment needed for backend bugs)
- Gather feedback

**Week 9: Mainnet Preparation**
- Deploy Rust program to mainnet (ONE TIME)
- Create $3EYES token
- Set up Helius RPC
- Final testing

**Week 10: Launch**
- Super admin switches to mainnet (database update)
- Platform goes live
- Monitor closely

**Post-Launch**:
- Fix backend bugs without redeployment
- Adjust fees via super admin dashboard
- No additional mainnet deployment costs

---

## Key Takeaways

1. **Rust program is network-agnostic** - no hardcoded addresses
2. **All config in database** - easy to switch networks
3. **Deploy to mainnet ONCE** - saves ~$1000-2000+
4. **Zero-cost network switch** - just a database update
5. **Test thoroughly on devnet** - it's free
6. **Super admin has full control** - can switch when ready
7. **One-way switch** - cannot revert to devnet (safety)
8. **Audit trail** - all changes logged
9. **Emergency kill switch** - mainnet can be disabled

---

## FAQ

**Q: Do we need different program IDs for devnet and mainnet?**
A: No! If you use the same deploy keypair, the program ID will be the same on both networks. This makes the switch even easier.

**Q: What if we find a bug in the Rust program after mainnet deployment?**
A: You'd need to fix and redeploy (~$500-1000). This is why thorough devnet testing is critical. However, most bugs can be fixed in the backend without touching the Rust program.

**Q: Can we switch back to devnet after going to mainnet?**
A: No. There's a database trigger that prevents this for safety. Once production, always production.

**Q: How long does the network switch take?**
A: Instant. As soon as the database is updated, the next backend request uses mainnet. Frontend detects this on next config fetch.

**Q: What happens to devnet data after switching?**
A: It remains in the database but is no longer used. You could add a flag to filter it out or keep it for historical purposes.

**Q: Can we test mainnet before fully switching?**
A: Yes! You can manually create a test project on mainnet using the mainnet program ID (before updating the database). This lets you verify everything works before the full switch.

---

**Created**: 2026-01-07
**Author**: Claude (via 3Eyes team)
**Status**: Implementation Guide
