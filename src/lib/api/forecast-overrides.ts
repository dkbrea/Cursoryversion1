import { supabase } from '../supabase';

export type ForecastOverrideType = 'variable-expense' | 'goal-contribution' | 'debt-additional-payment';

export interface ForecastOverride {
  id: string;
  userId: string;
  itemId: string;
  monthYear: string; // Format: 'YYYY-MM-DD' (first day of month)
  overrideAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Helper function to convert YYYY-MM to YYYY-MM-01 date format
const formatMonthToDate = (monthYear: string): string => {
  return `${monthYear}-01`;
};

// Helper function to convert YYYY-MM-01 back to YYYY-MM
const formatDateToMonth = (dateString: string): string => {
  return dateString.substring(0, 7);
};

export const getForecastOverrides = async (
  userId: string,
  monthYear?: string
): Promise<{ overrides: ForecastOverride[] | null; error?: string }> => {
  try {
    let query = (supabase as any)
      .from('monthly_budget_overrides')
      .select('*')
      .eq('user_id', userId);

    if (monthYear) {
      const dateFormat = formatMonthToDate(monthYear);
      query = query.eq('month_year', dateFormat);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { overrides: null, error: error.message };
    }

    const overrides: ForecastOverride[] = (data || []).map((override: any) => ({
      id: override.id,
      userId: override.user_id,
      itemId: override.item_id,
      monthYear: formatDateToMonth(override.month_year),
      overrideAmount: override.override_amount,
      createdAt: override.created_at ? new Date(override.created_at) : undefined,
      updatedAt: override.updated_at ? new Date(override.updated_at) : undefined
    }));

    return { overrides };
  } catch (error: any) {
    return { overrides: null, error: error.message };
  }
};

export const saveForecastOverride = async (
  userId: string,
  itemId: string,
  monthYear: string, // Format: 'YYYY-MM'
  overrideAmount: number
): Promise<{ override: ForecastOverride | null; error?: string }> => {
  try {
    const dateFormat = formatMonthToDate(monthYear);
    
    // First, try to find an existing override
    const { data: existingData, error: selectError } = await (supabase as any)
      .from('monthly_budget_overrides')
      .select('*')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .eq('month_year', dateFormat)
      .maybeSingle();

    if (selectError) {
      return { override: null, error: selectError.message };
    }

    let data, error;

    if (existingData) {
      // Update existing record
      const { data: updateData, error: updateError } = await (supabase as any)
        .from('monthly_budget_overrides')
        .update({
          override_amount: overrideAmount
        })
        .eq('id', existingData.id)
        .select()
        .single();
      
      data = updateData;
      error = updateError;
    } else {
      // Insert new record
      const { data: insertData, error: insertError } = await (supabase as any)
        .from('monthly_budget_overrides')
        .insert({
          user_id: userId,
          item_id: itemId,
          month_year: dateFormat,
          override_amount: overrideAmount
        })
        .select()
        .single();
      
      data = insertData;
      error = insertError;
    }

    if (error) {
      return { override: null, error: error.message };
    }

    const override: ForecastOverride = {
      id: data.id,
      userId: data.user_id,
      itemId: data.item_id,
      monthYear: formatDateToMonth(data.month_year),
      overrideAmount: data.override_amount,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
    };

    return { override };
  } catch (error: any) {
    return { override: null, error: error.message };
  }
};

export const deleteForecastOverride = async (
  userId: string,
  itemId: string,
  monthYear: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const dateFormat = formatMonthToDate(monthYear);
    
    const { error } = await (supabase as any)
      .from('monthly_budget_overrides')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .eq('month_year', dateFormat);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getForecastOverridesForMonth = async (
  userId: string,
  monthYear: string
): Promise<{ overrides: Record<string, number>; error?: string }> => {
  try {
    const { overrides, error } = await getForecastOverrides(userId, monthYear);
    
    if (error || !overrides) {
      return { overrides: {}, error };
    }

    // Group overrides by itemId for easy lookup
    const groupedOverrides: Record<string, number> = {};
    
    overrides.forEach(override => {
      groupedOverrides[override.itemId] = override.overrideAmount;
    });

    return { overrides: groupedOverrides };
  } catch (error: any) {
    return { overrides: {}, error: error.message };
  }
}; 