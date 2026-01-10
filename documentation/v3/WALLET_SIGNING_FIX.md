# Fix: Wallet Signing for On-Chain Transactions

## Problem
Backend was trying to sign transactions with its own keypair, but the `initialize_project` instruction requires the **project owner** (user's wallet) to sign.

**Error:** `Signature verification failed. Missing signature for public key [user-wallet]`

## Solution
Changed architecture to:
1. **Backend builds** the transaction
2. **Frontend signs** with user's wallet
3. **Frontend submits** to Solana
4. **Backend updates** database after confirmation

This is the standard pattern for Solana dApps where users sign their own transactions.

## Changes Made

### Backend: New Endpoints

#### 1. `/api/program/build-initialize-project-tx` (NEW)
Builds and returns a **serialized unsigned transaction** for frontend to sign.

**Request:**
```json
{
  "projectId": 2,
  "boxPrice": "1000000",
  "paymentTokenMint": "BnL9bDB6yCUwFBckW5Lu3TZjaZobmqxecqnY85X1ti1h",
  "ownerWallet": "EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": "base64-encoded-transaction",
  "projectId": 2,
  "pdas": {
    "projectConfig": "AaA2qC...",
    "vaultAuthority": "8wisMS...",
    "vaultAuthorityBump": 255,
    "vaultTokenAccount": "HEZ9g7..."
  },
  "network": "devnet"
}
```

#### 2. `/api/program/confirm-project-init` (NEW)
Updates database with PDAs after frontend confirms transaction.

**Request:**
```json
{
  "projectId": 2,
  "signature": "5NyM47xDx...",
  "pdas": {
    "projectConfig": "AaA2qC...",
    "vaultAuthority": "8wisMS...",
    "vaultTokenAccount": "HEZ9g7..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "projectId": 2,
  "signature": "5NyM47xDx...",
  "explorerUrl": "https://explorer.solana.com/tx/5NyM47xDx...?cluster=devnet"
}
```

### Frontend: Updated CreateProject Flow

**New imports:**
```javascript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
```

**New hooks:**
```javascript
const { publicKey, connected, sendTransaction } = useWallet();
const { connection } = useConnection();
```

**Updated handleSubmit:**
```javascript
1. Create project in database (get numeric ID)
2. Build transaction via backend
3. Deserialize transaction
4. Sign and send with user's wallet
5. Wait for confirmation
6. Update database via backend
7. On error: delete project from database (cleanup)
```

## Complete Flow

```
User clicks "Create Project"
         ↓
Frontend: Create in database (get numeric ID)
         ↓
Frontend: POST /api/program/build-initialize-project-tx
         ↓
Backend: Derive PDAs
         ↓
Backend: Build transaction (unsigned)
         ↓
Backend: Serialize and return to frontend
         ↓
Frontend: Deserialize transaction
         ↓
Frontend: Sign with user's wallet (Phantom/Solflare)
         ↓
Frontend: Submit to Solana RPC
         ↓
Solana: Process transaction
         ↓
Frontend: Wait for confirmation
         ↓
Frontend: POST /api/program/confirm-project-init
         ↓
Backend: Update database with PDAs
         ↓
Frontend: Show success + redirect to dashboard
```

## Error Handling

### On-Chain Failure
If transaction fails (rejected, insufficient funds, etc.):
- Frontend catches error
- Frontend deletes project from database
- User sees error message
- User returns to form to try again

**Code:**
```javascript
catch (error) {
    console.error('Error creating project:', error);

    // Clean up: delete the project from database if on-chain init failed
    if (projectData) {
        console.log('Cleaning up failed project from database...');
        await supabase.from('projects').delete().eq('id', projectData.id);
    }

    alert(`Failed to create project: ${error.message}\n\nPlease try again.`);
    setStep(2);
}
```

## Testing

### Backend
Restart server to load new endpoints:
```bash
cd backend
node server.js
```

### Frontend
Restart dev server to load changes:
```bash
cd frontend
npm run dev
```

### Test Flow
1. Go to http://localhost:3000
2. Connect wallet (make sure you have SOL for gas + 100 t3EYES1 for launch fee)
3. Click "Create New Project"
4. Fill in form:
   - Name: "Test Project"
   - Token: `BnL9bDB6yCUwFBckW5Lu3TZjaZobmqxecqnY85X1ti1h` (tCATS)
   - Symbol: CATS
   - Decimals: 6
   - Price: 1.0
5. Review and confirm
6. **Wallet will prompt for signature** - approve it
7. Wait for confirmation (~2-5 seconds)
8. See success message with transaction link

## Advantages of This Approach

1. ✅ **User controls their keys** - Backend never sees private keys
2. ✅ **Standard Solana pattern** - How all dApps work (Uniswap, Jupiter, etc.)
3. ✅ **Better UX** - Users approve in their wallet
4. ✅ **Cleaner database** - Failed transactions don't leave orphaned records
5. ✅ **More secure** - Backend can't sign arbitrary transactions

## Files Modified

### Backend
- `backend/routes/program.js`
  - Renamed `/initialize-project` → `/build-initialize-project-tx`
  - Changed to return serialized transaction instead of submitting
  - Added `/confirm-project-init` endpoint

### Frontend
- `frontend/components/create/CreateProject.jsx`
  - Added Transaction import
  - Added useConnection hook
  - Updated handleSubmit to sign with wallet
  - Added cleanup on failure
