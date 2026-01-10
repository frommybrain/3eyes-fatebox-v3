# Fix: Project Numeric ID Issue

## Problem
The frontend was sending UUID (`f9af4c99-ee96-46e9-9ef5-2232d72ea986`) as projectId, but the backend/smart contract expects a numeric u64 ID.

**Error:** `Invalid character` when trying to create `new BN(uuid-string)`

## Solution
Use the `project_numeric_id` field that already exists in the database schema. This field needs to be auto-populated with sequential numbers.

## Required Steps

### 1. Run Database Migration in Supabase SQL Editor

Copy and paste the following SQL:

```sql
-- Create a sequence for project numeric IDs
CREATE SEQUENCE IF NOT EXISTS project_numeric_id_seq START 1;

-- Create a function to get the next project numeric ID
CREATE OR REPLACE FUNCTION get_next_project_number()
RETURNS INTEGER AS $$
BEGIN
    RETURN nextval('project_numeric_id_seq');
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to auto-assign numeric IDs on insert
CREATE OR REPLACE FUNCTION assign_project_numeric_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.project_numeric_id IS NULL THEN
        NEW.project_numeric_id := get_next_project_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS before_insert_project_numeric_id ON projects;
CREATE TRIGGER before_insert_project_numeric_id
    BEFORE INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION assign_project_numeric_id();

-- Update existing NULL values with sequential numbers
DO $$
DECLARE
    project_record RECORD;
BEGIN
    FOR project_record IN
        SELECT id FROM projects WHERE project_numeric_id IS NULL ORDER BY created_at
    LOOP
        UPDATE projects
        SET project_numeric_id = get_next_project_number()
        WHERE id = project_record.id;
    END LOOP;
END $$;

-- Make project_numeric_id NOT NULL and add constraint
ALTER TABLE projects
    ALTER COLUMN project_numeric_id SET NOT NULL,
    ADD CONSTRAINT unique_project_numeric_id UNIQUE (project_numeric_id);

COMMENT ON COLUMN projects.project_numeric_id IS 'Sequential numeric ID for on-chain program (u64)';
```

### 2. Delete the Test Project

The project created during testing has no numeric ID and will cause issues. Delete it:

```sql
DELETE FROM projects WHERE id = 'f9af4c99-ee96-46e9-9ef5-2232d72ea986';
```

Or in Supabase Table Editor:
- Go to Projects table
- Find row with subdomain "devnet-cats"
- Delete it

### 3. Restart Frontend

The frontend code has been updated to use `project_numeric_id` instead of `id`:

```bash
cd frontend
# Kill existing dev server (Ctrl+C)
npm run dev
```

## What Changed

### Frontend: `components/create/CreateProject.jsx`
**Before:**
```javascript
projectId: projectData.id, // UUID string
```

**After:**
```javascript
projectId: projectData.project_numeric_id, // Numeric ID
```

Also added validation:
```javascript
if (!projectData.project_numeric_id) {
    throw new Error('Project numeric ID not assigned. Please check database configuration.');
}
```

## Testing After Migration

1. Go to frontend: http://localhost:3000
2. Connect wallet
3. Click "Create New Project"
4. Fill in:
   - Name: "Test CATS"
   - Subdomain: "testcats"
   - Payment Token: `BnL9bDB6yCUwFBckW5Lu3TZjaZobmqxecqnY85X1ti1h`
   - Symbol: CATS
   - Decimals: 6
   - Box Price: 1.0
5. Click "Create Project"

Should now succeed and show:
- Transaction hash
- Solana Explorer link
- Redirect to dashboard

## Verification

Check in Supabase that the new project has:
- ✅ `project_numeric_id`: 1 (or next sequential number)
- ✅ `vault_pda`: (populated)
- ✅ `vault_authority_pda`: (populated)
- ✅ `vault_token_account`: (populated)

## Why This Works

1. **Database Trigger**: Automatically assigns sequential numeric IDs on insert
2. **Frontend**: Sends numeric ID to backend
3. **Backend**: Converts to BN successfully: `new BN(1)` ✅ instead of `new BN("uuid")` ❌
4. **Smart Contract**: Receives u64 project ID correctly
