-- Add support for debt accounts in transactions
-- Step 1: Add debt_account_id column to transactions table
ALTER TABLE transactions ADD COLUMN debt_account_id UUID REFERENCES debt_accounts(id) ON DELETE CASCADE;

-- Step 2: Modify the account_id constraint to be nullable (since we'll use either account_id OR debt_account_id)
ALTER TABLE transactions ALTER COLUMN account_id DROP NOT NULL;

-- Step 3: Add a check constraint to ensure either account_id OR debt_account_id is provided (but not both)
ALTER TABLE transactions ADD CONSTRAINT check_account_or_debt_account 
CHECK (
  (account_id IS NOT NULL AND debt_account_id IS NULL) OR 
  (account_id IS NULL AND debt_account_id IS NOT NULL)
);

-- Step 4: Add index for the new debt_account_id column
CREATE INDEX idx_transactions_debt_account_id ON transactions(debt_account_id);

-- Step 5: Add comment explaining the new structure
COMMENT ON COLUMN transactions.debt_account_id IS 'Reference to debt account for transactions on credit cards, lines of credit, etc.';
COMMENT ON CONSTRAINT check_account_or_debt_account ON transactions IS 'Ensures either account_id or debt_account_id is provided, but not both'; 