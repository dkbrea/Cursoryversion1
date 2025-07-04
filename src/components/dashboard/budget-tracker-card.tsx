"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { VariableExpense, Transaction } from "@/types";
import { useMemo, useState } from "react";

interface BudgetTrackerCardProps {
  variableExpenses: VariableExpense[];
  transactions: Transaction[];
  isMobile?: boolean;
}

export function BudgetTrackerCard({ variableExpenses, transactions, isMobile = false }: BudgetTrackerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate spending for each variable expense category
  const budgetAnalysis = useMemo(() => {
    const analysis = variableExpenses.map((expense) => {
      // Find transactions linked to this specific variable expense by sourceId
      const spent = transactions
        .filter(tx => tx.detailedType === 'variable-expense' && tx.sourceId === expense.id)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      
      const percentage = expense.amount > 0 ? (spent / expense.amount) * 100 : 0;
      const remaining = Math.max(0, expense.amount - spent);
      
      let status = '';
      if (spent > expense.amount) {
        status = 'Overspent';
      } else if (spent === 0) {
        status = 'Unspent';
      } else if (spent === expense.amount) {
        status = 'Budget Met';
      } else {
        status = 'Under Budget';
      }
      
      return {
        ...expense,
        spent,
        percentage: Math.min(percentage, 100),
        remaining,
        status
      };
    });

    const totalBudgeted = variableExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalSpent = analysis.reduce((sum, item) => sum + item.spent, 0);
    const totalRemaining = Math.max(0, totalBudgeted - totalSpent);
    const overallPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

    return {
      categories: analysis,
      totalBudgeted,
      totalSpent,
      totalRemaining,
      overallPercentage: Math.min(overallPercentage, 100)
    };
  }, [variableExpenses, transactions]);

  const displayCategories = isExpanded ? budgetAnalysis.categories : budgetAnalysis.categories.slice(0, 3);

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? 'pb-3' : 'pb-2'}`}>
        <CardTitle className={`${isMobile ? 'text-base' : 'text-sm'} font-medium flex items-center`}>
          <TrendingUp className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} mr-2 text-orange-500`} />
          Budget Tracker
        </CardTitle>
        <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground`}>This Month</div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-semibold">
              {formatCurrency(budgetAnalysis.totalSpent)} / {formatCurrency(budgetAnalysis.totalBudgeted)}
            </span>
          </div>
          <Progress 
            value={budgetAnalysis.overallPercentage} 
            className="h-2"
            indicatorClassName="bg-orange-500"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{budgetAnalysis.overallPercentage.toFixed(1)}% used</span>
            <span className="text-orange-600">{formatCurrency(budgetAnalysis.totalRemaining)} remaining</span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-3">
          {displayCategories.map((category, index) => (
            <div key={category.id} className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{category.name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    category.status === 'Overspent' ? 'bg-red-100 text-red-700' :
                    category.status === 'Unspent' ? 'bg-gray-100 text-gray-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {category.status}
                  </span>
                </div>
                <span className="text-sm font-semibold">
                  {formatCurrency(category.spent)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{category.percentage.toFixed(1)}%</span>
                <span>of {formatCurrency(category.amount)}</span>
              </div>
              <div className="flex justify-end text-xs text-orange-600">
                {formatCurrency(category.remaining)} left
              </div>
            </div>
          ))}
        </div>

        {/* Expand/Collapse Button */}
        {budgetAnalysis.categories.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {budgetAnalysis.categories.length - 3} More
              </>
            )}
          </button>
        )}

        {budgetAnalysis.categories.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-4">
            No variable expenses to track. Add some budget categories to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
} 