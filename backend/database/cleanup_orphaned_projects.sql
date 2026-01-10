-- cleanup_orphaned_projects.sql
-- Remove projects that were created in the database but never initialized on-chain
-- These are projects where vault_pda is NULL (indicating failed on-chain initialization)

-- First, let's see what we're about to delete
SELECT
    id,
    project_numeric_id,
    project_name,
    subdomain,
    owner_wallet,
    created_at,
    vault_pda,
    vault_authority_pda,
    vault_token_account
FROM projects
WHERE vault_pda IS NULL
ORDER BY created_at DESC;

-- Uncomment the line below to actually delete orphaned projects
-- DELETE FROM projects WHERE vault_pda IS NULL;
