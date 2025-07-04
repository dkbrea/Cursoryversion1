import { supabase } from "@/lib/supabase";
import type { 
  SinkingFund, 
  SinkingFundTransaction, 
  SinkingFundWithProgress,
  PredefinedRecurringCategoryValue,
  ContributionFrequency
} from "@/types";

// Helper function to map old/legacy categories to new categories
// Only for true legacy categories that don't exist in current system
const mapOldCategoryToNew = (oldCategory: string): PredefinedRecurringCategoryValue => {
  const legacyOnlyMap: Record<string, PredefinedRecurringCategoryValue> = {
    // Only map truly legacy categories that don't exist in current type system
    'maintenance': 'transportation',
    'insurance': 'health', 
    'healthcare': 'health',
    'travel': 'vacation', // Fix: travel should map to vacation, not personal
    'home-improvement': 'home-maintenance',
    'other': 'personal'
  };
  
  // If it's a legacy category, map it. Otherwise, preserve as-is if it's valid
  const validCategories: PredefinedRecurringCategoryValue[] = [
    'housing', 'utilities', 'transportation', 'food', 'health', 'personal', 
    'home-family', 'media-productivity', 'gifts', 'pets', 'education', 
    'subscriptions', 'self-care', 'clothing', 'home-maintenance', 
    'car-replacement', 'vacation'
  ];
  
  // If it's already a valid category, don't map it
  if (validCategories.includes(oldCategory as PredefinedRecurringCategoryValue)) {
    return oldCategory as PredefinedRecurringCategoryValue;
  }
  
  // Only map if it's a legacy category
  return legacyOnlyMap[oldCategory] || 'personal';
};

// Helper function to store categories in database
// Since we now support all categories directly, we don't need complex mapping
const mapNewCategoryToDatabase = (newCategory: PredefinedRecurringCategoryValue): string => {
  // All current categories are supported directly in database
  // Just return the category as-is
  return newCategory;
};

// Get all sinking funds for a user
export const getSinkingFunds = async (userId: string): Promise<{
  sinkingFunds: SinkingFund[] | null;
  error: string | null;
}> => {
  try {
    const { data, error } = await supabase
      .from('sinking_funds')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sinking funds:', error);
      return { sinkingFunds: null, error: error.message };
    }

    const sinkingFunds: SinkingFund[] = (data || []).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || undefined,
      targetAmount: Number(item.target_amount),
      currentAmount: Number(item.current_amount),
      monthlyContribution: Number(item.monthly_contribution),
      nextExpenseDate: item.next_expense_date ? new Date(item.next_expense_date) : undefined,
      category: mapOldCategoryToNew(item.category), // Convert old category to new
      isRecurring: item.is_recurring,
      recurringExpenseId: item.recurring_expense_id || undefined,
      variableExpenseId: item.variable_expense_id || undefined,
      contributionFrequency: item.contribution_frequency,
      isActive: item.is_active,
      userId: item.user_id,
      createdAt: new Date(item.created_at!),
      updatedAt: item.updated_at ? new Date(item.updated_at) : undefined,
    }));

    return { sinkingFunds, error: null };
  } catch (err: any) {
    console.error('Error in getSinkingFunds:', err);
    return { sinkingFunds: null, error: err.message };
  }
};

// Get a single sinking fund
export const getSinkingFund = async (id: string): Promise<{
  sinkingFund: SinkingFund | null;
  error: string | null;
}> => {
  try {
    const { data, error } = await supabase
      .from('sinking_funds')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching sinking fund:', error);
      return { sinkingFund: null, error: error.message };
    }

    if (!data) {
      return { sinkingFund: null, error: 'Sinking fund not found' };
    }

    const sinkingFund: SinkingFund = {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      targetAmount: Number(data.target_amount),
      currentAmount: Number(data.current_amount),
      monthlyContribution: Number(data.monthly_contribution),
      nextExpenseDate: data.next_expense_date ? new Date(data.next_expense_date) : undefined,
      category: mapOldCategoryToNew(data.category), // Convert old category to new
      isRecurring: data.is_recurring,
      recurringExpenseId: data.recurring_expense_id || undefined,
      variableExpenseId: data.variable_expense_id || undefined,
      contributionFrequency: data.contribution_frequency,
      isActive: data.is_active,
      userId: data.user_id,
      createdAt: new Date(data.created_at!),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    };

    return { sinkingFund, error: null };
  } catch (err: any) {
    console.error('Error in getSinkingFund:', err);
    return { sinkingFund: null, error: err.message };
  }
};

