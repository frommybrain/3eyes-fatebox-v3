# DegenBox Quick Start Guide 🚀

Get your multi-tenant lootbox platform running in 10 minutes!

## Prerequisites
- ✅ Supabase account (you have: `vquuilevmbvausytplys`)
- ✅ Node.js installed
- ✅ Frontend dependencies installed (`npm install` already run)

## Step-by-Step Setup

### Step 1: Set Up Database (5 minutes)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/vquuilevmbvausytplys/sql
   - Or: Dashboard → SQL Editor (left sidebar)

2. **Run Schema**
   - Open file: `/database/schema.sql`
   - Copy entire contents (Cmd+A, Cmd+C)
   - Paste into SQL Editor
   - Click **RUN** button

3. **Verify Tables Created**
   Run this query:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

   You should see:
   - analytics_events
   - boxes
   - projects
   - reserved_subdomains
   - super_admin_config
   - super_admin_config_history

4. **Check Config**
   ```sql
   SELECT network, is_production, admin_wallet FROM super_admin_config;
   ```

   Should show:
   - network: `devnet`
   - is_production: `false`
   - admin_wallet: `EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh`

### Step 2: Create Test Project (2 minutes)

Copy and run this SQL in Supabase:

```sql
INSERT INTO projects (
    project_id,
    owner_wallet,
    network,
    subdomain,
    name,
    description,
    payment_token_mint,
    payment_token_symbol,
    payment_token_decimals,
    box_price,
    project_pda,
    vault_pda,
    vault_authority_pda,
    vault_token_account,
    total_boxes_created,
    total_jackpots_hit,
    vault_balance,
    active
) VALUES (
    1,
    'EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh',
    'devnet',
    'devnet-catbox',
    'Lucky Cat Boxes',
    'Try your luck with adorable cat-themed lootboxes! 🐱',
    'So11111111111111111111111111111111111111112',
    'SOL',
    9,
    1000000000,
    'PROJECT_PDA_PLACEHOLDER',
    'VAULT_PDA_PLACEHOLDER',
    'VAULT_AUTH_PDA_PLACEHOLDER',
    'VAULT_TOKEN_ACCOUNT_PLACEHOLDER',
    42,
    3,
    5000000000,
    true
);
```

Verify it was created:
```sql
SELECT subdomain, name, box_price, active FROM projects;
```

### Step 3: Start Development Server (1 minute)

```bash
cd frontend
npm run dev
```

You should see:
```
✓ Ready in 2.5s
○ Local:   http://localhost:3000
```

### Step 4: Test Your Project Page (1 minute)

Open in browser:
```
http://localhost:3000?subdomain=devnet-catbox
```

**You should see:**
- ✅ 3D canvas background (your MainCanvas)
- ✅ "Lucky Cat Boxes" title
- ✅ Description about cat lootboxes
- ✅ Box price: 1 SOL
- ✅ Stats: 42 boxes, 3 jackpots, 5 SOL vault
- ✅ Yellow "🧪 DEVNET MODE" badge (top right)
- ✅ Buy Box button

**If you see this, IT WORKS! 🎉**

### Step 5: Test Error Handling (30 seconds)

Try a non-existent project:
```
http://localhost:3000?subdomain=doesnotexist
```

Should show:
- 🚫 "Project Not Found" error page
- "Go to Homepage" button

---

## Troubleshooting

### Problem: "Failed to fetch network config"
**Solution**: Check Supabase credentials in `/frontend/.env.local`
```bash
NEXT_PUBLIC_SUPABASE_URL=https://vquuilevmbvausytplys.supabase.co
NEXT_PUBLIC_SUPABASE_PUB_KEY=eyJhbGc... (your key)
```

### Problem: "Project not found: devnet-catbox"
**Solution**:
1. Check test project was inserted (run SELECT query)
2. Verify subdomain exactly matches: `devnet-catbox`

### Problem: Blank page or white screen
**Solution**:
1. Open browser console (F12)
2. Check for errors
3. Look for missing dependencies
4. Try: `cd frontend && npm install && npm run dev`

### Problem: "Cannot find module '@/lib/supabase'"
**Solution**: Restart dev server
```bash
# Ctrl+C to stop
npm run dev
```

### Problem: Database errors
**Solution**: Drop and recreate tables
```sql
-- CAUTION: This deletes all data!
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS boxes CASCADE;
DROP TABLE IF EXISTS reserved_subdomains CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS super_admin_config_history CASCADE;
DROP TABLE IF EXISTS super_admin_config CASCADE;

-- Then re-run schema.sql
```

---

## What You've Built

You now have:
1. ✅ **Working multi-tenant system** - Each project gets its own subdomain
2. ✅ **Database-driven configuration** - Switch networks without code changes
3. ✅ **Dynamic project pages** - MainCanvas + project branding
4. ✅ **Network separation** - Devnet projects prefixed with `devnet-`
5. ✅ **Error handling** - Graceful 404s and loading states

