import { supabase, handleSupabaseError } from '../supabase';
import type { Transaction, TransactionType, TransactionDetailedType } from '@/types';

// Helper function to update account balance
const updateAccountBalance = async (accountId: string, amount: number, operation: 'add' | 'subtract') => {
  const { data: account, error: fetchError } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single();

  if (fetchError || !account) {
    throw new Error(`Failed to fetch account balance: ${fetchError?.message || 'Account not found'}`);
  }

  const newBalance = operation === 'add' ? account.balance + amount : account.balance - amount;

  const { error: updateError } = await supabase
    .from('accounts')
    .update({ balance: newBalance })
    .eq('id', accountId);

  if (updateError) {
    throw new Error(`Failed to update account balance: ${updateError.message}`);
  }
};

// Helper function to update debt account balance
const updateDebtAccountBalance = async (debtAccountId: string, amount: number, operation: 'add' | 'subtract') => {
  const { data: debtAccount, error: fetchError } = await supabase
    .from('debt_accounts')
    .select('balance')
    .eq('id', debtAccountId)
    .single();

  if (fetchError || !debtAccount) {
    throw new Error(`Failed to fetch debt account balance: ${fetchError?.message || 'Debt account not found'}`);
  }

  const newBalance = operation === 'add' ? debtAccount.balance + amount : debtAccount.balance - amount;

  const { error: updateError } = await supabase
    .from('debt_accounts')
    .update({ balance: newBalance })
    .eq('id', debtAccountId);

  if (updateError) {
    throw new Error(`Failed to update debt account balance: ${updateError.message}`);
  }
};

export const getTransactions = async (
  userId: string, 
  options?: { 
    limit?: number; 
    offset?: number; 
    startDate?: Date; 
    endDate?: Date;
    accountId?: string;
    categoryId?: string;
    type?: TransactionType;
  }
): Promise<{ transactions: Transaction[] | null; count: number; error?: string }> => {
  try {
    let query = supabase
      .from('transactions')
      .select('*, transaction_tags(*)', { count: 'exact' })
      .eq('user_id', userId)
      .order('date', { ascending: false });

    // Apply filters
    if (options?.startDate) {
      query = query.gte('date', options.startDate.toISOString());
    }
    
    if (options?.endDate) {
      query = query.lte('date', options.endDate.toISOString());
    }
    
    if (options?.accountId) {
      query = query.eq('account_id', options.accountId);
    }
    
    if (options?.categoryId) {
      query = query.eq('category_id', parseInt(options.categoryId));
    }
    
    if (options?.type) {
      query = query.eq('type', options.type);
    }
    
    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return { transactions: null, count: 0, error: error.message };
    }

    // Transform from database format to application format
    const transactions: Transaction[] = data.map(item => ({
      id: String(item.id),
      date: new Date(item.date),
      description: item.description,
      amount: item.amount,
      type: item.type as TransactionType,
      detailedType: item.detailed_type as TransactionDetailedType | undefined,
      categoryId: item.category_id ? String(item.category_id) : undefined,
      accountId: item.account_id || undefined,
      debtAccountId: item.debt_account_id || undefined,
      toAccountId: item.to_account_id || undefined,
      sourceId: item.source_id || undefined,
      userId: item.user_id,
      source: item.source || undefined,
      notes: item.notes || undefined,
      tags: item.transaction_tags?.map((tag: any) => tag.tag) || [],
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));

    return { transactions, count: count || 0 };
  } catch (error: any) {
    return { transactions: null, count: 0, error: error.message };
  }
};

export const getTransaction = async (transactionId: string): Promise<{ transaction: Transaction | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, transaction_tags(*)')
      .eq('id', transactionId as any)
      .single();

    if (error) {
      return { transaction: null, error: error.message };
    }

    // Transform from database format to application format
    const transaction: Transaction = {
      id: String(data.id),
      date: new Date(data.date),
      description: data.description,
      amount: data.amount,
      type: data.type as TransactionType,
      detailedType: data.detailed_type as TransactionDetailedType | undefined,
      categoryId: data.category_id ? String(data.category_id) : undefined,
      accountId: data.account_id || undefined,
      debtAccountId: data.debt_account_id || undefined,
      toAccountId: data.to_account_id || undefined,
      sourceId: data.source_id || undefined,
      userId: data.user_id,
      source: data.source || undefined,
      notes: data.notes || undefined,
      tags: data.transaction_tags?.map((tag: any) => tag.tag) || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };

    return { transaction };
  } catch (error: any) {
    return { transaction: null, error: error.message };
  }
};

