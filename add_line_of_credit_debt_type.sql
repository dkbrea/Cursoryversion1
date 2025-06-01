-- Add 'line-of-credit' to the debt_account_type enum
ALTER TYPE debt_account_type ADD VALUE 'line-of-credit' AFTER 'credit-card';

-- Add comment explaining the new type
COMMENT ON TYPE debt_account_type IS 'Types of debt accounts including revolving credit (credit-card, line-of-credit) and installment debts (student-loan, personal-loan, mortgage, auto-loan, other)'; 