import { supabase, handleSupabaseError } from '../supabase';
import type { Account, AccountType } from '@/types';

export const getAccounts = async (userId: string): Promise<{ accounts: Account[] | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('name');

    if (error) {
      return { accounts: null, error: error.message };
    }

    // Transform from database format to application format
    const accounts: Account[] = data.map(account => ({
      id: account.id,
      name: account.name,
      type: account.type as AccountType,
      bankName: account.bank_name || undefined,
      last4: account.last4 || undefined,
      balance: account.balance,
      isPrimary: account.is_primary,
      userId: account.user_id,
      createdAt: new Date(account.created_at)
    }));

    return { accounts };
  } catch (error: any) {
    return { accounts: null, error: error.message };
  }
};

export const getAccount = async (accountId: string): Promise<{ account: Account | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error) {
      return { account: null, error: error.message };
    }

    // Transform from database format to application format
    const account: Account = {
      id: data.id,
      name: data.name,
      type: data.type as AccountType,
      bankName: data.bank_name || undefined,
      last4: data.last4 || undefined,
      balance: data.balance,
      isPrimary: data.is_primary,
      userId: data.user_id,
      createdAt: new Date(data.created_at)
    };

    return { account };
  } catch (error: any) {
    return { account: null, error: error.message };
  }
};

export const createAccount = async (account: Omit<Account, 'id' | 'createdAt'>): Promise<{ account: Account | null; error?: string }> => {
  try {
    console.log('=== createAccount called ===');
    console.log('account data:', JSON.stringify(account, null, 2));
    
    // Transform from application format to database format
    const insertData = {
      name: account.name,
      type: account.type,
      bank_name: account.bankName,
      last4: account.last4,
      balance: account.balance,
      is_primary: account.isPrimary,
      user_id: account.userId
    };
    
    console.log('transformed insertData:', JSON.stringify(insertData, null, 2));
    
    const { data, error } = await supabase
      .from('accounts')
      .insert(insertData)
      .select()
      .single();

    console.log('supabase response:', { data, error });

    if (error) {
      console.error('Supabase error:', error);
      return { account: null, error: error.message };
    }

    if (!data) {
      console.error('No data returned from insert');
      return { account: null, error: 'No data returned from database insert' };
    }

    // Transform back to application format
    const newAccount: Account = {
      id: data.id,
      name: data.name,
      type: data.type as AccountType,
      bankName: data.bank_name || undefined,
      last4: data.last4 || undefined,
      balance: data.balance,
      isPrimary: data.is_primary,
      userId: data.user_id,
      createdAt: new Date(data.created_at)
    };

    console.log('transformed result:', JSON.stringify(newAccount, null, 2));
    console.log('=== createAccount success ===');
    return { account: newAccount };
  } catch (error: any) {
    console.error('createAccount caught exception:', error);
    return { account: null, error: error.message };
  }
};

export const updateAccount = async (accountId: string, updates: Partial<Omit<Account, 'id' | 'userId' | 'createdAt'>>): Promise<{ account: Account | null; error?: string }> => {
  try {
    // Transform from application format to database format
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.bankName !== undefined) updateData.bank_name = updates.bankName;
    if (updates.last4 !== undefined) updateData.last4 = updates.last4;
    if (updates.balance !== undefined) updateData.balance = updates.balance;
    if (updates.isPrimary !== undefined) updateData.is_primary = updates.isPrimary;
    
    const { data, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', accountId)
      .select()
      .single();

    if (error) {
      return { account: null, error: error.message };
    }

    // Transform back to application format
    const updatedAccount: Account = {
      id: data.id,
      name: data.name,
      type: data.type as AccountType,
      bankName: data.bank_name || undefined,
      last4: data.last4 || undefined,
      balance: data.balance,
      isPrimary: data.is_primary,
      userId: data.user_id,
      createdAt: new Date(data.created_at)
    };

    return { account: updatedAccount };
  } catch (error: any) {
    return { account: null, error: error.message };
  }
};

export const deleteAccount = async (accountId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
