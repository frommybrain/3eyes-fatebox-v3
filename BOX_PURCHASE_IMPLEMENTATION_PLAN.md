# Box Purchase Implementation Plan

## Overview
Enable users to purchase lootboxes from projects, with payments flowing into the project's vault PDA on-chain.

---

## Current State ✅

We have successfully implemented:
1. ✅ Project creation flow (database + on-chain)
2. ✅ Vault PDA creation per project
3. ✅ Launch fee collection (100 t3EYES1)
4. ✅ Dynamic fee configuration from database
5. ✅ Project dashboard showing basic stats

---

## Architecture Overview

### Smart Contract Flow (Already Exists in lib.rs)

```
User → create_box → Smart Contract:
  1. Transfer box_price tokens from user to vault
  2. Create BoxInstance PDA with status=Pending
  3. Increment total_boxes_created counter
  4. Emit BoxCreated event

User → reveal_box → Smart Contract:
  1. Read Switchboard VRF for randomness
  2. Calculate if jackpot hit based on random %
  3. Update BoxInstance status to Revealed
  4. If jackpot: Transfer payout from vault to user
  5. Emit BoxRevealed event
```

### What Needs Implementation

---

## Phase 1: Backend API Endpoints for Box Purchase

### 1.1 Build Create Box Transaction Endpoint

**File**: `/backend/routes/program.js`

```javascript
/**
 * POST /api/program/build-create-box-tx
 * Build transaction for creating a lootbox
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - buyerWallet: string - User's wallet address
 *
 * Returns:
 * - transaction: string - Serialized transaction (base64)
 * - boxId: number - The box ID that will be created
 * - boxInstancePDA: string - PDA address for the box
 */
router.post('/build-create-box-tx', async (req, res) => {
    // 1. Fetch project from database
    // 2. Get on-chain project config to get current box count
    // 3. Derive box instance PDA (projectId + next boxId)
    // 4. Derive buyer's payment token account
    // 5. Build create_box transaction
    // 6. Return serialized transaction
});
```

**Key Logic**:
- Read `total_boxes_created` from on-chain to get next box ID
- Derive buyer's ATA for payment token
- Derive vault token account
- Build unsigned transaction for frontend to sign

---

### 1.2 Confirm Box Creation Endpoint

**File**: `/backend/routes/program.js`

```javascript
/**
 * POST /api/program/confirm-box-creation
 * Record box creation in database after on-chain confirmation
 *
 * Body:
 * - projectId: number
 * - boxId: number
 * - buyerWallet: string
 * - signature: string
 * - boxInstancePDA: string
 */
router.post('/confirm-box-creation', async (req, res) => {
    // 1. Verify transaction confirmed on-chain
    // 2. Insert box record into 'boxes' table
    // 3. Update project stats (boxes_created++)
    // 4. Return confirmation
});
```

---

### 1.3 Get Vault Balance Endpoint

**File**: `/backend/routes/vault.js`

```javascript
/**
 * GET /api/vault/balance/:projectId
 * Fetch vault token account balance from on-chain
 *
 * Returns:
 * - balance: string - Token balance (in lamports/smallest unit)
 * - formatted: string - Human-readable balance
 * - tokenMint: string - Payment token mint address
 */
router.get('/balance/:projectId', async (req, res) => {
    // 1. Fetch project from database
    // 2. Get vault_token_account from database
    // 3. Fetch account info from Solana
    // 4. Parse token account data
    // 5. Return balance
});
```

---

## Phase 2: Database Schema for Boxes

### 2.1 Create `boxes` Table

**File**: `/backend/database/create_boxes_table.sql`

