"use client";

import { TrendingUp, CalendarDays, ArrowDownUp } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import type { Transaction, ExpenseByCategory, TransactionDetailedType } from "@/types";
import { useEffect, useState } from "react";

// Helper function to group transactions by date
const groupTransactionsByDate = (transactions: Transaction[]) => {
  const groupedByDate: Record<string, { income: number; expense: number }> = {};
  
  transactions.forEach(transaction => {
    const dateStr = transaction.date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (!groupedByDate[dateStr]) {
      groupedByDate[dateStr] = { income: 0, expense: 0 };
    }
    
    if (transaction.type === 'income') {
      groupedByDate[dateStr].income += transaction.amount;
    } else if (transaction.type === 'expense') {
      groupedByDate[dateStr].expense += transaction.amount;
    }
  });
  
  return groupedByDate;
};

// Helper function to create chart data points from grouped transactions
const createChartData = (groupedTransactions: Record<string, { income: number; expense: number }>, period: 'week' | 'month' | 'year' = 'month') => {
  const dates = Object.keys(groupedTransactions).sort();
  
  // Handle empty data case
  if (dates.length === 0) {
    // Generate some empty data points for the current period
    const today = new Date();
    const chartData = [];
    
    if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        chartData.push({ date: dateStr, income: 0, expense: 0 });
      }
    } else if (period === 'month') {
      for (let i = 0; i < 30; i += 5) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        chartData.push({ date: dateStr, income: 0, expense: 0 });
      }
    } else { // year
      for (let i = 0; i < 12; i++) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        chartData.push({ date: dateStr, income: 0, expense: 0 });
      }
    }
    
    return chartData;
  }
  
  // When we have actual data
  return dates.map(date => ({
    date,
    income: groupedTransactions[date].income,
    expense: groupedTransactions[date].expense,
    // For display in the tooltip
    incomeFormatted: formatCurrency(groupedTransactions[date].income),
    expenseFormatted: formatCurrency(groupedTransactions[date].expense)
  }));
};

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(143, 85%, 56%)", // Green for income
  },
  expense: {
    label: "Expense",
    color: "hsl(346, 84%, 61%)", // Red for expense
  },
};

export function ExpenseChart() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [viewPeriod, setViewPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    const fetchTransactionData = async () => {
      if (!user?.id) {
        // Handle case when user is not logged in yet
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get date range based on selected period
        const today = new Date();
        let startDate: Date;
        
        if (viewPeriod === 'week') {
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 7);
        } else if (viewPeriod === 'month') {
          startDate = new Date(today);
          startDate.setMonth(today.getMonth() - 1);
        } else { // year
          startDate = new Date(today);
          startDate.setFullYear(today.getFullYear() - 1);
        }
        
        // Fetch transactions within date range
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate.toISOString())
          .lte('date', today.toISOString())
          .order('date', { ascending: true });
          
        if (error) throw error;
        
        // Process the data
        if (data && data.length > 0) {
          // Convert Supabase date strings to Date objects and map fields properly
          const transactions = data.map(tx => ({
            id: tx.id.toString(),
            date: new Date(tx.date),
            amount: tx.amount,
            type: tx.type as 'income' | 'expense',
            description: tx.description,
            detailedType: tx.detailed_type as TransactionDetailedType | undefined,
            accountId: tx.account_id,
            userId: tx.user_id,
            categoryId: tx.category_id?.toString() || null,
            toAccountId: tx.to_account_id,
            sourceId: tx.source_id,
            source: tx.source,
            notes: tx.notes,
            createdAt: new Date(tx.created_at),
            updatedAt: new Date(tx.updated_at)
          }));
          
          // Group by date
          const groupedTransactions = groupTransactionsByDate(transactions);
          
          // Create chart data
          const chartData = createChartData(groupedTransactions, viewPeriod);
          setChartData(chartData);
          
          // Calculate totals
          const incomeTotal = transactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
            
          const expenseTotal = transactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
            
          setTotalIncome(incomeTotal);
          setTotalExpense(expenseTotal);
        } else {
          // No data found - empty placeholders
          setChartData(createChartData({}, viewPeriod));
          setTotalIncome(0);
          setTotalExpense(0);
        }
      } catch (err: any) {
        console.error("Error fetching transaction data:", err);
        setError(err.message || "Failed to load transaction data");
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTransactionData();
  }, [user?.id, viewPeriod]);

  const formatXAxisTick = (tickItem: string) => {
    const date = new Date(tickItem);
    if (viewPeriod === 'week') {
      return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
    } else if (viewPeriod === 'month') {
      return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(date);
    } else { // year
      return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
    }
  };

  // Only show loading if actually loading data
  if (isLoading) {
    return (
      <Card className="col-span-2 shadow-lg">
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>Income and expenses over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="col-span-2 shadow-lg">
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>Income and expenses over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center text-red-500">
            Error loading chart: {error}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Check if there's actual data to display
  const hasData = chartData.some(point => point.income > 0 || point.expense > 0);

  return (
    <Card className="col-span-2 shadow-lg"> 
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>Income and expenses over time</CardDescription>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setViewPeriod('week')} 
            className={`px-3 py-1 text-xs rounded-md ${viewPeriod === 'week' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            Week
          </button>
          <button 
            onClick={() => setViewPeriod('month')} 
            className={`px-3 py-1 text-xs rounded-md ${viewPeriod === 'month' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            Month
          </button>
          <button 
            onClick={() => setViewPeriod('year')} 
            className={`px-3 py-1 text-xs rounded-md ${viewPeriod === 'year' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            Year
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(143, 85%, 56%)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(143, 85%, 56%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(346, 84%, 61%)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(346, 84%, 61%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
                  tickFormatter={formatXAxisTick}
                />
                <YAxis />
                <Tooltip
                  content={<ChartTooltipContent indicator="line" />}
                  formatter={(value, name) => {
                    if (name === 'income') return [`${formatCurrency(value as number)}`, 'Income'];
                    if (name === 'expense') return [`${formatCurrency(value as number)}`, 'Expense'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  name="Income"
                  stroke="hsl(143, 85%, 56%)" 
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  name="Expense"
                  stroke="hsl(346, 84%, 61%)" 
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-[300px] w-full flex flex-col items-center justify-center text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="54"
              height="54"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-4 text-muted-foreground/50"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
            <p className="text-center mb-2">No transaction data available</p>
            <p className="text-center text-sm">Add transactions to see your financial trends</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-6 border-t">
        <div className="flex items-center gap-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-sm text-muted-foreground">Income</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{formatCurrency(totalIncome)}</span>
              <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">+8%</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-sm text-muted-foreground">Expenses</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{formatCurrency(totalExpense)}</span>
              <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">-3%</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Net</span>
          </div>
          <span className={`text-lg font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
