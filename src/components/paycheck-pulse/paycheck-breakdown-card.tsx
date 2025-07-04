"use client";

import type { PaycheckBreakdown } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { format, addDays } from "date-fns";
import { DollarSign, AlertTriangle, TrendingUp, Calendar, Info, Lightbulb, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";

interface PaycheckBreakdownCardProps {
  breakdown: PaycheckBreakdown & {
    warnings?: string[];
    financialHealthScore?: number;
    actionableInsights?: string[];
  };
  isHighlighted?: boolean;
}

export function PaycheckBreakdownCard({ breakdown, isHighlighted = false }: PaycheckBreakdownCardProps) {
  const [showInsights, setShowInsights] = useState(false);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  // Helper function to get budget status text and color
  const getBudgetStatus = (actualSpent: number, budgetRemaining: number) => {
    const totalBudget = actualSpent + budgetRemaining;
    const spentPercentage = totalBudget > 0 ? (actualSpent / totalBudget) * 100 : 0;
    
    if (spentPercentage > 100) return { text: 'Overspent', color: 'text-red-600' };
    if (spentPercentage > 90) return { text: 'Near Limit', color: 'text-orange-600' };
    if (spentPercentage > 70) return { text: 'On Track', color: 'text-yellow-600' };
    if (actualSpent === 0) return { text: 'Unspent', color: 'text-gray-600' };
    return { text: 'Good', color: 'text-green-600' };
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      isHighlighted && "ring-2 ring-primary/50 shadow-lg",
      breakdown.isDeficit && "border-destructive/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">
                {format(breakdown.period.paycheckDate, 'MMM d, yyyy')}
                {breakdown.period.nextPaycheckDate && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    - {format(addDays(breakdown.period.nextPaycheckDate, -1), 'MMM d')}
                  </span>
                )}
              </CardTitle>
            </div>
            {breakdown.period.paycheckSource === 'estimated' && (
              <Badge variant="outline" className="text-xs">Estimated</Badge>
            )}
            {breakdown.financialHealthScore !== undefined && (
              <Badge variant="outline" className={cn("text-xs", getHealthScoreColor(breakdown.financialHealthScore))}>
                <Shield className="h-3 w-3 mr-1" />
                {getHealthScoreLabel(breakdown.financialHealthScore)} ({breakdown.financialHealthScore})
              </Badge>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-xl font-bold text-green-600">
                {formatCurrency(breakdown.period.paycheckAmount)}
              </span>
            </div>
            {/* Show carryover info more clearly */}
            {Math.abs(breakdown.remainingAfterObligated - (breakdown.period.paycheckAmount - breakdown.totalObligated)) > 0.01 && (
              <div className="text-xs mt-1">
                {breakdown.remainingAfterObligated > (breakdown.period.paycheckAmount - breakdown.totalObligated) 
                  ? (
                    <span className="text-green-600 font-medium">
                      +{formatCurrency(breakdown.remainingAfterObligated - (breakdown.period.paycheckAmount - breakdown.totalObligated))} from previous
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">
                      {formatCurrency(breakdown.remainingAfterObligated - (breakdown.period.paycheckAmount - breakdown.totalObligated))} deficit carried
                    </span>
                  )
                }
              </div>
            )}
          </div>
        </div>
        {breakdown.isDeficit && (
          <div className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Deficit: {formatCurrency(breakdown.deficitAmount!)}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Warnings Section */}
        {breakdown.warnings && breakdown.warnings.length > 0 && (
          <div className="space-y-2">
            {breakdown.warnings.map((warning, index) => (
              <Alert key={index} variant={warning.includes('⚠️') ? 'destructive' : 'default'} className="py-2">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {warning}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Obligated Expenses */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-muted-foreground">Obligated Expenses</h4>
            <span className="font-medium text-destructive">
              -{formatCurrency(breakdown.totalObligated)}
            </span>
          </div>
          
          {breakdown.obligatedExpenses.length > 0 && (
            <div className="space-y-1 ml-4">
              {breakdown.obligatedExpenses.map((expense) => (
                <div key={expense.id} className="flex justify-between text-xs text-muted-foreground">
                  <div className="flex flex-col">
                    <span>{expense.name}</span>
                    <span className="text-xs text-muted-foreground/70">
                      Due: {format(expense.dueDate, 'MMM d')}
                    </span>
                  </div>
                  <span>{formatCurrency(expense.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Remaining After Obligated */}
        <div className="flex items-center justify-between">
          <span className="font-medium">Available for Allocation</span>
          <span className={cn(
            "font-medium",
            breakdown.remainingAfterObligated >= 0 ? "text-green-600" : "text-destructive"
          )}>
            {formatCurrency(Math.max(0, breakdown.remainingAfterObligated))}
          </span>
        </div>

        {/* Allocations */}
        {!breakdown.isDeficit && breakdown.remainingAfterObligated > 0 && (
          <>
            {/* Variable Expenses with Progress Bars */}
            {breakdown.allocation.variableExpenses.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Variable Expenses</h4>
                <div className="space-y-3 ml-4">
                  {breakdown.allocation.variableExpenses.map((expense) => {
                    const actualSpent = (expense as any).actualSpent || 0;
                    const budgetRemaining = (expense as any).budgetRemaining || 0;
                    const totalBudget = actualSpent + budgetRemaining;
                    const spentPercentage = totalBudget > 0 ? (actualSpent / totalBudget) * 100 : 0;
                    const status = getBudgetStatus(actualSpent, budgetRemaining);
                    
                    return (
                      <div key={expense.id} className="space-y-2">
                        {/* Header with name, status, and allocation */}
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{expense.name}</span>
                            {totalBudget > 0 && (
                              <Badge variant="outline" className={cn("text-xs", status.color)}>
                                {status.text}
                              </Badge>
                            )}
                          </div>
                          <span className="text-blue-600 font-medium">
                            +{formatCurrency(expense.suggestedAmount)}
                            {expense.isProportional && (
                              <span className="text-muted-foreground ml-1">(partial)</span>
                            )}
                          </span>
                        </div>
                        
                        {/* Progress Bar and Budget Info */}
                        {totalBudget > 0 && (
                          <div className="space-y-1">
                            <div className="relative">
                              <Progress 
                                value={Math.min(spentPercentage, 100)} 
                                className="h-2"
                              />
                              {/* Overlay for overspending */}
                              {spentPercentage > 100 && (
                                <div className="absolute inset-0 bg-red-500 h-2 rounded-full opacity-30" />
                              )}
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>
                                Spent: {formatCurrency(actualSpent)} ({spentPercentage.toFixed(1)}%)
                              </span>
                              <span>
                                Budget: {formatCurrency(totalBudget)}
                              </span>
                            </div>
                            {budgetRemaining > 0 && (
                              <div className="text-xs text-green-600">
                                {formatCurrency(budgetRemaining)} remaining this month
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Fallback for expenses without budget tracking */}
                        {totalBudget === 0 && (
                          <div className="text-xs text-muted-foreground ml-2">
                            No spending tracked for this period
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Savings Goals */}
            {breakdown.allocation.savingsGoals.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Savings Goals</h4>
                <div className="space-y-1 ml-4">
                  {breakdown.allocation.savingsGoals.map((goal) => (
                    <div key={goal.id} className="flex justify-between text-xs">
                      <span>{goal.name}</span>
                      <span className="text-purple-600">
                        {formatCurrency(goal.suggestedAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Carryover */}
            {breakdown.allocation.carryover.amount > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground">Reserve for Future</h4>
                  <span className="text-orange-600 font-medium">
                    {formatCurrency(breakdown.allocation.carryover.amount)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground ml-4">
                  {breakdown.allocation.carryover.reason}
                </div>
              </div>
            )}

            {/* Strategic Opportunities */}
            {breakdown.finalRemaining > 100 && (
              <div className="space-y-2 pt-2 border-t">
                <h4 className="font-medium text-sm text-muted-foreground flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Strategic Opportunities
                </h4>
                <div className="space-y-2 ml-4">
                  <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                    💡 <strong>Extra Debt Payment:</strong> Apply {formatCurrency(Math.min(breakdown.finalRemaining * 0.5, 200))} to highest interest debt
                  </div>
                  <div className="text-xs text-muted-foreground bg-green-50 p-2 rounded">
                    🎯 <strong>Emergency Fund:</strong> Boost emergency fund with {formatCurrency(Math.min(breakdown.finalRemaining * 0.3, 150))}
                  </div>
                  <div className="text-xs text-muted-foreground bg-purple-50 p-2 rounded">
                    🚀 <strong>Goal Acceleration:</strong> Accelerate highest priority goal with {formatCurrency(Math.min(breakdown.finalRemaining * 0.2, 100))}
                  </div>
                </div>
              </div>
            )}

            {/* Final Remaining */}
            {breakdown.finalRemaining > 0 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-medium text-sm">
                  {breakdown.finalRemaining > 100 ? 'Unallocated - Choose How to Use' : 'Remaining Funds'}
                </span>
                <span className="font-medium text-green-600">
                  {formatCurrency(breakdown.finalRemaining)}
                </span>
              </div>
            )}
          </>
        )}
        
        {/* Jade Insights */}
        {breakdown.actionableInsights && breakdown.actionableInsights.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center">
                <Lightbulb className="h-4 w-4 mr-2" />
                Jade Insights
              </h4>
              <button 
                onClick={() => setShowInsights(!showInsights)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showInsights ? 'Hide' : 'Show'} ({breakdown.actionableInsights.length})
              </button>
            </div>
            {showInsights && (
              <div className="space-y-2">
                {breakdown.actionableInsights.map((insight, index) => (
                  <div key={index} className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    {insight}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 