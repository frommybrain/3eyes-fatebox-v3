# DegenBox Database Setup

This directory contains the SQL schema for the DegenBox multi-tenant platform.

## Quick Setup (Supabase)

### 1. Open Supabase SQL Editor

Go to your Supabase project:
https://supabase.com/dashboard/project/vquuilevmbvausytplys

Then navigate to: **SQL Editor** in the left sidebar

### 2. Run the Schema

Copy the entire contents of `schema.sql` and paste into the SQL Editor, then click **Run**.

This will create:
- ✅ `super_admin_config` - Platform configuration (network, fees, tokens)
- ✅ `super_admin_config_history` - Audit trail for config changes
- ✅ `projects` - Project metadata and subdomain routing
- ✅ `boxes` - Cached box data from on-chain
- ✅ `reserved_subdomains` - Prevent platform subdomain conflicts
- ✅ `analytics_events` - Event tracking
- ✅ Triggers for automatic `updated_at` and change logging
- ✅ All necessary indexes

### 3. Verify Setup

Run this query to verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- View current config
SELECT * FROM super_admin_config;

-- Check reserved subdomains
SELECT COUNT(*) FROM reserved_subdomains;
```

You should see:
- 6 tables created
- 1 row in `super_admin_config` (devnet configuration)
- 27 reserved subdomains

## Important Configuration Notes

### Admin Wallet

The admin wallet is set to your new deploy wallet:
```
EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh
```

This wallet has super admin access to:
- Update platform configuration
- Change fees
- Switch networks (devnet ↔ mainnet)
- View all projects

### Initial Network Config

The platform starts in **DEVNET MODE**:
- Network: `devnet`
- RPC: `https://api.devnet.solana.com`
- Production flag: `false`
- Mainnet flag: `false`

### Placeholder Values

You'll need to update these after deploying the Rust program:

1. **`lootbox_program_id`** - Set this after deploying the Anchor program
2. **`three_eyes_mint`** - Set this after creating the devnet test token
3. **`platform_fee_account`** - Set this to your platform's ATA for $3EYES

#### Update Query Template

```sql
UPDATE super_admin_config
SET
    lootbox_program_id = 'YOUR_DEPLOYED_PROGRAM_ID',
    three_eyes_mint = 'YOUR_DEVNET_3EYES_MINT',
    platform_fee_account = 'YOUR_PLATFORM_FEE_ATA'
WHERE id = 1;
```

## Network Transition Strategy

### Phase 1: Development (Current)
```sql
SELECT network, is_production, mainnet_enabled
FROM super_admin_config;
-- Result: devnet, false, false
```

All projects created will have:
- `network = 'devnet'`
- Subdomain prefix: `devnet-{name}.degenbox.fun`

### Phase 2: Mainnet Deployment

After deploying the SAME Rust program to mainnet (~$500-1000 ONE TIME):

```sql
-- Switch to mainnet
UPDATE super_admin_config
SET
    network = 'mainnet-beta',
    rpc_url = 'https://mainnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6',
    three_eyes_mint = 'MAINNET_3EYES_MINT_ADDRESS',
    platform_fee_account = 'MAINNET_PLATFORM_FEE_ATA',
    launch_fee_amount = 10000000000,  -- 10,000 $3EYES (adjust decimals)
    withdrawal_fee_percentage = 2.00,  -- 2% fee
    is_production = true,
    mainnet_enabled = true
WHERE id = 1;
```

All NEW projects will now have:
- `network = 'mainnet-beta'`
- Subdomain: `{name}.degenbox.fun` (no prefix)

Old devnet projects remain in database but are filtered out by network.

## Subdomain Management

### Check Subdomain Availability

```sql
-- Check if subdomain exists (including reserved)
SELECT
    CASE
        WHEN EXISTS(SELECT 1 FROM reserved_subdomains WHERE subdomain = 'catbox') THEN 'reserved'
        WHEN EXISTS(SELECT 1 FROM projects WHERE subdomain = 'catbox') THEN 'taken'
        ELSE 'available'
    END as status;
```

