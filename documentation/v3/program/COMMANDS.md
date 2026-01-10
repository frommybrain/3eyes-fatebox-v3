# Quick Command Reference

## Setup
```bash
cd backend/program
npm install
```

## Build
```bash
anchor build
```

## Test
```bash
# Full test (builds, deploys, tests)
anchor test

# Just run tests (validator must be running)
anchor test --skip-local-validator
```

## Deploy

### Local
```bash
solana-test-validator  # Terminal 1
anchor deploy          # Terminal 2
```

### Devnet
```bash
solana config set --url devnet
solana airdrop 2
anchor build
anchor deploy --provider.cluster devnet
```

### Mainnet
```bash
solana config set --url mainnet-beta
anchor build
anchor deploy --provider.cluster mainnet-beta
```

## Get Program ID
```bash
solana address -k target/deploy/lootbox_platform-keypair.json
```

## Update Program ID
After first deployment, update the ID in:
1. `Anchor.toml` (all clusters)
2. `lib.rs` (`declare_id!`)
3. Database `super_admin_config.lootbox_program_id`

Then rebuild:
```bash
anchor build
```

## Verify Deployment
```bash
# Check program account
solana program show <PROGRAM_ID>

# Check upgrade authority
solana program show <PROGRAM_ID> | grep Authority
```

## Useful Debugging
```bash
# View transaction logs
solana confirm -v <TRANSACTION_SIGNATURE>

# View account data
solana account <ADDRESS>

# Get recent blockhash
solana block-height
```

## Common Issues

### "Program failed to complete"
→ Check logs with `anchor test -- --nocapture`

### "Insufficient funds"
→ Request more SOL: `solana airdrop 2`

### "Account already in use"
→ PDAs are deterministic, make sure you're not trying to create twice

### "Transaction too large"
→ Break into multiple transactions or optimize accounts

## Environment Variables
```bash
# Required in .env or shell
export ANCHOR_PROVIDER_URL=http://localhost:8899
export ANCHOR_WALLET=~/.config/solana/id.json
```
