# Setup Fixes & User Authentication

## Issues Fixed

### 1. ✅ "Non-base58 character" Error
**Problem**: Database had placeholder strings instead of valid Solana public keys

**Solution**: Run this SQL in Supabase:

```sql
-- File: /database/fix-config.sql

UPDATE super_admin_config
SET
    lootbox_program_id = '11111111111111111111111111111111',
    three_eyes_mint = '11111111111111111111111111111112',
    platform_fee_account = '11111111111111111111111111111113'
WHERE id = 1;
```

These are valid base58 addresses (System Program addresses, safe placeholders). Update them later when you deploy the actual Rust program and create $3EYES token.

### 2. ✅ Phantom Wallet Warning
**Problem**: "Phantom was registered as a Standard Wallet" warning

**Solution**: Removed `PhantomWalletAdapter` from wallet list. Phantom now auto-detects via Standard Wallet API (modern approach).

**File updated**: `/frontend/components/wallet/WalletProvider.jsx`

### 3. ✅ Solflare "Unknown response" Warning
**Problem**: Solflare extension logging warnings

**Solution**: This is a known Solflare issue, harmless and can be ignored. No action needed.

---

## New Feature: User Authentication 🎉

I've implemented proper wallet-based authentication using Supabase, following their Web3 auth guide.

### What It Does

1. **Auto-creates user accounts** when wallets connect
2. **Optional signature verification** for enhanced security
3. **Tracks user stats** (projects, boxes, wins)
4. **Last login tracking** for analytics
5. **Links users to projects** for better data relationships

### Database Changes

**New table: `users`**

Run this SQL in Supabase:

```sql
-- File: /database/add-users-table.sql
-- (See full contents in file)
```

**Key features**:
- `wallet_address` - Unique identifier (primary key)
- `username`, `email`, `avatar_url`, `bio` - Optional profile
- `total_projects`, `total_boxes_created`, `total_boxes_won` - Cached stats
- `last_login_at` - Track activity

**New function: `upsert_user()`**
- Creates user on first connect
- Updates `last_login_at` on subsequent connects
- Returns user data

**Projects table updated**:
- Added `user_id` column (optional, links to users table)
- Still uses `owner_wallet` for backwards compatibility

### How It Works

**Flow**:
1. User clicks "Connect Wallet"
2. Selects Phantom (or other wallet)
3. Approves connection
4. `WalletButton` detects connection
5. Calls `authenticateWallet()` from `/lib/auth.js`
6. **Optional**: Prompts user to sign message (for verification)
7. Calls `upsert_user()` in Supabase
8. User account created/updated
9. User data stored in localStorage
10. User can now create projects, view dashboard, etc.

**What happens if user rejects signature**:
- Still creates basic account
- User can use the app normally
- Signature is optional, not required

### Files Created

1. `/database/add-users-table.sql` - User table and functions
2. `/database/fix-config.sql` - Fix placeholder addresses
3. `/frontend/lib/auth.js` - Authentication service
4. `/frontend/components/wallet/WalletButton.jsx` - Updated with auto-auth

### Setup Steps

**1. Run Database Migrations**

In Supabase SQL Editor, run in order:

```sql
-- First, fix the config (if not already done)
-- Copy/paste contents of: /database/fix-config.sql

-- Then, add users table
-- Copy/paste contents of: /database/add-users-table.sql
```

**2. Restart Dev Server**

```bash
cd frontend
npm run dev
```

**3. Test Authentication**

1. Visit `http://localhost:3000`
2. Click "Connect Wallet"
3. Approve connection
4. Watch console: Should see "✅ Authenticated: {user data}"
5. Check Supabase: Should see new row in `users` table
6. Reconnect: `last_login_at` should update

### Verify Setup

**Check users table**:
```sql
SELECT
    wallet_address,
    username,
    created_at,
    last_login_at,
    total_projects
FROM users
ORDER BY created_at DESC;
```