```sql
CREATE TABLE IF NOT EXISTS boxes (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    project_numeric_id INTEGER NOT NULL,
    box_id BIGINT NOT NULL, -- On-chain box ID within project

    -- User info
    buyer_wallet TEXT NOT NULL,

    -- On-chain data
    box_instance_pda TEXT NOT NULL,
    transaction_signature TEXT NOT NULL,

    -- Box state
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'revealed', 'settled'
    is_jackpot BOOLEAN DEFAULT FALSE,
    payout_amount BIGINT DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revealed_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,

    -- Indexes
    UNIQUE(project_numeric_id, box_id),
    INDEX idx_boxes_buyer (buyer_wallet),
    INDEX idx_boxes_project (project_id),
    INDEX idx_boxes_status (status)
);

-- Add RLS policies
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view boxes"
    ON boxes FOR SELECT
    USING (true);

CREATE POLICY "Anyone can create boxes"
    ON boxes FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can update boxes"
    ON boxes FOR UPDATE
    USING (true);
```

---

## Phase 3: Frontend Box Purchase Flow

### 3.1 Project Page Component

**File**: `/frontend/app/world/[subdomain]/page.js` (or create new)

This is the **public-facing project page** where users can purchase boxes.

```jsx
'use client';

import { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import useProjectStore from '@/store/useProjectStore';

export default function ProjectPage({ params }) {
    const { subdomain } = params;
    const { publicKey, connected, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const { currentProject, projectLoading, loadProjectBySubdomain } = useProjectStore();
    const [purchasing, setPurchasing] = useState(false);

    useEffect(() => {
        loadProjectBySubdomain(subdomain);
    }, [subdomain]);

    const handlePurchaseBox = async () => {
        if (!connected || !publicKey) {
            alert('Please connect your wallet first');
            return;
        }

        setPurchasing(true);

        try {
            // 1. Call backend to build transaction
            const response = await fetch('/api/program/build-create-box-tx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.project_numeric_id,
                    buyerWallet: publicKey.toString(),
                }),
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            // 2. Deserialize and sign transaction
            const transaction = Transaction.from(Buffer.from(result.transaction, 'base64'));

            // Get fresh blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;

            // 3. Send transaction
            const signature = await sendTransaction(transaction, connection);

            // 4. Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed');

            // 5. Confirm with backend
            await fetch('/api/program/confirm-box-creation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.project_numeric_id,
                    boxId: result.boxId,
                    buyerWallet: publicKey.toString(),
                    signature,
                    boxInstancePDA: result.boxInstancePDA,
                }),
            });

            alert('Box purchased successfully! 🎉');

        } catch (error) {
            console.error('Purchase failed:', error);
            alert(`Failed to purchase box: ${error.message}`);
        } finally {
            setPurchasing(false);
        }
    };

    return (
        <div className="min-h-screen p-8">
            <h1>{currentProject?.project_name}</h1>
            <p>Box Price: {currentProject?.box_price / 1e9} tokens</p>

            <button
                onClick={handlePurchaseBox}
                disabled={!connected || purchasing}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg"
            >
                {purchasing ? 'Purchasing...' : 'Buy Box'}
            </button>
        </div>
    );
}
```

---

### 3.2 Add Vault Balance Fetching to Dashboard

**File**: `/frontend/store/useProjectStore.js`

Add method to enrich projects with vault balances:

```javascript
/**
 * Enrich projects with on-chain vault balances
 * @param {Array} projects - Projects from database
 */
enrichProjectsWithBalances: async (projects) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

    const enrichedProjects = await Promise.all(
        projects.map(async (project) => {
            if (!project.vault_token_account) {
                return { ...project, vault_balance: 0 };
            }

            try {
                const response = await fetch(
                    `${backendUrl}/api/vault/balance/${project.project_numeric_id}`
                );
                const result = await response.json();

                return {
                    ...project,
                    vault_balance: result.balance || 0,
                };
            } catch (error) {
                console.error(`Failed to fetch balance for project ${project.id}:`, error);
                return { ...project, vault_balance: 0 };
            }
        })
    );

    return enrichedProjects;
},
```

Update `loadProjectsByOwner`:

