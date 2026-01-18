-- Migration 019: Add randomness_closed tracking column
--
-- Tracks whether the Switchboard randomness account has been closed
-- and the rent (~0.006 SOL) reclaimed to the user.
--
-- This is automatically done as part of the reveal transaction now,
-- but tracking it helps with:
-- 1. Auditing/debugging
-- 2. Identifying old boxes that need cleanup
-- 3. Verifying rent was reclaimed

ALTER TABLE boxes ADD COLUMN IF NOT EXISTS randomness_closed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN boxes.randomness_closed IS
  'Whether the Switchboard randomness account has been closed and rent reclaimed to user';
