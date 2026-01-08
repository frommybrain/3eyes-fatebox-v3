# Network Data Separation Strategy

## Problem

When switching from devnet to mainnet, we'll have:
- Devnet test projects in the database
- Devnet box instances (PDAs on devnet blockchain)
- Mainnet production projects in the database
- Mainnet box instances (PDAs on mainnet blockchain)

**Without proper separation**, users would see:
- Old devnet test projects mixed with real mainnet projects
- Confusing subdomain conflicts (devnet "catbox" vs mainnet "catbox")
- Stats mixing devnet test data with mainnet production data
- No way to distinguish which network a project belongs to

---

## Solution: Network Tagging + Filtering

### Approach 1: Add `network` Field to Projects Table

**Database Schema Update**:

```sql
ALTER TABLE projects
ADD COLUMN network TEXT NOT NULL DEFAULT 'devnet'
ADD CONSTRAINT network_values CHECK (network IN ('devnet', 'mainnet-beta'));

CREATE INDEX idx_projects_network ON projects(network);
```

**When creating a project**, store which network it was created on:

```javascript
// backend/routes/projects.js
router.post('/create', async (req, res) => {
    const networkConfig = await getNetworkConfig();

    // Insert project with current network
    const { data, error } = await supabase
        .from('projects')
        .insert({
            project_id: projectId,
            network: networkConfig.network,  // 'devnet' or 'mainnet-beta'
            subdomain: subdomain,
            // ... other fields
        });
});
```

**When querying projects**, filter by current network:

```javascript
// Only show projects from current network
const networkConfig = await getNetworkConfig();

const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('network', networkConfig.network)  // Filter!
    .eq('active', true);
```

---

## Visual Indicators

### Admin Dashboard

Show network badges on all projects:

```javascript
// Component
function ProjectCard({ project }) {
    return (
        <div className="project-card">
            <div className="project-header">
                <h3>{project.name}</h3>
                {project.network === 'devnet' && (
                    <span className="badge badge-warning">
                        🧪 DEVNET
                    </span>
                )}
                {project.network === 'mainnet-beta' && (
                    <span className="badge badge-success">
                        ✓ MAINNET
                    </span>
                )}
            </div>
            {/* ... rest of card */}
        </div>
    );
}
```

### Super Admin: Network Filter Toggle

```
┌─────────────────────────────────────────┐
│ Projects                                │
├─────────────────────────────────────────┤
│ View: ○ Current Network Only            │
│       ● All Networks (Admin Only)       │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🧪 DEVNET | CatBox Test             │ │
│ │ Created: 2026-01-05                 │ │
│ │ Boxes: 15 | Active                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🧪 DEVNET | DogBox Pilot            │ │
│ │ Created: 2026-01-06                 │ │
│ │ Boxes: 8 | Active                   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ MAINNET | Lucky Cat Boxes         │ │
│ │ Created: 2026-01-15                 │ │
│ │ Boxes: 523 | Active                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Subdomain Handling

### Option A: Network Prefix (Recommended)

**Devnet projects get automatic prefix**:
- User wants: `catbox`
- Devnet subdomain: `devnet-catbox.3eyes.fun`
- Mainnet subdomain: `catbox.3eyes.fun`

**Implementation**:

```javascript
// When creating project
function generateSubdomain(requestedSubdomain, network) {
    if (network === 'devnet') {
        return `devnet-${requestedSubdomain}`;
    }
    return requestedSubdomain;
}

// Subdomain availability check
async function isSubdomainAvailable(subdomain, network) {
    const fullSubdomain = generateSubdomain(subdomain, network);

    const { data } = await supabase
        .from('projects')
        .select('id')
        .eq('subdomain', fullSubdomain)
        .single();

    return !data;  // Available if not found
}
```

**Benefits**:
- Clear visual distinction (devnet- prefix)
- No subdomain conflicts between networks
- Can reuse same name on mainnet
- Users immediately know it's a test project

**Example**:
```
Devnet:
- devnet-catbox.3eyes.fun
- devnet-dogbox.3eyes.fun
- devnet-luckygamble.3eyes.fun

Mainnet:
- catbox.3eyes.fun (different from devnet-catbox)
- dogbox.3eyes.fun
- luckygamble.3eyes.fun
```

### Option B: Separate Subdomains Entirely

Use different root domains:
- Devnet: `catbox.devnet.3eyes.fun`
- Mainnet: `catbox.3eyes.fun`

**Requires**:
- Two wildcard DNS records
- Two wildcard SSL certificates
- More complex routing

**Not recommended** - Option A is simpler.

---

## Frontend Network Detection

### Wallet Adapter Configuration

```javascript
// app/layout.js
'use client';

