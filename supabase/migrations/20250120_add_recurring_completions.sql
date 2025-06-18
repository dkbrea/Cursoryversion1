-- Add recurring completions table to track which periods have been paid
CREATE TABLE recurring_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recurring_item_id UUID NOT NULL REFERENCES recurring_items(id) ON DELETE CASCADE,
  debt_account_id UUID REFERENCES debt_accounts(id) ON DELETE CASCADE,
  period_date TIMESTAMP WITH TIME ZONE NOT NULL, -- The due date for that occurrence (e.g., "2025-05-05")
  completed_date TIMESTAMP WITH TIME ZONE NOT NULL, -- When it was actually paid (e.g., "2025-06-18")
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL, -- Link to the actual transaction
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_completion_per_period UNIQUE (recurring_item_id, debt_account_id, period_date, user_id)
);

-- Enable RLS on recurring_completions table
ALTER TABLE recurring_completions ENABLE ROW LEVEL SECURITY;

-- Create policy for recurring completions
CREATE POLICY "Users can only access their own recurring completions" ON recurring_completions
  FOR ALL USING ((select auth.uid()) = user_id);

-- Create indexes for performance
CREATE INDEX idx_recurring_completions_user_id ON recurring_completions(user_id);
CREATE INDEX idx_recurring_completions_recurring_item_id ON recurring_completions(recurring_item_id);
CREATE INDEX idx_recurring_completions_debt_account_id ON recurring_completions(debt_account_id);
CREATE INDEX idx_recurring_completions_period_date ON recurring_completions(period_date);
CREATE INDEX idx_recurring_completions_completed_date ON recurring_completions(completed_date);

-- Update transactions table to add debt_account_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'debt_account_id') THEN
    ALTER TABLE transactions ADD COLUMN debt_account_id UUID REFERENCES debt_accounts(id) ON DELETE SET NULL;
    CREATE INDEX idx_transactions_debt_account_id ON transactions(debt_account_id);
  END IF;
END $$;

-- Add next_due_date to debt_accounts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debt_accounts' AND column_name = 'next_due_date') THEN
    ALTER TABLE debt_accounts ADD COLUMN next_due_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add line-of-credit to debt_account_type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'debt_account_type' AND e.enumlabel = 'line-of-credit') THEN
    ALTER TYPE debt_account_type ADD VALUE 'line-of-credit';
  END IF;
END $$;

COMMENT ON TABLE recurring_completions IS 'Tracks which recurring item periods have been completed/paid';
COMMENT ON COLUMN recurring_completions.period_date IS 'The due date for this occurrence of the recurring item';
COMMENT ON COLUMN recurring_completions.completed_date IS 'When this period was actually paid';
COMMENT ON COLUMN recurring_completions.transaction_id IS 'Links to the transaction that completed this period'; 