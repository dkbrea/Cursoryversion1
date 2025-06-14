-- Add recurring_expense_id column to sinking_funds table
ALTER TABLE sinking_funds 
ADD COLUMN recurring_expense_id UUID REFERENCES recurring_items(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_sinking_funds_recurring_expense_id ON sinking_funds(recurring_expense_id); 