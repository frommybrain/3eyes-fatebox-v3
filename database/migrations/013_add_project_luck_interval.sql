-- Migration: Add per-project luck interval
-- Date: January 2026
-- Reason: Allow project owners to set their own luck accumulation interval
--         instead of using the global platform setting.

-- Add luck_interval_seconds column to projects table
-- NULL or 0 = use platform default (matches on-chain behavior where 0 means platform default)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS luck_interval_seconds INTEGER DEFAULT NULL;

COMMENT ON COLUMN projects.luck_interval_seconds IS
  'Per-project luck interval in seconds. NULL/0 = use platform default.';

-- Verify the change
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'luck_interval_seconds';
