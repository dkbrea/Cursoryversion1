"use client";

import { useEffect, useState } from "react";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CreditCard, Users, TrendingUp } from "lucide-react";
import { RecurringList } from "@/components/recurring/recurring-list";
import type { UnifiedRecurringListItem, RecurringItem, Account, Transaction, DebtAccount, Category, FinancialGoal, FinancialGoalWithContribution, VariableExpense } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { getAccounts } from "@/lib/api/accounts";
import { getTransactions } from "@/lib/api/transactions";
import { getRecurringItems } from "@/lib/api/recurring";
import { getDebtAccounts } from "@/lib/api/debts";
import { getCategories } from "@/lib/api/categories";
import { getFinancialGoals } from "@/lib/api/goals";
import { getVariableExpenses } from "@/lib/api/variable-expenses";
import { createTransaction } from "@/lib/api/transactions";
import { formatCurrency } from "@/lib/utils";
import { SetupGuide } from "@/components/dashboard/setup-guide";
import { SavingsGoalsCard } from "@/components/dashboard/savings-goals-card";
import { UpcomingExpensesCard } from "@/components/dashboard/upcoming-expenses-card";
import { RecentTransactionsCard } from "@/components/dashboard/recent-transactions-card";
import { CalendarAccessCard } from "@/components/dashboard/calendar-access-card";
import { RecurringCalendarOverlay } from "@/components/dashboard/recurring-calendar-overlay";
import { AddEditTransactionDialog } from "@/components/transactions/add-edit-transaction-dialog";
import { RecordRecurringTransactionDialog } from "@/components/recurring/record-recurring-transaction-dialog";
import { DashboardAIInsightsCard } from "@/components/dashboard/ai-insights-card";
import { startOfDay, endOfDay, addDays, isSameDay, format, addWeeks, addMonths, subMonths, startOfMonth, getDate, endOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { calculateNextRecurringItemOccurrence, calculateNextDebtOccurrence } from "@/lib/utils/date-calculations";
import { getUserPreferences, type UserPreferences } from "@/lib/api/user-preferences";
import { getPersonalizedGreeting } from "@/lib/utils/time-greeting";

export function DashboardContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<UnifiedRecurringListItem[]>([]);
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

        // Sort by date and filter out ended items
        const activeItems = allUpcomingItems
          .filter(item => item.status !== 'Ended')
          .sort((a, b) => a.nextOccurrenceDate.getTime() - b.nextOccurrenceDate.getTime());
        
        setUpcomingItems(activeItems);
        
        setRecurringItems(recurringData);
        setDebtAccounts(debtData);
        setGoals(goalsData);
        setVariableExpenses(variableExpensesData);

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
    
    // Filter transactions for expense categories and group by category
    transactions.forEach(tx => {
      // Only include transactions that are variable expenses, fixed expenses, or subscriptions
      if (tx.detailedType === 'variable-expense' || tx.detailedType === 'fixed-expense' || tx.detailedType === 'subscription') {
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
    setSelectedRecurringItem(item);
    setSelectedDate(date);
    setIsRecordTransactionOpen(true);
  };

  const handleRecordTransaction = async (transactionData: Omit<Transaction, "id" | "userId" | "source" | "createdAt" | "updatedAt">) => {
    if (!user?.id || !selectedRecurringItem) return;

    try {
      const { transaction: newTransaction, error } = await createTransaction({
        ...transactionData,
        userId: user.id,
      });

      if (error || !newTransaction) {
        throw new Error(error || "Failed to create transaction");
      }

      // Add to transactions list
      setTransactions(prev => [newTransaction, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      
      // Mark item as completed
      const completionKey = `${selectedRecurringItem.id}-${format(selectedDate, 'yyyy-MM-dd')}`;
      setCompletedItems(prev => new Set([...prev, completionKey]));

      setIsRecordTransactionOpen(false);
      setSelectedRecurringItem(null);
    } catch (error) {
      console.error("Error recording transaction:", error);
      throw error; // Let the dialog handle the error display
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!user?.id) return;
    
    // Find the transaction being deleted
    const transactionToDelete = transactions.find(t => t.id === transactionId);
    if (!transactionToDelete) return;

    try {
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
        
        toast({ 
          title: transactionToEdit ? "Transaction Updated" : "Transaction Added", 
          description: `"${result.transaction.description}" has been ${transactionToEdit ? 'updated' : 'added'}.` 
        });
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
    <div className="space-y-6">
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
      <DashboardAIInsightsCard />
      
      {/* First row: Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-muted-foreground">
              {accounts.length > 0 
                ? `Across ${accounts.length} account${accounts.length > 1 ? 's' : ''}`
                : 'No accounts found'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spending</CardTitle>
            <select className="text-xs border rounded p-1">
              <option>This Month</option>
              <option>Last Month</option>
            </select>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlySpending)}</div>
            <p className="text-xs text-muted-foreground">
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
              <div className="mt-4 space-y-2">
                {topCategories.map((category, index) => (
                  <div key={category.name} className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      index === 0 ? 'bg-blue-500' : 
                      index === 1 ? 'bg-red-500' : 
                      'bg-green-500'
                    }`}></div>
                    <span className="text-sm">{category.name}</span>
                    <span className="ml-auto text-sm font-semibold">{formatCurrency(category.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <SavingsGoalsCard refreshTrigger={goalRefreshTrigger} />
      </div>

      {/* Second row: Chart and Upcoming Expenses */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chart section - takes up 2 columns */}
        <div className="lg:col-span-2">
          <ExpenseChart />
        </div>
        
        {/* Right column: Calendar Access + Upcoming Expenses - takes up 1 column */}
        <div className="flex flex-col gap-3 h-full min-h-[500px]">
          <CalendarAccessCard onViewCalendar={handleViewCalendar} />
          <UpcomingExpensesCard items={upcomingItems} />
        </div>
      </div>

      {/* Debt Spending Card and Variable Expense Analysis - above Recent Transactions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Debt Spending Card */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CreditCard className="h-4 w-4 mr-2 text-red-500" />
              Credit Spending
            </CardTitle>
            <div className="text-xs text-muted-foreground">This Month</div>
          </CardHeader>
          <CardContent>
            {(() => {
              const debtTxs = transactions.filter(tx => !!tx.debtAccountId && tx.type === 'expense');
              const totalDebtSpending = debtTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
              const categoryMap: Record<string, number> = {};
              debtTxs.forEach(tx => {
                let categoryName = 'Uncategorized';
                if (tx.categoryId) {
                  const category = categories.find(cat => cat.id === tx.categoryId);
                  if (category) {
                    categoryName = category.name;
                  } else {
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
                    categoryName = categoryLabels[tx.categoryId] || tx.categoryId;
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
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <div className={`text-2xl font-bold ${warningColors[warningLevel]}`}>
                      {formatCurrency(totalDebtSpending)}
                    </div>
                    {totalDebtSpending > 0 && (
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        warningLevel === 'high' ? 'bg-red-100 text-red-700' :
                        warningLevel === 'medium' ? 'bg-red-100 text-red-600' :
                        'bg-red-50 text-red-500'
                      }`}>
                        {warningLevel === 'high' ? '⚠️ High Usage' : 
                         warningLevel === 'medium' ? '⚡ Moderate' : '✓ Low Usage'}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Total charged to credit cards & lines of credit
                  </p>
                  
                  {breakdown.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                        Top Categories
                      </div>
                      {breakdown.map((cat, idx) => {
                        const percentage = totalDebtSpending > 0 ? (cat.amount / totalDebtSpending) * 100 : 0;
                        return (
                          <div key={cat.name} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-slate-700">{cat.name}</span>
                              <span className="text-red-600">{formatCurrency(cat.amount)}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  idx === 0 ? 'bg-red-500' : 
                                  idx === 1 ? 'bg-red-400' : 
                                  'bg-red-300'
                                }`}
                                style={{ width: `${Math.max(percentage, 5)}%` }}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground text-right">
                              {percentage.toFixed(1)}% of total
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8 text-center">
                      <div className="space-y-2">
                        <div className="text-green-600">✓</div>
                        <div className="text-xs text-muted-foreground">No credit spending this month</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Variable Expense Analysis Card */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-orange-500" />
              Budget Tracker
            </CardTitle>
            <div className="text-xs text-muted-foreground">This Month</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // Calculate spending for each variable expense
                const expenseAnalysis = variableExpenses.map((expense) => {
                  // Find transactions linked to this specific variable expense by sourceId
                  const spent = transactions
                    .filter(tx => tx.detailedType === 'variable-expense' && tx.sourceId === expense.id)
                    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
                  
                  const percentage = expense.amount > 0 ? Math.min((spent / expense.amount) * 100, 150) : 0;
                  
                  let status = '';
                  let statusColor = '';
                  let bgColor = '';
                  let progressColor = '';
                  
                  if (spent > expense.amount) {
                    // Overspending - Red
                    status = 'Overspent';
                    statusColor = 'text-red-700';
                    bgColor = 'bg-red-50';
                    progressColor = 'bg-red-500';
                  } else {
                    // At or under budget - Green
                    if (spent === 0) {
                      status = 'Unspent';
                    } else if (spent === expense.amount) {
                      status = 'Budget Met';
                    } else {
                      status = 'Under Budget';
                    }
                    statusColor = 'text-green-700';
                    bgColor = 'bg-green-50';
                    progressColor = 'bg-green-500';
                  }
                  
                  return {
                    ...expense,
                    spent,
                    percentage,
                    status,
                    statusColor,
                    bgColor,
                    progressColor,
                    hasTransactions: spent > 0
                  };
                });
                
                // Sort: overspent first, then by percentage spent (desc), then by amount (desc)
                const sortedExpenses = expenseAnalysis.sort((a, b) => {
                  if (a.spent > a.amount && b.spent <= b.amount) return -1;
                  if (a.spent <= a.amount && b.spent > b.amount) return 1;
                  if (a.hasTransactions && !b.hasTransactions) return -1;
                  if (!a.hasTransactions && b.hasTransactions) return 1;
                  if (a.hasTransactions && b.hasTransactions) return b.percentage - a.percentage;
                  return b.amount - a.amount;
                });
                
                const totalBudgeted = variableExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                const totalSpent = expenseAnalysis.reduce((sum, exp) => sum + exp.spent, 0);
                const overallPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
                
                return (
                  <div className="space-y-4">
                    {/* Overall Summary */}
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-orange-700">Overall Progress</span>
                        <span className="text-sm font-semibold text-orange-800">
                          {formatCurrency(totalSpent)} / {formatCurrency(totalBudgeted)}
                        </span>
                      </div>
                      <div className="w-full bg-orange-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full transition-all duration-500 ${
                            overallPercentage > 100 ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{overallPercentage.toFixed(1)}% used</span>
                        <span className="text-orange-600">{formatCurrency(totalBudgeted - totalSpent)} remaining</span>
                      </div>
                    </div>

                    {/* Individual Categories */}
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {sortedExpenses.length > 0 ? sortedExpenses.map((expense) => (
                        <div key={expense.id} className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${expense.bgColor}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-slate-800 text-sm truncate max-w-[120px]" title={expense.name}>
                                {expense.name}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${expense.statusColor} ${
                                expense.spent > expense.amount ? 'bg-red-100' : 'bg-green-100'
                              }`}>
                                {expense.status}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-orange-600">
                                {formatCurrency(expense.spent)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                of {formatCurrency(expense.amount)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="w-full bg-white rounded-full h-2 shadow-inner">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${expense.progressColor}`}
                              style={{ width: `${Math.min(expense.percentage, 100)}%` }}
                            />
                          </div>
                          
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{expense.percentage.toFixed(1)}%</span>
                            <span className="text-orange-600">{formatCurrency(Math.max(0, expense.amount - expense.spent))} left</span>
                          </div>
                        </div>
                      )) : (
                        <div className="flex items-center justify-center py-8 text-center">
                          <div className="space-y-2">
                            <div className="text-orange-500">📊</div>
                            <div className="text-xs text-muted-foreground">No variable expenses set up yet</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third row: Recent Transactions */}
      <div className="grid gap-4">
        <RecentTransactionsCard 
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          debtAccounts={debtAccounts}
          limit={10}
          onAddTransaction={handleAddTransaction}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={handleDeleteTransaction}
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
        items={upcomingItems}
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

