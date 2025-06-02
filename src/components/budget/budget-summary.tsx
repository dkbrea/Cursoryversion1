"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle2, Flag, Package, Receipt, Activity, Landmark, PlusCircle, Info } from "lucide-react";
import { Button } from "../ui/button";

interface BudgetSummaryProps {
  totalIncome: number;
  totalActualFixedExpenses: number;
  totalSubscriptions: number;
  totalDebtPayments: number;
  totalGoalContributions: number;
  totalBudgetedVariable: number;
  totalSpentVariable?: number;
  remainingVariable?: number;
  onAddCategoryClick: () => void;
}

export function BudgetSummary({
  totalIncome,
  totalActualFixedExpenses,
  totalSubscriptions,
  totalDebtPayments,
  totalGoalContributions,
  totalBudgetedVariable,
  totalSpentVariable = 0,
  remainingVariable,
  onAddCategoryClick
}: BudgetSummaryProps) {

  const totalFixedOutflows = totalActualFixedExpenses + totalSubscriptions + totalDebtPayments + totalGoalContributions;
  const leftToAllocate = totalIncome - totalFixedOutflows - totalBudgetedVariable;
  const totalAllocated = totalBudgetedVariable + totalFixedOutflows;
  
  // Calculate remaining variable if not provided
  const calculatedRemainingVariable = remainingVariable ?? Math.max(0, totalBudgetedVariable - totalSpentVariable);
  
  let progressPercentage = 0;
  if (totalIncome > 0) {
    progressPercentage = Math.min((totalAllocated / totalIncome) * 100, 100);
  } else if (totalIncome <= 0 && totalAllocated > 0) {
    progressPercentage = 100; // Indicates over-allocation if income is zero or negative
  }


  const budgetItems = [
    { label: "Fixed Expenses", amount: totalActualFixedExpenses, color: "text-purple-600" },
    { label: "Subscriptions", amount: totalSubscriptions, color: "text-indigo-600" },
    { label: "Variable Expenses", amount: totalBudgetedVariable, color: "text-blue-600" },
    { label: "Debt Payments", amount: totalDebtPayments, color: "text-red-600" },
    { label: "Goal Contributions", amount: totalGoalContributions, color: "text-sky-600" },
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Budget Status</CardTitle>
          <CardDescription>Aim to make "Left to Allocate" $0.00 for a zero-based budget.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Monthly Income:</span>
            <span className="text-green-600">${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <ul className="space-y-1 pl-4 text-sm text-muted-foreground">
            {budgetItems.map(item => ( // Show all items regardless of amount
              <li key={item.label} className="flex justify-between">
                <span>{item.label}:</span>
                <span className={item.color}>${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </li>
            ))}
          </ul>
          <div className="border-t pt-3">
            <div className="flex justify-between text-lg font-semibold">
              <span>Left to Allocate:</span>
              <span
                className={cn(
                  "font-bold",
                  Math.abs(leftToAllocate) < 0.01 && "text-green-600", // Balanced
                  leftToAllocate > 0 && "text-orange-500", // Money left
                  leftToAllocate < 0 && "text-destructive" // Over budget
                )}
              >
                ${leftToAllocate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <Progress
              value={progressPercentage}
              className={cn(
                "h-3 mt-2",
                leftToAllocate < 0 && "!bg-destructive/80 [&>div]:!bg-destructive",
                Math.abs(leftToAllocate) < 0.01 && totalIncome > 0 && "!bg-green-500/80 [&>div]:!bg-green-500",
                leftToAllocate > 0 && "!bg-orange-500/80 [&>div]:!bg-orange-500"
              )}
            />
            {Math.abs(leftToAllocate) < 0.01 && totalIncome > 0 && (
              <p className="text-xs text-green-600 mt-1 flex items-center"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Every dollar has a job!</p>
            )}
            {leftToAllocate > 0 && (
              <p className="text-xs text-orange-600 mt-1 flex items-center"><AlertTriangle className="h-3.5 w-3.5 mr-1" /> You have money left to assign.</p>
            )}
            {leftToAllocate < 0 && (
              <p className="text-xs text-destructive mt-1 flex items-center"><AlertTriangle className="h-3.5 w-3.5 mr-1" /> You've budgeted more than your income.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <div className="p-2 bg-orange-100 rounded-full mr-2"><Package className="h-4 w-4 text-orange-500" /></div>
              Left to Allocate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${leftToAllocate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <div className="p-2 bg-blue-100 rounded-full mr-2"><Receipt className="h-4 w-4 text-blue-500" /></div>
              Variable Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${totalBudgetedVariable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              {totalIncome > 0 ? ((totalBudgetedVariable / totalIncome) * 100).toFixed(1) : '0.0'}% of income
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
               <div className="p-2 bg-teal-100 rounded-full mr-2"><Activity className="h-4 w-4 text-teal-500" /></div>
              Total Spent (Variable)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">${totalSpentVariable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              {totalBudgetedVariable > 0 ? ((totalSpentVariable / totalBudgetedVariable) * 100).toFixed(1) : '0.0'}% of variable budget
            </p>
          </CardContent>
        </Card>
         <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <div className="p-2 bg-green-100 rounded-full mr-2"><Landmark className="h-4 w-4 text-green-500" /></div>
              Remaining (Variable)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${calculatedRemainingVariable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
             <p className="text-xs text-muted-foreground">
               {totalBudgetedVariable > 0 ? ((calculatedRemainingVariable / totalBudgetedVariable) * 100).toFixed(1) : '0.0'}% of variable budget left
             </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-primary/10 p-4 rounded-lg shadow flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-primary/90">
            <strong>Zero-Based Budgeting Tip:</strong> Your "Left to Allocate" should be $0.00. This means every dollar of income has a job. Adjust your variable expenses or add more categories until you reach a zero balance!
          </p>
        </div>
        <Button onClick={onAddCategoryClick} variant="outline" className="bg-background hover:bg-muted text-primary border-primary shrink-0">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>
    </div>
  );
}

    