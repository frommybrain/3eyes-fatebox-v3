# DegenBox Project Structure

## Repository Layout

```
3eyes-fatebox-v3/
├── documentation/              # Original planning docs from previous session
│   ├── PLATFORM_SPEC.md       # Complete technical specification
│   ├── DEVNET_MAINNET_STRATEGY.md
│   ├── NETWORK_DATA_SEPARATION.md
│   ├── DEPLOY_WALLET_MANAGEMENT.md
│   ├── QUICK_REFERENCE.md
│   ├── UPDATES_SUMMARY.md
│   └── REFERENCE_FILES/       # Working code from FateBox v2
│
├── database/                   # Database setup
│   ├── schema.sql             # Complete Supabase schema (RUN THIS FIRST!)
│   └── README.md              # Database setup instructions
│
├── frontend/                   # Next.js 16 application
│   ├── app/                   # Next.js App Router
│   │   ├── layout.js          # Root layout (DegenBox branding)
│   │   ├── page.js            # Homepage (your existing page with MainCanvas)
│   │   ├── project/
│   │   │   └── [subdomain]/   # Dynamic project pages
│   │   │       └── page.js    # Route: /project/[subdomain]
│   │   ├── admin/             # Super admin dashboard (TODO)
│   │   ├── dashboard/         # User dashboard (TODO)
│   │   └── create/            # Project creation flow (TODO)
│   │
│   ├── components/
│   │   ├── three/             # Your existing 3D components
│   │   │   ├── mainCanvas.jsx # Main 3D canvas (UNCHANGED)
│   │   │   ├── mainScene.jsx
│   │   │   └── lights.jsx
│   │   │
│   │   ├── project/           # Project-specific components
│   │   │   └── ProjectPage.jsx # Main project page component
│   │   │
│   │   ├── ui/                # Your existing UI components
│   │   │   └── header.jsx
│   │   │
│   │   ├── wallet/            # Wallet components (TODO)
│   │   ├── admin/             # Admin components (TODO)
│   │   └── create/            # Creation flow components (TODO)
│   │
│   ├── lib/                   # Utilities and helpers
│   │   ├── supabase.js        # Supabase client config
│   │   ├── getNetworkConfig.js # Network config loader (CRITICAL)
│   │   └── transactions/      # Solana transaction helpers (TODO)
│   │
│   ├── store/                 # Zustand state management
│   │   ├── useNetworkStore.js # Network config state
│   │   └── useProjectStore.js # Project data state
│   │
│   ├── middleware.js          # Multi-tenant subdomain routing
│   ├── .env.local            # Environment variables
│   └── package.json          # Dependencies
│
├── backend/                   # Express API server (TODO)
│   └── (To be created when needed for admin operations)
│
├── programs/                  # Anchor Rust program (TODO)
│   └── (To be created for on-chain program)
│
├── FRONTEND_SETUP_COMPLETE.md # This guide - START HERE!
└── DIRECTORY_STRUCTURE.md     # This file
```

## Key Files Explained

### 🔧 Configuration Files

**`/frontend/.env.local`**
- Supabase credentials
- Platform domain and name
- CRITICAL: Must be set before running

**`/database/schema.sql`**
- Complete database schema
- Run this in Supabase SQL Editor first!

### 🛣️ Routing System

**`/frontend/middleware.js`**
- Handles all subdomain routing
- Maps subdomains to project pages
- Example: `catbox.degenbox.fun` → `/project/catbox`

**`/frontend/app/project/[subdomain]/page.js`**
- Dynamic route for all project subdomains
- Receives subdomain as parameter
- Renders `ProjectPage.jsx` component

### 🧠 State Management

**`/frontend/store/useNetworkStore.js`**
- Global network configuration
- Reads from `super_admin_config` table
- Handles devnet ↔ mainnet switching
- 1-minute cache with realtime updates

**`/frontend/store/useProjectStore.js`**
- Project data loading and caching
- Load by subdomain or project_id
- Realtime project updates
- Owner-specific queries

### 🎨 Components

**`/frontend/components/project/ProjectPage.jsx`**
- Main project page UI
- Shows project branding (name, logo, description)
- Displays box price and stats
- Uses MainCanvas as background
- Handles loading/error states

**`/frontend/components/three/mainCanvas.jsx`**
- Your existing 3D canvas
- UNCHANGED from original
- Used as background for all project pages

### 📚 Libraries

**`/frontend/lib/supabase.js`**
- Supabase client initialization
- Connection testing helper

