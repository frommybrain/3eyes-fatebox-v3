-- ============================================
-- Migration: Add Switchboard VRF columns to boxes table
-- Run this in Supabase SQL Editor if you have an existing database
-- ============================================

-- Add randomness_account column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'boxes' AND column_name = 'randomness_account'
    ) THEN
        ALTER TABLE boxes ADD COLUMN randomness_account TEXT;
        RAISE NOTICE 'Added randomness_account column to boxes table';
    ELSE
        RAISE NOTICE 'randomness_account column already exists';
    END IF;
END $$;

-- Add randomness_committed column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'boxes' AND column_name = 'randomness_committed'
    ) THEN
        ALTER TABLE boxes ADD COLUMN randomness_committed BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added randomness_committed column to boxes table';
    ELSE
        RAISE NOTICE 'randomness_committed column already exists';
    END IF;
END $$;

-- Verify migration
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'boxes'
AND column_name IN ('randomness_account', 'randomness_committed');

SELECT '✅ Migration complete! Switchboard VRF columns added to boxes table.' as status;
