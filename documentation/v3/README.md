# DegenBox v3 Documentation

## 🚨 QUICK START - FIXING ERRORS

**Having authentication errors?** Read this first:
- [CRITICAL_FIXES.md](frontend/CRITICAL_FIXES.md) - Fix "Invalid API key" and "Wallet not connected" errors

---

## Documentation Index

### Frontend Documentation
- [CRITICAL_FIXES.md](frontend/CRITICAL_FIXES.md) - **START HERE** if you have errors
- [FRONTEND_SETUP_COMPLETE.md](frontend/FRONTEND_SETUP_COMPLETE.md) - Complete frontend setup guide
- [QUICK_FIXES.md](frontend/QUICK_FIXES.md) - Database quick fixes
- [SETUP_FIXES.md](frontend/SETUP_FIXES.md) - Authentication setup details

### Database Setup
All SQL files are in `/database/`:
- `fix-rls-policies.sql` - **MUST RUN** - Fixes Supabase Row Level Security
- `fix-config.sql` - Fixes placeholder addresses
- `add-users-table.sql` - Creates users table and auth functions

### Architecture Reference
- Original planning docs (if you have them in `/documentation/`)

---

## Setup Order

### 1. Database Setup (Supabase)
Run these SQL scripts in order:
1. `fix-rls-policies.sql` - **Critical** - Allows API access
2. `add-users-table.sql` - Creates user authentication
3. `fix-config.sql` - Fixes config placeholders

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Environment Variables
Create `/frontend/.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_PUB_KEY=your_anon_key
NEXT_PUBLIC_PLATFORM_NAME=DegenBox
NEXT_PUBLIC_PLATFORM_DOMAIN=degenbox.fun
```

---

## Common Issues

### "Invalid API key" or 401 Errors
**Solution**: Run `/database/fix-rls-policies.sql` in Supabase
**Details**: [CRITICAL_FIXES.md](frontend/CRITICAL_FIXES.md)

### "Wallet not connected" Error
**Solution**: Already fixed in latest code
**Details**: [CRITICAL_FIXES.md](frontend/CRITICAL_FIXES.md)

### Phantom Wallet Warning
**Solution**: Already fixed - PhantomWalletAdapter removed

---

## Features Implemented

### ✅ User Flow
- Wallet connection in header
- Auto-authentication with Supabase
- User dashboard showing all projects
- Project creation wizard (3 steps)
- Subdomain availability checking

### ✅ Admin Flow
- Super admin dashboard (only for admin wallet)
- View all projects across platform
- Pause/activate projects
- Configure platform fees

### ✅ Multi-tenant Architecture
- Subdomain routing (e.g., `catbox.degenbox.fun`)
- Per-project customization
- Network-agnostic (devnet/mainnet switching)

---

## Testing Flow

1. **Connect Wallet** → Header button
2. **Authenticate** → Sign message (creates user account)
3. **View Dashboard** → `/dashboard` route
4. **Create Project** → `/create` route (3-step wizard)
5. **Admin Panel** → `/admin` route (if you're the admin wallet)

---

## Tech Stack

- **Frontend**: Next.js 16 + React 19
- **3D**: React Three Fiber + Drei
- **State**: Zustand
- **Wallet**: Solana Wallet Adapter
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel (with multi-tenant support)

---

## Need Help?

1. Check [CRITICAL_FIXES.md](frontend/CRITICAL_FIXES.md) first
2. Look in the specific documentation files above
3. Check console logs for detailed errors
