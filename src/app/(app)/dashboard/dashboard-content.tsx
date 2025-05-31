"use client";

import { useEffect, useState } from "react";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CreditCard, Users, TrendingUp } from "lucide-react";
import { RecurringList } from "@/components/recurring/recurring-list";
import type { UnifiedRecurringListItem, RecurringItem, Account, Transaction } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { getAccounts } from "@/lib/api/accounts";
import { getTransactions } from "@/lib/api/transactions";
import { getRecurringItems } from "@/lib/api/recurring";
import { formatCurrency } from "@/lib/utils";
import { SetupGuide } from "@/components/dashboard/setup-guide";

export function DashboardContent() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<UnifiedRecurringListItem[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [monthlySpending, setMonthlySpending] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data when user is available
  useEffect(() => {
    console.log('Dashboard useEffect triggered, user:', user);
    console.log('User ID:', user?.id);
    
    async function fetchData() {
      if (!user?.id) {
        console.log('No user ID found, setting loading to false');
        setIsLoading(false);
        return;
      }

      console.log('Starting to fetch data for user:', user.id);
      try {
        setIsLoading(true);
        
        // Fetch accounts data
        const { accounts: accountsData, error: accountsError } = await getAccounts(user.id);
        if (accountsError) {
          throw new Error(`Error fetching accounts: ${accountsError}`);
        }
        
        if (accountsData) {
          setAccounts(accountsData);
          // Calculate total balance
          const balance = accountsData.reduce((sum, account) => sum + account.balance, 0);
          setTotalBalance(balance);
        }

        // Get current month date range
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Fetch current month transactions
        const { transactions: transactionsData, error: transactionsError } = await getTransactions(
          user.id,
          {
            startDate: firstDayOfMonth,
            endDate: lastDayOfMonth,
            type: 'expense'
          }
        );
        
        if (transactionsError) {
          throw new Error(`Error fetching transactions: ${transactionsError}`);
        }
        
        if (transactionsData) {
          setTransactions(transactionsData);
          // Calculate monthly spending
          const spending = transactionsData.reduce((sum, tx) => sum + tx.amount, 0);
          setMonthlySpending(spending);
        }

        // Fetch recurring items for upcoming expenses
        const { items: recurringData, error: recurringError } = await getRecurringItems(user.id);
        if (recurringError) {
          throw new Error(`Error fetching recurring items: ${recurringError}`);
        }
        
        if (recurringData) {
          // Filter to only show upcoming subscription and fixed expenses
          const today = new Date();
          const nextMonth = new Date(today);
          nextMonth.setMonth(today.getMonth() + 1);
          
          const filtered = recurringData
            .filter(item => item.type === 'subscription' || item.type === 'fixed-expense')
            .map(item => {
              // Determine next occurrence date based on frequency
              let nextOccurrenceDate = new Date(today);
              if (item.lastRenewalDate) {
                nextOccurrenceDate = new Date(item.lastRenewalDate);
                
                // Add appropriate time based on frequency
                switch(item.frequency) {
                  case 'daily':
                    nextOccurrenceDate.setDate(nextOccurrenceDate.getDate() + 1);
                    break;
                  case 'weekly':
                    nextOccurrenceDate.setDate(nextOccurrenceDate.getDate() + 7);
                    break;
                  case 'bi-weekly':
                    nextOccurrenceDate.setDate(nextOccurrenceDate.getDate() + 14);
                    break;
                  case 'monthly':
                    nextOccurrenceDate.setMonth(nextOccurrenceDate.getMonth() + 1);
                    break;
                  case 'quarterly':
                    nextOccurrenceDate.setMonth(nextOccurrenceDate.getMonth() + 3);
                    break;
                  case 'yearly':
                    nextOccurrenceDate.setFullYear(nextOccurrenceDate.getFullYear() + 1);
                    break;
                  case 'semi-monthly':
                    // For semi-monthly, we need special handling
                    if (item.semiMonthlyFirstPayDate && item.semiMonthlySecondPayDate) {
                      // Use the closer of the two dates
                      const firstDate = new Date(item.semiMonthlyFirstPayDate);
                      firstDate.setMonth(today.getMonth());
                      firstDate.setFullYear(today.getFullYear());
                      
                      const secondDate = new Date(item.semiMonthlySecondPayDate);
                      secondDate.setMonth(today.getMonth());
                      secondDate.setFullYear(today.getFullYear());
                      
                      // If both dates are in the past, move to next month
                      if (firstDate < today && secondDate < today) {
                        firstDate.setMonth(firstDate.getMonth() + 1);
                        secondDate.setMonth(secondDate.getMonth() + 1);
                      }
                      
                      // Choose the earlier of the future dates
                      if (firstDate >= today && (secondDate < today || firstDate < secondDate)) {
                        nextOccurrenceDate = firstDate;
                      } else {
                        nextOccurrenceDate = secondDate;
                      }
                    } else {
                      // Fallback if we don't have both dates
                      nextOccurrenceDate.setMonth(nextOccurrenceDate.getMonth() + 1);
                    }
                    break;
                }
              } else if (item.startDate && item.startDate > today) {
                // If not started yet, use start date
                nextOccurrenceDate = new Date(item.startDate);
              }
              
              // Determine status
              let status: 'Ended' | 'Today' | 'Upcoming' = 'Upcoming';
              if (item.endDate && item.endDate < today) {
                status = 'Ended';
              } else if (
                nextOccurrenceDate.getDate() === today.getDate() &&
                nextOccurrenceDate.getMonth() === today.getMonth() &&
                nextOccurrenceDate.getFullYear() === today.getFullYear()
              ) {
                status = 'Today';
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
          
          // Sort by date
          filtered.sort((a, b) => a.nextOccurrenceDate.getTime() - b.nextOccurrenceDate.getTime());
          
          // Only show upcoming or today items
          const activeItems = filtered.filter(item => item.status !== 'Ended');
          
          setUpcomingItems(activeItems);
        }
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
    const categories: Record<string, number> = {};
    
    // Group transactions by category
    transactions.forEach(tx => {
      const categoryName = tx.categoryId || 'Uncategorized';
      if (!categories[categoryName]) {
        categories[categoryName] = 0;
      }
      categories[categoryName] += tx.amount;
    });
    
    // Convert to array and sort by amount
    return Object.entries(categories)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3); // Get top 3 categories
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
              {transactions.length > 0 
                ? `From ${transactions.length} transaction${transactions.length > 1 ? 's' : ''}`
                : 'No transactions this month'}
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
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investment Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {/* This could be connected to real investment data if available */}
            <div className="text-center py-2">
              <p className="text-muted-foreground text-sm">Investment tracking coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row: Statistics Overview and Upcoming Expenses */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Statistics Overview */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Spending Trends</CardTitle>
              <CardDescription>Your expense history for the current period</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseChart />
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Expenses */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Expenses</CardTitle>
              {upcomingItems.length > 0 && (
                <CardDescription>You have {upcomingItems.length} upcoming payments</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {upcomingItems.length > 0 ? (
                <RecurringList 
                  items={upcomingItems} 
                  onDeleteItem={handleDeleteItem}
                  onEditItem={handleEditItem}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming payments found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
