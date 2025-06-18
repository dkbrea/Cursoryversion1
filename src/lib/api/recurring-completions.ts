import { supabase, handleSupabaseError } from '../supabase';
import type { UnifiedRecurringListItem, DebtAccount } from '@/types';
import { 
  addDays, addWeeks, addMonths, addQuarters, addYears, 
  isSameDay, setDate, getDate, startOfDay, 
  startOfMonth, endOfMonth, isWithinInterval, isSameMonth, getYear, format,
  isBefore, isAfter, subMonths, addWeeks as addWeeksDate
} from "date-fns";

export interface RecurringCompletion {
  id: string;
  recurringItemId?: string;
  debtAccountId?: string;
  periodDate: Date;
  completedDate: Date;
  transactionId?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringPeriod {
  itemId: string;
  itemName: string;
  itemType: 'recurring' | 'debt';
  periodDate: Date;
  amount: number;
  isCompleted: boolean;
  isOverdue: boolean;
  daysPastDue?: number;
  completedDate?: Date;
  transactionId?: string;
}

// Calculate all occurrences for a recurring item within a date range
export const calculateRecurringOccurrences = (
  item: UnifiedRecurringListItem, 
  startDate: Date, 
  endDate: Date
): Date[] => {
  const occurrences: Date[] = [];
  const itemStartDate = item.startDate || item.lastRenewalDate || startDate;
  let currentDate = startOfDay(new Date(itemStartDate));

  // Ensure we start from the earliest relevant date
  while (currentDate < startDate) {
    switch (item.frequency) {
      case 'weekly':
        currentDate = addWeeks(currentDate, 1);
        break;
      case 'bi-weekly':
        currentDate = addWeeks(currentDate, 2);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, 1);
        break;
      case 'quarterly':
        currentDate = addQuarters(currentDate, 1);
        break;
      case 'yearly':
        currentDate = addYears(currentDate, 1);
        break;
      case 'semi-monthly':
        // Handle semi-monthly logic with first and second pay dates
        if (item.semiMonthlyFirstPayDate && item.semiMonthlySecondPayDate) {
          const firstDay = getDate(item.semiMonthlyFirstPayDate);
          const secondDay = getDate(item.semiMonthlySecondPayDate);
          
          const firstOfMonth = setDate(currentDate, firstDay);
          const secondOfMonth = setDate(currentDate, secondDay);
          
          if (currentDate < firstOfMonth) {
            currentDate = firstOfMonth;
          } else if (currentDate < secondOfMonth) {
            currentDate = secondOfMonth;
          } else {
            currentDate = setDate(addMonths(currentDate, 1), firstDay);
          }
        } else {
          currentDate = addMonths(currentDate, 1);
        }
        break;
      default:
        currentDate = addMonths(currentDate, 1);
    }
  }

  // Generate occurrences within the date range
  while (currentDate <= endDate) {
    // Check if item has ended
    if (item.endDate && currentDate > new Date(item.endDate)) {
      break;
    }

    occurrences.push(new Date(currentDate));

    // Calculate next occurrence
    switch (item.frequency) {
      case 'weekly':
        currentDate = addWeeks(currentDate, 1);
        break;
      case 'bi-weekly':
        currentDate = addWeeks(currentDate, 2);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, 1);
        break;
      case 'quarterly':
        currentDate = addQuarters(currentDate, 1);
        break;
      case 'yearly':
        currentDate = addYears(currentDate, 1);
        break;
      case 'semi-monthly':
        if (item.semiMonthlyFirstPayDate && item.semiMonthlySecondPayDate) {
          const firstDay = getDate(item.semiMonthlyFirstPayDate);
          const secondDay = getDate(item.semiMonthlySecondPayDate);
          const currentDay = getDate(currentDate);
          
          if (currentDay === firstDay) {
            currentDate = setDate(currentDate, secondDay);
          } else {
            currentDate = setDate(addMonths(currentDate, 1), firstDay);
          }
        } else {
          currentDate = addMonths(currentDate, 1);
        }
        break;
      default:
        currentDate = addMonths(currentDate, 1);
    }
  }

  return occurrences;
};

