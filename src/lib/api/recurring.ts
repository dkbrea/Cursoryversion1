import { supabase, handleSupabaseError } from '../supabase';
import type { RecurringItem, RecurringItemType, RecurringFrequency, PredefinedRecurringCategoryValue } from '@/types';

export const getRecurringItems = async (userId: string): Promise<{ items: RecurringItem[] | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('recurring_items')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      return { items: null, error: error.message };
    }

    // Transform from database format to application format
    const items: RecurringItem[] = data.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type as RecurringItemType,
      amount: item.amount,
      frequency: item.frequency as RecurringFrequency,
      startDate: item.start_date ? new Date(item.start_date) : null,
      lastRenewalDate: item.last_renewal_date ? new Date(item.last_renewal_date) : null,
      semiMonthlyFirstPayDate: item.semi_monthly_first_pay_date ? new Date(item.semi_monthly_first_pay_date) : null,
      semiMonthlySecondPayDate: item.semi_monthly_second_pay_date ? new Date(item.semi_monthly_second_pay_date) : null,
      endDate: item.end_date ? new Date(item.end_date) : null,
      notes: item.notes || undefined,
      userId: item.user_id,
      createdAt: new Date(item.created_at),
      categoryId: item.category_id as PredefinedRecurringCategoryValue || null
    }));

    return { items };
  } catch (error: any) {
    return { items: null, error: error.message };
  }
};

export const getRecurringItem = async (itemId: string): Promise<{ item: RecurringItem | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('recurring_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error) {
      return { item: null, error: error.message };
    }

    // Transform from database format to application format
    const item: RecurringItem = {
      id: data.id,
      name: data.name,
      type: data.type as RecurringItemType,
      amount: data.amount,
      frequency: data.frequency as RecurringFrequency,
      startDate: data.start_date ? new Date(data.start_date) : null,
      lastRenewalDate: data.last_renewal_date ? new Date(data.last_renewal_date) : null,
      semiMonthlyFirstPayDate: data.semi_monthly_first_pay_date ? new Date(data.semi_monthly_first_pay_date) : null,
      semiMonthlySecondPayDate: data.semi_monthly_second_pay_date ? new Date(data.semi_monthly_second_pay_date) : null,
      endDate: data.end_date ? new Date(data.end_date) : null,
      notes: data.notes || undefined,
      userId: data.user_id,
      createdAt: new Date(data.created_at),
      categoryId: data.category_id as PredefinedRecurringCategoryValue || null
    };

    return { item };
  } catch (error: any) {
    return { item: null, error: error.message };
  }
};

export const createRecurringItem = async (
  item: Omit<RecurringItem, 'id' | 'createdAt'>
): Promise<{ item: RecurringItem | null; error?: string }> => {
  try {
    // Transform from application format to database format
    const { data, error } = await supabase
      .from('recurring_items')
      .insert({
        name: item.name,
        type: item.type,
        amount: item.amount,
        frequency: item.frequency,
        start_date: item.startDate ? item.startDate.toISOString() : null,
        last_renewal_date: item.lastRenewalDate ? item.lastRenewalDate.toISOString() : null,
        semi_monthly_first_pay_date: item.semiMonthlyFirstPayDate ? item.semiMonthlyFirstPayDate.toISOString() : null,
        semi_monthly_second_pay_date: item.semiMonthlySecondPayDate ? item.semiMonthlySecondPayDate.toISOString() : null,
        end_date: item.endDate ? item.endDate.toISOString() : null,
        notes: item.notes,
        user_id: item.userId,
        category_id: item.categoryId
      })
      .select()
      .single();

    if (error) {
      return { item: null, error: error.message };
    }

    // Transform back to application format
    const newItem: RecurringItem = {
      id: data.id,
      name: data.name,
      type: data.type as RecurringItemType,
      amount: data.amount,
      frequency: data.frequency as RecurringFrequency,
      startDate: data.start_date ? new Date(data.start_date) : null,
      lastRenewalDate: data.last_renewal_date ? new Date(data.last_renewal_date) : null,
      semiMonthlyFirstPayDate: data.semi_monthly_first_pay_date ? new Date(data.semi_monthly_first_pay_date) : null,
      semiMonthlySecondPayDate: data.semi_monthly_second_pay_date ? new Date(data.semi_monthly_second_pay_date) : null,
      endDate: data.end_date ? new Date(data.end_date) : null,
      notes: data.notes || undefined,
      userId: data.user_id,
      createdAt: new Date(data.created_at),
      categoryId: data.category_id as PredefinedRecurringCategoryValue || null
    };

    return { item: newItem };
  } catch (error: any) {
    return { item: null, error: error.message };
  }
};

export const updateRecurringItem = async (
  itemId: string,
  updates: Partial<Omit<RecurringItem, 'id' | 'userId' | 'createdAt'>>
): Promise<{ item: RecurringItem | null; error?: string }> => {
  try {
    // Transform from application format to database format
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate ? updates.startDate.toISOString() : null;
    if (updates.lastRenewalDate !== undefined) updateData.last_renewal_date = updates.lastRenewalDate ? updates.lastRenewalDate.toISOString() : null;
    if (updates.semiMonthlyFirstPayDate !== undefined) updateData.semi_monthly_first_pay_date = updates.semiMonthlyFirstPayDate ? updates.semiMonthlyFirstPayDate.toISOString() : null;
    if (updates.semiMonthlySecondPayDate !== undefined) updateData.semi_monthly_second_pay_date = updates.semiMonthlySecondPayDate ? updates.semiMonthlySecondPayDate.toISOString() : null;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate ? updates.endDate.toISOString() : null;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
    
    const { data, error } = await supabase
      .from('recurring_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      return { item: null, error: error.message };
    }

    // Transform back to application format
    const updatedItem: RecurringItem = {
      id: data.id,
      name: data.name,
      type: data.type as RecurringItemType,
      amount: data.amount,
      frequency: data.frequency as RecurringFrequency,
      startDate: data.start_date ? new Date(data.start_date) : null,
      lastRenewalDate: data.last_renewal_date ? new Date(data.last_renewal_date) : null,
      semiMonthlyFirstPayDate: data.semi_monthly_first_pay_date ? new Date(data.semi_monthly_first_pay_date) : null,
      semiMonthlySecondPayDate: data.semi_monthly_second_pay_date ? new Date(data.semi_monthly_second_pay_date) : null,
      endDate: data.end_date ? new Date(data.end_date) : null,
      notes: data.notes || undefined,
      userId: data.user_id,
      createdAt: new Date(data.created_at),
      categoryId: data.category_id as PredefinedRecurringCategoryValue || null
    };

    return { item: updatedItem };
  } catch (error: any) {
    return { item: null, error: error.message };
  }
};

export const deleteRecurringItem = async (itemId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('recurring_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Helper function to generate transactions from recurring items
export const generateTransactionsFromRecurring = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('generate_transactions_from_recurring', {
      p_user_id: userId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString()
    });

    if (error) {
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: data.count || 0 };
  } catch (error: any) {
    return { success: false, count: 0, error: error.message };
  }
};
