-- Optimize RLS Policy for monthly_budget_overrides table
-- Replace auth.uid() with (select auth.uid()) to avoid re-evaluation per row

-- Monthly budget overrides table - optimize RLS policy for performance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monthly_budget_overrides' AND table_schema = 'public') THEN
    -- Drop existing unoptimized policies
    DROP POLICY IF EXISTS "Users can only access their own monthly budget overrides" ON monthly_budget_overrides;
    DROP POLICY IF EXISTS "Users can only access their own overrides" ON monthly_budget_overrides;
    DROP POLICY IF EXISTS "monthly_budget_overrides_select_policy" ON monthly_budget_overrides;
    DROP POLICY IF EXISTS "monthly_budget_overrides_insert_policy" ON monthly_budget_overrides;
    DROP POLICY IF EXISTS "monthly_budget_overrides_update_policy" ON monthly_budget_overrides;
    DROP POLICY IF EXISTS "monthly_budget_overrides_delete_policy" ON monthly_budget_overrides;
    
    -- Create optimized policy with (select auth.uid()) to avoid re-evaluation per row
    CREATE POLICY "Users can only access their own monthly budget overrides" ON monthly_budget_overrides
      FOR ALL USING ((select auth.uid()) = user_id);
      
    RAISE NOTICE 'Optimized RLS policy for monthly_budget_overrides table';
  ELSE
    RAISE NOTICE 'monthly_budget_overrides table does not exist, skipping optimization';
  END IF;
END $$;

-- Add helpful comment to track optimization
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monthly_budget_overrides' AND table_schema = 'public') THEN
    EXECUTE 'COMMENT ON TABLE monthly_budget_overrides IS ''RLS policy optimized with (select auth.uid()) for better performance - updated ' || now() || '''';
  END IF;
END $$; 