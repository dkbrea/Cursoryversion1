-- Convert sinking fund category from enum to text to support all categories
-- This fixes the issue where vacation and other new categories aren't supported

-- Step 1: Remove the old constraint and default (if exists)
ALTER TABLE sinking_funds ALTER COLUMN category DROP DEFAULT;

-- Step 2: Convert column from enum to text
ALTER TABLE sinking_funds ALTER COLUMN category TYPE TEXT USING category::text;

-- Step 3: Drop the old enum type if it exists
DROP TYPE IF EXISTS sinking_fund_category CASCADE;

-- Step 4: Update any existing records with old enum values to new values FIRST
UPDATE sinking_funds SET category = CASE 
  WHEN category = 'maintenance' THEN 'transportation'
  WHEN category = 'insurance' THEN 'health'
  WHEN category = 'healthcare' THEN 'health'
  WHEN category = 'travel' THEN 'vacation'
  WHEN category = 'home-improvement' THEN 'home-maintenance'
  WHEN category = 'other' THEN 'personal'
  WHEN category = 'taxes' THEN 'personal'
  WHEN category = 'gifts' THEN 'gifts'
  ELSE category
END;

-- Step 5: Set new default
ALTER TABLE sinking_funds ALTER COLUMN category SET DEFAULT 'personal';

-- Step 6: Add check constraint with ALL valid categories (AFTER data is cleaned)
ALTER TABLE sinking_funds ADD CONSTRAINT sinking_funds_category_check 
CHECK (category IN (
  'housing', 
  'utilities', 
  'transportation', 
  'food', 
  'health', 
  'personal', 
  'home-family', 
  'media-productivity',
  'gifts',
  'pets',
  'education', 
  'subscriptions',
  'self-care',
  'clothing',
  'home-maintenance',
  'car-replacement',
  'vacation'
));

-- Add comment explaining the field
COMMENT ON COLUMN sinking_funds.category IS 'Category for organizing sinking funds - supports all predefined recurring categories'; 