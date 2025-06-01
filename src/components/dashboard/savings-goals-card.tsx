"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Calendar, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getFinancialGoals } from "@/lib/api/goals";
import type { FinancialGoal } from "@/types";
import { format, isPast, startOfDay } from "date-fns";

interface SavingsGoalsCardProps {
  refreshTrigger?: number;
}

export function SavingsGoalsCard({ refreshTrigger }: SavingsGoalsCardProps = {}) {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchGoals() {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        const { goals: fetchedGoals, error } = await getFinancialGoals(user.id);
        if (error) {
          console.error('Error fetching goals:', error);
        } else {
          setGoals(fetchedGoals || []);
        }
      } catch (err) {
        console.error('Error fetching goals:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGoals();
  }, [user?.id, refreshTrigger]);

  // Get top 3 goals with soonest target dates
  const topGoals = useMemo(() => {
    const activeGoals = goals.filter(goal => goal.currentAmount < goal.targetAmount);
    return activeGoals
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
      .slice(0, 3)
      .map(goal => {
        const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
        const isOverdue = isPast(startOfDay(new Date(goal.targetDate)));
        return {
          ...goal,
          progress: Math.min(progress, 100),
          isOverdue
        };
      });
  }, [goals]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Savings Goals</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm">Loading goals...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (topGoals.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Savings Goals</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm">No active savings goals</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Savings Goals</CardTitle>
        <Target className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topGoals.map((goal) => (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium truncate">{goal.name}</span>
                </div>
                <span className="text-sm font-medium">{Math.round(goal.progress)}%</span>
              </div>
              
              <Progress value={goal.progress} className="h-2" />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3" />
                  <span>${goal.currentAmount.toLocaleString()}</span>
                  <span>/</span>
                  <span>${goal.targetAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span className={goal.isOverdue ? "text-red-500" : ""}>
                    Target: {format(new Date(goal.targetDate), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {goals.length > 3 && (
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                Showing 3 of {goals.filter(g => g.currentAmount < g.targetAmount).length} active goals
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 