# Platform Specification Updates - Summary

## Date: 2026-01-07

### Changes Made Based on User Feedback

---

## 1. ✅ Reference Files Created

**Location**: `/REFERENCE_FILES/`

Created curated collection of working code from FateBox v2:
- `lib.rs` - Complete Rust program with Switchboard VRF, PDAs, vault logic
- Backend routes - Admin API, batch status, commit/reveal/settle
- Scripts - Box opening, settlement, Switchboard debugging
- Utilities - Keypair loading, wallet auth, rate limiting
- Configuration - Anchor.toml, config.json

**README.md** added with:
- Detailed documentation on what to use vs what to avoid
- Code patterns to keep (PDA derivation, checked arithmetic, etc.)
- Code patterns to ignore (NFT/Candy Machine stuff)
- Common pitfalls and solutions
- Quick reference guide

---

## 2. ✅ TypeScript Removed

**Change**: Explicitly stated NO TypeScript throughout spec
- Updated frontend architecture diagram
- Added note in document footer
- All code examples remain JavaScript
- Anchor program remains Rust (required)

---

## 3. ✅ BoxInstance Updated with Contents Field

**Added**: `box_result: u8` field to store outcome type

```rust
pub box_result: u8,  // 0=dud, 1=rebate, 2=break_even, 3=profit, 4=jackpot
```

**Enum documentation added**:
- Dud: reward < box_price
- Rebate: reward < box_price but close
- BreakEven: reward = box_price
- Profit: reward > box_price
- Jackpot: reward >> box_price

Updated BoxInstance.LEN to account for new field.

---

## 4. ✅ Vault PDA Ownership Clarified

**Added comprehensive explanation**:
- Vault PDA controlled by PROGRAM (not admin wallet)
- Each project has its own vault PDA
- Admin wallet does NOT control vaults
- Program enforces all withdrawal rules via PDA seeds
- Admin wallet is only for:
  - Authenticating to admin dashboard
  - Receiving platform fees
  - Super admin configuration

**Added detailed explanation** in VaultAuthority PDA section with examples.

---

## 5. ✅ Unlimited Boxes & Pause Functionality

**Box Limit**: Clarified unlimited boxes
- ProjectConfig.total_boxes_created is u64
- Max: 18,446,744,073,709,551,615 boxes
- Practically unlimited

**Pause/Resume Feature**:
- ProjectConfig.active field controls ability to buy boxes
- When active=false: Users CANNOT call create_box
- When active=true: Users CAN call create_box
- Does NOT affect revealing/settling existing boxes
- Creator can toggle anytime via update_project instruction
- Use cases documented (maintenance, vault refill, etc.)

---

## 6. ✅ Subdomain Routing Implemented

**Changed from**: Path-based routing (`3eyes.fun/project/catbox`)
**Changed to**: Subdomain routing (`catbox.3eyes.fun`)

### Database Schema Updated:
```sql
subdomain TEXT UNIQUE NOT NULL,  -- e.g., "catbox", "dogbox"
CONSTRAINT subdomain_format CHECK (
    subdomain ~ '^[a-z0-9-]{3,63}$'
)
CREATE INDEX idx_projects_subdomain ON projects(subdomain);
```

### Frontend Architecture Updated:
- Next.js middleware for subdomain routing
- Wildcard DNS configuration (`*.3eyes.fun`)
- Vercel wildcard SSL (automatic)
- Reserved subdomains list (www, api, admin, etc.)
- Real-time subdomain availability checking
- Both subdomain AND path-based routing supported (hybrid)

### Benefits:
- Better branding per project
- More memorable URLs
- Easier sharing
- Better SEO

---

## 7. ✅ Super Admin Configuration System

**Admin Wallet**: C9t218MuHcsKPFMZQLvVdnPMRP5AYGRAYc8oLhshH3aF

### New Database Table: `super_admin_config`
- Stores configurable platform settings
- Single-row table (only one config)
- Fields:
  - `three_eyes_mint` - $3EYES token mint address
  - `platform_fee_account` - Where fees are collected
  - `launch_fee_amount` - Configurable (not hardcoded)
  - `withdrawal_fee_percentage` - Configurable (not hardcoded)
  - `min_box_price` - Spam prevention
  - `max_projects_per_wallet` - Limit per creator
  - `admin_wallet` - Super admin wallet address

### New Database Table: `super_admin_config_history`
- Audit log of all configuration changes
- Tracks: field, old value, new value, reason, timestamp

