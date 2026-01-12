-- ============================================
-- Migration: Add commit tracking columns to boxes table
-- Needed for the two-step open/reveal flow
-- Run this in Supabase SQL Editor
-- ============================================

-- Add committed_at column if it doesn't exist
-- This tracks when the user clicked "Open Box" and committed randomness
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'boxes' AND column_name = 'committed_at'
    ) THEN
        ALTER TABLE boxes ADD COLUMN committed_at TIMESTAMP;
        RAISE NOTICE 'Added committed_at column to boxes table';
    ELSE
        RAISE NOTICE 'committed_at column already exists';
    END IF;
END $$;

-- Add commit_tx_signature column if it doesn't exist
-- This stores the transaction signature for the commit (open) transaction
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'boxes' AND column_name = 'commit_tx_signature'
    ) THEN
        ALTER TABLE boxes ADD COLUMN commit_tx_signature TEXT;
        RAISE NOTICE 'Added commit_tx_signature column to boxes table';
    ELSE
        RAISE NOTICE 'commit_tx_signature column already exists';
    END IF;
END $$;

-- Add luck_value column if it doesn't exist
-- This stores the frozen luck value at commit time
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'boxes' AND column_name = 'luck_value'
    ) THEN
        ALTER TABLE boxes ADD COLUMN luck_value INTEGER DEFAULT 5;
        RAISE NOTICE 'Added luck_value column to boxes table';
    ELSE
        RAISE NOTICE 'luck_value column already exists';
    END IF;
END $$;

-- Verify migration
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'boxes'
AND column_name IN ('committed_at', 'commit_tx_signature', 'luck_value');

SELECT '✅ Migration complete! Commit tracking columns added to boxes table.' as status;
