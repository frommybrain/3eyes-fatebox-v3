# Create Test Token on Devnet

## Overview

Before testing the lootbox program, you need:
1. A test SPL token (like USDC, but for testing)
2. Mint some tokens to your owner wallet
3. Use this token as the payment_token_mint in your lootbox projects

## Prerequisites

- Your owner wallet: `5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn`
- Solana CLI configured for devnet
- At least 1-2 SOL in your wallet (for rent + fees)

## Step 1: Create the Token Mint

```bash
# Make sure you're on devnet
solana config set --url devnet

# Create a new token mint
# This creates a new SPL token with 6 decimals (like USDC)
spl-token create-token --decimals 6

# You'll get output like:
# Creating token ABC123...xyz
# Address: <TOKEN_MINT_ADDRESS>
```

**Save the token mint address!** You'll need it for everything.

## Step 2: Create Token Account for Your Wallet

```bash
# Create an Associated Token Account (ATA) for your owner wallet
spl-token create-account <TOKEN_MINT_ADDRESS>

# This creates an ATA that can hold this token
# You'll get output like:
# Creating account XYZ789...
```

## Step 3: Mint Tokens to Your Wallet

```bash
# Mint 1,000,000 tokens to your wallet (1,000,000.000000 with 6 decimals)
spl-token mint <TOKEN_MINT_ADDRESS> 1000000 5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn

# You should see:
# Minting 1000000 tokens
# Token: <TOKEN_MINT_ADDRESS>
# Recipient: 5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn
```

## Step 4: Verify Your Balance

```bash
# Check your token balance
spl-token balance <TOKEN_MINT_ADDRESS> --owner 5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn

# Should show: 1000000
```

## Step 5: Add to Database

Update your database with the test token information:

```sql
-- Update super_admin_config with the test token
UPDATE super_admin_config
SET lootbox_program_id = 'GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat'
WHERE id = 1;

-- If you have a tokens table, add the test token
INSERT INTO tokens (mint_address, symbol, name, decimals, network)
VALUES (
  '<TOKEN_MINT_ADDRESS>',
  'TEST',
  'Test Token',
  6,
  'devnet'
);
```

## Complete Example

Here's a full example session:

```bash
# 1. Set to devnet
solana config set --url devnet

# 2. Create token
spl-token create-token --decimals 6
# Output: Creating token...
#         Address: DTestTokenMint1111111111111111111111111

# 3. Create token account
spl-token create-account DTestTokenMint1111111111111111111111111
# Output: Creating account...

# 4. Mint 1 million tokens
spl-token mint DTestTokenMint1111111111111111111111111 1000000 5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn
# Output: Minting 1000000 tokens...

# 5. Check balance
spl-token balance DTestTokenMint1111111111111111111111111 --owner 5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn
# Output: 1000000
```

## Alternative: Use Existing Devnet USDC

Instead of creating a new token, you can use devnet USDC:

```bash
# Devnet USDC mint address
# 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Create account
spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Request airdrop from Solana faucet (if available)
# Or use this testnet faucet: https://spl-token-faucet.com/?token-name=USDC-Dev
```

## For Testing Lootbox Platform

Once you have tokens, you can:

1. **Create a Project** via your dashboard
   - Set payment_token_mint to your test token address
   - Set box price (e.g., 100 tokens = 100.000000 with 6 decimals)

2. **Fund the Vault**
   - Transfer tokens to the vault PDA
   - Use your backend API endpoint to derive vault address
   - Transfer tokens there so users can win payouts

3. **Test Purchase Flow**
   - User buys box (pays 100 tokens)
   - Tokens go to vault
   - User reveals box
   - User settles box
   - User receives reward from vault

## Token Authority

You (5vnjo...m9Vn) are the mint authority for the test token, which means:
- ✅ You can mint unlimited tokens
- ✅ You can distribute to test users
- ✅ You can test with different amounts
- ✅ Free to experiment on devnet!

## Save These Values

Create a `.env.local` or note file with:

```bash
# Test Token Info
TEST_TOKEN_MINT=<YOUR_TOKEN_MINT_ADDRESS>
TEST_TOKEN_DECIMALS=6
TEST_TOKEN_SYMBOL=TEST

# Program Info
LOOTBOX_PROGRAM_ID=GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat

# Owner Wallet
OWNER_WALLET=5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn
```

## Troubleshooting

### "Insufficient funds"
- Make sure you have enough SOL for rent
- Each token account requires ~0.002 SOL rent
- Token mint requires ~0.001 SOL

### "Account not found"
- Create the token account first with `spl-token create-account`
- Each wallet needs an ATA (Associated Token Account) for each token type

### Can't see tokens in Phantom
- Phantom may not show custom tokens automatically
- You may need to manually add the token by its mint address
- Go to Phantom settings → Manage Token List → Add Custom Token

---

**Next**: Once you have tokens, you can start testing the lootbox program!
