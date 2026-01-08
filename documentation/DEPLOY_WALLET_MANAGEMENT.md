# Deploy Wallet Management Strategy

## Problem

The deploy wallet is used to:
1. Deploy the Rust program to devnet/mainnet
2. Pay for program deployment (~5-10 SOL)
3. Potentially sign certain platform transactions

**Previous approach had issues**:
- Local file path: `/Users/samskirrow/.config/solana/devnet.json`
- Breaks in production (file doesn't exist)
- Easy to forget to set up production version
- Hardcoded paths in multiple places
- Security risk (committing keypair to git)

**We need**:
- One wallet for both devnet AND mainnet deployments
- Easy to use locally
- Easy to use in production (Render)
- No hardcoded file paths
- Secure (never committed to git)

---

## Solution: Environment Variable Strategy

### Key Insight

**Store the keypair as a JSON array in an environment variable.**

This works identically in:
- Local development (`.env` file)
- Production (Render environment variables)
- No file paths needed
- Can't accidentally commit (`.env` in `.gitignore`)

---

## Step 1: Generate NEW Deploy Wallet

**Why new wallet?**
- Fresh start for the new platform
- No confusion with old FateBox v2 wallet
- Can be funded with exact amount needed

**Generate it:**

```bash
# Generate new keypair
solana-keygen new --outfile deploy-wallet.json

# IMPORTANT: Save the seed phrase in a password manager!
# This is shown once during generation

# View the public key
solana-keygen pubkey deploy-wallet.json
# Example output: 9vHJ7x7X... (save this)

# Get the keypair array
cat deploy-wallet.json
# Example: [123,45,67,89,...]
```

**Fund it:**
```bash
# Devnet (free)
solana airdrop 5 9vHJ7x7X... --url devnet

# Mainnet (need to send SOL)
# Send ~10 SOL to 9vHJ7x7X... for deployment
```

---

## Step 2: Store in Environment Variables

### Local Development (.env)

Create/update `.env` file in project root:

```bash
# Deploy Wallet (NEVER commit this file!)
DEPLOY_WALLET_PUBKEY=9vHJ7x7X7Fz3FX5w5NvQq1Z8bVmDxKmE2uA1eJ4wXyZ
DEPLOY_WALLET_JSON=[123,45,67,89,12,34,56,78,90,123,45,67,89,12,34,56,78,90,123,45,67,89,12,34,56,78,90,123,45,67,89,12,34,56,78,90,123,45,67,89,12,34,56,78,90,123,45,67,89,12,34,56,78,90,123,45,67]

# Admin Wallet (public key only, safe to commit)
ADMIN_WALLET=C9t218MuHcsKPFMZQLvVdnPMRP5AYGRAYc8oLhshH3aF

# Solana Config
SOLANA_NETWORK=devnet
RPC_URL=https://api.devnet.solana.com

# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your_anon_key

# Server
PORT=3001
NODE_ENV=development
```

**Add to `.gitignore`** (if not already):
```
.env
.env.local
.env.production
deploy-wallet.json
*.json
!package.json
!package-lock.json
```

---

### Production (Render)

In Render dashboard, add environment variables:

```
DEPLOY_WALLET_PUBKEY = 9vHJ7x7X7Fz3FX5w5NvQq1Z8bVmDxKmE2uA1eJ4wXyZ
DEPLOY_WALLET_JSON = [123,45,67,89,12,34,56,78,90,123,45,67,89,12,34,56,78,90,123,45,67,89,12,34,56,78,90,123,45,67,89,12,34,56,78,90,123,45,67,89,12,34,56,78,90,123,45,67,89,12,34,56,78,90,123,45,67]
```

**Exactly the same format as local!**

---

## Step 3: Load Keypair in Code

### Backend: Universal Loader

```javascript
// lib/loadDeployWallet.js
const { Keypair } = require('@solana/web3.js');

/**
 * Load deploy wallet from environment variable
 * Works in both local and production
 */
function loadDeployWallet() {
    const keypairJson = process.env.DEPLOY_WALLET_JSON;

    if (!keypairJson) {
        throw new Error(
            'DEPLOY_WALLET_JSON environment variable not set. ' +
            'Generate a keypair and add it to your .env file.'
        );
    }

    try {
        // Parse JSON array
        const keypairArray = JSON.parse(keypairJson);

        // Validate it's an array of numbers
        if (!Array.isArray(keypairArray) || keypairArray.length !== 64) {
            throw new Error('Invalid keypair format. Must be array of 64 numbers.');
        }

        // Create Keypair from array
        const keypair = Keypair.fromSecretKey(new Uint8Array(keypairArray));

        // Verify public key matches (if provided)
        if (process.env.DEPLOY_WALLET_PUBKEY) {
            const expectedPubkey = process.env.DEPLOY_WALLET_PUBKEY;
            const actualPubkey = keypair.publicKey.toString();

            if (expectedPubkey !== actualPubkey) {
                throw new Error(
                    `Deploy wallet public key mismatch!\n` +
                    `Expected: ${expectedPubkey}\n` +
                    `Actual: ${actualPubkey}`
                );
            }
        }

        console.log('✅ Deploy wallet loaded:', keypair.publicKey.toString());
        return keypair;

    } catch (error) {
        throw new Error(`Failed to load deploy wallet: ${error.message}`);
    }
}

module.exports = { loadDeployWallet };
```

**Usage in backend routes**:

```javascript
const { loadDeployWallet } = require('../lib/loadDeployWallet');

// In any route that needs the deploy wallet
router.post('/some-route', async (req, res) => {
    try {
        const deployWallet = loadDeployWallet();

        // Use it
        const tx = await program.methods
            .someInstruction()
            .accounts({
                authority: deployWallet.publicKey,
                // ...
            })
            .signers([deployWallet])
            .rpc();

        return res.json({ success: true, tx });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

---

### Anchor Deployment: Use Environment Variable

Update `Anchor.toml`:

```toml
[toolchain]

[features]
seeds = false
skip-lint = false

[programs.devnet]
lootbox_platform = "PROGRAM_ID_HERE"

[programs.mainnet]
lootbox_platform = "PROGRAM_ID_HERE"  # Same ID if using same deploy wallet

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"  # Or "mainnet" when deploying to mainnet
wallet = "./deploy-wallet.json"  # Temporary file generated from env var

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

**Deploy script that uses environment variable**:

```bash
#!/bin/bash
# scripts/deploy.sh

set -e  # Exit on error

# Check if DEPLOY_WALLET_JSON is set
if [ -z "$DEPLOY_WALLET_JSON" ]; then
    echo "Error: DEPLOY_WALLET_JSON environment variable not set"
    exit 1
fi

# Check which network to deploy to
if [ "$1" == "mainnet" ]; then
    NETWORK="mainnet-beta"
    echo "🚀 Deploying to MAINNET"
    read -p "Are you sure? This will cost ~10 SOL. Type 'yes' to confirm: " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Deployment cancelled"
        exit 0
    fi
else
    NETWORK="devnet"
    echo "🧪 Deploying to DEVNET"
fi

# Create temporary wallet file from environment variable
echo $DEPLOY_WALLET_JSON > deploy-wallet-temp.json

# Set Anchor to use this wallet
export ANCHOR_WALLET="./deploy-wallet-temp.json"

# Build the program
echo "Building program..."
anchor build

# Deploy to the network
echo "Deploying to $NETWORK..."
anchor deploy --provider.cluster $NETWORK

# Get the program ID
PROGRAM_ID=$(solana address -k target/deploy/lootbox_platform-keypair.json)
echo "✅ Program deployed!"
echo "Program ID: $PROGRAM_ID"

# Clean up temporary wallet file
rm deploy-wallet-temp.json

# Update database with program ID
echo ""
echo "Next steps:"
echo "1. Update super_admin_config.lootbox_program_id in database"
echo "2. Run: psql -c \"UPDATE super_admin_config SET lootbox_program_id = '$PROGRAM_ID';\""
```

**Make it executable**:
```bash
chmod +x scripts/deploy.sh
```

**Usage**:
```bash
# Deploy to devnet
./scripts/deploy.sh

# Deploy to mainnet (requires confirmation)
./scripts/deploy.sh mainnet
```

---

## Step 4: Verification Script

Create a script to verify wallet setup:

```javascript
// scripts/verify-wallet.js
require('dotenv').config();
const { Keypair, Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');

async function verifyWallet() {
    console.log('🔍 Verifying deploy wallet setup...\n');

    // Check environment variable
    if (!process.env.DEPLOY_WALLET_JSON) {
        console.error('❌ DEPLOY_WALLET_JSON not set in environment');
        process.exit(1);
    }

    try {
        // Parse keypair
        const keypairArray = JSON.parse(process.env.DEPLOY_WALLET_JSON);
        const keypair = Keypair.fromSecretKey(new Uint8Array(keypairArray));
        const pubkey = keypair.publicKey.toString();

        console.log('✅ Keypair loaded successfully');
        console.log(`   Public Key: ${pubkey}`);

        // Verify public key matches (if set)
        if (process.env.DEPLOY_WALLET_PUBKEY) {
            if (pubkey === process.env.DEPLOY_WALLET_PUBKEY) {
                console.log('✅ Public key matches DEPLOY_WALLET_PUBKEY');
            } else {
                console.error('❌ Public key does NOT match DEPLOY_WALLET_PUBKEY!');
                console.error(`   Expected: ${process.env.DEPLOY_WALLET_PUBKEY}`);
                console.error(`   Actual:   ${pubkey}`);
                process.exit(1);
            }
        }

        // Check balance on devnet
        console.log('\n📊 Checking balance on devnet...');
        const devnetConnection = new Connection('https://api.devnet.solana.com', 'confirmed');
        const devnetBalance = await devnetConnection.getBalance(keypair.publicKey);
        console.log(`   Devnet: ${devnetBalance / LAMPORTS_PER_SOL} SOL`);

        if (devnetBalance === 0) {
            console.log('   ⚠️  No devnet balance. Run: solana airdrop 5 ' + pubkey + ' --url devnet');
        }

        // Check balance on mainnet
        console.log('\n📊 Checking balance on mainnet...');
        const mainnetConnection = new Connection(
            process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
            'confirmed'
        );
        const mainnetBalance = await mainnetConnection.getBalance(keypair.publicKey);
        console.log(`   Mainnet: ${mainnetBalance / LAMPORTS_PER_SOL} SOL`);

        if (mainnetBalance < 10 * LAMPORTS_PER_SOL) {
            console.log('   ⚠️  Insufficient mainnet balance for deployment (need ~10 SOL)');
        }

        console.log('\n✅ All checks passed!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

verifyWallet();
```

**Run it**:
```bash
node scripts/verify-wallet.js
```

**Expected output**:
```
🔍 Verifying deploy wallet setup...

✅ Keypair loaded successfully
   Public Key: 9vHJ7x7X7Fz3FX5w5NvQq1Z8bVmDxKmE2uA1eJ4wXyZ
✅ Public key matches DEPLOY_WALLET_PUBKEY

📊 Checking balance on devnet...
   Devnet: 5.0 SOL

📊 Checking balance on mainnet...
   Mainnet: 12.5 SOL

✅ All checks passed!
```

---

## Step 5: Store Backup in Password Manager

**CRITICAL**: The keypair JSON array is your wallet. If you lose it, you lose access forever.

**Store in password manager (1Password, LastPass, Bitwarden, etc.)**:

```
Entry Name: 3Eyes Platform Deploy Wallet

Public Key:
9vHJ7x7X7Fz3FX5w5NvQq1Z8bVmDxKmE2uA1eJ4wXyZ

Keypair JSON (NEVER SHARE):
[123,45,67,89,12,34,56,78,90,123,45,67,89,12,34,56,78,90,123,45,67,89,12,34,56,78,90,123,45,67,89,12,34,56,78,90,123,45,67,89,12,34,56,78,90,123,45,67,89,12,34,56,78,90,123,45,67]

Seed Phrase (NEVER SHARE):
[12 or 24 words shown during generation]

Notes:
- Used for deploying lootbox platform program
- Funded with 10 SOL on mainnet for deployment
- Added to .env locally and Render production
```

---

## Step 6: Update Documentation

### Environment Variables Documentation

Update `PLATFORM_SPEC.md` section on environment variables:

```bash
# Deploy Wallet (for program deployment)
DEPLOY_WALLET_PUBKEY=9vHJ7x7X...  # Public key (can be in version control)
DEPLOY_WALLET_JSON=[123,45,67,...]  # Keypair array (NEVER commit!)

# Admin Wallet (for platform configuration)
ADMIN_WALLET=C9t218MuHcsKPFMZQLvVdnPMRP5AYGRAYc8oLhshH3aF

# Note: Deploy wallet is ONLY for deploying the Rust program
# Admin wallet is for super admin dashboard access
```

### Update Backend Code

**Remove old file-based loading**:
```javascript
// ❌ OLD (delete this)
const walletPath = process.env.BACKEND_WALLET_PATH || 'deploy-wallet.json';
const walletData = JSON.parse(fs.readFileSync(walletPath));

// ✅ NEW (use this)
const { loadDeployWallet } = require('./lib/loadDeployWallet');
const deployWallet = loadDeployWallet();
```

---

## Benefits

### ✅ Same Process Locally and Production

**Local**:
1. Add `DEPLOY_WALLET_JSON` to `.env`
2. Run `node scripts/verify-wallet.js`
3. Deploy with `./scripts/deploy.sh`

**Production**:
1. Add `DEPLOY_WALLET_JSON` to Render env vars
2. Deploy (same command, same code)
3. Works identically

### ✅ No File Path Issues

- No hardcoded paths like `/Users/samskirrow/...`
- No "file not found" errors in production
- Works on any OS (Mac, Linux, Windows)

### ✅ Secure

- `.env` in `.gitignore` (never committed)
- Render env vars are encrypted
- No keypair in codebase
- Backup in password manager

### ✅ Easy to Verify

```bash
# Check if wallet is set up correctly
node scripts/verify-wallet.js

# Shows:
# - Keypair loads correctly
# - Public key matches expected
# - Balance on devnet
# - Balance on mainnet
```

### ✅ Single Source of Truth

- One wallet for devnet AND mainnet
- Program ID will be same on both (if using same deploy wallet)
- Less confusion, less to manage

---

## Comparison: Old vs New

### Old Approach (File-Based)
```javascript
// Backend needs file
const walletPath = process.env.BACKEND_WALLET_PATH || './deploy-wallet.json';
const wallet = loadKeypairFromFile(walletPath);

// Problems:
// - File must exist locally: ✓
// - File must exist on Render: ✗ (breaks!)
// - Path hardcoded: ✗
// - Easy to forget production setup: ✗
// - Can accidentally commit: ✗
```

### New Approach (Environment Variable)
```javascript
// Backend uses env var
const wallet = loadDeployWallet();  // Reads DEPLOY_WALLET_JSON

// Benefits:
// - Works locally: ✓
// - Works on Render: ✓
// - No hardcoded paths: ✓
// - Can't forget (env var required): ✓
// - Can't accidentally commit (.env ignored): ✓
```

---

## Setup Checklist

### Local Development

- [ ] Generate new deploy wallet: `solana-keygen new --outfile deploy-wallet.json`
- [ ] Save seed phrase in password manager
- [ ] Get public key: `solana-keygen pubkey deploy-wallet.json`
- [ ] Get keypair array: `cat deploy-wallet.json`
- [ ] Add to `.env`:
  - [ ] `DEPLOY_WALLET_PUBKEY=...`
  - [ ] `DEPLOY_WALLET_JSON=[...]`
- [ ] Verify `.env` is in `.gitignore`
- [ ] Delete `deploy-wallet.json` file (no longer needed)
- [ ] Run verification: `node scripts/verify-wallet.js`
- [ ] Airdrop devnet SOL: `solana airdrop 5 [pubkey] --url devnet`

### Production (Render)

- [ ] Add environment variable `DEPLOY_WALLET_PUBKEY` (same as local)
- [ ] Add environment variable `DEPLOY_WALLET_JSON` (same as local)
- [ ] Deploy backend to Render
- [ ] Verify logs show "✅ Deploy wallet loaded: [pubkey]"

### Mainnet Preparation

- [ ] Send 10+ SOL to deploy wallet pubkey
- [ ] Verify balance: `solana balance [pubkey] --url mainnet`
- [ ] Run deployment: `./scripts/deploy.sh mainnet`
- [ ] Update database with program ID

---

## Troubleshooting

### "DEPLOY_WALLET_JSON not set"

**Problem**: Environment variable missing
**Solution**: Add to `.env` (local) or Render env vars (production)

### "Invalid keypair format"

**Problem**: JSON array malformed
**Solution**: Copy directly from `cat deploy-wallet.json`, ensure it's `[123,45,...]` format

### "Public key mismatch"

**Problem**: `DEPLOY_WALLET_PUBKEY` doesn't match the keypair
**Solution**: Regenerate public key from keypair:
```bash
node -e "const {Keypair} = require('@solana/web3.js'); const kp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.DEPLOY_WALLET_JSON))); console.log(kp.publicKey.toString());"
```

### "Insufficient balance for deployment"

**Problem**: Not enough SOL
**Solution**:
- Devnet: `solana airdrop 5 [pubkey] --url devnet`
- Mainnet: Send 10+ SOL to the pubkey

---

## Security Best Practices

1. **Never commit** `.env` file or keypair JSON
2. **Store backup** in password manager (encrypted)
3. **Use hardware wallet** for storing large amounts (optional)
4. **Rotate if compromised** - generate new wallet, redeploy
5. **Limit funding** - only add SOL when needed for deployment
6. **Monitor transactions** - check Solscan for unexpected activity

---

**Created**: 2026-01-07
**Author**: Claude (via 3Eyes team)
**Status**: Implementation Guide
