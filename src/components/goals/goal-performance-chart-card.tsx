"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useState, useEffect } from "react";
import type { GoalPerformanceDataPoint } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";



const chartConfig = {
  saving: {
    label: "Saving",
    color: "hsl(var(--chart-1))",
  },
};

export function GoalPerformanceChartCard() {
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<GoalPerformanceDataPoint[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('last-6-months');
  const [goals, setGoals] = useState<{id: string; name: string}[]>([]);
  const [activeDotData, setActiveDotData] = useState<GoalPerformanceDataPoint | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Fetch goals for the dropdown
  useEffect(() => {
    async function fetchGoals() {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('financial_goals')
          .select('id, name')
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        setGoals(data || []);
      } catch (err) {
        console.error('Error fetching goals:', err);
      }
    }
    
    fetchGoals();
  }, [user?.id]);
  
  // Fetch performance data based on selected goal and time range
  useEffect(() => {
    async function fetchPerformanceData() {
      if (!user?.id) return;
      
      setIsLoading(true);
      
      try {
        // Determine date range
        const today = new Date();
        const monthsToFetch = timeRange === 'last-12-months' ? 12 : 6;
        const startDate = startOfMonth(subMonths(today, monthsToFetch - 1));
        const endDate = endOfMonth(today);
        
        // Fetch goal contributions (transactions with detailed_type = 'goal-contribution')
        let query = supabase
          .from('transactions')
          .select('date, amount, source_id')
          .eq('user_id', user.id)
          .eq('detailed_type', 'goal-contribution')
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString())
          .order('date', { ascending: true });
          
        // Filter by goal if not 'all'
        if (selectedGoal !== 'all') {
          query = query.eq('source_id', selectedGoal);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Group by month
        const monthlyData: Record<string, number> = {};
        
        // Initialize all months with 0
        for (let i = 0; i < monthsToFetch; i++) {
          const monthDate = subMonths(today, i);
          const monthKey = format(monthDate, 'MMMM');
          monthlyData[monthKey] = 0;
        }
        
        // Sum contributions by month
        (data || []).forEach(transaction => {
          const monthKey = format(new Date(transaction.date), 'MMMM');
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + transaction.amount;
        });
        
        // Convert to array format for chart
        const chartData: GoalPerformanceDataPoint[] = Object.entries(monthlyData)
          .map(([month, saving]) => ({ month, saving }))
          .reverse(); // Reverse to show oldest to newest
        
        setPerformanceData(chartData);
        
        // Set active dot to the month with highest contribution
        if (chartData.length > 0) {
          const highestContribution = chartData.reduce((prev, current) => 
            prev.saving > current.saving ? prev : current
          );
          setActiveDotData(highestContribution);
        } else {
          setActiveDotData(null);
        }
      } catch (err) {
        console.error('Error fetching performance data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPerformanceData();
  }, [user?.id, selectedGoal, timeRange]);

  if (!isClient) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Goal Performance</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Loading chart...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <CardTitle className="text-lg font-semibold">Goal Performance</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={selectedGoal} onValueChange={setSelectedGoal}>
            <SelectTrigger className="w-auto h-9 text-xs sm:text-sm">
              <SelectValue placeholder="Select Goal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Goals</SelectItem>
              {goals.map(goal => (
                <SelectItem key={goal.id} value={goal.id}>{goal.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-auto h-9 text-xs sm:text-sm">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-6-months">Last 6 Months</SelectItem>
              <SelectItem value="last-12-months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" disabled className="h-9 w-9 opacity-50">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[250px] w-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : performanceData.length === 0 ? (
          <div className="h-[250px] w-full flex items-center justify-center">
            <p className="text-muted-foreground">No contribution data available for this period.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer>
              <LineChart
                data={performanceData}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                <YAxis 
                  tickFormatter={(value) => {
                    if (value >= 1000) {
                      return `$${(value/1000).toFixed(1)}k`;
                    }
                    return `$${value}`;
                  }} 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8} 
                  fontSize={12} 
                />
                <Tooltip 
                  content={
                    <ChartTooltipContent 
                      indicator="line" 
                      labelFormatter={(value) => `${value} ${new Date().getFullYear()}`}
                    />
                  } 
                />
                <Line
                  type="monotone"
                  dataKey="saving"
                  stroke="var(--color-saving)"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: "var(--color-saving)",
                    strokeWidth: 2,
                    stroke: "hsl(var(--background))"
                  }}
                />
                {activeDotData && (
                  <ReferenceDot
                      x={activeDotData.month}
                      y={activeDotData.saving}
                      r={6}
                      fill="var(--color-saving)"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      ifOverflow="visible"
                      label={{
                        value: `$${activeDotData.saving.toLocaleString()}`,
                        position: "top",
                        dy: -10,
                        fill: "hsl(var(--foreground))",
                        fontSize: 12,
                        fontWeight: 500
                      }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
