-- Migration: Remove withdrawal_fee_percentage column
-- This column is no longer used - platform commission is now read from on-chain config
-- The on-chain PlatformConfig PDA stores platformCommissionBps as the source of truth

-- Remove the column from super_admin_config
ALTER TABLE super_admin_config DROP COLUMN IF EXISTS withdrawal_fee_percentage;

-- Note: No rollback provided as this column is deprecated and should not be re-added