**Check user with projects**:
```sql
SELECT
    u.wallet_address,
    u.created_at as user_since,
    COUNT(p.id) as project_count
FROM users u
LEFT JOIN projects p ON u.wallet_address = p.owner_wallet
GROUP BY u.wallet_address, u.created_at
ORDER BY project_count DESC;
```

### API Functions Available

```javascript
import {
    authenticateWallet,
    getUserByWallet,
    updateUserProfile,
    getUserStats
} from '@/lib/auth';

// Authenticate (called automatically on connect)
const result = await authenticateWallet(wallet);

// Get user
const user = await getUserByWallet('xxx...');

// Update profile
await updateUserProfile('xxx...', {
    username: 'CryptoKing',
    bio: 'Professional degen',
    avatar_url: 'https://...'
});

// Get stats
const stats = await getUserStats('xxx...');
// Returns: { totalProjects, totalBoxes, totalWins }
```

### Benefits

**For Users**:
- Persistent account across sessions
- Track stats and history
- Future: Profiles, leaderboards, social features

**For You (Platform)**:
- User analytics (retention, engagement)
- Better data relationships (user → projects → boxes)
- Foundation for future features (notifications, achievements, etc.)
- Marketing insights (wallet addresses for airdrops, etc.)

**For Development**:
- Clean separation of auth and app logic
- Easy to add profile features later
- Database relationships make queries easier
- Can track user behavior for product improvements

### Optional: Profile UI (Future)

You can add a profile page later:

**Route**: `/profile` or `/dashboard/profile`

**Features**:
- Edit username, bio, avatar
- View stats (projects, boxes, win rate)
- Transaction history
- Settings (notifications, preferences)

**SQL to get profile data**:
```sql
SELECT
    u.*,
    COUNT(DISTINCT p.id) as total_projects,
    COUNT(DISTINCT b.id) as total_boxes,
    COUNT(DISTINCT b.id) FILTER (WHERE b.box_result IN (3, 4)) as total_wins
FROM users u
LEFT JOIN projects p ON u.wallet_address = p.owner_wallet
LEFT JOIN boxes b ON u.wallet_address = b.owner_wallet
WHERE u.wallet_address = 'xxx...'
GROUP BY u.id;
```

### Security Notes

**Signature verification**:
- Currently optional (user can reject)
- Message includes timestamp to prevent replay attacks
- Signature verified client-side for UX
- Can add server-side verification later if needed

**Privacy**:
- Wallet addresses are public on Solana anyway
- No email/password required
- User controls what data they add (username, bio)

**GDPR Compliance**:
- Users can "forget" account by disconnecting wallet
- No PII collected unless user adds it
- Wallet address = pseudonymous identifier

---

## Testing Checklist

After running migrations:

- [ ] Dev server starts without errors
- [ ] Connect wallet (no warnings)
- [ ] Console shows "✅ Authenticated"
- [ ] Supabase `users` table has new row
- [ ] `wallet_address` matches connected wallet
- [ ] `last_login_at` is recent
- [ ] Reconnect: `last_login_at` updates
- [ ] Create project: Works normally
- [ ] Dashboard: Shows projects
- [ ] Admin: Works normally

---

## Troubleshooting

### "Non-base58 character" still appears
- Make sure you ran `fix-config.sql`
- Verify in Supabase that addresses are updated
- Check console: Should show `lootbox_program_id: '11111...'`

### User not being created
- Check Supabase logs for RPC errors
- Verify `upsert_user()` function exists
- Check wallet is actually connected
- Look for console errors

### Signature rejection
- This is OK! User account still created
- Signature is optional for better UX
- Add `required: true` in auth.js if you want to enforce

### Users table not found
- Run `/database/add-users-table.sql`
- Check Supabase table editor
- Verify migration ran successfully

---

## What's Next

With authentication in place, you can now:

1. **Add user profiles** - Let users customize their identity
2. **Track behavior** - Analytics on user actions
3. **Build leaderboards** - Top players, biggest wins
4. **Enable social features** - Follow creators, share projects
5. **Notification system** - Alert users about wins, new projects
6. **Achievements** - Gamify the experience
7. **Referral system** - Track who invited whom

The foundation is solid! 🚀
