-- ============================================
-- Add Box Verification & Transaction Columns
-- ============================================
-- This migration adds columns to store transaction signatures and
-- verification data for on-chain proof of fairness

-- Add transaction signature columns
ALTER TABLE boxes
    ADD COLUMN IF NOT EXISTS purchase_tx_signature text NULL,
    ADD COLUMN IF NOT EXISTS reveal_tx_signature text NULL,
    ADD COLUMN IF NOT EXISTS settle_tx_signature text NULL;

-- Add box PDA (Program Derived Address) for on-chain account reference
ALTER TABLE boxes
    ADD COLUMN IF NOT EXISTS box_pda text NULL;

-- Add luck/randomness verification columns
-- luck_value: The raw random value used to determine the outcome
-- max_luck: The maximum possible luck value (for percentage calculation)
-- random_percentage: Pre-calculated percentage (luck_value / max_luck * 100)
ALTER TABLE boxes
    ADD COLUMN IF NOT EXISTS luck_value bigint NULL,
    ADD COLUMN IF NOT EXISTS max_luck bigint NULL,
    ADD COLUMN IF NOT EXISTS random_percentage numeric(10, 6) NULL;

-- Add comments for documentation
COMMENT ON COLUMN boxes.purchase_tx_signature IS 'Solana transaction signature for box purchase';
COMMENT ON COLUMN boxes.reveal_tx_signature IS 'Solana transaction signature for box reveal (VRF request)';
COMMENT ON COLUMN boxes.settle_tx_signature IS 'Solana transaction signature for reward claim/settlement';
COMMENT ON COLUMN boxes.box_pda IS 'On-chain Program Derived Address for this box account';
COMMENT ON COLUMN boxes.luck_value IS 'Raw random value from VRF used to determine outcome';
COMMENT ON COLUMN boxes.max_luck IS 'Maximum possible luck value for percentage calculation';
COMMENT ON COLUMN boxes.random_percentage IS 'Calculated percentage: (luck_value / max_luck) * 100';

-- Create index on transaction signatures for lookup
CREATE INDEX IF NOT EXISTS idx_boxes_purchase_tx ON boxes (purchase_tx_signature) WHERE purchase_tx_signature IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_boxes_reveal_tx ON boxes (reveal_tx_signature) WHERE reveal_tx_signature IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_boxes_settle_tx ON boxes (settle_tx_signature) WHERE settle_tx_signature IS NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'boxes'
  AND column_name IN (
    'purchase_tx_signature',
    'reveal_tx_signature',
    'settle_tx_signature',
    'box_pda',
    'luck_value',
    'max_luck',
    'random_percentage'
  )
ORDER BY column_name;