import { useMemo, useEffect, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';

export default function RootLayout({ children }) {
    const [networkConfig, setNetworkConfig] = useState(null);

    useEffect(() => {
        async function loadConfig() {
            const res = await fetch('/api/config/network');
            const config = await res.json();
            setNetworkConfig(config);
        }
        loadConfig();
    }, []);

    const endpoint = useMemo(() => {
        if (!networkConfig) return 'https://api.devnet.solana.com';

        return networkConfig.network === 'mainnet-beta'
            ? 'https://mainnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6'
            : 'https://api.devnet.solana.com';
    }, [networkConfig]);

    if (!networkConfig) return <div>Loading...</div>;

    return (
        <html>
            <body>
                <ConnectionProvider endpoint={endpoint}>
                    <WalletProvider wallets={[]} autoConnect>
                        {/* Show network badge */}
                        {networkConfig.network === 'devnet' && (
                            <div className="network-badge devnet">
                                🧪 DEVNET MODE
                            </div>
                        )}
                        {children}
                    </WalletProvider>
                </ConnectionProvider>
            </body>
        </html>
    );
}
```

---

## Stats Separation

### Platform-Wide Stats

Filter by network to avoid mixing test data with production:

```javascript
// GET /api/stats/platform
router.get('/platform', async (req, res) => {
    const networkConfig = await getNetworkConfig();

    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('network', networkConfig.network);  // Only current network!

    const stats = {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.active).length,
        // ... calculate stats only for current network
    };

    return res.json({ success: true, stats });
});
```

### Super Admin: Combined Stats

Super admin can view both networks:

```javascript
// GET /api/super-admin/stats/all-networks
router.get('/stats/all-networks', requireAdmin, async (req, res) => {
    const { data: devnetProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('network', 'devnet');

    const { data: mainnetProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('network', 'mainnet-beta');

    return res.json({
        success: true,
        devnet: calculateStats(devnetProjects),
        mainnet: calculateStats(mainnetProjects),
        combined: calculateStats([...devnetProjects, ...mainnetProjects])
    });
});
```

---

## Migration Strategy

### When Switching to Mainnet

**What happens to devnet data?**

1. **Projects remain in database**
   - `network = 'devnet'` stays on old projects
   - They won't show up in queries (filtered out)
   - Super admin can still view them

2. **Subdomains remain reserved**
   - `devnet-catbox.3eyes.fun` still works (points to devnet)
   - But platform is now showing mainnet
   - So devnet subdomains effectively become inactive

3. **Stats separate**
   - Platform stats only show mainnet projects
   - Devnet stats archived
   - Super admin can view historical devnet data

**Cleanup options**:

```sql
-- Option 1: Mark devnet projects as archived
UPDATE projects
SET active = false
WHERE network = 'devnet';

-- Option 2: Add archived flag
ALTER TABLE projects ADD COLUMN archived BOOLEAN DEFAULT false;

UPDATE projects
SET archived = true
WHERE network = 'devnet';

-- Option 3: Move to separate table (if desired)
CREATE TABLE projects_archive AS
SELECT * FROM projects WHERE network = 'devnet';

DELETE FROM projects WHERE network = 'devnet';
```

**Recommended**: Keep devnet projects in database but mark as `archived = true`. Useful for historical reference.

---

## API Route: Network Filtering Middleware

```javascript
// middleware/filterByNetwork.js
const { getNetworkConfig } = require('../lib/getNetworkConfig');

/**
 * Middleware to automatically filter database queries by current network
 */
async function filterByNetwork(req, res, next) {
    try {
        const config = await getNetworkConfig();

        // Attach to request for use in routes
        req.currentNetwork = config.network;
        req.networkConfig = config;

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Failed to load network configuration'
        });
    }
}

module.exports = { filterByNetwork };
```

**Usage in routes**:

```javascript
const { filterByNetwork } = require('../middleware/filterByNetwork');

// Apply to all project routes
router.use('/projects', filterByNetwork);

