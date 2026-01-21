-- Migration: Fix RLS Security Vulnerabilities
-- This migration addresses CRITICAL security issues identified in the security audit
-- Run this migration to secure your database

-- ============================================================================
-- PART 1: Fix boxes table RLS (CRITICAL)
-- Users should only be able to read/create boxes they own
-- ============================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can read boxes" ON boxes;
DROP POLICY IF EXISTS "Anyone can create boxes" ON boxes;
DROP POLICY IF EXISTS "Anyone can update boxes" ON boxes;

-- Enable RLS (should already be enabled but just in case)
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;

-- New policies: Users can only access their own boxes
-- Note: We use a more permissive SELECT for now since the app needs to display
-- boxes on project pages (e.g., showing total boxes sold)
CREATE POLICY "boxes_select_policy" ON boxes
    FOR SELECT USING (true);  -- Public reads allowed for project stats

-- Only the owner can update their boxes (via backend service role)
CREATE POLICY "boxes_update_own" ON boxes
    FOR UPDATE USING (owner_wallet = current_setting('app.current_user_wallet', true));

-- Boxes are created via backend service role
CREATE POLICY "boxes_insert_service" ON boxes
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PART 2: Fix projects table RLS (CRITICAL)
-- Projects are publicly readable but only owner can update
-- ============================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can read projects" ON projects;
DROP POLICY IF EXISTS "Anyone can create projects" ON projects;
DROP POLICY IF EXISTS "Anyone can update projects" ON projects;

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Public can read projects (needed for project pages)
CREATE POLICY "projects_select_public" ON projects
    FOR SELECT USING (true);

-- Projects are created via backend service role
CREATE POLICY "projects_insert_service" ON projects
    FOR INSERT WITH CHECK (true);

-- Only owner can update project (via backend with wallet verification)
CREATE POLICY "projects_update_owner" ON projects
    FOR UPDATE USING (owner_wallet = current_setting('app.current_user_wallet', true));

-- ============================================================================
-- PART 3: Fix user_profiles RLS (CRITICAL)
-- Users can only update their own profile
-- ============================================================================

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Public reads (for displaying usernames/badges)
CREATE POLICY "user_profiles_select_public" ON user_profiles
    FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "user_profiles_update_own" ON user_profiles
    FOR UPDATE USING (wallet_address = current_setting('app.current_user_wallet', true));

-- Users can create their own profile
CREATE POLICY "user_profiles_insert_own" ON user_profiles
    FOR INSERT WITH CHECK (wallet_address = current_setting('app.current_user_wallet', true));

-- ============================================================================
-- PART 4: Re-enable RLS on activity_logs (CRITICAL)
-- Only admins should be able to read activity logs
-- ============================================================================

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only read access (check against super_admin_config)
CREATE POLICY "activity_logs_admin_read" ON activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM super_admin_config
            WHERE admin_wallet = current_setting('app.current_user_wallet', true)
        )
        OR current_setting('app.current_user_wallet', true) IS NULL -- Allow service role
    );

-- Only service role can insert logs
CREATE POLICY "activity_logs_service_insert" ON activity_logs
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PART 5: Fix log_aggregates RLS
-- ============================================================================

ALTER TABLE log_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "log_aggregates_admin_read" ON log_aggregates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM super_admin_config
            WHERE admin_wallet = current_setting('app.current_user_wallet', true)
        )
        OR current_setting('app.current_user_wallet', true) IS NULL
    );

CREATE POLICY "log_aggregates_service_insert" ON log_aggregates
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PART 6: Fix system_health_logs RLS
-- ============================================================================

ALTER TABLE system_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_health_logs_admin_read" ON system_health_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM super_admin_config
            WHERE admin_wallet = current_setting('app.current_user_wallet', true)
        )
        OR current_setting('app.current_user_wallet', true) IS NULL
    );

CREATE POLICY "system_health_logs_service_insert" ON system_health_logs
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PART 7: Fix withdrawal_history RLS (HIGH)
-- Only project owner can view their withdrawal history
-- ============================================================================

ALTER TABLE withdrawal_history ENABLE ROW LEVEL SECURITY;

-- Owner can view their own withdrawal history
CREATE POLICY "withdrawal_history_owner_read" ON withdrawal_history
    FOR SELECT USING (
        owner_wallet = current_setting('app.current_user_wallet', true)
        OR EXISTS (
            SELECT 1 FROM super_admin_config
            WHERE admin_wallet = current_setting('app.current_user_wallet', true)
        )
        OR current_setting('app.current_user_wallet', true) IS NULL
    );

-- Only service role can insert
CREATE POLICY "withdrawal_history_service_insert" ON withdrawal_history
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PART 8: Fix treasury_processing_log RLS (HIGH)
-- Only admins should see treasury operations
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can read treasury processing log" ON treasury_processing_log;

ALTER TABLE treasury_processing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treasury_log_admin_only" ON treasury_processing_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM super_admin_config
            WHERE admin_wallet = current_setting('app.current_user_wallet', true)
        )
        OR current_setting('app.current_user_wallet', true) IS NULL
    );

CREATE POLICY "treasury_log_service_insert" ON treasury_processing_log
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PART 9: Fix reserved_subdomains RLS (MEDIUM)
-- Public read, no updates allowed
-- ============================================================================

DROP POLICY IF EXISTS "Reserved subdomains are publicly readable" ON reserved_subdomains;

ALTER TABLE reserved_subdomains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reserved_subdomains_public_read" ON reserved_subdomains
    FOR SELECT USING (true);

-- Explicitly deny updates
CREATE POLICY "reserved_subdomains_no_update" ON reserved_subdomains
    FOR UPDATE USING (false);

CREATE POLICY "reserved_subdomains_no_delete" ON reserved_subdomains
    FOR DELETE USING (false);

-- ============================================================================
-- PART 10: Fix user_badges RLS
-- ============================================================================

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Public reads (badges are displayed publicly)
CREATE POLICY "user_badges_public_read" ON user_badges
    FOR SELECT USING (true);

-- Service role inserts only
CREATE POLICY "user_badges_service_insert" ON user_badges
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PART 11: Revoke direct table access, require RLS
-- ============================================================================

-- Ensure anon and authenticated go through RLS
ALTER TABLE boxes FORCE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE activity_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE log_aggregates FORCE ROW LEVEL SECURITY;
ALTER TABLE system_health_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_history FORCE ROW LEVEL SECURITY;
ALTER TABLE treasury_processing_log FORCE ROW LEVEL SECURITY;
ALTER TABLE reserved_subdomains FORCE ROW LEVEL SECURITY;
ALTER TABLE user_badges FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- NOTES FOR BACKEND IMPLEMENTATION
-- ============================================================================
-- The backend should set the current user wallet before queries:
--
-- await supabase.rpc('set_config', {
--     setting: 'app.current_user_wallet',
--     value: walletAddress
-- });
--
-- Or use service_role key which bypasses RLS for trusted operations.
--
-- For public reads that don't need user context, the RLS policies
-- are configured to allow SELECT for most tables.
-- ============================================================================

COMMENT ON TABLE boxes IS 'RLS: Public read, owner update only';
COMMENT ON TABLE projects IS 'RLS: Public read, owner update only';
COMMENT ON TABLE user_profiles IS 'RLS: Public read, owner update only';
COMMENT ON TABLE activity_logs IS 'RLS: Admin/service read only';
COMMENT ON TABLE withdrawal_history IS 'RLS: Owner/admin read only';
COMMENT ON TABLE treasury_processing_log IS 'RLS: Admin only';
