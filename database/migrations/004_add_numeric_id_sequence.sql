-- ============================================
-- Add Numeric Project ID Auto-Generation
-- ============================================
-- This migration adds sequential numeric IDs for on-chain program usage

-- Create a sequence for project numeric IDs
CREATE SEQUENCE IF NOT EXISTS project_numeric_id_seq START 1;

-- Drop existing function if it exists (to handle return type changes)
DROP FUNCTION IF EXISTS get_next_project_number();

-- Create a function to get the next project numeric ID
CREATE FUNCTION get_next_project_number()
RETURNS INTEGER AS $$
BEGIN
    RETURN nextval('project_numeric_id_seq');
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger function if it exists
DROP FUNCTION IF EXISTS assign_project_numeric_id() CASCADE;

-- Create a trigger to auto-assign numeric IDs on insert
CREATE FUNCTION assign_project_numeric_id()
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
    ALTER COLUMN project_numeric_id SET NOT NULL;

-- Add unique constraint (drop first if exists)
ALTER TABLE projects
    DROP CONSTRAINT IF EXISTS unique_project_numeric_id;

ALTER TABLE projects
    ADD CONSTRAINT unique_project_numeric_id UNIQUE (project_numeric_id);

COMMENT ON COLUMN projects.project_numeric_id IS 'Sequential numeric ID for on-chain program (u64)';

-- Show results
SELECT id, project_numeric_id, project_name, subdomain
FROM projects
ORDER BY project_numeric_id;
