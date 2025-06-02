"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import type { Transaction, Category } from "@/types";
import { Icons } from "@/components/icons";
import { useAuth } from "@/contexts/auth-context";
import { getTransactions } from "@/lib/api/transactions";
import { getCategories } from "@/lib/api/categories";
import { format, startOfMonth, subMonths } from "date-fns";

interface IncomeSource {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface MonthlyIncome {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

// Define colors for income sources
const incomeColors = {
  Salary: "#16a34a", // green-600
  Freelance: "#2563eb", // blue-600
  Investment: "#7c3aed", // violet-600
  Business: "#f59e0b", // amber-500
  "Side Hustle": "#06b6d4", // cyan-500
  Bonus: "#10b981", // emerald-500
  Other: "#64748b", // slate-500
  Uncategorized: "#9ca3af", // gray-400
};

const chartConfig = {
  income: { label: "Income", color: "hsl(var(--chart-2))" },
  expenses: { label: "Expenses", color: "hsl(var(--chart-5))" },
  net: { label: "Net Income", color: "hsl(var(--chart-1))" },
};

export function IncomeAnalysisReport() {
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [incomeData, setIncomeData] = useState<IncomeSource[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyIncome[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get predefined category labels for income
  const getPredefinedIncomeLabel = (value: string) => {
    const incomeLabels: Record<string, string> = {
      'salary': 'Salary',
      'freelance': 'Freelance',
      'investment': 'Investment',
      'business': 'Business',
      'side-hustle': 'Side Hustle',
      'bonus': 'Bonus',
      'other-income': 'Other'
    };
    return incomeLabels[value] || value;
  };

  // Function to get income sources from real user data
  const getIncomeBreakdown = (transactions: Transaction[], categories: Category[]) => {
    const incomeBySource: Record<string, number> = {};
    let totalIncomeAmount = 0;
    let totalExpenseAmount = 0;

    transactions.forEach(tx => {
      if (tx.type === 'income') {
        totalIncomeAmount += tx.amount;
        
        let sourceName = 'Uncategorized';
        if (tx.categoryId) {
          const category = categories.find(cat => cat.id === tx.categoryId);
          if (category) {
            sourceName = category.name;
          } else {
            sourceName = getPredefinedIncomeLabel(tx.categoryId);
          }
        }
        
        if (!incomeBySource[sourceName]) {
          incomeBySource[sourceName] = 0;
        }
        incomeBySource[sourceName] += tx.amount;
      } else if (tx.type === 'expense' || (tx.detailedType && ['variable-expense', 'fixed-expense', 'subscription'].includes(tx.detailedType))) {
        totalExpenseAmount += Math.abs(tx.amount);
      }
    });

    const incomeSourcesArray = Object.entries(incomeBySource)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalIncomeAmount > 0 ? parseFloat(((amount / totalIncomeAmount) * 100).toFixed(1)) : 0,
        color: incomeColors[name as keyof typeof incomeColors] || incomeColors.Other
      }))
      .sort((a, b) => b.amount - a.amount);

    return { incomeSourcesArray, totalIncomeAmount, totalExpenseAmount };
  };

  // Function to get monthly income trends
  const getMonthlyIncomeData = (transactions: Transaction[]) => {
    const monthlyTotals: Record<string, { income: number; expenses: number }> = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = startOfMonth(subMonths(new Date(), i));
      const monthKey = format(monthDate, "MMM ''yy");
      monthlyTotals[monthKey] = { income: 0, expenses: 0 };
    }

    transactions.forEach(tx => {
      const monthKey = format(new Date(tx.date), "MMM ''yy");
      if (monthlyTotals[monthKey]) {
        if (tx.type === 'income') {
          monthlyTotals[monthKey].income += tx.amount;
        } else if (tx.type === 'expense' || (tx.detailedType && ['variable-expense', 'fixed-expense', 'subscription'].includes(tx.detailedType))) {
          monthlyTotals[monthKey].expenses += Math.abs(tx.amount);
        }
      }
    });

    return Object.entries(monthlyTotals).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses
    }));
  };

  useEffect(() => {
    setIsClient(true);
    
    const fetchData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Calculate date range for last 6 months
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);

        // Fetch transactions and categories in parallel
        const [transactionsResult, categoriesResult] = await Promise.all([
          getTransactions(user.id, { startDate, endDate }),
          getCategories(user.id)
        ]);

        if (transactionsResult.error) {
          throw new Error(transactionsResult.error);
        }

        if (categoriesResult.error) {
          throw new Error(categoriesResult.error);
        }

        const transactions = transactionsResult.transactions || [];
        const categories = categoriesResult.categories || [];

        // Process the data
        const { incomeSourcesArray, totalIncomeAmount, totalExpenseAmount } = getIncomeBreakdown(transactions, categories);
        const monthlyIncomeData = getMonthlyIncomeData(transactions);

        setIncomeData(incomeSourcesArray);
        setMonthlyData(monthlyIncomeData);
        setTotalIncome(totalIncomeAmount);
        setTotalExpenses(totalExpenseAmount);
      } catch (err) {
        console.error('Error fetching income data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load income data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  if (!isClient) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Income Analysis</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[400px]">
          <p className="text-muted-foreground">Loading chart...</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center">
            <Icons.BarChartBig className="mr-3 h-6 w-6 text-primary" />
            Income Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[400px]">
          <p className="text-muted-foreground">Loading your income data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center">
            <Icons.BarChartBig className="mr-3 h-6 w-6 text-primary" />
            Income Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[400px]">
          <p className="text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (incomeData.length === 0 && totalIncome === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center">
            <Icons.BarChartBig className="mr-3 h-6 w-6 text-primary" />
            Income Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center h-[400px] space-y-4">
          <p className="text-muted-foreground">No income data found for the last 6 months.</p>
          <p className="text-sm text-muted-foreground">Add some income transactions to see your income analysis here.</p>
        </CardContent>
      </Card>
    );
  }

  const averageMonthlyIncome = monthlyData.length > 0 ? totalIncome / 6 : 0;
  const netIncome = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((netIncome / totalIncome) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Icons.DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold text-green-600">${totalIncome.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Icons.CalendarDays className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Avg</p>
                <p className="text-2xl font-bold text-blue-600">${averageMonthlyIncome.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Icons.TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Income</p>
                <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${netIncome.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Icons.PiggyBank className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Savings Rate</p>
                <p className={`text-2xl font-bold ${savingsRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {savingsRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Income Sources Breakdown */}
        {incomeData.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Income Sources</CardTitle>
              <CardDescription>Breakdown of your income by source for the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incomeData.map((source) => (
                  <div key={source.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: source.color }}
                      />
                      <span className="font-medium">{source.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">${source.amount.toLocaleString()}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{source.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Income vs Expenses Trend */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Income vs Expenses Trend</CardTitle>
            <CardDescription>Monthly comparison of income and expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value) => `$${value/1000}k`} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke="var(--color-income)" 
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="var(--color-expenses)" 
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="net" 
                    stroke="var(--color-net)" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