```javascript
loadProjectsByOwner: async (ownerWallet) => {
    set({ projectsLoading: true, projectsError: null });

    try {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('owner_wallet', ownerWallet)
            .eq('archived', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Enrich with vault balances
        const enrichedProjects = await get().enrichProjectsWithBalances(data || []);

        set({
            projects: enrichedProjects,
            projectsLoading: false,
        });

        return enrichedProjects;
    } catch (error) {
        console.error('Failed to load projects by owner:', error);
        set({
            projectsError: error.message,
            projectsLoading: false,
        });
        throw error;
    }
},
```

---

## Phase 4: Smart Contract Considerations

### 4.1 Current Smart Contract Status

**File**: `/backend/program/programs/lootbox_platform/src/lib.rs`

The `create_box` instruction **already exists** but has TODOs:

```rust
pub fn create_box(
    ctx: Context<CreateBox>,
    project_id: u64,
    box_id: u64,
) -> Result<()> {
    let project_config = &mut ctx.accounts.project_config;
    let box_instance = &mut ctx.accounts.box_instance;
    let clock = Clock::get()?;

    // Verify project is active
    require!(project_config.active, LootboxError::ProjectNotActive);

    // Transfer payment from buyer to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.buyer_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.buyer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, project_config.box_price)?;

    // Initialize box instance
    box_instance.project_id = project_id;
    box_instance.box_id = box_id;
    box_instance.buyer = ctx.accounts.buyer.key();
    box_instance.status = BoxStatus::Pending;
    box_instance.payout_amount = 0;
    box_instance.created_at = clock.unix_timestamp;
    box_instance.revealed_at = 0;
    box_instance.settled_at = 0;

    // Update project stats
    project_config.total_boxes_created += 1;
    project_config.total_revenue += project_config.box_price;

    msg!("Box created: project={}, box={}, buyer={}", project_id, box_id, ctx.accounts.buyer.key());

    Ok(())
}
```

### ✅ This instruction is READY TO USE!

The smart contract already:
- ✅ Transfers payment tokens from buyer to vault
- ✅ Creates BoxInstance PDA
- ✅ Updates project stats
- ✅ Validates project is active

**No smart contract changes needed for Phase 1-3!**

---

## Phase 5: Box Reveal Flow (Future)

### 5.1 Current reveal_box Status

The `reveal_box` instruction exists but uses hardcoded randomness:

```rust
// TODO: Integrate Switchboard VRF account reading
let random_percentage = 0.5; // Placeholder
```

**This must be implemented before production**, but box purchases can work without reveals in the MVP.

**Box Reveal Implementation** (separate task):
1. Integrate Switchboard VRF
2. Update `reveal_box` instruction accounts
3. Create frontend reveal UI
4. Handle jackpot payouts

---

## Implementation Order (Recommended)

### Week 1: Backend & Database
1. ✅ Create `boxes` table in database
2. ✅ Implement `/api/program/build-create-box-tx` endpoint
3. ✅ Implement `/api/program/confirm-box-creation` endpoint
4. ✅ Implement `/api/vault/balance/:projectId` endpoint
5. ✅ Test endpoints with Postman/curl

### Week 2: Frontend
1. ✅ Add vault balance fetching to project store
2. ✅ Update Dashboard to show vault balances (already added UI)
3. ✅ Create project page component (`/world/[subdomain]/page.js`)
4. ✅ Implement box purchase flow in frontend
5. ✅ Test end-to-end: Buy box → Money flows to vault → Dashboard updates

