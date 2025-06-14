-- Add variable_expense_id column to sinking_funds table
ALTER TABLE sinking_funds 
ADD COLUMN variable_expense_id UUID REFERENCES variable_expenses(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_sinking_funds_variable_expense_id ON sinking_funds(variable_expense_id); 