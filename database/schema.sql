-- DegenBox Platform Database Schema
-- Multi-tenant Solana lootbox platform
-- Network-agnostic design (devnet → mainnet transition)

-- ============================================
-- SUPER ADMIN CONFIGURATION
-- ============================================
-- Single-row table for platform-wide configuration
-- Controls network, fees, token addresses, etc.

CREATE TABLE super_admin_config (
    id INTEGER PRIMARY KEY DEFAULT 1,

    -- Network Configuration (CRITICAL for devnet → mainnet)
    network TEXT NOT NULL DEFAULT 'devnet',
    rpc_url TEXT NOT NULL,
    lootbox_program_id TEXT NOT NULL,

    -- Network-specific token addresses
    three_eyes_mint TEXT NOT NULL,
    platform_fee_account TEXT NOT NULL,

    -- Configurable fees
    launch_fee_amount BIGINT NOT NULL,
    withdrawal_fee_percentage NUMERIC(5,2) NOT NULL,

    -- Platform settings
    min_box_price BIGINT DEFAULT 1000000,  -- Minimum box price (in lamports/tokens)
    max_projects_per_wallet INTEGER DEFAULT 10,  -- Limit per creator

    -- Safety flags
    is_production BOOLEAN DEFAULT false,
    mainnet_enabled BOOLEAN DEFAULT false,

    -- Admin wallet (same on both networks)
    admin_wallet TEXT NOT NULL DEFAULT 'EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh',

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT only_one_row CHECK (id = 1),
    CONSTRAINT fee_percentage_range CHECK (withdrawal_fee_percentage >= 0 AND withdrawal_fee_percentage <= 100),
    CONSTRAINT network_values CHECK (network IN ('devnet', 'mainnet-beta')),
    CONSTRAINT production_safety CHECK (
        (network = 'mainnet-beta' AND is_production = true) OR
        (network = 'devnet' AND is_production = false)
    )
);

-- Initialize with DEVNET configuration
INSERT INTO super_admin_config (
    id,
    network,
    rpc_url,
    lootbox_program_id,
    three_eyes_mint,
    platform_fee_account,
    launch_fee_amount,
    withdrawal_fee_percentage,
    admin_wallet,
    is_production,
    mainnet_enabled
) VALUES (
    1,
    'devnet',
    'https://api.devnet.solana.com',
    'PLACEHOLDER_PROGRAM_ID_AFTER_DEPLOYMENT',
    'DEVNET_TEST_3EYES_MINT_ADDRESS',
    'DEVNET_PLATFORM_FEE_ATA_ADDRESS',
    100000000000,  -- 100 test tokens (adjust decimals as needed)
    0.50,          -- 0.5% withdrawal fee for testing
    'EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh',
    false,
    false
);

-- Config change audit trail
CREATE TABLE super_admin_config_history (
    id BIGSERIAL PRIMARY KEY,
    changed_at TIMESTAMP DEFAULT NOW(),
    changed_by TEXT NOT NULL,  -- Wallet address
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    reason TEXT
);

CREATE INDEX idx_config_history_changed_at ON super_admin_config_history(changed_at DESC);

-- ============================================
-- PROJECTS TABLE
-- ============================================
-- Stores metadata for each project (lootbox site)
-- Each project = unique subdomain

CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT UNIQUE NOT NULL,  -- Matches on-chain project_id

    -- Owner
    owner_wallet TEXT NOT NULL,

    -- Network tracking (CRITICAL for devnet/mainnet separation)
    network TEXT NOT NULL DEFAULT 'devnet',

    -- Subdomain routing
    subdomain TEXT UNIQUE NOT NULL,  -- e.g., "catbox", "devnet-luckydog"

    -- Project metadata
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,

    -- On-chain configuration
    payment_token_mint TEXT NOT NULL,
    payment_token_symbol TEXT,
    payment_token_decimals INTEGER DEFAULT 9,
    payment_token_logo TEXT,
    box_price BIGINT NOT NULL,

    -- PDAs
    project_pda TEXT NOT NULL,
    vault_pda TEXT NOT NULL,
    vault_authority_pda TEXT NOT NULL,
    vault_token_account TEXT NOT NULL,

    -- Stats (cached from on-chain)
    total_boxes_created BIGINT DEFAULT 0,
    total_boxes_settled BIGINT DEFAULT 0,
    total_jackpots_hit INTEGER DEFAULT 0,
    vault_balance BIGINT DEFAULT 0,
    last_synced_at TIMESTAMP,

    -- Status
    active BOOLEAN DEFAULT true,
    archived BOOLEAN DEFAULT false,
    launch_fee_paid BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT subdomain_format CHECK (subdomain ~ '^[a-z0-9-]{3,63}$'),
    CONSTRAINT network_values CHECK (network IN ('devnet', 'mainnet-beta')),
    CONSTRAINT box_price_positive CHECK (box_price > 0)
);

