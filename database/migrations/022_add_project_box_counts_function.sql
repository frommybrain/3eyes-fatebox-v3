-- Migration: Add function to get box counts per project
-- This function efficiently aggregates box statistics at the database level

-- Function to get box counts for multiple projects
CREATE OR REPLACE FUNCTION get_project_box_counts(project_ids UUID[])
RETURNS TABLE(
    project_id UUID,
    total_boxes BIGINT,
    settled_boxes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.project_id,
        COUNT(*)::BIGINT as total_boxes,
        COUNT(b.settled_at)::BIGINT as settled_boxes
    FROM boxes b
    WHERE b.project_id = ANY(project_ids)
    GROUP BY b.project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_project_box_counts TO anon, authenticated;

COMMENT ON FUNCTION get_project_box_counts IS
    'Efficiently aggregates box counts (total and settled) for multiple projects in a single query';
