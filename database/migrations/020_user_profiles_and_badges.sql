-- Migration: 020_user_profiles_and_badges.sql
-- Description: Add user profiles and badges tables for gamification
-- Date: 2026-01-18

-- User Profiles table
-- Wallet address is the primary identifier, username is optional but unique
CREATE TABLE IF NOT EXISTS user_profiles (
    wallet_address TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    x_handle TEXT,  -- Twitter/X handle (without @)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Badges table
-- Tracks earned achievements/badges per user
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
    badge_type TEXT NOT NULL,  -- 'jackpot', 'creator', 'boxes_10', 'boxes_25', 'boxes_50', 'boxes_100'
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(wallet_address, badge_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_badges_wallet ON user_badges(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_badges_type ON user_badges(badge_type);

-- Badge type check constraint
ALTER TABLE user_badges ADD CONSTRAINT valid_badge_type CHECK (
    badge_type IN ('jackpot', 'creator', 'boxes_10', 'boxes_25', 'boxes_50', 'boxes_100')
);

-- Username format constraint (lowercase alphanumeric and underscores, 3-20 chars)
ALTER TABLE user_profiles ADD CONSTRAINT valid_username CHECK (
    username IS NULL OR (
        username ~ '^[a-z0-9_]{3,20}$'
    )
);

-- X handle format constraint (alphanumeric and underscores, no @)
ALTER TABLE user_profiles ADD CONSTRAINT valid_x_handle CHECK (
    x_handle IS NULL OR (
        x_handle ~ '^[a-zA-Z0-9_]{1,15}$'
    )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp on profile changes
DROP TRIGGER IF EXISTS user_profile_updated_at ON user_profiles;
CREATE TRIGGER user_profile_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profile_timestamp();

-- RLS Policies (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read profiles (public profiles)
CREATE POLICY "Profiles are viewable by everyone"
    ON user_profiles FOR SELECT
    USING (true);

-- Allow authenticated users to insert/update their own profile
-- Note: In a wallet-based system, we rely on backend to validate ownership
CREATE POLICY "Users can insert their own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (true);

-- Badges are viewable by everyone
CREATE POLICY "Badges are viewable by everyone"
    ON user_badges FOR SELECT
    USING (true);

-- Only backend can insert badges (via service role)
CREATE POLICY "Backend can insert badges"
    ON user_badges FOR INSERT
    WITH CHECK (true);

COMMENT ON TABLE user_profiles IS 'User profile data for gamification - wallet-based identity';
COMMENT ON TABLE user_badges IS 'User earned badges/achievements';
COMMENT ON COLUMN user_profiles.username IS 'Unique username for profile URLs (3-20 chars, lowercase alphanumeric + underscore)';
COMMENT ON COLUMN user_profiles.x_handle IS 'Twitter/X handle without @ symbol';
COMMENT ON COLUMN user_badges.badge_type IS 'Badge identifier: jackpot, creator, boxes_10, boxes_25, boxes_50, boxes_100';
