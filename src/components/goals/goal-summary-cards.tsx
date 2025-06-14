"use client";

import type { FinancialGoalWithContribution } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity, Loader2 } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { GoalAIInsights } from "./goal-ai-insights";

interface GoalSummaryCardsProps {
  goals: FinancialGoalWithContribution[];
}

export function GoalSummaryCards({ goals }: GoalSummaryCardsProps) {
  const [totalSavedThisMonth, setTotalSavedThisMonth] = useState<number>(0);
  const [previousMonthTotal, setPreviousMonthTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuth();

  // Fetch the total saved this month from transactions
  useEffect(() => {
    async function fetchMonthlySavings() {
      if (!user?.id) return;
      
      setIsLoading(true);
      
      try {
        // Get current month's range
        const today = new Date();
        const currentMonthStart = startOfMonth(today);
        const currentMonthEnd = endOfMonth(today);
        
        // Get previous month's range
        const previousMonthStart = startOfMonth(subMonths(today, 1));
        const previousMonthEnd = endOfMonth(subMonths(today, 1));
        
        // Fetch current month's goal contributions
        const { data: currentMonthData, error: currentMonthError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('detailed_type', 'goal-contribution')
          .gte('date', currentMonthStart.toISOString())
          .lte('date', currentMonthEnd.toISOString());
          
        if (currentMonthError) throw currentMonthError;
        
        // Fetch previous month's goal contributions
        const { data: previousMonthData, error: previousMonthError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('detailed_type', 'goal-contribution')
          .gte('date', previousMonthStart.toISOString())
          .lte('date', previousMonthEnd.toISOString());
          
        if (previousMonthError) throw previousMonthError;
        
        // Calculate totals
        const currentTotal = (currentMonthData || []).reduce((sum, t) => sum + t.amount, 0);
        const previousTotal = (previousMonthData || []).reduce((sum, t) => sum + t.amount, 0);
        
        setTotalSavedThisMonth(currentTotal);
        setPreviousMonthTotal(previousTotal);
      } catch (err) {
        console.error('Error fetching monthly savings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchMonthlySavings();
  }, [user?.id]);

  const activeGoals = useMemo(() => {
    return goals.filter(g => g.currentAmount < g.targetAmount);
  }, [goals]);

  const totalGoalsCompletionPercentage = useMemo(() => {
    if (goals.length === 0) return 0;
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    if (totalTarget === 0) return 0;
    return Math.min((totalCurrent / totalTarget) * 100, 100);
  }, [goals]);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            <TrendingUp className="h-4 w-4 mr-1 inline-block" /> Total Saved This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-foreground">
                ${totalSavedThisMonth.toLocaleString()}
              </div>
              {previousMonthTotal > 0 && (
                <p className={`text-xs pt-1 ${totalSavedThisMonth > previousMonthTotal ? 'text-green-500' : 'text-red-500'}`}>
                  {totalSavedThisMonth > previousMonthTotal ? (
                    <TrendingUp className="h-3 w-3 mr-0.5 inline-block" />
                  ) : (
                    <span className="inline-block transform rotate-180"><TrendingUp className="h-3 w-3 mr-0.5 inline-block" /></span>
                  )}
                  {previousMonthTotal === 0 ? (
                    'First month of contributions!'
                  ) : (
                    `${Math.abs(Math.round((totalSavedThisMonth - previousMonthTotal) / previousMonthTotal * 100))}% compared to last month`
                  )}
                </p>
              )}
              {previousMonthTotal === 0 && totalSavedThisMonth > 0 && (
                <p className="text-xs text-green-500 pt-1">
                  <TrendingUp className="h-3 w-3 mr-0.5 inline-block" /> First month of contributions!
                </p>
              )}
              {previousMonthTotal === 0 && totalSavedThisMonth === 0 && (
                <p className="text-xs text-muted-foreground pt-1">
                  No contributions made yet this month
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
             <Activity className="h-4 w-4 mr-1 inline-block" /> Active Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">
            {activeGoals.length} Goals
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            {totalGoalsCompletionPercentage.toFixed(0)}% of total goals completed
          </p>
        </CardContent>
      </Card>

      {/* AI Insights - now using real Jade AI */}
      {user?.id && (
        <GoalAIInsights
          goals={goals}
          userId={user.id}
          totalSavedThisMonth={totalSavedThisMonth}
          className="shadow-md"
        />
      )}
    </div>
  );
}