### Week 3: Polish & Testing
1. ✅ Add loading states and error handling
2. ✅ Add transaction confirmation UX
3. ✅ Add box history page (show user's purchased boxes)
4. ✅ Test with real devnet transactions
5. ✅ Security audit (input validation, rate limiting)

### Week 4+: Box Reveal (Separate Feature)
1. Research Switchboard VRF integration
2. Update smart contract with VRF accounts
3. Implement reveal flow
4. Test jackpot payouts

---

## Security Considerations

### Critical Checks
1. ✅ **Smart contract validates project is active** (already implemented)
2. ✅ **Payment must be transferred BEFORE creating box** (already implemented)
3. ✅ **Box IDs must be sequential** (enforced by on-chain counter)
4. ⚠️ **Frontend must get fresh blockhash** (learned from project creation)
5. ⚠️ **Backend must verify transaction confirmed** before DB insert
6. ⚠️ **Rate limiting on API endpoints** to prevent spam

### Database Integrity
1. ✅ Unique constraint on `(project_numeric_id, box_id)`
2. ✅ Foreign key to projects table with CASCADE
3. ⚠️ Transaction isolation for concurrent purchases
4. ⚠️ Index on buyer_wallet for user history queries

---

## Testing Checklist

### Unit Tests
- [ ] Backend: Test PDA derivation for box instances
- [ ] Backend: Test transaction building
- [ ] Frontend: Test wallet connection
- [ ] Frontend: Test transaction signing

### Integration Tests
- [ ] End-to-end: Create project → Buy box → Verify vault balance
- [ ] Test insufficient funds scenario
- [ ] Test user rejects transaction
- [ ] Test network errors and retries
- [ ] Test concurrent box purchases (multiple users)

### Devnet Testing
- [ ] Deploy smart contract to devnet (already done ✅)
- [ ] Create test project with test tokens
- [ ] Purchase box from test wallet
- [ ] Verify tokens arrive in vault PDA
- [ ] Check database records match on-chain state

---

## Cost Estimates (Per Box Purchase)

### On-Chain Costs
- Transaction fee: ~0.000005 SOL (~$0.0001)
- BoxInstance PDA rent: ~0.002 SOL (~$0.40) - **ONE-TIME**
- Total per box: ~0.002 SOL

### Off-Chain Costs
- Database insert: Negligible
- API calls: Negligible

**User pays**: Box price + ~0.002 SOL gas

---

## Monitoring & Analytics

### Key Metrics to Track
1. Total boxes purchased (per project)
2. Total revenue (vault balance)
3. Failed transactions (for debugging)
4. Average purchase time (UX metric)
5. Wallet with most purchases (whale tracking)

### Database Views
```sql
CREATE VIEW project_analytics AS
SELECT
    p.id,
    p.project_name,
    COUNT(b.id) as total_boxes,
    SUM(CASE WHEN b.is_jackpot THEN 1 ELSE 0 END) as total_jackpots,
    p.vault_balance
FROM projects p
LEFT JOIN boxes b ON b.project_id = p.id
GROUP BY p.id;
```

---

## Next Steps (Action Items)

1. **Create boxes table** - Run the SQL migration
2. **Implement backend endpoints** - Start with `build-create-box-tx`
3. **Implement vault balance endpoint** - So dashboard can show balances
4. **Test backend with curl** - Verify transaction building works
5. **Create project page** - Public-facing page for box purchases
6. **Test end-to-end flow** - Full user journey on devnet

---

## Questions to Resolve

1. **Box pricing**: Is box_price fixed per project or can it vary?
   - Current: Fixed per project (stored in project_config)
   - Recommendation: Keep fixed for MVP

2. **Jackpot odds**: How are odds calculated?
   - Current: Hardcoded 0.5 (50% chance)
   - Future: Read from project config, integrate VRF

3. **Refunds**: Can users get refunds if reveal fails?
   - Current: No refund mechanism
   - Recommendation: Add refund instruction for failed reveals

4. **Box limits**: Max boxes per project or per user?
   - Current: No limit (only max_boxes in project config)
   - Recommendation: Add rate limiting in backend

5. **Withdrawal**: When can project owners withdraw?
   - Current: Anytime (but should calculate locked funds)
   - TODO: Implement locked balance calculation (line 255 in lib.rs)

---

## Summary

**What's Ready Now:**
- ✅ Smart contract has working `create_box` instruction
- ✅ Vault PDAs are created per project
- ✅ Dashboard UI is updated to show vault balance

**What Needs Building:**
- 🔨 Backend API endpoints (3 endpoints)
- 🔨 Database boxes table
- 🔨 Frontend project page for purchases
- 🔨 Vault balance fetching logic

**Estimated Time**: 2-3 weeks for full box purchase MVP (without reveals)

**Critical Path**: Backend endpoints → Database → Frontend → Testing
