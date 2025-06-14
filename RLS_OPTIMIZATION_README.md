# RLS Policy Performance Optimization

## Problem Description

The PostgreSQL database had Row Level Security (RLS) policies using `auth.uid()` function calls that were being re-evaluated for each row returned by queries. This caused significant performance degradation at scale.

### Specific Issues Found:
- **Table**: `public.users` and all other user-scoped tables
- **Issue**: RLS policies using `auth.uid()` were re-evaluating for each row
- **Performance Impact**: Suboptimal query performance at scale

## Root Cause

When RLS policies use `auth.uid()` directly, PostgreSQL treats it as a volatile function and re-evaluates it for every row. For tables with many rows, this creates unnecessary overhead.

### Example of Problematic Policy:
```sql
-- BAD: Re-evaluates auth.uid() for each row
CREATE POLICY "Users can only access their own data" ON users
  FOR ALL USING (auth.uid() = user_id);
```

## Solution

Replace `auth.uid()` with `(select auth.uid())` to force PostgreSQL to evaluate the function once per query instead of once per row.

### Example of Optimized Policy:
```sql
-- GOOD: Evaluates auth.uid() once per query
CREATE POLICY "Users can only access their own data" ON users
  FOR ALL USING ((select auth.uid()) = user_id);
```

## Applied Optimizations

The following files contain the performance optimizations:

1. **`supabase/migrations/20250116000001_optimize_rls_policies_performance.sql`** - Main migration file
2. **`optimize_rls_policies.sql`** - Standalone optimization script

### Tables Optimized:
- ✅ `users`
- ✅ `categories` 
- ✅ `accounts`
- ✅ `transactions`
- ✅ `transaction_tags`
- ✅ `debt_accounts`
- ✅ `debt_plans`
- ✅ `recurring_items`
- ✅ `budget_categories`
- ✅ `financial_goals`
- ✅ `investment_accounts`
- ✅ `holdings`
- ✅ `savings_transactions`
- ✅ `user_preferences` (if exists)

## How to Apply the Fix

### Option 1: Supabase Migration (Recommended)
```bash
# Run the migration through Supabase CLI
supabase db push

# Or apply the specific migration
supabase db reset --linked
```

### Option 2: Direct SQL Execution
```bash
# Run the SQL file directly against your database
psql -h your-db-host -U your-user -d your-database -f optimize_rls_policies.sql
```

### Option 3: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `optimize_rls_policies.sql`
4. Execute the script

## Performance Testing

Before and after applying the optimization, you can test performance with:

```sql
-- Test query performance on a large table
EXPLAIN ANALYZE SELECT * FROM transactions WHERE user_id = auth.uid();
```

## Expected Improvements

- ⚡ **Reduced CPU usage** - auth.uid() evaluated once per query vs. once per row
- 📈 **Better scalability** - Performance improvement scales with row count
- 🚀 **Faster query execution** - Especially noticeable with large result sets

## Verification

After applying the migration, verify the policies are updated:

```sql
-- Check that policies exist and are optimized
SELECT schemaname, tablename, policyname, qual 
FROM pg_policies 
WHERE tablename IN ('users', 'transactions', 'accounts')
ORDER BY tablename, policyname;
```

Look for `(select auth.uid())` in the `qual` column instead of just `auth.uid()`.

## Rollback (if needed)

If you need to rollback to the original policies:

```sql
-- Example rollback for users table
DROP POLICY "Users can only access their own data" ON users;
CREATE POLICY "Users can only access their own data" ON users
  FOR ALL USING (auth.uid() = id);
```

## References

- [Supabase RLS Performance Documentation](https://supabase.com/docs/guides/auth/row-level-security#performance)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) 