// Create a new sinking fund
export const createSinkingFund = async (sinkingFundData: Omit<SinkingFund, "id" | "createdAt" | "updatedAt">): Promise<{
  sinkingFund: SinkingFund | null;
  error: string | null;
}> => {
  try {
    const { data, error } = await supabase
      .from('sinking_funds')
      .insert({
        name: sinkingFundData.name,
        description: sinkingFundData.description || undefined,
        target_amount: sinkingFundData.targetAmount,
        current_amount: sinkingFundData.currentAmount,
        monthly_contribution: sinkingFundData.monthlyContribution,
        next_expense_date: sinkingFundData.nextExpenseDate?.toISOString(),
        category: mapNewCategoryToDatabase(sinkingFundData.category),
        is_recurring: sinkingFundData.isRecurring,
        recurring_expense_id: sinkingFundData.recurringExpenseId,
        variable_expense_id: sinkingFundData.variableExpenseId,
        contribution_frequency: sinkingFundData.contributionFrequency,
        is_active: sinkingFundData.isActive,
        user_id: sinkingFundData.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating sinking fund:', error);
      return { sinkingFund: null, error: error.message };
    }

    if (!data) {
      return { sinkingFund: null, error: 'Failed to create sinking fund' };
    }

    const sinkingFund: SinkingFund = {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      targetAmount: Number(data.target_amount),
      currentAmount: Number(data.current_amount),
      monthlyContribution: Number(data.monthly_contribution),
      nextExpenseDate: data.next_expense_date ? new Date(data.next_expense_date) : undefined,
      category: mapOldCategoryToNew(data.category), // Convert old category to new
      isRecurring: data.is_recurring,
      recurringExpenseId: data.recurring_expense_id || undefined,
      variableExpenseId: data.variable_expense_id || undefined,
      contributionFrequency: data.contribution_frequency,
      isActive: data.is_active,
      userId: data.user_id,
      createdAt: new Date(data.created_at!),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    };

    return { sinkingFund, error: null };
  } catch (err: any) {
    console.error('Error in createSinkingFund:', err);
    return { sinkingFund: null, error: err.message };
  }
};

// Update a sinking fund
export const updateSinkingFund = async (
  id: string, 
  updateData: Partial<Omit<SinkingFund, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<{
  sinkingFund: SinkingFund | null;
  error: string | null;
}> => {
  try {
    const updatePayload: any = {};
    
    if (updateData.name !== undefined) updatePayload.name = updateData.name;
    if (updateData.description !== undefined) updatePayload.description = updateData.description;
    if (updateData.targetAmount !== undefined) updatePayload.target_amount = updateData.targetAmount;
    if (updateData.currentAmount !== undefined) updatePayload.current_amount = updateData.currentAmount;
    if (updateData.monthlyContribution !== undefined) updatePayload.monthly_contribution = updateData.monthlyContribution;
    if (updateData.nextExpenseDate !== undefined) updatePayload.next_expense_date = updateData.nextExpenseDate?.toISOString();
    if (updateData.category !== undefined) updatePayload.category = mapNewCategoryToDatabase(updateData.category);
    if (updateData.isRecurring !== undefined) updatePayload.is_recurring = updateData.isRecurring;
    if (updateData.recurringExpenseId !== undefined) updatePayload.recurring_expense_id = updateData.recurringExpenseId;
    if (updateData.variableExpenseId !== undefined) updatePayload.variable_expense_id = updateData.variableExpenseId;
    if (updateData.contributionFrequency !== undefined) updatePayload.contribution_frequency = updateData.contributionFrequency;
    if (updateData.isActive !== undefined) updatePayload.is_active = updateData.isActive;
    
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('sinking_funds')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating sinking fund:', error);
      return { sinkingFund: null, error: error.message };
    }

    if (!data) {
      return { sinkingFund: null, error: 'Sinking fund not found' };
    }

    const sinkingFund: SinkingFund = {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      targetAmount: Number(data.target_amount),
      currentAmount: Number(data.current_amount),
      monthlyContribution: Number(data.monthly_contribution),
      nextExpenseDate: data.next_expense_date ? new Date(data.next_expense_date) : undefined,
      category: mapOldCategoryToNew(data.category), // Convert old category to new
      isRecurring: data.is_recurring,
      recurringExpenseId: data.recurring_expense_id || undefined,
      variableExpenseId: data.variable_expense_id || undefined,
      contributionFrequency: data.contribution_frequency,
      isActive: data.is_active,
      userId: data.user_id,
      createdAt: new Date(data.created_at!),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    };

    return { sinkingFund, error: null };
  } catch (err: any) {
    console.error('Error in updateSinkingFund:', err);
    return { sinkingFund: null, error: err.message };
  }
};

// Delete a sinking fund (soft delete by setting is_active to false)
export const deleteSinkingFund = async (id: string): Promise<{
  success: boolean;
  error: string | null;
}> => {
  try {
    const { error } = await supabase
      .from('sinking_funds')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deleting sinking fund:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error in deleteSinkingFund:', err);
    return { success: false, error: err.message };
  }
};

// Add a contribution to a sinking fund
export const addSinkingFundContribution = async (
  sinkingFundId: string,
  amount: number,
  userId: string,
  description?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First, get the current sinking fund to update its current amount
    const { sinkingFund, error: fetchError } = await getSinkingFund(sinkingFundId);
    
    if (fetchError || !sinkingFund) {
      return { success: false, error: fetchError || 'Sinking fund not found' };
    }

    // Update the sinking fund's current amount
    const newCurrentAmount = sinkingFund.currentAmount + amount;
    const { error: updateError } = await supabase
      .from('sinking_funds')
      .update({ 
        current_amount: newCurrentAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', sinkingFundId);
      
    if (updateError) {
      return { success: false, error: updateError.message };
    }
    
    // Create a transaction record for this contribution
    const { error: txError } = await supabase
      .from('sinking_fund_transactions')
      .insert({
        sinking_fund_id: sinkingFundId,
        amount: amount,
        transaction_type: 'contribution',
        date: new Date().toISOString(),
        description: description || `Contribution to ${sinkingFund.name}`,
        user_id: userId
      });
      
    if (txError) {
      return { success: false, error: txError.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Get sinking funds with progress calculations
export const getSinkingFundsWithProgress = async (userId: string): Promise<{
  sinkingFunds: SinkingFundWithProgress[] | null;
  error: string | null;
}> => {
  try {
    const { sinkingFunds, error } = await getSinkingFunds(userId);
    
    if (error || !sinkingFunds) {
      return { sinkingFunds: null, error };
    }

    const sinkingFundsWithProgress: SinkingFundWithProgress[] = sinkingFunds.map(fund => {
      const progressPercentage = fund.targetAmount > 0 
        ? Math.min((fund.currentAmount / fund.targetAmount) * 100, 100) 
        : 0;
      
      const isFullyFunded = fund.currentAmount >= fund.targetAmount;
      
      let monthsToTarget: number | undefined;
      if (!isFullyFunded && fund.monthlyContribution > 0) {
        const remainingAmount = fund.targetAmount - fund.currentAmount;
        monthsToTarget = Math.ceil(remainingAmount / fund.monthlyContribution);
      }

      return {
        ...fund,
        progressPercentage: Math.round(progressPercentage * 100) / 100,
        monthsToTarget,
        isFullyFunded
      };
    });

    return { sinkingFunds: sinkingFundsWithProgress, error: null };
  } catch (err: any) {
    console.error('Error in getSinkingFundsWithProgress:', err);
    return { sinkingFunds: null, error: err.message };
  }
}; 