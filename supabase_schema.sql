-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (will work alongside Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_category_per_user UNIQUE (name, user_id)
);

-- Create accounts table
CREATE TYPE account_type AS ENUM ('checking', 'savings', 'credit card', 'other');

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type account_type NOT NULL,
  bank_name TEXT,
  last4 TEXT,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transaction types
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE transaction_detailed_type AS ENUM ('income', 'variable-expense', 'fixed-expense', 'subscription', 'debt-payment', 'goal-contribution');

-- Create transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type transaction_type NOT NULL,
  detailed_type transaction_detailed_type,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  source_id TEXT,
  source TEXT,
  notes TEXT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transaction_tags table for many-to-many relationship
CREATE TABLE transaction_tags (
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (transaction_id, tag)
);

-- Create debt account types
CREATE TYPE debt_account_type AS ENUM ('credit-card', 'student-loan', 'personal-loan', 'mortgage', 'auto-loan', 'other');
CREATE TYPE payment_frequency AS ENUM ('monthly', 'bi-weekly', 'weekly', 'annually', 'other');

-- Create debt accounts table
CREATE TABLE debt_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type debt_account_type NOT NULL,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  apr DECIMAL(5,2) NOT NULL,
  minimum_payment DECIMAL(12,2) NOT NULL,
  payment_day_of_month INTEGER NOT NULL,
  payment_frequency payment_frequency NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create debt plans table
CREATE TYPE debt_payoff_strategy AS ENUM ('snowball', 'avalanche');

CREATE TABLE debt_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy debt_payoff_strategy,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT one_plan_per_user UNIQUE (user_id)
);

-- Create recurring item types
CREATE TYPE recurring_item_type AS ENUM ('income', 'subscription', 'fixed-expense');
CREATE TYPE recurring_frequency AS ENUM ('daily', 'weekly', 'bi-weekly', 'monthly', 'semi-monthly', 'quarterly', 'yearly');

-- Create recurring items table
CREATE TABLE recurring_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type recurring_item_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  frequency recurring_frequency NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  last_renewal_date TIMESTAMP WITH TIME ZONE,
  semi_monthly_first_pay_date TIMESTAMP WITH TIME ZONE,
  semi_monthly_second_pay_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  category_id TEXT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budget categories table
CREATE TABLE budget_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  budgeted_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_budget_category_per_user UNIQUE (name, user_id)
);

-- Create financial goals table
CREATE TYPE goal_icon_key AS ENUM ('default', 'home', 'car', 'plane', 'briefcase', 'graduation-cap', 'gift', 'piggy-bank', 'trending-up', 'shield-check');

CREATE TABLE financial_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  target_date TIMESTAMP WITH TIME ZONE NOT NULL,
  icon goal_icon_key NOT NULL DEFAULT 'default',
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create investment accounts table
CREATE TYPE investment_account_type AS ENUM ('brokerage', 'ira', '401k', 'crypto', 'other');

CREATE TABLE investment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type investment_account_type NOT NULL,
  institution TEXT,
  current_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create holdings table
CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  shares DECIMAL(12,6) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  change_percent DECIMAL(6,2),
  logo_url TEXT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES investment_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create savings transactions table
CREATE TYPE savings_method AS ENUM ('Auto-Save', 'Manual');
CREATE TYPE savings_status AS ENUM ('Pending', 'Completed', 'Failed');

CREATE TABLE savings_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  goal_id UUID NOT NULL REFERENCES financial_goals(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  method savings_method NOT NULL,
  status savings_status NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS (Row Level Security) policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for each table to restrict access to the user's own data
CREATE POLICY "Users can only access their own data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only access their own categories" ON categories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own accounts" ON accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own transaction tags" ON transaction_tags
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM transactions WHERE id = transaction_id
    )
  );

CREATE POLICY "Users can only access their own debt accounts" ON debt_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own debt plans" ON debt_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own recurring items" ON recurring_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own budget categories" ON budget_categories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own financial goals" ON financial_goals
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own investment accounts" ON investment_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own holdings" ON holdings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own savings transactions" ON savings_transactions
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_recurring_items_user_id ON recurring_items(user_id);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_debt_accounts_user_id ON debt_accounts(user_id);
CREATE INDEX idx_financial_goals_user_id ON financial_goals(user_id);
