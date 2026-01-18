-- Migration 018: Add refund tracking for oracle failures
--
-- This tracks boxes that failed due to system issues (oracle unavailable, commit failures)
-- vs boxes that expired due to user inaction (not eligible for refund)

-- Add failure tracking columns to boxes table
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS reveal_failed_at TIMESTAMP;
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS reveal_failure_reason TEXT;
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS refund_eligible BOOLEAN DEFAULT FALSE;
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS refund_tx_signature TEXT;

-- Update box_result constraint to allow tier 6 (REFUNDED)
-- DB values: 0=pending, 1=dud, 2=rebate, 3=break-even, 4=profit, 5=jackpot, 6=refunded
ALTER TABLE boxes DROP CONSTRAINT IF EXISTS boxes_box_result_check;
ALTER TABLE boxes ADD CONSTRAINT boxes_box_result_check CHECK (box_result >= 0 AND box_result <= 6);

-- Add comments explaining the columns
COMMENT ON COLUMN boxes.reveal_failed_at IS 'Timestamp when reveal failed due to system issue';
COMMENT ON COLUMN boxes.reveal_failure_reason IS 'Reason for failure: oracle_unavailable, randomness_account_missing, etc.';
COMMENT ON COLUMN boxes.refund_eligible IS 'Whether box is eligible for refund (system failure, not user timeout)';
COMMENT ON COLUMN boxes.refunded_at IS 'When the refund was processed';
COMMENT ON COLUMN boxes.refund_tx_signature IS 'Transaction signature for the refund';

-- Create index for finding refund-eligible boxes
CREATE INDEX IF NOT EXISTS idx_boxes_refund_eligible ON boxes (refund_eligible) WHERE refund_eligible = TRUE;

-- Create index for finding failed reveals
CREATE INDEX IF NOT EXISTS idx_boxes_reveal_failed ON boxes (reveal_failed_at) WHERE reveal_failed_at IS NOT NULL;

SELECT '✅ Migration 018 complete! Refund tracking columns added to boxes table.' as status;
