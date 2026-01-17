-- Migration: Remove vault_fund_amount from super_admin_config
-- Date: January 2026
-- Reason: Vault funding is now calculated dynamically based on box price
--         using EV-based worst-case (99th percentile) variance analysis
--         Formula: ~30x box price minimum (based on Grok's probability analysis)

-- Drop the vault_fund_amount column from super_admin_config
-- This value is no longer used - vault funding is calculated per-project based on box_price
ALTER TABLE super_admin_config
DROP COLUMN IF EXISTS vault_fund_amount;

-- Add a comment explaining the change
COMMENT ON TABLE super_admin_config IS
'Platform-wide configuration settings. Note: vault_fund_amount was removed in Jan 2026 - vault funding is now calculated dynamically per-project based on box price (~30x box price minimum).';
