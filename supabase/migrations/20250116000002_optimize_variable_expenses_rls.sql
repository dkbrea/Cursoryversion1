-- Optimize RLS Policy for variable_expenses table
-- Replace auth.uid() with (select auth.uid()) to avoid re-evaluation per row

-- Variable expenses table - optimize RLS policy for performance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'variable_expenses' AND table_schema = 'public') THEN
    -- Drop the existing unoptimized policy
    DROP POLICY IF EXISTS "Users can only access their own variable expenses" ON variable_expenses;
    
    -- Create optimized policy with (select auth.uid()) to avoid re-evaluation per row
    CREATE POLICY "Users can only access their own variable expenses" ON variable_expenses
      FOR ALL USING ((select auth.uid()) = user_id);
      
    RAISE NOTICE 'Optimized RLS policy for variable_expenses table';
  ELSE
    RAISE NOTICE 'variable_expenses table does not exist, skipping optimization';
  END IF;
END $$;

-- Add helpful comment to track optimization
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'variable_expenses' AND table_schema = 'public') THEN
    EXECUTE 'COMMENT ON TABLE variable_expenses IS ''RLS policy optimized with (select auth.uid()) for better performance - updated ' || now() || '''';
  END IF;
END $$; 