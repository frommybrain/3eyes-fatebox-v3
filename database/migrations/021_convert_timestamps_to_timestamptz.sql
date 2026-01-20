-- ============================================
-- Migration: Convert timestamp columns to TIMESTAMPTZ
-- This ensures all timestamps include timezone info (UTC)
-- and prevents timezone-related bugs on the frontend
-- Run this in Supabase SQL Editor
-- ============================================

-- Convert boxes table timestamps
ALTER TABLE boxes
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN committed_at TYPE TIMESTAMPTZ USING committed_at AT TIME ZONE 'UTC',
    ALTER COLUMN opened_at TYPE TIMESTAMPTZ USING opened_at AT TIME ZONE 'UTC',
    ALTER COLUMN settled_at TYPE TIMESTAMPTZ USING settled_at AT TIME ZONE 'UTC';

-- Convert projects table timestamps
ALTER TABLE projects
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- Verify the changes
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('boxes', 'projects')
AND column_name IN ('created_at', 'committed_at', 'opened_at', 'settled_at', 'updated_at')
ORDER BY table_name, column_name;

SELECT '✅ Migration complete! Timestamp columns converted to TIMESTAMPTZ.' as status;
