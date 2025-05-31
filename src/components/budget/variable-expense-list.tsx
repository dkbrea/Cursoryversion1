"use client";

import type { VariableExpense, PredefinedRecurringCategoryValue } from "@/types";
import { predefinedRecurringCategories } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface VariableExpenseListProps {
  expenses: VariableExpense[];
  onUpdateExpenseAmount?: (expenseId: string, newAmount: number) => void;
  onDeleteExpense: (expenseId: string) => void;
  onEditExpense?: (expense: VariableExpense) => void;
}

export function VariableExpenseList({ expenses, onUpdateExpenseAmount, onDeleteExpense, onEditExpense }: VariableExpenseListProps) {
  const { toast } = useToast();
  const [editingAmounts, setEditingAmounts] = useState<Record<string, string>>({});

  // Sync editingAmounts when expenses prop changes (e.g. after adding/deleting)
  useEffect(() => {
    const newEditingAmounts: Record<string, string> = {};
    expenses.forEach(expense => {
      newEditingAmounts[expense.id] = expense.amount.toString();
    });
    setEditingAmounts(newEditingAmounts);
  }, [expenses]);

  const handleAmountChange = (expenseId: string, value: string) => {
    setEditingAmounts(prev => ({ ...prev, [expenseId]: value }));
  };

  const handleAmountBlur = (expenseId: string) => {
    if (!onUpdateExpenseAmount) return; // Skip if no update handler provided
    
    const stringValue = editingAmounts[expenseId];
    const originalExpense = expenses.find(e => e.id === expenseId);

    if (stringValue === undefined || stringValue.trim() === "" || originalExpense === undefined) {
      // Revert to original if input is cleared or expense not found
      if (originalExpense) {
        setEditingAmounts(prev => ({ ...prev, [expenseId]: originalExpense.amount.toString() }));
      }
      return;
    }
    const numericValue = parseFloat(stringValue);
    if (!isNaN(numericValue) && numericValue >= 0) {
      if (numericValue !== originalExpense.amount) { // Only update if changed
        onUpdateExpenseAmount(expenseId, numericValue);
        toast({ title: "Expense Updated", description: `Amount for ${originalExpense.name} updated.` });
      }
    } else {
      setEditingAmounts(prev => ({ ...prev, [expenseId]: originalExpense.amount.toString() }));
      toast({ title: "Invalid Amount", description: "Please enter a valid non-negative number.", variant: "destructive" });
    }
  };

  const totalBudgeted = expenses.reduce((sum, expense) => sum + expense.amount, 0);

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
                <TableHead className="text-right w-[200px]">Amount ($)</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.name}</TableCell>
                  <TableCell>
                    {predefinedRecurringCategories.find(cat => cat.value === expense.category)?.label || expense.category}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingAmounts[expense.id] ?? expense.amount.toString()}
                      onChange={(e) => handleAmountChange(expense.id, e.target.value)}
                      onBlur={() => handleAmountBlur(expense.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur();}}
                      className="w-32 ml-auto text-right"
                      placeholder="0.00"
                      disabled={!onUpdateExpenseAmount}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {onEditExpense && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onEditExpense(expense)}
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
                            <AlertDialogTitle>Delete "{expense.name}" Expense?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this variable expense. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteExpense(expense.id)} className="bg-destructive hover:bg-destructive/90">
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
                  <TableCell>Total Budgeted Variable Expenses</TableCell>
                  <td className="font-medium">Total</td>
                  <td></td>
                  <td className="text-right font-bold">${totalBudgeted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td></td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

    