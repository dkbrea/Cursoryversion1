"use client";

import { useEffect, useState } from "react";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CreditCard, Users, TrendingUp } from "lucide-react";
import { RecurringList } from "@/components/recurring/recurring-list";
import type { UnifiedRecurringListItem, RecurringItem, Account, Transaction, DebtAccount, Category, FinancialGoal, FinancialGoalWithContribution, VariableExpense, PaycheckBreakdown, SinkingFund, PaycheckPreferences } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { useAccountRefresh } from "@/contexts/account-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { getAccounts } from "@/lib/api/accounts";
import { getTransactions } from "@/lib/api/transactions";
import { getRecurringItems } from "@/lib/api/recurring";
import { getDebtAccounts } from "@/lib/api/debts";
import { getCategories, createCategory } from "@/lib/api/categories";
import { getFinancialGoals } from "@/lib/api/goals";
import { getVariableExpenses } from "@/lib/api/variable-expenses";
import { createTransaction, deleteTransaction, updateTransaction } from "@/lib/api/transactions";
import { formatCurrency } from "@/lib/utils";
import { SetupGuide } from "@/components/dashboard/setup-guide";
import { SavingsGoalsCard } from "@/components/dashboard/savings-goals-card";
import { UpcomingExpensesCard } from "@/components/dashboard/upcoming-expenses-card";
import { PastDueItemsCard } from "@/components/dashboard/past-due-items-card";
import { RecentTransactionsCard } from "@/components/dashboard/recent-transactions-card";
import { CalendarAccessCard } from "@/components/dashboard/calendar-access-card";
import { RecurringCalendarOverlay } from "@/components/dashboard/recurring-calendar-overlay";
import { AddEditTransactionDialog } from "@/components/transactions/add-edit-transaction-dialog";
import { RecordRecurringTransactionDialog } from "@/components/recurring/record-recurring-transaction-dialog";
import { DashboardAIInsightsCard } from "@/components/dashboard/ai-insights-card";
import { BudgetTrackerCard } from "@/components/dashboard/budget-tracker-card";
import { startOfDay, endOfDay, addDays, isSameDay, format, addWeeks, addMonths, subMonths, startOfMonth, getDate, endOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { calculateNextRecurringItemOccurrence } from "@/lib/utils/date-calculations";
import { calculateNextDebtOccurrence } from "@/lib/utils/date-calculations";
import { getUserPreferences, type UserPreferences } from "@/lib/api/user-preferences";
import { getPersonalizedGreeting } from "@/lib/utils/time-greeting";
import { getRecurringPeriods } from "@/lib/api/recurring-completions";
import { supabase } from "@/lib/supabase";
import { generateOccurrenceId } from "@/lib/utils/recurring-calculations";
import { markPeriodComplete } from "@/lib/api/recurring-completions";
import { PayPeriodSummary } from "@/components/dashboard/pay-period-summary";
import { generatePaycheckPeriods, generatePaycheckBreakdownWithSinkingFunds } from "@/lib/utils/paycheck-calculations";
import { getSinkingFunds } from "@/lib/api/sinking-funds";

export function DashboardContent() {
  const { user } = useAuth();
  const { triggerAccountRefresh } = useAccountRefresh();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<UnifiedRecurringListItem[]>([]);
  const [allItems, setAllItems] = useState<UnifiedRecurringListItem[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [goalsWithContributions, setGoalsWithContributions] = useState<FinancialGoalWithContribution[]>([]);
  const [variableExpenses, setVariableExpenses] = useState<VariableExpense[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlySpending, setMonthlySpending] = useState(0);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [goalRefreshTrigger, setGoalRefreshTrigger] = useState(0);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [isCalendarOverlayOpen, setIsCalendarOverlayOpen] = useState(false);
  const [isRecordTransactionOpen, setIsRecordTransactionOpen] = useState(false);
  const [selectedRecurringItem, setSelectedRecurringItem] = useState<UnifiedRecurringListItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [payPeriodBreakdown, setPayPeriodBreakdown] = useState<PaycheckBreakdown | null>(null);
  const [sinkingFunds, setSinkingFunds] = useState<SinkingFund[]>([]);

  useEffect(() => {
    console.log('Dashboard useEffect triggered, user:', user);
    
    async function fetchData() {
      if (!user?.id) {
        console.log('No user found, skipping data fetch');
        setIsLoading(false);
        return;
      }

      console.log('Starting to fetch dashboard data for user:', user.id);

      try {
        // Fetch user preferences first to get timezone
        const { preferences } = await getUserPreferences(user.id);
        setUserPreferences(preferences);

        // ... existing data fetching code ...
        const [
          accountsResult, 
          transactionsResult, 
          recurringResult,
          debtResult, 
          categoriesResult, 
          goalsResult,
          variableExpensesResult
        ] = await Promise.all([
          getAccounts(user.id),
          getTransactions(user.id),
          getRecurringItems(user.id),
          getDebtAccounts(user.id),
          getCategories(user.id),
          getFinancialGoals(user.id),
          getVariableExpenses(user.id)
        ]);

        console.log('Data fetched:', { 
          accounts: accountsResult?.accounts?.length, 
          transactions: transactionsResult?.transactions?.length,
          recurringItems: recurringResult?.items?.length,
          debtAccounts: debtResult?.accounts?.length
        });

        const accountsData = accountsResult?.accounts || [];
        const transactionsData = transactionsResult?.transactions || [];
        const categoriesData = categoriesResult?.categories || [];
        const recurringData = recurringResult?.items || [];
        const debtData = debtResult?.accounts || [];
        const goalsData = goalsResult?.goals || [];
        const variableExpensesData = variableExpensesResult?.expenses || [];

        setAccounts(accountsData);
        setTransactions(transactionsData);
        setCategories(categoriesData);

        // Calculate total balance
        const balance = accountsData.reduce((sum, account) => sum + account.balance, 0);
        setTotalBalance(balance);

        // Calculate monthly spending (current month)
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const endOfCurrentMonth = endOfMonth(now);
        
        const monthlyTransactions = transactionsData.filter(tx => {
          const txDate = new Date(tx.date);
          return txDate >= startOfCurrentMonth && 
                 txDate <= endOfCurrentMonth && 
                 (tx.detailedType === 'variable-expense' || tx.detailedType === 'fixed-expense' || tx.detailedType === 'subscription');
        });
        
        const spending = monthlyTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        setMonthlySpending(spending);

        // Process upcoming items (recurring + debt payments)
        const allUpcomingItems: UnifiedRecurringListItem[] = [];

        // Process recurring items
        if (recurringData && recurringData.length > 0) {
          const today = startOfDay(new Date());
          
          const recurringUpcomingItems = recurringData.map((item: RecurringItem) => {
            // Use the shared calculation function
            const nextOccurrenceDate = calculateNextRecurringItemOccurrence(item);
            
            return {
              id: item.id,
              name: item.name,
              itemDisplayType: item.type,
              amount: item.amount,
              frequency: item.frequency,
              nextOccurrenceDate,
              status: isSameDay(nextOccurrenceDate, today) ? 'Today' as const : 'Upcoming' as const,
              isDebt: false,
              source: 'recurring' as const,
              categoryId: item.categoryId, // Include categoryId from the original RecurringItem
              startDate: item.startDate,
              lastRenewalDate: item.lastRenewalDate,
              endDate: item.endDate,
              semiMonthlyFirstPayDate: item.semiMonthlyFirstPayDate,
              semiMonthlySecondPayDate: item.semiMonthlySecondPayDate,
              notes: item.notes,
            };
          });

          allUpcomingItems.push(...recurringUpcomingItems);
        }

        // Process debt accounts
        if (debtData && debtData.length > 0) {
          const today = startOfDay(new Date());
          
          const debtItems = debtData.map((debt: DebtAccount) => {
            // Use the shared calculation function
            const nextOccurrenceDate = calculateNextDebtOccurrence(debt);
            
            return {
              id: debt.id,
              name: `${debt.name} (Payment)`,
              itemDisplayType: 'debt-payment' as const,
              amount: debt.minimumPayment,
              frequency: debt.paymentFrequency,
              nextOccurrenceDate,
              status: isSameDay(nextOccurrenceDate, today) ? 'Today' as const : 'Upcoming' as const,
              isDebt: true,
              source: 'debt' as const,
            };
          });

          allUpcomingItems.push(...debtItems);
        }

        // Sort by date and filter out ended items for upcoming display
        const activeItems = allUpcomingItems
          .filter(item => item.status !== 'Ended')
          .sort((a, b) => a.nextOccurrenceDate.getTime() - b.nextOccurrenceDate.getTime());
        
        setUpcomingItems(activeItems);
        
        // For calendar, we need ALL items (including past ones), not just upcoming
        // Use the same data structure as the upcoming items but sorted by date
        setAllItems(allUpcomingItems.sort((a, b) => a.nextOccurrenceDate.getTime() - b.nextOccurrenceDate.getTime()));
        
        setRecurringItems(recurringData);
        setDebtAccounts(debtData);
        setGoals(goalsData);
        setVariableExpenses(variableExpensesData);

        // Load completion data
        try {
          const today = new Date();
          let trackingStartDate = subMonths(today, 6); 

          const { data: userPrefs, error: prefsError } = await supabase
            .from('user_preferences')
            .select('financial_tracking_start_date')
            .eq('user_id', user.id)
            .single();

          if (!prefsError && userPrefs?.financial_tracking_start_date) {
            trackingStartDate = startOfDay(new Date(userPrefs.financial_tracking_start_date));
          }

          const startDate = subMonths(trackingStartDate, 3);
          const endDate = addMonths(startOfDay(new Date()), 6);

          // Fetch completions directly from the database (same as refresh logic)
          const { data: completionsData, error: completionsError } = await supabase
            .from('recurring_completions')
            .select('*')
            .eq('user_id', user.id)
            .gte('period_date', startDate.toISOString())
            .lte('period_date', endDate.toISOString());
          
          if (!completionsError && completionsData) {
            console.log('🔄 Found', completionsData.length, 'completion records');
            const completedSet = new Set<string>();
            
            completionsData.forEach((completion: any) => {
              const periodDate = new Date(completion.period_date);
              
              // For debt completions, add the debt account ID with the ACTUAL period date
              if (completion.debt_account_id) {
                const debtOccurrenceId = generateOccurrenceId(completion.debt_account_id, periodDate);
                completedSet.add(debtOccurrenceId);
                console.log('🔄 Initial load - Added DEBT completion:', debtOccurrenceId);
              }
              
              // For recurring items, add the recurring item ID with the period date
              if (completion.recurring_item_id) {
                const recurringOccurrenceId = generateOccurrenceId(completion.recurring_item_id, periodDate);
                completedSet.add(recurringOccurrenceId);
                console.log('🔄 Initial load - Added RECURRING completion:', recurringOccurrenceId);
              }
            });
            
            setCompletedItems(completedSet);
            console.log('🔄 Initial completion set loaded with', completedSet.size, 'items');
          }
        } catch (error) {
          console.error("Error fetching recurring completions for dashboard:", error);
        }

        // Convert goals to FinancialGoalWithContribution format for the transaction dialog
        const goalsConverted: FinancialGoalWithContribution[] = goalsData.map((goal: FinancialGoal) => ({
          ...goal,
          monthlyContribution: 0, // Default value - could be calculated based on target date
          monthsRemaining: 0 // Default value - could be calculated based on target date
        }));
        setGoalsWithContributions(goalsConverted);
      } catch (err: any) {
        console.error("Error loading dashboard data:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user, goalRefreshTrigger]);

  // Get category spending breakdown
  const getCategorySpending = () => {
    const categorySpending: Record<string, number> = {};
    
    // Filter transactions to current month only
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);
    
    // Helper function to get predefined category labels
    const getPredefinedCategoryLabel = (value: string) => {
      const categoryLabels: Record<string, string> = {
        'housing': 'Housing',
        'food': 'Food',
        'utilities': 'Utilities',
        'transportation': 'Transportation',
        'health': 'Health',
        'personal': 'Personal',
        'home-family': 'Home/Family',
        'media-productivity': 'Media/Productivity'
      };
      return categoryLabels[value] || value;
    };
    
    // Filter transactions for expense categories and group by category (current month only)
    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      // Only include transactions that are variable expenses, fixed expenses, or subscriptions AND in current month
      if ((tx.detailedType === 'variable-expense' || tx.detailedType === 'fixed-expense' || tx.detailedType === 'subscription') &&
          txDate >= startOfCurrentMonth && txDate <= endOfCurrentMonth) {
        let categoryName = 'Uncategorized';
        
        if (tx.categoryId) {
          // First check if it's a UUID (category from database)
          const category = categories.find(cat => cat.id === tx.categoryId);
          if (category) {
            categoryName = category.name;
          } else {
            // Fallback to predefined category mapping
            categoryName = getPredefinedCategoryLabel(tx.categoryId);
          }
        }
        
        if (!categorySpending[categoryName]) {
          categorySpending[categoryName] = 0;
        }
        categorySpending[categoryName] += Math.abs(tx.amount); // Use absolute value for expenses
      }
    });
    
    // Convert to array and sort by amount (highest spending first)
    return Object.entries(categorySpending)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3); // Get top 3 categories with most spending
  };

  const topCategories = getCategorySpending();

  // Handler functions for recurring items
  const handleDeleteItem = (itemId: string, source: 'recurring' | 'debt') => {
    console.log(`Delete item ${itemId} from ${source}`);
    // TODO: Implement delete functionality
  };
  
  const handleEditItem = (item: RecurringItem) => {
    console.log(`Edit item ${item.id}`);
    // TODO: Implement edit functionality
  };

  const handleAddTransaction = () => {
    setTransactionToEdit(null);
    setIsTransactionModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleViewCalendar = () => {
    setIsCalendarOverlayOpen(true);
  };

  const handleCalendarItemClick = (item: UnifiedRecurringListItem, date: Date) => {
    console.log('Dashboard: handleCalendarItemClick called with:', {
      itemId: item.id,
      itemName: item.name,
      itemDisplayType: item.itemDisplayType,
      selectedDate: date.toISOString().split('T')[0],
      occurrenceId: generateOccurrenceId(item.id, date)
    });
    setSelectedRecurringItem(item);
    setSelectedDate(date);
    setIsRecordTransactionOpen(true);
  };

  const handleRecordTransaction = async (transactionData: Omit<Transaction, "id" | "userId" | "source" | "createdAt" | "updatedAt">) => {
    if (!user?.id || !selectedRecurringItem) return;

    console.log('💰 handleRecordTransaction called with:', {
      selectedRecurringItemId: selectedRecurringItem.id,
      selectedRecurringItemName: selectedRecurringItem.name,
      selectedRecurringItemSource: selectedRecurringItem.source,
      selectedDate: selectedDate.toISOString().split('T')[0],
      transactionDate: transactionData.date.toISOString().split('T')[0],
      expectedOccurrenceId: generateOccurrenceId(selectedRecurringItem.id, selectedDate)
    });

    // This is the original, correct logic for handling categories that I mistakenly removed.
    let finalCategoryId = transactionData.categoryId;
    const predefinedCategoryPrefix = 'PREDEFINED:';
    if (finalCategoryId && typeof finalCategoryId === 'string' && finalCategoryId.startsWith(predefinedCategoryPrefix)) {
      const predefinedValue = finalCategoryId.replace(predefinedCategoryPrefix, '');
      const categoryLabels: Record<string, string> = {
        'housing': 'Housing', 'food': 'Food', 'utilities': 'Utilities',
        'transportation': 'Transportation', 'health': 'Health', 'personal': 'Personal',
        'home-family': 'Home/Family', 'media-productivity': 'Media/Productivity',
        'income': 'Income', 'debt': 'Debt'
      };
      const categoryLabel = categoryLabels[predefinedValue] || predefinedValue;
      let existingCategory = categories.find(cat => cat.name === categoryLabel);
      if (existingCategory) {
        finalCategoryId = existingCategory.id;
      } else {
        try {
          const { createCategory } = await import('@/lib/api/categories');
          const result = await createCategory({ name: categoryLabel, userId: user.id });
          if (result.category) {
            setCategories(prev => [...prev, result.category!]);
            finalCategoryId = result.category.id;
          } else { finalCategoryId = null; }
        } catch (error) {
          console.error('Failed to create category:', error);
          finalCategoryId = null;
        }
      }
    }

    try {
      const { transaction: newTransaction, error } = await createTransaction({
        ...transactionData,
        categoryId: finalCategoryId,
        userId: user.id,
      });

      if (error || !newTransaction) {
        throw new Error(error || "Failed to create transaction");
      }

      console.log('💰 Transaction created successfully:', {
        transactionId: newTransaction.id,
        transactionAmount: newTransaction.amount,
        transactionDate: newTransaction.date.toISOString().split('T')[0]
      });

      setTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      
      const completionKey = generateOccurrenceId(selectedRecurringItem.id, selectedDate);
      console.log('💰 Adding completion key to UI state:', completionKey);
      setCompletedItems(prev => new Set(prev).add(completionKey));

      // This is the database update that was missing.
      try {
        console.log('💰 About to call markPeriodComplete with:', {
          recurringItemId: selectedRecurringItem.source === 'recurring' ? selectedRecurringItem.id : undefined,
          debtAccountId: selectedRecurringItem.source === 'debt' ? selectedRecurringItem.id : undefined,
          periodDate: selectedDate.toISOString().split('T')[0],
          completedDate: startOfDay(new Date(newTransaction.date)).toISOString().split('T')[0],
          transactionId: newTransaction.id,
          userId: user.id,
        });

        const { markPeriodComplete } = await import('@/lib/api/recurring-completions');
        const markResult = await markPeriodComplete({
            recurringItemId: selectedRecurringItem.source === 'recurring' ? selectedRecurringItem.id : undefined,
            debtAccountId: selectedRecurringItem.source === 'debt' ? selectedRecurringItem.id : undefined,
            periodDate: selectedDate,
            completedDate: startOfDay(new Date(newTransaction.date)),
            transactionId: newTransaction.id,
            userId: user.id,
        });

        console.log('💰 markPeriodComplete result:', markResult);

        if (markResult.error) {
          console.error('💰 ERROR in markPeriodComplete:', markResult.error);
        } else {
          console.log('💰 SUCCESS in markPeriodComplete:', markResult.completion);
        }
      } catch (completionError) {
          console.error("💰 Exception in markPeriodComplete:", completionError);
      }

      // Refresh completion data from database to ensure UI consistency
      try {
        console.log('💰 Refreshing completion data after transaction recording...');
        
        // Use the same date range logic as initial load
        const today = new Date();
        let trackingStartDate = subMonths(today, 6); 

        const { data: userPrefs, error: prefsError } = await supabase
          .from('user_preferences')
          .select('financial_tracking_start_date')
          .eq('user_id', user.id)
          .single();

        if (!prefsError && userPrefs?.financial_tracking_start_date) {
          trackingStartDate = startOfDay(new Date(userPrefs.financial_tracking_start_date));
        }

        const startDate = subMonths(trackingStartDate, 3);
        const endDate = addMonths(startOfDay(new Date()), 6);

        // Fetch completions directly from the database
        const { data: completionsData, error: completionsError } = await supabase
          .from('recurring_completions')
          .select('*')
          .eq('user_id', user.id)
          .gte('period_date', startDate.toISOString())
          .lte('period_date', endDate.toISOString());

        if (!completionsError && completionsData) {
          console.log('💰 Found', completionsData.length, 'completion records');
          const refreshedCompletedSet = new Set<string>();
          
          completionsData.forEach((completion: any) => {
            const periodDate = new Date(completion.period_date);
            
            // For debt completions, we need to add BOTH IDs to the set
            // because past due items use debt_account_id but completions store recurring_item_id
            if (completion.debt_account_id) {
              // Add debt account ID based occurrence (what past due items look for)
              const debtOccurrenceId = generateOccurrenceId(completion.debt_account_id, periodDate);
              refreshedCompletedSet.add(debtOccurrenceId);
              console.log('💰 Added DEBT completion to set:', debtOccurrenceId);
            }
            
            if (completion.recurring_item_id) {
              // Also add recurring item ID based occurrence (for regular recurring items)
              const recurringOccurrenceId = generateOccurrenceId(completion.recurring_item_id, periodDate);
              refreshedCompletedSet.add(recurringOccurrenceId);
              console.log('💰 Added RECURRING completion to set:', recurringOccurrenceId);
            }
          });
          
          setCompletedItems(refreshedCompletedSet);
          console.log('💰 Successfully refreshed completedItems set with', refreshedCompletedSet.size, 'items');
        } else {
          console.error('💰 Error fetching completions:', completionsError);
        }
      } catch (refreshError) {
        console.error('💰 Exception while refreshing completion data:', refreshError);
      }

      setIsRecordTransactionOpen(false);
      setSelectedRecurringItem(null);

      // Trigger account balance refresh in the sidebar
      triggerAccountRefresh();

      // Also refresh the dashboard's account state so transaction dialogs have fresh data
      try {
        const { getAccounts } = await import('@/lib/api/accounts');
        const { accounts: updatedAccounts, error: accountsError } = await getAccounts(user.id);
        
        if (!accountsError && updatedAccounts) {
          setAccounts(updatedAccounts);
          const newBalance = updatedAccounts.reduce((sum: number, account: Account) => sum + account.balance, 0);
          setTotalBalance(newBalance);
        }
      } catch (error) {
        console.error("Error refetching accounts after recording transaction:", error);
      }

      // The dialog expects the new transaction to be returned.
      return newTransaction;

    } catch (error) {
      console.error("💰 Error recording transaction:", error);
      throw error;
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!user?.id) return;
    
    // Find the transaction being deleted
    const transactionToDelete = transactions.find(t => t.id === transactionId);
    if (!transactionToDelete) return;

    try {
      // Debug: Log completed items before deletion
      console.log('Dashboard: completedItems BEFORE deletion:', Array.from(completedItems));
      console.log('Dashboard: completedItems size BEFORE deletion:', completedItems.size);

      // IMPORTANT: Delete completion records BEFORE deleting the transaction
      // This is because the foreign key constraint will set transaction_id to NULL
      // if we delete the transaction first, making it impossible to find the completion
      try {
        console.log('Dashboard: Attempting to remove completion BEFORE deleting transaction:', transactionToDelete.id);
        const { removeCompletionByTransactionId } = await import('@/lib/api/recurring-completions');
        
        const completionResult = await removeCompletionByTransactionId(transactionToDelete.id, user.id);
        
        if (completionResult.success) {
          console.log('Dashboard: Successfully removed completion before transaction deletion');
          console.log('Dashboard: Completion result:', completionResult);
        } else {
          console.log('Dashboard: No completion found for this transaction (this is normal for non-recurring transactions)');
        }
      } catch (error) {
        console.warn('Dashboard: Error removing completion record:', error);
        // Don't fail the delete operation if completion cleanup fails
      }

      // Now delete the transaction
      const { deleteTransaction } = await import('@/lib/api/transactions');
      const result = await deleteTransaction(transactionId);
      
      if (result.error) {
        toast({
          title: "Error",
          description: `Failed to delete transaction: ${result.error}`,
          variant: "destructive"
        });
        return;
      }

      if (result.success) {
        // Remove the transaction from the list
        setTransactions(prev => prev.filter(t => t.id !== transactionId));
        
        // Refresh the completion data to update the calendar
        try {
          // Use the same date range as the initial load to ensure we get all completion data
          const today = new Date();
          let trackingStartDate = subMonths(today, 6); // Default fallback

          // Try to get the user's tracking start date
          try {
            const { data: userPrefs, error: prefsError } = await supabase
              .from('user_preferences')
              .select('financial_tracking_start_date')
              .eq('user_id', user.id)
              .single();

            if (!prefsError && userPrefs?.financial_tracking_start_date) {
              trackingStartDate = startOfDay(new Date(userPrefs.financial_tracking_start_date));
            }
          } catch (error) {
            console.warn('Could not fetch user preferences for tracking start date:', error);
          }

          const startDate = subMonths(trackingStartDate, 3); // Go back a bit more to be safe
          const endDate = addMonths(startOfDay(new Date()), 6); // Go forward 6 months

          console.log('Dashboard: Fetching completion data with date range:', {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            trackingStartDate: trackingStartDate.toISOString().split('T')[0],
            allItemsCount: allItems.length
          });

          const { getRecurringPeriods } = await import('@/lib/api/recurring-completions');
          const { periods, error } = await getRecurringPeriods(
            user.id!,
            startDate,
            endDate,
            allItems
          );

          if (!error && periods) {
            console.log('Dashboard: Refreshing completion data after transaction deletion');
            console.log('Dashboard: Periods received:', periods.length);
            console.log('Dashboard: Completed periods:', periods.filter(p => p.isCompleted).length);
            
            // Debug: Log income-specific completion records
            const incomeCompletions = periods.filter(p => {
              if (!p.isCompleted) return false;
              // Find the corresponding recurring item to check if it's an income item
              const item = allItems.find(item => item.id === p.itemId);
              return item?.itemDisplayType === 'income';
            });
            
            // Debug: Log debt-specific completion records
            const debtCompletions = periods.filter(p => {
              if (!p.isCompleted) return false;
              // Find the corresponding item to check if it's a debt item
              const item = allItems.find(item => item.id === p.itemId);
              return item?.source === 'debt';
            });
            console.log('Dashboard: Income completion records:', incomeCompletions.map(p => ({
              itemId: p.itemId,
              itemName: p.itemName,
              periodDate: p.periodDate,
              completedDate: p.completedDate,
              transactionId: p.transactionId,
              generatedOccurrenceId: generateOccurrenceId(p.itemId, p.periodDate)
            })));
            
            const completedSet = new Set<string>();
            periods.forEach(period => {
              if (period.isCompleted) {
                const itemKey = generateOccurrenceId(period.itemId, period.periodDate);
                completedSet.add(itemKey);
              }
            });
            
            console.log('Dashboard: completedItems AFTER refresh:', Array.from(completedSet));
            console.log('Dashboard: completedItems size AFTER refresh:', completedSet.size);
            
            // Debug: Show what income completion IDs are in the refreshed set
            const incomeOccurrenceIds = Array.from(completedSet).filter(id => {
              // Find the corresponding item to check if it's income
              const matchingIncomeCompletion = incomeCompletions.find(ic => 
                generateOccurrenceId(ic.itemId, ic.periodDate) === id
              );
              return !!matchingIncomeCompletion;
            });
            console.log('Dashboard: Income occurrence IDs in refreshed completed set:', incomeOccurrenceIds);
            console.log('Dashboard: All income completion details:', incomeCompletions.map(ic => ({
              itemName: ic.itemName,
              periodDate: ic.periodDate.toISOString().split('T')[0],
              occurrenceId: generateOccurrenceId(ic.itemId, ic.periodDate)
            })));
            
            if (debtCompletions.length > 0) {
              console.log('🟦🟦🟦 DEBT COMPLETION RECORDS AFTER REFRESH 🟦🟦🟦');
              console.log('🟦 Count:', debtCompletions.length);
              debtCompletions.forEach(p => {
                console.log(`🟦 ${p.itemName} - Date: ${p.periodDate.toISOString().split('T')[0]} - ID: ${generateOccurrenceId(p.itemId, p.periodDate)} - TxnID: ${p.transactionId}`);
              });
              console.log('🟦🟦🟦 END DEBT COMPLETIONS 🟦🟦🟦');
            } else {
              console.log('❌ No debt completion records found after refresh');
            }
            setCompletedItems(completedSet);
          }
        } catch (refreshError) {
          console.warn('Failed to refresh completion data after deletion:', refreshError);
        }
        
        // Recalculate monthly spending
        const updatedTransactions = transactions.filter(t => t.id !== transactionId);
        const newSpending = updatedTransactions
          .filter((tx: Transaction) => tx.detailedType === 'variable-expense' || tx.detailedType === 'fixed-expense' || tx.detailedType === 'subscription')
          .reduce((sum: number, tx: Transaction) => sum + Math.abs(tx.amount), 0);
        setMonthlySpending(newSpending);
        
        // Refetch accounts to get updated balances
        try {
          const { getAccounts } = await import('@/lib/api/accounts');
          const { accounts: updatedAccounts, error: accountsError } = await getAccounts(user.id);
          
          if (!accountsError && updatedAccounts) {
            setAccounts(updatedAccounts);
            const newBalance = updatedAccounts.reduce((sum: number, account: Account) => sum + account.balance, 0);
            setTotalBalance(newBalance);
          }
        } catch (error) {
          console.error("Error refetching accounts:", error);
        }
        
        // Trigger account balance refresh in the sidebar
        triggerAccountRefresh();
        
        // If this was a goal contribution, update the goal's current amount and refetch goals
        if (transactionToDelete.detailedType === 'goal-contribution' && transactionToDelete.sourceId) {
          try {
            const { updateFinancialGoal, getFinancialGoals } = await import('@/lib/api/goals');
            
            const currentGoal = goals.find(g => g.id === transactionToDelete.sourceId);
            if (currentGoal) {
              // Subtract the deleted contribution amount from the goal
              const updatedAmount = Math.max(0, currentGoal.currentAmount - Math.abs(transactionToDelete.amount));
              await updateFinancialGoal(transactionToDelete.sourceId, {
                currentAmount: updatedAmount
              });
              
              // Refetch all goals to update the dashboard display
              const { goals: updatedGoals, error: goalsError } = await getFinancialGoals(user.id);
              if (!goalsError && updatedGoals) {
                setGoals(updatedGoals);
                const goalsConverted: FinancialGoalWithContribution[] = updatedGoals.map(goal => ({
                  ...goal,
                  monthlyContribution: 0,
                  monthsRemaining: 0
                }));
                setGoalsWithContributions(goalsConverted);
                setGoalRefreshTrigger(Date.now());
              }
            }
          } catch (error) {
            console.error("Error updating goal after deletion:", error);
          }
        }
        
        toast({
          title: "Transaction Deleted",
          description: `"${transactionToDelete.description}" has been deleted.`
        });
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the transaction.",
        variant: "destructive"
      });
    }
  };

  const handleSaveTransaction = async (
    data: Omit<Transaction, "id" | "userId" | "source" | "createdAt" | "updatedAt">
  ) => {
    if (!user?.id) return;
    
    console.log('Dashboard: handleSaveTransaction called with data:', data);

    let finalCategoryId = data.categoryId;

    // Handle predefined category mapping
    // For income transactions, always use "Income" category
    if (data.detailedType === 'income') {
      const incomeCategoryName = 'Income';
      let incomeCategory = categories.find(cat => cat.name === incomeCategoryName);
      
      if (incomeCategory) {
        finalCategoryId = incomeCategory.id;
      } else {
        // Create Income category
        try {
          const { createCategory } = await import('@/lib/api/categories');
          const result = await createCategory({
            name: incomeCategoryName,
            userId: user.id
          });
          
          if (result.category) {
            setCategories(prev => [...prev, result.category!]);
            finalCategoryId = result.category.id;
          } else {
            finalCategoryId = null;
          }
        } catch (error) {
          console.error('Failed to create Income category:', error);
          finalCategoryId = null;
        }
      }
    } else if (data.detailedType === 'goal-contribution') {
      // For goal contribution transactions, always use "Savings" category
      const savingsCategoryName = 'Savings';
      let savingsCategory = categories.find(cat => cat.name === savingsCategoryName);
      
      if (savingsCategory) {
        finalCategoryId = savingsCategory.id;
      } else {
        // Create Savings category
        try {
          const { createCategory } = await import('@/lib/api/categories');
          const result = await createCategory({
            name: savingsCategoryName,
            userId: user.id
          });
          
          if (result.category) {
            setCategories(prev => [...prev, result.category!]);
            finalCategoryId = result.category.id;
          } else {
            finalCategoryId = null;
          }
        } catch (error) {
          console.error('Failed to create Savings category:', error);
          finalCategoryId = null;
        }
      }
    } else if (data.detailedType === 'debt-payment') {
      // For debt payment transactions, always use "Debt" category
      const debtCategoryName = 'Debt';
      let debtCategory = categories.find(cat => cat.name === debtCategoryName);
      
      if (debtCategory) {
        finalCategoryId = debtCategory.id;
      } else {
        // Create Debt category
        try {
          const { createCategory } = await import('@/lib/api/categories');
          const result = await createCategory({
            name: debtCategoryName,
            userId: user.id
          });
          
          if (result.category) {
            setCategories(prev => [...prev, result.category!]);
            finalCategoryId = result.category.id;
          } else {
            finalCategoryId = null;
          }
        } catch (error) {
          console.error('Failed to create Debt category:', error);
          finalCategoryId = null;
        }
      }
    } else if (finalCategoryId && typeof finalCategoryId === 'string' && finalCategoryId.startsWith('PREDEFINED:')) {
      // Handle other predefined categories (for expenses)
      const predefinedValue = finalCategoryId.replace('PREDEFINED:', '');
      
      // Map predefined value to display label
      const categoryLabels: Record<string, string> = {
        'housing': 'Housing',
        'food': 'Food',
        'utilities': 'Utilities',
        'transportation': 'Transportation',
        'health': 'Health',
        'personal': 'Personal',
        'home-family': 'Home/Family',
        'media-productivity': 'Media/Productivity'
      };
      
      const categoryLabel = categoryLabels[predefinedValue] || predefinedValue;
      
      // Try to find existing category with this name
      let existingCategory = categories.find(cat => cat.name === categoryLabel);
      
      if (existingCategory) {
        finalCategoryId = existingCategory.id;
      } else {
        // Create new category
        try {
          const { createCategory } = await import('@/lib/api/categories');
          const result = await createCategory({
            name: categoryLabel,
            userId: user.id
          });
          
          if (result.category) {
            setCategories(prev => [...prev, result.category!]);
            finalCategoryId = result.category.id;
          } else {
            finalCategoryId = null;
          }
        } catch (error) {
          console.error('Failed to create category:', error);
          finalCategoryId = null;
        }
      }
    } else if (data.detailedType === 'variable-expense' && data.categoryId && !data.categoryId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // Handle predefined category IDs for variable expenses (non-UUID format)
      const predefinedValue = data.categoryId;
      
      const categoryLabels: Record<string, string> = {
        'housing': 'Housing',
        'food': 'Food',
        'utilities': 'Utilities',
        'transportation': 'Transportation',
        'health': 'Health',
        'personal': 'Personal',
        'home-family': 'Home/Family',
        'media-productivity': 'Media/Productivity'
      };
      
      const categoryLabel = categoryLabels[predefinedValue] || predefinedValue;
      
      // Try to find existing category with this name
      let existingCategory = categories.find(cat => cat.name === categoryLabel);
      
      if (existingCategory) {
        finalCategoryId = existingCategory.id;
      } else {
        // Create new category
        try {
          const { createCategory } = await import('@/lib/api/categories');
          const result = await createCategory({
            name: categoryLabel,
            userId: user.id
          });
          
          if (result.category) {
            setCategories(prev => [...prev, result.category!]);
            finalCategoryId = result.category.id;
          } else {
            finalCategoryId = null;
          }
        } catch (error) {
          console.error('Failed to create category:', error);
          finalCategoryId = null;
        }
      }
    }

    try {
      const transactionWithUserId = { 
        ...data, 
        userId: user.id,
        categoryId: finalCategoryId 
      };

      let result;
      
      if (transactionToEdit) {
        // Update existing transaction
        const { updateTransaction } = await import('@/lib/api/transactions');
        result = await updateTransaction(transactionToEdit.id, transactionWithUserId);
      } else {
        // Create new transaction
        const { createTransaction } = await import('@/lib/api/transactions');
        result = await createTransaction(transactionWithUserId);
      }
      
      if (result.error) {
        toast({
          title: "Error",
          description: `Failed to ${transactionToEdit ? 'update' : 'create'} transaction: ${result.error}`,
          variant: "destructive"
        });
        return;
      }

      if (result.transaction) {
        if (transactionToEdit) {
          // Update the transaction in the list
          setTransactions(prev => prev.map(t => 
            t.id === transactionToEdit.id ? result.transaction! : t
          ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } else {
          // Add the new transaction to the list
          setTransactions(prev => [result.transaction!, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
        
        // Recalculate totals
        const updatedTransactions = transactionToEdit 
          ? transactions.map(t => t.id === transactionToEdit.id ? result.transaction! : t)
          : [...transactions, result.transaction];
          
        const newSpending = updatedTransactions
          .filter((tx: Transaction) => tx.detailedType === 'variable-expense' || tx.detailedType === 'fixed-expense' || tx.detailedType === 'subscription')
          .reduce((sum: number, tx: Transaction) => sum + Math.abs(tx.amount), 0);
        setMonthlySpending(newSpending);
        
        // Refetch accounts to get updated balances for total balance calculation
        try {
          const { getAccounts } = await import('@/lib/api/accounts');
          const { accounts: updatedAccounts, error: accountsError } = await getAccounts(user.id);
          
          if (!accountsError && updatedAccounts) {
            setAccounts(updatedAccounts);
            // Recalculate total balance with updated account data
            const newBalance = updatedAccounts.reduce((sum: number, account: Account) => sum + account.balance, 0);
            setTotalBalance(newBalance);
          }
        } catch (error) {
          console.error("Error refetching accounts:", error);
          // Continue without showing error to user since transaction was successful
        }
        
        // Trigger account balance refresh in the sidebar
        triggerAccountRefresh();
        
        // If this is a goal contribution, update the goal's current amount and refetch goals
        if (result.transaction.detailedType === 'goal-contribution' && result.transaction.sourceId) {
          try {
            const { updateFinancialGoal, getFinancialGoals } = await import('@/lib/api/goals');
            
            // Get the current goal to update its amount
            const currentGoal = goals.find(g => g.id === result.transaction!.sourceId);
            if (currentGoal) {
              let updatedAmount;
              
              if (transactionToEdit) {
                // For updates, we need to calculate the difference
                const oldContribution = Math.abs(transactionToEdit.amount);
                const newContribution = Math.abs(result.transaction!.amount);
                const difference = newContribution - oldContribution;
                updatedAmount = currentGoal.currentAmount + difference;
              } else {
                // For new transactions, simply add the amount
                updatedAmount = currentGoal.currentAmount + Math.abs(result.transaction!.amount);
              }
              
              await updateFinancialGoal(result.transaction!.sourceId, {
                currentAmount: Math.max(0, updatedAmount)
              });
              
              // Refetch all goals to update the dashboard display
              const { goals: updatedGoals, error: goalsError } = await getFinancialGoals(user.id);
              if (!goalsError && updatedGoals) {
                setGoals(updatedGoals);
                // Update goalsWithContributions for the transaction dialog
                const goalsConverted: FinancialGoalWithContribution[] = updatedGoals.map(goal => ({
                  ...goal,
                  monthlyContribution: 0, // Will be recalculated by the component
                  monthsRemaining: 0 // Will be recalculated by the component
                }));
                setGoalsWithContributions(goalsConverted);
                
                // Trigger refresh for SavingsGoalsCard
                setGoalRefreshTrigger(Date.now());
              }
            }
          } catch (error) {
            console.error("Error updating goal contribution:", error);
            // Continue without showing error to user since transaction and account updates were successful
          }
        }

        // Refresh completion data if this was a recurring transaction
        if (result.transaction.sourceId && 
            (result.transaction.detailedType === 'income' || 
             result.transaction.detailedType === 'fixed-expense' || 
             result.transaction.detailedType === 'subscription' || 
             result.transaction.detailedType === 'debt-payment')) {
          
          const transactionData = data as any;
          if (transactionData.recurringPeriodId) {
            try {
              const parts = transactionData.recurringPeriodId.split('-');
              const periodDateStr = parts.slice(-3).join('-');
              const [year, month, day] = periodDateStr.split('-').map(Number);
              const periodDate = startOfDay(new Date(year, month - 1, day));

              // Optimistically update the completed items set
              const completionKey = generateOccurrenceId(result.transaction.sourceId, periodDate);
              setCompletedItems(prev => new Set(prev).add(completionKey));
              
              // Mark the period as complete on the backend
              const { markPeriodComplete } = await import('@/lib/api/recurring-completions');
              await markPeriodComplete({
                recurringItemId: result.transaction.detailedType === 'debt-payment' ? undefined : result.transaction.sourceId,
                debtAccountId: result.transaction.detailedType === 'debt-payment' ? result.transaction.sourceId : undefined,
                periodDate: periodDate,
                completedDate: startOfDay(new Date(result.transaction.date)),
                transactionId: result.transaction.id,
                userId: user.id,
              });
              console.log('Dashboard: Successfully marked period as complete on backend');

            } catch (completionError) {
              console.warn('Dashboard: Failed to mark period as complete:', completionError);
            }
          }
        }
        
        toast({ 
          title: transactionToEdit ? "Transaction Updated" : "Transaction Added", 
          description: `"${result.transaction.description}" has been ${transactionToEdit ? 'updated' : 'added'}.` 
        });
        
        // Return the saved transaction so the dialog can use it for completion tracking
        return result.transaction;
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving the transaction.",
        variant: "destructive"
      });
    }

    setIsTransactionModalOpen(false);
    setTransactionToEdit(null);
  };

  useEffect(() => {
    async function fetchPayPeriodSummary() {
      if (!user?.id || !userPreferences) return;
      // Fetch all needed data for breakdown
      const { sinkingFunds: sf } = await getSinkingFunds(user.id);
      setSinkingFunds(sf || []);
      // Use allocation mode and plan from preferences
      const prefs = userPreferences.paycheckPreferences as PaycheckPreferences;
      console.log("[Dashboard] User Preferences:", userPreferences);
      console.log("[Dashboard] Paycheck Preferences:", prefs);
      console.log("[Dashboard] Manual Plan Date Ranges:", prefs.manualPlanDateRanges);
      console.log("[Dashboard] Active Manual Plan:", prefs.activeManualPlan);
      
      let periods;
      if (
        prefs.allocationMode === 'manual' &&
        prefs.activeManualPlan &&
        prefs.manualPlanDateRanges &&
        prefs.manualPlanDateRanges[prefs.activeManualPlan]
      ) {
        // Use the stored manual plan date range
        const { start, end } = prefs.manualPlanDateRanges[prefs.activeManualPlan]!;
        // Extract the date parts and create local dates to avoid timezone conversion
        const startDateStr = start.split('T')[0];
        const endDateStr = end.split('T')[0];
        const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
        const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
        const startDate = new Date(startYear, startMonth - 1, startDay); // Month is 0-indexed
        const endDate = new Date(endYear, endMonth - 1, endDay); // Month is 0-indexed
        
        // Sum all recurring income items that have a startDate within the manual plan's date range
        const incomeItemsInRange = recurringItems.filter(item => {
          if (item.type !== 'income') return false;
          if (!item.startDate) return false;
          const itemStartDate = new Date(item.startDate);
          return itemStartDate >= startDate && itemStartDate <= endDate;
        });
        const totalIncomeAmount = incomeItemsInRange.reduce((sum, item) => sum + item.amount, 0);
        const hasIncomeItems = incomeItemsInRange.length > 0;
        
        periods = [
          {
            id: `${prefs.activeManualPlan}-custom-period`,
            paycheckDate: startDate,
            paycheckAmount: totalIncomeAmount,
            periodStart: startDate,
            periodEnd: endDate,
            paycheckSource: hasIncomeItems ? ("recurring" as const) : ("estimated" as const),
            planKey: prefs.activeManualPlan,
          },
        ];
        console.log("[Dashboard] Using MANUAL mode custom period:", periods);
      } else {
        // Use the same logic as Paycheck Pulse for periods
        periods = generatePaycheckPeriods(recurringItems, userPreferences.financialTrackingStartDate);
        console.log("[Dashboard] Using AUTO/DEFAULT periods:", periods);
      }
      // For manual mode, we need to respect the user's manual allocations
      // instead of running automatic allocation algorithms
      let breakdowns;
      if (
        prefs.allocationMode === 'manual' &&
        prefs.activeManualPlan &&
        prefs.manualPlanDateRanges &&
        prefs.manualPlanDateRanges[prefs.activeManualPlan]
      ) {
        // Fetch actual allocations from paycheckoverrides table
        const period = periods[0];
        let totalFixed = 0;
        let totalVariable = 0;
        let totalSubscriptions = 0;
        let totalDebt = 0;
        let totalSavings = 0;
        
        try {
          // Query paycheckoverrides for the active plan
          const { data: overrides, error } = await supabase
            .from('paycheckoverrides')
            .select('type, amount')
            .eq('user_id', user.id)
            .like('paycheck_id', `%-${prefs.activeManualPlan}`);
          
          if (error) {
            console.error('[Dashboard] Error fetching paycheck overrides:', error);
          } else if (overrides && overrides.length > 0) {
            // Sum amounts by type
            overrides.forEach(override => {
              const amount = Number(override.amount) || 0;
              switch (override.type) {
                case 'fixed':
                  totalFixed += amount;
                  break;
                case 'variable':
                  totalVariable += amount;
                  break;
                case 'subscription':
                  totalSubscriptions += amount;
                  break;
                case 'debt':
                  totalDebt += amount;
                  break;
                case 'goal':
                  totalSavings += amount;
                  break;
              }
            });
            console.log('[Dashboard] Fetched manual overrides:', {
              fixed: totalFixed,
              variable: totalVariable,
              subscription: totalSubscriptions,
              debt: totalDebt,
              savings: totalSavings
            });
          }
        } catch (error) {
          console.error('[Dashboard] Error querying paycheckoverrides:', error);
        }
        
        const totalAllocated = totalFixed + totalVariable + totalSubscriptions + totalDebt + totalSavings;
        const unallocatedAmount = period.paycheckAmount - totalAllocated;
         
        breakdowns = [{
          period,
          obligatedExpenses: [],
          totalObligated: totalFixed + totalSubscriptions + totalDebt,
          remainingAfterObligated: period.paycheckAmount - (totalFixed + totalSubscriptions + totalDebt),
          allocation: {
            variableExpenses: [],
            savingsGoals: [],
            sinkingFunds: [],
            carryover: { amount: 0, reason: 'Manual allocation' }
          },
          totalAllocated: totalVariable + totalSavings,
          // Show variable expenses allocation as "Available to Spend"
          finalRemaining: totalVariable,
          isDeficit: unallocatedAmount < 0,
          deficitAmount: unallocatedAmount < 0 ? Math.abs(unallocatedAmount) : undefined
        } as PaycheckBreakdown];
        
        console.log("[Dashboard] Using MANUAL mode with fetched overrides:", breakdowns);
      } else {
        // Use automatic calculation for auto mode
        breakdowns = generatePaycheckBreakdownWithSinkingFunds(
          periods,
          recurringItems,
          debtAccounts,
          variableExpenses,
          goals,
          sf || [],
          prefs,
        );
      }
      console.log("[Dashboard] Generated breakdowns:", breakdowns);
      console.log("[Dashboard] Breakdown count:", breakdowns.length);
      breakdowns.forEach((bd, index) => {
        console.log(`[Dashboard] Breakdown ${index}:`, {
          planKey: bd.period?.planKey,
          periodStart: bd.period?.periodStart,
          periodEnd: bd.period?.periodEnd,
          paycheckAmount: bd.period?.paycheckAmount
        });
      });
      
            // Find the current period based on active allocation mode
      let current: PaycheckBreakdown | null = null;
      if (
        prefs.allocationMode === 'manual' &&
        prefs.activeManualPlan &&
        prefs.manualPlanDateRanges &&
        prefs.manualPlanDateRanges[prefs.activeManualPlan]
      ) {
        // For manual mode, find the breakdown matching the active plan
        console.log("[Dashboard] Looking for manual breakdown with planKey:", prefs.activeManualPlan);
        
        current = breakdowns.find(bd => bd.period?.planKey === prefs.activeManualPlan) || null;
        console.log("[Dashboard] Selected current MANUAL breakdown:", current);
      } else {
        // For auto mode, find breakdown that covers today's date
        const today = new Date();
        console.log("[Dashboard] Looking for auto breakdown covering today:", today.toISOString());
        
        const currentPeriodBreakdowns = breakdowns.filter(bd => {
          const periodStart = new Date(bd.period.periodStart);
          const periodEnd = new Date(bd.period.periodEnd);
          return today >= periodStart && today <= periodEnd;
        });
        
        if (currentPeriodBreakdowns.length > 0) {
          current = currentPeriodBreakdowns[0];
        }
        console.log("[Dashboard] Selected current AUTO breakdown:", current);
      }
      
      console.log("[Dashboard] Final selected breakdown:", current);
      if (current) {
        console.log("[Dashboard] Breakdown details:");
        console.log("  - Period:", current.period);
        console.log("  - Paycheck Amount:", current.period.paycheckAmount);
        console.log("  - Total Obligated:", current.totalObligated);
        console.log("  - Remaining After Obligated:", current.remainingAfterObligated);
        console.log("  - Total Allocated:", current.totalAllocated);
        console.log("  - Final Remaining (Available to Spend):", current.finalRemaining);
        console.log("  - Allocation:", current.allocation);
        
        // For auto mode, adjust finalRemaining to show variable expenses allocation
        if (prefs.allocationMode === 'auto' || !prefs.allocationMode) {
          const variableExpensesTotal = current.allocation.variableExpenses.reduce((sum, expense) => sum + expense.suggestedAmount, 0);
          console.log("[Dashboard] Auto mode: Variable expenses total:", variableExpensesTotal);
          // Create a modified breakdown with variable expenses total as "Available to Spend"
          current = {
            ...current,
            finalRemaining: variableExpensesTotal
          };
          console.log("[Dashboard] Auto mode: Updated finalRemaining to variable expenses total:", variableExpensesTotal);
        }
      }
      console.log("[Dashboard] Setting payPeriodBreakdown to:", current || null);
      setPayPeriodBreakdown(current || null);
    }
    fetchPayPeriodSummary();
  }, [user, userPreferences, recurringItems, debtAccounts, variableExpenses, goals]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading your financial data...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error loading dashboard: {error}</p>
        <p>Please refresh the page or contact support if the issue persists.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isMobile ? 'max-w-[100vw] overflow-x-hidden' : ''}`}>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {getPersonalizedGreeting(user?.name, userPreferences?.timezone)}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your financial overview and recent activity
        </p>
      </div>
      
      {/* Setup Guide */}
      <SetupGuide />
      
      {/* AI Insights */}
      <DashboardAIInsightsCard isMobile={isMobile} />
      
      {/* Past Due Items - shown prominently if there are any */}
      <PastDueItemsCard 
        items={allItems}
        completedItems={completedItems}
        userPreferences={userPreferences}
        onItemClick={handleCalendarItemClick}
        isMobile={isMobile}
      />
      
      {/* First row: Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? 'pb-3' : 'pb-2'}`}>
            <CardTitle className={`${isMobile ? 'text-base' : 'text-sm'} font-medium`}>Total Balance</CardTitle>
            <DollarSign className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-muted-foreground`} />
          </CardHeader>
          <CardContent>
            <div className={`${isMobile ? 'text-3xl' : 'text-2xl'} font-bold`}>{formatCurrency(totalBalance)}</div>
            <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground mt-1`}>
              {accounts.length > 0 
                ? `Across ${accounts.length} account${accounts.length > 1 ? 's' : ''}`
                : 'No accounts found'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? 'pb-3' : 'pb-2'}`}>
            <CardTitle className={`${isMobile ? 'text-base' : 'text-sm'} font-medium`}>Monthly Spending</CardTitle>
            {!isMobile && (
              <select className="text-xs border rounded p-1">
                <option>This Month</option>
              </select>
            )}
          </CardHeader>
          <CardContent>
            <div className={`${isMobile ? 'text-3xl' : 'text-2xl'} font-bold`}>{formatCurrency(monthlySpending)}</div>
            <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground mt-1`}>
              {(() => {
                const expenseTransactionCount = transactions.filter(tx => 
                  tx.detailedType === 'variable-expense' || tx.detailedType === 'fixed-expense' || tx.detailedType === 'subscription'
                ).length;
                return expenseTransactionCount > 0 
                  ? `From ${expenseTransactionCount} expense transaction${expenseTransactionCount > 1 ? 's' : ''}`
                  : 'No expense transactions this month';
              })()}
            </p>
            {topCategories.length > 0 && (
              <div className={`${isMobile ? 'mt-3 space-y-2' : 'mt-4 space-y-2'}`}>
                {topCategories.slice(0, isMobile ? 2 : 3).map((category, index) => (
                  <div key={category.name} className="flex items-center">
                    <div className={`${isMobile ? 'w-3 h-3' : 'w-2 h-2'} rounded-full mr-2 ${
                      index === 0 ? 'bg-blue-500' : 
                      index === 1 ? 'bg-red-500' : 
                      'bg-green-500'
                    }`}></div>
                    <span className={`${isMobile ? 'text-sm' : 'text-sm'}`}>{category.name}</span>
                    <span className={`ml-auto ${isMobile ? 'text-sm' : 'text-sm'} font-semibold`}>{formatCurrency(category.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <SavingsGoalsCard refreshTrigger={goalRefreshTrigger} isMobile={isMobile} />
      </div>
      {/* Second row: Chart and Upcoming Expenses */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-5'}`}>
        {/* Chart section - takes up 3 columns on desktop, full width on mobile */}
        <div className={`${isMobile ? 'order-2' : 'lg:col-span-3'}`}>
          <ExpenseChart isMobile={isMobile} />
        </div>
        {/* Right column: Calendar Access + Upcoming Expenses - takes up 2 columns on desktop, full width on mobile */}
        <div className={`${isMobile ? 'order-1 flex flex-col gap-3' : 'lg:col-span-2 flex flex-col gap-3 h-full'}`}>
          <CalendarAccessCard onViewCalendar={handleViewCalendar} isMobile={isMobile} />
          <div className="flex flex-col gap-3 flex-1">
            <PayPeriodSummary breakdown={payPeriodBreakdown} preferences={userPreferences?.paycheckPreferences} isMobile={isMobile} />
            <div className="flex-1">
              <UpcomingExpensesCard 
                items={upcomingItems} 
                completedItems={completedItems} 
                userPreferences={userPreferences}
                isMobile={isMobile}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Debt Spending Card and Variable Expense Analysis - above Recent Transactions */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        {/* Debt Spending Card */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? 'pb-3' : 'pb-2'}`}>
            <CardTitle className={`${isMobile ? 'text-base' : 'text-sm'} font-medium flex items-center`}>
              <CreditCard className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} mr-2 text-red-500`} />
              Credit Spending
            </CardTitle>
            <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground`}>This Month</div>
          </CardHeader>
          <CardContent>
            {(() => {
              // Filter debt transactions to current month only
              const now = new Date();
              const startOfCurrentMonth = startOfMonth(now);
              const endOfCurrentMonth = endOfMonth(now);
              
              const debtTxs = transactions.filter(tx => {
                const txDate = new Date(tx.date);
                return !!tx.debtAccountId && 
                       tx.type === 'expense' &&
                       txDate >= startOfCurrentMonth && 
                       txDate <= endOfCurrentMonth;
              });
              const totalDebtSpending = debtTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
              const categoryMap: Record<string, number> = {};
              debtTxs.forEach(tx => {
                let categoryName = 'Uncategorized';
                if (tx.categoryId) {
                  const category = categories.find(cat => cat.id === tx.categoryId);
                  if (category) {
                    categoryName = category.name;
                  }
                }
                if (!categoryMap[categoryName]) categoryMap[categoryName] = 0;
                categoryMap[categoryName] += Math.abs(tx.amount);
              });
              const breakdown = Object.entries(categoryMap)
                .map(([name, amount]) => ({ name, amount }))
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 3);
              const warningLevel = totalDebtSpending > 500 ? 'high' : totalDebtSpending > 200 ? 'medium' : 'low';
              const warningColors = {
                high: 'text-red-700',
                medium: 'text-red-600', 
                low: 'text-red-500'
              };
              return (
                <div>
                  <div className={`text-lg font-bold ${warningColors[warningLevel]}`}>{formatCurrency(totalDebtSpending)}</div>
                  <div className="mt-2 space-y-1">
                    {breakdown.map((cat, idx) => (
                      <div key={cat.name} className="flex items-center">
                        <span className="text-sm">{cat.name}</span>
                        <span className="ml-auto text-sm font-semibold">{formatCurrency(cat.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
        {/* Budget Tracker Card */}
        <BudgetTrackerCard 
          variableExpenses={variableExpenses}
          transactions={transactions}
          isMobile={isMobile}
        />
      </div>
      {/* Third row: Recent Transactions */}
      <div className={`grid gap-4 ${isMobile ? 'w-full max-w-full' : ''}`}>
        <RecentTransactionsCard 
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          debtAccounts={debtAccounts}
          limit={isMobile ? 5 : 10}
          onAddTransaction={handleAddTransaction}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          isMobile={isMobile}
        />
      </div>

      <AddEditTransactionDialog
        isOpen={isTransactionModalOpen}
        onOpenChange={(open) => {
          setIsTransactionModalOpen(open);
          if (!open) {
            setTransactionToEdit(null);
          }
        }}
        onSave={handleSaveTransaction}
        categories={categories}
        accounts={accounts}
        recurringItems={recurringItems}
        debtAccounts={debtAccounts}
        goals={goalsWithContributions}
        variableExpenses={variableExpenses}
        transactionToEdit={transactionToEdit}
      />

      <RecurringCalendarOverlay
        isOpen={isCalendarOverlayOpen}
        onClose={() => setIsCalendarOverlayOpen(false)}
        items={allItems}
        onItemClick={handleCalendarItemClick}
        completedItems={completedItems}
      />

      <RecordRecurringTransactionDialog
        isOpen={isRecordTransactionOpen}
        onOpenChange={setIsRecordTransactionOpen}
        recurringItem={selectedRecurringItem}
        selectedDate={selectedDate}
        accounts={accounts}
        debtAccounts={debtAccounts}
        categories={categories}
        onSave={handleRecordTransaction}
      />
    </div>
  );
}