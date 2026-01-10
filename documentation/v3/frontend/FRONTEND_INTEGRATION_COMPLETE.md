# Frontend Integration - Project Creation Flow

## ✅ What Was Done

### 1. Updated CreateProject Component
**File:** `frontend/components/create/CreateProject.jsx`

The `handleSubmit` function now:
1. **Creates project in database** - Gets a unique project ID
2. **Calls backend API** - `POST /api/program/initialize-project` to initialize on-chain
3. **Updates database with PDAs** - Stores vault_pda, vault_authority_pda, vault_token_account
4. **Shows success message** - Displays transaction hash and Solana Explorer link

### 2. Added Backend URL Environment Variable
**File:** `frontend/.env.local`

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3333
```

### 3. Created Database Migration
**File:** `database/add_payment_token_fields.sql`

Adds required fields to projects table:
- `payment_token_mint` - SPL token mint address
- `payment_token_symbol` - Display symbol (SOL, USDC, etc)
- `payment_token_decimals` - Token decimals (9 for SOL, 6 for USDC)
- `network` - 'devnet' or 'mainnet'

## 🚀 How to Use

### Step 1: Run Database Migration

Go to Supabase SQL Editor and run:
```sql
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS payment_token_mint TEXT,
ADD COLUMN IF NOT EXISTS payment_token_symbol TEXT,
ADD COLUMN IF NOT EXISTS payment_token_decimals INTEGER DEFAULT 9,
ADD COLUMN IF NOT EXISTS network TEXT DEFAULT 'devnet';
```

Or run the migration file:
```bash
# Copy contents of database/add_payment_token_fields.sql to Supabase SQL Editor
```

### Step 2: Ensure Backend is Running

```bash
cd backend
node server.js
```

Should show:
```
✅ Environment verified: devnet (development)
🚀 3Eyes Backend API running on port 3333
```

### Step 3: Ensure Frontend is Running

```bash
cd frontend
npm run dev
```

### Step 4: Test Project Creation

1. Connect wallet in frontend
2. Go to "Create New Project"
3. Fill in form:
   - **Project Name:** Test Project
   - **Subdomain:** testproject
   - **Payment Token Mint:** `BnL9bDB6yCUwFBckW5Lu3TZjaZobmqxecqnY85X1ti1h` (tCATS)
   - **Token Symbol:** tCATS
   - **Decimals:** 6
   - **Box Price:** 1.0
4. Click "Create Project"

## 🔄 Complete Flow

```
User Clicks "Create Project"
         ↓
Frontend: Insert into Supabase projects table
         ↓
Frontend: Call POST /api/program/initialize-project
         ↓
Backend: Derive PDAs for project
         ↓
Backend: Call Anchor program.methods.initializeProject()
         ↓
Backend: Transaction submitted to Solana
         ↓
Backend: Update projects table with PDAs
         ↓
Backend: Return transaction hash + PDAs
         ↓
Frontend: Show success alert with Explorer link
         ↓
Frontend: Redirect to /dashboard
```

## 📊 What Gets Created

### Database Record
```javascript
{
  id: "uuid-here",
  project_name: "Test Project",
  subdomain: "devnet-testproject",
  owner_wallet: "5vnjoq...",
  payment_token_mint: "BnL9bDB...",
  payment_token_symbol: "tCATS",
  payment_token_decimals: 6,
  box_price: 1000000,
  vault_pda: "AaA2qC...",           // ← NEW!
  vault_authority_pda: "8wisMS...", // ← NEW!
  vault_token_account: "HEZ9g7...", // ← NEW!
  network: "devnet",
  is_active: true,
  created_at: "2026-01-09..."
}
```

### On-Chain Account
```javascript
{
  projectId: 5,
  owner: "5vnjoq...",
  paymentTokenMint: "BnL9bDB...",
  boxPrice: "1000000",
  vaultAuthorityBump: 255,
  totalBoxesCreated: "0",
  totalBoxesSettled: "0",
  totalRevenue: "0",
  totalPaidOut: "0",
  active: true,
  launchFeePaid: true,
  createdAt: "2026-01-09T21:33:31.000Z"
}
```

## 🧪 Testing Endpoints Directly

### 1. Derive PDAs
```bash
curl -X POST http://localhost:3333/api/program/derive-pdas \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 5,
    "paymentTokenMint": "BnL9bDB6yCUwFBckW5Lu3TZjaZobmqxecqnY85X1ti1h"
  }'
```

### 2. Initialize Project
```bash
curl -X POST http://localhost:3333/api/program/initialize-project \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 5,
    "boxPrice": "1000000",
    "paymentTokenMint": "BnL9bDB6yCUwFBckW5Lu3TZjaZobmqxecqnY85X1ti1h",
    "ownerWallet": "5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn"
  }'
```

### 3. Fetch On-Chain State
```bash
curl -X GET http://localhost:3333/api/program/project/5
```

## ⚠️ Important Notes

1. **Launch Fee:** Currently hardcoded to 100 t3EYES1 in the smart contract. Make sure users have enough t3EYES1 tokens in their wallet.

2. **Network:** Projects created in devnet will have "devnet-" prefix on subdomain.

3. **Box Price Units:** Box price in the database is stored in smallest units (lamports/tokens). For tCATS with 6 decimals, 1.0 tCATS = 1000000 units.

4. **Transaction Confirmation:** The frontend waits for the transaction to confirm before showing success. This can take a few seconds.

5. **Error Handling:** If on-chain initialization fails, the project will still exist in the database but won't have PDAs populated. You may need to manually retry or clean up.

## 🎯 Next Steps

1. ✅ Database migration - Run the SQL migration
2. ✅ Test project creation end-to-end
3. 🔜 Add box creation endpoints to backend
4. 🔜 Update frontend to use box creation flow
5. 🔜 Implement reveal and settle endpoints

## 📝 Files Modified

- `frontend/components/create/CreateProject.jsx` - Updated handleSubmit
- `frontend/.env.local` - Added NEXT_PUBLIC_BACKEND_URL
- `database/add_payment_token_fields.sql` - New migration file
