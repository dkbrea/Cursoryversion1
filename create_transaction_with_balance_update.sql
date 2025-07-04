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
) RETURNS JSON AS $$
DECLARE
  new_transaction_id UUID;
  tag TEXT;
  transaction_record JSON;
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

  -- Return the created transaction with tags
  SELECT json_build_object(
    'id', t.id,
    'date', t.date,
    'description', t.description,
    'amount', t.amount,
    'type', t.type,
    'detailedType', t.detailed_type,
    'categoryId', t.category_id,
    'accountId', t.account_id,
    'toAccountId', t.to_account_id,
    'sourceId', t.source_id,
    'source', t.source,
    'notes', t.notes,
    'userId', t.user_id,
    'tags', COALESCE(array_agg(tt.tag) FILTER (WHERE tt.tag IS NOT NULL), ARRAY[]::TEXT[]),
    'createdAt', t.created_at,
    'updatedAt', t.updated_at
  ) INTO transaction_record
  FROM transactions t
  LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
  WHERE t.id = new_transaction_id
  GROUP BY t.id, t.date, t.description, t.amount, t.type, t.detailed_type, 
           t.category_id, t.account_id, t.to_account_id, t.source_id, t.source, 
           t.notes, t.user_id, t.created_at, t.updated_at;

  RETURN transaction_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update a transaction and adjust account balances
CREATE OR REPLACE FUNCTION update_transaction_with_balance_adjustment(
  transaction_id_param UUID,
  tx_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  tx_description TEXT DEFAULT NULL,
  tx_amount DECIMAL(12,2) DEFAULT NULL,
  tx_type transaction_type DEFAULT NULL,
  tx_detailed_type transaction_detailed_type DEFAULT NULL,
  tx_category_id UUID DEFAULT NULL,
  tx_account_id UUID DEFAULT NULL,
  tx_to_account_id UUID DEFAULT NULL,
  tx_source_id TEXT DEFAULT NULL,
  tx_source TEXT DEFAULT NULL,
  tx_notes TEXT DEFAULT NULL,
  tx_tags TEXT[] DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  old_transaction transactions%ROWTYPE;
  tag TEXT;
  transaction_record JSON;
BEGIN
  -- Get the old transaction data
  SELECT * INTO old_transaction FROM transactions WHERE id = transaction_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Reverse the old transaction's effect on account balances
  IF old_transaction.type = 'income' THEN
    UPDATE accounts 
    SET balance = balance - old_transaction.amount 
    WHERE id = old_transaction.account_id;
    
  ELSIF old_transaction.type = 'expense' THEN
    UPDATE accounts 
    SET balance = balance + old_transaction.amount 
    WHERE id = old_transaction.account_id;
    
  ELSIF old_transaction.type = 'transfer' AND old_transaction.to_account_id IS NOT NULL THEN
    UPDATE accounts 
    SET balance = balance + old_transaction.amount 
    WHERE id = old_transaction.account_id;
    
    UPDATE accounts 
    SET balance = balance - old_transaction.amount 
    WHERE id = old_transaction.to_account_id;
  END IF;

  -- Update the transaction with new values (only update provided fields)
  UPDATE transactions SET
    date = COALESCE(tx_date, date),
    description = COALESCE(tx_description, description),
    amount = COALESCE(tx_amount, amount),
    type = COALESCE(tx_type, type),
    detailed_type = COALESCE(tx_detailed_type, detailed_type),
    category_id = COALESCE(tx_category_id, category_id),
    account_id = COALESCE(tx_account_id, account_id),
    to_account_id = COALESCE(tx_to_account_id, to_account_id),
    source_id = COALESCE(tx_source_id, source_id),
    source = COALESCE(tx_source, source),
    notes = COALESCE(tx_notes, notes),
    updated_at = NOW()
  WHERE id = transaction_id_param;

  -- Update tags if provided
  IF tx_tags IS NOT NULL THEN
    DELETE FROM transaction_tags WHERE transaction_id = transaction_id_param;
    
    IF array_length(tx_tags, 1) > 0 THEN
      FOREACH tag IN ARRAY tx_tags LOOP
        INSERT INTO transaction_tags (transaction_id, tag) VALUES (transaction_id_param, tag);
      END LOOP;
    END IF;
  END IF;

  -- Apply the new transaction's effect on account balances
  -- Get the updated transaction data
  SELECT * INTO old_transaction FROM transactions WHERE id = transaction_id_param;
  
  IF old_transaction.type = 'income' THEN
    UPDATE accounts 
    SET balance = balance + old_transaction.amount 
    WHERE id = old_transaction.account_id;
    
  ELSIF old_transaction.type = 'expense' THEN
    UPDATE accounts 
    SET balance = balance - old_transaction.amount 
    WHERE id = old_transaction.account_id;
    
  ELSIF old_transaction.type = 'transfer' AND old_transaction.to_account_id IS NOT NULL THEN
    UPDATE accounts 
    SET balance = balance - old_transaction.amount 
    WHERE id = old_transaction.account_id;
    
    UPDATE accounts 
    SET balance = balance + old_transaction.amount 
    WHERE id = old_transaction.to_account_id;
  END IF;

  -- Return the updated transaction with tags
  SELECT json_build_object(
    'id', t.id,
    'date', t.date,
    'description', t.description,
    'amount', t.amount,
    'type', t.type,
    'detailedType', t.detailed_type,
    'categoryId', t.category_id,
    'accountId', t.account_id,
    'toAccountId', t.to_account_id,
    'sourceId', t.source_id,
    'source', t.source,
    'notes', t.notes,
    'userId', t.user_id,
    'tags', COALESCE(array_agg(tt.tag) FILTER (WHERE tt.tag IS NOT NULL), ARRAY[]::TEXT[]),
    'createdAt', t.created_at,
    'updatedAt', t.updated_at
  ) INTO transaction_record
  FROM transactions t
  LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
  WHERE t.id = transaction_id_param
  GROUP BY t.id, t.date, t.description, t.amount, t.type, t.detailed_type, 
           t.category_id, t.account_id, t.to_account_id, t.source_id, t.source, 
           t.notes, t.user_id, t.created_at, t.updated_at;

  RETURN transaction_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a transaction and reverse its balance effects
CREATE OR REPLACE FUNCTION delete_transaction_with_balance_reversal(
  transaction_id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
  old_transaction transactions%ROWTYPE;
BEGIN
  -- Get the transaction data before deletion
  SELECT * INTO old_transaction FROM transactions WHERE id = transaction_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Reverse the transaction's effect on account balances
  IF old_transaction.type = 'income' THEN
    UPDATE accounts 
    SET balance = balance - old_transaction.amount 
    WHERE id = old_transaction.account_id;
    
  ELSIF old_transaction.type = 'expense' THEN
    UPDATE accounts 
    SET balance = balance + old_transaction.amount 
    WHERE id = old_transaction.account_id;
    
  ELSIF old_transaction.type = 'transfer' AND old_transaction.to_account_id IS NOT NULL THEN
    UPDATE accounts 
    SET balance = balance + old_transaction.amount 
    WHERE id = old_transaction.account_id;
    
    UPDATE accounts 
    SET balance = balance - old_transaction.amount 
    WHERE id = old_transaction.to_account_id;
  END IF;

  -- Delete the transaction (cascade will handle tags)
  DELETE FROM transactions WHERE id = transaction_id_param;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 