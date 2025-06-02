"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import type { Transaction, Category } from "@/types";
import { Icons } from "@/components/icons";
import { useAuth } from "@/contexts/auth-context";
import { getTransactions } from "@/lib/api/transactions";
import { getCategories } from "@/lib/api/categories";
import { format, startOfMonth, subMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface MonthlySpending {
  month: string;
  total: number;
  [key: string]: string | number; // For category-specific spending
}

interface CategoryTrend {
  category: string;
  currentMonth: number;
  previousMonth: number;
  change: number;
  changePercent: number;
  color: string;
}

interface SpendingInsight {
  type: 'increase' | 'decrease';
  category: string;
  amount: number;
  percentage: number;
  description: string;
}

// Define colors for spending categories
const categoryColors = [
  "#2563eb", // blue-600
  "#16a34a", // green-600
  "#7c3aed", // violet-600
  "#f59e0b", // amber-500
  "#dc2626", // red-600
  "#06b6d4", // cyan-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#f97316", // orange-500
  "#64748b", // slate-500
];

const chartConfig = {
  total: { label: "Total Spending", color: "hsl(var(--chart-1))" },
};

export function SpendingTrendsReport() {
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [monthlyData, setMonthlyData] = useState<MonthlySpending[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<CategoryTrend[]>([]);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [totalSpending, setTotalSpending] = useState(0);
  const [avgMonthlySpending, setAvgMonthlySpending] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Function to get monthly spending trends
  const getSpendingTrends = (transactions: Transaction[], categories: Category[]) => {
    const monthlyTotals: Record<string, Record<string, number>> = {};
    const categorySpending: Record<string, Record<string, number>> = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = startOfMonth(subMonths(new Date(), i));
      const monthKey = format(monthDate, "MMM ''yy");
      monthlyTotals[monthKey] = { total: 0 };
      categorySpending[monthKey] = {};
    }

    // Process transactions
    transactions.forEach(tx => {
      if (tx.type === 'expense' || (tx.detailedType && ['variable-expense', 'fixed-expense', 'subscription'].includes(tx.detailedType))) {
        const monthKey = format(new Date(tx.date), "MMM ''yy");
        if (monthlyTotals[monthKey]) {
          const amount = Math.abs(tx.amount);
          monthlyTotals[monthKey].total += amount;

          // Get category name
          let categoryName = 'Uncategorized';
          if (tx.categoryId) {
            const category = categories.find(cat => cat.id === tx.categoryId);
            if (category) {
              categoryName = category.name;
            } else {
              categoryName = getPredefinedCategoryLabel(tx.categoryId);
            }
          }

          if (!monthlyTotals[monthKey][categoryName]) {
            monthlyTotals[monthKey][categoryName] = 0;
          }
          monthlyTotals[monthKey][categoryName] += amount;

          if (!categorySpending[monthKey][categoryName]) {
            categorySpending[monthKey][categoryName] = 0;
          }
          categorySpending[monthKey][categoryName] += amount;
        }
      }
    });

    // Convert to array format for charts
    const monthlyDataArray: MonthlySpending[] = Object.entries(monthlyTotals).map(([month, data]) => ({
      month,
      total: data.total,
      ...Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'total'))
    }));

    return { monthlyDataArray, categorySpending };
  };

  // Function to calculate category trends and insights
  const calculateTrends = (categorySpending: Record<string, Record<string, number>>) => {
    const months = Object.keys(categorySpending);
    if (months.length < 2) return { trends: [], insights: [] };

    const currentMonth = months[months.length - 1];
    const previousMonth = months[months.length - 2];

    const trends: CategoryTrend[] = [];
    const insights: SpendingInsight[] = [];

    // Get all categories that appear in either month
    const allCategories = new Set([
      ...Object.keys(categorySpending[currentMonth] || {}),
      ...Object.keys(categorySpending[previousMonth] || {})
    ]);

    Array.from(allCategories).forEach((category, index) => {
      if (category === 'total') return;

      const current = categorySpending[currentMonth]?.[category] || 0;
      const previous = categorySpending[previousMonth]?.[category] || 0;
      const change = current - previous;
      const changePercent = previous > 0 ? ((change / previous) * 100) : (current > 0 ? 100 : 0);

      if (current > 0 || previous > 0) {
        trends.push({
          category,
          currentMonth: current,
          previousMonth: previous,
          change,
          changePercent,
          color: categoryColors[index % categoryColors.length]
        });

        // Generate insights for significant changes
        if (Math.abs(changePercent) >= 20 && Math.abs(change) >= 50) {
          insights.push({
            type: change > 0 ? 'increase' : 'decrease',
            category,
            amount: Math.abs(change),
            percentage: Math.abs(changePercent),
            description: `${category} spending ${change > 0 ? 'increased' : 'decreased'} by $${Math.abs(change).toFixed(0)} (${Math.abs(changePercent).toFixed(1)}%)`
          });
        }
      }
    });

    // Sort trends by current spending amount
    trends.sort((a, b) => b.currentMonth - a.currentMonth);
    
    // Sort insights by significance (amount of change)
    insights.sort((a, b) => b.amount - a.amount);

    return { trends: trends.slice(0, 8), insights: insights.slice(0, 5) };
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
        const { monthlyDataArray, categorySpending } = getSpendingTrends(transactions, categories);
        const { trends, insights } = calculateTrends(categorySpending);

        const total = monthlyDataArray.reduce((sum, month) => sum + month.total, 0);
        const average = monthlyDataArray.length > 0 ? total / monthlyDataArray.length : 0;

        setMonthlyData(monthlyDataArray);
        setCategoryTrends(trends);
        setInsights(insights);
        setTotalSpending(total);
        setAvgMonthlySpending(average);
      } catch (err) {
        console.error('Error fetching spending trends data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load spending trends data');
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
          <CardTitle>Spending Trends</CardTitle>
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
            <Icons.LineChartIcon className="mr-3 h-6 w-6 text-primary" />
            Spending Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[400px]">
          <p className="text-muted-foreground">Loading your spending trends...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center">
            <Icons.LineChartIcon className="mr-3 h-6 w-6 text-primary" />
            Spending Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[400px]">
          <p className="text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (monthlyData.length === 0 || totalSpending === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center">
            <Icons.LineChartIcon className="mr-3 h-6 w-6 text-primary" />
            Spending Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center h-[400px] space-y-4">
          <p className="text-muted-foreground">No spending data found for the last 6 months.</p>
          <p className="text-sm text-muted-foreground">Add some expense transactions to see your spending trends here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Icons.DollarSign className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spending (6M)</p>
                <p className="text-2xl font-bold text-red-600">${totalSpending.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Icons.CalendarDays className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Average</p>
                <p className="text-2xl font-bold text-blue-600">${avgMonthlySpending.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Icons.Activity className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categories Tracked</p>
                <p className="text-2xl font-bold text-purple-600">{categoryTrends.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Spending Trend */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Monthly Spending Trend</CardTitle>
            <CardDescription>Your total spending over the last 6 months</CardDescription>
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
                    dataKey="total" 
                    stroke="var(--color-total)" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: "var(--color-total)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Category Trends */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Category Changes</CardTitle>
            <CardDescription>Month-over-month spending changes by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              {categoryTrends.map((trend) => (
                <div key={trend.category} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: trend.color }}
                    />
                    <div>
                      <p className="font-medium">{trend.category}</p>
                      <p className="text-sm text-muted-foreground">
                        ${trend.currentMonth.toLocaleString()} this month
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={trend.change >= 0 ? "destructive" : "default"}
                      className={trend.change >= 0 ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"}
                    >
                      {trend.change >= 0 ? '+' : ''}${trend.change.toFixed(0)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {trend.changePercent >= 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center">
              <Icons.Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />
              Spending Insights
            </CardTitle>
            <CardDescription>Notable changes in your spending patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  insight.type === 'increase' 
                    ? 'border-l-red-500 bg-red-50 dark:bg-red-950/30' 
                    : 'border-l-green-500 bg-green-50 dark:bg-green-950/30'
                }`}>
                  <div className="flex items-start space-x-3">
                    {insight.type === 'increase' ? (
                      <Icons.TrendingUp className="h-5 w-5 text-red-500 mt-0.5" />
                    ) : (
                      <Icons.TrendingDown className="h-5 w-5 text-green-500 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{insight.description}</p>
                      <p className="text-sm text-muted-foreground">
                        Consider {insight.type === 'increase' ? 'reviewing this category for potential savings' : 'maintaining this positive trend'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
