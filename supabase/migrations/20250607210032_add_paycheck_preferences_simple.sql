-- Add paycheck preferences column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'paycheck_preferences'
    ) THEN
        ALTER TABLE user_preferences 
        ADD COLUMN paycheck_preferences JSONB DEFAULT '{
          "timingMode": "current-period",
          "includeBufferDays": 3,
          "prioritizeSinkingFunds": false,
          "sinkingFundStrategy": "frequency-based"
        }'::jsonb;
    END IF;
END $$; 