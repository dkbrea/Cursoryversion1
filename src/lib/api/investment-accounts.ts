import { supabase, handleSupabaseError } from '../supabase';
import type { InvestmentAccount, Holding } from '@/types';

// Investment Accounts API
export const getInvestmentAccounts = async (userId: string): Promise<{ 
  accounts: InvestmentAccount[] | null; 
  error?: string 
}> => {
  try {
    const { data, error } = await supabase
      .from('investment_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { accounts: null, error: error.message };
    }

    // Transform from database format to application format
    const accounts: InvestmentAccount[] = (data || []).map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type as InvestmentAccount['type'],
      institution: account.institution || undefined,
      currentValue: account.current_value,
      userId: account.user_id,
      createdAt: new Date(account.created_at)
    }));

    return { accounts };
  } catch (error: any) {
    return { accounts: null, error: error.message };
  }
};

export const createInvestmentAccount = async (
  accountData: Omit<InvestmentAccount, 'id' | 'createdAt'>
): Promise<{ account: InvestmentAccount | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('investment_accounts')
      .insert({
        name: accountData.name,
        type: accountData.type,
        institution: accountData.institution || null,
        current_value: accountData.currentValue,
        user_id: accountData.userId
      })
      .select()
      .single();

    if (error) {
      return { account: null, error: error.message };
    }

    // Transform from database format to application format
    const account: InvestmentAccount = {
      id: data.id,
      name: data.name,
      type: data.type as InvestmentAccount['type'],
      institution: data.institution || undefined,
      currentValue: data.current_value,
      userId: data.user_id,
      createdAt: new Date(data.created_at)
    };

    return { account };
  } catch (error: any) {
    return { account: null, error: error.message };
  }
};

export const updateInvestmentAccount = async (
  accountId: string,
  updates: Partial<Pick<InvestmentAccount, 'name' | 'type' | 'institution' | 'currentValue'>>
): Promise<{ account: InvestmentAccount | null; error?: string }> => {
  try {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.institution !== undefined) updateData.institution = updates.institution || null;
    if (updates.currentValue !== undefined) updateData.current_value = updates.currentValue;

    const { data, error } = await supabase
      .from('investment_accounts')
      .update(updateData)
      .eq('id', accountId)
      .select()
      .single();

    if (error) {
      return { account: null, error: error.message };
    }

    // Transform from database format to application format
    const account: InvestmentAccount = {
      id: data.id,
      name: data.name,
      type: data.type as InvestmentAccount['type'],
      institution: data.institution || undefined,
      currentValue: data.current_value,
      userId: data.user_id,
      createdAt: new Date(data.created_at)
    };

    return { account };
  } catch (error: any) {
    return { account: null, error: error.message };
  }
};

export const deleteInvestmentAccount = async (accountId: string): Promise<{ error?: string }> => {
  try {
    // First delete all holdings associated with this account
    const { error: holdingsError } = await supabase
      .from('holdings')
      .delete()
      .eq('account_id', accountId);

    if (holdingsError) {
      return { error: holdingsError.message };
    }

    // Then delete the account
    const { error } = await supabase
      .from('investment_accounts')
      .delete()
      .eq('id', accountId);

    if (error) {
      return { error: error.message };
    }

    return {};
  } catch (error: any) {
    return { error: error.message };
  }
};

// Holdings API
export const getHoldings = async (userId: string): Promise<{ 
  holdings: Holding[] | null; 
  error?: string 
}> => {
  try {
    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .eq('user_id', userId)
      .order('value', { ascending: false });

    if (error) {
      return { holdings: null, error: error.message };
    }

    // Transform from database format to application format
    const holdings: Holding[] = (data || []).map((holding) => ({
      id: holding.id,
      symbol: holding.symbol,
      name: holding.name,
      value: holding.value,
      shares: holding.shares,
      price: holding.price,
      changePercent: holding.change_percent || 0,
      logoUrl: holding.logo_url || undefined,
      userId: holding.user_id,
      accountId: holding.account_id || undefined
    }));

    return { holdings };
  } catch (error: any) {
    return { holdings: null, error: error.message };
  }
};

export const createHolding = async (
  holdingData: Omit<Holding, 'id'>
): Promise<{ holding: Holding | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('holdings')
      .insert({
        symbol: holdingData.symbol,
        name: holdingData.name,
        value: holdingData.value,
        shares: holdingData.shares,
        price: holdingData.price,
        change_percent: holdingData.changePercent || null,
        logo_url: holdingData.logoUrl || null,
        user_id: holdingData.userId,
        account_id: holdingData.accountId || null
      })
      .select()
      .single();

    if (error) {
      return { holding: null, error: error.message };
    }

    // Transform from database format to application format
    const holding: Holding = {
      id: data.id,
      symbol: data.symbol,
      name: data.name,
      value: data.value,
      shares: data.shares,
      price: data.price,
      changePercent: data.change_percent || 0,
      logoUrl: data.logo_url || undefined,
      userId: data.user_id,
      accountId: data.account_id || undefined
    };

    return { holding };
  } catch (error: any) {
    return { holding: null, error: error.message };
  }
};

export const updateHolding = async (
  holdingId: string,
  updates: Partial<Pick<Holding, 'symbol' | 'name' | 'value' | 'shares' | 'price' | 'changePercent' | 'logoUrl' | 'accountId'>>
): Promise<{ holding: Holding | null; error?: string }> => {
  try {
    const updateData: any = {};
    
    if (updates.symbol !== undefined) updateData.symbol = updates.symbol;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.value !== undefined) updateData.value = updates.value;
    if (updates.shares !== undefined) updateData.shares = updates.shares;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.changePercent !== undefined) updateData.change_percent = updates.changePercent;
    if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl || null;
    if (updates.accountId !== undefined) updateData.account_id = updates.accountId || null;

    const { data, error } = await supabase
      .from('holdings')
      .update(updateData)
      .eq('id', holdingId)
      .select()
      .single();

    if (error) {
      return { holding: null, error: error.message };
    }

    // Transform from database format to application format
    const holding: Holding = {
      id: data.id,
      symbol: data.symbol,
      name: data.name,
      value: data.value,
      shares: data.shares,
      price: data.price,
      changePercent: data.change_percent || 0,
      logoUrl: data.logo_url || undefined,
      userId: data.user_id,
      accountId: data.account_id || undefined
    };

    return { holding };
  } catch (error: any) {
    return { holding: null, error: error.message };
  }
};

export const deleteHolding = async (holdingId: string): Promise<{ error?: string }> => {
  try {
    const { error } = await supabase
      .from('holdings')
      .delete()
      .eq('id', holdingId);

    if (error) {
      return { error: error.message };
    }

    return {};
  } catch (error: any) {
    return { error: error.message };
  }
}; 