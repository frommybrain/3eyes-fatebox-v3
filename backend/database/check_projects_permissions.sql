-- check_projects_permissions.sql
-- Check Row Level Security policies and triggers on projects table

-- Check if RLS is enabled on projects table
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'projects';

-- Check existing RLS policies on projects table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'projects';

-- Check triggers on projects table
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'projects';

-- Check if there are any DELETE policies that might be blocking
SELECT
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'projects'
AND cmd IN ('DELETE', 'ALL');
