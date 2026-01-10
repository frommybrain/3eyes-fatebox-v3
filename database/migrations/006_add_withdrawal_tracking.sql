-- ============================================
-- Add Withdrawal Tracking Columns
-- ============================================
-- This migration adds columns to track initial vault funding
-- and withdrawal history for proper profit calculation

-- Add initial vault funding tracking to projects
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS initial_vault_amount BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_withdrawn BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_withdrawal_at TIMESTAMP NULL;

-- Add launch fee tracking (in case super admin changes fee later)
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS launch_fee_paid_amount BIGINT DEFAULT 0;

-- Add closing/archiving support
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS closing_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP NULL;

-- Add comments for documentation
COMMENT ON COLUMN projects.initial_vault_amount IS 'Amount of tokens initially funded to vault (for profit calculation)';
COMMENT ON COLUMN projects.total_withdrawn IS 'Total amount withdrawn by owner from vault';
COMMENT ON COLUMN projects.last_withdrawal_at IS 'Timestamp of last withdrawal';
COMMENT ON COLUMN projects.launch_fee_paid_amount IS 'Launch fee paid at project creation (in platform token units)';
COMMENT ON COLUMN projects.closing_at IS 'When project started closing process (grace period)';
COMMENT ON COLUMN projects.closed_at IS 'When project was fully closed/archived';

-- Backfill initial_vault_amount from vault_funded_amount for existing projects
UPDATE projects
SET initial_vault_amount = COALESCE(vault_funded_amount, 0)
WHERE initial_vault_amount = 0 OR initial_vault_amount IS NULL;

-- Create withdrawal history table for audit trail
CREATE TABLE IF NOT EXISTS withdrawal_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    owner_wallet TEXT NOT NULL,

    -- Withdrawal details
    withdrawal_amount BIGINT NOT NULL,
    withdrawal_type TEXT NOT NULL CHECK (withdrawal_type IN ('profits', 'partial', 'full_close')),

    -- Fee details
    fee_percentage NUMERIC(5, 2) NOT NULL,
    fee_amount_in_project_token BIGINT NOT NULL,
    fee_amount_in_platform_token BIGINT NOT NULL,

    -- Price at time of withdrawal (for audit)
    project_token_price_usd NUMERIC(20, 10) NULL,
    platform_token_price_usd NUMERIC(20, 10) NULL,
    exchange_rate NUMERIC(20, 10) NULL,

    -- Transaction details
    withdrawal_tx_signature TEXT NULL,
    fee_tx_signature TEXT NULL,

    -- Vault state at withdrawal
    vault_balance_before BIGINT NOT NULL,
    vault_balance_after BIGINT NOT NULL,
    reserved_for_boxes BIGINT NOT NULL,
    unopened_boxes_count INTEGER NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_withdrawal_history_project ON withdrawal_history(project_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_history_owner ON withdrawal_history(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_withdrawal_history_created ON withdrawal_history(created_at DESC);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN (
    'initial_vault_amount',
    'total_withdrawn',
    'last_withdrawal_at',
    'launch_fee_paid_amount',
    'closing_at',
    'closed_at'
  )
ORDER BY column_name;
