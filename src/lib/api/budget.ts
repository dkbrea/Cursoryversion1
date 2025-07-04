import { supabase, handleSupabaseError } from '../supabase';
import type { BudgetCategory } from '@/types';

export const getBudgetCategories = async (userId: string): Promise<{ categories: BudgetCategory[] | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      return { categories: null, error: error.message };
    }

    // Transform from database format to application format
    const categories: BudgetCategory[] = data.map(category => ({
      id: category.id.toString(),
      name: category.name,
      budgetedAmount: category.budgeted_amount,
      userId: category.user_id,
      createdAt: new Date(category.created_at)
    }));

    return { categories };
  } catch (error: any) {
    return { categories: null, error: error.message };
  }
};

export const getBudgetCategory = async (categoryId: string): Promise<{ category: BudgetCategory | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) {
      return { category: null, error: error.message };
    }

    // Transform from database format to application format
    const category: BudgetCategory = {
      id: data.id.toString(),
      name: data.name,
      budgetedAmount: data.budgeted_amount,
      userId: data.user_id,
      createdAt: new Date(data.created_at)
    };

    return { category };
  } catch (error: any) {
    return { category: null, error: error.message };
  }
};

export const createBudgetCategory = async (category: Omit<BudgetCategory, 'id' | 'createdAt'>): Promise<{ category: BudgetCategory | null; error?: string }> => {
  try {
    // Transform from application format to database format
    const { data, error } = await supabase
      .from('budget_categories')
      .insert({
        name: category.name,
        budgeted_amount: category.budgetedAmount,
        user_id: category.userId
      })
      .select()
      .single();

    if (error) {
      return { category: null, error: error.message };
    }

    // Transform back to application format
    const newCategory: BudgetCategory = {
      id: data.id.toString(),
      name: data.name,
      budgetedAmount: data.budgeted_amount,
      userId: data.user_id,
      createdAt: new Date(data.created_at)
    };

    return { category: newCategory };
  } catch (error: any) {
    return { category: null, error: error.message };
  }
};

export const updateBudgetCategory = async (
  categoryId: string, 
  updates: Partial<Omit<BudgetCategory, 'id' | 'userId' | 'createdAt'>>
): Promise<{ category: BudgetCategory | null; error?: string }> => {
  try {
    // Transform from application format to database format
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.budgetedAmount !== undefined) updateData.budgeted_amount = updates.budgetedAmount;
    
    const { data, error } = await supabase
      .from('budget_categories')
      .update(updateData)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      return { category: null, error: error.message };
    }

    // Transform back to application format
    const updatedCategory: BudgetCategory = {
      id: data.id.toString(),
      name: data.name,
      budgetedAmount: data.budgeted_amount,
      userId: data.user_id,
      createdAt: new Date(data.created_at)
    };

    return { category: updatedCategory };
  } catch (error: any) {
    return { category: null, error: error.message };
  }
};

export const deleteBudgetCategory = async (categoryId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('budget_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Get actual spending by budget category for a specific time period
export const getBudgetCategorySpending = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ spending: { categoryId: string; categoryName: string; budgeted: number; actual: number }[] | null; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('get_budget_category_spending', {
      p_user_id: userId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString()
    });

    if (error) {
      return { spending: null, error: error.message };
    }

    return { spending: data };
  } catch (error: any) {
    return { spending: null, error: error.message };
  }
};
