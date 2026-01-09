# DegenBox Database Setup

## Clean Setup - No User Accounts

We've simplified the database to use wallet addresses directly instead of creating user accounts. This makes everything cleaner and simpler.

---

## Step 1: Delete All Existing Tables

In Supabase SQL Editor, run this to start fresh:

```sql
-- Drop all existing tables
DROP TABLE IF EXISTS boxes CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS super_admin_config CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS upsert_user CASCADE;
DROP FUNCTION IF EXISTS check_subdomain_available CASCADE;
DROP FUNCTION IF EXISTS get_project_stats CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

---

## Step 2: Run the Clean Schema

Copy and paste the **entire contents** of `/database/schema.sql` into Supabase SQL Editor and click "Run".

This will create:
- ✅ `super_admin_config` - Platform configuration (RLS disabled for public read)
- ✅ `projects` - User projects (indexed by wallet_address)
- ✅ `boxes` - Lootboxes (indexed by wallet_address)
- ✅ Helper functions for subdomain checking and stats
- ✅ Proper RLS policies that work

---

## Step 3: Verify It Worked

You should see this output at the bottom:

```
Tables Check:
✅ super_admin_config
✅ projects
✅ boxes

=== CONFIG DATA ===
network: "devnet"
admin_wallet: "EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh"
message: "Config loaded successfully!"

=== ✅ DATABASE READY ===
next_step: "You can now start your app!"
```

---

## What Changed?

### Before (Complex):
- Had `users` table with authentication
- Complex `upsert_user` function with ambiguous column errors
- Required signature verification and database writes on every connection
- RLS policies that kept breaking

### After (Simple):
- **NO** users table
- Projects and boxes store `owner_wallet` directly
- Wallet connection just stores address in localStorage
- Clean RLS policies that actually work

### How Lookups Work Now:

```javascript
// Get user's projects
const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_wallet', walletAddress);

// Get user's boxes
const { data } = await supabase
    .from('boxes')
    .select('*')
    .eq('owner_wallet', walletAddress);
```

Simple and clean!

---

## Testing

After running the schema:

1. **Start dev server**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Visit** http://localhost:3000

3. **Expected console output**:
   ```
   ✅ Network config loaded: devnet
   ✅ Wallet connected: EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh
   ```

4. **NO errors about**:
   - Invalid API key
   - 401 Unauthorized
   - Wallet not connected
   - Ambiguous column reference

---

## Environment Variables

Make sure your `/frontend/.env.local` has:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://vquuilevmbvausytplys.supabase.co
NEXT_PUBLIC_SUPABASE_PUB_KEY=your_anon_key_here
NEXT_PUBLIC_PLATFORM_NAME=DegenBox
NEXT_PUBLIC_PLATFORM_DOMAIN=degenbox.fun
```

---

## What Got Removed

### Deleted Files:
- All patch SQL files (fix-*, RUN_THIS_FIRST.sql, etc.)
- All fix documentation (ERRORS_FIXED.md, URGENT_FIX.md, etc.)
- users table and upsert_user function

### Updated Files:
- [schema.sql](../../../database/schema.sql) - Clean, simple schema
- [auth.js](../../../frontend/lib/auth.js) - No database writes, just localStorage
- [WalletButton.jsx](../../../frontend/components/wallet/WalletButton.jsx) - Simple connect/disconnect

---

## Summary

The database is now **much simpler**:
1. No user accounts
2. Wallet addresses used directly for all lookups
3. No complex authentication flows
4. RLS policies that actually work
5. Clean, maintainable code

Just run the schema.sql file and you're done!
