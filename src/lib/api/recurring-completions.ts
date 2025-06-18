import { supabase, handleSupabaseError } from '../supabase';
import type { UnifiedRecurringListItem, DebtAccount } from '@/types';
import { 
  addDays, addWeeks, addMonths, addQuarters, addYears, 
  isSameDay, setDate, getDate, startOfDay, 
  startOfMonth, endOfMonth, isWithinInterval, isSameMonth, getYear, format,
  isBefore, isAfter, subMonths, addWeeks as addWeeksDate, min
} from "date-fns";
import { adjustToPreviousBusinessDay } from '@/lib/utils/date-calculations';

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
  autoCompleted?: boolean; // True if marked as completed due to being before the tracking start date
}

// Calculate all occurrences for a recurring item within a date range
export const calculateRecurringOccurrences = (
  item: UnifiedRecurringListItem, 
  startDate: Date, 
  endDate: Date
): Date[] => {
  const occurrences: Date[] = [];
  
  console.log('DEBUG calculateRecurringOccurrences:', {
    itemName: item.name,
    searchStartDate: startDate.toISOString().split('T')[0],
    searchEndDate: endDate.toISOString().split('T')[0],
    itemStartDate: item.startDate?.toISOString?.() || item.startDate,
    itemLastRenewalDate: item.lastRenewalDate?.toISOString?.() || item.lastRenewalDate,
    frequency: item.frequency
  });
  
  // For aged billing: generate periods from search start using item's due day pattern
  const itemStartDate = item.startDate || item.lastRenewalDate;
  let currentDate: Date;
  
  if (itemStartDate) {
    const itemDate = startOfDay(new Date(itemStartDate));
    
    // Extract the due day pattern from the item's start date
    const dueDayOfMonth = getDate(itemDate);
    
    if (itemDate <= startDate) {
      // Item started before search range: advance from item start to find first occurrence in range
      let tempDate = new Date(itemDate);
      
      while (tempDate < startDate) {
        switch (item.frequency) {
          case 'weekly':
            tempDate = addWeeks(tempDate, 1);
            break;
          case 'bi-weekly':
            tempDate = addWeeks(tempDate, 2);
            break;
          case 'monthly':
            tempDate = addMonths(tempDate, 1);
            break;
          case 'quarterly':
            tempDate = addQuarters(tempDate, 1);
            break;
          case 'yearly':
            tempDate = addYears(tempDate, 1);
            break;
          case 'semi-monthly':
            if (item.semiMonthlyFirstPayDate && item.semiMonthlySecondPayDate) {
              const firstDay = getDate(item.semiMonthlyFirstPayDate);
              const secondDay = getDate(item.semiMonthlySecondPayDate);
              const currentDay = getDate(tempDate);
              
              if (currentDay === firstDay) {
                tempDate = setDate(tempDate, secondDay);
              } else {
                tempDate = setDate(addMonths(tempDate, 1), firstDay);
              }
            } else {
              tempDate = addMonths(tempDate, 1);
            }
            break;
          default:
            tempDate = addMonths(tempDate, 1);
        }
      }
      currentDate = tempDate;
    } else {
      // Item starts after search range: for aged billing, generate periods from search start
      // using the item's due day pattern (e.g., if item due 28th, generate 28th of each month from search start)
      
      if (item.frequency === 'monthly') {
        // For monthly items, set the due day in the search start month
        currentDate = setDate(startOfDay(new Date(startDate)), dueDayOfMonth);
        
        // If that date is before the search start date, move to next month
        if (currentDate < startDate) {
          currentDate = setDate(addMonths(startOfDay(new Date(startDate)), 1), dueDayOfMonth);
        }
      } else if (item.frequency === 'semi-monthly' && item.semiMonthlyFirstPayDate && item.semiMonthlySecondPayDate) {
        // Handle semi-monthly with specific dates
        const firstDay = getDate(item.semiMonthlyFirstPayDate);
        const secondDay = getDate(item.semiMonthlySecondPayDate);
        const searchStartDay = getDate(startDate);
        
        if (searchStartDay <= firstDay) {
          currentDate = setDate(startOfDay(new Date(startDate)), firstDay);
        } else if (searchStartDay <= secondDay) {
          currentDate = setDate(startOfDay(new Date(startDate)), secondDay);
        } else {
          currentDate = setDate(addMonths(startOfDay(new Date(startDate)), 1), firstDay);
        }
      } else {
        // For other frequencies, start from item start date
        currentDate = new Date(itemDate);
      }
    }
  } else {
    // Fallback: if no item start date, start from search date
    currentDate = startOfDay(new Date(startDate));
  }

  // Generate occurrences within the date range
  while (currentDate <= endDate) {
    // Check if item has ended
    if (item.endDate && currentDate > new Date(item.endDate)) {
      break;
    }

    // Include all occurrences within the search range
    // This allows for aged billing periods even before the item's technical start
    if (currentDate >= startDate) {
      // Apply business day adjustment only for income items (not subscriptions)
      const finalDate = item.itemDisplayType === 'income' 
        ? adjustToPreviousBusinessDay(currentDate)
        : new Date(currentDate);
      
      // Debug logging for business day adjustments
      if (item.itemDisplayType === 'income' && finalDate.getTime() !== currentDate.getTime()) {
        console.log('DEBUG: Applied business day adjustment for income item:', {
          itemName: item.name,
          originalDate: currentDate.toISOString().split('T')[0],
          adjustedDate: finalDate.toISOString().split('T')[0]
        });
      }
      
      occurrences.push(finalDate);
    }

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

  console.log('DEBUG calculateRecurringOccurrences result:', {
    itemName: item.name,
    occurrencesCount: occurrences.length,
    occurrences: occurrences.map(d => d.toISOString().split('T')[0])
  });

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

  // For aged billing: if debt's next due date is after our search range start,
  // generate periods from search start using the debt's payment day pattern
  if (currentDate > startDate && debt.paymentDayOfMonth) {
    // Extract payment day pattern from next due date
    const paymentDay = debt.paymentDayOfMonth;
    
    // Generate periods from search start date using the payment day pattern
    if (debt.paymentFrequency === 'monthly') {
      currentDate = setDate(startOfDay(new Date(startDate)), paymentDay);
      
      // If that date is before the search start date, move to next month
      if (currentDate < startDate) {
        currentDate = setDate(addMonths(startOfDay(new Date(startDate)), 1), paymentDay);
      }
    } else {
      // For other frequencies, start from next due date and go backward to find first occurrence
      currentDate = startOfDay(new Date(nextDueDate));
      while (currentDate > startDate) {
        switch (debt.paymentFrequency) {
          case 'weekly':
            currentDate = addWeeks(currentDate, -1);
            break;
          case 'bi-weekly':
            currentDate = addWeeks(currentDate, -2);
            break;
          default:
            currentDate = addMonths(currentDate, -1);
        }
      }
    }
  } else {
    // Original logic: go back to find the first occurrence in our range
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
    // Get user's financial tracking start date
    let userTrackingStartDate: Date | null = null;
    try {
      const { data: userPrefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('financial_tracking_start_date')
        .eq('user_id', userId)
        .single();
      
      if (!prefsError && userPrefs?.financial_tracking_start_date) {
        userTrackingStartDate = startOfDay(new Date(userPrefs.financial_tracking_start_date));
        console.log('DEBUG: User tracking start date:', userTrackingStartDate.toISOString().split('T')[0]);
      }
    } catch (error) {
      console.warn('Could not fetch user tracking start date:', error);
    }

    // Fetch debt accounts if we have debt items
    const debtItemIds = recurringItems.filter(item => item.source === 'debt').map(item => item.id);
    let debtAccounts: DebtAccount[] = [];
    
    if (debtItemIds.length > 0) {
      const { data: fetchedDebtAccounts, error: debtError } = await supabase
        .from('debt_accounts')
        .select('*')
        .eq('user_id', userId)
        .in('id', debtItemIds);

      if (debtError) {
        console.warn('Could not fetch debt accounts:', debtError);
      } else {
        debtAccounts = fetchedDebtAccounts || [];
      }
    }

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
        // For debt items, fetch the debt account details and calculate proper occurrences
        const debt = debtAccounts.find(d => d.id === item.id);
        if (debt) {
          // Convert debt account to proper format for calculateDebtOccurrences
          const debtAccount: DebtAccount = {
            id: debt.id,
            name: debt.name,
            type: (debt as any).account_type,
            balance: (debt as any).current_balance,
            minimumPayment: (debt as any).minimum_payment,
            apr: (debt as any).interest_rate,
            paymentFrequency: (debt as any).payment_frequency,
            paymentDayOfMonth: (debt as any).payment_day_of_month,
            nextDueDate: (debt as any).next_due_date ? new Date((debt as any).next_due_date) : new Date(),
            userId: (debt as any).user_id,
            createdAt: new Date((debt as any).created_at),
          };
          occurrences = calculateDebtOccurrences(debtAccount, startDate, endDate);
        } else {
          // Fallback to simplified approach if debt account not found
          occurrences = [item.nextOccurrenceDate];
        }
      } else {
        occurrences = calculateRecurringOccurrences(item, startDate, endDate);
      }

      // Create periods for each occurrence
      for (const occurrenceDate of occurrences) {
        const completion = completions?.find(c => 
          (c.recurring_item_id === item.id || c.debt_account_id === item.id) &&
          isSameDay(new Date(c.period_date), occurrenceDate)
        );

        // Check if this occurrence is before the user's tracking start date
        const isBeforeTrackingStart = userTrackingStartDate ? isBefore(occurrenceDate, userTrackingStartDate) : false;
        
        // If before tracking start date, consider it auto-completed
        const isCompleted = !!completion || isBeforeTrackingStart;
        
        // Debug logging for completion status
        if (isBeforeTrackingStart) {
          console.log('DEBUG: Auto-completing period before tracking start:', {
            itemName: item.name,
            periodDate: occurrenceDate.toISOString().split('T')[0],
            trackingStartDate: userTrackingStartDate?.toISOString().split('T')[0],
            isCompleted,
            isBeforeTrackingStart
          });
        }
        const isOverdue = isBefore(occurrenceDate, today) && !isCompleted;
        const daysPastDue = isOverdue ? Math.floor((today.getTime() - occurrenceDate.getTime()) / (1000 * 60 * 60 * 24)) : undefined;

        periods.push({
          itemId: item.id,
          itemName: item.name,
          itemType: item.source,
          periodDate: occurrenceDate,
          amount: item.amount,
          isCompleted,
          isOverdue,
          daysPastDue,
          completedDate: completion ? new Date(completion.completed_date) : 
                        isBeforeTrackingStart ? occurrenceDate : // Use the occurrence date as completed date for auto-completed items
                        undefined,
          transactionId: completion?.transaction_id || undefined,
          autoCompleted: isBeforeTrackingStart, // Add flag to indicate this was auto-completed
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
  let trackingStartDate = subMonths(today, 6); // Default fallback

  // Get user's preferred financial tracking start date
  try {
    const { data: userPrefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('financial_tracking_start_date')
      .eq('user_id', userId)
      .single();

    if (!prefsError && userPrefs?.financial_tracking_start_date) {
      trackingStartDate = startOfDay(new Date(userPrefs.financial_tracking_start_date));
    }
  } catch (error) {
    console.warn('Could not fetch user preferences for tracking start date, using default:', error);
  }

  const { periods, error } = await getRecurringPeriods(userId, trackingStartDate, today, recurringItems);

  if (error || !periods) {
    return { overduePeriods: null, error };
  }

  const overdue = periods.filter(period => period.isOverdue);
  return { overduePeriods: overdue };
};

// Get available periods for a recurring item (for transaction recording)
// Auto-complete all periods before the tracking start date for a user
export const autoCompletePeriodsBeforeTrackingStart = async (
  userId: string,
  trackingStartDate: Date
): Promise<{ success: boolean; autoCompletedCount: number; error?: string }> => {
  try {
    console.log('DEBUG: Auto-completing periods before tracking start date:', trackingStartDate.toISOString().split('T')[0]);

    // Get all recurring items for the user
    const { data: recurringItems, error: recurringError } = await supabase
      .from('recurring_items')
      .select('*')
      .eq('user_id', userId);

    if (recurringError) {
      return { success: false, autoCompletedCount: 0, error: recurringError.message };
    }

    // Get all debt accounts for the user
    const { data: debtAccounts, error: debtError } = await supabase
      .from('debt_accounts')
      .select('*')
      .eq('user_id', userId);

    if (debtError) {
      return { success: false, autoCompletedCount: 0, error: debtError.message };
    }

    // Convert to unified format
    const allItems: UnifiedRecurringListItem[] = [
      ...(recurringItems || []).map(item => ({
        id: item.id,
        name: item.name,
        itemDisplayType: item.type,
        amount: item.amount,
        frequency: item.frequency,
        nextOccurrenceDate: new Date(item.start_date || item.created_at),
        status: 'Upcoming' as const,
        isDebt: false,
        startDate: item.start_date ? new Date(item.start_date) : null,
        lastRenewalDate: item.last_renewal_date ? new Date(item.last_renewal_date) : null,
        semiMonthlyFirstPayDate: item.semi_monthly_first_pay_date ? new Date(item.semi_monthly_first_pay_date) : null,
        semiMonthlySecondPayDate: item.semi_monthly_second_pay_date ? new Date(item.semi_monthly_second_pay_date) : null,
        endDate: item.end_date ? new Date(item.end_date) : null,
        notes: item.notes,
        source: 'recurring' as const,
        categoryId: item.category_id,
      })),
      ...(debtAccounts || []).map(debt => ({
        id: debt.id,
        name: debt.name,
        itemDisplayType: 'debt-payment' as const,
        amount: debt.minimum_payment,
        frequency: debt.payment_frequency,
        nextOccurrenceDate: new Date(debt.next_due_date),
        status: 'Upcoming' as const,
        isDebt: true,
        startDate: null,
        lastRenewalDate: null,
        semiMonthlyFirstPayDate: null,
        semiMonthlySecondPayDate: null,
        endDate: null,
                 notes: undefined,
         source: 'debt' as const,
         categoryId: undefined,
      }))
    ];

    // Generate periods from January 1st of the tracking start year to the tracking start date
    const startOfYear = startOfDay(new Date(trackingStartDate.getFullYear(), 0, 1));
    const periodsToAutoComplete: Array<{
      itemId: string;
      itemType: 'recurring' | 'debt';
      periodDate: Date;
      amount: number;
    }> = [];

    for (const item of allItems) {
      let occurrences: Date[] = [];
      
      if (item.source === 'recurring') {
        occurrences = calculateRecurringOccurrences(item, startOfYear, trackingStartDate);
      } else {
        // For debt items, generate occurrences based on payment frequency
        // This is simplified - in practice you'd use the debt account details
        const debt = debtAccounts?.find(d => d.id === item.id);
        if (debt) {
          occurrences = calculateDebtOccurrences(debt, startOfYear, trackingStartDate);
        }
      }

      // Filter to only periods before the tracking start date
      const periodsBeforeStart = occurrences.filter(date => isBefore(date, trackingStartDate));
      
      for (const periodDate of periodsBeforeStart) {
        periodsToAutoComplete.push({
          itemId: item.id,
          itemType: item.source,
          periodDate,
          amount: item.amount,
        });
      }
    }

    console.log('DEBUG: Found', periodsToAutoComplete.length, 'periods to auto-complete');

    // Check existing completions to avoid duplicates
    const { data: existingCompletions, error: existingError } = await supabase
      .from('recurring_completions')
      .select('recurring_item_id, debt_account_id, period_date')
      .eq('user_id', userId)
      .gte('period_date', startOfYear.toISOString())
      .lt('period_date', trackingStartDate.toISOString());

    if (existingError) {
      return { success: false, autoCompletedCount: 0, error: existingError.message };
    }

    // Filter out periods that are already completed
    const periodsToInsert = periodsToAutoComplete.filter(period => {
      const existing = existingCompletions?.find(comp => 
        (comp.recurring_item_id === period.itemId || comp.debt_account_id === period.itemId) &&
        isSameDay(new Date(comp.period_date), period.periodDate)
      );
      return !existing;
    });

    console.log('DEBUG: Inserting', periodsToInsert.length, 'new auto-completions');

    // Batch insert the auto-completions
    if (periodsToInsert.length > 0) {
      const completionsToInsert = periodsToInsert.map(period => ({
        user_id: userId,
        recurring_item_id: period.itemType === 'recurring' ? period.itemId : null,
        debt_account_id: period.itemType === 'debt' ? period.itemId : null,
        period_date: period.periodDate.toISOString(),
        completed_date: period.periodDate.toISOString(), // Use period date as completion date
        transaction_id: null, // No actual transaction for auto-completed items
      }));

      const { error: insertError } = await supabase
        .from('recurring_completions')
        .insert(completionsToInsert);

      if (insertError) {
        return { success: false, autoCompletedCount: 0, error: insertError.message };
      }
    }

    return { 
      success: true, 
      autoCompletedCount: periodsToInsert.length,
      error: undefined 
    };
  } catch (error: any) {
    return { success: false, autoCompletedCount: 0, error: error.message };
  }
};

export const getAvailablePeriodsForItem = async (
  userId: string,
  itemId: string,
  itemType: 'recurring' | 'debt',
  recurringItems: UnifiedRecurringListItem[]
): Promise<{ availablePeriods: RecurringPeriod[] | null; error?: string }> => {
  const today = startOfDay(new Date());
  let trackingStartDate = subMonths(today, 6); // Default fallback
  const threeMonthsForward = addMonths(today, 3);

  // Get user's preferred financial tracking start date
  try {
    const { data: userPrefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('financial_tracking_start_date')
      .eq('user_id', userId)
      .single();

    if (!prefsError && userPrefs?.financial_tracking_start_date) {
      trackingStartDate = startOfDay(new Date(userPrefs.financial_tracking_start_date));
      console.log('DEBUG: Using user-defined tracking start date:', trackingStartDate.toISOString().split('T')[0]);
    } else {
      console.log('DEBUG: Using default tracking start date (6 months ago):', trackingStartDate.toISOString().split('T')[0]);
    }
  } catch (error) {
    console.warn('Could not fetch user preferences for tracking start date, using default:', error);
  }

  console.log('DEBUG getAvailablePeriodsForItem:', {
    today: today.toISOString().split('T')[0],
    trackingStartDate: trackingStartDate.toISOString().split('T')[0],
    threeMonthsForward: threeMonthsForward.toISOString().split('T')[0],
    itemId,
    itemType
  });

  const item = recurringItems.find(i => i.id === itemId);
  if (!item) {
    return { availablePeriods: null, error: 'Recurring item not found' };
  }

  console.log('DEBUG found item:', {
    id: item.id,
    name: item.name,
    startDate: item.startDate?.toISOString?.() || item.startDate,
    lastRenewalDate: item.lastRenewalDate?.toISOString?.() || item.lastRenewalDate,
    frequency: item.frequency,
    source: item.source
  });

  const { periods, error } = await getRecurringPeriods(userId, trackingStartDate, threeMonthsForward, [item]);

  if (error || !periods) {
    console.log('DEBUG periods error:', error);
    return { availablePeriods: null, error };
  }

  console.log('DEBUG generated periods:', periods.map(p => ({
    date: p.periodDate.toISOString().split('T')[0],
    isOverdue: p.isOverdue,
    isCompleted: p.isCompleted,
    autoCompleted: p.autoCompleted
  })));

  return { availablePeriods: periods };
}; 