## Next Steps

### Immediate (Same Session)
- [ ] Test with different project data
- [ ] Customize project page styling
- [ ] Add more test projects

### Short Term (Next Session)
- [ ] Add Solana wallet integration
- [ ] Implement buy box transaction
- [ ] Build project creation form
- [ ] Create super admin dashboard

### Long Term (Coming Weeks)
- [ ] Deploy Rust program to devnet
- [ ] Connect frontend to on-chain program
- [ ] Test full buy/reveal/settle flow
- [ ] Deploy to Vercel
- [ ] Set up wildcard DNS
- [ ] Launch on mainnet

---

## Testing Checklist

Before moving to next phase, verify:

- [ ] Database tables exist (6 tables)
- [ ] Test project shows correctly
- [ ] MainCanvas renders (3D background)
- [ ] Network badge shows (DEVNET MODE)
- [ ] Stats display (boxes, jackpots, vault)
- [ ] Error page works for missing projects
- [ ] No console errors
- [ ] Page loads in under 3 seconds

---

## Common Tasks

### Add Another Test Project

```sql
INSERT INTO projects (
    project_id, owner_wallet, network, subdomain,
    name, description,
    payment_token_mint, payment_token_symbol, payment_token_decimals,
    box_price,
    project_pda, vault_pda, vault_authority_pda, vault_token_account,
    active
) VALUES (
    2,
    'EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh',
    'devnet',
    'devnet-dogebox',
    'Doge Box Party',
    'Much wow, such luck! 🐕',
    'So11111111111111111111111111111111111111112',
    'SOL',
    9,
    500000000,
    'PDA_PLACEHOLDER',
    'PDA_PLACEHOLDER',
    'PDA_PLACEHOLDER',
    'PDA_PLACEHOLDER',
    true
);
```

Test at: `http://localhost:3000?subdomain=devnet-dogebox`

### View All Projects

```sql
SELECT
    subdomain,
    name,
    network,
    active,
    total_boxes_created,
    vault_balance
FROM projects
ORDER BY created_at DESC;
```

### Check Network Config

```sql
SELECT
    network,
    rpc_url,
    lootbox_program_id,
    three_eyes_mint,
    launch_fee_amount,
    withdrawal_fee_percentage,
    is_production
FROM super_admin_config;
```

### Pause a Project

```sql
UPDATE projects SET active = false WHERE subdomain = 'devnet-catbox';
```

Visit the project URL - should show "Project Paused" page.

### Reactivate Project

```sql
UPDATE projects SET active = true WHERE subdomain = 'devnet-catbox';
```

---

## Development Workflow

### Making Changes

1. **Edit Component**
   - Make changes to any `.jsx` or `.js` file
   - Save (Cmd+S)
   - Browser automatically refreshes (hot reload)

2. **Change Middleware**
   - Edit `/frontend/middleware.js`
   - Save
   - **Restart dev server** (Ctrl+C, then `npm run dev`)

3. **Update Database Schema**
   - Modify `/database/schema.sql`
   - Run new SQL in Supabase
   - May need to drop/recreate tables

4. **Add Environment Variable**
   - Edit `/frontend/.env.local`
   - **Restart dev server**

### Git Workflow

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add buy box button interaction"

# Push to GitHub
git push
```

---

## Resources

### Documentation
- `/FRONTEND_SETUP_COMPLETE.md` - Full implementation guide
- `/DIRECTORY_STRUCTURE.md` - File organization explained
- `/documentation/PLATFORM_SPEC.md` - Complete technical spec
- `/database/README.md` - Database setup guide

### External Links
- Supabase Dashboard: https://supabase.com/dashboard/project/vquuilevmbvausytplys
- Vercel Multi-Tenant Docs: https://vercel.com/docs/multi-tenant
- Next.js 16 Docs: https://nextjs.org/docs
- Zustand Docs: https://zustand-demo.pmnd.rs

---

## Success Criteria

You're ready to move forward when:

✅ Test project page loads perfectly
✅ 3D canvas renders smoothly
✅ Stats display correctly
✅ Network badge shows
✅ Error handling works
✅ No console errors
✅ You understand the routing flow
✅ You can add new test projects

---

## Need Help?

### Check Console
Always have browser console open (F12) to see errors.

### Check Supabase Logs
Dashboard → Logs → Shows all database queries and errors

### Check Network Tab
Browser DevTools → Network → See API calls and responses

### Common Issue: 404 on API calls
Make sure Supabase URL and keys are correct in `.env.local`

### Common Issue: Infinite loading
Usually means database query is failing. Check Supabase logs.

---

**Ready to GO! Let's build some lootboxes! 🎲🚀**

**Current Status**: Multi-tenant frontend system is LIVE and working!

**Next Phase**: Wallet integration + Buy box functionality

**When ready**: Let me know and we'll add Solana wallet connection and implement the buy box transaction flow! 🎯
