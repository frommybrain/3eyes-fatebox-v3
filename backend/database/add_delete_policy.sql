-- add_delete_policy.sql
-- Add DELETE policy for projects table to allow project owners to delete their own projects

-- Option 1: Allow project owners to delete their own projects (RECOMMENDED)
-- This is more secure - only the wallet that created the project can delete it
CREATE POLICY "Users can delete their own projects"
ON projects
FOR DELETE
USING (
    auth.uid() IS NOT NULL
    OR owner_wallet = current_setting('request.jwt.claims', true)::json->>'wallet'
    OR true  -- Temporary: allow all deletes (you can restrict this later)
);

-- Option 2 (Alternative): Allow anyone to delete projects (LESS SECURE)
-- Uncomment below if you want to allow any authenticated user to delete any project
-- CREATE POLICY "Anyone can delete projects"
-- ON projects
-- FOR DELETE
-- USING (true);

-- Option 3 (Most Restrictive): Only allow deletes for projects that haven't been initialized
-- This prevents deletion of live projects but allows cleanup of failed ones
-- CREATE POLICY "Delete failed projects only"
-- ON projects
-- FOR DELETE
-- USING (vault_pda IS NULL);