**`/frontend/lib/getNetworkConfig.js`**
- Network configuration loader
- **MOST IMPORTANT UTILITY**
- Enables network-agnostic design
- Functions:
  - `getNetworkConfig()` - Load config from DB
  - `generateSubdomain()` - Add network prefix
  - `checkSubdomainAvailability()` - Validate subdomain
  - `subscribeToNetworkConfig()` - Realtime updates

## How Routing Works

### 1. User visits subdomain
```
https://catbox.degenbox.fun
```

### 2. Middleware intercepts
```javascript
// middleware.js extracts subdomain: "catbox"
const subdomain = getSubdomain('catbox.degenbox.fun');
// → "catbox"
```

### 3. Rewrites to dynamic route
```javascript
// Internally rewrites to:
/project/catbox
```

### 4. Next.js serves page
```javascript
// app/project/[subdomain]/page.js
// Receives params: { subdomain: "catbox" }
```

### 5. Component loads data
```javascript
// components/project/ProjectPage.jsx
// Loads project from Supabase WHERE subdomain = "catbox"
```

### 6. Renders with MainCanvas
```jsx
<>
  <ProjectUI /> {/* Overlay with project info */}
  <MainCanvas /> {/* Your 3D background */}
</>
```

## Data Flow

```
User Visit → Middleware → Dynamic Route → ProjectPage Component
                                              ↓
                                         useProjectStore
                                              ↓
                                         Load from Supabase
                                              ↓
                                         Render UI + MainCanvas
```

## Network Configuration Flow

```
App Initialization → useNetworkStore.loadConfig()
                           ↓
                  Query super_admin_config table
                           ↓
                  Cache config for 1 minute
                           ↓
                  Subscribe to realtime updates
                           ↓
                  Config available globally
```

## File Naming Conventions

- `.js` - Server components (default in Next.js 16)
- `.jsx` - Client components (use 'use client' directive)
- `use*.js` - Zustand stores (hooks)
- `*.sql` - Database files

## What's Complete vs TODO

### ✅ Complete
- Database schema
- Supabase configuration
- Network config system
- Multi-tenant routing
- Zustand stores
- Dynamic project pages
- MainCanvas integration
- Error handling
- Loading states

### ⏳ TODO (Next Phase)
- Wallet integration
- Buy box transaction flow
- Project creation UI
- Super admin dashboard
- User dashboard
- Reveal/settle box flows
- Rust program development

## Quick Commands

### Start Development Server
```bash
cd frontend
npm run dev
```

### Test Subdomain (Local)
```
http://localhost:3000?subdomain=devnet-catbox
```

### Install New Package
```bash
cd frontend
npm install package-name
```

### View Database
Open Supabase dashboard → Table Editor

### Run SQL
Open Supabase dashboard → SQL Editor

## Environment Variables Reference

### Frontend (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUB_KEY=...
NEXT_PUBLIC_PLATFORM_NAME=DegenBox
NEXT_PUBLIC_PLATFORM_DOMAIN=degenbox.fun
```

### Backend (when created)
```bash
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=... (service role key)
ADMIN_WALLET=EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh
```

## Useful Scripts (package.json)

```json
{
  "scripts": {
    "dev": "next dev",          // Development server
    "build": "next build",      // Production build
    "start": "next start",      // Production server
    "lint": "eslint"            // Linting
  }
}
```

## Import Aliases

Using `@/` alias for cleaner imports:

```javascript
// Instead of:
import Component from '../../../components/Component'

// Use:
import Component from '@/components/Component'
```

Configured in Next.js by default for `/frontend` directory.

## Common Paths

### Read Network Config
```javascript
import useNetworkStore from '@/store/useNetworkStore';
const { config } = useNetworkStore();
```

### Read Project Data
```javascript
import useProjectStore from '@/store/useProjectStore';
const { currentProject } = useProjectStore();
```

### Query Supabase
```javascript
import { supabase } from '@/lib/supabase';
const { data } = await supabase.from('projects').select('*');
```

### Load Network Config
```javascript
import { getNetworkConfig } from '@/lib/getNetworkConfig';
const config = await getNetworkConfig();
```

## Next Steps

1. **Database Setup** (5 min)
   - Run `/database/schema.sql` in Supabase

2. **Test Project** (2 min)
   - Insert test project (SQL in FRONTEND_SETUP_COMPLETE.md)

3. **Start Dev Server** (1 min)
   - `cd frontend && npm run dev`

4. **Test Routing** (1 min)
   - Visit `localhost:3000?subdomain=devnet-catbox`

5. **Begin Wallet Integration** (next phase)
   - See FRONTEND_SETUP_COMPLETE.md for tasks

---

Ready to build! 🚀
