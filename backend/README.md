# 3Eyes Backend API

Backend API server for the 3Eyes Lootbox Platform.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `DEPLOY_WALLET_JSON` - Deploy wallet keypair (see below)

### 3. Generate Deploy Wallet (First Time Only)

```bash
# Generate new keypair
solana-keygen new --outfile deploy-wallet.json

# Get the public key
solana-keygen pubkey deploy-wallet.json

# Get the keypair array
cat deploy-wallet.json
```

Add to `.env`:
```bash
DEPLOY_WALLET_PUBKEY=YourPublicKeyHere
DEPLOY_WALLET_JSON=[123,45,67,...]  # Paste the array from cat command
```

**IMPORTANT:** Delete `deploy-wallet.json` after copying to `.env`. Never commit this file!

### 4. Run Development Server

```bash
npm run dev
```

Server will start on http://localhost:3333

## Project Structure

```
backend/
├── server.js              # Main Express server
├── lib/                   # Utility functions
│   ├── loadDeployWallet.js    # Load deploy wallet from env
│   ├── getNetworkConfig.js    # Fetch config from database
│   └── deriveVaultPDAs.js     # Derive vault addresses
├── routes/                # API routes (to be added)
│   ├── projects.js
│   └── vault.js
└── package.json
```

## API Endpoints

### Health Check
```
GET /health
```

Returns server status.

### Projects (Coming Soon)
```
POST /api/projects/create
GET /api/projects/:projectId
```

### Vault Operations (Coming Soon)
```
POST /api/vault/fund
GET /api/vault/:projectId/balance
```

## Development

### Running Tests
```bash
npm test
```

### Production Deployment

Set environment variables on your hosting platform (Render, Heroku, etc.):
- `NODE_ENV=production`
- `DEPLOY_WALLET_JSON=[...]`
- `SUPABASE_URL=...`
- `SUPABASE_ANON_KEY=...`

## Key Concepts

### Network-Agnostic Design
The backend automatically uses the correct network (devnet/mainnet) based on database configuration. No code changes needed when switching networks.

### Vault PDAs
Vault addresses are derived deterministically using:
- `vault_pda` = PDA from ["vault", project_id, payment_token]
- `vault_authority_pda` = PDA from ["vault_authority", project_id]

These PDAs match the Rust program exactly.

### Deploy Wallet
The deploy wallet is used for:
- Signing transactions that require platform authority
- Creating vault accounts
- Funding initial vault balances (optional)

It does NOT control user funds - those are controlled by the Rust program PDAs.

## Troubleshooting

### "DEPLOY_WALLET_JSON not set"
Add the keypair array to your `.env` file. See setup instructions above.

### "Network is mainnet but NODE_ENV is not production"
The database is configured for mainnet but your environment is development. Either:
- Change database to devnet (for testing)
- Set `NODE_ENV=production` (for production deployment)

### "Failed to load network configuration"
Check that:
- Supabase credentials are correct in `.env`
- `super_admin_config` table exists in database
- Table has a row with `id = 1`

## Documentation

- [PLATFORM_SPEC.md](../documentation/PLATFORM_SPEC.md) - Complete technical specification
- [DEPLOY_WALLET_MANAGEMENT.md](../documentation/DEPLOY_WALLET_MANAGEMENT.md) - Deploy wallet setup
- [DEVNET_MAINNET_STRATEGY.md](../documentation/DEVNET_MAINNET_STRATEGY.md) - Network switching guide
- [TERMINOLOGY.md](../documentation/TERMINOLOGY.md) - Platform terminology standards

## Security

- ✅ Deploy wallet stored as environment variable (never in code)
- ✅ Environment verification on startup
- ✅ Network configuration from database (single source of truth)
- ✅ All vault operations use PDAs (program-controlled)

## License

MIT
