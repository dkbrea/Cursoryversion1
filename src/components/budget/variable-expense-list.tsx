"use client";

import type { VariableExpense, PredefinedRecurringCategoryValue, Transaction } from "@/types";
import { predefinedRecurringCategories } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface VariableExpenseListProps {
  expenses: VariableExpense[];
  transactions?: Transaction[];
  onUpdateExpenseAmount?: (expenseId: string, newAmount: number) => void;
  onDeleteExpense: (expenseId: string) => void;
  onEditExpense?: (expense: VariableExpense) => void;
  isLoading?: boolean;
}

export function VariableExpenseList({ expenses, transactions = [], onUpdateExpenseAmount, onDeleteExpense, onEditExpense, isLoading = false }: VariableExpenseListProps) {
  const { toast } = useToast();
  const [editingAmounts, setEditingAmounts] = useState<Record<string, string>>({});

  console.log('📋 DEBUG: VariableExpenseList rendered', { 
    expensesCount: expenses.length,
    expenses: expenses.map(e => ({ id: e.id, name: e.name, amount: e.amount })),
    totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0)
  });

  // Sync editingAmounts when expenses prop changes (e.g. after adding/deleting)
  // Only reset when expenses are added/removed, not when amounts change
  useEffect(() => {
    setEditingAmounts(prev => {
      const newEditingAmounts: Record<string, string> = {};
      expenses.forEach(expense => {
        // If this expense ID already exists in prev, keep the current editing value
        // This prevents resetting during amount updates
        if (prev[expense.id] !== undefined) {
          newEditingAmounts[expense.id] = prev[expense.id];
        } else {
          // New expense or first load - initialize with the expense amount
          newEditingAmounts[expense.id] = expense.amount.toString();
        }
      });
      return newEditingAmounts;
    });
  }, [expenses.length, expenses.map(e => e.id).join(',')]); // Only depend on length and IDs, not amounts

  // Calculate spending for each expense category
  const expenseAnalysis = useMemo(() => {
    return expenses.map((expense) => {
      // Find transactions linked to this specific variable expense by sourceId
      const spent = transactions
        .filter(tx => tx.detailedType === 'variable-expense' && tx.sourceId === expense.id)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      
      const percentage = expense.amount > 0 ? Math.min((spent / expense.amount) * 100, 150) : 0;
      const remaining = Math.max(0, expense.amount - spent);
      
      let status = '';
      let statusColor = '';
      let progressColor = '';
      
      if (spent > expense.amount) {
        // Overspending - Red
        status = 'Overspent';
        statusColor = 'text-red-700';
        progressColor = 'bg-red-500';
      } else {
        // At or under budget - Green/Blue
        if (spent === 0) {
          status = 'Unspent';
          statusColor = 'text-gray-700';
          progressColor = 'bg-gray-400';
        } else if (spent === expense.amount) {
          status = 'Budget Met';
          statusColor = 'text-blue-700';
          progressColor = 'bg-blue-500';
        } else {
          status = 'Under Budget';
          statusColor = 'text-green-700';
          progressColor = 'bg-green-500';
        }
      }
      
      return {
        ...expense,
        spent,
        percentage,
        remaining,
        status,
        statusColor,
        progressColor,
        hasTransactions: spent > 0
      };
    });
  }, [expenses, transactions]);

  const handleAmountChange = (expenseId: string, value: string) => {
    setEditingAmounts(prev => ({ ...prev, [expenseId]: value }));
  };

  const handleAmountBlur = (expenseId: string) => {
    console.log('🔍 DEBUG: handleAmountBlur called', { 
      expenseId, 
      hasUpdateHandler: !!onUpdateExpenseAmount, 
      isLoading, 
      willReturn: !onUpdateExpenseAmount || isLoading 
    });
    
    if (!onUpdateExpenseAmount || isLoading) return; // Skip if no update handler provided or still loading
    
    const stringValue = editingAmounts[expenseId];
    const originalExpense = expenses.find(e => e.id === expenseId);

    console.log('🔍 DEBUG: handleAmountBlur processing', { 
      expenseId, 
      stringValue, 
      originalAmount: originalExpense?.amount,
      expenseName: originalExpense?.name 
    });

    if (stringValue === undefined || stringValue.trim() === "" || originalExpense === undefined) {
      // Revert to original if input is cleared or expense not found
      if (originalExpense) {
        setEditingAmounts(prev => ({ ...prev, [expenseId]: originalExpense.amount.toString() }));
      }
      console.log('🔍 DEBUG: Reverting to original - no valid input');
      return;
    }
    const numericValue = parseFloat(stringValue);
    if (!isNaN(numericValue) && numericValue >= 0) {
      console.log('🔍 DEBUG: Comparing values', { numericValue, originalAmount: originalExpense.amount, willUpdate: numericValue !== originalExpense.amount });
      if (numericValue !== originalExpense.amount) { // Only update if changed
        console.log('✅ DEBUG: Triggering update - calling onUpdateExpenseAmount');
        onUpdateExpenseAmount(expenseId, numericValue);
      } else {
        console.log('⏭️ DEBUG: No change detected, skipping update');
      }
    } else {
      setEditingAmounts(prev => ({ ...prev, [expenseId]: originalExpense.amount.toString() }));
      toast({ title: "Invalid Amount", description: "Please enter a valid non-negative number.", variant: "destructive" });
    }
  };

  const totalBudgeted = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalSpent = expenseAnalysis.reduce((sum, analysis) => sum + analysis.spent, 0);

  return (
    <Card className="shadow-lg mt-6">
      <CardHeader>
        <div>
            <CardTitle>Variable Expenses</CardTitle>
            <CardDescription>Track your variable expenses.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">No variable expenses yet. Click "Add Variable Expense" to start.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right w-[200px]">Budget ($)</TableHead>
                <TableHead className="w-[280px]">Progress</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseAnalysis.map((analysis) => (
                <TableRow key={analysis.id}>
                  <TableCell className="font-medium">{analysis.name}</TableCell>
                  <TableCell>
                    {predefinedRecurringCategories.find(cat => cat.value === analysis.category)?.label || analysis.category}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingAmounts[analysis.id] ?? analysis.amount.toString()}
                      onChange={(e) => handleAmountChange(analysis.id, e.target.value)}
                      onBlur={() => handleAmountBlur(analysis.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="w-32 ml-auto text-right"
                      placeholder="0.00"
                      disabled={!onUpdateExpenseAmount || isLoading || expenses.length === 0}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className={`font-medium ${analysis.statusColor}`}>
                          ${analysis.spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} spent
                        </span>
                        <span className="text-muted-foreground">
                          ${analysis.remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} left
                        </span>
                      </div>
                      <div className="relative">
                        <Progress 
                          value={Math.min(analysis.percentage, 100)} 
                          className="h-2"
                        />
                        {analysis.spent > analysis.amount && (
                          <div className="absolute inset-0 bg-red-500 h-2 rounded-full opacity-20" />
                        )}
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{analysis.percentage.toFixed(1)}% used</span>
                        <span className={analysis.statusColor}>
                          {analysis.status}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {onEditExpense && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onEditExpense(analysis)}
                          className="text-muted-foreground hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{analysis.name}" Expense?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this variable expense. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteExpense(analysis.id)} className="bg-destructive hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length > 0 && (
                <TableRow className="font-bold border-t-2 bg-muted/50">
                  <TableCell>Total</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-bold">
                    ${totalBudgeted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span>Total Spent: ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span>Remaining: ${Math.max(0, totalBudgeted - totalSpent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <Progress 
                        value={totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0} 
                        className="h-2"
                      />
                    </div>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

    