export const createTransaction = async (
  transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ transaction: Transaction | null; error?: string }> => {
  try {
    // Determine which account to use for balance updates
    const accountIdForBalance = transaction.accountId || transaction.debtAccountId;
    if (!accountIdForBalance) {
      return { transaction: null, error: 'Either accountId or debtAccountId must be provided' };
    }

    // Manual transaction creation with balance updates
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .insert({
        date: transaction.date.toISOString(),
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        detailed_type: transaction.detailedType,
        category_id: transaction.categoryId as any || null,
        account_id: transaction.accountId || null,
        debt_account_id: transaction.debtAccountId || null,
        to_account_id: transaction.toAccountId,
        source_id: transaction.sourceId,
        source: transaction.source,
        notes: transaction.notes,
        user_id: transaction.userId
      } as any)
      .select()
      .single();

    if (txError) {
      return { transaction: null, error: txError.message };
    }

    // Insert tags if any
    if (transaction.tags && transaction.tags.length > 0) {
      const tagInserts = transaction.tags.map(tag => ({
        transaction_id: txData.id,
        tag
      }));

      const { error: tagsError } = await supabase
        .from('transaction_tags')
        .insert(tagInserts as any);

      if (tagsError) {
        // Rollback transaction if tags insert fails
        await supabase.from('transactions').delete().eq('id', txData.id as any);
        return { transaction: null, error: tagsError.message };
      }
    }

    // Update account balances manually
    try {
      if (transaction.type === 'income') {
        // Income: Add to the account balance (use absolute value)
        if (transaction.accountId) {
          await updateAccountBalance(transaction.accountId, Math.abs(transaction.amount), 'add');
        }
      } else if (transaction.type === 'expense') {
        // For expenses, update the appropriate account balance
        if (transaction.debtAccountId) {
          // For debt account expenses, update debt account balance (increase debt)
          await updateDebtAccountBalance(transaction.debtAccountId, Math.abs(transaction.amount), 'add');
        } else if (transaction.accountId) {
          // For regular account expenses, subtract from account balance
          await updateAccountBalance(transaction.accountId, Math.abs(transaction.amount), 'subtract');
        }
        
        // If this is a debt payment, also reduce the debt account balance
        if (transaction.detailedType === 'debt-payment' && transaction.sourceId && transaction.accountId) {
          console.log('Processing debt payment - reducing debt balance');
          console.log('Debt account ID:', transaction.sourceId, 'Payment amount:', transaction.amount);
          
          // Use absolute value since expense amounts might be negative
          const paymentAmount = Math.abs(transaction.amount);
          console.log('Absolute payment amount:', paymentAmount);
          
          await updateDebtAccountBalance(transaction.sourceId, paymentAmount, 'subtract');
          console.log('Debt balance updated successfully');
        }
      } else if (transaction.type === 'transfer' && transaction.toAccountId && transaction.accountId) {
        // Transfer: Subtract from source account, add to destination account (use absolute values)
        await updateAccountBalance(transaction.accountId, Math.abs(transaction.amount), 'subtract');
        await updateAccountBalance(transaction.toAccountId, Math.abs(transaction.amount), 'add');
      }
    } catch (balanceError: any) {
      // Rollback transaction if balance update fails
      await supabase.from('transactions').delete().eq('id', txData.id as any);
      return { transaction: null, error: balanceError.message };
    }

    // Get the full transaction with tags
    return await getTransaction(String(txData.id));
  } catch (error: any) {
    return { transaction: null, error: error.message };
  }
};

