-- add_public_delete_policy.sql
-- Add public DELETE policy to match existing public INSERT/SELECT/UPDATE policies

-- Public delete policy (matches your existing public policies)
CREATE POLICY "anyone can delete projects (public)"
ON projects
FOR DELETE
USING (true);

-- Note: This allows ANYONE to delete ANY project
-- For production, you should restrict this to:
-- 1. Only project owners: USING (owner_wallet = auth.jwt()->>'wallet')
-- 2. Only failed projects: USING (vault_pda IS NULL)
-- 3. Or both combined for better security
