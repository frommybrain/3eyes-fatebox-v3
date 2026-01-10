# Lootbox Platform Testing Guide

## Prerequisites Checklist

Before testing, ensure you have:

- ✅ Owner wallet in Phantom: `5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn`
- ✅ Updated database `super_admin_config.lootbox_program_id` = `GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat`
- ✅ Updated database `super_admin_config.super_admin_wallet` = `5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn`
- ⏳ Test token created on devnet
- ⏳ Test tokens minted to owner wallet
- ✅ Backend API running (port 3333)
- ✅ Frontend deployed/running

## Testing Flow

### Phase 1: Setup & Configuration

#### 1.1 Create Test Token

```bash
# Create token with 6 decimals
spl-token create-token --decimals 6

# Save the token mint address!
# Example: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

#### 1.2 Fund Owner Wallet

```bash
# Create token account for owner
spl-token create-account <TOKEN_MINT>

# Mint 1 million tokens to owner
spl-token mint <TOKEN_MINT> 1000000 5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn

# Verify balance
spl-token balance <TOKEN_MINT> --owner 5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn
```

#### 1.3 Update Database

```sql
-- Set program ID
UPDATE super_admin_config
SET lootbox_program_id = 'GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat'
WHERE id = 1;

-- Verify
SELECT lootbox_program_id, super_admin_wallet FROM super_admin_config;
```

### Phase 2: Create Project

#### 2.1 Via Frontend Dashboard

1. Go to your dashboard (as super admin)
2. Navigate to project creation
3. Fill in project details:
   - **Project Name**: "Test Lootbox Project"
   - **Payment Token Mint**: `<YOUR_TOKEN_MINT>`
   - **Box Price**: 100 (= 100.000000 tokens with 6 decimals)

#### 2.2 Verify Project in Database

```sql
SELECT project_id, project_name, vault_wallet, payment_token_mint, box_price
FROM projects
WHERE project_id = 1;
```

You should see:
- `vault_wallet` = A PDA derived from the program
- `payment_token_mint` = Your test token mint
- `box_price` = 100000000 (100 with 6 decimals = 100 * 10^6)

### Phase 3: Initialize Project On-Chain

This calls the `initialize_project` instruction on the Anchor program.

#### 3.1 Via Backend API

```bash
curl -X POST http://localhost:3333/api/projects/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "paymentTokenMint": "<YOUR_TOKEN_MINT>",
    "boxPrice": 100000000
  }'
```

Expected response:
```json
{
  "success": true,
  "signature": "...",
  "projectConfigPDA": "...",
  "vaultPDA": "...",
  "vaultAuthorityPDA": "..."
}
```

#### 3.2 Verify On-Chain

```bash
# Check the project config account exists
solana account <PROJECT_CONFIG_PDA> --url devnet

# Check the vault token account exists
solana account <VAULT_PDA> --url devnet
```

### Phase 4: Fund the Vault

The vault needs tokens so users can win payouts.

#### 4.1 Get Vault Address

```bash
# Via backend API
curl -X POST http://localhost:3333/api/vault-pda \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "paymentTokenMint": "<YOUR_TOKEN_MINT>"
  }'
```

Expected response:
```json
{
  "vaultPDA": "...",
  "vaultAuthorityPDA": "...",
  "bump": 255
}
```

#### 4.2 Transfer Tokens to Vault

```bash
# Transfer 10,000 tokens to vault for payouts
spl-token transfer <TOKEN_MINT> 10000 <VAULT_PDA> \
  --owner 5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn \
  --url devnet

# Verify vault balance
spl-token balance <TOKEN_MINT> --owner <VAULT_PDA> --url devnet
```

### Phase 5: Test Box Purchase Flow

#### 5.1 Create Test User

For realistic testing, create a second wallet:

```bash
# Generate test user wallet
solana-keygen new --outfile test-user.json

# Get public key
solana-keygen pubkey test-user.json
# Example output: UserABC123...

# Airdrop SOL for fees
solana airdrop 1 <TEST_USER_PUBKEY> --url devnet

# Create token account for test user
spl-token create-account <TOKEN_MINT> \
  --owner test-user.json

# Give test user 1000 tokens to buy boxes
spl-token transfer <TOKEN_MINT> 1000 <TEST_USER_PUBKEY> \
  --owner 5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn
```

#### 5.2 Buy Box (create_box instruction)

Via backend API or frontend:

```bash
curl -X POST http://localhost:3333/api/boxes/create \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "buyerWallet": "<TEST_USER_PUBKEY>"
  }'
