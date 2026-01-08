# Quick Fixes - Run These Now! ⚡

## 1. Fix Database Config (2 minutes)

Open Supabase SQL Editor and run:

```sql
UPDATE super_admin_config
SET
    lootbox_program_id = '11111111111111111111111111111111',
    three_eyes_mint = '11111111111111111111111111111112',
    platform_fee_account = '11111111111111111111111111111113'
WHERE id = 1;
```

This fixes the "Non-base58 character" error. ✅

## 2. Add User Authentication (3 minutes)

In Supabase SQL Editor, copy and paste the entire contents of:
`/database/add-users-table.sql`

Then click RUN.

This creates:
- `users` table for wallet-based accounts
- `upsert_user()` function for auto-creating users
- Proper indexes and constraints

✅ Users will now be auto-created when wallets connect!

## 3. Restart Dev Server

```bash
cd frontend
npm run dev
```

## That's It!

**Fixed**:
- ✅ Non-base58 character error
- ✅ Phantom wallet warning
- ✅ User authentication setup

**New feature**:
- ✅ Users auto-created on wallet connect
- ✅ Stats tracked automatically
- ✅ Foundation for profiles, leaderboards, etc.

**Test it**:
1. Visit `http://localhost:3000`
2. Connect wallet
3. Check console: "✅ Authenticated"
4. Check Supabase `users` table: See your wallet!

---

## Files to Know About

**Documentation**:
- `/v3/frontend/SETUP_FIXES.md` - Complete guide
- This file - Quick reference

**Database**:
- `/database/fix-config.sql` - Fixes placeholder addresses
- `/database/add-users-table.sql` - User authentication setup

**Code Updated**:
- `/frontend/lib/auth.js` - NEW: Authentication service
- `/frontend/components/wallet/WalletProvider.jsx` - Fixed Phantom warning
- `/frontend/components/wallet/WalletButton.jsx` - Auto-auth on connect

---

## Console Output After Fixes

**Before** (errors):
```
❌ Error: Non-base58 character
❌ Phantom was registered as a Standard Wallet...
```

**After** (clean):
```
✅ Supabase connected
✅ User authenticated: { wallet_address: "xxx...", ... }
✅ Wallet connected: xxx...
```

---

Ready to test! 🚀