// Calculate debt payment occurrences
export const calculateDebtOccurrences = (
  debt: DebtAccount,
  startDate: Date,
  endDate: Date
): Date[] => {
  const occurrences: Date[] = [];
  const nextDueDate = debt.nextDueDate || new Date();
  let currentDate = startOfDay(new Date(nextDueDate));

  // Go back to find the first occurrence in our range
  while (currentDate > startDate) {
    switch (debt.paymentFrequency) {
      case 'weekly':
        currentDate = addWeeks(currentDate, -1);
        break;
      case 'bi-weekly':
        currentDate = addWeeks(currentDate, -2);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, -1);
        break;
      default:
        currentDate = addMonths(currentDate, -1);
    }
  }

  // Now generate forward occurrences
  while (currentDate <= endDate) {
    if (currentDate >= startDate) {
      occurrences.push(new Date(currentDate));
    }

    switch (debt.paymentFrequency) {
      case 'weekly':
        currentDate = addWeeks(currentDate, 1);
        break;
      case 'bi-weekly':
        currentDate = addWeeks(currentDate, 2);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, 1);
        break;
      default:
        currentDate = addMonths(currentDate, 1);
    }
  }

  return occurrences;
};

// Get all recurring periods with completion status
export const getRecurringPeriods = async (
  userId: string,
  startDate: Date,
  endDate: Date,
  recurringItems: UnifiedRecurringListItem[]
): Promise<{ periods: RecurringPeriod[] | null; error?: string }> => {
  try {
    // Fetch all completions for the user in the date range
    const { data: completions, error: completionsError } = await supabase
      .from('recurring_completions')
      .select('*')
      .eq('user_id', userId)
      .gte('period_date', startDate.toISOString())
      .lte('period_date', endDate.toISOString());

    if (completionsError) {
      return { periods: null, error: completionsError.message };
    }

    const periods: RecurringPeriod[] = [];
    const today = startOfDay(new Date());

    // Process each recurring item
    for (const item of recurringItems) {
      let occurrences: Date[] = [];

      if (item.source === 'debt') {
        // For debt items, we need the debt account details
        // This is a simplified version - in practice you'd fetch the debt account
        occurrences = [item.nextOccurrenceDate]; // Simplified for now
      } else {
        occurrences = calculateRecurringOccurrences(item, startDate, endDate);
      }

      // Create periods for each occurrence
      for (const occurrenceDate of occurrences) {
        const completion = completions?.find(c => 
          (c.recurring_item_id === item.id || c.debt_account_id === item.id) &&
          isSameDay(new Date(c.period_date), occurrenceDate)
        );

        const isOverdue = isBefore(occurrenceDate, today) && !completion;
        const daysPastDue = isOverdue ? Math.floor((today.getTime() - occurrenceDate.getTime()) / (1000 * 60 * 60 * 24)) : undefined;

        periods.push({
          itemId: item.id,
          itemName: item.name,
          itemType: item.source,
          periodDate: occurrenceDate,
          amount: item.amount,
          isCompleted: !!completion,
          isOverdue,
          daysPastDue,
          completedDate: completion ? new Date(completion.completed_date) : undefined,
          transactionId: completion?.transaction_id || undefined,
        });
      }
    }

    // Sort by period date
    periods.sort((a, b) => a.periodDate.getTime() - b.periodDate.getTime());

    return { periods };
  } catch (error: any) {
    return { periods: null, error: error.message };
  }
};

