"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { FinancialGoal } from "@/types";
import type { TimePeriod } from "@/app/(app)/reports/page";
import { useAuth } from "@/contexts/auth-context";
import { getFinancialGoals } from "@/lib/api/goals";
import { Icons } from "@/components/icons";

interface GoalProgressReportProps {
  timePeriod: TimePeriod;
}

export function GoalProgressReport({ timePeriod }: GoalProgressReportProps) {
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const goalsResult = await getFinancialGoals(user.id);

        if (goalsResult.error) {
          throw new Error(goalsResult.error);
        }

        const goalsData = goalsResult.goals || [];
        setGoals(goalsData);
      } catch (err) {
        console.error('Error fetching goals data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load goals data');
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
          <CardTitle>Goal Progress</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[300px]">
          <p className="text-muted-foreground">Loading chart...</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center">
            <Icons.TrendingUp className="mr-2 h-5 w-5 text-primary"/>
            Goal Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[300px]">
          <p className="text-muted-foreground">Loading your goals...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center">
            <Icons.TrendingUp className="mr-2 h-5 w-5 text-primary"/>
            Goal Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[300px]">
          <p className="text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center">
            <Icons.TrendingUp className="mr-2 h-5 w-5 text-primary"/>
            Goal Progress
          </CardTitle>
          <CardDescription>Track your financial goals and achievements</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center h-[300px] space-y-4">
          <Icons.TrendingUp className="h-16 w-16 text-muted-foreground" />
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-muted-foreground">No Goals Found</p>
            <p className="text-sm text-muted-foreground">Create some financial goals to track your progress here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate stats - note: FinancialGoal doesn't have status, so we determine based on completion
  const activeGoals = goals.filter(goal => goal.currentAmount < goal.targetAmount);
  const completedGoals = goals.filter(goal => goal.currentAmount >= goal.targetAmount);
  const totalProgress = activeGoals.reduce((sum, goal) => sum + (goal.currentAmount / goal.targetAmount) * 100, 0);
  const averageProgress = activeGoals.length > 0 ? totalProgress / activeGoals.length : 0;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center">
          <Icons.TrendingUp className="mr-2 h-5 w-5 text-primary"/>
          Goal Progress
        </CardTitle>
        <CardDescription>Track your financial goals and achievements</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{activeGoals.length}</p>
            <p className="text-xs text-muted-foreground">Active Goals</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{completedGoals.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">{averageProgress.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Avg Progress</p>
          </div>
        </div>

        {/* Active Goals List */}
        <div className="space-y-3">
          <h4 className="font-medium">Active Goals</h4>
          {activeGoals.slice(0, 4).map((goal) => {
            const progressPercent = (goal.currentAmount / goal.targetAmount) * 100;
            return (
              <div key={goal.id} className="space-y-2 p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{goal.name}</span>
                  <Badge variant={progressPercent >= 100 ? "default" : "secondary"}>
                    {progressPercent.toFixed(0)}%
                  </Badge>
                </div>
                <Progress value={Math.min(progressPercent, 100)} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>${goal.currentAmount.toLocaleString()}</span>
                  <span>${goal.targetAmount.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
          
          {activeGoals.length > 4 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{activeGoals.length - 4} more goals
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
