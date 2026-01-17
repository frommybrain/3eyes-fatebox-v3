-- ============================================
-- DegenBox v3 - Clean Database Schema
-- ============================================
-- Run this ENTIRE script in Supabase SQL Editor
-- This creates all tables from scratch
-- ============================================

-- ============================================
-- 1. Super Admin Configuration Table
-- ============================================
CREATE TABLE IF NOT EXISTS super_admin_config (
    id INTEGER PRIMARY KEY DEFAULT 1,

    -- Network settings
    network TEXT NOT NULL DEFAULT 'devnet', -- 'devnet' or 'mainnet'
    rpc_url TEXT NOT NULL DEFAULT 'https://api.devnet.solana.com',

    -- Program addresses (Solana public keys)
    lootbox_program_id TEXT NOT NULL DEFAULT '11111111111111111111111111111111',
    three_eyes_mint TEXT NOT NULL DEFAULT '11111111111111111111111111112222',

    -- Admin wallet
    admin_wallet TEXT NOT NULL,

    -- Fee configuration (legacy - kept for reference)
    platform_fee_account TEXT NOT NULL,
    launch_fee_amount BIGINT NOT NULL DEFAULT 1000000000, -- 1 SOL in lamports
    withdrawal_fee_percentage DECIMAL(5,2) NOT NULL DEFAULT 2.50, -- 2.5% (DEPRECATED - not used)

    -- Platform commission configuration (new)
    platform_commission_bps INTEGER NOT NULL DEFAULT 500,  -- 5% commission on box purchases (basis points)
    dev_cut_bps INTEGER NOT NULL DEFAULT 1000,             -- 10% of commission to dev wallet (basis points)
    dev_wallet TEXT,                                        -- Dev wallet for SOL payments (defaults to admin_wallet if null)
    treasury_pda TEXT,                                      -- Global treasury PDA address

    -- Platform settings
    platform_active BOOLEAN DEFAULT true,
    maintenance_mode BOOLEAN DEFAULT false,

    -- Game settings
    luck_interval_seconds INTEGER NOT NULL DEFAULT 3, -- Seconds between luck increases (3 for dev, 10800 for production)

    -- Vault funding requirement
    vault_fund_amount BIGINT NOT NULL DEFAULT 50000000000000000, -- 50M tokens (with 9 decimals) required to fund vault on project creation

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Ensure only one config row
    CONSTRAINT single_config_row CHECK (id = 1)
);

-- Disable RLS on config table (it's public read data)
ALTER TABLE super_admin_config DISABLE ROW LEVEL SECURITY;

-- Grant read access to everyone
GRANT SELECT ON super_admin_config TO anon, authenticated;

-- ============================================
-- 2. Projects Table
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Project identity
    project_name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    description TEXT,

    -- Owner (wallet address - no users table needed)
    owner_wallet TEXT NOT NULL,

    -- Vault (program-controlled wallet for this project)
    vault_wallet TEXT NOT NULL,
    vault_pda TEXT,
    vault_authority_pda TEXT,
    vault_token_account TEXT,
    vault_funded BOOLEAN DEFAULT false,
    vault_funded_amount BIGINT,
    vault_funded_at TIMESTAMP,

    -- Box configuration
    box_price BIGINT NOT NULL, -- in lamports
    max_boxes INTEGER NOT NULL DEFAULT 99999,
    boxes_created INTEGER DEFAULT 0,

    -- Project status
    is_active BOOLEAN DEFAULT true,
    is_paused BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    archived BOOLEAN DEFAULT false,

    -- Timestamps
    launch_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_subdomain CHECK (subdomain ~ '^[a-z0-9-]+$'),
    CONSTRAINT valid_box_price CHECK (box_price > 0),
    CONSTRAINT valid_max_boxes CHECK (max_boxes > 0)
);

-- Enable RLS on projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read projects (needed for subdomain routing)
CREATE POLICY "Anyone can read projects"
    ON projects
    FOR SELECT
    USING (true);

-- Allow anyone to insert projects (we validate wallet in app)
CREATE POLICY "Anyone can create projects"
    ON projects
    FOR INSERT
    WITH CHECK (true);

-- Allow anyone to update projects (we validate ownership in app)
CREATE POLICY "Anyone can update projects"
    ON projects
    FOR UPDATE
    USING (true);