// Mark a recurring period as complete
export const markPeriodComplete = async (
  completion: Omit<RecurringCompletion, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ completion: RecurringCompletion | null; error?: string }> => {
  try {
    // Check if a completion already exists for this period
    const whereClause = completion.recurringItemId 
      ? { recurring_item_id: completion.recurringItemId }
      : { debt_account_id: completion.debtAccountId };

    const { data: existingCompletion, error: checkError } = await supabase
      .from('recurring_completions')
      .select('*')
      .eq('user_id', completion.userId)
      .eq('period_date', completion.periodDate.toISOString())
      .match(whereClause)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      return { completion: null, error: checkError.message };
    }

    if (existingCompletion) {
      // Update existing completion with new transaction_id
      const { data, error } = await supabase
        .from('recurring_completions')
        .update({
          transaction_id: completion.transactionId || null,
          completed_date: completion.completedDate.toISOString(),
        })
        .eq('id', existingCompletion.id)
        .select()
        .single();

      if (error) {
        return { completion: null, error: error.message };
      }

      const result: RecurringCompletion = {
        id: data.id,
        recurringItemId: data.recurring_item_id,
        debtAccountId: data.debt_account_id,
        periodDate: new Date(data.period_date),
        completedDate: new Date(data.completed_date),
        transactionId: data.transaction_id,
        userId: data.user_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      return { completion: result };
    } else {
      // Create new completion
      const { data, error } = await supabase
        .from('recurring_completions')
        .insert({
          recurring_item_id: completion.recurringItemId || null,
          debt_account_id: completion.debtAccountId || null,
          period_date: completion.periodDate.toISOString(),
          completed_date: completion.completedDate.toISOString(),
          transaction_id: completion.transactionId || null,
          user_id: completion.userId,
        })
        .select()
        .single();

      if (error) {
        return { completion: null, error: error.message };
      }

      const result: RecurringCompletion = {
        id: data.id,
        recurringItemId: data.recurring_item_id,
        debtAccountId: data.debt_account_id,
        periodDate: new Date(data.period_date),
        completedDate: new Date(data.completed_date),
        transactionId: data.transaction_id,
        userId: data.user_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      return { completion: result };
    }
  } catch (error: any) {
    return { completion: null, error: error.message };
  }
};

// Remove a completion (unmark as complete)
export const unmarkPeriodComplete = async (
  userId: string,
  itemId: string,
  periodDate: Date,
  itemType: 'recurring' | 'debt'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const whereClause = itemType === 'debt' 
      ? { debt_account_id: itemId }
      : { recurring_item_id: itemId };

    const { error } = await supabase
      .from('recurring_completions')
      .delete()
      .eq('user_id', userId)
      .eq('period_date', periodDate.toISOString())
      .match(whereClause);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Remove completion by transaction ID (for when a transaction is deleted)
export const removeCompletionByTransactionId = async (
  transactionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Removing completion for transaction ID:', transactionId);
    
    const { error } = await supabase
      .from('recurring_completions')
      .delete()
      .eq('transaction_id', transactionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing completion:', error.message);
      return { success: false, error: error.message };
    }

    console.log('Successfully removed completion for transaction ID:', transactionId);
    return { success: true };
  } catch (error: any) {
    console.error('Exception removing completion:', error.message);
    return { success: false, error: error.message };
  }
};

// Get overdue periods for a user
export const getOverduePeriods = async (
  userId: string,
  recurringItems: UnifiedRecurringListItem[]
): Promise<{ overduePeriods: RecurringPeriod[] | null; error?: string }> => {
  const today = startOfDay(new Date());
  const sixMonthsAgo = subMonths(today, 6);

  const { periods, error } = await getRecurringPeriods(userId, sixMonthsAgo, today, recurringItems);

  if (error || !periods) {
    return { overduePeriods: null, error };
  }

  const overdue = periods.filter(period => period.isOverdue);
  return { overduePeriods: overdue };
};

// Get available periods for a recurring item (for transaction recording)
export const getAvailablePeriodsForItem = async (
  userId: string,
  itemId: string,
  itemType: 'recurring' | 'debt',
  recurringItems: UnifiedRecurringListItem[]
): Promise<{ availablePeriods: RecurringPeriod[] | null; error?: string }> => {
  const today = startOfDay(new Date());
  const sixMonthsAgo = subMonths(today, 6);
  const threeMonthsForward = addMonths(today, 3);

  const item = recurringItems.find(i => i.id === itemId);
  if (!item) {
    return { availablePeriods: null, error: 'Recurring item not found' };
  }

  const { periods, error } = await getRecurringPeriods(userId, sixMonthsAgo, threeMonthsForward, [item]);

  if (error || !periods) {
    return { availablePeriods: null, error };
  }

  return { availablePeriods: periods };
}; 