# 3Eyes Platform - Complete Setup Guide

This guide will walk you through setting up the entire platform from scratch.

## Prerequisites

- Node.js 18+ installed
- Solana CLI tools installed
- A Supabase account
- A code editor (VS Code recommended)

---

## Step 1: Database Setup

### 1.1 Run Migration (Update Existing Database)

If you already have a database, run the migration to update column names:

```sql
-- In Supabase SQL Editor
-- Run: database/migrations/001_treasury_to_vault.sql

ALTER TABLE projects RENAME COLUMN treasury_wallet TO vault_wallet;
ALTER TABLE projects DROP COLUMN IF EXISTS treasury_balance;
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS vault_pda TEXT,
ADD COLUMN IF NOT EXISTS vault_authority_pda TEXT,
ADD COLUMN IF NOT EXISTS vault_token_account TEXT;
```

### 1.2 OR Fresh Database Setup

If starting fresh, run the complete schema:

```sql
-- In Supabase SQL Editor
-- Run entire contents of: database/schema.sql
```

### 1.3 Verify Database

Check that you have these tables:
- `super_admin_config` (1 row)
- `projects` (with vault columns)
- `boxes`

---

## Step 2: Backend Setup

### 2.1 Navigate to Backend Directory

```bash
cd backend
```

### 2.2 Install Dependencies

```bash
npm install
```

### 2.3 Generate Deploy Wallet

```bash
# Generate new keypair
solana-keygen new --outfile deploy-wallet.json

# SAVE THE SEED PHRASE that appears! Store it in a password manager.

# Get the public key
solana-keygen pubkey deploy-wallet.json
# Copy this - you'll need it for .env

# Get the keypair array
cat deploy-wallet.json
# Copy this entire array - you'll need it for .env
```

### 2.4 Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```bash
PORT=3333
NODE_ENV=development

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

DEPLOY_WALLET_PUBKEY=YourPublicKeyFromStep2.3
DEPLOY_WALLET_JSON=[123,45,67,...]  # Paste array from step 2.3
```

### 2.5 Verify Setup

```bash
npm run verify
```

This will check:
- ✅ Environment variables are set
- ✅ Deploy wallet loads correctly
- ✅ Database connection works
- ✅ Network config loads from database

### 2.6 Delete Deploy Wallet File

**IMPORTANT:** Now that the keypair is in `.env`, delete the file:

```bash
rm deploy-wallet.json
```

Never commit this file to git!

---

## Step 3: Frontend Setup

### 3.1 Navigate to Frontend Directory

```bash
cd ../frontend
```

### 3.2 Install Dependencies

```bash
npm install
```

### 3.3 Verify Frontend Configuration

Check that these files exist and are correct:
- `lib/supabase.js` - Supabase client configuration
- `store/useNetworkStore.js` - Network configuration store

---

## Step 4: Admin Dashboard - Token Configuration

### 4.1 Start Frontend

```bash
npm run dev
```

Open http://localhost:3000

### 4.2 Connect Admin Wallet

Click "Connect Wallet" and connect with your admin wallet (the one in `super_admin_config.admin_wallet`).

### 4.3 Go to Admin Dashboard

Navigate to `/dashboard` - it should recognize you as admin and show admin features.

### 4.4 Configure Token Address

1. Click "Platform Config" tab
2. Find "Token Addresses" section
3. Enter your devnet test token address in "$3EYES Token Mint Address"
4. Click "Save Configuration"

**Don't have a test token yet?** You can:
- Use a placeholder for now: `11111111111111111111111111111112`
- Create one later when needed

---

## Step 5: Test the Setup

### 5.1 Create a Test Project

1. Go to `/create` in the frontend
2. Fill out the project creation form
3. Click "Create Project"
4. Check that it appears in your dashboard

### 5.2 Verify Database

In Supabase SQL Editor:

```sql
SELECT
    project_name,
    subdomain,
    vault_wallet,
    is_active
FROM projects;
```

You should see your test project with:
- ✅ `vault_wallet` populated (currently owner wallet, will be replaced with PDA later)
- ✅ `is_active = true`

---

## Step 6: Backend API Setup (Next Phase)

The backend is ready but doesn't have routes yet. Next steps:

1. Start backend server: `cd backend && npm run dev`
2. Test health check: `curl http://localhost:3333/health`
3. Add project routes (coming next)

---

## Common Issues

### "DEPLOY_WALLET_JSON not set"
- Make sure you created `.env` file in `backend/` directory
- Make sure you pasted the keypair array correctly
- No extra spaces or quotes

### "Network is mainnet but NODE_ENV is not production"
- Your database is set to mainnet but you're in development
- Change database to devnet: Update `super_admin_config` set `network = 'devnet'`

### "Failed to load network configuration"
- Check Supabase URL and key in `.env`
- Make sure `super_admin_config` table exists
- Make sure there's a row with `id = 1`

### Frontend shows "Loading..." forever
- Check browser console for errors
- Verify Supabase credentials in frontend
- Make sure `super_admin_config` is readable (RLS disabled)

---

## What's Working Now

✅ Database with vault terminology
✅ Frontend with admin dashboard
✅ Token configuration in admin UI
✅ Backend foundation with utilities
✅ Network config loading from database
✅ Deploy wallet management

## What's Next

🔜 Project creation with vault PDAs
🔜 Vault funding functionality
🔜 Rust program development
🔜 Box buying/revealing/settling

---

## Quick Reference

### Admin Dashboard
- URL: http://localhost:3000/dashboard
- Requires admin wallet connected
- Configure: Token addresses, fees, view all projects

### Backend API
- URL: http://localhost:3333
- Health: http://localhost:3333/health
- Verify: `npm run verify` in backend directory

### Database
- Supabase Dashboard: https://app.supabase.com
- SQL Editor for queries and migrations
- RLS policies configured for public read on config

---

## Support

- Technical Spec: [PLATFORM_SPEC.md](documentation/PLATFORM_SPEC.md)
- Deploy Wallet: [DEPLOY_WALLET_MANAGEMENT.md](documentation/DEPLOY_WALLET_MANAGEMENT.md)
- Network Strategy: [DEVNET_MAINNET_STRATEGY.md](documentation/DEVNET_MAINNET_STRATEGY.md)
- Terminology: [TERMINOLOGY.md](documentation/TERMINOLOGY.md)

---

**Last Updated:** 2026-01-09
**Status:** Backend foundation complete, ready for vault implementation