export const updateTransaction = async (
  transactionId: string,
  updates: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<{ transaction: Transaction | null; error?: string }> => {
  try {
    // First, get the original transaction to reverse its balance effect
    const { transaction: originalTx, error: fetchError } = await getTransaction(transactionId);
    if (fetchError || !originalTx) {
      return { transaction: null, error: fetchError || 'Transaction not found' };
    }

    // Reverse the original transaction's balance effect
    if (originalTx.type === 'income') {
      if (originalTx.accountId) {
        await updateAccountBalance(originalTx.accountId, Math.abs(originalTx.amount), 'subtract');
      }
    } else if (originalTx.type === 'expense') {
      // Handle both regular account and debt account expenses
      if (originalTx.debtAccountId) {
        // Reverse debt account expense (reduce debt)
        await updateDebtAccountBalance(originalTx.debtAccountId, Math.abs(originalTx.amount), 'subtract');
      } else if (originalTx.accountId) {
        // Reverse regular account expense (add back to account)
        await updateAccountBalance(originalTx.accountId, Math.abs(originalTx.amount), 'add');
      }
      
      // If the original transaction was a debt payment, reverse the debt balance effect
      if (originalTx.detailedType === 'debt-payment' && originalTx.sourceId) {
        console.log('Reversing original debt payment effect');
        
        // Use absolute value for consistency
        const originalPaymentAmount = Math.abs(originalTx.amount);
        console.log('Original payment amount (abs):', originalPaymentAmount);
        
        await updateDebtAccountBalance(originalTx.sourceId, originalPaymentAmount, 'add');
        console.log('Original debt payment effect reversed');
      }
    } else if (originalTx.type === 'transfer' && originalTx.toAccountId && originalTx.accountId) {
      await updateAccountBalance(originalTx.accountId, Math.abs(originalTx.amount), 'add');
      await updateAccountBalance(originalTx.toAccountId, Math.abs(originalTx.amount), 'subtract');
    }

    // Transform from application format to database format
    const updateData: any = {};
    if (updates.date !== undefined) updateData.date = updates.date.toISOString();
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.detailedType !== undefined) updateData.detailed_type = updates.detailedType;
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId || null;
    if (updates.accountId !== undefined) updateData.account_id = updates.accountId;
    if (updates.debtAccountId !== undefined) updateData.debt_account_id = updates.debtAccountId;
    if (updates.toAccountId !== undefined) updateData.to_account_id = updates.toAccountId;
    if (updates.sourceId !== undefined) updateData.source_id = updates.sourceId;
    if (updates.source !== undefined) updateData.source = updates.source;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    
    // Update the transaction
    const { error: updateError } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', transactionId as any);

    if (updateError) {
      return { transaction: null, error: updateError.message };
    }

    // If tags are being updated
    if (updates.tags !== undefined) {
      // Delete existing tags
      const { error: deleteError } = await supabase
        .from('transaction_tags')
        .delete()
        .eq('transaction_id', transactionId as any);

      if (deleteError) {
        return { transaction: null, error: deleteError.message };
      }

      // Insert new tags if any
      if (updates.tags.length > 0) {
        const tagInserts = updates.tags.map(tag => ({
          transaction_id: transactionId,
          tag
        }));

        const { error: insertError } = await supabase
          .from('transaction_tags')
          .insert(tagInserts as any);

        if (insertError) {
          return { transaction: null, error: insertError.message };
        }
      }
    }

    // Get the updated transaction to apply new balance effects
    const { transaction: updatedTx, error: newFetchError } = await getTransaction(transactionId);
    if (newFetchError || !updatedTx) {
      return { transaction: null, error: newFetchError || 'Failed to fetch updated transaction' };
    }

    // Apply the new transaction's balance effect
    if (updatedTx.type === 'income') {
      if (updatedTx.accountId) {
        await updateAccountBalance(updatedTx.accountId, Math.abs(updatedTx.amount), 'add');
      }
    } else if (updatedTx.type === 'expense') {
      // Handle both regular account and debt account expenses
      if (updatedTx.debtAccountId) {
        // Apply debt account expense (increase debt)
        await updateDebtAccountBalance(updatedTx.debtAccountId, Math.abs(updatedTx.amount), 'add');
      } else if (updatedTx.accountId) {
        // Apply regular account expense (subtract from account)
        await updateAccountBalance(updatedTx.accountId, Math.abs(updatedTx.amount), 'subtract');
      }
      
      // If the updated transaction is a debt payment, apply the debt balance effect
      if (updatedTx.detailedType === 'debt-payment' && updatedTx.sourceId) {
        console.log('Applying new debt payment effect');
        
        // Use absolute value since expense amounts might be negative
        const newPaymentAmount = Math.abs(updatedTx.amount);
        console.log('New payment amount (abs):', newPaymentAmount);
        
        await updateDebtAccountBalance(updatedTx.sourceId, newPaymentAmount, 'subtract');
        console.log('New debt payment effect applied');
      }
    } else if (updatedTx.type === 'transfer' && updatedTx.toAccountId && updatedTx.accountId) {
      await updateAccountBalance(updatedTx.accountId, Math.abs(updatedTx.amount), 'subtract');
      await updateAccountBalance(updatedTx.toAccountId, Math.abs(updatedTx.amount), 'add');
    }

    return { transaction: updatedTx };
  } catch (error: any) {
    return { transaction: null, error: error.message };
  }
};

export const deleteTransaction = async (transactionId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // First, get the transaction to reverse its balance effect
    const { transaction, error: fetchError } = await getTransaction(transactionId);
    if (fetchError || !transaction) {
      return { success: false, error: fetchError || 'Transaction not found' };
    }

    // Reverse the transaction's balance effect
    if (transaction.type === 'income') {
      if (transaction.accountId) {
        await updateAccountBalance(transaction.accountId, Math.abs(transaction.amount), 'subtract');
      }
    } else if (transaction.type === 'expense') {
      // Handle both regular account and debt account expenses
      if (transaction.debtAccountId) {
        // Reverse debt account expense (reduce debt)
        await updateDebtAccountBalance(transaction.debtAccountId, Math.abs(transaction.amount), 'subtract');
      } else if (transaction.accountId) {
        // Reverse regular account expense (add back to account)
        await updateAccountBalance(transaction.accountId, Math.abs(transaction.amount), 'add');
      }
      
      // If the deleted transaction was a debt payment, reverse the debt balance effect
      if (transaction.detailedType === 'debt-payment' && transaction.sourceId) {
        console.log('Reversing debt payment effect from deleted transaction');
        
        // Use absolute value for consistency
        const deletedPaymentAmount = Math.abs(transaction.amount);
        console.log('Deleted payment amount (abs):', deletedPaymentAmount);
        
        await updateDebtAccountBalance(transaction.sourceId, deletedPaymentAmount, 'add');
        console.log('Debt payment effect reversed from deleted transaction');
      }
    } else if (transaction.type === 'transfer' && transaction.toAccountId && transaction.accountId) {
      await updateAccountBalance(transaction.accountId, Math.abs(transaction.amount), 'add');
      await updateAccountBalance(transaction.toAccountId, Math.abs(transaction.amount), 'subtract');
    }

    // Delete the transaction (cascade will handle tags)
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId as any);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
