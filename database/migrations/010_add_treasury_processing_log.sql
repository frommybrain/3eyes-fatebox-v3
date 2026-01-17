-- ============================================
-- Migration 010: Add Treasury Processing Log Table
-- ============================================
-- Creates the treasury_processing_log table for tracking
-- treasury withdrawal, swap, buyback, and dev transfer transactions
-- Run this in Supabase SQL Editor
-- ============================================

-- First, add missing columns to super_admin_config if they don't exist
ALTER TABLE super_admin_config
ADD COLUMN IF NOT EXISTS platform_commission_bps INTEGER NOT NULL DEFAULT 500,  -- 5% commission (500 basis points)
ADD COLUMN IF NOT EXISTS dev_cut_bps INTEGER NOT NULL DEFAULT 1000,             -- 10% of commission goes to dev (1000 basis points = 10%)
ADD COLUMN IF NOT EXISTS dev_wallet TEXT,                                        -- Dev wallet for SOL payments (defaults to admin_wallet if null)
ADD COLUMN IF NOT EXISTS treasury_pda TEXT;                                      -- Global treasury PDA address (derived on-chain)

-- Add comments for documentation
COMMENT ON COLUMN super_admin_config.platform_commission_bps IS 'Platform commission in basis points (500 = 5%). Taken from each box purchase.';
COMMENT ON COLUMN super_admin_config.dev_cut_bps IS 'Developer cut of commission in basis points (1000 = 10%). Paid in SOL during fee processing.';
COMMENT ON COLUMN super_admin_config.dev_wallet IS 'Wallet to receive dev SOL payments. Falls back to admin_wallet if null.';
COMMENT ON COLUMN super_admin_config.treasury_pda IS 'Global treasury PDA address for holding platform fees before processing.';

-- Create treasury_processing_log table to track treasury transactions
CREATE TABLE IF NOT EXISTS treasury_processing_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Processing details
    processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_by TEXT NOT NULL,  -- Wallet that triggered processing

    -- Action type (what kind of transaction this is)
    action_type TEXT NOT NULL DEFAULT 'withdraw',  -- 'withdraw', 'swap', 'dev_transfer', 'buyback', 'full_process'

    -- Token details
    token_mint TEXT NOT NULL,    -- The project token involved
    token_amount BIGINT,         -- Amount of project tokens processed (for swaps)
    amount_withdrawn BIGINT,     -- Amount of tokens withdrawn from treasury

    -- Swap results
    sol_received BIGINT DEFAULT 0,        -- Total SOL received from swap
    dev_sol_amount BIGINT DEFAULT 0,      -- SOL sent to dev wallet
    buyback_sol_amount BIGINT DEFAULT 0,  -- SOL used for 3EYES buyback
    three_eyes_bought BIGINT DEFAULT 0,   -- Amount of 3EYES acquired

    -- Transaction signatures
    tx_signature TEXT,                    -- Primary transaction signature
    swap_to_sol_signature TEXT,
    dev_transfer_signature TEXT,
    buyback_signature TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'partial', 'failed'
    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on treasury_processing_log
ALTER TABLE treasury_processing_log ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (for transparency)
CREATE POLICY "Anyone can read treasury processing log"
    ON treasury_processing_log
    FOR SELECT
    USING (true);

-- Only allow inserts from authenticated (backend will use service role)
CREATE POLICY "Service can insert treasury processing log"
    ON treasury_processing_log
    FOR INSERT
    WITH CHECK (true);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_treasury_log_token ON treasury_processing_log(token_mint);
CREATE INDEX IF NOT EXISTS idx_treasury_log_date ON treasury_processing_log(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_treasury_log_action ON treasury_processing_log(action_type);
CREATE INDEX IF NOT EXISTS idx_treasury_log_status ON treasury_processing_log(status);

-- ============================================
-- Verification
-- ============================================
SELECT
    'Migration 010 Check' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'super_admin_config' AND column_name = 'platform_commission_bps'
    ) THEN 'platform_commission_bps added' ELSE 'MISSING' END as commission_col,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'super_admin_config' AND column_name = 'treasury_pda'
    ) THEN 'treasury_pda added' ELSE 'MISSING' END as treasury_col,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'treasury_processing_log'
    ) THEN 'treasury_processing_log created' ELSE 'MISSING' END as log_table;

SELECT '=== Migration 010 Complete ===' as message;
