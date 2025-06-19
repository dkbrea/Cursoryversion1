"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle2, Flag, Package, Receipt, Activity, Landmark, PlusCircle, Info, TriangleAlert, CircleAlert } from "lucide-react";
import { Button } from "../ui/button";

interface BudgetSummaryProps {
  totalIncome: number;
  totalActualFixedExpenses: number;
  totalSubscriptions: number;
  totalDebtPayments: number;
  totalGoalContributions: number;
  totalSinkingFundsContributions: number;
  totalBudgetedVariable: number;
  totalSpentVariable: number;
  remainingVariable: number;
  onAddCategoryClick: () => void;
  leftToAllocate: number;
}

export function BudgetSummary({
  totalIncome,
  totalActualFixedExpenses,
  totalSubscriptions,
  totalDebtPayments,
  totalGoalContributions,
  totalSinkingFundsContributions,
  totalBudgetedVariable,
  totalSpentVariable,
  remainingVariable,
  onAddCategoryClick,
  leftToAllocate,
}: BudgetSummaryProps) {

  const totalFixedOutflows = totalActualFixedExpenses + totalSubscriptions + totalDebtPayments + totalGoalContributions + totalSinkingFundsContributions;
  const totalOutflows = totalFixedOutflows + totalBudgetedVariable;
  const isBalanced = Math.abs(leftToAllocate) < 0.01;

  const getLeftToAllocateStatus = () => {
    if (isBalanced) {
      return {
        message: "Every dollar has a job!",
        Icon: ({ className }: { className?: string }) => <CheckCircle2 className={cn("h-4 w-4 text-green-500", className)} />,
        color: "text-green-600",
        progressBarColor: "bg-green-500",
      };
    } else {
      return {
        message: "You've assigned more money than you have.",
        Icon: ({ className }: { className?: string }) => <CircleAlert className={cn("h-4 w-4 text-red-500", className)} />,
        color: "text-red-600",
        progressBarColor: "bg-red-500",
      };
    }
  };

  const status = getLeftToAllocateStatus();

  const budgetItems = [
    { label: "Fixed Expenses", amount: totalActualFixedExpenses, color: "text-purple-600" },
    { label: "Subscriptions", amount: totalSubscriptions, color: "text-indigo-600" },
    { label: "Variable Expenses", amount: totalBudgetedVariable, color: "text-blue-600" },
    { label: "Debt Payments", amount: totalDebtPayments, color: "text-red-600" },
    { label: "Goal Contributions", amount: totalGoalContributions, color: "text-sky-600" },
    ...(totalSinkingFundsContributions > 0 ? [{ label: "Sinking Funds", amount: totalSinkingFundsContributions, color: "text-teal-600" }] : []),
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
                  status.color
                )}
              >
                ${leftToAllocate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <Progress
              value={isBalanced ? 100 : (totalOutflows / totalIncome) * 100}
              className="h-3 mt-2"
              indicatorClassName={status.progressBarColor}
            />
            <p className={cn("text-xs mt-1 flex items-center", status.color)}>
              <status.Icon className="h-3.5 w-3.5 mr-1" />
              {status.message}
            </p>
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
            <div className="text-2xl font-bold text-green-600">${remainingVariable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
             <p className="text-xs text-muted-foreground">
               {totalBudgetedVariable > 0 ? ((remainingVariable / totalBudgetedVariable) * 100).toFixed(1) : '0.0'}% of variable budget left
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

    