-- Add background_theme column to sinking_funds table
-- This allows users to select custom backgrounds for their envelopes

ALTER TABLE sinking_funds 
ADD COLUMN background_theme VARCHAR(50) DEFAULT 'gradient';

-- Add check constraint for valid background themes
ALTER TABLE sinking_funds 
ADD CONSTRAINT sinking_funds_background_theme_check 
CHECK (background_theme IN ('gradient', 'summer-tropical'));

-- Add comment explaining the field
COMMENT ON COLUMN sinking_funds.background_theme IS 'User-selected background theme for the envelope (gradient, summer-tropical, etc.)'; 