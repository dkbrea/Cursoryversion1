"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Loader2 } from 'lucide-react';
import type { FinancialGoalWithContribution } from '@/types';
import { formatNumber } from '@/lib/utils';

interface GoalAIInsight {
  type: 'progress_analysis' | 'timeline_prediction' | 'savings_pattern' | 'goal_prioritization';
  message: string;
  priority: 'high' | 'medium' | 'low';
  data?: {
    goalName?: string;
    timeframe?: string;
    amount?: number;
    percentage?: number;
  };
}

interface GoalAIInsightsProps {
  goals: FinancialGoalWithContribution[];
  userId: string;
  totalSavedThisMonth: number;
  className?: string;
}

export function GoalAIInsights({ 
  goals, 
  userId, 
  totalSavedThisMonth,
  className 
}: GoalAIInsightsProps) {
  const [insights, setInsights] = useState<GoalAIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasAnalyzedRef = useRef<string | null>(null);

  useEffect(() => {
    // Create a key based on goals data to prevent re-analysis
    const goalsKey = `${goals.length}-${totalSavedThisMonth}-${goals.map(g => `${g.id}-${g.currentAmount}`).join(',')}`;
    
    // If we've already analyzed this data, don't do it again
    if (hasAnalyzedRef.current === goalsKey) {
      return;
    }
    
    hasAnalyzedRef.current = goalsKey;

    const analyzeGoals = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Prepare goals data for AI analysis
        const goalsData = {
          goals: goals.map(goal => ({
            id: goal.id,
            name: goal.name,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentAmount,
            targetDate: goal.targetDate,
            monthlyContribution: goal.monthlyContribution,
            monthsRemaining: goal.monthsRemaining,
            progressPercentage: (goal.currentAmount / goal.targetAmount) * 100
          })),
          totalSavedThisMonth,
          activeGoalsCount: goals.filter(g => g.currentAmount < g.targetAmount).length,
          completedGoalsCount: goals.filter(g => g.currentAmount >= g.targetAmount).length
        };

        console.log('GoalAIInsights - Analyzing goals data:', goalsData);

        // Call the AI API for goal insights
        const response = await fetch('/api/ai/goal-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goalsData,
            userId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setInsights(data.insights || []);
        } else {
          console.error('Goal insights API error:', response.statusText);
          // Fallback to local insights if API fails
          setInsights(generateLocalInsights(goals, totalSavedThisMonth));
        }

      } catch (err) {
        console.error('Goal AI analysis error:', err);
        // Fallback to local insights
        setInsights(generateLocalInsights(goals, totalSavedThisMonth));
      } finally {
        setIsLoading(false);
      }
    };

    // Only analyze if we have goals
    if (goals.length > 0) {
      analyzeGoals();
    } else {
      setIsLoading(false);
      setInsights([]);
    }
  }, [goals, userId, totalSavedThisMonth]);

  // Fallback local insights if AI API fails
  const generateLocalInsights = (goals: FinancialGoalWithContribution[], totalSaved: number): GoalAIInsight[] => {
    const insights: GoalAIInsight[] = [];
    
    if (goals.length === 0) return insights;

    // Find the closest goal to completion
    const closestGoal = goals
      .filter(g => g.currentAmount < g.targetAmount)
      .sort((a, b) => (b.currentAmount / b.targetAmount) - (a.currentAmount / a.targetAmount))[0];

    if (closestGoal) {
      const progressPercent = (closestGoal.currentAmount / closestGoal.targetAmount) * 100;
      
      if (progressPercent > 80) {
        insights.push({
          type: 'progress_analysis',
          message: `You're almost there! Your ${closestGoal.name} goal is ${progressPercent.toFixed(0)}% complete.`,
          priority: 'high',
          data: {
            goalName: closestGoal.name,
            percentage: progressPercent
          }
        });
      } else if (closestGoal.monthsRemaining <= 2) {
        insights.push({
          type: 'timeline_prediction',
          message: `${closestGoal.name} target date is approaching. You need $${formatNumber(closestGoal.monthlyContribution)}/month to stay on track.`,
          priority: 'medium',
          data: {
            goalName: closestGoal.name,
            amount: closestGoal.monthlyContribution
          }
        });
      }
    }

    // Savings pattern insight
    if (totalSaved > 0) {
      insights.push({
        type: 'savings_pattern',
        message: `Great progress! You've saved $${formatNumber(totalSaved)} this month. Keep up the momentum!`,
        priority: 'low',
        data: {
          amount: totalSaved
        }
      });
    }

    return insights.slice(0, 1); // Return only the most relevant insight
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            <Lightbulb className="h-4 w-4 mr-1 inline-block text-yellow-500" /> AI Insight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
            <span className="text-xs text-muted-foreground">Analyzing your goals...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            <Lightbulb className="h-4 w-4 mr-1 inline-block text-yellow-500" /> AI Insight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add some goals to get personalized insights about your savings journey!
          </p>
        </CardContent>
      </Card>
    );
  }

  const primaryInsight = insights[0];

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          <Lightbulb className="h-4 w-4 mr-1 inline-block text-yellow-500" /> AI Insight
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground">
          {primaryInsight.message}
        </p>
        {primaryInsight.data?.amount && (
          <p className="text-xs text-muted-foreground mt-1">
            Amount: ${formatNumber(primaryInsight.data.amount)}
          </p>
        )}
        {primaryInsight.data?.timeframe && (
          <p className="text-xs text-muted-foreground mt-1">
            {primaryInsight.data.timeframe}
          </p>
        )}
      </CardContent>
    </Card>
  );
} 