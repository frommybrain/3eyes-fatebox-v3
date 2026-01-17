-- Migration: Oracle Health Tracking and Box Compensation
-- Date: January 2026
-- Reason: Track oracle health failures to enable automatic compensation for boxes
--         that couldn't be revealed due to Switchboard VRF oracle downtime

-- ============================================================================
-- ORACLE_HEALTH_LOG TABLE
-- Track oracle availability checks and failures
-- ============================================================================

CREATE TABLE IF NOT EXISTS oracle_health_log (
    id SERIAL PRIMARY KEY,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Health Check Result
    healthy BOOLEAN NOT NULL,
    message TEXT,
    error_code VARCHAR(50),           -- e.g., 'ENOTFOUND', 'ETIMEDOUT'

    -- Context
    network VARCHAR(20) NOT NULL,     -- 'devnet', 'mainnet-beta'
    check_source VARCHAR(30),         -- 'api', 'reveal_attempt', 'scheduled'

    -- Duration tracking for outages
    outage_started_at TIMESTAMPTZ,    -- Set when first failure detected
    outage_ended_at TIMESTAMPTZ,      -- Set when health restored

    -- Additional context
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oracle_health_created_at ON oracle_health_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oracle_health_healthy ON oracle_health_log (healthy, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oracle_health_network ON oracle_health_log (network, created_at DESC);

-- ============================================================================
-- ADD COMPENSATION TRACKING TO BOXES TABLE
-- Track boxes that received compensation due to oracle failures
-- ============================================================================

-- Add compensation-related columns to boxes table
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS compensation_status VARCHAR(20) DEFAULT NULL;
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS compensation_amount BIGINT DEFAULT NULL;
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS compensation_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS compensation_tx_signature VARCHAR(100) DEFAULT NULL;
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS compensation_reason TEXT DEFAULT NULL;

-- Valid compensation statuses: 'pending', 'processing', 'completed', 'failed'
COMMENT ON COLUMN boxes.compensation_status IS 'Compensation status: pending, processing, completed, failed, or NULL if not applicable';
COMMENT ON COLUMN boxes.compensation_amount IS 'Amount compensated in token smallest units';
COMMENT ON COLUMN boxes.compensation_at IS 'When compensation was issued';
COMMENT ON COLUMN boxes.compensation_tx_signature IS 'Solana transaction signature for compensation';
COMMENT ON COLUMN boxes.compensation_reason IS 'Reason for compensation (e.g., oracle_outage)';

-- Update box_result constraint to allow tier 6 (REFUNDED)
-- DB values: 0=pending, 1=dud, 2=rebate, 3=break-even, 4=profit, 5=jackpot, 6=refunded
ALTER TABLE boxes DROP CONSTRAINT IF EXISTS valid_box_result;
ALTER TABLE boxes ADD CONSTRAINT valid_box_result CHECK (box_result BETWEEN 0 AND 6);

-- Index for finding boxes needing compensation
CREATE INDEX IF NOT EXISTS idx_boxes_compensation_status ON boxes (compensation_status) WHERE compensation_status IS NOT NULL;

-- Index for finding committed but unrevealed boxes past their window
-- Note: boxes table uses 'opened_at' not 'revealed_at'
CREATE INDEX IF NOT EXISTS idx_boxes_stale_commits ON boxes (committed_at, opened_at)
WHERE committed_at IS NOT NULL AND opened_at IS NULL;

-- ============================================================================
-- FUNCTION: Check for boxes needing compensation
-- Finds committed boxes past the 1-hour reveal window that weren't revealed
-- ============================================================================

CREATE OR REPLACE FUNCTION find_boxes_needing_compensation(
    hours_since_commit INTEGER DEFAULT 1
)
RETURNS TABLE (
    box_id BIGINT,
    project_id BIGINT,
    owner_wallet VARCHAR,
    committed_at TIMESTAMPTZ,
    box_price BIGINT,
    time_since_commit INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id as box_id,
        b.project_id,
        b.owner_wallet,
        b.committed_at,
        p.box_price,
        NOW() - b.committed_at as time_since_commit
    FROM boxes b
    JOIN projects p ON b.project_id = p.id
    WHERE
        -- Box was committed (user tried to open)
        b.committed_at IS NOT NULL
        -- But never revealed/opened (oracle failure prevented reveal)
        AND b.opened_at IS NULL
        -- Past the reveal window
        AND b.committed_at < NOW() - (hours_since_commit || ' hours')::INTERVAL
        -- Not already compensated
        AND b.compensation_status IS NULL
        -- Box is owned (not just created)
        AND b.owner_wallet IS NOT NULL
    ORDER BY b.committed_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Mark box as compensated
-- Called after successful compensation payout
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_box_compensated(
    p_box_id BIGINT,
    p_amount BIGINT,
    p_tx_signature VARCHAR,
    p_reason TEXT DEFAULT 'oracle_outage'
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE boxes
    SET
        compensation_status = 'completed',
        compensation_amount = p_amount,
        compensation_at = NOW(),
        compensation_tx_signature = p_tx_signature,
        compensation_reason = p_reason,
        -- Also mark as settled with refund tier
        result_tier = 5,  -- REFUNDED tier
        settled_at = NOW()
    WHERE id = p_box_id
    AND compensation_status IS NULL;  -- Safety check

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Current oracle status
-- Quick view of recent oracle health
-- ============================================================================

CREATE OR REPLACE VIEW oracle_status AS
SELECT
    network,
    healthy,
    message,
    created_at as last_check,
    CASE
        WHEN healthy THEN 'operational'
        ELSE 'degraded'
    END as status
FROM oracle_health_log
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- VIEW: Boxes awaiting compensation
-- Dashboard view for monitoring
-- ============================================================================

CREATE OR REPLACE VIEW boxes_awaiting_compensation AS
SELECT
    b.id as box_id,
    b.project_id,
    p.subdomain as project_subdomain,
    b.owner_wallet,
    b.committed_at,
    p.box_price,
    NOW() - b.committed_at as time_waiting,
    EXTRACT(EPOCH FROM (NOW() - b.committed_at)) / 3600 as hours_waiting
FROM boxes b
JOIN projects p ON b.project_id = p.id
WHERE
    b.committed_at IS NOT NULL
    AND b.opened_at IS NULL
    AND b.committed_at < NOW() - INTERVAL '1 hour'
    AND b.compensation_status IS NULL
    AND b.owner_wallet IS NOT NULL
ORDER BY b.committed_at ASC;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE oracle_health_log ENABLE ROW LEVEL SECURITY;

-- Allow backend service role to insert health logs
CREATE POLICY "Service role can insert oracle health logs"
    ON oracle_health_log
    FOR INSERT
    TO service_role
    WITH CHECK (TRUE);

-- Allow backend service role to read oracle health logs
CREATE POLICY "Service role can read oracle health logs"
    ON oracle_health_log
    FOR SELECT
    TO service_role
    USING (TRUE);

-- Super admins can view oracle health logs
CREATE POLICY "Super admins can view oracle health logs"
    ON oracle_health_log
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
-- VERIFICATION
-- ============================================================================

SELECT
    'oracle_health_log' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'oracle_health_log';