router.get('/projects', async (req, res) => {
    // req.currentNetwork is available
    const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('network', req.currentNetwork);  // Auto-filtered!

    return res.json({ success: true, projects: data });
});
```

---

## Frontend: Network Badge Component

```javascript
// components/NetworkBadge.jsx
export function NetworkBadge({ network, size = 'md' }) {
    if (network === 'devnet') {
        return (
            <span className={`badge badge-warning badge-${size}`}>
                🧪 DEVNET
            </span>
        );
    }

    if (network === 'mainnet-beta') {
        return (
            <span className={`badge badge-success badge-${size}`}>
                ✓ MAINNET
            </span>
        );
    }

    return null;
}

// Usage
<div className="project-header">
    <h2>{project.name}</h2>
    <NetworkBadge network={project.network} />
</div>
```

---

## Database View: Current Network Projects

Create a view that automatically filters by current network:

```sql
-- This requires a function to get current network from super_admin_config
CREATE OR REPLACE FUNCTION get_current_network()
RETURNS TEXT AS $$
    SELECT network FROM super_admin_config WHERE id = 1;
$$ LANGUAGE SQL STABLE;

-- View of projects on current network
CREATE VIEW current_network_projects AS
SELECT *
FROM projects
WHERE network = get_current_network()
  AND archived = false;

-- Now queries can use the view
SELECT * FROM current_network_projects WHERE active = true;
```

---

## Testing the Separation

### Devnet Phase

1. Create 3 test projects:
   - `devnet-catbox.3eyes.fun`
   - `devnet-dogbox.3eyes.fun`
   - `devnet-testgame.3eyes.fun`

2. Database shows:
   ```sql
   SELECT subdomain, network FROM projects;

   subdomain           | network
   --------------------|--------
   devnet-catbox       | devnet
   devnet-dogbox       | devnet
   devnet-testgame     | devnet
   ```

3. Frontend shows:
   - Network badge: "🧪 DEVNET MODE" at top
   - All projects have "🧪 DEVNET" badge
   - Stats show only devnet projects

### After Mainnet Switch

1. Database still has devnet projects:
   ```sql
   SELECT subdomain, network, archived FROM projects;

   subdomain           | network        | archived
   --------------------|----------------|----------
   devnet-catbox       | devnet         | true
   devnet-dogbox       | devnet         | true
   devnet-testgame     | devnet         | true
   ```

2. Create mainnet project:
   - `catbox.3eyes.fun` (NO prefix)

   ```sql
   catbox              | mainnet-beta   | false
   ```

3. Frontend shows:
   - Network badge: REMOVED (mainnet is default)
   - Only mainnet project visible
   - Devnet projects hidden (archived)
   - Stats show only mainnet data

4. Super admin can toggle to see all:
   ```
   View: ● All Networks

   🧪 DEVNET | devnet-catbox (archived)
   🧪 DEVNET | devnet-dogbox (archived)
   🧪 DEVNET | devnet-testgame (archived)
   ✓ MAINNET | catbox (active)
   ```

---

## Summary

### Database Changes Required

```sql
-- 1. Add network column to projects
ALTER TABLE projects
ADD COLUMN network TEXT NOT NULL DEFAULT 'devnet',
ADD COLUMN archived BOOLEAN DEFAULT false;

ALTER TABLE projects
ADD CONSTRAINT network_values CHECK (network IN ('devnet', 'mainnet-beta'));

CREATE INDEX idx_projects_network ON projects(network);

-- 2. Archive devnet projects when switching
-- (Run this AFTER switching to mainnet)
UPDATE projects
SET archived = true
WHERE network = 'devnet';
```

### Backend Changes Required

```javascript
// 1. Always store network when creating project
network: networkConfig.network

// 2. Always filter by network when querying
.eq('network', req.currentNetwork)

// 3. Prefix devnet subdomains
subdomain: network === 'devnet' ? `devnet-${subdomain}` : subdomain
```

### Frontend Changes Required

```javascript
// 1. Show network badge in devnet mode
{config.network === 'devnet' && <DevnetBadge />}

// 2. Show network badge on projects
<NetworkBadge network={project.network} />

// 3. Super admin: toggle to view all networks
<NetworkFilter />
```

---

## Benefits

✅ **Clear separation** - Devnet and mainnet data never mixed
✅ **No confusion** - Users see only relevant network
✅ **Historical data** - Can review devnet testing if needed
✅ **Subdomain safety** - `devnet-` prefix prevents conflicts
✅ **Stats accuracy** - Production stats not polluted by test data
✅ **Admin oversight** - Super admin can view both networks
✅ **Easy cleanup** - Archive devnet projects when ready

---

**Created**: 2026-01-07
**Author**: Claude (via 3Eyes team)
**Status**: Implementation Guide
