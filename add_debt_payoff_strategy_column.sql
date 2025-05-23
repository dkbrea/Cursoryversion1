-- Add debt_payoff_strategy column to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS debt_payoff_strategy TEXT DEFAULT 'snowball';

-- Add comment to explain this column
COMMENT ON COLUMN public.user_preferences.debt_payoff_strategy IS 'Stores user preferred debt payoff strategy (snowball or avalanche)';
