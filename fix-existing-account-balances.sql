-- =============================================================================
-- Fix Existing Account Balances
-- =============================================================================
-- This script recalculates all account balances based on existing transaction history
-- Run this ONCE after deploying the transaction balance update functions
-- =============================================================================

-- First, let's create a function to recalculate account balances
CREATE OR REPLACE FUNCTION recalculate_account_balances()
RETURNS TABLE(account_id UUID, old_balance DECIMAL(12,2), new_balance DECIMAL(12,2), difference DECIMAL(12,2)) AS $$
DECLARE
    account_record RECORD;
    calculated_balance DECIMAL(12,2);
    old_balance_val DECIMAL(12,2);
BEGIN
    -- Loop through all accounts
    FOR account_record IN 
        SELECT a.id, a.balance, a.user_id, a.name 
        FROM accounts a 
        ORDER BY a.name
    LOOP
        -- Store the old balance
        old_balance_val := account_record.balance;
        
        -- Calculate the correct balance based on transaction history
        SELECT COALESCE(SUM(
            CASE 
                WHEN t.type = 'income' THEN t.amount
                WHEN t.type = 'expense' THEN -t.amount
                WHEN t.type = 'transfer' AND t.account_id = account_record.id THEN -t.amount
                WHEN t.type = 'transfer' AND t.to_account_id = account_record.id THEN t.amount
                ELSE 0
            END
        ), 0) INTO calculated_balance
        FROM transactions t
        WHERE t.account_id = account_record.id 
           OR t.to_account_id = account_record.id;
        
        -- Update the account balance
        UPDATE accounts 
        SET balance = calculated_balance 
        WHERE id = account_record.id;
        
        -- Return the results for review
        RETURN QUERY SELECT 
            account_record.id,
            old_balance_val,
            calculated_balance,
            calculated_balance - old_balance_val;
            
        -- Log the change
        RAISE NOTICE 'Account: % | Old: % | New: % | Diff: %', 
            account_record.name, 
            old_balance_val, 
            calculated_balance, 
            calculated_balance - old_balance_val;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 1: Review what will change (DRY RUN)
-- =============================================================================
-- Uncomment the line below to see what changes will be made WITHOUT actually updating
-- SELECT * FROM recalculate_account_balances();

-- =============================================================================
-- STEP 2: Actually fix the balances (LIVE RUN)
-- =============================================================================
-- Uncomment the line below to ACTUALLY update the account balances
-- SELECT * FROM recalculate_account_balances();

-- =============================================================================
-- Alternative: Manual verification queries
-- =============================================================================

-- Query to see current account balances vs calculated balances
SELECT 
    a.id,
    a.name,
    a.balance as current_balance,
    COALESCE(SUM(
        CASE 
            WHEN t.type = 'income' THEN t.amount
            WHEN t.type = 'expense' THEN -t.amount
            WHEN t.type = 'transfer' AND t.account_id = a.id THEN -t.amount
            WHEN t.type = 'transfer' AND t.to_account_id = a.id THEN t.amount
            ELSE 0
        END
    ), 0) as calculated_balance,
    a.balance - COALESCE(SUM(
        CASE 
            WHEN t.type = 'income' THEN t.amount
            WHEN t.type = 'expense' THEN -t.amount
            WHEN t.type = 'transfer' AND t.account_id = a.id THEN -t.amount
            WHEN t.type = 'transfer' AND t.to_account_id = a.id THEN t.amount
            ELSE 0
        END
    ), 0) as difference
FROM accounts a
LEFT JOIN transactions t ON (t.account_id = a.id OR t.to_account_id = a.id)
GROUP BY a.id, a.name, a.balance
ORDER BY ABS(a.balance - COALESCE(SUM(
    CASE 
        WHEN t.type = 'income' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        WHEN t.type = 'transfer' AND t.account_id = a.id THEN -t.amount
        WHEN t.type = 'transfer' AND t.to_account_id = a.id THEN t.amount
        ELSE 0
    END
), 0)) DESC;

-- Query to see transaction summary by account
SELECT 
    a.name as account_name,
    COUNT(t.id) as transaction_count,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as total_income,
    SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN t.type = 'transfer' AND t.account_id = a.id THEN t.amount ELSE 0 END) as total_transfers_out,
    SUM(CASE WHEN t.type = 'transfer' AND t.to_account_id = a.id THEN t.amount ELSE 0 END) as total_transfers_in
FROM accounts a
LEFT JOIN transactions t ON (t.account_id = a.id OR t.to_account_id = a.id)
GROUP BY a.id, a.name
ORDER BY a.name; 