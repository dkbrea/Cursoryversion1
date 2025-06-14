-- Fix sinking funds categories to include vacation and all valid predefined categories
-- Drop any existing constraint that might be missing categories
ALTER TABLE sinking_funds DROP CONSTRAINT IF EXISTS sinking_funds_category_check;

-- Add the complete constraint with ALL valid categories
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