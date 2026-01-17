-- Migration: Enterprise Activity Logging System
-- Date: January 2026
-- Reason: Comprehensive logging for platform monitoring, debugging, and analytics
--         Enterprise-grade implementation for pump.fun-scale operations

-- ============================================================================
-- ACTIVITY_LOGS TABLE
-- Core logging table for all platform events
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_logs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Timestamp (indexed for range queries)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Event Classification
    event_type VARCHAR(50) NOT NULL,           -- e.g., 'project.created', 'box.purchased'
    event_category VARCHAR(30) NOT NULL,       -- e.g., 'project', 'box', 'treasury', 'admin'
    severity VARCHAR(10) NOT NULL DEFAULT 'info',  -- 'debug', 'info', 'warning', 'error', 'critical'

    -- Actor Information
    actor_type VARCHAR(20) NOT NULL,           -- 'user', 'creator', 'admin', 'system'
    actor_wallet VARCHAR(50),                  -- Solana wallet address (nullable for system events)
    actor_id UUID,                             -- User/creator ID if applicable

    -- Target/Subject
    project_id BIGINT,                         -- Project ID if relevant
    project_subdomain VARCHAR(100),            -- Project subdomain for easy filtering
    box_id BIGINT,                             -- Box ID if relevant

    -- Transaction Details (for on-chain events)
    transaction_signature VARCHAR(100),        -- Solana transaction signature
    transaction_status VARCHAR(20),            -- 'pending', 'confirmed', 'failed'

    -- Financial Data
    amount_lamports BIGINT,                    -- Amount in lamports if applicable
    amount_tokens BIGINT,                      -- Amount in tokens if applicable
    token_mint VARCHAR(50),                    -- Token mint address

    -- Contextual Data (JSON for flexibility)
    metadata JSONB DEFAULT '{}',               -- Additional event-specific data

    -- Error Information
    error_code VARCHAR(50),                    -- Error code if applicable
    error_message TEXT,                        -- Error message for debugging

    -- Request Context
    request_id UUID,                           -- For tracing related events
    ip_address INET,                           -- Client IP (for security auditing)
    user_agent TEXT,                           -- Client user agent

    -- Processing Status
    processed BOOLEAN DEFAULT FALSE,           -- For async processing/aggregation

    -- Indexes will be created below
    CONSTRAINT valid_severity CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    CONSTRAINT valid_actor_type CHECK (actor_type IN ('user', 'creator', 'admin', 'system'))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- Optimized for common query patterns
-- ============================================================================

-- Time-based queries (most common)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at DESC);

-- Filter by event type and category
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON activity_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_category ON activity_logs (event_category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_severity ON activity_logs (severity) WHERE severity IN ('warning', 'error', 'critical');

-- Actor queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_wallet ON activity_logs (actor_wallet) WHERE actor_wallet IS NOT NULL;

-- Project queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON activity_logs (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_project_subdomain ON activity_logs (project_subdomain) WHERE project_subdomain IS NOT NULL;

-- Transaction lookups
CREATE INDEX IF NOT EXISTS idx_activity_logs_tx_signature ON activity_logs (transaction_signature) WHERE transaction_signature IS NOT NULL;

-- Composite index for common admin queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_category_time ON activity_logs (event_category, created_at DESC);

-- Unprocessed logs (for async aggregation)
CREATE INDEX IF NOT EXISTS idx_activity_logs_unprocessed ON activity_logs (processed, created_at) WHERE processed = FALSE;

-- ============================================================================
-- LOG_AGGREGATES TABLE
-- Pre-computed aggregates for dashboard performance
-- ============================================================================

CREATE TABLE IF NOT EXISTS log_aggregates (
    id SERIAL PRIMARY KEY,

    -- Time bucket
    time_bucket TIMESTAMPTZ NOT NULL,          -- Hourly bucket
    bucket_type VARCHAR(10) NOT NULL DEFAULT 'hourly',  -- 'hourly', 'daily', 'weekly'

    -- Dimensions
    event_category VARCHAR(30),
    project_id BIGINT,

    -- Counts
    total_events INTEGER DEFAULT 0,
    info_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,

    -- Financial Aggregates
    total_lamports BIGINT DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint for upsert
    UNIQUE (time_bucket, bucket_type, event_category, project_id)
);

CREATE INDEX IF NOT EXISTS idx_log_aggregates_time ON log_aggregates (time_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_log_aggregates_category ON log_aggregates (event_category);

-- ============================================================================
-- SYSTEM_HEALTH_LOGS TABLE
-- System-level health and performance metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_health_logs (
    id SERIAL PRIMARY KEY,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Health Metrics
    metric_name VARCHAR(50) NOT NULL,          -- e.g., 'rpc_latency', 'db_connections', 'api_errors'
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(20),                   -- e.g., 'ms', 'count', 'percentage'

    -- Context
    service VARCHAR(50),                       -- e.g., 'backend', 'frontend', 'solana'
    environment VARCHAR(20),                   -- e.g., 'production', 'devnet'

    -- Additional Data
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_system_health_time ON system_health_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_metric ON system_health_logs (metric_name, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Only super admins can access logs
-- Note: Admin wallet is stored in super_admin_config.admin_wallet
-- ============================================================================

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_logs ENABLE ROW LEVEL SECURITY;

-- Super admin policy for activity_logs
-- Checks if the authenticated user's wallet matches the admin_wallet in super_admin_config
CREATE POLICY "Super admins can view all activity logs"
    ON activity_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM super_admin_config sac
            WHERE sac.admin_wallet = auth.jwt() ->> 'sub'
            AND sac.id = 1
        )
    );

-- Allow insert from service role (backend)
CREATE POLICY "Service role can insert activity logs"
    ON activity_logs
    FOR INSERT
    TO service_role
    WITH CHECK (TRUE);

-- Super admin policy for log_aggregates
CREATE POLICY "Super admins can view log aggregates"
    ON log_aggregates
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM super_admin_config sac
            WHERE sac.admin_wallet = auth.jwt() ->> 'sub'
            AND sac.id = 1
        )
    );

-- Super admin policy for system_health_logs
CREATE POLICY "Super admins can view system health logs"
    ON system_health_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM super_admin_config sac
            WHERE sac.admin_wallet = auth.jwt() ->> 'sub'
            AND sac.id = 1
        )
    );

