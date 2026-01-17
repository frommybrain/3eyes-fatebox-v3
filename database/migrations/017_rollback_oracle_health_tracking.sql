-- Migration: Rollback Oracle Health Tracking and Box Compensation
-- Date: January 2026
-- Reason: Reverting compensation system - needs redesign for scalability
--         (polling-based approach doesn't scale to hundreds of thousands of boxes)

-- ============================================================================
-- DROP VIEWS FIRST (they depend on tables)
-- ============================================================================

DROP VIEW IF EXISTS boxes_awaiting_compensation;
DROP VIEW IF EXISTS oracle_status;

-- ============================================================================
-- DROP FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS find_boxes_needing_compensation(INTEGER);
DROP FUNCTION IF EXISTS mark_box_compensated(BIGINT, BIGINT, VARCHAR, TEXT);

-- ============================================================================
-- REMOVE COMPENSATION COLUMNS FROM BOXES TABLE
-- ============================================================================

ALTER TABLE boxes DROP COLUMN IF EXISTS compensation_status;
ALTER TABLE boxes DROP COLUMN IF EXISTS compensation_amount;
ALTER TABLE boxes DROP COLUMN IF EXISTS compensation_at;
ALTER TABLE boxes DROP COLUMN IF EXISTS compensation_tx_signature;
ALTER TABLE boxes DROP COLUMN IF EXISTS compensation_reason;

-- ============================================================================
-- REVERT BOX_RESULT CONSTRAINT (remove tier 6)
-- ============================================================================

-- Revert any boxes marked as tier 6 (refunded) to tier 1 (dud) first
UPDATE boxes SET box_result = 1 WHERE box_result = 6;

-- Restore original constraint (0-5 only)
ALTER TABLE boxes DROP CONSTRAINT IF EXISTS valid_box_result;
ALTER TABLE boxes ADD CONSTRAINT valid_box_result CHECK (box_result BETWEEN 0 AND 5);

-- ============================================================================
-- DROP INDEXES RELATED TO COMPENSATION
-- ============================================================================

DROP INDEX IF EXISTS idx_boxes_compensation_status;
DROP INDEX IF EXISTS idx_boxes_stale_commits;

-- ============================================================================
-- DROP ORACLE_HEALTH_LOG TABLE
-- ============================================================================

-- First drop RLS policies
DROP POLICY IF EXISTS "Service role can insert oracle health logs" ON oracle_health_log;
DROP POLICY IF EXISTS "Service role can read oracle health logs" ON oracle_health_log;
DROP POLICY IF EXISTS "Super admins can view oracle health logs" ON oracle_health_log;

-- Then drop the table
DROP TABLE IF EXISTS oracle_health_log;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify boxes table no longer has compensation columns
SELECT
    column_name
FROM information_schema.columns
WHERE table_name = 'boxes'
AND column_name LIKE 'compensation%';

-- Should return 0 rows
