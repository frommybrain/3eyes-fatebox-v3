# Next Steps - Testing the Lootbox Platform

## Where You Are Now ✅

### Completed:
1. ✅ Rust Anchor program deployed to devnet (`GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat`)
2. ✅ Owner wallet configured (`5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn`)
3. ✅ Test tokens created:
   - **t3EYES1**: `FAGiPu3sSu3mtc6pi8GzroogZp1tFBgdWeAqQZYwtTZS` (fee token, 1B supply)
   - **tCATS**: `BnL9bDB6yCUwFBckW5Lu3TZjaZobmqxecqnY85X1ti1h` (project token)
4. ✅ Test wallets funded:
   - Owner wallet: Has t3EYES1
   - Test user wallet: Has tCATS + 10,000 t3EYES1
5. ✅ Database configured with program ID
6. ✅ Backend API running (port 3333)
7. ✅ Backend has vault routes (/api/vault) and project routes (/api/projects)

### What's Missing:
❌ **Backend endpoints that call the Anchor program's instructions**

Your backend can:
- ✅ Create projects in the database
- ✅ Derive vault PDAs
- ✅ Check vault balances

Your backend CANNOT yet:
- ❌ Call `initialize_project` instruction
- ❌ Call `create_box` instruction
- ❌ Call `reveal_box` instruction
- ❌ Call `settle_box` instruction

## The Gap: Anchor TypeScript Client

Your Rust program is deployed, but your backend needs to **use Anchor's TypeScript client** to call it.

### What You Need:

1. **Anchor IDL** - Generated when you built the program
   - Location: `backend/program/target/idl/lootbox_platform.json`
   - This describes the program's interface

2. **Anchor TS Client** - Code that uses the IDL to call the program
   - Initialize with: `@coral-xyz/anchor` package
   - Uses the program IDL to generate TypeScript types
   - Sends transactions to the deployed program

## Next Step: Test PDA Derivation First

Before building the full endpoints, let's verify the **PDA derivation works correctly**. This is the foundation of everything.

### Test 1: Derive Vault PDA Manually

```bash
# Start your backend
cd backend
npm run dev

# Test PDA derivation
curl -X POST http://localhost:3333/api/vault/derive \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "paymentTokenMint": "BnL9bDB6yCUwFBckW5Lu3TZjaZobmqxecqnY85X1ti1h"
  }'
```

Expected response:
```json
{
  "success": true,
  "vault_authority_pda": "...",
  "bump": 255,
  "seeds": ["vault", <project_id_bytes>, <token_mint_bytes>]
}
```

### Why This is Important:

The PDA must match EXACTLY what the Anchor program derives on-chain. If they don't match:
- ✅ Transactions will fail with "invalid seeds"
- ✅ You won't be able to create projects or boxes
- ✅ Vault transfers won't work

## After PDA Test Passes: Build Anchor Client Endpoints

Once PDAs are correct, you need these endpoints:

### 1. POST /api/program/initialize-project
Calls the Anchor program's `initialize_project` instruction:
- Creates ProjectConfig PDA
- Creates vault authority PDA
- Collects launch fee in t3EYES1

### 2. POST /api/program/create-box
Calls `create_box` instruction:
- User pays box_price in tCATS
- Tokens transfer to vault
- BoxInstance PDA created
- Luck calculated based on time

### 3. POST /api/program/reveal-box
Calls `reveal_box` instruction:
- Calculates reward based on luck
- Pseudorandom percentage applied
- Jackpot chance at max luck

### 4. POST /api/program/settle-box
Calls `settle_box` instruction:
- Transfers reward from vault to user
- Uses vault authority PDA signer
- Marks box as settled

## Recommended Testing Order

1. **Test PDA Derivation** ← YOU ARE HERE
   - Ensure vault PDAs match on-chain derivation
   - Test with different project IDs and token mints

2. **Build Initialize Project Endpoint**
   - Integrate Anchor TS client
   - Call `initialize_project` instruction
   - Verify ProjectConfig PDA created on-chain

3. **Fund Vault Manually**
   - Use `spl-token transfer` to fund vault
   - Verify balance with `/api/vault/:projectId/balance`

4. **Build Create Box Endpoint**
   - Call `create_box` instruction
   - Verify token transfer to vault
   - Check BoxInstance PDA created

5. **Build Reveal & Settle Endpoints**
   - Test reveal logic
   - Test settle with vault PDA signer
   - Verify rewards paid out

6. **Full Flow Test**
   - User creates project (pays t3EYES1 fee)
   - Owner funds vault with tCATS
   - User2 buys box (pays tCATS)
   - User2 reveals, settles, receives reward

## Files You'll Need to Create

### 1. `backend/lib/anchorClient.js`
Initializes the Anchor client with your program:

```javascript
import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { getNetworkConfig } from './getNetworkConfig.js';

// Load program IDL
const idl = JSON.parse(readFileSync('./program/target/idl/lootbox_platform.json', 'utf8'));

export async function getAnchorProgram() {
  const config = await getNetworkConfig();
  const connection = new Connection(config.rpcUrl, 'confirmed');

  // Load deploy wallet keypair
  const deployWallet = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(process.env.DEPLOY_WALLET_JSON))
  );

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(deployWallet),
    { commitment: 'confirmed' }
  );

  const program = new anchor.Program(idl, config.programId, provider);

  return { program, provider, connection };
}
```

### 2. `backend/routes/program.js`
Endpoints that call the Anchor program:

```javascript
import express from 'express';
import { getAnchorProgram } from '../lib/anchorClient.js';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

const router = express.Router();

// POST /api/program/initialize-project
router.post('/initialize-project', async (req, res) => {
  try {
    const { projectId, boxPrice, paymentTokenMint } = req.body;

    const { program, provider } = await getAnchorProgram();

    // Derive PDAs
    const [projectConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from('project'), new anchor.BN(projectId).toArrayLike(Buffer, 'le', 8)],
      program.programId
    );

    const [vaultAuthority, bump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        new anchor.BN(projectId).toArrayLike(Buffer, 'le', 8),
        new PublicKey(paymentTokenMint).toBuffer()
      ],
      program.programId
    );

    // Call initialize_project
    const tx = await program.methods
      .initializeProject(new anchor.BN(projectId), new anchor.BN(boxPrice))
      .accounts({
        projectConfig,
        vaultAuthority,
        owner: provider.wallet.publicKey,
        paymentTokenMint: new PublicKey(paymentTokenMint),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    res.json({
      success: true,
      signature: tx,
      projectConfig: projectConfig.toString(),
      vaultAuthority: vaultAuthority.toString(),
      bump
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### 3. Update `backend/server.js`
```javascript
import programRoutes from './routes/program.js';
app.use('/api/program', programRoutes);
```

## Summary

**You're at the critical junction**: The Rust program is deployed and ready, but your backend can't talk to it yet.

**Next step**: Build the Anchor TypeScript client integration so your backend can call the program instructions.

**Start with**: Testing PDA derivation to ensure your backend and on-chain program agree on addresses.

Once PDAs are correct, build the `initialize_project` endpoint and test creating a project on-chain!

---

**Priority**: Test PDA derivation first - everything depends on this being correct.
