-- Add forecast_overrides column to user_preferences table
-- This will store forecast overrides as JSON

ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS forecast_overrides JSONB DEFAULT '{}'::jsonb;

-- Add a comment to document the column
COMMENT ON COLUMN user_preferences.forecast_overrides IS 'Stores forecast budget overrides as JSON. Format: {itemId-monthYear-type: {itemId, monthYear, overrideAmount, type, updatedAt}}';

-- Create an index for better performance on JSON queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_forecast_overrides 
ON user_preferences USING GIN (forecast_overrides);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_preferences' 
AND column_name = 'forecast_overrides'; 