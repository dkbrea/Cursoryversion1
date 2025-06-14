-- MANUAL FIX: Add background_theme column to sinking_funds table
-- Copy and paste this EXACT SQL into your Supabase SQL Editor

-- Step 1: Add the background_theme column
ALTER TABLE sinking_funds 
ADD COLUMN background_theme VARCHAR(50) DEFAULT 'gradient';

-- Step 2: Update any existing records to have the default value
UPDATE sinking_funds 
SET background_theme = 'gradient' 
WHERE background_theme IS NULL;

-- Step 3: Add check constraint for valid background themes
ALTER TABLE sinking_funds 
ADD CONSTRAINT sinking_funds_background_theme_check 
CHECK (background_theme IN ('gradient', 'summer-tropical'));

-- Step 4: Add comment explaining the field
COMMENT ON COLUMN sinking_funds.background_theme IS 'User-selected background theme for the envelope (gradient, summer-tropical, etc.)';

-- Step 5: Verify the column was added (this should show the new column)
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sinking_funds' AND column_name = 'background_theme'; 