-- Indexes for fast lookups
CREATE INDEX idx_projects_owner ON projects(owner_wallet);
CREATE INDEX idx_projects_network ON projects(network);
CREATE INDEX idx_projects_subdomain ON projects(subdomain);
CREATE INDEX idx_projects_active ON projects(active) WHERE active = true;
CREATE INDEX idx_projects_project_id ON projects(project_id);

-- ============================================
-- BOXES TABLE
-- ============================================
-- Cached box data for faster queries
-- Synced from on-chain BoxInstance accounts

CREATE TABLE boxes (
    id BIGSERIAL PRIMARY KEY,
    box_id BIGINT NOT NULL,
    project_id BIGINT NOT NULL,

    -- Owner
    owner_wallet TEXT NOT NULL,

    -- Network
    network TEXT NOT NULL,

    -- PDA
    box_pda TEXT UNIQUE NOT NULL,

    -- Box state
    luck INTEGER NOT NULL,
    reward_amount BIGINT,
    box_result INTEGER,  -- 0=dud, 1=rebate, 2=break_even, 3=profit, 4=jackpot
    is_jackpot BOOLEAN DEFAULT false,
    revealed BOOLEAN DEFAULT false,
    settled BOOLEAN DEFAULT false,

    -- VRF data
    randomness_account TEXT,
    random_percentage NUMERIC(10, 8),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    revealed_at TIMESTAMP,
    settled_at TIMESTAMP,

    -- Constraints
    CONSTRAINT network_values CHECK (network IN ('devnet', 'mainnet-beta')),
    CONSTRAINT box_result_values CHECK (box_result IS NULL OR box_result BETWEEN 0 AND 4),
    CONSTRAINT luck_range CHECK (luck >= 5 AND luck <= 60)
);

-- Indexes for queries
CREATE INDEX idx_boxes_project ON boxes(project_id);
CREATE INDEX idx_boxes_owner ON boxes(owner_wallet);
CREATE INDEX idx_boxes_network ON boxes(network);
CREATE INDEX idx_boxes_revealed ON boxes(revealed) WHERE revealed = true;
CREATE INDEX idx_boxes_settled ON boxes(settled) WHERE settled = false;
CREATE INDEX idx_boxes_jackpot ON boxes(is_jackpot) WHERE is_jackpot = true;
CREATE INDEX idx_boxes_created_at ON boxes(created_at DESC);

-- Composite index for project boxes by owner
CREATE INDEX idx_boxes_project_owner ON boxes(project_id, owner_wallet);

-- ============================================
-- RESERVED SUBDOMAINS
-- ============================================
-- Prevent users from claiming platform subdomains

