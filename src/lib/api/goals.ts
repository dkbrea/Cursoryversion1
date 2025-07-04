import { supabase, handleSupabaseError } from '../supabase';
import type { FinancialGoal, GoalIconKey } from '@/types';

export const getFinancialGoals = async (userId: string): Promise<{ goals: FinancialGoal[] | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { goals: null, error: error.message };
    }

    // Transform from database format to application format
    const goals: FinancialGoal[] = data.map(goal => ({
      id: goal.id.toString(),
      name: goal.name,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount,
      targetDate: new Date(goal.target_date),
      icon: (goal.icon || 'default') as GoalIconKey,
      userId: goal.user_id,
      createdAt: new Date(goal.created_at || new Date())
    }));

    return { goals };
  } catch (error: any) {
    return { goals: null, error: error.message };
  }
};

export const getFinancialGoal = async (goalId: string): Promise<{ goal: FinancialGoal | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (error) {
      return { goal: null, error: error.message };
    }

    // Transform from database format to application format
    const goal: FinancialGoal = {
      id: data.id.toString(),
      name: data.name,
      targetAmount: data.target_amount,
      currentAmount: data.current_amount,
      targetDate: new Date(data.target_date),
      icon: (data.icon || 'default') as GoalIconKey,
      userId: data.user_id,
      createdAt: new Date(data.created_at || new Date())
    };

    return { goal };
  } catch (error: any) {
    return { goal: null, error: error.message };
  }
};

export const createFinancialGoal = async (goal: Omit<FinancialGoal, 'id' | 'createdAt'>): Promise<{ goal: FinancialGoal | null; error?: string }> => {
  try {
    // Transform from application format to database format
    const { data, error } = await supabase
      .from('financial_goals')
      .insert({
        name: goal.name,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        target_date: goal.targetDate.toISOString(),
        icon: goal.icon,
        user_id: goal.userId
      })
      .select()
      .single();

    if (error) {
      return { goal: null, error: error.message };
    }

    // Transform back to application format
    const newGoal: FinancialGoal = {
      id: data.id.toString(),
      name: data.name,
      targetAmount: data.target_amount,
      currentAmount: data.current_amount,
      targetDate: new Date(data.target_date),
      icon: (data.icon || 'default') as GoalIconKey,
      userId: data.user_id,
      createdAt: new Date(data.created_at || new Date())
    };

    return { goal: newGoal };
  } catch (error: any) {
    return { goal: null, error: error.message };
  }
};

export const updateFinancialGoal = async (
  goalId: string, 
  updates: Partial<Omit<FinancialGoal, 'id' | 'userId' | 'createdAt'>>
): Promise<{ goal: FinancialGoal | null; error?: string }> => {
  try {
    // Transform from application format to database format
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.targetAmount !== undefined) updateData.target_amount = updates.targetAmount;
    if (updates.currentAmount !== undefined) updateData.current_amount = updates.currentAmount;
    if (updates.targetDate !== undefined) updateData.target_date = updates.targetDate.toISOString();
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    
    const { data, error } = await supabase
      .from('financial_goals')
      .update(updateData)
      .eq('id', goalId)
      .select()
      .single();

    if (error) {
      return { goal: null, error: error.message };
    }

    // Transform back to application format
    const updatedGoal: FinancialGoal = {
      id: data.id.toString(),
      name: data.name,
      targetAmount: data.target_amount,
      currentAmount: data.current_amount,
      targetDate: new Date(data.target_date),
      icon: (data.icon || 'default') as GoalIconKey,
      userId: data.user_id,
      createdAt: new Date(data.created_at || new Date())
    };

    return { goal: updatedGoal };
  } catch (error: any) {
    return { goal: null, error: error.message };
  }
};

export const deleteFinancialGoal = async (goalId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('financial_goals')
      .delete()
      .eq('id', goalId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Helper function to add a contribution to a financial goal
export const addGoalContribution = async (
  goalId: string, 
  amount: number, 
  userId: string,
  description?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First, get the current goal to update its current amount
    const { goal, error: fetchError } = await getFinancialGoal(goalId);
    
    if (fetchError || !goal) {
      return { success: false, error: fetchError || 'Goal not found' };
    }
    
    // Start a transaction to update the goal and create a transaction record
    const { error } = await supabase.rpc('add_goal_contribution', {
      p_goal_id: parseInt(goalId),
      p_amount: amount,
      p_user_id: userId,
      p_description: description || `Contribution to ${goal.name}`
    });

    if (error) {
      // If the RPC function doesn't exist, fall back to manual updates
      const { error: updateError } = await supabase
        .from('financial_goals')
        .update({ current_amount: goal.currentAmount + amount })
        .eq('id', goalId);
        
      if (updateError) {
        return { success: false, error: updateError.message };
      }
      
      // Create a transaction record for this contribution
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          date: new Date().toISOString(),
          name: description || `Contribution to ${goal.name}`,
          category: 'Savings',
          amount: -amount, // Negative because it's an expense from the account
          account: 'Primary', // Default account, should be replaced with actual account
          transaction_type: 'expense',
          user_id: userId,
          goal_id: parseInt(goalId)
        });
        
      if (txError) {
        return { success: false, error: txError.message };
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
