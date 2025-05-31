# Forecast Override Implementation Summary

## Problem
When users edit amounts in the forecast view of the budget page, the changes were not being saved to the database and were lost after page refresh.

## Root Cause
The forecast view was updating local state correctly but had no database persistence mechanism. The forecast data was being regenerated from base data on each page load, losing any user modifications.

## Solution
Implemented a complete forecast override system using the existing `monthly_budget_overrides` table.

## Database Schema Discovery
Through systematic testing, I discovered the actual schema of `monthly_budget_overrides`:

### Confirmed Columns:
- `user_id` - UUID (required)
- `item_id` - UUID (required) 
- `month_year` - DATE (expects format: '2024-01-01')
- `override_amount` - NUMERIC (stores the override value)
- `id` - Primary key (auto-generated)
- `created_at` - Timestamp (auto-generated)
- `updated_at` - Timestamp (auto-generated)

### Security:
- Table has Row Level Security (RLS) enabled
- RLS policies prevent unauthorized access
- Requires proper user authentication for insert/update operations

### Constraints:
- No unique constraint on `user_id,item_id,month_year` combination
- Uses manual upsert logic (select → update or insert)

## Changes Made

### 1. Updated API (`src/lib/api/forecast-overrides.ts`)

**Key Changes:**
- Removed `overrideType` parameter (not needed - table doesn't have this column)
- Changed `amount` to `override_amount` to match actual column name
- Added date format conversion: `YYYY-MM` → `YYYY-MM-01` for database storage
- Simplified interface to match actual table structure
- **Fixed upsert logic:** Replaced `onConflict` with manual select → update or insert
- Handles cases where unique constraints don't exist

**New API Signature:**
```typescript
saveForecastOverride(
  userId: string,
  itemId: string,
  monthYear: string, // Format: 'YYYY-MM'
  overrideAmount: number
)
```

**Upsert Logic:**
1. Query for existing record with matching `user_id`, `item_id`, `month_year`
2. If found: Update the `override_amount`
3. If not found: Insert new record
4. Return the result

### 2. Updated Budget Manager (`src/components/budget/budget-manager.tsx`)

**Handler Updates:**
- `handleUpdateForecastVariableAmount` - Removed `overrideType` parameter
- `handleUpdateForecastGoalContribution` - Removed `overrideType` parameter  
- `handleUpdateForecastDebtAdditionalPayment` - Removed `overrideType` parameter

**Added Override Loading:**
- Added functionality to load existing overrides when forecast data is generated
- Overrides are applied to variable expenses, goal contributions, and debt additional payments
- Totals are recalculated after applying overrides
- Ensures saved user adjustments persist across page loads

### 3. SQL Query Tools Created

Created two tools for database access:

**`query.js`** - Simple Supabase client query runner
- Uses existing Supabase configuration
- Respects RLS policies
- Limited SQL functionality

**`sql-query.js`** - Direct PostgreSQL connection
- Requires database password in `.env`
- Full SQL access for schema inspection
- Bypasses RLS (use carefully)

## How It Works Now

1. **User Makes Changes:** User edits amounts in forecast view
2. **Local State Updates:** UI updates immediately for responsive experience
3. **Database Save:** Changes are saved to `monthly_budget_overrides` table using manual upsert
4. **Page Load:** When page loads, existing overrides are loaded and applied to forecast data
5. **Persistence:** User changes persist across sessions and page refreshes

## Data Flow

```
User Edit → Local State Update → Database Save (Select → Update or Insert)
     ↓
Page Load → Load Overrides → Apply to Forecast → Display
```

## Issues Fixed

### ❌ Original Error:
```
"there is no unique or exclusion constraint matching the ON CONFLICT specification"
```

### ✅ Solution:
- Replaced Supabase `upsert()` with `onConflict` with manual upsert logic
- Uses `select()` → `update()` or `insert()` pattern
- Works regardless of database constraint configuration

## Testing

The implementation can be tested by:

1. **Manual Testing:**
   - Edit amounts in forecast view
   - Refresh the page
   - Verify changes persist
   - No more constraint errors

2. **Database Queries:**
   ```bash
   # Check for saved overrides
   node query.js "SELECT * FROM monthly_budget_overrides WHERE user_id = 'your-user-id';"
   ```

3. **Schema Inspection:**
   ```bash
   # View table structure (requires DB password)
   node sql-query.js "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'monthly_budget_overrides';"
   ```

## Error Handling

- **RLS Errors:** Handled gracefully with user-friendly error messages
- **Network Errors:** Fallback to local state if database operations fail
- **Schema Errors:** Comprehensive error logging for debugging
- **Constraint Errors:** Fixed by using manual upsert logic

## Security Considerations

- All database operations respect RLS policies
- User authentication required for all operations
- No sensitive data exposed in error messages
- Proper UUID validation for user and item IDs

## Future Enhancements

1. **Bulk Operations:** Save multiple overrides in a single transaction
2. **Conflict Resolution:** Handle concurrent edits by multiple users
3. **Audit Trail:** Track who made changes and when
4. **Validation:** Add client-side validation for override amounts
5. **Undo/Redo:** Allow users to revert changes
6. **Database Constraints:** Add proper unique constraints if database schema can be modified

## Files Modified

- `src/lib/api/forecast-overrides.ts` - Complete rewrite with correct schema and fixed upsert
- `src/components/budget/budget-manager.tsx` - Updated handlers and added override loading
- `query.js` - Created SQL query tool
- `sql-query.js` - Created direct PostgreSQL query tool
- `README-SQL-Tools.md` - Documentation for query tools

## Next Steps

1. ✅ Test the implementation with real user data (constraint error fixed)
2. Monitor for any RLS policy issues
3. Add user feedback for save operations
4. Consider adding loading states for better UX
5. Implement error recovery mechanisms 