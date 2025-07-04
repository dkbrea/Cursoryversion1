const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const createTransactionFunction = `
-- Function to create a transaction and update account balances
CREATE OR REPLACE FUNCTION create_transaction_with_tags(
  tx_date TIMESTAMP WITH TIME ZONE,
  tx_description TEXT,
  tx_amount DECIMAL(12,2),
  tx_type transaction_type,
  tx_detailed_type transaction_detailed_type DEFAULT NULL,
  tx_category_id UUID DEFAULT NULL,
  tx_account_id UUID,
  tx_to_account_id UUID DEFAULT NULL,
  tx_source_id TEXT DEFAULT NULL,
  tx_source TEXT DEFAULT NULL,
  tx_notes TEXT DEFAULT NULL,
  tx_user_id UUID,
  tx_tags TEXT[] DEFAULT ARRAY[]::TEXT[]
) RETURNS UUID AS $$
DECLARE
  new_transaction_id UUID;
  tag TEXT;
BEGIN
  -- Insert the transaction
  INSERT INTO transactions (
    date, description, amount, type, detailed_type, category_id, 
    account_id, to_account_id, source_id, source, notes, user_id
  ) VALUES (
    tx_date, tx_description, tx_amount, tx_type, tx_detailed_type, tx_category_id,
    tx_account_id, tx_to_account_id, tx_source_id, tx_source, tx_notes, tx_user_id
  ) RETURNING id INTO new_transaction_id;

  -- Insert tags if any
  IF array_length(tx_tags, 1) > 0 THEN
    FOREACH tag IN ARRAY tx_tags LOOP
      INSERT INTO transaction_tags (transaction_id, tag) VALUES (new_transaction_id, tag);
    END LOOP;
  END IF;

  -- Update account balances based on transaction type
  IF tx_type = 'income' THEN
    -- Income: Add to the account balance
    UPDATE accounts 
    SET balance = balance + tx_amount 
    WHERE id = tx_account_id AND user_id = tx_user_id;
    
  ELSIF tx_type = 'expense' THEN
    -- Expense: Subtract from the account balance  
    UPDATE accounts 
    SET balance = balance - tx_amount 
    WHERE id = tx_account_id AND user_id = tx_user_id;
    
  ELSIF tx_type = 'transfer' AND tx_to_account_id IS NOT NULL THEN
    -- Transfer: Subtract from source account, add to destination account
    UPDATE accounts 
    SET balance = balance - tx_amount 
    WHERE id = tx_account_id AND user_id = tx_user_id;
    
    UPDATE accounts 
    SET balance = balance + tx_amount 
    WHERE id = tx_to_account_id AND user_id = tx_user_id;
  END IF;

  RETURN new_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function deployFunctions() {
  try {
    console.log('Deploying transaction functions...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: createTransactionFunction
    });
    
    if (error) {
      console.error('Error deploying functions:', error);
      process.exit(1);
    }
    
    console.log('Transaction functions deployed successfully!');
    console.log('Result:', data);
    
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

deployFunctions(); 