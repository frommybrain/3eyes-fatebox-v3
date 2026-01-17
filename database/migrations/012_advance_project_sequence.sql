-- Migration: Advance project counter to avoid PDA collisions
-- Date: January 2026
-- Reason: Some project IDs were initialized on-chain but their DB records were deleted.
--         The counter needs to be advanced past all deployed project IDs to avoid
--         "account already in use" errors when creating new projects.

-- NOTE: This database uses a project_counter TABLE (not a PostgreSQL sequence)
-- The get_next_project_number() function increments and returns counter from this table

-- Advance counter to skip past deployed project IDs (set to 100)
UPDATE project_counter SET counter = 100 WHERE id = 1;

-- Verify the change
SELECT counter FROM project_counter WHERE id = 1;

-- Create/update a function to allow the backend to advance the counter when needed
-- This is called via supabase.rpc('setval_project_counter', { new_val: 123 })
CREATE OR REPLACE FUNCTION setval_project_counter(new_val BIGINT)
RETURNS BIGINT AS $$
BEGIN
    -- Set the counter to the new value
    UPDATE project_counter SET counter = new_val WHERE id = 1;
    RETURN new_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also ensure get_next_project_number uses the counter table (not a sequence)
CREATE OR REPLACE FUNCTION get_next_project_number()
RETURNS BIGINT AS $$
DECLARE
    next_val BIGINT;
BEGIN
    -- Atomically increment and return the counter
    UPDATE project_counter
    SET counter = counter + 1
    WHERE id = 1
    RETURNING counter INTO next_val;

    RETURN next_val;
END;
$$ LANGUAGE plpgsql;
