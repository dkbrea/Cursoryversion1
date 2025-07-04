-- Fix recurring_completions table to allow null recurring_item_id for debt items
-- and update constraints to work with both recurring items and debt items

-- Drop the existing unique constraint
ALTER TABLE recurring_completions DROP CONSTRAINT IF EXISTS unique_completion_per_period;

-- Make recurring_item_id nullable since debt items don't have recurring_item_id
ALTER TABLE recurring_completions ALTER COLUMN recurring_item_id DROP NOT NULL;

-- Add a check constraint to ensure either recurring_item_id or debt_account_id is provided
ALTER TABLE recurring_completions ADD CONSTRAINT check_item_or_debt_provided 
  CHECK (recurring_item_id IS NOT NULL OR debt_account_id IS NOT NULL);

-- Add new unique indexes that handle both cases (using partial indexes instead of constraints)
-- For recurring items: unique on recurring_item_id + period_date + user_id
CREATE UNIQUE INDEX idx_unique_recurring_completion_per_period 
  ON recurring_completions (recurring_item_id, period_date, user_id) 
  WHERE recurring_item_id IS NOT NULL;

-- For debt items: unique on debt_account_id + period_date + user_id  
CREATE UNIQUE INDEX idx_unique_debt_completion_per_period 
  ON recurring_completions (debt_account_id, period_date, user_id) 
  WHERE debt_account_id IS NOT NULL;

COMMENT ON CONSTRAINT check_item_or_debt_provided ON recurring_completions IS 'Ensures either recurring_item_id or debt_account_id is provided';
COMMENT ON INDEX idx_unique_recurring_completion_per_period IS 'Prevents duplicate completions for the same recurring item period';
COMMENT ON INDEX idx_unique_debt_completion_per_period IS 'Prevents duplicate completions for the same debt payment period'; 