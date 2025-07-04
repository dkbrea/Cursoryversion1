-- Add next_due_date column to debt_accounts table
ALTER TABLE debt_accounts ADD COLUMN next_due_date TIMESTAMPTZ;

-- Update existing records to set next_due_date based on payment_day_of_month
-- This will set the next_due_date to the payment day of the current month
UPDATE debt_accounts
SET next_due_date = 
  CASE 
    WHEN payment_day_of_month > EXTRACT(DAY FROM CURRENT_DATE) THEN 
      DATE_TRUNC('month', CURRENT_DATE) + ((payment_day_of_month - 1) * INTERVAL '1 day')
    ELSE 
      DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') + ((payment_day_of_month - 1) * INTERVAL '1 day')
  END;

-- Add comment to the column
COMMENT ON COLUMN debt_accounts.next_due_date IS 'The next due date for the debt payment';