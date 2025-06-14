-- Add paycheck preferences to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS paycheck_preferences JSONB DEFAULT '{
  "timingMode": "current-period",
  "includeBufferDays": 3,
  "prioritizeSinkingFunds": false,
  "sinkingFundStrategy": "frequency-based"
}'::jsonb; 