### Add Reserved Subdomain

```sql
INSERT INTO reserved_subdomains (subdomain, reason)
VALUES ('new-reserved', 'Reason for reservation');
```

### Generate Network-Prefixed Subdomain

For devnet projects, automatically prefix with `devnet-`:

```javascript
// Frontend/backend logic
function generateSubdomain(requestedName, network) {
    if (network === 'devnet') {
        return `devnet-${requestedName}`;
    }
    return requestedName;
}
```

## Useful Queries

### Get Current Platform Configuration
```sql
SELECT
    network,
    rpc_url,
    three_eyes_mint,
    launch_fee_amount,
    withdrawal_fee_percentage,
    is_production
FROM super_admin_config;
```

### List All Active Projects (Current Network)
```sql
SELECT
    subdomain,
    name,
    owner_wallet,
    box_price,
    total_boxes_created,
    active,
    created_at
FROM projects
WHERE network = (SELECT network FROM super_admin_config WHERE id = 1)
    AND active = true
    AND archived = false
ORDER BY created_at DESC;
```

### Project Statistics
```sql
SELECT
    p.subdomain,
    p.name,
    COUNT(b.id) as total_boxes,
    COUNT(b.id) FILTER (WHERE b.revealed = true) as revealed,
    COUNT(b.id) FILTER (WHERE b.settled = true) as settled,
    COUNT(b.id) FILTER (WHERE b.is_jackpot = true) as jackpots,
    SUM(b.reward_amount) FILTER (WHERE b.settled = true) as total_rewards
FROM projects p
LEFT JOIN boxes b ON p.project_id = b.project_id
WHERE p.project_id = 1
GROUP BY p.subdomain, p.name;
```

### Platform-Wide Analytics
```sql
SELECT
    COUNT(DISTINCT project_id) as total_projects,
    COUNT(*) as total_boxes,
    COUNT(*) FILTER (WHERE revealed = true) as revealed_boxes,
    COUNT(*) FILTER (WHERE settled = true) as settled_boxes,
    COUNT(*) FILTER (WHERE is_jackpot = true) as total_jackpots
FROM boxes
WHERE network = (SELECT network FROM super_admin_config WHERE id = 1);
```

### Config Change History
```sql
SELECT
    changed_at,
    field_name,
    old_value,
    new_value,
    reason
FROM super_admin_config_history
ORDER BY changed_at DESC
LIMIT 10;
```

## Security Notes

### Current State (Development)
- No Row Level Security (RLS) enabled
- All tables publicly accessible via Supabase client
- Admin authentication via wallet signature verification in backend

### Future Enhancement (Optional)
Uncomment the RLS policies in `schema.sql` to enable:
- Users can only modify their own projects
- Public read access maintained
- Admin bypass for super admin wallet

## Troubleshooting

### Error: "relation already exists"
Some tables already exist. Either:
1. Drop all tables first: **Be careful, this deletes all data!**
```sql
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS boxes CASCADE;
DROP TABLE IF EXISTS reserved_subdomains CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS super_admin_config_history CASCADE;
DROP TABLE IF EXISTS super_admin_config CASCADE;
```

2. Or run only the missing table creation statements

### Error: "constraint violation"
Check the constraints in the error message and verify your data meets:
- Subdomain format: lowercase, alphanumeric, hyphens, 3-63 chars
- Network values: only 'devnet' or 'mainnet-beta'
- Withdrawal fee: 0-100%
- Box price: must be positive

## Next Steps

After database setup:

1. ✅ Database schema created
2. ⏳ Install Supabase client in frontend
3. ⏳ Create `lib/getNetworkConfig.js` to read config
4. ⏳ Build project creation flow
5. ⏳ Implement subdomain routing middleware
6. ⏳ Create super admin dashboard

See the main documentation in `/documentation/PLATFORM_SPEC.md` for full implementation details.
