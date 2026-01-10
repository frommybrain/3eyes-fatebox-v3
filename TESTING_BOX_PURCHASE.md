# Testing Box Purchase on Localhost

## How to Access Project Pages on Localhost

Since project pages are designed to work with subdomains (e.g., `cats.degenbox.fun`), you have **two options** for testing locally:

### Option 1: Direct URL Path (Recommended for Testing)

Access the project page directly using the subdomain as a URL parameter:

```
http://localhost:3000/project/devnet-cats
```

Replace `devnet-cats` with your actual project subdomain from the database.

**Example URLs:**
- `http://localhost:3000/project/devnet-cats`
- `http://localhost:3000/project/devnet-myproject`
- `http://localhost:3000/project/mainnet-lootbox` (for mainnet projects)

### Option 2: Local Subdomain Setup (Advanced)

If you want to test the actual subdomain routing, you can use `/etc/hosts`:

1. Edit your hosts file:
   ```bash
   sudo nano /etc/hosts
   ```

2. Add entries:
   ```
   127.0.0.1  cats.localhost
   127.0.0.1  devnet-cats.localhost
   ```

3. Access via:
   ```
   http://cats.localhost:3000
   http://devnet-cats.localhost:3000
   ```

**Note**: This requires Next.js middleware to detect subdomains and route accordingly.

---

## Complete Testing Guide

### Prerequisites

1. **Backend running**: `cd backend && npm start`
2. **Frontend running**: `cd frontend && npm run dev`
3. **Wallet with funds**:
   - Connected Solana wallet
   - SOL for gas (~0.002 SOL)
   - Payment tokens (e.g., TCATS, USDC, etc.)

### Step-by-Step Test

#### 1. Find Your Project Subdomain

Check your database for an active project:

```sql
SELECT project_numeric_id, project_name, subdomain, payment_token_symbol, box_price
FROM projects
WHERE is_active = true
AND vault_pda IS NOT NULL
LIMIT 1;
```

Example result:
```
project_numeric_id: 9
project_name: CATS
subdomain: devnet-cats
payment_token_symbol: TCATS
box_price: 100000000000 (100 tokens with 9 decimals)
```

#### 2. Access the Project Page

Navigate to:
```
http://localhost:3000/project/devnet-cats
```

You should see:
- Project name and description
- Box price display
- "Buy Box" button
- Stats (total boxes, jackpots, vault balance)
- 3D background (MainCanvas)

#### 3. Connect Your Wallet

Click the wallet button in the top-right corner and connect your Solana wallet.

**Verify you have**:
- At least 0.002 SOL for transaction fees
- Enough payment tokens to buy a box (check box price on page)

#### 4. Purchase a Box

1. Click the **"🎲 Buy Box"** button
2. Your wallet will prompt you to sign the transaction
3. **Review the transaction details**:
   - Token transfer from your wallet to vault
   - Amount = box price
   - Estimated fee ~0.000005 SOL

4. Approve the transaction
5. Wait for confirmation (~1-2 seconds on devnet)

#### 5. Verify Purchase Success

You should see:
- Success alert with transaction signature
- Link to Solana Explorer
- Page stats updated (Total Boxes incremented)

**Check the console** (F12):
```
🎲 Purchasing box...
✅ Transaction built: {boxId: 0, boxInstancePDA: "..."}
🔑 Sending transaction for signing...
📤 Transaction sent: [signature]
✅ Transaction confirmed!
```

#### 6. Verify in Database

```sql
SELECT * FROM boxes
WHERE owner_wallet = 'YOUR_WALLET_ADDRESS'
ORDER BY created_at DESC
LIMIT 1;
```

You should see:
- Newly created box record
- `box_number` matches the boxId from transaction
- `owner_wallet` is your wallet address
- `box_result` = 0 (pending reveal)

#### 7. Verify On-Chain

Check the transaction on Solana Explorer (use the link from success alert):
- Should show token transfer to vault
- Should show BoxInstance PDA creation

#### 8. Check Vault Balance

The vault balance should have increased by the box price.

**Option A: Frontend Dashboard**
```
http://localhost:3000/dashboard
```
Check "Vault Balance" stat on your project card.

**Option B: Direct API Call**
```bash
curl http://localhost:3333/api/vault/balance/9
```

Expected response:
```json
{
  "success": true,
  "balance": "100000000000",
  "formatted": "100.000000000",
  "tokenMint": "BnL9bDB6yCUwFBckW5Lu3TZjaZobmqxecqnY85X1ti1h",
  "tokenSymbol": "TCATS",
  "decimals": 9
}
```

---

