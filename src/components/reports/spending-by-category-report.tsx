"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import type { CategorySpending, Transaction, Category } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getTransactions } from "@/lib/api/transactions";
import { getCategories } from "@/lib/api/categories";

// Define colors for consistent chart display
const reportColors = {
  Housing: "#2563eb", // blue-600
  Food: "#16a34a",    // green-600
  Transportation: "#7c3aed", // violet-600
  Entertainment: "#f59e0b", // amber-500
  Utilities: "#dc2626", // red-600
  Other: "#64748b", // slate-500
  Uncategorized: "#9ca3af", // gray-400
  Health: "#06b6d4", // cyan-500
  Personal: "#8b5cf6", // violet-500
  "Home/Family": "#f97316", // orange-500
  "Media/Productivity": "#10b981", // emerald-500
};

export function SpendingByCategoryReport() {
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [chartData, setChartData] = useState<CategorySpending[]>([]);
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

  // Function to get category spending from real user data
  const getCategorySpending = (transactions: Transaction[], categories: Category[]) => {
    const categorySpending: Record<string, number> = {};
    
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
      .sort((a, b) => b.amount - a.amount);
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

        // Process the data to get category spending
        const categorySpendingData = getCategorySpending(transactions, categories);
        
        if (categorySpendingData.length === 0) {
          // If no spending data, show a message instead of empty chart
          setChartData([]);
          setIsLoading(false);
          return;
        }

        // Calculate total and percentages
        const totalSpending = categorySpendingData.reduce((sum, item) => sum + item.amount, 0);
        
        const dataWithPercentages = categorySpendingData.map(item => ({
          name: item.name,
          value: item.amount,
          color: reportColors[item.name as keyof typeof reportColors] || reportColors.Other,
          percentage: totalSpending > 0 ? parseFloat(((item.amount / totalSpending) * 100).toFixed(1)) : 0,
        }));

        setChartData(dataWithPercentages);
      } catch (err) {
        console.error('Error fetching spending data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load spending data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const totalValue = chartData.reduce((sum, entry) => sum + entry.value, 0);

  const chartConfig = chartData.reduce((acc, item) => {
    acc[item.name] = { label: item.name, color: item.color };
    return acc;
  }, {} as Record<string, any>);

  if (!isClient) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[350px]">
          <p className="text-muted-foreground">Loading chart...</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[350px]">
          <p className="text-muted-foreground">Loading your spending data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[350px]">
          <p className="text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center h-[350px] space-y-4">
          <p className="text-muted-foreground">No spending data found for the last 6 months.</p>
          <p className="text-sm text-muted-foreground">Add some transactions to see your spending breakdown here.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Spending by Category</CardTitle>
        <CardDescription>Your spending breakdown for the last 6 months</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6 items-center">
        <div className="flex flex-col items-center">
          <p className="text-sm text-muted-foreground mb-2">Spending Distribution</p>
          <ChartContainer config={chartConfig} className="aspect-square h-[280px] w-full max-w-[280px] mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel nameKey="name" />}
                />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="80%"
                  strokeWidth={2}
                  labelLine={false}
                >
                  {chartData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} stroke={entry.color} />
                  ))}
                </Pie>
                 {/* Custom center label */}
                 <text
                    x="50%"
                    y="46%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-muted-foreground"
                  >
                    Total
                  </text>
                  <text
                    x="50%"
                    y="56%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-2xl font-semibold fill-foreground"
                  >
                    ${totalValue.toLocaleString()}
                  </text>
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-medium text-foreground">Breakdown by Category</h3>
          <ul className="space-y-2.5">
            {chartData.map((item) => (
              <li key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span
                    className="mr-2 h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-foreground">{item.name}</span>
                </div>
                <div className="text-right">
                    <span className="font-semibold text-foreground">${item.value.toLocaleString()}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{item.percentage}%</span>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="link" className="p-0 h-auto text-primary text-sm" disabled>
            View detailed breakdown <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
