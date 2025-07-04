# SQL Query Tools for Supabase

This directory contains tools to run SQL queries directly against your Supabase database from your local environment.

## Available Tools

### 1. `query.js` - Simple Supabase Client Query Runner
Uses your existing Supabase client configuration to run queries.

**Usage:**
```bash
node query.js "SELECT * FROM monthly_budget_overrides LIMIT 5;"
```

**Pros:**
- Uses your existing Supabase setup
- No additional configuration needed
- Works with RLS policies

**Cons:**
- Limited to what Supabase client allows
- May not support all SQL features

### 2. `sql-query.js` - Direct PostgreSQL Connection
Connects directly to your Supabase PostgreSQL database.

**Setup Required:**
1. Get your database password from Supabase Dashboard → Settings → Database
2. Add to your `.env` file:
   ```
   SUPABASE_DB_PASSWORD=your_actual_password_here
   ```

**Usage:**
```bash
node sql-query.js "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'monthly_budget_overrides';"
```

**Pros:**
- Full PostgreSQL access
- Can run any SQL query
- Better for schema inspection

**Cons:**
- Requires database password
- Bypasses RLS policies (use carefully)

## Discovered Schema Information

Based on testing, here's what we know about `monthly_budget_overrides`:

### Confirmed Columns:
- `user_id` - UUID (required)
- `item_id` - UUID (required) 
- `month_year` - DATE (expects format: '2024-01-01')
- `override_amount` - NUMERIC (likely for storing override values)

### Security:
- Table has Row Level Security (RLS) enabled
- RLS policies prevent unauthorized access
- You need proper user authentication to insert/update

## Example Queries

### Check table structure:
```bash
node sql-query.js "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'monthly_budget_overrides' ORDER BY ordinal_position;"
```

### View existing data:
```bash
node query.js "SELECT * FROM monthly_budget_overrides LIMIT 10;"
```

### Check RLS policies:
```bash
node sql-query.js "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'monthly_budget_overrides';"
```

### Insert a record (with proper authentication):
```bash
node query.js "INSERT INTO monthly_budget_overrides (user_id, item_id, month_year, override_amount) VALUES ('your-user-id', 'budget-item-id', '2024-01-01', 150.00);"
```

## Troubleshooting

### "Row Level Security Policy" Error
This means RLS is blocking your query. You need to:
1. Be authenticated as the correct user
2. Ensure your user has permission for the operation
3. Check that RLS policies allow your specific use case

### "Could not find column" Error
The column doesn't exist in the table. Use the schema inspection queries to see available columns.

### "Password authentication failed"
For `sql-query.js`, make sure you have the correct database password in your `.env` file.

## Next Steps for Your Forecast Override Feature

Now that we know the schema, you can update your forecast overrides API:

```javascript
// src/lib/api/forecast-overrides.ts
export async function saveForecastOverride(
  userId: string,
  itemId: string,
  monthYear: string, // Format: '2024-01-01'
  overrideAmount: number
) {
  const { data, error } = await supabase
    .from('monthly_budget_overrides')
    .upsert({
      user_id: userId,
      item_id: itemId,
      month_year: monthYear,
      override_amount: overrideAmount
    })
    .select();
    
  if (error) throw error;
  return data;
}
```

The key changes needed:
1. Use `override_amount` instead of `amount`
2. Format `month_year` as a proper date: '2024-01-01'
3. Ensure proper user authentication for RLS 