CREATE TABLE reserved_subdomains (
    subdomain TEXT PRIMARY KEY,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert common reserved subdomains
INSERT INTO reserved_subdomains (subdomain, reason) VALUES
    ('www', 'Main website'),
    ('app', 'Main application'),
    ('api', 'API endpoints'),
    ('admin', 'Admin dashboard'),
    ('dashboard', 'User dashboard'),
    ('docs', 'Documentation'),
    ('blog', 'Blog'),
    ('help', 'Help center'),
    ('support', 'Support'),
    ('status', 'Status page'),
    ('staging', 'Staging environment'),
    ('dev', 'Development'),
    ('test', 'Testing'),
    ('demo', 'Demo'),
    ('static', 'Static assets'),
    ('cdn', 'CDN'),
    ('assets', 'Assets'),
    ('mail', 'Email'),
    ('smtp', 'SMTP'),
    ('ftp', 'FTP'),
    ('ns1', 'Nameserver'),
    ('ns2', 'Nameserver'),
    ('vpn', 'VPN'),
    ('secure', 'Security'),
    ('ssl', 'SSL'),
    ('degenbox', 'Platform name'),
    ('3eyes', 'Token name');

-- ============================================
-- ANALYTICS EVENTS
-- ============================================
-- Track platform events for analytics

CREATE TABLE analytics_events (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,  -- 'project_created', 'box_purchased', 'box_revealed', 'box_settled', 'withdrawal'
    project_id BIGINT,
    wallet TEXT,
    network TEXT NOT NULL,

    -- Event data (JSONB for flexibility)
    data JSONB,

    -- Metadata
    user_agent TEXT,
    ip_address TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_project ON analytics_events(project_id);
CREATE INDEX idx_analytics_network ON analytics_events(network);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_super_admin_config_updated_at
    BEFORE UPDATE ON super_admin_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Log config changes automatically
CREATE OR REPLACE FUNCTION log_config_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if specific fields changed
    IF OLD.network IS DISTINCT FROM NEW.network THEN
        INSERT INTO super_admin_config_history (changed_by, field_name, old_value, new_value, reason)
        VALUES ('SYSTEM', 'network', OLD.network, NEW.network, 'Network switched');
    END IF;

    IF OLD.launch_fee_amount IS DISTINCT FROM NEW.launch_fee_amount THEN
        INSERT INTO super_admin_config_history (changed_by, field_name, old_value, new_value, reason)
        VALUES ('SYSTEM', 'launch_fee_amount', OLD.launch_fee_amount::TEXT, NEW.launch_fee_amount::TEXT, 'Launch fee updated');
    END IF;

    IF OLD.withdrawal_fee_percentage IS DISTINCT FROM NEW.withdrawal_fee_percentage THEN
        INSERT INTO super_admin_config_history (changed_by, field_name, old_value, new_value, reason)
        VALUES ('SYSTEM', 'withdrawal_fee_percentage', OLD.withdrawal_fee_percentage::TEXT, NEW.withdrawal_fee_percentage::TEXT, 'Withdrawal fee updated');
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_super_admin_config_changes
    AFTER UPDATE ON super_admin_config
    FOR EACH ROW
    EXECUTE FUNCTION log_config_changes();

-- ============================================
-- ROW LEVEL SECURITY (Optional - for future)
-- ============================================
-- Uncomment when implementing user authentication

-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view all projects" ON projects
--     FOR SELECT USING (true);

-- CREATE POLICY "Users can create their own projects" ON projects
--     FOR INSERT WITH CHECK (auth.uid()::text = owner_wallet);

-- CREATE POLICY "Users can update their own projects" ON projects
--     FOR UPDATE USING (auth.uid()::text = owner_wallet);

-- ============================================
-- SAMPLE QUERIES
-- ============================================

-- Get current network configuration
-- SELECT * FROM super_admin_config WHERE id = 1;

-- Get all active projects on current network
-- SELECT * FROM projects WHERE network = 'devnet' AND active = true AND archived = false;

-- Check subdomain availability (including network prefix)
-- SELECT NOT EXISTS(
--     SELECT 1 FROM projects WHERE subdomain = 'catbox'
-- ) AS available;

-- Get project by subdomain
-- SELECT * FROM projects WHERE subdomain = 'catbox' LIMIT 1;

-- Get user's boxes for a project
-- SELECT * FROM boxes WHERE project_id = 1 AND owner_wallet = 'xxx...' ORDER BY created_at DESC;

-- Get project stats
-- SELECT
--     COUNT(*) as total_boxes,
--     COUNT(*) FILTER (WHERE revealed = true) as revealed_boxes,
--     COUNT(*) FILTER (WHERE settled = true) as settled_boxes,
--     COUNT(*) FILTER (WHERE is_jackpot = true) as jackpots,
--     SUM(reward_amount) FILTER (WHERE settled = true) as total_rewards_paid
-- FROM boxes WHERE project_id = 1;
