"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import type { CategorySpending, Transaction, Category } from "@/types";
import type { TimePeriod } from "@/app/(app)/reports/page";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getTransactions } from "@/lib/api/transactions";
import { getCategories } from "@/lib/api/categories";
import { getDateRangeForPeriod, getPeriodLabel } from "@/lib/utils/date-utils";

// Define colors for consistent chart display
const reportColors = {
  Housing: "#2563eb", // blue-600
  Food: "#16a34a",    // green-600
  Transportation: "#f59e0b", // amber-500
  Entertainment: "#7c3aed", // violet-600
  Utilities: "#dc2626", // red-600
  Other: "#64748b", // slate-500
  Uncategorized: "#9ca3af", // gray-400
  Health: "#06b6d4", // cyan-500
  Personal: "#8b5cf6", // violet-500
  "Home/Family": "#f97316", // orange-500
  "Media/Productivity": "#10b981", // emerald-500
  Grocery: "#8b5cf6", // violet for grocery
  "Food & Drink": "#10b981", // emerald for food & drink
  Shopping: "#ef4444", // red for shopping
};

interface SpendingByCategoryReportProps {
  timePeriod: TimePeriod;
}

// Custom bubble chart component
const BubbleChart = ({ data }: { data: any[] }) => {
  const [hoveredItem, setHoveredItem] = useState<any>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Calculate positions for bubbles (simple pack layout)
  const packBubbles = (data: any[]) => {
    if (data.length === 0) return [];
    
    const maxValue = Math.max(...data.map(d => d.value));
    const minRadius = 30;
    const maxRadius = 80;
    
    return data.map((item, index) => {
      const radius = minRadius + (item.value / maxValue) * (maxRadius - minRadius);
      // Simple grid-like positioning with some offset for organic look
      const cols = Math.ceil(Math.sqrt(data.length));
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      const x = (col + 0.5) * (200) + (Math.random() - 0.5) * 30;
      const y = (row + 0.5) * (180) + (Math.random() - 0.5) * 30;
      
      return {
        ...item,
        x,
        y,
        radius
      };
    });
  };

  const bubbles = packBubbles(data);
  const width = Math.max(400, Math.ceil(Math.sqrt(data.length)) * 200);
  const height = Math.max(300, Math.ceil(data.length / Math.ceil(Math.sqrt(data.length))) * 180);

  const handleMouseMove = (event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <div className="relative">
      <svg width={width} height={height} onMouseMove={handleMouseMove}>
        {bubbles.map((bubble, index) => (
          <g key={bubble.name}>
            <circle
              cx={bubble.x}
              cy={bubble.y}
              r={bubble.radius}
              fill={bubble.color}
              fillOpacity={0.8}
              stroke="white"
              strokeWidth={3}
              onMouseEnter={() => setHoveredItem(bubble)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{ cursor: 'pointer' }}
            />
            <text
              x={bubble.x}
              y={bubble.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={bubble.radius > 50 ? 18 : 14}
              fill="white"
              fontWeight="bold"
              pointerEvents="none"
            >
              {bubble.percentage}%
            </text>
          </g>
        ))}
      </svg>
      
      {/* Custom tooltip */}
      {hoveredItem && (
        <div 
          className="absolute bg-background border rounded-lg p-3 shadow-lg pointer-events-none z-10"
          style={{
            left: mousePosition.x - 100,
            top: mousePosition.y - 80,
          }}
        >
          <p className="font-medium">{hoveredItem.name}</p>
          <p className="text-sm text-muted-foreground">
            ${hoveredItem.value.toLocaleString()} ({hoveredItem.percentage}%)
          </p>
        </div>
      )}
    </div>
  );
};

export function SpendingByCategoryReport({ timePeriod }: SpendingByCategoryReportProps) {
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
          size: item.amount, // For treemap sizing
          color: reportColors[item.name as keyof typeof reportColors] || reportColors.Other,
          percentage: totalSpending > 0 ? parseFloat(((item.amount / totalSpending) * 100).toFixed(0)) : 0,
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
  }, [user?.id, timePeriod]);

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
          <CardDescription>Your spending breakdown for the {getPeriodLabel(timePeriod).toLowerCase()}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[350px]">
          <p className="text-muted-foreground">No spending data found for the {getPeriodLabel(timePeriod).toLowerCase()}.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Spending by Category</CardTitle>
        <CardDescription>Your spending breakdown for the {getPeriodLabel(timePeriod).toLowerCase()}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Bubble Chart */}
          <div className="flex justify-center">
            <BubbleChart data={chartData} />
          </div>
          
          {/* Category Legend */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {chartData.map((entry, index) => (
              <div key={entry.name} className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: entry.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-sm text-muted-foreground">${entry.value.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