## Testing Multiple Purchases

Try buying multiple boxes to verify:
- Box IDs increment correctly (0, 1, 2, ...)
- Vault balance increases with each purchase
- Each box gets its own PDA
- Stats update correctly

---

## Common Issues & Solutions

### Issue: "Please connect your wallet first"
**Solution**: Click the wallet connect button in the navbar.

### Issue: "Transaction failed: Insufficient funds"
**Solution**:
- Check you have enough SOL for gas
- Check you have enough payment tokens
- Use `spl-token balance` to verify token balance

### Issue: "Project not found"
**Solution**:
- Verify subdomain spelling
- Check project exists: `SELECT * FROM projects WHERE subdomain = 'devnet-cats'`
- Ensure project has `vault_pda` (is initialized on-chain)

### Issue: "Failed to build transaction"
**Solution**:
- Check backend is running: `curl http://localhost:3333/health`
- Check backend logs for errors
- Verify project is initialized on-chain

### Issue: "Signature verification failed"
**Solution**:
- This is likely a stale blockhash
- The code already handles this by getting a fresh blockhash
- If persists, check your RPC connection

### Issue: Wallet transaction times out
**Solution**:
- You may have rejected the transaction
- Refresh page and try again
- Check devnet is operational: https://status.solana.com/

### Issue: Box appears purchased but not in database
**Solution**:
- Transaction succeeded on-chain but backend confirmation failed
- Manually insert the box:
```sql
INSERT INTO boxes (project_id, box_number, owner_wallet, created_at)
SELECT id, [BOX_NUMBER], '[YOUR_WALLET]', NOW()
FROM projects WHERE project_numeric_id = [PROJECT_ID];
```

---

## API Endpoints Reference

### Build Create Box Transaction
```bash
curl -X POST http://localhost:3333/api/program/build-create-box-tx \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 9,
    "buyerWallet": "YOUR_WALLET_ADDRESS"
  }'
```

### Confirm Box Creation
```bash
curl -X POST http://localhost:3333/api/program/confirm-box-creation \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 9,
    "boxId": 0,
    "buyerWallet": "YOUR_WALLET_ADDRESS",
    "signature": "TRANSACTION_SIGNATURE",
    "boxInstancePDA": "BOX_INSTANCE_PDA_ADDRESS"
  }'
```

### Get Vault Balance
```bash
curl http://localhost:3333/api/vault/balance/9
```

---

## Debug Checklist

Before reporting an issue, verify:

- [ ] Backend is running (`http://localhost:3333/health` returns OK)
- [ ] Frontend is running (`http://localhost:3000` loads)
- [ ] Wallet is connected
- [ ] Wallet has sufficient SOL for gas
- [ ] Wallet has sufficient payment tokens
- [ ] Project exists in database
- [ ] Project has `vault_pda` (is initialized on-chain)
- [ ] Project `is_active = true`
- [ ] Network matches (devnet vs mainnet)
- [ ] Browser console shows no errors (F12)

---

## Next Steps After Testing

Once box purchases work:
1. Test on different projects with different tokens
2. Test concurrent purchases (multiple users)
3. Test error scenarios (insufficient funds, rejected transaction)
4. Implement box reveal flow (VRF integration)
5. Add user box history page
6. Deploy to production

---

## Production Deployment Notes

Before deploying to production:

1. **Update NEXT_PUBLIC_BACKEND_URL** in frontend `.env`:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
   ```

2. **Update subdomain routing** to handle real subdomains:
   - Configure DNS wildcard: `*.degenbox.fun → your-server`
   - Add Next.js middleware to detect subdomain
   - Route `cats.degenbox.fun` → `/project/cats`

3. **Update smart contract** to mainnet program ID

4. **Test thoroughly** on devnet first!

---

## Quick Test Script

```bash
# 1. Start backend
cd backend && npm start &

# 2. Start frontend
cd ../frontend && npm run dev &

# 3. Wait for servers to start
sleep 5

# 4. Test health
curl http://localhost:3333/health

# 5. Open browser
open http://localhost:3000/project/devnet-cats
```

---

## Success Criteria

A successful test should:
✅ Load project page with correct data
✅ Show box price and stats
✅ Connect wallet successfully
✅ Sign transaction in wallet
✅ Confirm transaction on-chain
✅ Record box in database
✅ Update vault balance
✅ Update project stats (total boxes)
✅ Display success message with explorer link

---

## Questions?

Check the logs:
- **Frontend**: Browser console (F12 → Console tab)
- **Backend**: Terminal where `npm start` is running
- **On-chain**: Solana Explorer (use transaction signature)
