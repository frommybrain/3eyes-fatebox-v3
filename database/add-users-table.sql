-- Add users table for wallet-based authentication
-- This creates user accounts when wallets connect

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Wallet address (unique identifier)
    wallet_address TEXT UNIQUE NOT NULL,

    -- User preferences
    username TEXT,
    email TEXT,
    avatar_url TEXT,
    bio TEXT,

    -- Stats (cached)
    total_projects INTEGER DEFAULT 0,
    total_boxes_created INTEGER DEFAULT 0,
    total_boxes_won INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,

    -- Constraints
    CONSTRAINT wallet_address_format CHECK (length(wallet_address) BETWEEN 32 AND 44)
);

-- Indexes
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Auto-update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to upsert user on wallet connection
CREATE OR REPLACE FUNCTION upsert_user(
    p_wallet_address TEXT
)
RETURNS TABLE(
    id UUID,
    wallet_address TEXT,
    username TEXT,
    created_at TIMESTAMP
) AS $$
BEGIN
    -- Insert or update user
    INSERT INTO users (wallet_address, last_login_at)
    VALUES (p_wallet_address, NOW())
    ON CONFLICT (wallet_address)
    DO UPDATE SET
        last_login_at = NOW();

    -- Return user data
    RETURN QUERY
    SELECT
        u.id,
        u.wallet_address,
        u.username,
        u.created_at
    FROM users u
    WHERE u.wallet_address = p_wallet_address;
END;
$$ LANGUAGE plpgsql;

-- Update projects table to reference users
-- Add user_id column to projects (optional, can also just use wallet_address)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Sample query to get user with projects
-- SELECT
--     u.*,
--     COUNT(p.id) as project_count
-- FROM users u
-- LEFT JOIN projects p ON u.wallet_address = p.owner_wallet
-- WHERE u.wallet_address = 'xxx'
-- GROUP BY u.id;
