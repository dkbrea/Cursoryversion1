"use client";

import { useEffect, useState } from "react";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CreditCard, Users, TrendingUp } from "lucide-react";
import { RecurringList } from "@/components/recurring/recurring-list";
import type { UnifiedRecurringListItem, RecurringItem, Account, Transaction, DebtAccount, Category, FinancialGoal, VariableExpense } from "@/types";
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
  const [variableExpenses, setVariableExpenses] = useState<VariableExpense[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlySpending, setMonthlySpending] = useState(0);
  const [isCalendarOverlayOpen, setIsCalendarOverlayOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

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
    setIsTransactionModalOpen(true);
  };

  const handleSaveTransaction = async (
    data: Omit<Transaction, "id" | "userId" | "source" | "createdAt" | "updatedAt">
  ) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to save transactions.",
        variant: "destructive"
      });
      return;
    }

    try {
      const transactionWithUserId = { ...data, userId: user.id };
      const result = await createTransaction(transactionWithUserId);
      if (result.error) {
        toast({
          title: "Error",
          description: `Failed to create transaction: ${result.error}`,
          variant: "destructive"
        });
        return;
      }

      if (result.transaction) {
        // Add the new transaction to the list
        setTransactions(prev => [result.transaction!, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        
        // Recalculate totals
        const newSpending = [...transactions, result.transaction]
          .filter((tx: Transaction) => tx.detailedType === 'variable-expense' || tx.detailedType === 'fixed-expense' || tx.detailedType === 'subscription')
          .reduce((sum: number, tx: Transaction) => sum + Math.abs(tx.amount), 0);
        setMonthlySpending(newSpending);
        
        toast({ 
          title: "Transaction Added", 
          description: `"${result.transaction.description}" has been added.` 
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
        
        <SavingsGoalsCard />
      </div>

      {/* Second row: Chart and Upcoming Expenses */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chart section - takes up 2 columns */}
        <div className="lg:col-span-2">
          <ExpenseChart />
        </div>
        
        {/* Right column: Calendar Access + Upcoming Expenses - takes up 1 column */}
        <div className="flex flex-col gap-4 h-full min-h-[500px]">
          <CalendarAccessCard onViewCalendar={() => setIsCalendarOverlayOpen(true)} />
          <div className="flex-1 flex">
            <UpcomingExpensesCard items={upcomingItems} />
          </div>
        </div>
      </div>

      {/* Third row: Recent Transactions */}
      <div className="grid gap-4">
        <RecentTransactionsCard 
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          limit={10}
          onAddTransaction={handleAddTransaction}
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
        goals={goals}
        variableExpenses={variableExpenses}
      />
    </div>
  );
}

