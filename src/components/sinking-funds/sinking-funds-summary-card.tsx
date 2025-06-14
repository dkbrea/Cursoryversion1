"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PiggyBank, Calendar, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import type { SinkingFundWithProgress } from "@/types";

interface SinkingFundsSummaryCardProps {
  sinkingFunds: SinkingFundWithProgress[];
}

export function SinkingFundsSummaryCard({ sinkingFunds }: SinkingFundsSummaryCardProps) {
  const summary = useMemo(() => {
    const totalSaved = sinkingFunds.reduce((sum, fund) => sum + fund.currentAmount, 0);
    const totalTarget = sinkingFunds.reduce((sum, fund) => sum + fund.targetAmount, 0);
    const fullyFundedCount = sinkingFunds.filter(fund => fund.isFullyFunded).length;
    
    const today = startOfDay(new Date());
    const upcomingExpenses = sinkingFunds.filter(fund => 
      fund.nextExpenseDate && 
      !isBefore(startOfDay(fund.nextExpenseDate), today) &&
      fund.nextExpenseDate.getTime() <= today.getTime() + (30 * 24 * 60 * 60 * 1000) // Next 30 days
    );

    const overdueExpenses = sinkingFunds.filter(fund => 
      fund.nextExpenseDate && 
      isBefore(startOfDay(fund.nextExpenseDate), today)
    );

    const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

    return {
      totalSaved,
      totalTarget,
      fullyFundedCount,
      upcomingExpenses,
      overdueExpenses,
      overallProgress: Math.min(overallProgress, 100)
    };
  }, [sinkingFunds]);

  const topPriorityFunds = useMemo(() => {
    return sinkingFunds
      .filter(fund => !fund.isFullyFunded)
      .sort((a, b) => {
        // Sort by next expense date first (closest first), then by progress percentage (lowest first)
        if (a.nextExpenseDate && b.nextExpenseDate) {
          return a.nextExpenseDate.getTime() - b.nextExpenseDate.getTime();
        }
        if (a.nextExpenseDate && !b.nextExpenseDate) return -1;
        if (!a.nextExpenseDate && b.nextExpenseDate) return 1;
        
        return a.progressPercentage - b.progressPercentage;
      })
      .slice(0, 3);
  }, [sinkingFunds]);

  if (sinkingFunds.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sinking Funds</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm">No sinking funds yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start saving for upcoming expenses</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Sinking Funds</CardTitle>
        <PiggyBank className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Overall Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold">${summary.totalSaved.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">{Math.round(summary.overallProgress)}%</div>
            </div>
            <Progress value={summary.overallProgress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              <span>of ${summary.totalTarget.toLocaleString()} target</span>
              <span>{summary.fullyFundedCount} of {sinkingFunds.length} fully funded</span>
            </div>
          </div>

          {/* Alerts */}
          {(summary.overdueExpenses.length > 0 || summary.upcomingExpenses.length > 0) && (
            <div className="space-y-2">
              {summary.overdueExpenses.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{summary.overdueExpenses.length} overdue expense{summary.overdueExpenses.length !== 1 ? 's' : ''}</span>
                </div>
              )}
              
              {summary.upcomingExpenses.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded">
                  <Calendar className="h-4 w-4" />
                  <span>{summary.upcomingExpenses.length} upcoming expense{summary.upcomingExpenses.length !== 1 ? 's' : ''} (30 days)</span>
                </div>
              )}
            </div>
          )}

          {/* Top Priority Funds */}
          {topPriorityFunds.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Priority Funds</div>
              {topPriorityFunds.map((fund) => (
                <div key={fund.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium truncate">{fund.name}</span>
                    {fund.isFullyFunded && (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    {fund.nextExpenseDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(fund.nextExpenseDate, "MMM d")}
                      </span>
                    )}
                    <span>{Math.round(fund.progressPercentage)}%</span>
                  </div>
                </div>
              ))}
              
              {sinkingFunds.length > 3 && (
                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    Showing 3 of {sinkingFunds.filter(f => !f.isFullyFunded).length} active funds
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Fully Funded Celebration */}
          {summary.fullyFundedCount > 0 && topPriorityFunds.length === 0 && (
            <div className="text-center py-2">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-600">All funds fully funded!</p>
              <p className="text-xs text-muted-foreground">Great job staying prepared for expenses</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 