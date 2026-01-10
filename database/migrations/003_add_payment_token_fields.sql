-- Add payment token and network fields to projects table

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS payment_token_mint TEXT,
ADD COLUMN IF NOT EXISTS payment_token_symbol TEXT,
ADD COLUMN IF NOT EXISTS payment_token_decimals INTEGER DEFAULT 9,
ADD COLUMN IF NOT EXISTS network TEXT DEFAULT 'devnet';

-- Add comment
COMMENT ON COLUMN projects.payment_token_mint IS 'SPL token mint address for box payments';
COMMENT ON COLUMN projects.payment_token_symbol IS 'Token symbol for display (e.g. SOL, USDC)';
COMMENT ON COLUMN projects.payment_token_decimals IS 'Token decimals (usually 9 for SOL, 6 for USDC)';
COMMENT ON COLUMN projects.network IS 'Solana network: devnet or mainnet';
