-- Migration script to rename budget_categories to variable_expenses and update schema

-- 1. Create the new variable_expenses table
CREATE TABLE variable_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- Using the same categories as recurring items
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Copy data from budget_categories to variable_expenses (mapping budgeted_amount to amount)
INSERT INTO variable_expenses (id, name, category, amount, user_id, created_at, updated_at)
SELECT id, name, 'personal', budgeted_amount, user_id, created_at, created_at
FROM budget_categories;

-- 3. Set up RLS policies for the new table
ALTER TABLE variable_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own variable expenses" ON variable_expenses
  FOR ALL USING (auth.uid() = user_id);

-- 4. Drop the old table (only after confirming the migration worked)
-- DROP TABLE budget_categories;
