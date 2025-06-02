"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import type { Transaction, Category } from "@/types";
import type { TimePeriod } from "@/app/(app)/reports/page";
import { Icons } from "@/components/icons";
import { useAuth } from "@/contexts/auth-context";
import { getTransactions } from "@/lib/api/transactions";
import { getCategories } from "@/lib/api/categories";
import { getDateRangeForPeriod, getPeriodLabel } from "@/lib/utils/date-utils";
import { format, startOfMonth, subMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

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

interface SpendingTrendsReportProps {
  timePeriod: TimePeriod;
}

export function SpendingTrendsReport({ timePeriod }: SpendingTrendsReportProps) {
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
    const monthlyTotals: Record<string, { total: number; [key: string]: number }> = {};
    const categorySpending: Record<string, Record<string, number>> = {};
    
    // Calculate number of months based on time period
    let monthsToShow = 6; // default
    switch (timePeriod) {
      case 'last-30-days':
        monthsToShow = 1;
        break;
      case 'last-3-months':
        monthsToShow = 3;
        break;
      case 'last-6-months':
        monthsToShow = 6;
        break;
      case 'last-12-months':
        monthsToShow = 12;
        break;
      case 'last-2-years':
        monthsToShow = 24;
        break;
    }

    // Initialize months
    const endDate = new Date();
    for (let i = 0; i < monthsToShow; i++) {
      const monthDate = new Date(endDate);
      monthDate.setMonth(endDate.getMonth() - i);
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

    return { monthlyDataArray: monthlyDataArray.reverse(), categorySpending };
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

        // Calculate date range based on selected time period
        const { startDate, endDate } = getDateRangeForPeriod(timePeriod);

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
  }, [user?.id, timePeriod]);

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
          <CardDescription>Your spending patterns over the {getPeriodLabel(timePeriod).toLowerCase()}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center h-[400px] space-y-4">
          <p className="text-muted-foreground">No spending data found for the {getPeriodLabel(timePeriod).toLowerCase()}.</p>
          <p className="text-sm text-muted-foreground">Add some expense transactions to see your spending trends here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold flex items-center">
          <Icons.LineChartIcon className="mr-3 h-6 w-6 text-primary" />
          Spending Trends
        </CardTitle>
        <CardDescription>Your spending patterns over the {getPeriodLabel(timePeriod).toLowerCase()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Spending</CardTitle>
              <CardDescription>Your total spending over the {getPeriodLabel(timePeriod).toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSpending.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Monthly</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${avgMonthlySpending.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Spending Periods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyData.filter(m => m.total > 0).length}</div>
              <p className="text-xs text-muted-foreground">months with activity</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Spending Chart */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Monthly Spending Trend</h3>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer>
              <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis 
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="var(--color-total)" 
                  strokeWidth={3}
                  dot={{ fill: "var(--color-total)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Category Trends and Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Trends */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Category Trends</h3>
            <div className="space-y-3">
              {categoryTrends.map((trend, index) => (
                <div key={trend.category} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: trend.color }}
                    />
                    <span className="font-medium">{trend.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${trend.currentMonth.toLocaleString()}</div>
                    <div className={`text-xs flex items-center ${trend.changePercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {trend.changePercent >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {Math.abs(trend.changePercent).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Spending Insights</h3>
            <div className="space-y-3">
              {insights.length > 0 ? insights.map((insight, index) => (
                <div key={index} className="p-3 rounded-lg border bg-muted/20">
                  <div className={`flex items-center gap-2 mb-1 ${insight.type === 'increase' ? 'text-red-600' : 'text-green-600'}`}>
                    {insight.type === 'increase' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="font-medium text-sm">
                      {insight.type === 'increase' ? 'Increased Spending' : 'Decreased Spending'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground p-3 rounded-lg border bg-muted/20">
                  No significant spending changes detected in the selected period.
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
