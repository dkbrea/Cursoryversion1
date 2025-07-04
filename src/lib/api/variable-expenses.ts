import { supabase, handleSupabaseError } from '../supabase';
import type { VariableExpense, PredefinedRecurringCategoryValue } from '@/types';

export const getVariableExpenses = async (userId: string): Promise<{ expenses: VariableExpense[] | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('variable_expenses')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      return { expenses: null, error: error.message };
    }

    // Transform from database format to application format
    const expenses: VariableExpense[] = data.map(expense => ({
      id: expense.id,
      name: expense.name,
      category: expense.category as PredefinedRecurringCategoryValue,
      amount: expense.amount,
      userId: expense.user_id,
      createdAt: new Date(expense.created_at),
      updatedAt: expense.updated_at ? new Date(expense.updated_at) : undefined
    }));

    return { expenses };
  } catch (error: any) {
    return { expenses: null, error: error.message };
  }
};

export const getVariableExpense = async (expenseId: string): Promise<{ expense: VariableExpense | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('variable_expenses')
      .select('*')
      .eq('id', expenseId)
      .single();

    if (error) {
      return { expense: null, error: error.message };
    }

    // Transform from database format to application format
    const expense: VariableExpense = {
      id: data.id,
      name: data.name,
      category: data.category as PredefinedRecurringCategoryValue,
      amount: data.amount,
      userId: data.user_id,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
    };

    return { expense };
  } catch (error: any) {
    return { expense: null, error: error.message };
  }
};

export const createVariableExpense = async (expense: Omit<VariableExpense, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ expense: VariableExpense | null; error?: string }> => {
  try {
    // Transform from application format to database format
    const { data, error } = await supabase
      .from('variable_expenses')
      .insert({
        name: expense.name,
        category: expense.category,
        amount: expense.amount,
        user_id: expense.userId
      })
      .select()
      .single();

    if (error) {
      return { expense: null, error: error.message };
    }

    // Transform back to application format
    const newExpense: VariableExpense = {
      id: data.id,
      name: data.name,
      category: data.category as PredefinedRecurringCategoryValue,
      amount: data.amount,
      userId: data.user_id,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
    };

    return { expense: newExpense };
  } catch (error: any) {
    return { expense: null, error: error.message };
  }
};

export const updateVariableExpense = async (
  expenseId: string, 
  updates: Partial<Omit<VariableExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<{ expense: VariableExpense | null; error?: string }> => {
  try {
    // Transform from application format to database format
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('variable_expenses')
      .update(dbUpdates)
      .eq('id', expenseId)
      .select()
      .single();

    if (error) {
      return { expense: null, error: error.message };
    }

    // Transform back to application format
    const updatedExpense: VariableExpense = {
      id: data.id,
      name: data.name,
      category: data.category as PredefinedRecurringCategoryValue,
      amount: data.amount,
      userId: data.user_id,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
    };

    return { expense: updatedExpense };
  } catch (error: any) {
    return { expense: null, error: error.message };
  }
};

export const deleteVariableExpense = async (expenseId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('variable_expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
