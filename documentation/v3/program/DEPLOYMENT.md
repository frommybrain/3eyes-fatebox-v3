# Lootbox Platform - Devnet Deployment

## Deployment Information

**Status**: ✅ Successfully Deployed to Devnet
**Date**: January 9, 2026
**Network**: Solana Devnet

### Program Details
```
Program ID: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
Cluster: https://api.devnet.solana.com
Upgrade Authority: 5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn
Deploy Signature: 5gkjkmY8gE8WRC2inD6uXB3wV3WY5yvdCWeh7jZZYoT9hEqCdfEqZG47qAd6qHJrH9tcwZi9int7DhkWjmrxsTVg
```

### Explorer Links
- **Program**: https://explorer.solana.com/address/GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat?cluster=devnet
- **Deploy Transaction**: https://explorer.solana.com/tx/5gkjkmY8gE8WRC2inD6uXB3wV3WY5yvdCWeh7jZZYoT9hEqCdfEqZG47qAd6qHJrH9tcwZi9int7DhkWjmrxsTVg?cluster=devnet

### Security Metadata

The program includes security.txt metadata for responsible disclosure:

**Add Security Metadata** (Devnet):
```bash
cd backend/program
# Edit security.json with your contact details
npx @solana-program/program-metadata@latest write security GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat ./security.json --keypair <path-to-deploy-wallet>
```

**For Mainnet Deployment** (IMPORTANT - DO THIS BEFORE LAUNCH):
```bash
# 1. Update security.json with production details:
#    - Your actual email for security reports
#    - GitHub repository URL
#    - Auditor information (if audited)
#    - Bug bounty program details (if applicable)

# 2. Write security metadata to mainnet program:
npx @solana-program/program-metadata@latest write security <MAINNET_PROGRAM_ID> ./security.json --keypair <deploy-wallet> --cluster mainnet-beta
```

**Verify Security Metadata**:
```bash
npx @solana-program/program-metadata@latest show security GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat --cluster devnet
```

## Program Instructions

The deployed program includes 6 instructions:

1. **initialize_project** - Create a new lootbox project with vault
2. **create_box** - User purchases a lootbox
3. **reveal_box** - Calculate reward based on luck (pseudorandom for now)
4. **settle_box** - Transfer reward from vault to user
5. **withdraw_earnings** - Project owner withdraws accumulated profits
6. **update_project** - Pause/resume project or change box price

## State Accounts

### ProjectConfig (123 bytes)
- Project ID, owner, payment token mint
- Box price, vault authority bump
- Statistics (total boxes, revenue, payouts)
- Active status, timestamps

### BoxInstance (76 bytes)
- Box ID, project ID, owner
- Creation timestamp, luck value
- Reveal/settle status
- Reward amount, jackpot flag

## PDA Seeds

### Project Config
```
["project", project_id_bytes]
```

### Box Instance
```
["box", project_id_bytes, box_id_bytes]
```

### Vault Authority
```
["vault", project_id_bytes, payment_token_mint_pubkey]
```

## Next Steps for Database Integration

### Update super_admin_config table
You need to update the database with the deployed program ID:

```sql
UPDATE super_admin_config
SET lootbox_program_id = 'GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat'
WHERE id = 1;
```

### Verify Configuration
After updating, verify the backend API reads the correct program ID:

```bash
curl http://localhost:3333/api/config
```

Expected response should include:
```json
{
  "lootboxProgramId": "GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat",
  "solanaBetaEndpoint": "https://api.devnet.solana.com",
  ...
}
```

## Testing the Deployment

### Option 1: Via Frontend
1. Update database with program ID (above)
2. Visit your frontend at https://devnet-cats.vercel.app
3. Try creating a project and purchasing a box
4. Monitor transactions on Solana Explorer

### Option 2: Via Backend API
Test the vault PDA derivation endpoint:

```bash
curl -X POST http://localhost:3333/api/vault-pda \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "paymentTokenMint": "So11111111111111111111111111111111111111112"
  }'
```

Expected: Returns vault PDA and bump

### Option 3: Via Anchor Tests (when local validator works)
```bash
cd backend/program
anchor test --skip-deploy
```

## Program Features Status

### ✅ Implemented
- Multi-tenant project support
- PDA-based vault management
- Luck-based reward calculation
- Owner withdrawal system
- Project pause/resume
- Price updates
- Checked arithmetic (no overflow)
- Event emissions

### ⏳ TODO (Not Critical for Initial Testing)
- Switchboard VRF for true randomness
- $DEGENBOX launch fee collection
- $DEGENBOX withdrawal fee
- Admin fee withdrawal to treasury

## Security Notes

- All arithmetic uses checked operations (checked_add, checked_div)
- Vault uses PDA signer pattern (program-controlled)
- Owner-only operations properly gated
- Double-operation prevention (already revealed, already settled)
- Account validation in all instructions

## Useful Commands

### Check Program Info
```bash
solana program show GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat --url devnet
```

### Check Wallet Balance
```bash
solana balance 5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn --url devnet
```

### View Recent Transactions
```bash
solana transaction-history GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat --url devnet
```

### Upgrade Program (if needed)
```bash
cd backend/program
anchor build
anchor upgrade target/deploy/lootbox_platform.so \
  --program-id GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat \
  --provider.cluster devnet \
  --provider.wallet <path-to-upgrade-authority>
```

## IDL Location

The program IDL (Interface Definition Language) is generated at:
```
backend/program/target/idl/lootbox_platform.json
```

This IDL file is needed by:
- Frontend to interact with the program
- Backend API for PDA derivation
- Testing framework

## Troubleshooting

### If transactions fail:
1. Check wallet has enough SOL for rent + gas
2. Verify project is active (not paused)
3. Check vault has enough tokens for payouts
4. Verify PDAs are correctly derived
5. Check Solana Explorer for error details

### If program needs redeployment:
```bash
cd backend/program
anchor build
anchor deploy --provider.cluster devnet --provider.wallet <wallet>
```

Note: Program ID stays the same if using the same keypair

---

**Program Successfully Deployed and Ready for Testing!** 🚀

Next: Update database → Test via frontend → Add VRF + fees
