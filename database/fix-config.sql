-- Fix super_admin_config with valid placeholder addresses
-- Run this AFTER running schema.sql

UPDATE super_admin_config
SET
    -- Use valid base58 addresses (11111... is the System Program, safe placeholder)
    lootbox_program_id = '11111111111111111111111111111111',
    three_eyes_mint = '11111111111111111111111111111112',
    platform_fee_account = '11111111111111111111111111111113'
WHERE id = 1;

-- Verify it worked
SELECT
    network,
    lootbox_program_id,
    three_eyes_mint,
    platform_fee_account,
    admin_wallet
FROM super_admin_config;
