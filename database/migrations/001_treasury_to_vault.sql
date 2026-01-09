-- ============================================
-- Migration: Rename treasury columns to vault
-- ============================================
-- Purpose: Standardize terminology to use "vault" instead of "treasury"
-- Reason: Align with Solana/Anchor standards and eliminate confusion
-- Date: 2026-01-09
-- ============================================

-- 1. Rename treasury_wallet to vault_wallet
ALTER TABLE projects
RENAME COLUMN treasury_wallet TO vault_wallet;

-- 2. Drop treasury_balance (we'll track this via on-chain queries)
ALTER TABLE projects
DROP COLUMN IF EXISTS treasury_balance;

-- 3. Add vault PDA columns if they don't exist
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS vault_pda TEXT,
ADD COLUMN IF NOT EXISTS vault_authority_pda TEXT,
ADD COLUMN IF NOT EXISTS vault_token_account TEXT;

-- 4. Add helpful comment
COMMENT ON COLUMN projects.vault_wallet IS 'Program-controlled vault wallet for this project (PDA)';
COMMENT ON COLUMN projects.vault_pda IS 'Vault PDA address derived from project_id and payment_token';
COMMENT ON COLUMN projects.vault_authority_pda IS 'Vault authority PDA used for signing vault operations';
COMMENT ON COLUMN projects.vault_token_account IS 'Associated Token Account for vault (holds project tokens)';

-- ============================================
-- Verification
-- ============================================
SELECT
    'Migration Complete' as status,
    COUNT(*) as projects_updated
FROM projects;
