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
import { RecurringCalendarOverlay } from "@/components/dashboard/recurring-calendar-overlay";
import { CalendarAccessCard } from "@/components/dashboard/calendar-access-card";
import { AddEditTransactionDialog } from "@/components/transactions/add-edit-transaction-dialog";
import { calculateNextRecurringItemOccurrence, calculateNextDebtOccurrence } from "@/lib/utils/date-calculations";
import { startOfDay, isSameDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
  const [isCalendarOverlayOpen, setIsCalendarOverlayOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [goalRefreshTrigger, setGoalRefreshTrigger] = useState(0);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  useEffect(() => {
    console.log('Dashboard useEffect triggered, user:', user);
    setIsLoading(true);
    setError(null);

    async function fetchData() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch all data in parallel
        const [
          { accounts: accountsData, error: accountsError },
          { transactions: transactionsData, error: transactionsError },
          { items: recurringData, error: recurringError },
          { accounts: debtData, error: debtError },
          { categories: categoriesData, error: categoriesError },
          { goals: goalsData, error: goalsError },
          { expenses: variableExpensesData, error: variableExpensesError }
        ] = await Promise.all([
          getAccounts(user.id),
          getTransactions(user.id),
          getRecurringItems(user.id),
          getDebtAccounts(user.id),
          getCategories(user.id),
          getFinancialGoals(user.id),
          getVariableExpenses(user.id)
        ]);

        if (accountsError) {
          throw new Error(`Error fetching accounts: ${accountsError}`);
        }

        if (transactionsError) {
          throw new Error(`Error fetching transactions: ${transactionsError}`);
        }

        if (recurringError) {
          throw new Error(`Error fetching recurring items: ${recurringError}`);
        }

        if (debtError) {
          throw new Error(`Error fetching debt accounts: ${debtError}`);
        }

        if (categoriesError) {
          throw new Error(`Error fetching categories: ${categoriesError}`);
        }

        if (goalsError) {
          throw new Error(`Error fetching goals: ${goalsError}`);
        }

        if (variableExpensesError) {
          throw new Error(`Error fetching variable expenses: ${variableExpensesError}`);
        }
        
        setAccounts(accountsData || []);

        // Convert raw transaction dates to Date objects
        const processedTransactions = (transactionsData || []).map((tx: Transaction) => ({
          ...tx,
          date: new Date(tx.date)
        }));
        setTransactions(processedTransactions);
        setCategories(categoriesData || []);

        // Calculate total balance
        const balance = (accountsData || []).reduce((sum: number, account: Account) => sum + account.balance, 0);
        setTotalBalance(balance);

        // Calculate monthly spending (only variable expenses, fixed expenses, and subscriptions)
        const spending = (transactionsData || [])
          .filter((tx: Transaction) => tx.detailedType === 'variable-expense' || tx.detailedType === 'fixed-expense' || tx.detailedType === 'subscription')
          .reduce((sum: number, tx: Transaction) => sum + Math.abs(tx.amount), 0);
        setMonthlySpending(spending);

        const allUpcomingItems: UnifiedRecurringListItem[] = [];

        // Process recurring items (subscriptions and fixed expenses)
        if (recurringData) {
          const today = startOfDay(new Date());
          
          const recurringItems = recurringData.map((item: RecurringItem) => {
            // Use the shared calculation function
            const nextOccurrenceDate = calculateNextRecurringItemOccurrence(item);
            const itemEndDate = item.endDate ? startOfDay(new Date(item.endDate)) : null;
            let status: UnifiedRecurringListItem['status'] = "Upcoming";

            if (itemEndDate && itemEndDate < today && isSameDay(nextOccurrenceDate, itemEndDate)) {
               status = "Ended";
            } else if (isSameDay(nextOccurrenceDate, today)) {
              status = "Today";
            } else if (nextOccurrenceDate < today) {
              status = "Ended";
            }
            
            return {
              id: item.id,
              name: item.name,
              itemDisplayType: item.type, // This maps RecurringItemType to UnifiedListItemType
              amount: item.amount,
              frequency: item.frequency,
              nextOccurrenceDate,
              status,
              isDebt: false,
              endDate: item.endDate,
              semiMonthlyFirstPayDate: item.semiMonthlyFirstPayDate,
              semiMonthlySecondPayDate: item.semiMonthlySecondPayDate,
              notes: item.notes,
              source: 'recurring' as const,
              categoryId: item.categoryId
            };
          });

          allUpcomingItems.push(...recurringItems);
        }

        // Process debt accounts
        if (debtData) {
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

        setRecurringItems(recurringData || []);
        setDebtAccounts(debtData || []);
        setGoals(goalsData || []);
        setVariableExpenses(variableExpensesData || []);

        // Convert goals to FinancialGoalWithContribution format for the transaction dialog
        const goalsConverted: FinancialGoalWithContribution[] = (goalsData || []).map(goal => ({
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
  }, [user?.id]);

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
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
      
      {/* Setup Guide */}
      <SetupGuide />
      
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
          <CalendarAccessCard onViewCalendar={() => setIsCalendarOverlayOpen(true)} />
          <UpcomingExpensesCard items={upcomingItems} />
        </div>
      </div>

      {/* Debt Spending Card and Variable Expense Analysis - above Recent Transactions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Debt Spending Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spending on Credit</CardTitle>
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
              return (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(totalDebtSpending)}</div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Total spent using debt accounts (credit cards, lines of credit, etc.)
                  </p>
                  {breakdown.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {breakdown.map((cat, idx) => (
                        <div key={cat.name} className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-red-500' : 'bg-green-500'
                          }`}></div>
                          <span className="text-xs">{cat.name}</span>
                          <span className="ml-auto text-xs font-semibold">{formatCurrency(cat.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {debtTxs.length === 0 && (
                    <div className="text-xs text-muted-foreground">No spending on debt accounts yet.</div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
        {/* Variable Expense Analysis Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variable Expense Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                // Calculate spending for each variable expense
                const expenseAnalysis = variableExpenses.map((expense) => {
                  // Find transactions linked to this specific variable expense by sourceId
                  const spent = transactions
                    .filter(tx => tx.detailedType === 'variable-expense' && tx.sourceId === expense.id)
                    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
                  
                  let status = '';
                  let statusColor = '';
                  if (spent > expense.amount) {
                    status = 'Overspent';
                    statusColor = 'text-red-600';
                  } else if (spent < expense.amount && spent > 0) {
                    status = 'Underspent';
                    statusColor = 'text-green-600';
                  } else if (spent === expense.amount && spent > 0) {
                    status = 'On Track';
                    statusColor = 'text-yellow-600';
                  } else {
                    status = 'No Spending';
                    statusColor = 'text-gray-500';
                  }
                  
                  return {
                    ...expense,
                    spent,
                    status,
                    statusColor,
                    hasTransactions: spent > 0
                  };
                });
                
                // Sort: expenses with transactions first (by spent amount desc), then by budgeted amount desc
                const sortedExpenses = expenseAnalysis.sort((a, b) => {
                  if (a.hasTransactions && !b.hasTransactions) return -1;
                  if (!a.hasTransactions && b.hasTransactions) return 1;
                  if (a.hasTransactions && b.hasTransactions) return b.spent - a.spent;
                  return b.amount - a.amount;
                });
                
                return sortedExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center text-xs border-b last:border-b-0 py-1">
                    <span className="font-medium w-1/3 truncate" title={expense.name}>{expense.name}</span>
                    <span className="w-1/4 text-right">{formatCurrency(expense.amount)}</span>
                    <span className="w-1/4 text-right">{formatCurrency(expense.spent)}</span>
                    <span className={`w-1/4 text-right font-semibold ${expense.statusColor}`}>{expense.status}</span>
                  </div>
                ));
              })()}
              {variableExpenses.length === 0 && (
                <div className="text-xs text-muted-foreground">No variable expenses set.</div>
              )}
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">Budgeted / Spent / Status</div>
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

      <RecurringCalendarOverlay 
        isOpen={isCalendarOverlayOpen}
        onClose={() => setIsCalendarOverlayOpen(false)}
        items={upcomingItems}
      />

      <AddEditTransactionDialog
        isOpen={isTransactionModalOpen}
        onOpenChange={setIsTransactionModalOpen}
        onSave={handleSaveTransaction}
        categories={categories}
        accounts={accounts}
        recurringItems={recurringItems}
        debtAccounts={debtAccounts}
        goals={goalsWithContributions}
        variableExpenses={variableExpenses}
        transactionToEdit={transactionToEdit}
      />
    </div>
  );
}