### Super Admin Dashboard: `/super-admin`
- Token configuration management
- Fee adjustment UI (launch fee + withdrawal %)
- Platform limits configuration
- Projects management (emergency pause)
- Comprehensive analytics
- Configuration history audit log

### Super Admin API Endpoints:
- `POST /api/super-admin/authenticate`
- `GET /api/super-admin/config`
- `PUT /api/super-admin/config/launch-fee`
- `PUT /api/super-admin/config/withdrawal-fee`
- `PUT /api/super-admin/config/token-settings`
- `PUT /api/super-admin/config/limits`
- `GET /api/super-admin/config/history`
- `GET /api/super-admin/stats/detailed`
- `POST /api/super-admin/projects/:projectId/force-pause`

### Benefits:
- Start with test token and low fees for testing
- Adjust fees based on market conditions
- No code deployment needed to change fees
- Run promotions (temporary fee reductions)
- Audit trail of all changes

---

## 8. ✅ Withdrawal Fee Changed to Percentage

**Old**: Fixed tiered fees
**New**: Percentage-based fees (default 2%)

### Calculation Logic:
```javascript
fee_in_3eyes = (withdrawal_amount * fee_percentage / 100) * conversion_rate
```

### Advantages:
- More fair (scales with withdrawal size)
- Small withdrawals: small fees
- Large withdrawals: proportional fees
- Configurable by super admin (can adjust to 1.5%, 2.5%, etc.)

### Implementation:
- Stored in `super_admin_config.withdrawal_fee_percentage`
- Backend reads from database (not env var)
- Can use oracle price (Jupiter) or fixed conversion rate for MVP
- Example calculations provided in spec

---

## 9. ✅ Fee Allocation Updated (No Burns)

**Changed from**:
- 50% burned
- 30% treasury
- 20% liquidity

**Changed to**:
- 100% added to $3EYES liquidity pool
- Focus on deepening liquidity for price stability
- Alternative option documented (80% liquidity, 20% treasury) if needed later

### Rationale:
- Deeper liquidity = better price stability
- Reduces slippage for users buying $3EYES
- Makes token more tradeable
- Can revisit burn mechanism later if desired

---

## 10. ✅ Helius RPC URL Added

**Added to Environment Variables**:
```bash
RPC_URL=https://mainnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6
```

Also added alternative RPC providers for reference:
- Solana public RPC (free but limited)
- Alchemy
- Ankr

**Added to document footer** for easy reference.

---

## Files Updated

1. **PLATFORM_SPEC.md** (main specification)
   - Added Reference Files section
   - Updated BoxInstance struct
   - Clarified vault PDA ownership
   - Added pause/unlimited boxes info
   - Changed routing to subdomain-based
   - Added super_admin_config database tables
   - Updated fee mechanics to percentage-based
   - Changed fee allocation (no burns)
   - Added Helius RPC URL
   - Added comprehensive Super Admin Configuration section
   - Updated document version to 2.0

2. **REFERENCE_FILES/** (new directory)
   - Copied 9 key reference files from FateBox v2
   - Created comprehensive README.md

3. **UPDATES_SUMMARY.md** (this file)
   - Summary of all changes

---

## Key Takeaways for Developers

1. **Use Reference Files**: Check `/REFERENCE_FILES/README.md` for proven patterns
2. **No TypeScript**: All frontend/backend code must be pure JavaScript
3. **Vault Security**: Vaults are program-controlled (not admin-controlled)
4. **Subdomain Routing**: Each project gets `{subdomain}.3eyes.fun`
5. **Configurable Fees**: Launch fee and withdrawal % stored in database (not code)
6. **Super Admin Dashboard**: Build UI for admin wallet to configure platform
7. **Percentage Fees**: Withdrawal fees scale with withdrawal size (fair)
8. **Liquidity Focus**: All fees go to $3EYES liquidity (no burns)
9. **Pause Feature**: Projects can be paused to prevent new box purchases
10. **Helius RPC**: Use provided RPC URL for reliable mainnet access

---

## Next Steps

1. Review updated PLATFORM_SPEC.md
2. Check REFERENCE_FILES for implementation patterns
3. Begin Rust program development with multi-project support
4. Build super admin dashboard for configuration
5. Implement subdomain routing with Next.js middleware
6. Deploy test token and start with low fees for pilot projects

---

**Updated By**: Claude
**Date**: 2026-01-07
**Version**: 2.0
