-- Add timezone column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Update existing records to have a default timezone if NULL
UPDATE user_preferences 
SET timezone = 'America/New_York' 
WHERE timezone IS NULL; 