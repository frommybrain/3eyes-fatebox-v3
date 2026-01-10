# Wallet Clarification

## Deploy Wallet Used

**Wallet Address**: `5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn`
**Current Balance**: ~2.75 SOL (devnet)
**Purpose**: Program upgrade authority & deployment

### Deployment Costs
- **Before deployment**: ~5 SOL
- **Deployment cost**: ~2.24 SOL (program account rent)
- **After deployment**: ~2.75 SOL

### This Wallet Controls
- ✅ Program upgrade authority for `GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat`
- ✅ Can upgrade the program
- ✅ Can change upgrade authority
- ✅ Can close the program (if needed)

### Private Key Location
The private key byte array is stored in:
```
backend/.env
DEPLOY_WALLET_JSON=[5,192,252,210,...]
```

**⚠️ IMPORTANT**: Never commit this to GitHub! It's in `.env` which should be in `.gitignore`.

## Other Wallet Mentioned

**Wallet Address**: `EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh`
**Current Balance**: 2 SOL (devnet)
**Purpose**: Unknown - appears in your Phantom wallet

This wallet was **NOT** used for deployment.

## Wallet Management Best Practices

### For Devnet Testing
- Use the deploy wallet (`5vnjo...`) for all program operations
- Keep at least 1-2 SOL for transactions and upgrades
- Airdrop more if needed: `solana airdrop 2 5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn --url devnet`

### For Mainnet (When Ready)
1. **Generate a new mainnet deploy wallet** (never reuse devnet keys)
2. Fund it with enough SOL for deployment (~3-5 SOL)
3. Store the private key in a hardware wallet or secure key management service
4. Consider using a multisig for upgrade authority
5. Update security.json with real contact info
6. **Get a security audit** before mainnet deployment

## Verify Program Ownership

To verify which wallet owns the program:

```bash
solana program show GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat --url devnet
```

Look for the `Authority:` field - this shows the upgrade authority wallet.

Current output:
```
Program Id: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
Authority: 5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn  ← This wallet controls the program
```

## Quick Reference

| Wallet | Purpose | Balance | Controls Program? |
|--------|---------|---------|------------------|
| `5vnjo...m9Vn` | Deploy wallet | ~2.75 SOL | ✅ YES |
| `EBTBZ...FsGh` | Unknown | 2 SOL | ❌ NO |

---

**Bottom Line**: Your deploy wallet `5vnjo...m9Vn` successfully deployed and owns the program. It currently has 2.75 SOL remaining after spending ~2.24 SOL on the deployment.
