-- Migration: Add reserved_subdomains table
-- Purpose: Prevent users from claiming platform-reserved subdomains
-- Run in Supabase SQL Editor

-- Create reserved subdomains table
CREATE TABLE IF NOT EXISTS reserved_subdomains (
    subdomain TEXT PRIMARY KEY,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add common reserved subdomains
INSERT INTO reserved_subdomains (subdomain, reason) VALUES
    ('admin', 'Platform administration'),
    ('api', 'API endpoints'),
    ('www', 'Main website'),
    ('app', 'Platform app'),
    ('dashboard', 'Admin dashboard'),
    ('create', 'Project creation'),
    ('docs', 'Documentation'),
    ('help', 'Help and support'),
    ('support', 'Support portal'),
    ('blog', 'Platform blog'),
    ('status', 'Status page'),
    ('mail', 'Email services'),
    ('cdn', 'Content delivery'),
    ('static', 'Static assets'),
    ('assets', 'Asset storage'),
    ('dev', 'Development environment'),
    ('staging', 'Staging environment'),
    ('test', 'Testing environment'),
    ('sandbox', 'Sandbox environment')
ON CONFLICT (subdomain) DO NOTHING;

-- Enable RLS
ALTER TABLE reserved_subdomains ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read reserved subdomains
CREATE POLICY "Reserved subdomains are publicly readable"
    ON reserved_subdomains
    FOR SELECT
    USING (true);

-- Policy: Only admins can modify reserved subdomains (optional - depends on your admin setup)
-- You can manually manage this table via SQL editor

COMMENT ON TABLE reserved_subdomains IS 'Platform-reserved subdomains that cannot be claimed by users';
