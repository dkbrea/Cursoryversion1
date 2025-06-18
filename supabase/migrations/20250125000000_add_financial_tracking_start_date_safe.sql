-- Add financial_tracking_start_date column to user_preferences table (safe version)
-- This migration handles the case where the column might already exist

DO $$ 
BEGIN
    -- Check if the column doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'user_preferences' 
        AND column_name = 'financial_tracking_start_date'
    ) THEN
        ALTER TABLE public.user_preferences 
        ADD COLUMN financial_tracking_start_date TIMESTAMPTZ;
        
        -- Add a comment explaining the column
        COMMENT ON COLUMN public.user_preferences.financial_tracking_start_date IS 
        'User-defined start date for financial tracking and aged billing. Determines how far back to show overdue recurring items and historical periods.';
        
        RAISE NOTICE 'Added financial_tracking_start_date column to user_preferences table';
    ELSE
        RAISE NOTICE 'Column financial_tracking_start_date already exists in user_preferences table';
    END IF;
END $$; 