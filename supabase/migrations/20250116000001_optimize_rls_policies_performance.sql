-- Optimize RLS Policies for Performance
-- Replace auth.uid() with (select auth.uid()) to avoid re-evaluation per row
-- This migration addresses the performance issue where auth functions are 
-- unnecessarily re-evaluated for each row instead of once per query

-- Safely optimize policies only for tables that exist

-- Users table - optimized policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can only access their own data" ON users;
    CREATE POLICY "Users can only access their own data" ON users
      FOR ALL USING ((select auth.uid()) = id);
  END IF;
END $$;

-- Categories table - optimized policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can only access their own categories" ON categories;
    CREATE POLICY "Users can only access their own categories" ON categories
      FOR ALL USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- Accounts table - optimized policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can only access their own accounts" ON accounts;
    CREATE POLICY "Users can only access their own accounts" ON accounts
      FOR ALL USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- Transactions table - optimized policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can only access their own transactions" ON transactions;
    CREATE POLICY "Users can only access their own transactions" ON transactions
      FOR ALL USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- Transaction tags table - optimized policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaction_tags' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can only access their own transaction tags" ON transaction_tags;
    CREATE POLICY "Users can only access their own transaction tags" ON transaction_tags
      FOR ALL USING (
        (select auth.uid()) IN (
          SELECT user_id FROM transactions WHERE id = transaction_id
        )
      );
  END IF;
END $$;

-- Debt accounts table - optimized policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debt_accounts' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can only access their own debt accounts" ON debt_accounts;
    CREATE POLICY "Users can only access their own debt accounts" ON debt_accounts
      FOR ALL USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- Debt plans table - optimized policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debt_plans' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can only access their own debt plans" ON debt_plans;
    CREATE POLICY "Users can only access their own debt plans" ON debt_plans
      FOR ALL USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- Recurring items table - optimized policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_items' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can only access their own recurring items" ON recurring_items;
    CREATE POLICY "Users can only access their own recurring items" ON recurring_items
      FOR ALL USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- Budget categories table - optimized policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budget_categories' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can only access their own budget categories" ON budget_categories;
    CREATE POLICY "Users can only access their own budget categories" ON budget_categories
      FOR ALL USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- Financial goals table - optimized policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_goals' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can only access their own financial goals" ON financial_goals;
    CREATE POLICY "Users can only access their own financial goals" ON financial_goals
      FOR ALL USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- Investment accounts table - optimized policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investment_accounts' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can only access their own investment accounts" ON investment_accounts;
    CREATE POLICY "Users can only access their own investment accounts" ON investment_accounts
      FOR ALL USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- Holdings table - optimized policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'holdings' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can only access their own holdings" ON holdings;
    CREATE POLICY "Users can only access their own holdings" ON holdings
      FOR ALL USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- Savings transactions table - optimized policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'savings_transactions' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can only access their own savings transactions" ON savings_transactions;
    CREATE POLICY "Users can only access their own savings transactions" ON savings_transactions
      FOR ALL USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- User preferences table - optimized policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can read their own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
    
    CREATE POLICY "Users can read their own preferences"
        ON public.user_preferences
        FOR SELECT
        USING ((select auth.uid()) = user_id);

    CREATE POLICY "Users can insert their own preferences"
        ON public.user_preferences
        FOR INSERT
        WITH CHECK ((select auth.uid()) = user_id);

    CREATE POLICY "Users can update their own preferences"
        ON public.user_preferences
        FOR UPDATE
        USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- Add helpful comment to track optimization (only if users table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    EXECUTE 'COMMENT ON TABLE users IS ''RLS policies optimized with (select auth.uid()) for better performance - updated ' || now() || '''';
  END IF;
END $$; 