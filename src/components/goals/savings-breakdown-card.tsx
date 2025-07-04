
"use client";

import type { FinancialGoalWithContribution, SavingsBreakdownItem } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Percent } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useMemo, useEffect, useState } from "react";

const goalColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface SavingsBreakdownCardProps {
  goals: FinancialGoalWithContribution[];
}

export function SavingsBreakdownCard({ goals }: SavingsBreakdownCardProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const chartData: SavingsBreakdownItem[] = useMemo(() => {
    return goals
      .filter(goal => goal.currentAmount > 0) // Only include goals with some savings
      .map((goal, index) => ({
        name: goal.name,
        value: goal.currentAmount,
        color: goalColors[index % goalColors.length],
      }));
  }, [goals]);

  const chartConfig = useMemo(() => {
    return chartData.reduce((acc, item) => {
      acc[item.name] = { label: item.name, color: item.color };
      return acc;
    }, {} as any);
  }, [chartData]);

  const emergencyFund = goals.find(g => g.name.toLowerCase().includes("emergency fund"));
  const emergencyFundPercentage = emergencyFund && emergencyFund.targetAmount > 0 
    ? Math.min((emergencyFund.currentAmount / emergencyFund.targetAmount) * 100, 100) 
    : 0;


  if (!isClient) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Savings Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Loading chart...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Savings Breakdown</CardTitle>
        <Button variant="ghost" size="icon" disabled className="h-8 w-8 opacity-50">
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <ChartContainer config={chartConfig} className="aspect-square h-[200px] mx-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    strokeWidth={2}
                  >
                    {chartData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} stroke={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="space-y-2 text-sm">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center">
                  <span
                    className="h-2.5 w-2.5 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground flex-1">{item.name}</span>
                  {/* <span className="text-foreground font-medium">${item.value.toLocaleString()}</span> */}
                </div>
              ))}
              {emergencyFund && (
                <div className="mt-4 pt-3 border-t text-xs text-muted-foreground bg-muted/30 p-2 rounded-md flex items-start gap-2">
                  <Percent className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>
                    Your emergency fund is at {emergencyFundPercentage.toFixed(0)}%. 
                    {emergencyFundPercentage < 100 && " Consider increasing its priority to build financial security."}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-10">No savings data to display for breakdown.</p>
        )}
      </CardContent>
    </Card>
  );
}
