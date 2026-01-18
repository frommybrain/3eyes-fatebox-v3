-- Migration 018: Allow box_result = 6 (REFUNDED)
--
-- This fixes the constraint to allow refunded boxes.
-- DB values: 0=pending, 1=dud, 2=rebate, 3=break-even, 4=profit, 5=jackpot, 6=refunded

ALTER TABLE boxes DROP CONSTRAINT IF EXISTS valid_box_result;
ALTER TABLE boxes ADD CONSTRAINT valid_box_result CHECK (box_result BETWEEN 0 AND 6);
