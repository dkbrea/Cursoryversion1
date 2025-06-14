-- Add sinking funds table
CREATE TYPE sinking_fund_category AS ENUM ('maintenance', 'insurance', 'gifts', 'taxes', 'healthcare', 'travel', 'home-improvement', 'other');
CREATE TYPE contribution_frequency AS ENUM ('monthly', 'bi-weekly', 'weekly', 'quarterly', 'annually');

CREATE TABLE sinking_funds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  monthly_contribution DECIMAL(12,2) NOT NULL DEFAULT 0,
  next_expense_date TIMESTAMP WITH TIME ZONE,
  category sinking_fund_category NOT NULL DEFAULT 'other',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_expense_id UUID REFERENCES recurring_items(id) ON DELETE SET NULL,
  contribution_frequency contribution_frequency NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on sinking_funds table
ALTER TABLE sinking_funds ENABLE ROW LEVEL SECURITY;

-- Create policy for sinking funds
CREATE POLICY "Users can only access their own sinking funds" ON sinking_funds
  FOR ALL USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_sinking_funds_user_id ON sinking_funds(user_id);
CREATE INDEX idx_sinking_funds_category ON sinking_funds(category);
CREATE INDEX idx_sinking_funds_next_expense_date ON sinking_funds(next_expense_date);

-- Add sinking fund transactions table
CREATE TABLE sinking_fund_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sinking_fund_id UUID NOT NULL REFERENCES sinking_funds(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('contribution', 'withdrawal')),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on sinking fund transactions table
ALTER TABLE sinking_fund_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for sinking fund transactions
CREATE POLICY "Users can only access their own sinking fund transactions" ON sinking_fund_transactions
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_sinking_fund_transactions_user_id ON sinking_fund_transactions(user_id);
CREATE INDEX idx_sinking_fund_transactions_fund_id ON sinking_fund_transactions(sinking_fund_id);
CREATE INDEX idx_sinking_fund_transactions_date ON sinking_fund_transactions(date); 