-- ============================================================================
-- REALTIME SUBSCRIPTION
-- Enable realtime for live log streaming
-- ============================================================================

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;

-- ============================================================================
-- CLEANUP FUNCTION
-- Archive old logs to prevent table bloat
-- ============================================================================

CREATE OR REPLACE FUNCTION archive_old_activity_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Delete logs older than specified days
    -- In production, you might want to move to an archive table instead
    WITH deleted AS (
        DELETE FROM activity_logs
        WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
        AND severity NOT IN ('error', 'critical')  -- Keep errors longer
        RETURNING id
    )
    SELECT COUNT(*) INTO archived_count FROM deleted;

    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER VIEW
-- Simplified view for common log queries
-- ============================================================================

CREATE OR REPLACE VIEW recent_activity_logs AS
SELECT
    id,
    created_at,
    event_type,
    event_category,
    severity,
    actor_type,
    actor_wallet,
    project_subdomain,
    transaction_signature,
    amount_lamports,
    amount_tokens,
    error_message,
    metadata
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- ============================================================================
-- EVENT TYPE REFERENCE (as comment for documentation)
-- ============================================================================

/*
Event Categories and Types:

PROJECT:
- project.created           - New project initialized
- project.updated           - Project settings changed
- project.activated         - Project went live
- project.deactivated       - Project disabled
- project.luck_updated      - Luck interval changed

BOX:
- box.purchased             - User bought a box
- box.opened                - User committed/opened a box
- box.settled               - Box outcome finalized
- box.expired               - Box expired without opening

TREASURY:
- treasury.deposited        - Tokens deposited to project vault
- treasury.withdrawn        - Creator withdrew from treasury
- treasury.fee_collected    - Platform fee collected

WITHDRAWAL:
- withdrawal.requested      - Withdrawal request created
- withdrawal.approved       - Withdrawal approved
- withdrawal.completed      - Withdrawal finalized
- withdrawal.failed         - Withdrawal failed

ADMIN:
- admin.config_updated      - Platform config changed
- admin.project_verified    - Project verified by admin
- admin.user_banned         - User banned
- admin.emergency_action    - Emergency action taken

ERROR:
- error.transaction_failed  - On-chain transaction failed
- error.rpc_error           - RPC connection error
- error.database_error      - Database operation failed
- error.validation_error    - Input validation failed

SYSTEM:
- system.startup            - Service started
- system.shutdown           - Service stopped
- system.health_check       - Health check performed
- system.maintenance        - Maintenance mode toggled
*/

-- Verification query
SELECT
    'activity_logs' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'activity_logs'
UNION ALL
SELECT
    'log_aggregates',
    COUNT(*)
FROM information_schema.columns
WHERE table_name = 'log_aggregates'
UNION ALL
SELECT
    'system_health_logs',
    COUNT(*)
FROM information_schema.columns
WHERE table_name = 'system_health_logs';
