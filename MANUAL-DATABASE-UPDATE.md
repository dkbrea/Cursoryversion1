# Manual Database Update Required

## Add forecast_overrides Column to user_preferences

You need to manually add a column to your Supabase database:

### Option 1: Using Supabase Dashboard
1. Go to your Supabase dashboard
2. Navigate to **Table Editor** > **user_preferences**
3. Click **Add Column**
4. Set:
   - **Name**: `forecast_overrides`
   - **Type**: `jsonb`
   - **Default Value**: `{}`
   - **Allow Nullable**: Yes

### Option 2: Using SQL Editor
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Run this SQL:

```sql
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS forecast_overrides JSONB DEFAULT '{}'::jsonb;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_forecast_overrides 
ON user_preferences USING GIN (forecast_overrides);
```

## Verify the Column Was Added

After adding the column, run this test:

```bash
node test-forecast-overrides-v2.js
```

## Fallback Solution

If you can't add the column immediately, the system will automatically fall back to localStorage until the database column is available. 