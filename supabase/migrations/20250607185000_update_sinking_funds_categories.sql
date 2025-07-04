-- Update sinking funds category to use predefined recurring categories for consistency
-- First, alter the table to change category column to TEXT
ALTER TABLE sinking_funds ALTER COLUMN category DROP DEFAULT;
ALTER TABLE sinking_funds ALTER COLUMN category TYPE TEXT;

-- Drop the old enum type (if not used elsewhere)
DROP TYPE IF EXISTS sinking_fund_category;

-- Set default category
ALTER TABLE sinking_funds ALTER COLUMN category SET DEFAULT 'personal';

-- Add check constraint to ensure valid categories
ALTER TABLE sinking_funds ADD CONSTRAINT sinking_funds_category_check 
CHECK (category IN ('housing', 'food', 'utilities', 'transportation', 'health', 'personal', 'home-family', 'media-productivity'));

-- Update existing records to map to new categories
UPDATE sinking_funds SET category = CASE 
  WHEN category = 'maintenance' THEN 'transportation'
  WHEN category = 'insurance' THEN 'health'
  WHEN category = 'gifts' THEN 'personal'
  WHEN category = 'taxes' THEN 'personal'
  WHEN category = 'healthcare' THEN 'health'
  WHEN category = 'travel' THEN 'personal'
  WHEN category = 'home-improvement' THEN 'home-family'
  ELSE 'personal'
END; 