-- ============================================
-- 3. Boxes Table
-- ============================================
CREATE TABLE IF NOT EXISTS boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Box identity
    box_number INTEGER NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Ownership
    owner_wallet TEXT NOT NULL,

    -- Box result (DB: 0=pending, 1-5=results; On-chain uses 0-4 for tiers)
    -- DB value = on-chain tier + 1 (to reserve 0 for pending)
    -- Mapping: 0=pending, 1=dud, 2=rebate, 3=break-even, 4=profit, 5=jackpot
    box_result INTEGER DEFAULT 0,
    payout_amount BIGINT DEFAULT 0, -- in lamports

    -- Switchboard VRF randomness (for provable fairness)
    randomness_account TEXT, -- Switchboard randomness account public key
    randomness_committed BOOLEAN DEFAULT false, -- Whether randomness has been committed

    -- Metadata
    opened_at TIMESTAMP,
    settled_at TIMESTAMP, -- When reward was claimed/settled
    created_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_box_result CHECK (box_result BETWEEN 0 AND 5),
    CONSTRAINT unique_box_per_project UNIQUE (project_id, box_number)
);

-- Enable RLS on boxes
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read boxes
CREATE POLICY "Anyone can read boxes"
    ON boxes
    FOR SELECT
    USING (true);

-- Allow anyone to create boxes
CREATE POLICY "Anyone can create boxes"
    ON boxes
    FOR INSERT
    WITH CHECK (true);

-- Allow anyone to update boxes
CREATE POLICY "Anyone can update boxes"
    ON boxes
    FOR UPDATE
    USING (true);

-- ============================================
-- 4. Indexes for Performance
-- ============================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_projects_subdomain ON projects(subdomain);
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);

-- Boxes indexes
CREATE INDEX IF NOT EXISTS idx_boxes_project ON boxes(project_id);
CREATE INDEX IF NOT EXISTS idx_boxes_owner ON boxes(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_boxes_result ON boxes(box_result);
CREATE INDEX IF NOT EXISTS idx_boxes_created ON boxes(created_at DESC);

-- ============================================
-- 5. Auto-update Timestamps
-- ============================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS update_super_admin_config_updated_at ON super_admin_config;
CREATE TRIGGER update_super_admin_config_updated_at
    BEFORE UPDATE ON super_admin_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Helper Functions
-- ============================================

-- Function to check subdomain availability
CREATE OR REPLACE FUNCTION check_subdomain_available(
    p_subdomain TEXT,
    p_exclude_project_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM projects
        WHERE subdomain = p_subdomain
        AND (p_exclude_project_id IS NULL OR id != p_exclude_project_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_subdomain_available TO anon, authenticated;

-- Function to get project stats
CREATE OR REPLACE FUNCTION get_project_stats(p_project_id UUID)
RETURNS TABLE(
    total_boxes INTEGER,
    total_opened INTEGER,
    total_payout BIGINT,
    total_revenue BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_boxes,
        COUNT(*) FILTER (WHERE box_result > 0)::INTEGER as total_opened, -- box_result > 0 means revealed (0=pending)
        COALESCE(SUM(payout_amount), 0)::BIGINT as total_payout,
        (COUNT(*) * (SELECT box_price FROM projects WHERE id = p_project_id))::BIGINT as total_revenue
    FROM boxes
    WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_project_stats TO anon, authenticated;

-- ============================================
-- 7. Insert Default Config
-- ============================================

-- Insert default super admin config (update the admin_wallet to your wallet)
INSERT INTO super_admin_config (
    id,
    network,
    rpc_url,
    admin_wallet,
    platform_fee_account,
    lootbox_program_id,
    three_eyes_mint
) VALUES (
    1,
    'devnet',
    'https://api.devnet.solana.com',
    'EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh', -- Your admin wallet
    'EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh', -- Your fee collection wallet
    '11111111111111111111111111111111', -- System Program (placeholder)
    '11111111111111111111111111111112'  -- Placeholder token mint
)
ON CONFLICT (id) DO UPDATE SET
    admin_wallet = EXCLUDED.admin_wallet,
    platform_fee_account = EXCLUDED.platform_fee_account,
    updated_at = NOW();

-- ============================================
-- 8. Verification
-- ============================================

-- Verify tables exist
SELECT
    'Tables Check' as check_type,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'super_admin_config') THEN '✅' ELSE '❌' END as super_admin_config,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN '✅' ELSE '❌' END as projects,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'boxes') THEN '✅' ELSE '❌' END as boxes;

-- Verify config data
SELECT
    '=== CONFIG DATA ===' as status,
    network,
    admin_wallet,
    'Config loaded successfully!' as message
FROM super_admin_config
WHERE id = 1;

-- Success message
SELECT
    '=== ✅ DATABASE READY ===' as message,
    'You can now start your app!' as next_step;
