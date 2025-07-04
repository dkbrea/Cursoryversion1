-- Fix sinking funds categories to include all valid predefined categories
-- Drop the old constraint that was missing many valid categories
ALTER TABLE sinking_funds DROP CONSTRAINT IF EXISTS sinking_funds_category_check;

-- Add the complete constraint with all valid categories from PredefinedRecurringCategoryValue
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

-- Update existing records that were incorrectly mapped
-- Specifically fix travel/vacation funds that were mapped to personal
UPDATE sinking_funds 
SET category = 'vacation'
WHERE category = 'personal' 
AND (
  LOWER(name) LIKE '%vacation%' 
  OR LOWER(name) LIKE '%travel%' 
  OR LOWER(name) LIKE '%trip%'
  OR LOWER(name) LIKE '%holiday%'
  OR LOWER(name) LIKE '%cruise%'
  OR LOWER(name) LIKE '%resort%'
);

-- Update other incorrectly mapped categories
UPDATE sinking_funds SET category = 'gifts' WHERE category = 'personal' AND LOWER(name) LIKE '%gift%';
UPDATE sinking_funds SET category = 'pets' WHERE category = 'personal' AND LOWER(name) LIKE '%pet%';
UPDATE sinking_funds SET category = 'education' WHERE category = 'personal' AND LOWER(name) LIKE '%education%';
UPDATE sinking_funds SET category = 'self-care' WHERE category = 'personal' AND LOWER(name) LIKE '%care%';
UPDATE sinking_funds SET category = 'clothing' WHERE category = 'personal' AND LOWER(name) LIKE '%cloth%';
UPDATE sinking_funds SET category = 'car-replacement' WHERE category = 'transportation' AND LOWER(name) LIKE '%replacement%'; 