```

Expected response:
```json
{
  "success": true,
  "boxId": 1,
  "signature": "...",
  "boxPDA": "..."
}
```

**Verify**:
- Test user balance decreased by 100 tokens
- Vault balance increased by 100 tokens
- Database `boxes` table has new entry

#### 5.3 Reveal Box (reveal_box instruction)

```bash
curl -X POST http://localhost:3333/api/boxes/reveal \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "boxId": 1,
    "ownerWallet": "<TEST_USER_PUBKEY>"
  }'
```

Expected response:
```json
{
  "success": true,
  "rewardAmount": 150000000,
  "isJackpot": false,
  "luck": 8,
  "signature": "..."
}
```

**Verify**:
- Box state updated: `revealed = true`
- Reward amount calculated based on luck
- Database `boxes` table updated

#### 5.4 Settle Box (settle_box instruction)

```bash
curl -X POST http://localhost:3333/api/boxes/settle \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "boxId": 1,
    "ownerWallet": "<TEST_USER_PUBKEY>"
  }'
```

Expected response:
```json
{
  "success": true,
  "rewardAmount": 150000000,
  "signature": "..."
}
```

**Verify**:
- Test user token balance increased by reward amount
- Vault balance decreased by reward amount
- Box state updated: `settled = true`

### Phase 6: Test Owner Operations

#### 6.1 Withdraw Earnings (withdraw_earnings instruction)

Project owner can withdraw accumulated profits:

```bash
curl -X POST http://localhost:3333/api/projects/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "amount": 50000000,
    "ownerWallet": "5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn"
  }'
```

**Verify**:
- Owner wallet balance increased
- Vault balance decreased
- Project stats updated

#### 6.2 Update Project (update_project instruction)

Change box price:

```bash
curl -X POST http://localhost:3333/api/projects/update \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "newBoxPrice": 200000000,
    "ownerWallet": "5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn"
  }'
```

Pause project:

```bash
curl -X POST http://localhost:3333/api/projects/pause \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "ownerWallet": "5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn"
  }'
```

### Phase 7: Test Error Cases

#### 7.1 Non-Owner Tries to Withdraw

Should fail with "NotProjectOwner" error:

```bash
curl -X POST http://localhost:3333/api/projects/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "amount": 50000000,
    "ownerWallet": "<TEST_USER_PUBKEY>"
  }'
```

#### 7.2 Double Reveal

Should fail with "BoxAlreadyRevealed" error:

```bash
# Try revealing same box twice
curl -X POST http://localhost:3333/api/boxes/reveal \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "boxId": 1,
    "ownerWallet": "<TEST_USER_PUBKEY>"
  }'
```

#### 7.3 Buy Box from Paused Project

Should fail with "ProjectInactive" error:

```bash
# First pause the project
curl -X POST http://localhost:3333/api/projects/pause \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "ownerWallet": "5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn"
  }'

# Try to buy box (should fail)
curl -X POST http://localhost:3333/api/boxes/create \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "buyerWallet": "<TEST_USER_PUBKEY>"
  }'
```

## Expected Results Summary

| Test | Expected Outcome |
|------|------------------|
| Create project | ✅ Project created in DB, on-chain account created |
| Fund vault | ✅ Vault receives tokens |
| Buy box | ✅ User pays 100 tokens, vault receives, box PDA created |
| Reveal box | ✅ Reward calculated based on luck, box state updated |
| Settle box | ✅ User receives reward, vault balance decreases |
| Withdraw earnings | ✅ Owner receives profits from vault |
| Update price | ✅ Box price changes, future purchases use new price |
| Pause project | ✅ New box purchases fail |
| Non-owner withdraw | ❌ Fails with NotProjectOwner |
| Double reveal | ❌ Fails with BoxAlreadyRevealed |
| Buy from paused | ❌ Fails with ProjectInactive |

## Monitoring & Debugging

### Check Solana Explorer

Every transaction signature can be viewed on:
```
https://explorer.solana.com/tx/<SIGNATURE>?cluster=devnet
```

### Check Program Logs

```bash
solana logs GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat --url devnet
```

### Check Account Data

```bash
# Check project config
solana account <PROJECT_CONFIG_PDA> --url devnet --output json

# Check box instance
solana account <BOX_PDA> --url devnet --output json

# Check vault
spl-token accounts <TOKEN_MINT> --owner <VAULT_AUTHORITY_PDA> --url devnet
```

## Common Issues

### "Account not found"
- Make sure you called `initialize_project` first
- Verify the PDA derivation is correct

### "Insufficient funds"
- Check vault has enough tokens for payouts
- Check user has enough tokens to buy box
- Check wallets have enough SOL for fees

### "Invalid owner"
- Make sure you're using the correct wallet keypair
- Verify wallet signatures match

### "Program failed to complete"
- Check program logs for detailed error
- Verify all accounts are passed correctly
- Check account sizes are sufficient

---

**Next**: Once testing passes, you can add Switchboard VRF for real randomness and $DEGENBOX fees!
